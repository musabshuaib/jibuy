'use strict';

/* ==========================================================================
   JIBUY — app.js
   Sections: Utils -> Storage -> Data (Nigeria states, categories, products,
   image generator) -> State -> Render -> Feature modules (search/filter,
   product detail, cart, wishlist, checkout, auth, admin) -> Init
   ========================================================================== */

/* ---------------------------- Utils ---------------------------- */
const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function formatNaira(n) {
  return '₦' + Math.round(n).toLocaleString('en-NG');
}

function uid(prefix) {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setText(el, text) { if (el) el.textContent = text; }

function toast(message, type) {
  const container = $('#toastContainer');
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.setAttribute('role', 'status');
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 200ms'; setTimeout(() => el.remove(), 220); }, 2800);
}

/* ---------------------------- Storage ---------------------------- */
const LS = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage full/unavailable */ }
  }
};

const KEYS = {
  cart: 'jibuy_cart', wishlist: 'jibuy_wishlist', users: 'jibuy_users',
  currentUser: 'jibuy_current_user', orders: 'jibuy_orders',
  adminAdds: 'jibuy_admin_added', adminEdits: 'jibuy_admin_edits', adminDeletes: 'jibuy_admin_deletes',
  reviews: 'jibuy_reviews', theme: 'jibuy_theme', adminSession: 'jibuy_admin_session'
};

/* ---------------------------- Nigeria delivery data ---------------------------- */
const STATE_FEES = {
  'FCT (Abuja)': 1500, 'Lagos': 1500,
  'Ogun': 2500, 'Oyo': 2500, 'Osun': 2500, 'Ondo': 2500, 'Ekiti': 2500,
  'Niger': 3000, 'Kwara': 3000, 'Kogi': 3000, 'Nasarawa': 3000, 'Plateau': 3000, 'Benue': 3000,
  'Rivers': 3000, 'Delta': 3000, 'Bayelsa': 3000, 'Edo': 3000, 'Akwa Ibom': 3000, 'Cross River': 3000,
  'Anambra': 3000, 'Enugu': 3000, 'Imo': 3000, 'Abia': 3000, 'Ebonyi': 3000,
  'Kano': 3500, 'Kaduna': 3500, 'Katsina': 3500, 'Jigawa': 3500, 'Kebbi': 3500, 'Sokoto': 3500, 'Zamfara': 3500,
  'Borno': 3500, 'Yobe': 3500, 'Adamawa': 3500, 'Bauchi': 3500, 'Gombe': 3500, 'Taraba': 3500
};
const NIGERIA_STATES = Object.keys(STATE_FEES).sort();

const COUPONS = {
  JIBUY10: { type: 'percent', value: 10, label: '10% off' },
  WELCOME15: { type: 'percent', value: 15, label: '15% off' },
  FREESHIP: { type: 'freeship', value: 0, label: 'Free delivery' }
};

/* ---------------------------- Category meta ---------------------------- */
const CATEGORIES = {
  clothing: { label: 'Clothing', accentVar: '--coral', bgVar: '--coral-bg' },
  wine: { label: 'Wine', accentVar: '--berry', bgVar: '--berry-bg' },
  beads: { label: 'Beads', accentVar: '--gold', bgVar: '--gold-bg' }
};

/* ---------------------------- Illustration generator ----------------------------
   Every product image is a generated SVG illustration (data URI). No external
   image requests are made, so images never break, load instantly, and scale
   crisply at any size — and every product still gets a distinct look driven
   by a seed derived from its id. */
const PALETTES = [
  ['#FF5A3C', '#FFD166'], ['#0E8F6E', '#8CF0C9'], ['#C23B6B', '#FFB6D9'],
  ['#3A6FF7', '#9FD0FF'], ['#D69420', '#FFE39B'], ['#7C4DFF', '#D9C7FF'],
  ['#12A594', '#C8F4EA'], ['#E8593A', '#FFE0C2']
];

const CATEGORY_ICONS = {
  clothing: '<path d="M100 40 L80 60 L88 72 L100 62 V150 H132 V62 L144 72 L152 60 L132 40 C132 50 120 56 116 56 C112 56 100 50 100 40 Z" fill="rgba(255,255,255,.92)"/>',
  wine: '<path d="M96 30 H136 C136 55 128 66 116 72 V116 H126 A6 6 0 0 1 126 128 H106 A6 6 0 0 1 106 116 H116 V72 C104 66 96 55 96 30 Z" fill="rgba(255,255,255,.92)"/>',
  beads: '<g fill="rgba(255,255,255,.92)"><circle cx="66" cy="70" r="10"/><circle cx="88" cy="88" r="11"/><circle cx="116" cy="96" r="12"/><circle cx="144" cy="88" r="11"/><circle cx="166" cy="70" r="10"/></g>'
};

