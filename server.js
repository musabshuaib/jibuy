/* server.js — Jibuy backend on SQLite. Node 22.13+ (uses the built-in node:sqlite, zero npm packages).
   Run:  ADMIN_EMAIL=you@shop.ng ADMIN_PASSWORD='a-long-secret' GOOGLE_CLIENT_ID=xxx node server.js
   Then set API_BASE: 'http://localhost:3000' in config.js and open http://localhost:3000
   Database file: ./data/jibuy.db (schema in schema.sql). Put the server behind HTTPS in production. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const ORIGIN = process.env.ALLOWED_ORIGIN || ''; // leave empty when the site and API share one origin (recommended)
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'jibuy.db');

if (!ADMIN_EMAIL || ADMIN_PASSWORD.length < 10) console.warn('[warn] Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars) to enable admin sign-in.');

/* Reuse the browser config + seed so server and storefront never drift apart. */
function loadBrowserFile(file) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), ctx);
  return ctx.window;
}
const CONFIG = loadBrowserFile('config.js').JIBUY_CONFIG;
const SEED = loadBrowserFile('products-data.js').JIBUY_SEED;
const zoneFee = st => { const z = CONFIG.DELIVERY_ZONES.find(z => z.states.includes(st)); return z ? z.fee : 5000; };

/* ---------- database ---------- */
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
/* Upgrade a database created by the previous version (its orders table had no user_id column). */
if (db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'orders'").get()
  && !db.prepare('PRAGMA table_info(orders)').all().some(c => c.name === 'user_id')) db.exec('ALTER TABLE orders ADD COLUMN user_id TEXT');
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

/* Run fn inside a transaction; any thrown error rolls everything back. */
function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

