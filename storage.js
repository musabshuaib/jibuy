/* storage.js — shared data layer for the storefront and the admin panel.
   - Local mode (config API_BASE = ''): everything lives in localStorage.
   - Backend mode (API_BASE set): products, coupons and orders go through server.js.
   Also holds: DOM builder h() (safe: text only via text nodes), money(), image artwork, accounts. */
(function () {
  'use strict';
  const C = window.JIBUY_CONFIG;
  const S = window.JIBUY_SEED;
  const REMOTE = Boolean(C.API_BASE);
  const K = {
    products: 'jibuy:products', orders: 'jibuy:orders', coupons: 'jibuy:coupons', users: 'jibuy:users',
    reviews: 'jibuy:reviews', session: 'jibuy:session', admin: 'jibuy:admin',
    adminFlag: 'jibuy:isadmin', adminToken: 'jibuy:admintoken'
  };

  /* ---------- utilities ---------- */
  const read = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const uid = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const nf = new Intl.NumberFormat(C.LOCALE, { style: 'currency', currency: C.CURRENCY, maximumFractionDigits: 0 });
  const money = n => nf.format(n || 0);

  /* Safe DOM builder: attributes via setAttribute, children via text nodes. Never uses innerHTML. */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    const add = c => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return el;
  }

  /* ---------- product artwork ---------- */
  const artCache = new Map();
  function art(emoji, hue, v) {
    const h2 = (hue + 40 + v * 25) % 360;
    const shapes = [
      `<circle cx="470" cy="130" r="150" fill="hsl(${h2} 80% 70% / .35)"/><circle cx="90" cy="500" r="110" fill="hsl(${hue} 90% 85% / .25)"/>`,
      `<rect x="360" y="-40" width="300" height="300" rx="60" transform="rotate(25 510 110)" fill="hsl(${h2} 80% 70% / .3)"/><circle cx="80" cy="520" r="120" fill="#fff" fill-opacity=".12"/>`,
      `<path d="M0 420 Q150 330 300 420 T600 400 V600 H0Z" fill="hsl(${h2} 80% 60% / .4)"/><circle cx="480" cy="110" r="70" fill="#fff" fill-opacity=".18"/>`
    ];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 75% 38%)"/><stop offset="1" stop-color="hsl(${h2} 80% 22%)"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/>${shapes[v % 3]}<text x="300" y="330" font-size="230" text-anchor="middle" dominant-baseline="central">${emoji}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  /* Turns "art|…" tokens into artwork; allows only https:, data:image/ and relative URLs. */
  function img(src) {
    if (typeof src !== 'string') return art('📦', 220, 0);
    if (artCache.has(src)) return artCache.get(src);
    let out;
    if (src.startsWith('art|')) {
      const [, emoji, hue, v] = src.split('|');
      out = art(emoji, Number(hue) || 220, Number(v) || 0);
    } else if (/^(https:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(src) || /^[\w\-./]+\.(png|jpe?g|webp|svg)$/i.test(src)) {
      out = src;
    } else out = art('📦', 220, 0);
    artCache.set(src, out);
    return out;
  }

  /* ---------- delivery ---------- */
  const zoneFee = st => { const z = C.DELIVERY_ZONES.find(z => z.states.includes(st)); return z ? z.fee : 5000; };
  const states = C.DELIVERY_ZONES.flatMap(z => z.states).sort();

  /* ---------- HTTP ---------- */
  async function api(path, { method = 'GET', body, admin = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const tok = sessionStorage.getItem(K.adminToken);
    if (admin && tok) headers.Authorization = 'Bearer ' + tok;
    const res = await fetch(C.API_BASE + path, { method, headers, credentials: 'include', body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  /* ---------- collections ---------- */
  function collection(key, path, seedFn) {
    return {
      async all(opts = {}) {
        if (REMOTE) {
          try { const d = await api(path, { admin: opts.admin }); write(key, d); return d; }
          catch (e) { console.warn('[Jibuy] backend unreachable, using local cache:', e.message); }
        }
        let d = read(key, null);
        if (!d) { d = seedFn(); write(key, d); }
        return d;
      },
      async upsert(item) {
        if (REMOTE) return api(path, { method: 'POST', body: item, admin: true });
        const list = read(key, seedFn());
        const i = list.findIndex(x => x.id === item.id);
        if (i >= 0) list[i] = item; else list.unshift(item);
        if (!write(key, list)) throw new Error('Browser storage is full. Use smaller images.');
        return item;
      },
      async remove(id) {
        if (REMOTE) { await api(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE', admin: true }); return; }
        write(key, read(key, []).filter(x => x.id !== id));
      }
    };
  }
  const products = collection(K.products, '/api/products', S.buildProducts);
  const coupons = collection(K.coupons, '/api/coupons', () => S.coupons);

  const orders = {
    async all() { return REMOTE ? api('/api/orders', { admin: true }) : read(K.orders, []); },
    /* Backend mode: the server returns the signed-in customer's orders (session cookie). */
    async mine(email) {
      if (REMOTE) return api('/api/orders/mine');
      return read(K.orders, []).filter(o => o.email === String(email).toLowerCase());
    },
    async create(order) {
      if (REMOTE) return api('/api/orders', { method: 'POST', body: order }); // server prices it, takes stock, links it to the session user
      const list = read(K.products, []);
      order.items.forEach(it => { const p = list.find(x => x.id === it.id); if (p) p.stock = Math.max(0, p.stock - it.qty); });
      write(K.products, list);
      const all = read(K.orders, []);
      all.unshift(order);
      write(K.orders, all);
      return order;
    },
    async setStatus(id, status) {
      if (REMOTE) { await api('/api/orders/' + encodeURIComponent(id), { method: 'PATCH', body: { status }, admin: true }); return; }
      write(K.orders, read(K.orders, []).map(o => (o.id === id ? { ...o, status } : o)));
    }
  };

  const reviews = {
    async get(pid) {
      if (REMOTE) { try { return await api('/api/reviews?product=' + encodeURIComponent(pid)); } catch (e) { return []; } }
      return (read(K.reviews, {})[pid]) || [];
    },
    async add(pid, r) {
      if (REMOTE) { await api('/api/reviews', { method: 'POST', body: { productId: pid, rating: r.rating, text: r.text } }); return; }
      const all = read(K.reviews, {}); (all[pid] = all[pid] || []).unshift(r); write(K.reviews, all);
    }
  };

  /* ---------- accounts ---------- */
  async function pbkdf2(password, saltHex) {
    if (!(window.crypto && crypto.subtle)) throw new Error('Secure sign-in needs https:// or http://localhost. Open the site through a local server.');
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(saltHex), iterations: 150000 }, key, 256);
    return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const randomHex = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
  function decodeJwt(t) {
    const b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(b).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
  }
  function startSession(u, provider) {
    const s = { id: u.id, name: u.name, email: u.email, picture: u.picture || '', provider };
    write(K.session, s);
    return s;
  }

  /* Backend mode: the real session is an HttpOnly cookie set by server.js. localStorage only caches the
     public profile so the header can render instantly; Auth.refresh() re-checks it with the server. */
  async function remoteSession(path, body) {
    const u = await api(path, { method: 'POST', body });
    write(K.session, u);
    return u;
  }

  const Auth = {
    session() { return read(K.session, null); },
    async refresh() {
      if (!REMOTE) return Auth.session();
      try {
        const r = await api('/api/auth/me');
        if (r.user) write(K.session, r.user); else localStorage.removeItem(K.session);
      } catch (e) { /* offline: keep the cached profile */ }
      return Auth.session();
    },
    async logout() {
      if (REMOTE) { try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ } }
      try { localStorage.removeItem(K.session); } catch (e) { /* ignore */ }
    },
    async register({ name, email, password }) {
      if (REMOTE) return remoteSession('/api/auth/register', { name, email, password });
      email = email.trim().toLowerCase();
      const users = read(K.users, []);
      if (users.some(u => u.email === email)) throw new Error('An account with this email already exists. Try signing in.');
      const salt = randomHex();
      const u = { id: uid('u'), name: name.trim(), email, salt, hash: await pbkdf2(password, salt), created: Date.now() };
      users.push(u);
      write(K.users, users);
      return startSession(u, 'password');
    },
    async login({ email, password }) {
      if (REMOTE) return remoteSession('/api/auth/login', { email, password });
      email = email.trim().toLowerCase();
      const u = read(K.users, []).find(x => x.email === email);
      if (u && !u.hash) throw new Error('This email uses Google sign-in. Choose "Continue with Google".');
      if (!u || (await pbkdf2(password, u.salt)) !== u.hash) throw new Error('Incorrect email or password.');
      return startSession(u, 'password');
    },
    async google(credential) {
      /* Backend mode: the server verifies the token and starts the session. Local mode only decodes it (demo only). */
      if (REMOTE) return remoteSession('/api/auth/google', { credential });
      const p = decodeJwt(credential);
      const email = String(p.email || '').toLowerCase();
      if (!email) throw new Error('Google did not return an email address.');
      const users = read(K.users, []);
      let u = users.find(x => x.email === email);
      if (!u) { u = { id: uid('u'), name: p.name || email, email, picture: p.picture || '', created: Date.now() }; users.push(u); write(K.users, users); }
      return startSession({ ...u, picture: p.picture || u.picture }, 'google');
    },
    /* Admin. Local mode: first visit creates the admin account (salted PBKDF2 hash, no secret in code). */
    isAdmin() { return sessionStorage.getItem(K.adminFlag) === '1'; },
    async adminExists() { return REMOTE ? true : Boolean(read(K.admin, null)); },
    async adminSetup({ email, password }) {
      if (REMOTE || read(K.admin, null)) throw new Error('Admin account already exists.');
      const salt = randomHex();
      write(K.admin, { email: email.trim().toLowerCase(), salt, hash: await pbkdf2(password, salt) });
      sessionStorage.setItem(K.adminFlag, '1');
    },
    async adminLogin({ email, password }) {
      if (REMOTE) {
        const r = await api('/api/admin/login', { method: 'POST', body: { email, password } });
        sessionStorage.setItem(K.adminToken, r.token);
      } else {
        const a = read(K.admin, null);
        if (!a || a.email !== email.trim().toLowerCase() || (await pbkdf2(password, a.salt)) !== a.hash) throw new Error('Incorrect admin email or password.');
      }
      sessionStorage.setItem(K.adminFlag, '1');
    },
    adminLogout() { sessionStorage.removeItem(K.adminFlag); sessionStorage.removeItem(K.adminToken); },
    resetCatalogue() { if (!REMOTE) { localStorage.removeItem(K.products); localStorage.removeItem(K.coupons); } }
  };

  window.Jibuy = {
    REMOTE, K, categories: S.categories, states, zoneFee, img, Auth,
    Store: { products, coupons, orders, reviews },
    util: { h, money, debounce, read, write, uid, sleep }
  };
})();