function svgIllustration(category, seed, variantOffset) {
  const rand = mulberry32(seed + (variantOffset || 0) * 97);
  const pal = PALETTES[Math.floor(rand() * PALETTES.length)];
  const angle = Math.floor(rand() * 360);
  const blobs = [];
  for (let i = 0; i < 3; i++) {
    const cx = 40 + rand() * 150, cy = 40 + rand() * 150, r = 30 + rand() * 46;
    blobs.push(`<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="rgba(255,255,255,${(0.08 + rand() * 0.1).toFixed(2)})"/>`);
  }
  const icon = CATEGORY_ICONS[category] || '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 232 232">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle} .5 .5)">
      <stop offset="0%" stop-color="${pal[0]}"/><stop offset="100%" stop-color="${pal[1]}"/>
    </linearGradient></defs>
    <rect width="232" height="232" fill="url(#g)"/>
    ${blobs.join('')}
    <g transform="translate(16,16)">${icon}</g>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function heroIllustration() {
  const el = $('#heroArt');
  if (!el) return;
  const svg = `<svg width="220" height="220" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of clothing, wine and beaded accessories">
    <circle cx="110" cy="110" r="100" fill="${PALETTES[1][1]}" opacity=".5"/>
    <circle cx="150" cy="70" r="46" fill="${PALETTES[0][0]}" opacity=".85"/>
    <circle cx="70" cy="150" r="54" fill="${PALETTES[2][0]}" opacity=".85"/>
    <g transform="translate(66,46)">${CATEGORY_ICONS.clothing.replace(/rgba\(255,255,255,.92\)/, '#fff')}</g>
    <g transform="translate(18,110) scale(.62)">${CATEGORY_ICONS.wine.replace(/rgba\(255,255,255,.92\)/, '#fff')}</g>
    <g transform="translate(120,140) scale(.55)">${CATEGORY_ICONS.beads.replace(/rgba\(255,255,255,.92\)/, '#fff')}</g>
  </svg>`;
  el.innerHTML = svg;
}

/* ---------------------------- Product data generation ---------------------------- */
const NAME_POOLS = {
  clothing: {
    a: ['Ankara', 'Aso-ebi', 'Kaftan', 'Senator', 'Denim', 'Silk', 'Cotton', 'Tie-Dye', 'Adire', 'Lace', 'Corduroy', 'Linen'],
    b: ['Wrap Dress', 'Two-Piece Set', 'Agbada', 'Maxi Gown', 'Crop Top', 'Wide-Leg Trousers', 'Bomber Jacket', 'Button Shirt', 'Jumpsuit', 'Skirt Set', 'Kimono Robe', 'Shorts Set', 'Bubu Gown', 'Peplum Top', 'Jogger Set']
  },
  wine: {
    a: ['Sun Valley', 'Golden Vine', 'Naija Harvest', 'Cape Reserve', 'Lagos Cellar', 'Savannah', 'Delta Estate', 'Highland', 'Coastal Bloom', 'Amber Fields'],
    b: ['Red Wine', 'White Wine', 'Rosé Wine', 'Sparkling Wine', 'Dessert Wine', 'Sweet Red Blend', 'Dry White Blend', 'Zobo-Infused Wine', 'Palm Wine Reserve', 'Wine Gift Box']
  },
  beads: {
    a: ['Coral', 'Turquoise', 'Brass', 'Crystal', 'Wooden', 'Recycled Glass', 'Amber', 'Cowrie Shell', 'Ceramic', 'Gold-Dust'],
    b: ['Waist Beads', 'Statement Necklace', 'Bracelet Set', 'Anklet', 'Beaded Earrings', 'Bridal Beads Set', 'Layered Choker', 'Beaded Cuff', 'Beaded Hairpin', 'Beaded Belt']
  }
};

const PRICE_RANGES = { clothing: [6000, 45000], wine: [4000, 26000], beads: [2500, 18000] };
const VARIANT_OPTIONS = {
  clothing: [{ name: 'Size', options: ['S', 'M', 'L', 'XL'] }, { name: 'Color', options: ['Black', 'Red', 'Royal Blue', 'Cream', 'Green'] }],
  wine: [{ name: 'Bottle size', options: ['75cl', '1L'] }],
  beads: [{ name: 'Size', options: ['Standard', 'Extended'] }, { name: 'Color', options: ['Multicolor', 'Gold-tone', 'Earth tone'] }]
};

const REVIEW_NAMES = ['Chiamaka O.', 'Tunde A.', 'Ngozi E.', 'Bola S.', 'Emeka N.', 'Aisha M.', 'Kelechi U.', 'Funmi B.', 'Ibrahim K.', 'Zainab L.', 'Chidera P.', 'Yusuf D.'];
const REVIEW_COMMENTS = {
  clothing: ['Fit is perfect and the fabric feels premium.', 'Got so many compliments wearing this out.', 'True to size, arrived well packaged.', 'Color is even nicer in person.', 'Great for the price, will order again.'],
  wine: ['Smooth taste, perfect for owambe season.', 'Arrived well packed, no breakage.', 'Good balance, not too sweet.', 'Great gift, the box looks classy.', 'My go-to now for small gatherings.'],
  beads: ['Beautifully made, exactly like the photos.', 'Comfortable to wear all day.', 'Great quality for the price.', 'Perfect for my traditional outfit.', 'Packaging was lovely, felt like a gift.']
};

function generateDescription(category, name) {
  const lines = {
    clothing: `The ${name} is cut for everyday confidence — breathable fabric, a flattering silhouette, and finishing details built to last through Lagos heat and long owambe nights. Pair it up or down; it holds its shape wash after wash.`,
    wine: `${name} is a small-batch pick chosen for balance over harshness — smooth on the first sip, food-friendly, and a good match for celebrations big and small. Best served chilled and shared.`,
    beads: `Handset piece by piece, the ${name} brings a traditional touch to modern styling. Lightweight, durable stringing, and finished to sit comfortably whether it's a quick outing or a full aso-ebi look.`
  };
  return lines[category];
}

function buildReviews(category, seed, count) {
  const rand = mulberry32(seed + 555);
  const reviews = [];
  const today = new Date('2026-09-24');
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(rand() * 85) + 1;
    const d = new Date(today.getTime() - daysAgo * 86400000);
    reviews.push({
      id: uid('rv'),
      name: REVIEW_NAMES[Math.floor(rand() * REVIEW_NAMES.length)],
      rating: 3 + Math.floor(rand() * 3),
      comment: REVIEW_COMMENTS[category][Math.floor(rand() * REVIEW_COMMENTS[category].length)],
      date: d.toISOString().slice(0, 10)
    });
  }
  return reviews;
}

function generateProducts() {
  const list = [];
  let counter = 1;

  function pushBatch(category, count) {
    const pool = NAME_POOLS[category];
    const [min, max] = PRICE_RANGES[category];
    for (let i = 0; i < count; i++) {
      const a = pool.a[i % pool.a.length];
      const b = pool.b[Math.floor(i / pool.a.length) % pool.b.length];
      const name = `${a} ${b}`;
      const id = 'p' + counter;
      const seed = hashCode(id + name);
      const rand = mulberry32(seed);
      const price = Math.round((min + rand() * (max - min)) / 500) * 500;
      const rating = Math.round((3.4 + rand() * 1.6) * 10) / 10;
      const reviewCount = Math.floor(rand() * 140) + 3;
      const stock = Math.floor(rand() * 42);
      const seedReviews = buildReviews(category, seed, Math.min(4, Math.floor(rand() * 5)));
      list.push({
        id, name, category,
        price, rating: Math.min(5, rating), reviewCount, stock,
        description: generateDescription(category, name),
        variants: VARIANT_OPTIONS[category],
        images: [svgIllustration(category, seed, 0), svgIllustration(category, seed, 1), svgIllustration(category, seed, 2)],
        seedReviews,
        createdIndex: counter
      });
      counter++;
    }
  }

  pushBatch('clothing', 60);
  pushBatch('wine', 45);
  pushBatch('beads', 45);
  return list;
}

const BASE_PRODUCTS = generateProducts();

/* ---------------------------- App state ---------------------------- */
const state = {
  cart: LS.get(KEYS.cart, []),
  wishlist: LS.get(KEYS.wishlist, []),
  users: LS.get(KEYS.users, []),
  currentUser: LS.get(KEYS.currentUser, null),
  orders: LS.get(KEYS.orders, []),
  adminAdds: LS.get(KEYS.adminAdds, []),
  adminEdits: LS.get(KEYS.adminEdits, {}),
  adminDeletes: LS.get(KEYS.adminDeletes, []),
  extraReviews: LS.get(KEYS.reviews, {}),
  theme: LS.get(KEYS.theme, 'light'),
  adminLoggedIn: LS.get(KEYS.adminSession, false),
  filters: { category: 'all', search: '', maxPrice: 150000, sort: 'popular' },
  currentProductId: null,
  selectedVariant: {},
  detailQty: 1,
  activeImage: 0,
  couponCode: null,
  authMode: 'signin',
  adminEditId: null,
  adminTab: 'products'
};