const q = {
  productUpsert: db.prepare(`INSERT INTO products (id,name,brand,category,price,old_price,stock,rating,review_count,location,verified,featured,description,images,features,variants,tags,created)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,brand=excluded.brand,category=excluded.category,price=excluded.price,old_price=excluded.old_price,stock=excluded.stock,
      rating=excluded.rating,review_count=excluded.review_count,location=excluded.location,verified=excluded.verified,featured=excluded.featured,
      description=excluded.description,images=excluded.images,features=excluded.features,variants=excluded.variants,tags=excluded.tags`),
  productAll: db.prepare('SELECT * FROM products ORDER BY created DESC'),
  productOne: db.prepare('SELECT * FROM products WHERE id = ?'),
  productDel: db.prepare('DELETE FROM products WHERE id = ?'),
  takeStock: db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?'),
  couponUpsert: db.prepare(`INSERT INTO coupons (id,code,type,value,min,active,note) VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET code=excluded.code,type=excluded.type,value=excluded.value,min=excluded.min,active=excluded.active,note=excluded.note`),
  couponAll: db.prepare('SELECT * FROM coupons ORDER BY rowid DESC'),
  couponActive: db.prepare('SELECT * FROM coupons WHERE active = 1 ORDER BY rowid DESC'),
  couponByCode: db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1'),
  couponAny: db.prepare('SELECT * FROM coupons WHERE code = ?'),
  couponDel: db.prepare('DELETE FROM coupons WHERE id = ?'),
  orderInsert: db.prepare(`INSERT INTO orders (id,user_id,email,cust_name,cust_phone,cust_address,cust_city,cust_state,subtotal,discount,delivery,total,coupon,payment,status,created)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  itemInsert: db.prepare('INSERT INTO order_items (order_id,product_id,name,variant,price,qty,image) VALUES (?,?,?,?,?,?,?)'),
  orderAll: db.prepare('SELECT * FROM orders ORDER BY created DESC'),
  orderOne: db.prepare('SELECT * FROM orders WHERE id = ?'),
  itemsFor: db.prepare('SELECT product_id AS id, name, variant, price, qty, image FROM order_items WHERE order_id = ?'),
  orderStatus: db.prepare('UPDATE orders SET status = ? WHERE id = ?'),
  ordersByUser: db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created DESC'),
  userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  userInsert: db.prepare('INSERT INTO users (id,name,email,pw_hash,pw_salt,google_sub,picture,created) VALUES (?,?,?,?,?,?,?,?)'),
  userGoogle: db.prepare('UPDATE users SET google_sub = ?, picture = ? WHERE id = ?'),
  sessionInsert: db.prepare('INSERT INTO sessions (token_hash,user_id,expires,created) VALUES (?,?,?,?)'),
  sessionUser: db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires > ?'),
  sessionDel: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  sessionsPurge: db.prepare('DELETE FROM sessions WHERE expires < ?'),
  reviewsFor: db.prepare('SELECT name, rating, text, created FROM reviews WHERE product_id = ? ORDER BY created DESC LIMIT 50'),
  reviewUpsert: db.prepare(`INSERT INTO reviews (product_id,user_id,name,rating,text,created) VALUES (?,?,?,?,?,?)
    ON CONFLICT(product_id,user_id) DO UPDATE SET name=excluded.name,rating=excluded.rating,text=excluded.text,created=excluded.created`)
};

/* Row <-> API object mappers: the JSON shape matches what the storefront already uses. */
const str = (v, max = 200) => String(v == null ? '' : v).slice(0, max);
const parse = (s, fb) => { try { return s ? JSON.parse(s) : fb; } catch (e) { return fb; } };
const toProduct = r => ({
  id: r.id, name: r.name, brand: r.brand, category: r.category, price: r.price, oldPrice: r.old_price, stock: r.stock,
  rating: r.rating, reviewCount: r.review_count, location: r.location, verified: !!r.verified, featured: !!r.featured,
  description: r.description, images: parse(r.images, []), features: parse(r.features, []), variants: parse(r.variants, null),
  tags: parse(r.tags, []), created: r.created
});
const saveProduct = p => q.productUpsert.run(
  str(p.id, 40), str(p.name, 120), str(p.brand, 60), str(p.category, 30), Math.round(p.price), p.oldPrice ? Math.round(p.oldPrice) : null,
  Math.max(0, Math.floor(p.stock) || 0), Number(p.rating) || 4.5, Math.floor(p.reviewCount) || 0, str(p.location, 60) || 'Lagos',
  p.verified ? 1 : 0, p.featured ? 1 : 0, str(p.description, 2000), JSON.stringify(p.images || []), JSON.stringify(p.features || []),
  p.variants ? JSON.stringify(p.variants) : null, JSON.stringify(p.tags || []), Number(p.created) || Date.now());
const toCoupon = r => ({ id: r.id, code: r.code, type: r.type, value: r.value, min: r.min, active: !!r.active, note: r.note });
const toOrder = r => ({
  id: r.id, email: r.email, customer: { name: r.cust_name, phone: r.cust_phone, address: r.cust_address, city: r.cust_city, state: r.cust_state },
  items: q.itemsFor.all(r.id), subtotal: r.subtotal, discount: r.discount, delivery: r.delivery, total: r.total,
  coupon: r.coupon, payment: r.payment, status: r.status, created: r.created
});

/* First start: load the 192-product catalogue and default coupons. */
if (db.prepare('SELECT COUNT(*) AS n FROM products').get().n === 0) {
  tx(() => {
    SEED.buildProducts().forEach(saveProduct);
    SEED.coupons.forEach(c => q.couponUpsert.run(c.id, c.code, c.type, c.value, c.min, c.active ? 1 : 0, c.note));
  });
  console.log('Seeded database with sample catalogue.');
}

/* ---------- auth ---------- */
const tokens = new Map(); // token -> expiry
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
function isAdmin(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  const exp = tokens.get(t);
  if (!exp || exp < Date.now()) { tokens.delete(t); return false; }
  return true;
}
const attempts = new Map(); // ip -> {n, reset}
function throttled(ip, limit = 10) {
  const a = attempts.get(ip);
  if (!a || a.reset < Date.now()) { attempts.set(ip, { n: 1, reset: Date.now() + 15 * 60000 }); return false; }
  return ++a.n > limit;
}

/* ---------- customer accounts: passwords + server-side sessions ----------
   The browser only ever holds an opaque HttpOnly cookie. The database stores a SHA-256 of that token,
   so a leaked database cannot be used to hijack sessions. Passwords use scrypt with a per-user salt. */
const SESSION_DAYS = 30;
const scrypt = (pw, salt) => new Promise((ok, no) => crypto.scrypt(pw, salt, 64, (e, k) => (e ? no(e) : ok(k))));
const checkPw = async (pw, salt, hash) => crypto.timingSafeEqual(await scrypt(pw, salt), Buffer.from(hash, 'hex'));
const DUMMY_SALT = '00'.repeat(16); // used so unknown emails take as long to reject as wrong passwords
const sidHash = t => crypto.createHash('sha256').update(t).digest('hex');
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, picture: u.picture || '', provider: u.google_sub && !u.pw_hash ? 'google' : 'password' });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function readCookie(req, name) {
  const part = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
}
function currentUser(req) {
  const t = readCookie(req, 'jibuy_sid');
  return t ? q.sessionUser.get(sidHash(t), Date.now()) || null : null;
}
const cookieFlags = () => 'Path=/; HttpOnly; SameSite=Lax' + (process.env.COOKIE_SECURE === '1' ? '; Secure' : '');
function startSession(res, user) {
  const token = crypto.randomBytes(32).toString('hex');
  q.sessionInsert.run(sidHash(token), user.id, Date.now() + SESSION_DAYS * 864e5, Date.now());
  res.setHeader('Set-Cookie', `jibuy_sid=${token}; Max-Age=${SESSION_DAYS * 86400}; ${cookieFlags()}`);
}
setInterval(() => q.sessionsPurge.run(Date.now()), 3600e3).unref();

/* ---------- helpers ---------- */
class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
function send(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 5e6) { reject(new HttpError(413, 'Payload too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(new HttpError(400, 'Invalid JSON')); } });
  });
}

/* Orders are priced and stocked on the server, inside one transaction. Browser totals are ignored.
   The stock UPDATE only succeeds while stock >= qty, so two buyers can never oversell the last item. */
function createOrder(input, user) {
  if (!Array.isArray(input.items) || !input.items.length) throw new HttpError(400, 'Your cart is empty.');
  const c = input.customer || {};
  if (!c.name || !c.phone || !c.address || !c.city || !c.state) throw new HttpError(400, 'Delivery details are incomplete.');
  return tx(() => {
    const items = input.items.map(it => {
      const p = q.productOne.get(str(it.id, 40));
      const qty = Math.floor(Number(it.qty));
      if (!p || !(qty >= 1)) throw new HttpError(409, 'An item in your cart is no longer available.');
      if (q.takeStock.run(qty, p.id, qty).changes === 0) throw new HttpError(409, `Only ${p.stock} of "${p.name}" left in stock.`);
      return { id: p.id, name: p.name, variant: str(it.variant, 40), price: p.price, qty, image: parse(p.images, [''])[0] || '' };
    });
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const cp = input.coupon ? q.couponByCode.get(str(input.coupon, 20).toUpperCase()) : null;
    const ok = cp && subtotal >= cp.min;
    let discount = 0;
    if (ok && cp.type === 'percent') discount = Math.round(subtotal * cp.value / 100);
    if (ok && cp.type === 'fixed') discount = Math.min(subtotal, cp.value);
    const delivery = (ok && cp.type === 'shipping') || subtotal - discount >= CONFIG.FREE_DELIVERY_THRESHOLD ? 0 : zoneFee(str(c.state, 40));
    const payment = ['card', 'transfer', 'cod'].includes(input.payment) ? input.payment : 'cod';
    const id = 'JB-' + Date.now().toString().slice(-6) + crypto.randomInt(10, 99);
    q.orderInsert.run(id, user.id, str(input.email, 120).toLowerCase() || user.email, str(c.name, 80), str(c.phone, 20), str(c.address, 200), str(c.city, 60), str(c.state, 40),
      subtotal, discount, delivery, subtotal - discount + delivery, ok ? cp.code : null, payment, payment === 'cod' ? 'Awaiting delivery' : 'Processing', Date.now());
    items.forEach(i => q.itemInsert.run(id, i.id, i.name, i.variant, i.price, i.qty, i.image));
    return toOrder(q.orderOne.get(id));
  });
}

/* ---------- API ---------- */
async function api(req, res, url) {
  const { pathname } = url;
  const m = req.method;
  const idOf = p => decodeURIComponent(pathname.slice(p.length + 1));

  if (pathname === '/api/admin/login' && m === 'POST') {
    if (throttled(req.socket.remoteAddress)) throw new HttpError(429, 'Too many attempts. Try again later.');
    const b = await body(req);
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !safeEqual(str(b.email).toLowerCase(), ADMIN_EMAIL) || !safeEqual(str(b.password, 200), ADMIN_PASSWORD)) throw new HttpError(401, 'Incorrect admin email or password.');
    const token = crypto.randomBytes(32).toString('hex');
    tokens.set(token, Date.now() + 8 * 3600e3);
    return send(res, 200, { token });
  }

  /* ----- customer accounts ----- */
  if (pathname === '/api/auth/register' && m === 'POST') {
    if (throttled('reg:' + req.socket.remoteAddress, 20)) throw new HttpError(429, 'Too many attempts. Try again later.');
    const b = await body(req);
    const name = str(b.name, 80).trim(), email = str(b.email, 120).trim().toLowerCase(), pw = str(b.password, 100);
    if (name.length < 2) throw new HttpError(400, 'Enter your full name.');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address.');
    if (!(pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw))) throw new HttpError(400, 'Use at least 8 characters with a letter and a number.');
    if (q.userByEmail.get(email)) throw new HttpError(409, 'An account with this email already exists. Try signing in.');
    const salt = crypto.randomBytes(16).toString('hex');
    const user = { id: 'u_' + crypto.randomBytes(8).toString('hex'), name, email, pw_hash: (await scrypt(pw, salt)).toString('hex'), pw_salt: salt, google_sub: null, picture: '' };
    q.userInsert.run(user.id, name, email, user.pw_hash, salt, null, '', Date.now());
    startSession(res, user);
    return send(res, 201, publicUser(user));
  }
  if (pathname === '/api/auth/login' && m === 'POST') {
    if (throttled('login:' + req.socket.remoteAddress, 20)) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
    const b = await body(req);
    const user = q.userByEmail.get(str(b.email, 120).trim().toLowerCase());
    if (user && !user.pw_hash) throw new HttpError(401, 'This email uses Google sign-in. Choose "Continue with Google".');
    const ok = await checkPw(str(b.password, 100), user ? user.pw_salt : DUMMY_SALT, user ? user.pw_hash : '00'.repeat(64)).catch(() => false);
    if (!user || !ok) throw new HttpError(401, 'Incorrect email or password.');
    startSession(res, user);
    return send(res, 200, publicUser(user));
  }
  if (pathname === '/api/auth/google' && m === 'POST') {
    const { credential } = await body(req);
    if (!GOOGLE_CLIENT_ID) throw new HttpError(501, 'Google sign-in is not configured on the server.');
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(str(credential, 4000)));
    const p = await r.json();
    if (!r.ok || p.aud !== GOOGLE_CLIENT_ID || p.email_verified !== 'true') throw new HttpError(401, 'Google sign-in could not be verified.');
    const email = str(p.email, 120).toLowerCase();
    let user = q.userByEmail.get(email);
    if (!user) {
      user = { id: 'u_' + crypto.randomBytes(8).toString('hex'), name: str(p.name || email, 80), email, pw_hash: null, pw_salt: null, google_sub: p.sub, picture: str(p.picture, 300) };
      q.userInsert.run(user.id, user.name, email, null, null, p.sub, user.picture, Date.now());
    } else if (!user.google_sub) { q.userGoogle.run(p.sub, str(p.picture, 300), user.id); user.google_sub = p.sub; user.picture = str(p.picture, 300); }
    startSession(res, user);
    return send(res, 200, publicUser(user));
  }
  if (pathname === '/api/auth/me' && m === 'GET') { const u = currentUser(req); return send(res, 200, { user: u ? publicUser(u) : null }); }
  if (pathname === '/api/auth/logout' && m === 'POST') {
    const t = readCookie(req, 'jibuy_sid');
    if (t) q.sessionDel.run(sidHash(t));
    res.setHeader('Set-Cookie', `jibuy_sid=; Max-Age=0; ${cookieFlags()}`);
    return send(res, 200, { ok: true });
  }

  if (pathname === '/api/products' && m === 'GET') return send(res, 200, q.productAll.all().map(toProduct));
  if (pathname === '/api/coupons' && m === 'GET') return send(res, 200, (isAdmin(req) ? q.couponAll : q.couponActive).all().map(toCoupon));
  if (pathname === '/api/orders' && m === 'POST') {
    const user = currentUser(req);
    if (!user) throw new HttpError(401, 'Please sign in to place your order.');
    return send(res, 201, createOrder(await body(req), user));
  }
  if (pathname === '/api/orders/mine' && m === 'GET') {
    const user = currentUser(req);
    if (!user) throw new HttpError(401, 'Please sign in to see your orders.');
    return send(res, 200, q.ordersByUser.all(user.id).map(toOrder));
  }
  if (pathname === '/api/reviews' && m === 'GET') return send(res, 200, q.reviewsFor.all(str(url.searchParams.get('product'), 40)));
  if (pathname === '/api/reviews' && m === 'POST') {
    const user = currentUser(req);
    if (!user) throw new HttpError(401, 'Please sign in to write a review.');
    const b = await body(req);
    const rating = Math.floor(Number(b.rating)), text = str(b.text, 500).trim();
    if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, 'Choose a rating from 1 to 5.');
    if (text.length < 10) throw new HttpError(400, 'Write at least 10 characters.');
    if (!q.productOne.get(str(b.productId, 40))) throw new HttpError(404, 'Product not found.');
    q.reviewUpsert.run(str(b.productId, 40), user.id, user.name.split(' ')[0], rating, text, Date.now());
    return send(res, 201, { ok: true });
  }

  // everything below needs an admin token
  if (!isAdmin(req)) throw new HttpError(401, 'Admin sign-in required.');

  if (pathname === '/api/orders' && m === 'GET') return send(res, 200, q.orderAll.all().map(toOrder));
  if (pathname.startsWith('/api/orders/') && m === 'PATCH') {
    const { status } = await body(req);
    if (!['Processing', 'Awaiting delivery', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) throw new HttpError(400, 'Invalid status.');
    const id = idOf('/api/orders');
    if (q.orderStatus.run(status, id).changes === 0) throw new HttpError(404, 'Order not found.');
    return send(res, 200, toOrder(q.orderOne.get(id)));
  }
  if (pathname === '/api/products' && m === 'POST') {
    const p = await body(req);
    if (!p.id || !p.name || !(p.price > 0) || !Array.isArray(p.images) || !p.images.length) throw new HttpError(400, 'Invalid product.');
    saveProduct(p);
    return send(res, 200, toProduct(q.productOne.get(str(p.id, 40))));
  }
  if (pathname.startsWith('/api/products/') && m === 'DELETE') { q.productDel.run(idOf('/api/products')); return send(res, 200, { ok: true }); }
  if (pathname === '/api/coupons' && m === 'POST') {
    const c = await body(req);
    if (!/^[A-Z0-9]{3,20}$/.test(str(c.code))) throw new HttpError(400, 'Invalid coupon code.');
    if (!['percent', 'fixed', 'shipping'].includes(c.type)) throw new HttpError(400, 'Invalid coupon type.');
    q.couponUpsert.run(str(c.id || c.code, 20), c.code, c.type, Math.max(0, Math.floor(c.value) || 0), Math.max(0, Math.floor(c.min) || 0), c.active ? 1 : 0, str(c.note, 100));
    return send(res, 200, toCoupon(q.couponAny.get(c.code)));
  }
  if (pathname.startsWith('/api/coupons/') && m === 'DELETE') { q.couponDel.run(idOf('/api/coupons')); return send(res, 200, { ok: true }); }
  throw new HttpError(404, 'Not found.');
}

/* ---------- static files (storefront + admin) ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const PUBLIC = new Set(['index.html', 'admin.html', 'styles.css', 'config.js', 'products-data.js', 'storage.js', 'app.js', 'admin.js']);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (ORIGIN) { // cross-origin API use is opt-in; credentials let the session cookie travel
    res.setHeader('Access-Control-Allow-Origin', ORIGIN);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  try {
    if (url.pathname.startsWith('/api/')) {
      // CSRF guard: a state-changing request from another site's page is refused
      const origin = req.headers.origin;
      if (!['GET', 'HEAD'].includes(req.method) && origin && origin !== ORIGIN && new URL(origin).host !== req.headers.host) throw new HttpError(403, 'Cross-site request blocked.');
      return await api(req, res, url);
    }
    const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (!PUBLIC.has(name)) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(name)], 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(path.join(__dirname, name)).pipe(res);
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    if (!res.headersSent) send(res, e instanceof HttpError ? e.code : 500, { error: e instanceof HttpError ? e.message : 'Server error. Please try again.' });
  }
});
server.listen(PORT, () => console.log(`Jibuy running at http://localhost:${PORT}  (database: ${DB_FILE})`));

process.on('SIGINT', () => { db.close(); process.exit(0); });
process.on('SIGTERM', () => { db.close(); process.exit(0); });