function getAllProducts() {
  const edited = BASE_PRODUCTS
    .filter(p => !state.adminDeletes.includes(p.id))
    .map(p => (state.adminEdits[p.id] ? Object.assign({}, p, state.adminEdits[p.id]) : p));
  return edited.concat(state.adminAdds);
}

function getProduct(id) {
  return getAllProducts().find(p => p.id === id);
}

function getReviews(product) {
  const extra = state.extraReviews[product.id] || [];
  return (product.seedReviews || []).concat(extra).sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ---------------------------- View routing ---------------------------- */
function showView(name) {
  $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === name));
  $$('.bn-item[data-nav]').forEach(b => b.setAttribute('aria-current', b.dataset.nav === name ? 'true' : 'false'));
  window.scrollTo({ top: 0, behavior: 'auto' });
  closeCartDrawer();
  closeAuthModal();
}

/* ============================================================
   PRODUCT GRID
   ============================================================ */
function createProductCardEl(p) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.style.setProperty('--card-accent', `var(${CATEGORIES[p.category].accentVar})`);
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${p.name}, ${formatNaira(p.price)}`);

  const media = document.createElement('div');
  media.className = 'product-media';
  const img = document.createElement('img');
  img.src = p.images[0];
  img.alt = p.name;
  img.loading = 'lazy';
  media.appendChild(img);

  const wishBtn = document.createElement('button');
  wishBtn.className = 'wish-toggle';
  const isWished = state.wishlist.includes(p.id);
  wishBtn.setAttribute('aria-pressed', String(isWished));
  wishBtn.setAttribute('aria-label', isWished ? 'Remove from wishlist' : 'Add to wishlist');
  wishBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7.5-4.6-10-9.1C.5 8.6 2.3 5 6 5c2.1 0 3.6 1.1 4.5 2.4C11.4 6.1 12.9 5 15 5c3.7 0 5.5 3.6 4 6.9-2.5 4.5-10 9.1-10 9.1z"/></svg>';
  wishBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleWishlist(p.id); });
  media.appendChild(wishBtn);

  if (p.stock === 0) {
    const badge = document.createElement('span');
    badge.className = 'stock-badge';
    badge.textContent = 'Sold out';
    media.appendChild(badge);
  } else if (p.stock <= 4) {
    const badge = document.createElement('span');
    badge.className = 'stock-badge';
    badge.style.background = 'var(--gold-dark)';
    badge.textContent = `Only ${p.stock} left`;
    media.appendChild(badge);
  }

  const info = document.createElement('div');
  info.className = 'product-info';
  info.innerHTML = `
    <span class="product-cat">${CATEGORIES[p.category].label}</span>
    <span class="product-name"></span>
    <span class="product-rating"><svg viewBox="0 0 24 24"><path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.5 7.2-6.5-3.6-6.5 3.6 1.5-7.2-5.3-5 7.2-.9z"/></svg><span></span></span>
    <div class="product-price-row">
      <span class="product-price"></span>
    </div>`;
  info.querySelector('.product-name').textContent = p.name;
  info.querySelector('.product-rating span').textContent = `${p.rating.toFixed(1)} (${p.reviewCount})`;
  info.querySelector('.product-price').textContent = formatNaira(p.price);

  const addBtn = document.createElement('button');
  addBtn.className = 'add-cart-btn';
  addBtn.setAttribute('aria-label', `Add ${p.name} to cart`);
  addBtn.disabled = p.stock === 0;
  addBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>';
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (p.stock === 0) return;
    const defaultVariant = {};
    (p.variants || []).forEach(v => { defaultVariant[v.name] = v.options[0]; });
    addToCart(p.id, defaultVariant, 1);
  });
  info.querySelector('.product-price-row').appendChild(addBtn);

  card.appendChild(media);
  card.appendChild(info);
  card.addEventListener('click', () => openProduct(p.id));
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProduct(p.id); } });
  return card;
}

function renderSkeletons(container, count) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'skeleton-card';
    s.innerHTML = `<div class="skeleton skeleton-media"></div><div class="skeleton skeleton-line w60"></div><div class="skeleton skeleton-line w40"></div>`;
    container.appendChild(s);
  }
}

function emptyStateEl(message, sub) {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><h3>${message}</h3><p>${sub || ''}</p>`;
  return div;
}

function applyFilters() {
  const f = state.filters;
  let list = getAllProducts();
  if (f.category !== 'all') list = list.filter(p => p.category === f.category);
  if (f.search) {
    const q = f.search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.includes(q));
  }
  list = list.filter(p => p.price <= f.maxPrice);
  switch (f.sort) {
    case 'priceAsc': list.sort((a, b) => a.price - b.price); break;
    case 'priceDesc': list.sort((a, b) => b.price - a.price); break;
    case 'rating': list.sort((a, b) => b.rating - a.rating); break;
    case 'newest': list.sort((a, b) => b.createdIndex - a.createdIndex); break;
    default: list.sort((a, b) => b.reviewCount - a.reviewCount);
  }
  return list;
}

function renderGrid() {
  const grid = $('#productGrid');
  renderSkeletons(grid, 10);
  setTimeout(() => {
    const list = applyFilters();
    grid.innerHTML = '';
    setText($('#resultsCount'), `${list.length} item${list.length === 1 ? '' : 's'}`);
    if (list.length === 0) {
      grid.appendChild(emptyStateEl('No products match', 'Try a different category, price range, or search term.'));
      return;
    }
    list.forEach(p => grid.appendChild(createProductCardEl(p)));
  }, 220);
}

/* ============================================================
   PRODUCT DETAIL
   ============================================================ */
function openProduct(id) {
  const p = getProduct(id);
  if (!p) return;
  state.currentProductId = id;
  state.selectedVariant = {};
  (p.variants || []).forEach(v => { state.selectedVariant[v.name] = v.options[0]; });
  state.detailQty = 1;
  state.activeImage = 0;
  renderProductDetail();
  showView('product');
}

function renderProductDetail() {
  const p = getProduct(state.currentProductId);
  if (!p) return;
  const wrap = $('#pdContent');

  const variantHtml = (p.variants || []).map(v => `
    <div class="pd-block">
      <span class="pd-label">${v.name}</span>
      <div class="variant-row" data-variant-group="${v.name}">
        ${v.options.map(opt => `<button type="button" class="variant-opt" data-variant-name="${v.name}" data-variant-value="${opt}" aria-pressed="${state.selectedVariant[v.name] === opt}">${opt}</button>`).join('')}
      </div>
    </div>`).join('');

  wrap.innerHTML = `
    <div>
      <div class="pd-gallery-main"><img id="pdMainImg" src="${p.images[state.activeImage]}" alt="${p.name}"></div>
      <div class="pd-thumbs">
        ${p.images.map((img, i) => `<button class="pd-thumb ${i === state.activeImage ? 'active' : ''}" data-thumb-index="${i}" aria-label="Show image ${i + 1}"><img src="${img}" alt=""></button>`).join('')}
      </div>
    </div>
    <div>
      <span class="pd-cat">${CATEGORIES[p.category].label}</span>
      <h1 class="pd-title">${p.name}</h1>
      <div class="product-rating"><svg viewBox="0 0 24 24" width="14" fill="var(--gold)"><path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.5 7.2-6.5-3.6-6.5 3.6 1.5-7.2-5.3-5 7.2-.9z"/></svg><span>${p.rating.toFixed(1)} · ${p.reviewCount} ratings</span></div>
      <p class="pd-price">${formatNaira(p.price)}</p>
      <p class="pd-desc">${p.description}</p>
      ${variantHtml}
      <div class="pd-block">
        <span class="pd-label">Quantity</span>
        <div class="qty-stepper">
          <button type="button" id="pdQtyMinus" aria-label="Decrease quantity">−</button>
          <span id="pdQtyVal">${state.detailQty}</span>
          <button type="button" id="pdQtyPlus" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="pd-actions">
        <button class="btn btn-primary" id="pdAddCartBtn" ${p.stock === 0 ? 'disabled' : ''}>${p.stock === 0 ? 'Sold out' : 'Add to cart'}</button>
        <button class="btn btn-outline" id="pdWishBtn" aria-pressed="${state.wishlist.includes(p.id)}">${state.wishlist.includes(p.id) ? 'Saved' : 'Save for later'}</button>
      </div>
      <div class="pd-meta">
        <span>${p.stock > 0 ? p.stock + ' in stock' : 'Currently unavailable'}</span>
        <span>Delivery from ₦1,500 by state</span>
        <span>Simulated secure checkout</span>
      </div>
    </div>`;

  $$('.variant-opt', wrap).forEach(btn => btn.addEventListener('click', () => {
    state.selectedVariant[btn.dataset.variantName] = btn.dataset.variantValue;
    $$(`.variant-opt[data-variant-name="${btn.dataset.variantName}"]`, wrap).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  }));
  $$('.pd-thumb', wrap).forEach(t => t.addEventListener('click', () => {
    state.activeImage = Number(t.dataset.thumbIndex);
    $('#pdMainImg').src = p.images[state.activeImage];
    $$('.pd-thumb', wrap).forEach(x => x.classList.toggle('active', x === t));
  }));
  $('#pdQtyMinus').addEventListener('click', () => { state.detailQty = Math.max(1, state.detailQty - 1); setText($('#pdQtyVal'), state.detailQty); });
  $('#pdQtyPlus').addEventListener('click', () => { state.detailQty = Math.min(20, state.detailQty + 1); setText($('#pdQtyVal'), state.detailQty); });
  $('#pdAddCartBtn').addEventListener('click', () => {
    addToCart(p.id, Object.assign({}, state.selectedVariant), state.detailQty);
  });
  $('#pdWishBtn').addEventListener('click', () => { toggleWishlist(p.id); renderProductDetail(); });

  renderReviews(p);
}

function renderReviews(p) {
  const reviews = getReviews(p);
  const wrap = $('#pdReviews');
  wrap.innerHTML = `
    <div class="review-summary">
      <div class="review-avg">${p.rating.toFixed(1)}</div>
      <div><div class="stars">${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))}</div><p style="font-size:12px;color:var(--text-muted)">${reviews.length} review${reviews.length === 1 ? '' : 's'}</p></div>
    </div>
    <div id="reviewList"></div>
    <form class="review-form" id="reviewForm" novalidate>
      <span class="pd-label" style="margin-bottom:0">Write a review</span>
      <div class="star-select" id="reviewStars">
        ${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}" aria-label="${n} star">★</button>`).join('')}
      </div>
      <div class="form-group"><input type="text" id="reviewName" placeholder="Your name" required></div>
      <div class="form-group" style="margin-bottom:10px"><textarea id="reviewComment" placeholder="Share your experience" required></textarea></div>
      <button type="submit" class="btn btn-secondary btn-sm">Submit review</button>
    </form>`;

  const listEl = $('#reviewList', wrap);
  if (reviews.length === 0) {
    listEl.innerHTML = `<p style="color:var(--text-muted);font-size:13px;padding:10px 0">No reviews yet — be the first to share your experience.</p>`;
  } else {
    reviews.slice(0, 20).forEach(r => {
      const item = document.createElement('div');
      item.className = 'review-item';
      const head = document.createElement('div');
      head.className = 'review-head';
      const nameSpan = document.createElement('span'); nameSpan.className = 'review-name'; nameSpan.textContent = r.name;
      const dateSpan = document.createElement('span'); dateSpan.className = 'review-date'; dateSpan.textContent = r.date;
      head.appendChild(nameSpan); head.appendChild(dateSpan);
      const stars = document.createElement('div'); stars.className = 'stars'; stars.textContent = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const comment = document.createElement('p'); comment.style.cssText = 'font-size:13.5px;color:var(--text-soft);margin-top:4px'; comment.textContent = r.comment;
      item.appendChild(head); item.appendChild(stars); item.appendChild(comment);
      listEl.appendChild(item);
    });
  }

  let chosenStar = 5;
  const starBtns = $$('#reviewStars button', wrap);
  const paintStars = () => starBtns.forEach(b => b.classList.toggle('active', Number(b.dataset.star) <= chosenStar));
  paintStars();
  starBtns.forEach(b => b.addEventListener('click', () => { chosenStar = Number(b.dataset.star); paintStars(); }));

  $('#reviewForm', wrap).addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = $('#reviewName', wrap);
    const commentInput = $('#reviewComment', wrap);
    if (!nameInput.value.trim() || !commentInput.value.trim()) {
      toast('Please add your name and a comment.', 'error');
      return;
    }
    const newReview = { id: uid('rv'), name: nameInput.value.trim(), rating: chosenStar, comment: commentInput.value.trim(), date: new Date().toISOString().slice(0, 10) };
    if (!state.extraReviews[p.id]) state.extraReviews[p.id] = [];
    state.extraReviews[p.id].unshift(newReview);
    LS.set(KEYS.reviews, state.extraReviews);
    toast('Review submitted — thank you!', 'success');
    renderReviews(p);
  });
}

/* ============================================================
   CART
   ============================================================ */
function variantKey(variant) { return Object.entries(variant || {}).map(([k, v]) => `${k}:${v}`).join('|'); }

function addToCart(productId, variant, qty) {
  const key = variantKey(variant);
  const existing = state.cart.find(l => l.productId === productId && l.variantKey === key);
  if (existing) existing.qty += qty;
  else state.cart.push({ productId, variant, variantKey: key, qty });
  LS.set(KEYS.cart, state.cart);
  updateCartBadge();
  renderCartDrawer();
  toast('Added to cart', 'success');
  openCartDrawer();
}

function updateCartLineQty(index, qty) {
  if (qty <= 0) { state.cart.splice(index, 1); }
  else { state.cart[index].qty = qty; }
  LS.set(KEYS.cart, state.cart);
  updateCartBadge();
  renderCartDrawer();
}

function removeCartLine(index) {
  state.cart.splice(index, 1);
  LS.set(KEYS.cart, state.cart);
  updateCartBadge();
  renderCartDrawer();
  toast('Removed from cart');
}

function cartSubtotal() {
  return state.cart.reduce((sum, line) => {
    const p = getProduct(line.productId);
    return sum + (p ? p.price * line.qty : 0);
  }, 0);
}

function updateCartBadge() {
  const count = state.cart.reduce((n, l) => n + l.qty, 0);
  const badge = $('#cartCount');
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

function renderCartDrawer() {
  const body = $('#cartDrawerBody');
  body.innerHTML = '';
  if (state.cart.length === 0) {
    body.appendChild(emptyStateEl('Your cart is empty', 'Add something you love to get started.'));
    $('#cartDrawerFoot').style.display = 'none';
    return;
  }
  $('#cartDrawerFoot').style.display = 'block';
  state.cart.forEach((line, idx) => {
    const p = getProduct(line.productId);
    if (!p) return;
    const row = document.createElement('div');
    row.className = 'cart-line';
    row.innerHTML = `
      <img src="${p.images[0]}" alt="${p.name}">
      <div class="cart-line-info">
        <p class="cart-line-name"></p>
        <p class="cart-line-variant"></p>
        <div class="cart-line-row">
          <div class="qty-stepper">
            <button type="button" aria-label="Decrease quantity" data-act="dec">−</button>
            <span>${line.qty}</span>
            <button type="button" aria-label="Increase quantity" data-act="inc">+</button>
          </div>
          <strong></strong>
        </div>
        <button class="cart-line-remove" type="button">Remove</button>
      </div>`;
    row.querySelector('.cart-line-name').textContent = p.name;
    row.querySelector('.cart-line-variant').textContent = Object.values(line.variant || {}).join(' · ');
    row.querySelector('strong').textContent = formatNaira(p.price * line.qty);
    row.querySelector('[data-act="dec"]').addEventListener('click', () => updateCartLineQty(idx, line.qty - 1));
    row.querySelector('[data-act="inc"]').addEventListener('click', () => updateCartLineQty(idx, line.qty + 1));
    row.querySelector('.cart-line-remove').addEventListener('click', () => removeCartLine(idx));
    body.appendChild(row);
  });
  setText($('#drawerSubtotal'), formatNaira(cartSubtotal()));
}

function openCartDrawer() {
  $('#cartOverlay').classList.add('open');
  $('#cartDrawer').classList.add('open');
  renderCartDrawer();
}
function closeCartDrawer() {
  $('#cartOverlay').classList.remove('open');
  $('#cartDrawer').classList.remove('open');
}

/* ============================================================
   WISHLIST
   ============================================================ */
function toggleWishlist(productId) {
  const idx = state.wishlist.indexOf(productId);
  if (idx === -1) { state.wishlist.push(productId); toast('Saved to wishlist', 'success'); }
  else { state.wishlist.splice(idx, 1); toast('Removed from wishlist'); }
  LS.set(KEYS.wishlist, state.wishlist);
  updateWishBadge();
  if ($('#view-home').classList.contains('active')) renderGrid();
}

function updateWishBadge() {
  const badge = $('#wishCount');
  badge.textContent = String(state.wishlist.length);
  badge.hidden = state.wishlist.length === 0;
}

function renderWishlistView() {
  const grid = $('#wishlistGrid');
  grid.innerHTML = '';
  const items = state.wishlist.map(id => getProduct(id)).filter(Boolean);
  if (items.length === 0) {
    grid.appendChild(emptyStateEl('Your wishlist is empty', 'Tap the heart on any product to save it here.'));
    return;
  }
  items.forEach(p => grid.appendChild(createProductCardEl(p)));
}

/* ============================================================
   CHECKOUT
   ============================================================ */
function populateStateSelect() {
  const sel = $('#ckState');
  sel.innerHTML = '<option value="">Select state</option>' + NIGERIA_STATES.map(s => `<option value="${s}">${s}</option>`).join('');
}

function currentDeliveryFee() {
  const state_ = $('#ckState').value;
  return STATE_FEES[state_] || 0;
}

function renderCheckoutSummary() {
  const linesEl = $('#checkoutLines');
  linesEl.innerHTML = '';
  state.cart.forEach(line => {
    const p = getProduct(line.productId);
    if (!p) return;
    const row = document.createElement('div');
    row.className = 'mini-line';
    row.innerHTML = `<img src="${p.images[0]}" alt=""><div style="flex:1"><div>${p.name} × ${line.qty}</div><div style="color:var(--text-muted)">${Object.values(line.variant || {}).join(' · ')}</div></div><strong>${formatNaira(p.price * line.qty)}</strong>`;
    linesEl.appendChild(row);
  });
  recalcTotals();
}

function recalcTotals() {
  const subtotal = cartSubtotal();
  let delivery = currentDeliveryFee();
  let discount = 0;
  if (state.couponCode && COUPONS[state.couponCode]) {
    const c = COUPONS[state.couponCode];
    if (c.type === 'percent') discount = Math.round(subtotal * (c.value / 100));
    if (c.type === 'freeship') { discount = delivery; }
  }
  const total = Math.max(0, subtotal + delivery - discount);
  setText($('#sumSubtotal'), formatNaira(subtotal));
  setText($('#sumDelivery'), formatNaira(delivery));
  setText($('#sumDiscount'), '-' + formatNaira(discount));
  setText($('#sumTotal'), formatNaira(total));
  return { subtotal, delivery, discount, total };
}

function goToCheckout() {
  if (state.cart.length === 0) { toast('Your cart is empty', 'error'); return; }
  closeCartDrawer();
  showView('checkout');
  renderCheckoutSummary();
}

function validateField(input, isValid) {
  const group = input.closest('.form-group');
  group.classList.toggle('has-error', !isValid);
  return isValid;
}

function setupCheckoutForm() {
  populateStateSelect();
  $('#ckState').addEventListener('change', recalcTotals);

  $('#expandCheckoutBtn').addEventListener('click', () => {
    const wrap = $('#checkoutWrap');
    const expanded = wrap.classList.toggle('expanded');
    setText($('#expandLabel'), expanded ? 'Exit full screen' : 'Expand');
  });

  $('#applyCouponBtn').addEventListener('click', () => {
    const code = $('#couponInput').value.trim().toUpperCase();
    const msg = $('#couponMsg');
    if (!code) { msg.textContent = 'Enter a coupon code.'; msg.className = 'coupon-msg err'; return; }
    if (COUPONS[code]) {
      state.couponCode = code;
      msg.textContent = `Applied: ${COUPONS[code].label}`;
      msg.className = 'coupon-msg ok';
    } else {
      state.couponCode = null;
      msg.textContent = 'Invalid or expired coupon code.';
      msg.className = 'coupon-msg err';
    }
    recalcTotals();
  });

  $('#checkoutForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#ckName'), phone = $('#ckPhone'), email = $('#ckEmail'), address = $('#ckAddress'), stateSel = $('#ckState'), city = $('#ckCity');
    let ok = true;
    ok = validateField(name, name.value.trim().length >= 2) && ok;
    ok = validateField(phone, /^(\+234|0)[7-9][0-1]\d{8}$/.test(phone.value.replace(/\s/g, ''))) && ok;
    ok = validateField(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) && ok;
    ok = validateField(address, address.value.trim().length >= 5) && ok;
    ok = validateField(stateSel, !!stateSel.value) && ok;
    ok = validateField(city, city.value.trim().length >= 2) && ok;
    if (!ok) { toast('Please fix the highlighted fields.', 'error'); return; }
    placeOrder({
      name: name.value.trim(), phone: phone.value.trim(), email: email.value.trim(),
      address: address.value.trim(), state: stateSel.value, city: city.value.trim(),
      payment: $('#ckPayment').value
    });
  });
}

function placeOrder(customer) {
  const totals = recalcTotals();
  const order = {
    id: 'JB' + Date.now().toString().slice(-8),
    date: new Date().toISOString(),
    customer, totals,
    items: state.cart.map(line => {
      const p = getProduct(line.productId);
      return { productId: line.productId, name: p ? p.name : 'Removed item', qty: line.qty, price: p ? p.price : 0, variant: line.variant };
    }),
    status: 'Processing',
    userEmail: state.currentUser ? state.currentUser.email : customer.email
  };
  state.orders.unshift(order);
  LS.set(KEYS.orders, state.orders);
  state.cart = [];
  LS.set(KEYS.cart, state.cart);
  updateCartBadge();
  state.couponCode = null;

  setText($('#confirmOrderId'), order.id);
  const summary = $('#confirmSummary');
  summary.innerHTML = order.items.map(it => `<div class="mini-line"><div style="flex:1">${it.name} × ${it.qty}</div><strong>${formatNaira(it.price * it.qty)}</strong></div>`).join('') +
    `<div class="summary-row total" style="margin-top:10px"><span>Total paid</span><span>${formatNaira(order.totals.total)}</span></div>`;
  $('#checkoutWrap').classList.remove('expanded');
  setText($('#expandLabel'), 'Expand');
  $('#checkoutForm').reset();
  $$('.form-group', $('#checkoutForm')).forEach(g => g.classList.remove('has-error'));
  showView('confirm');
  toast('Order placed successfully!', 'success');
}

function renderOrdersView() {
  const list = $('#ordersList');
  list.innerHTML = '';
  const email = state.currentUser ? state.currentUser.email : null;
  const orders = email ? state.orders.filter(o => o.userEmail === email) : state.orders;
  if (orders.length === 0) {
    list.appendChild(emptyStateEl('No orders yet', 'Your placed orders will show up here.'));
    return;
  }
  orders.forEach(o => {
    const card = document.createElement('div');
    card.className = 'admin-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong>${o.id}</strong>
        <span class="pill-tag" style="background:var(--teal-bg);color:var(--teal-dark)">${o.status}</span>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${new Date(o.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })} · ${o.items.length} item(s)</p>
      ${o.items.map(it => `<div class="mini-line"><div style="flex:1">${it.name} × ${it.qty}</div><span>${formatNaira(it.price * it.qty)}</span></div>`).join('')}
      <div class="summary-row total" style="margin-top:8px"><span>Total</span><span>${formatNaira(o.totals.total)}</span></div>`;
    list.appendChild(card);
  });
}

/* ============================================================
   AUTH (simulated — no real backend)
   ============================================================ */
function openAuthModal(mode) {
  state.authMode = mode || 'signin';
  updateAuthTabsUI();
  $('#authOverlay').classList.add('open');
  $('#authModal').classList.add('open');
}
function closeAuthModal() {
  $('#authOverlay').classList.remove('open');
  $('#authModal').classList.remove('open');
}
function updateAuthTabsUI() {
  $$('.auth-tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.authTab === state.authMode)));
  $('#authNameGroup').hidden = state.authMode !== 'signup';
  setText($('#authSubmitBtn'), state.authMode === 'signup' ? 'Create account' : 'Sign in');
  setText($('#authTitle'), state.authMode === 'signup' ? 'Create your account' : 'Welcome back');
}

function setupAuth() {
  $$('.auth-tab').forEach(t => t.addEventListener('click', () => { state.authMode = t.dataset.authTab; updateAuthTabsUI(); }));
  $('#accountSignInBtn').addEventListener('click', () => openAuthModal('signin'));
  $('#closeAuthBtn').addEventListener('click', closeAuthModal);
  $('#authOverlay').addEventListener('click', closeAuthModal);

  $('#googleSignInBtn').addEventListener('click', () => {
    toast('Demo mode: this button is UI-only. Connect a real Google Client ID to enable Google sign-in.', 'success');
    const demoUser = { name: 'Google Demo User', email: 'demo.google.user@gmail.com', provider: 'google' };
    signInUser(demoUser);
  });

  $('#authForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = $('#authEmail'), passInput = $('#authPassword'), nameInput = $('#authName');
    let ok = true;
    ok = validateField(emailInput, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) && ok;
    ok = validateField(passInput, passInput.value.length >= 6) && ok;
    if (state.authMode === 'signup') ok = validateField(nameInput, nameInput.value.trim().length >= 2) && ok;
    if (!ok) { toast('Please fix the highlighted fields.', 'error'); return; }

    const email = emailInput.value.trim().toLowerCase();
    if (state.authMode === 'signup') {
      if (state.users.find(u => u.email === email)) { toast('An account with this email already exists.', 'error'); return; }
      const user = { name: nameInput.value.trim(), email, password: passInput.value, provider: 'email' };
      state.users.push(user);
      LS.set(KEYS.users, state.users);
      signInUser(user);
      toast('Account created — welcome to Jibuy!', 'success');
    } else {
      const user = state.users.find(u => u.email === email && u.password === passInput.value);
      if (!user) { toast('Incorrect email or password.', 'error'); return; }
      signInUser(user);
      toast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');
    }
    $('#authForm').reset();
    $$('.form-group', $('#authForm')).forEach(g => g.classList.remove('has-error'));
  });

  $('#signOutBtn').addEventListener('click', () => {
    state.currentUser = null;
    LS.set(KEYS.currentUser, null);
    renderAccountView();
    toast('Signed out');
  });
}

function signInUser(user) {
  state.currentUser = user;
  LS.set(KEYS.currentUser, user);
  closeAuthModal();
  renderAccountView();
}

function renderAccountView() {
  const loggedOut = $('#accountLoggedOut'), loggedIn = $('#accountLoggedIn');
  if (state.currentUser) {
    loggedOut.hidden = true; loggedIn.hidden = false;
    setText($('#accountName'), state.currentUser.name);
    setText($('#accountEmail'), state.currentUser.email);
    setText($('#accountAvatar'), state.currentUser.name.trim().charAt(0).toUpperCase());
  } else {
    loggedOut.hidden = false; loggedIn.hidden = true;
  }
}

/* ============================================================
   ADMIN
   ============================================================ */
const ADMIN_CREDENTIALS = { email: 'admin@jibuy.com', password: 'admin123' };

function setupAdmin() {
  $('#adminEntryBtn').addEventListener('click', () => {
    showView(state.adminLoggedIn ? 'admin' : 'admin-login');
    if (state.adminLoggedIn) renderAdminDashboard();
  });
  $('#footerAdminLink').addEventListener('click', (e) => {
    e.preventDefault();
    showView(state.adminLoggedIn ? 'admin' : 'admin-login');
    if (state.adminLoggedIn) renderAdminDashboard();
  });

  $('#adminLoginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = $('#adminUser'), pass = $('#adminPass');
    const ok1 = validateField(user, user.value.trim().length > 0);
    const ok2 = validateField(pass, pass.value.length > 0);
    if (!ok1 || !ok2) return;
    if (user.value.trim().toLowerCase() === ADMIN_CREDENTIALS.email && pass.value === ADMIN_CREDENTIALS.password) {
      state.adminLoggedIn = true;
      LS.set(KEYS.adminSession, true);
      $('#adminLoginForm').reset();
      renderAdminDashboard();
      showView('admin');
      toast('Welcome to the admin dashboard', 'success');
    } else {
      toast('Invalid admin credentials.', 'error');
    }
  });

  $('#adminLogoutBtn').addEventListener('click', () => {
    state.adminLoggedIn = false;
    LS.set(KEYS.adminSession, false);
    showView('home');
  });

  $$('[data-admin-tab]').forEach(btn => btn.addEventListener('click', () => {
    state.adminTab = btn.dataset.adminTab;
    $$('[data-admin-tab]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    $('#adminProductsPanel').hidden = state.adminTab !== 'products';
    $('#adminOrdersPanel').hidden = state.adminTab !== 'orders';
    if (state.adminTab === 'orders') renderAdminOrders();
  }));

  $('#adminSearch').addEventListener('input', debounce(renderAdminProductsTable, 200));

  $('#adminProductForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameI = $('#apName'), priceI = $('#apPrice'), stockI = $('#apStock'), descI = $('#apDesc');
    let ok = true;
    ok = validateField(nameI, nameI.value.trim().length >= 2) && ok;
    ok = validateField(priceI, Number(priceI.value) > 0) && ok;
    ok = validateField(stockI, Number(stockI.value) >= 0 && stockI.value !== '') && ok;
    ok = validateField(descI, descI.value.trim().length >= 5) && ok;
    if (!ok) { toast('Please fix the highlighted fields.', 'error'); return; }

    const category = $('#apCategory').value;
    const data = {
      name: nameI.value.trim(), category, price: Number(priceI.value), stock: Number(stockI.value),
      description: descI.value.trim()
    };
    const editingId = $('#apId').value;
    if (editingId) {
      if (editingId.startsWith('custom-')) {
        const item = state.adminAdds.find(p => p.id === editingId);
        Object.assign(item, data);
      } else {
        state.adminEdits[editingId] = Object.assign({}, state.adminEdits[editingId], data);
        LS.set(KEYS.adminEdits, state.adminEdits);
      }
      toast('Product updated', 'success');
    } else {
      const id = uid('custom-');
      const seed = hashCode(id + data.name);
      const newProduct = Object.assign({
        id, rating: 4.5, reviewCount: 0,
        variants: VARIANT_OPTIONS[category],
        images: [svgIllustration(category, seed, 0), svgIllustration(category, seed, 1), svgIllustration(category, seed, 2)],
        seedReviews: [], createdIndex: BASE_PRODUCTS.length + state.adminAdds.length + 1
      }, data);
      state.adminAdds.push(newProduct);
      toast('Product added', 'success');
    }
    LS.set(KEYS.adminAdds, state.adminAdds);
    resetAdminForm();
    renderAdminProductsTable();
    renderAdminStats();
  });

  $('#apCancelBtn').addEventListener('click', resetAdminForm);
}

function resetAdminForm() {
  $('#adminProductForm').reset();
  $('#apId').value = '';
  $('#apCancelBtn').hidden = true;
  setText($('#adminFormTitle'), 'Add a product');
  $$('.form-group', $('#adminProductForm')).forEach(g => g.classList.remove('has-error'));
}

function editAdminProduct(id) {
  const p = getProduct(id);
  if (!p) return;
  $('#apId').value = id;
  $('#apName').value = p.name;
  $('#apCategory').value = p.category;
  $('#apPrice').value = p.price;
  $('#apStock').value = p.stock;
  $('#apDesc').value = p.description;
  $('#apCancelBtn').hidden = false;
  setText($('#adminFormTitle'), 'Edit product');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteAdminProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  if (id.startsWith('custom-')) {
    state.adminAdds = state.adminAdds.filter(p => p.id !== id);
    LS.set(KEYS.adminAdds, state.adminAdds);
  } else {
    if (!state.adminDeletes.includes(id)) state.adminDeletes.push(id);
    LS.set(KEYS.adminDeletes, state.adminDeletes);
  }
  toast('Product deleted');
  renderAdminProductsTable();
  renderAdminStats();
}

function renderAdminProductsTable() {
  const tbody = $('#adminProductsTbody');
  const q = $('#adminSearch').value.trim().toLowerCase();
  let list = getAllProducts();
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
  tbody.innerHTML = '';
  list.slice(0, 200).forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${p.images[0]}" alt=""></td>
      <td></td>
      <td>${CATEGORIES[p.category].label}</td>
      <td>${formatNaira(p.price)}</td>
      <td>${p.stock}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Edit</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger)" data-del="${p.id}">Delete</button>
      </td>`;
    tr.children[1].textContent = p.name;
    tr.querySelector('[data-edit]').addEventListener('click', () => editAdminProduct(p.id));
    tr.querySelector('[data-del]').addEventListener('click', () => deleteAdminProduct(p.id));
    tbody.appendChild(tr);
  });
}

function renderAdminOrders() {
  const tbody = $('#adminOrdersTbody');
  tbody.innerHTML = '';
  if (state.orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">No orders placed yet.</td></tr>`;
    return;
  }
  state.orders.forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${o.id}</td><td></td><td>${o.customer.state}</td><td>${o.items.length}</td><td>${formatNaira(o.totals.total)}</td><td><span class="pill-tag" style="background:var(--teal-bg);color:var(--teal-dark)">${o.status}</span></td>`;
    tr.children[1].textContent = o.customer.name;
    tbody.appendChild(tr);
  });
}

function renderAdminStats() {
  const all = getAllProducts();
  const revenue = state.orders.reduce((s, o) => s + o.totals.total, 0);
  const stats = [
    { label: 'Total products', num: all.length },
    { label: 'Orders placed', num: state.orders.length },
    { label: 'Revenue (demo)', num: formatNaira(revenue) },
    { label: 'Out of stock', num: all.filter(p => p.stock === 0).length }
  ];
  $('#adminStats').innerHTML = stats.map(s => `<div class="stat-card"><div class="num">${s.num}</div><div class="label">${s.label}</div></div>`).join('');
}

function renderAdminDashboard() {
  renderAdminStats();
  renderAdminProductsTable();
  renderAdminOrders();
}

/* ============================================================
   THEME
   ============================================================ */
function applyTheme() {
  document.body.setAttribute('data-theme', state.theme);
  const icon = $('#themeIcon');
  icon.innerHTML = state.theme === 'dark'
    ? '<path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/>'
    : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
}
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  LS.set(KEYS.theme, state.theme);
  applyTheme();
}

/* ============================================================
   NAVIGATION / SEARCH / FILTERS WIRING
   ============================================================ */
function setupCategoryNav() {
  const nav = $('#categoryNav');
  const cats = [{ key: 'all', label: 'All' }, { key: 'clothing', label: 'Clothing' }, { key: 'wine', label: 'Wine' }, { key: 'beads', label: 'Beads' }];
  nav.innerHTML = cats.map(c => `<button class="chip" data-cat="${c.key}" aria-pressed="${c.key === 'all'}">${c.label}</button>`).join('');
  $$('.chip', nav).forEach(chip => chip.addEventListener('click', () => {
    state.filters.category = chip.dataset.cat;
    $$('.chip', nav).forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
    $('#categorySelect').value = chip.dataset.cat;
    showView('home');
    renderGrid();
  }));
}

function shopCategory(cat) {
  state.filters.category = cat;
  $('#categorySelect').value = cat;
  $$('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.cat === cat)));
  showView('home');
  renderGrid();
}

function setupSearchAndFilters() {
  const runSearch = debounce((value) => {
    state.filters.search = value.trim();
    renderGrid();
  }, 320);

  $('#searchInput').addEventListener('input', (e) => runSearch(e.target.value));
  $('#searchInputMobile').addEventListener('input', (e) => { $('#searchInput').value = e.target.value; runSearch(e.target.value); });

  $('#mobileSearchToggle').addEventListener('click', () => {
    const bar = $('#mobileSearchBar');
    const open = bar.classList.toggle('open');
    $('#mobileSearchToggle').setAttribute('aria-expanded', String(open));
    if (open) $('#searchInputMobile').focus();
  });

  $('#categorySelect').addEventListener('change', (e) => {
    state.filters.category = e.target.value;
    $$('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.cat === e.target.value)));
    renderGrid();
  });

  $('#priceRange').addEventListener('input', debounce((e) => {
    state.filters.maxPrice = Number(e.target.value);
    setText($('#priceRangeVal'), formatNaira(e.target.value));
    renderGrid();
  }, 150));

  $('#sortSelect').addEventListener('change', (e) => { state.filters.sort = e.target.value; renderGrid(); });
}

function setupNavigation() {
  $('#logoHomeBtn').addEventListener('click', () => showView('home'));
  $('#heroShopBtn').addEventListener('click', () => { window.scrollTo({ top: 300, behavior: 'smooth' }); });
  $$('[data-shop-category]').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); shopCategory(el.dataset.shopCategory); }));

  $('#pdBackBtn').addEventListener('click', () => showView('home'));
  $('#wishNavBtn').addEventListener('click', () => { renderWishlistView(); showView('wishlist'); });
  $('#cartNavBtn').addEventListener('click', openCartDrawer);
  $('#bnCartBtn').addEventListener('click', openCartDrawer);
  $('#accountNavBtn').addEventListener('click', () => { renderAccountView(); showView('account'); });
  $('#closeCartBtn').addEventListener('click', closeCartDrawer);
  $('#cartOverlay').addEventListener('click', closeCartDrawer);
  $('#drawerCheckoutBtn').addEventListener('click', goToCheckout);

  $$('.bn-item[data-nav]').forEach(btn => btn.addEventListener('click', () => {
    const target = btn.dataset.nav;
    if (target === 'wishlist') renderWishlistView();
    if (target === 'account') renderAccountView();
    showView(target);
  }));

  $('#myOrdersBtn').addEventListener('click', () => { renderOrdersView(); showView('orders'); });
  $('#myWishlistBtn').addEventListener('click', () => { renderWishlistView(); showView('wishlist'); });
  $('#confirmContinueBtn').addEventListener('click', () => showView('home'));
  $('#confirmOrdersBtn').addEventListener('click', () => { renderOrdersView(); showView('orders'); });

  $('#themeToggle').addEventListener('click', toggleTheme);

  $$('[data-info]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); toast('This page is not part of the demo yet.'); }));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeCartDrawer(); closeAuthModal(); }
  });
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  applyTheme();
  heroIllustration();
  setupCategoryNav();
  setupSearchAndFilters();
  setupNavigation();
  setupCheckoutForm();
  setupAuth();
  setupAdmin();
  updateCartBadge();
  updateWishBadge();
  renderAccountView();
  renderGrid();

  // Sync price slider label on load
  setText($('#priceRangeVal'), formatNaira($('#priceRange').value));
}

document.addEventListener('DOMContentLoaded', init);
