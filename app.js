/* app.js — Jibuy storefront.
   Order: helpers → state → derived data → render → actions → events → boot.
   Security: user-supplied text is only inserted via h() (text nodes). innerHTML is never used. */
(() => {
  'use strict';
  const C = window.JIBUY_CONFIG;
  const J = window.Jibuy;
  const { Store, Auth, img, categories, states, zoneFee } = J;
  const { h, money, debounce, read, write, sleep } = J.util;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const catName = id => (categories.find(c => c.id === id) || {}).name || id;

  /* ================= STATE ================= */
  const state = {
    products: [], byId: new Map(), coupons: [], loading: true,
    filters: { q: '', cat: 'all', min: '', max: '', sort: 'featured', inStock: false },
    filtered: [], shown: C.PAGE_SIZE, rendered: 0,
    cart: read('jibuy:cart', []), wish: read('jibuy:wishlist', []),
    coupon: null, user: Auth.session(), deliveryState: '',
    afterAuth: null, view: 'home', authMode: 'signin', googleReady: false
  };
  const saveCart = () => write('jibuy:cart', state.cart);
  const saveWish = () => write('jibuy:wishlist', state.wish);
  const dlg = { cart: $('#cart-dialog'), checkout: $('#checkout-dialog'), auth: $('#auth-dialog') };

  /* ================= SMALL UI HELPERS ================= */
  function toast(msg, type = 'info') {
    const box = $('#toasts');
    while (box.children.length >= 3) box.firstElementChild.remove();
    const icon = type === 'error' ? '⚠' : type === 'success' ? '✓' : 'ℹ';
    const t = h('div', { class: 'toast ' + type }, h('span', { 'aria-hidden': 'true' }, icon), h('span', null, msg));
    box.append(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3800);
  }

  const stars = r => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
  const ratingEl = (p) => h('p', { class: 'rating' },
    h('span', { class: 'stars', 'aria-hidden': 'true' }, stars(p.rating)),
    h('span', { class: 'sr-only' }, `Rated ${p.rating} out of 5 from ${p.reviewCount} reviews`),
    h('span', { class: 'muted', 'aria-hidden': 'true' }, ` ${p.rating.toFixed(1)} (${p.reviewCount})`));

  function productImg(p, i = 0, eager = false) {
    const im = h('img', { src: img(p.images[i] || p.images[0]), alt: i === 0 ? p.name : `${p.name}, photo ${i + 1}`, width: 600, height: 600, decoding: 'async', loading: eager ? 'eager' : 'lazy' });
    im.addEventListener('error', () => { im.src = img('art|📦|220|0'); }, { once: true });
    return im;
  }

  function emptyState(icon, title, text, action) {
    return h('div', { class: 'empty' }, h('p', { class: 'empty-icon', 'aria-hidden': 'true' }, icon), h('p', { class: 'empty-title' }, title), text ? h('p', { class: 'muted' }, text) : null, action || null);
  }

  function skeletonCards(n) {
    return Array.from({ length: n }, () => h('li', { class: 'card-item', 'aria-hidden': 'true' },
      h('div', { class: 'card skeleton-card' }, h('div', { class: 'skeleton sk-img' }), h('div', { class: 'card-body' }, h('div', { class: 'skeleton sk-line' }), h('div', { class: 'skeleton sk-line short' }), h('div', { class: 'skeleton sk-btn' })))));
  }

  function stepper(value, max, label, onChange) {
    const input = h('input', { type: 'number', inputmode: 'numeric', min: 1, max, value, class: 'qty-input', 'aria-label': label });
    const set = v => { v = Math.max(1, Math.min(max, Math.floor(Number(v)) || 1)); input.value = v; onChange(v); };
    const dec = h('button', { type: 'button', class: 'qty-btn', 'aria-label': 'Decrease: ' + label }, '−');
    const inc = h('button', { type: 'button', class: 'qty-btn', 'aria-label': 'Increase: ' + label }, '+');
    dec.addEventListener('click', () => set(Number(input.value) - 1));
    inc.addEventListener('click', () => set(Number(input.value) + 1));
    input.addEventListener('change', () => set(input.value));
    return h('div', { class: 'stepper' }, dec, input, inc);
  }

  /* ================= DERIVED DATA ================= */
  function applyFilters() {
    const { q, cat, min, max, sort, inStock } = state.filters;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const lo = min === '' ? null : Number(min), hi = max === '' ? null : Number(max);
    let list = state.products.filter(p => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (lo !== null && p.price < lo) return false;
      if (hi !== null && p.price > hi) return false;
      if (inStock && p.stock < 1) return false;
      return terms.every(t => p._hay.includes(t));
    });
    const by = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      newest: (a, b) => b.created - a.created,
      name: (a, b) => a.name.localeCompare(b.name),
      featured: (a, b) => Number(b.featured) - Number(a.featured) || b.rating * Math.log(b.reviewCount + 2) - a.rating * Math.log(a.reviewCount + 2)
    }[sort];
    state.filtered = list.sort(by);
    state.shown = C.PAGE_SIZE;
    renderGrid(false);
    renderActiveFilters();
    renderCategories();
    const f = state.filters;
    $('#results-title').textContent = f.q ? `Results for “${f.q}”` : f.cat === 'all' ? 'All products' : catName(f.cat);
  }

  function cartLines() { return state.cart.map(it => ({ it, p: state.byId.get(it.id) })).filter(l => l.p); }
  function calc() {
    const lines = cartLines();
    const sub = lines.reduce((s, l) => s + l.p.price * l.it.qty, 0);
    const count = lines.reduce((s, l) => s + l.it.qty, 0);
    const c = state.coupon;
    const couponOk = Boolean(c && sub >= (c.min || 0));
    let discount = 0;
    if (couponOk && c.type === 'percent') discount = Math.round(sub * c.value / 100);
    if (couponOk && c.type === 'fixed') discount = Math.min(sub, c.value);
    let delivery = null;
    if (state.deliveryState) {
      delivery = (couponOk && c.type === 'shipping') || sub - discount >= C.FREE_DELIVERY_THRESHOLD ? 0 : zoneFee(state.deliveryState);
    }
    return { lines, sub, count, discount, delivery, couponOk, total: sub - discount + (delivery || 0) };
  }

  /* ================= RENDER: LISTING ================= */
  function productCard(p) {
    const wished = state.wish.includes(p.id);
    const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const cta = p.variants
      ? h('a', { class: 'btn btn-outline btn-sm card-cta', href: `#/product/${p.id}` }, 'Choose options')
      : h('button', { type: 'button', class: 'btn btn-primary btn-sm card-cta', 'data-add': p.id, disabled: p.stock < 1 }, p.stock < 1 ? 'Sold out' : 'Add to cart');
    return h('li', { class: 'card-item' }, h('article', { class: 'card' },
      h('div', { class: 'card-media' },
        productImg(p),
        disc ? h('span', { class: 'tag tag-deal' }, `${disc}% off`) : null,
        h('button', { type: 'button', class: 'wish-btn', 'data-wish': p.id, 'aria-pressed': String(wished), 'aria-label': 'Wishlist: ' + p.name }, h('span', { 'aria-hidden': 'true' }, wished ? '♥' : '♡'))),
      h('div', { class: 'card-body' },
        h('h3', { class: 'card-title' }, h('a', { href: `#/product/${p.id}` }, p.name)),
        ratingEl(p),
        h('p', { class: 'price' }, h('strong', null, money(p.price)), p.oldPrice ? h('s', { class: 'old' }, money(p.oldPrice)) : null),
        h('p', { class: 'meta' }, '📍 ' + p.location, p.verified ? h('span', { class: 'verified' }, ' ✔ Verified seller') : null),
        p.stock < 1 ? h('p', { class: 'stock out' }, '✖ Out of stock') : p.stock <= 5 ? h('p', { class: 'stock low' }, `⚠ Only ${p.stock} left`) : null,
        cta)));
  }

  function renderGrid(append) {
    const grid = $('#grid');
    const list = state.filtered;
    const prev = state.rendered;
    if (!append) { grid.replaceChildren(); state.rendered = 0; }
    const end = Math.min(state.shown, list.length);
    const frag = document.createDocumentFragment();
    for (let i = state.rendered; i < end; i++) frag.append(productCard(list[i]));
    grid.append(frag);
    state.rendered = end;
    grid.setAttribute('aria-busy', 'false');
    $('#result-count').textContent = `${list.length} ${list.length === 1 ? 'product' : 'products'} found`;
    const empty = $('#empty');
    empty.hidden = list.length > 0;
    if (!list.length) empty.replaceChildren(emptyState('🔎', 'No products match your search', 'Try a different word, or widen the price range.', h('button', { type: 'button', class: 'btn btn-primary', 'data-clear': '' }, 'Clear filters')));
    const more = $('#more-btn');
    more.hidden = end >= list.length;
    more.textContent = `Show more (${list.length - end} left)`;
    if (append && grid.children[prev]) grid.children[prev].querySelector('a')?.focus();
  }

  function renderCategories() {
    const strip = $('#cat-strip');
    if (strip.children.length) { // already built: only update pressed state so keyboard focus is kept
      $$('[data-cat]', strip).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === state.filters.cat)));
      return;
    }
    const counts = {};
    state.products.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    const mk = (id, icon, label, n) => h('button', { type: 'button', class: 'cat-btn', 'data-cat': id, 'aria-pressed': String(state.filters.cat === id) },
      h('span', { 'aria-hidden': 'true' }, icon), h('span', null, label), h('span', { class: 'count' }, n));
    strip.replaceChildren(mk('all', '✨', 'All', state.products.length), ...categories.map(c => mk(c.id, c.icon, c.name, counts[c.id] || 0)));
  }

  function renderActiveFilters() {
    const f = state.filters, box = $('#active-filters'), chips = [];
    if (f.q) chips.push(['q', `Search: ${f.q}`]);
    if (f.cat !== 'all') chips.push(['cat', catName(f.cat)]);
    if (f.min !== '' || f.max !== '') chips.push(['price', `Price: ${f.min === '' ? '₦0' : money(f.min)} – ${f.max === '' ? 'any' : money(f.max)}`]);
    if (f.inStock) chips.push(['stock', 'In stock only']);
    box.replaceChildren(...chips.map(([k, label]) => h('button', { type: 'button', class: 'chip chip-active', 'data-remove-filter': k, 'aria-label': 'Remove filter: ' + label }, label + ' ', h('span', { 'aria-hidden': 'true' }, '✕'))));
  }

  function clearFilters() {
    state.filters = { ...state.filters, q: '', cat: 'all', min: '', max: '', inStock: false };
    $('#search-input').value = ''; $('#min-price').value = ''; $('#max-price').value = ''; $('#in-stock').checked = false;
    applyFilters();
  }

  /* ================= RENDER: PRODUCT DETAIL ================= */
  const REVIEW_NAMES = ['Tunde A.', 'Chioma E.', 'Ibrahim S.', 'Funke O.', 'Emeka N.', 'Aisha M.', 'Seyi K.'];
  const REVIEW_TEXT = ['Arrived in two days and works exactly as described.', 'Good quality for the price. I would buy again.', 'Packaging was neat and the seller replied fast.', 'Solid build. My friends asked where I got it.', 'Does the job. Colour is slightly different from the photo.', 'Great value, I use it every day.'];
  function sampleReviews(p) {
    let s = 0; for (const ch of p.id) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const when = ['2 weeks ago', '1 month ago', '3 months ago'];
    return [0, 1, 2].map(i => ({ name: REVIEW_NAMES[(s + i * 3) % REVIEW_NAMES.length], rating: Math.max(3, Math.min(5, Math.round(p.rating) + ((s + i) % 3) - 1)), text: REVIEW_TEXT[(s + i * 5) % REVIEW_TEXT.length], date: when[i] }));
  }

  function renderProduct(id) {
    const root = $('#product-root');
    const p = state.byId.get(id);
    if (!p) {
      document.title = `Product not found — ${C.STORE_NAME}`;
      root.replaceChildren(emptyState('🛍️', 'We could not find that product', 'It may have been removed.', h('a', { class: 'btn btn-primary', href: '#/' }, 'Back to shop')));
      return;
    }
    document.title = `${p.name} — ${C.STORE_NAME}`;
    let qty = 1, variant = p.variants ? p.variants.options[0] : '';
    const main = productImg(p, 0, true);
    const thumbs = p.images.map((_, i) => {
      const b = h('button', { type: 'button', class: 'thumb', 'aria-label': `Show photo ${i + 1} of ${p.images.length}`, 'aria-current': String(i === 0) }, h('img', { src: img(p.images[i]), alt: '', width: 120, height: 120, loading: 'lazy' }));
      b.addEventListener('click', () => { main.src = img(p.images[i]); main.alt = i === 0 ? p.name : `${p.name}, photo ${i + 1}`; thumbs.forEach((t, j) => t.setAttribute('aria-current', String(j === i))); });
      return b;
    });
    const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const variantBox = p.variants && h('fieldset', { class: 'variants' }, h('legend', null, p.variants.label),
      ...p.variants.options.map((o, i) => h('span', { class: 'chip-opt' }, h('input', { type: 'radio', name: 'variant', id: 'v-' + i, value: o, checked: i === 0 }), h('label', { for: 'v-' + i }, o))));
    if (variantBox) variantBox.addEventListener('change', e => { variant = e.target.value; });

    const qtyBox = p.stock > 0 ? stepper(1, p.stock, `Quantity for ${p.name}`, v => { qty = v; }) : null;
    const reviewsList = h('ul', { class: 'review-list', id: 'reviews-list' });
    const related = state.products.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);

    root.replaceChildren(
      h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, h('a', { href: '#/' }, 'Shop'), ' / ', h('a', { href: '#/', 'data-crumb-cat': p.category }, catName(p.category)), ' / ', h('span', { 'aria-current': 'page' }, p.name)),
      h('div', { class: 'detail' },
        h('div', { class: 'gallery' }, h('div', { class: 'gallery-main' }, main), h('div', { class: 'thumbs' }, thumbs)),
        h('div', { class: 'info' },
          h('h1', null, p.name),
          h('p', { class: 'meta' }, `by ${p.brand} · 📍 ${p.location}`, p.verified ? h('span', { class: 'verified' }, ' ✔ Verified seller') : null),
          ratingEl(p),
          h('p', { class: 'price big' }, h('strong', null, money(p.price)), p.oldPrice ? h('s', { class: 'old' }, money(p.oldPrice)) : null, disc ? h('span', { class: 'tag tag-deal inline' }, `${disc}% off`) : null),
          p.stock < 1 ? h('p', { class: 'stock out' }, '✖ Out of stock') : p.stock <= 5 ? h('p', { class: 'stock low' }, `⚠ Only ${p.stock} left`) : h('p', { class: 'stock ok' }, '✔ In stock'),
          h('p', null, p.description),
          h('ul', { class: 'features' }, (p.features || []).map(f => h('li', null, f))),
          variantBox,
          qtyBox ? h('div', { class: 'qty-row' }, h('span', { class: 'label' }, 'Quantity'), qtyBox) : null,
          h('div', { class: 'buy-row' },
            h('button', { type: 'button', class: 'btn btn-primary', disabled: p.stock < 1, onclick: () => addToCart(p.id, variant, qty) }, 'Add to cart'),
            h('button', { type: 'button', class: 'btn btn-gold', disabled: p.stock < 1, onclick: () => { addToCart(p.id, variant, qty, true); openCheckout(); } }, 'Buy now'),
            h('button', { type: 'button', class: 'btn btn-ghost', 'data-wish': p.id, 'aria-pressed': String(state.wish.includes(p.id)) }, h('span', { 'aria-hidden': 'true' }, state.wish.includes(p.id) ? '♥' : '♡'), ' Wishlist')),
          h('p', { class: 'muted note' }, `Free delivery on orders over ${money(C.FREE_DELIVERY_THRESHOLD)}. Pay by card, bank transfer or on delivery.`))),
      h('section', { class: 'reviews', 'aria-labelledby': 'rev-h' }, h('h2', { id: 'rev-h' }, 'Customer reviews'), reviewsList, reviewForm(p, reviewsList)),
      related.length ? h('section', { 'aria-labelledby': 'rel-h' }, h('h2', { id: 'rel-h' }, 'You may also like'), h('ul', { class: 'grid' }, related.map(productCard))) : null);
    renderReviews(p, reviewsList);
  }

  async function renderReviews(p, list) {
    const mine = (await Store.reviews.get(p.id)).map(r => ({ ...r, date: r.date || new Date(r.created).toLocaleDateString(C.LOCALE, { dateStyle: 'medium' }) }));
    const all = [...mine, ...sampleReviews(p)];
    list.replaceChildren(...all.map(r => h('li', { class: 'review' },
      h('p', { class: 'rating' }, h('span', { class: 'stars', 'aria-hidden': 'true' }, stars(r.rating)), h('span', { class: 'sr-only' }, `${r.rating} out of 5`), ' ', h('strong', null, r.name), h('span', { class: 'muted' }, ' · ' + r.date)),
      h('p', null, r.text))));
  }

  function reviewForm(p, list) {
    if (!state.user) return h('p', null, h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => { state.afterAuth = () => renderProduct(p.id); openAuth('Sign in to write a review'); } }, 'Sign in to write a review'));
    const sel = h('select', { id: 'rv-rating' }, [5, 4, 3, 2, 1].map(n => h('option', { value: n }, `${n} — ${['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][n]}`)));
    const ta = h('textarea', { id: 'rv-text', rows: 3, maxlength: 500, 'aria-describedby': 'rv-err' });
    const err = h('p', { class: 'error', id: 'rv-err', hidden: true });
    const form = h('form', { class: 'review-form', novalidate: true },
      h('h3', null, 'Write a review'),
      h('div', { class: 'field' }, h('label', { for: 'rv-rating' }, 'Your rating'), sel),
      h('div', { class: 'field' }, h('label', { for: 'rv-text' }, 'Your review'), ta, err),
      h('button', { type: 'submit', class: 'btn btn-primary btn-sm' }, 'Post review'));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const text = ta.value.trim();
      if (text.length < 10) { err.hidden = false; err.textContent = '⚠ Write at least 10 characters.'; ta.setAttribute('aria-invalid', 'true'); ta.focus(); return; }
      err.hidden = true; ta.removeAttribute('aria-invalid');
      try {
        await Store.reviews.add(p.id, { name: state.user.name.split(' ')[0], rating: Number(sel.value), text, date: 'Just now' });
        ta.value = '';
        await renderReviews(p, list);
        toast('Review posted. Thank you!', 'success');
      } catch (ex) { err.hidden = false; err.textContent = '⚠ ' + ex.message; }
    });
    return form;
  }

  /* ================= RENDER: WISHLIST & ORDERS ================= */
  function renderWishlist() {
    document.title = `Wishlist — ${C.STORE_NAME}`;
    const items = state.wish.map(id => state.byId.get(id)).filter(Boolean);
    $('#wish-root').replaceChildren(items.length
      ? h('ul', { class: 'grid' }, items.map(productCard))
      : emptyState('♡', 'Your wishlist is empty', 'Tap the heart on any product to save it for later.', h('a', { class: 'btn btn-primary', href: '#/' }, 'Browse products')));
  }

  const STATUS_ICON = { Processing: '⏳', 'Awaiting delivery': '📦', Shipped: '🚚', Delivered: '✅', Cancelled: '✖' };
  async function renderOrders() {
    document.title = `Your orders — ${C.STORE_NAME}`;
    const root = $('#orders-root');
    if (!state.user) { root.replaceChildren(emptyState('🔐', 'Sign in to see your orders', null, h('button', { type: 'button', class: 'btn btn-primary', 'data-open-auth': '' }, 'Sign in'))); return; }
    let list;
    try { list = await Store.orders.mine(state.user.email); }
    catch (ex) { root.replaceChildren(emptyState('⚠', 'We could not load your orders', ex.message)); return; }
    if (!list.length) { root.replaceChildren(emptyState('📦', 'No orders yet', 'When you place an order it will show up here.', h('a', { class: 'btn btn-primary', href: '#/' }, 'Start shopping'))); return; }
    root.replaceChildren(...list.map(o => h('article', { class: 'order-card' },
      h('header', null, h('h2', null, 'Order ' + o.id), h('p', { class: 'muted' }, new Date(o.created).toLocaleDateString(C.LOCALE, { dateStyle: 'medium' })), h('p', { class: 'status' }, `${STATUS_ICON[o.status] || '•'} ${o.status}`)),
      h('ul', { class: 'order-items' }, o.items.map(it => h('li', null, h('img', { src: img(it.image), alt: '', width: 48, height: 48, loading: 'lazy' }), h('span', null, `${it.qty} × ${it.name}${it.variant ? ' (' + it.variant + ')' : ''}`), h('span', null, money(it.price * it.qty))))),
      h('p', { class: 'order-total' }, 'Total: ', h('strong', null, money(o.total))))));
  }

  /* ================= CART ================= */
  function addToCart(id, variant, qty = 1, silent = false) {
    const p = state.byId.get(id);
    if (!p || p.stock < 1) { toast('Sorry, that item is out of stock.', 'error'); return; }
    const key = id + '|' + (variant || '');
    const it = state.cart.find(i => i.key === key);
    if (it) it.qty = Math.min(p.stock, it.qty + qty);
    else state.cart.push({ key, id, variant: variant || '', qty: Math.min(p.stock, qty) });
    saveCart(); renderCart();
    if (!silent) toast(`${p.name} added to cart`, 'success');
  }
  function setQty(key, q) { const it = state.cart.find(i => i.key === key); if (it) { it.qty = q; saveCart(); renderCart(); } }
  function removeFromCart(key) { state.cart = state.cart.filter(i => i.key !== key); saveCart(); renderCart(); toast('Removed from cart'); }

  function updateBadges(count) {
    $('#cart-count').textContent = count;
    $('#cart-btn').setAttribute('aria-label', `Open cart, ${count} ${count === 1 ? 'item' : 'items'}`);
    $('#wish-count').textContent = state.wish.length;
  }

  function renderCart(focusKey) {
    const body = $('#cart-body'), foot = $('#cart-foot');
    const t = calc();
    updateBadges(t.count);
    if (!t.lines.length) {
      body.replaceChildren(emptyState('🛒', 'Your cart is empty', 'Add gym gear, gadgets and more.', h('button', { type: 'button', class: 'btn btn-primary', 'data-close': '' }, 'Start shopping')));
      foot.replaceChildren(); foot.hidden = true; return;
    }
    foot.hidden = false;
    body.replaceChildren(h('ul', { class: 'cart-list' }, t.lines.map(({ it, p }) => {
      const st = stepper(it.qty, p.stock, `Quantity for ${p.name}`, q => { setQty(it.key, q); const el = $$('.qty-input', body).find(e => e.dataset.key === it.key); el?.focus(); });
      st.querySelector('input').dataset.key = it.key;
      return h('li', { class: 'cart-line' },
        h('img', { src: img(p.images[0]), alt: p.name, width: 72, height: 72, loading: 'lazy' }),
        h('div', null,
          h('a', { href: `#/product/${p.id}` }, p.name),
          it.variant ? h('p', { class: 'meta' }, `${p.variants ? p.variants.label : 'Option'}: ${it.variant}`) : null,
          h('p', { class: 'price' }, h('strong', null, money(p.price * it.qty))),
          h('div', { class: 'line-actions' }, st, h('button', { type: 'button', class: 'link-btn', 'data-remove': it.key, 'aria-label': `Remove ${p.name} from cart` }, 'Remove'))));
    })));
    const remaining = Math.max(0, C.FREE_DELIVERY_THRESHOLD - t.sub);
    foot.replaceChildren(
      h('div', { class: 'progress-wrap' },
        h('p', { id: 'ship-msg' }, remaining > 0 ? `Add ${money(remaining)} more for free delivery` : '🎉 You qualify for free delivery'),
        h('progress', { max: C.FREE_DELIVERY_THRESHOLD, value: Math.min(t.sub, C.FREE_DELIVERY_THRESHOLD), 'aria-labelledby': 'ship-msg' })),
      h('p', { class: 'row' }, h('span', null, 'Subtotal'), h('strong', null, money(t.sub))),
      h('p', { class: 'muted' }, 'Delivery and coupons are applied at checkout.'),
      h('button', { type: 'button', class: 'btn btn-primary block', id: 'checkout-btn' }, 'Checkout'));
  }

  /* ================= WISHLIST ACTION ================= */
  function toggleWish(id) {
    const i = state.wish.indexOf(id);
    if (i >= 0) state.wish.splice(i, 1); else state.wish.push(id);
    saveWish();
    const on = i < 0;
    $$(`[data-wish="${id}"]`).forEach(b => { b.setAttribute('aria-pressed', String(on)); const g = b.querySelector('span'); if (g) g.textContent = on ? '♥' : '♡'; });
    $('#wish-count').textContent = state.wish.length;
    toast(on ? 'Saved to wishlist' : 'Removed from wishlist');
    if (state.view === 'wishlist') renderWishlist();
  }

  /* ================= FORMS ================= */
  function field({ id, label, type = 'text', autocomplete, inputmode, placeholder, hint, value = '', maxlength = 120, required = true }) {
    const input = h('input', { id, name: id, type, autocomplete, inputmode, placeholder, maxlength, value, 'aria-required': required ? 'true' : null, 'aria-describedby': (hint ? id + '-hint ' : '') + id + '-err' });
    return h('div', { class: 'field' },
      h('label', { for: id }, label, required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null), input,
      hint ? h('p', { class: 'hint', id: id + '-hint' }, hint) : null,
      h('p', { class: 'error', id: id + '-err', hidden: true }));
  }
  function setFieldError(id, msg) {
    const input = document.getElementById(id), err = document.getElementById(id + '-err');
    if (!input || !err) return;
    err.hidden = !msg; err.textContent = msg ? '⚠ ' + msg : '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^(?:\+234|234|0)[789][01]\d{8}$/;
  const luhn = n => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; };

  /* ================= AUTH ================= */
  function renderAccount() {
    const slot = $('#account-slot');
    const u = state.user;
    if (!u) { slot.replaceChildren(h('button', { type: 'button', class: 'btn btn-gold btn-sm', id: 'signin-btn' }, 'Sign in')); return; }
    const first = (u.name || u.email).split(' ')[0];
    const avatar = u.picture && /^https:\/\//.test(u.picture)
      ? h('img', { src: u.picture, alt: '', width: 28, height: 28, referrerpolicy: 'no-referrer', class: 'avatar' })
      : h('span', { class: 'avatar initial', 'aria-hidden': 'true' }, first.charAt(0).toUpperCase());
    slot.replaceChildren(h('details', { class: 'menu' },
      h('summary', { class: 'menu-btn' }, avatar, h('span', { class: 'menu-name' }, first)),
      h('div', { class: 'menu-list' }, h('p', { class: 'menu-email' }, u.email), h('a', { href: '#/orders' }, 'My orders'), h('a', { href: '#/wishlist' }, 'Wishlist'), h('button', { type: 'button', id: 'signout-btn' }, 'Sign out'))));
  }

  function openAuth(note = '') {
    buildAuth(note);
    if (!dlg.auth.open) dlg.auth.showModal();
    renderGoogleButton();
  }

  function buildAuth(note = '') {
    const signin = state.authMode === 'signin';
    $('#auth-title').textContent = signin ? 'Sign in' : 'Create account';
    const err = h('p', { class: 'error', id: 'auth-error', role: 'alert', hidden: true });
    const googleBox = C.GOOGLE_CLIENT_ID
      ? h('div', { id: 'g-btn', class: 'g-btn' })
      : h('p', { class: 'muted note' }, 'Google sign-in is off. Add your Google Client ID in config.js to enable it.');
    const form = h('form', { id: 'auth-form', novalidate: true },
      !signin ? field({ id: 'au-name', label: 'Full name', autocomplete: 'name' }) : null,
      field({ id: 'au-email', label: 'Email', type: 'email', autocomplete: 'email', inputmode: 'email' }),
      field({ id: 'au-pass', label: 'Password', type: 'password', autocomplete: signin ? 'current-password' : 'new-password', hint: signin ? null : 'At least 8 characters, with a letter and a number.', maxlength: 100 }),
      err,
      h('button', { type: 'submit', class: 'btn btn-primary block' }, signin ? 'Sign in' : 'Create account'));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const v = { name: ($('#au-name') || {}).value || '', email: $('#au-email').value.trim(), password: $('#au-pass').value };
      const bad = {};
      if (!signin && v.name.trim().length < 2) bad['au-name'] = 'Enter your full name.';
      if (!EMAIL_RE.test(v.email)) bad['au-email'] = 'Enter a valid email address.';
      if (!v.password) bad['au-pass'] = 'Enter your password.';
      else if (!signin && !(v.password.length >= 8 && /[A-Za-z]/.test(v.password) && /\d/.test(v.password))) bad['au-pass'] = 'Use at least 8 characters with a letter and a number.';
      ['au-name', 'au-email', 'au-pass'].forEach(id => setFieldError(id, bad[id]));
      const first = Object.keys(bad)[0];
      if (first) { document.getElementById(first).focus(); return; }
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try { signin ? await Auth.login(v) : await Auth.register(v); afterLogin(); }
      catch (ex) { err.hidden = false; err.textContent = '⚠ ' + ex.message; btn.disabled = false; }
    });
    $('#auth-body').replaceChildren(
      note ? h('p', { class: 'note-box' }, note) : null,
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Account options' },
        h('button', { type: 'button', 'aria-pressed': String(signin), 'data-auth-mode': 'signin' }, 'Sign in'),
        h('button', { type: 'button', 'aria-pressed': String(!signin), 'data-auth-mode': 'register' }, 'Create account')),
      googleBox, h('p', { class: 'divider' }, h('span', null, 'or use email')), form);
  }

  function afterLogin() {
    state.user = Auth.session();
    renderAccount();
    const cb = state.afterAuth; state.afterAuth = null;
    dlg.auth.close();
    toast(`Welcome, ${state.user.name.split(' ')[0]}!`, 'success');
    if (state.view === 'orders') renderOrders();
    if (cb) cb();
  }
  async function signOut() {
    await Auth.logout(); state.user = null;
    if (window.google && state.googleReady) window.google.accounts.id.disableAutoSelect();
    renderAccount(); toast('You are signed out');
    if (state.view === 'orders') renderOrders();
  }

  function initGoogle() {
    if (!C.GOOGLE_CLIENT_ID) return;
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
    s.onload = () => {
      window.google.accounts.id.initialize({
        client_id: C.GOOGLE_CLIENT_ID,
        callback: async resp => { try { await Auth.google(resp.credential); afterLogin(); } catch (ex) { toast(ex.message, 'error'); } }
      });
      state.googleReady = true;
      if (dlg.auth.open) renderGoogleButton();
    };
    s.onerror = () => toast('Could not load Google sign-in. Check your connection.', 'error');
    document.head.append(s);
  }
  function renderGoogleButton() {
    const el = $('#g-btn');
    if (el && state.googleReady) window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: 280, text: 'continue_with' });
  }

  /* ================= CHECKOUT ================= */
  function setFull(on) {
    dlg.checkout.classList.toggle('is-full', on);
    const b = $('#expand-btn');
    b.querySelector('span[aria-hidden]').textContent = on ? '⤡' : '⤢';
    b.lastElementChild.textContent = on ? 'Minimize' : 'Expand';
  }

  function openCheckout() {
    if (!state.cart.length) { toast('Your cart is empty.', 'error'); return; }
    if (!state.user) { state.afterAuth = openCheckout; dlg.cart.close(); openAuth('Sign in to place your order. Your cart will be waiting.'); return; }
    dlg.cart.close();
    buildCheckout(); setFull(false);
    if (!dlg.checkout.open) dlg.checkout.showModal();
  }

  function buildCheckout() {
    $('#checkout-title').textContent = 'Checkout';
    const t = calc();
    const stateSel = h('select', { id: 'co-state', name: 'co-state', autocomplete: 'address-level1', 'aria-required': 'true', 'aria-describedby': 'co-state-err' },
      h('option', { value: '' }, 'Select your state'), states.map(s => h('option', { value: s, selected: s === state.deliveryState }, s)));
    stateSel.addEventListener('change', () => { state.deliveryState = stateSel.value; renderTotals(); });

    const cardBox = h('div', { id: 'card-box', class: 'card-box' },
      h('p', { class: 'note-box' }, 'Simulated payment: no real money moves. Try 4242 4242 4242 4242, any future date, any 3-digit CVV. Card 4000 0000 0000 0002 simulates a decline.'),
      field({ id: 'co-card', label: 'Card number', autocomplete: 'cc-number', inputmode: 'numeric', placeholder: '4242 4242 4242 4242', maxlength: 23 }),
      h('div', { class: 'two' },
        field({ id: 'co-exp', label: 'Expiry (MM/YY)', autocomplete: 'cc-exp', inputmode: 'numeric', placeholder: 'MM/YY', maxlength: 5 }),
        field({ id: 'co-cvv', label: 'CVV', autocomplete: 'cc-csc', inputmode: 'numeric', placeholder: '123', maxlength: 4 })));
    const payOpt = (v, label, checked) => h('div', { class: 'pay-opt' }, h('input', { type: 'radio', name: 'pay', id: 'pay-' + v, value: v, checked }), h('label', { for: 'pay-' + v }, label));
    const payNote = h('p', { id: 'pay-note', class: 'note-box', hidden: true });

    const form = h('form', { id: 'checkout-form', novalidate: true },
      h('fieldset', { class: 'fs' }, h('legend', null, 'Delivery details'),
        field({ id: 'co-name', label: 'Full name', autocomplete: 'name', value: state.user.name || '' }),
        field({ id: 'co-email', label: 'Email', type: 'email', autocomplete: 'email', inputmode: 'email', value: state.user.email || '' }),
        field({ id: 'co-phone', label: 'Phone number', type: 'tel', autocomplete: 'tel', inputmode: 'tel', placeholder: '0803 123 4567', hint: 'Nigerian number, e.g. 0803 123 4567 or +234 803 123 4567' }),
        field({ id: 'co-address', label: 'Street address', autocomplete: 'street-address' }),
        field({ id: 'co-city', label: 'City or town', autocomplete: 'address-level2' }),
        h('div', { class: 'field' }, h('label', { for: 'co-state' }, 'State', h('span', { class: 'req', 'aria-hidden': 'true' }, ' *')), stateSel, h('p', { class: 'error', id: 'co-state-err', hidden: true }))),
      h('fieldset', { class: 'fs' }, h('legend', null, 'Payment method'),
        payOpt('card', 'Card (simulated)', true), payOpt('transfer', 'Bank transfer'), payOpt('cod', 'Pay on delivery'), cardBox, payNote),
      h('p', { class: 'error form-error', id: 'form-error', role: 'alert', hidden: true }),
      h('button', { type: 'submit', class: 'btn btn-primary block', id: 'place-btn' }, 'Place order'));

    form.addEventListener('change', e => {
      if (e.target.name !== 'pay') return;
      const v = e.target.value;
      cardBox.hidden = v !== 'card';
      payNote.hidden = v === 'card';
      payNote.textContent = v === 'transfer' ? 'Bank transfer details are shown after you place the order. Your order ships once payment is confirmed.' : 'Pay the rider in cash or by transfer when your order arrives.';
    });
    form.addEventListener('input', e => {
      if (e.target.id) setFieldError(e.target.id, '');
      if (e.target.id === 'co-card') { const d = e.target.value.replace(/\D/g, '').slice(0, 19); e.target.value = d.replace(/(.{4})/g, '$1 ').trim(); }
      if (e.target.id === 'co-exp') { const d = e.target.value.replace(/\D/g, '').slice(0, 4); e.target.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; }
      if (e.target.id === 'co-cvv') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });
    form.addEventListener('submit', submitCheckout);

    const summary = h('aside', { class: 'summary', 'aria-labelledby': 'sum-title' },
      h('h3', { id: 'sum-title' }, 'Order summary'),
      h('ul', { class: 'sum-items' }, t.lines.map(({ it, p }) => h('li', null, h('img', { src: img(p.images[0]), alt: '', width: 48, height: 48, loading: 'lazy' }), h('span', null, `${it.qty} × ${p.name}${it.variant ? ' (' + it.variant + ')' : ''}`), h('span', null, money(p.price * it.qty))))),
      couponForm(),
      h('div', { id: 'sum-totals' }));
    $('#checkout-body').replaceChildren(h('div', { class: 'checkout-wrap' }, h('div', { class: 'checkout' }, form, summary)));
    renderTotals();
  }

  function couponForm() {
    const input = h('input', { id: 'coupon-input', type: 'text', maxlength: 20, autocomplete: 'off', 'aria-describedby': 'coupon-msg' });
    const msg = h('p', { id: 'coupon-msg', class: 'hint', 'aria-live': 'polite' }, state.coupon ? `${state.coupon.code} applied.` : '');
    const form = h('form', { class: 'coupon', novalidate: true }, h('label', { for: 'coupon-input' }, 'Coupon code'), h('div', { class: 'coupon-row' }, input, h('button', { type: 'submit', class: 'btn btn-outline btn-sm' }, 'Apply')), msg);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const code = input.value.trim().toUpperCase();
      const say = (m, bad) => { msg.textContent = (bad ? '⚠ ' : '✓ ') + m; msg.className = 'hint ' + (bad ? 'bad' : 'good'); };
      if (!code) return say('Enter a coupon code.', true);
      const c = state.coupons.find(x => x.code === code && x.active);
      if (!c) return say('That code is not valid.', true);
      if (calc().sub < (c.min || 0)) return say(`Spend at least ${money(c.min)} to use ${c.code}.`, true);
      state.coupon = c; input.value = '';
      say(`${c.code} applied: ${c.note || 'discount added'}.`, false);
      renderTotals();
    });
    return form;
  }

  function renderTotals() {
    const t = calc();
    if (state.coupon && !t.couponOk) state.coupon = null;
    const row = (l, v, cls) => h('p', { class: 'row ' + (cls || '') }, h('span', null, l), h('span', null, v));
    $('#sum-totals').replaceChildren(
      row('Subtotal', money(t.sub)),
      t.discount ? row(`Discount (${state.coupon.code})`, '−' + money(t.discount), 'good') : null,
      row('Delivery', t.delivery === null ? 'Choose your state' : t.delivery === 0 ? 'Free' : money(t.delivery)),
      row('Total', money(t.total), 'total'));
  }

  function validateCheckout(v) {
    const bad = {};
    if (v.name.trim().length < 2) bad['co-name'] = 'Enter your full name.';
    if (!EMAIL_RE.test(v.email)) bad['co-email'] = 'Enter a valid email address.';
    if (!PHONE_RE.test(v.phone.replace(/[\s-]/g, ''))) bad['co-phone'] = 'Enter a valid Nigerian phone number.';
    if (v.address.trim().length < 8) bad['co-address'] = 'Enter your full street address.';
    if (v.city.trim().length < 2) bad['co-city'] = 'Enter your city or town.';
    if (!v.state) bad['co-state'] = 'Select your state so we can calculate delivery.';
    if (v.pay === 'card') {
      const n = v.card.replace(/\s/g, '');
      if (!/^\d{13,19}$/.test(n) || !luhn(n)) bad['co-card'] = 'Enter a valid card number.';
      const m = /^(\d{2})\/(\d{2})$/.exec(v.exp);
      const now = new Date();
      if (!m || +m[1] < 1 || +m[1] > 12 || 2000 + +m[2] < now.getFullYear() || (2000 + +m[2] === now.getFullYear() && +m[1] < now.getMonth() + 1)) bad['co-exp'] = 'Enter a future expiry date as MM/YY.';
      if (!/^\d{3,4}$/.test(v.cvv)) bad['co-cvv'] = 'Enter the 3 or 4 digit CVV.';
    }
    return bad;
  }

  async function submitCheckout(e) {
    e.preventDefault();
    const val = id => (document.getElementById(id) || { value: '' }).value;
    const v = { name: val('co-name'), email: val('co-email'), phone: val('co-phone'), address: val('co-address'), city: val('co-city'), state: val('co-state'), pay: (e.currentTarget.querySelector('input[name=pay]:checked') || {}).value, card: val('co-card'), exp: val('co-exp'), cvv: val('co-cvv') };
    const bad = validateCheckout(v);
    ['co-name', 'co-email', 'co-phone', 'co-address', 'co-city', 'co-state', 'co-card', 'co-exp', 'co-cvv'].forEach(id => setFieldError(id, bad[id]));
    const first = Object.keys(bad)[0];
    const formErr = $('#form-error'); formErr.hidden = true;
    if (first) { document.getElementById(first).focus(); return; }

    const btn = $('#place-btn');
    btn.disabled = true; btn.textContent = 'Processing payment…'; btn.classList.add('busy');
    try {
      await sleep(1400); // simulated payment gateway latency
      if (v.pay === 'card' && v.card.replace(/\s/g, '') === '4000000000000002') throw new Error('Your card was declined. Try another card or a different payment method.');
      const t = calc();
      const order = {
        id: 'JB-' + Date.now().toString().slice(-6) + Math.floor(10 + Math.random() * 90),
        email: v.email.trim().toLowerCase(),
        customer: { name: v.name.trim(), phone: v.phone.trim(), address: v.address.trim(), city: v.city.trim(), state: v.state },
        items: t.lines.map(({ it, p }) => ({ id: p.id, name: p.name, variant: it.variant, price: p.price, qty: it.qty, image: p.images[0] })),
        subtotal: t.sub, discount: t.discount, delivery: t.delivery, total: t.total,
        coupon: t.couponOk ? state.coupon.code : null, payment: v.pay,
        status: v.pay === 'cod' ? 'Awaiting delivery' : 'Processing', created: Date.now()
      }; // card details are validated here and never stored or sent anywhere
      const saved = await Store.orders.create(order);
      state.cart = []; saveCart(); state.coupon = null;
      await loadProducts(); renderCart(); applyFilters();
      showConfirmation(saved);
    } catch (ex) {
      btn.disabled = false; btn.textContent = 'Place order'; btn.classList.remove('busy');
      formErr.hidden = false; formErr.textContent = '⚠ ' + ex.message;
      formErr.scrollIntoView({ block: 'nearest' });
    }
  }

  function showConfirmation(o) {
    $('#checkout-title').textContent = 'Order confirmed';
    const fee = zoneFee(o.customer.state);
    const eta = fee <= 2500 ? '1–3' : fee <= 3500 ? '2–4' : '3–6';
    const payText = { card: 'Paid by card (simulated)', transfer: 'Bank transfer: details sent to your email (simulated)', cod: 'Pay on delivery' }[o.payment];
    const row = (l, v, cls) => h('p', { class: 'row ' + (cls || '') }, h('span', null, l), h('span', null, v));
    $('#checkout-body').replaceChildren(h('div', { class: 'confirm' },
      h('div', { class: 'confirm-icon', 'aria-hidden': 'true' }, '✓'),
      h('h3', { id: 'confirm-h', tabindex: '-1' }, `Thank you, ${o.customer.name.split(' ')[0]}! Your order is confirmed.`),
      h('p', null, 'Order number: ', h('strong', null, o.id)),
      h('p', { class: 'muted' }, `Estimated delivery: ${eta} working days to ${o.customer.city}, ${o.customer.state}.`),
      h('p', { class: 'muted' }, payText),
      h('ul', { class: 'sum-items' }, o.items.map(it => h('li', null, h('img', { src: img(it.image), alt: '', width: 48, height: 48 }), h('span', null, `${it.qty} × ${it.name}${it.variant ? ' (' + it.variant + ')' : ''}`), h('span', null, money(it.price * it.qty))))),
      h('div', { class: 'confirm-totals' }, row('Subtotal', money(o.subtotal)), o.discount ? row('Discount', '−' + money(o.discount), 'good') : null, row('Delivery', o.delivery === 0 ? 'Free' : money(o.delivery)), row('Total', money(o.total), 'total')),
      h('div', { class: 'buy-row center' },
        h('button', { type: 'button', class: 'btn btn-primary', 'data-close': '' }, 'Continue shopping'),
        h('a', { class: 'btn btn-outline', href: '#/orders' }, 'View my orders'))));
    $('#confirm-h').focus();
  }

  /* ================= ROUTER ================= */
  function route(first) {
    const [name = '', arg = ''] = location.hash.replace(/^#\/?/, '').split('/');
    const view = ['product', 'wishlist', 'orders'].includes(name) ? name : 'home';
    state.view = view;
    $$('[data-view]').forEach(s => { s.hidden = s.dataset.view !== view; });
    if (state.loading) { if (view === 'product') $('#product-root').replaceChildren(h('div', { class: 'skeleton sk-detail', 'aria-hidden': 'true' })); return; }
    if (view === 'product') renderProduct(decodeURIComponent(arg));
    else if (view === 'wishlist') renderWishlist();
    else if (view === 'orders') renderOrders();
    else document.title = 'Jibuy — Gym, Tech & Sports Gear in Nigeria';
    if (!first) { window.scrollTo({ top: 0 }); $('#main').focus({ preventScroll: true }); }
  }

  /* ================= THEME ================= */
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('jibuy:theme', t); } catch (e) { /* ignore */ }
    const b = $('#theme-toggle');
    b.setAttribute('aria-pressed', String(t === 'dark'));
    b.firstElementChild.textContent = t === 'dark' ? '☀️' : '🌙';
    document.querySelector('meta[name=theme-color]').setAttribute('content', t === 'dark' ? '#0e0a1a' : '#2e1065');
  }

  /* ================= DATA LOADING ================= */
  async function loadProducts() {
    try { state.products = await Store.products.all(); state.coupons = await Store.coupons.all(); }
    catch (e) { toast('Could not load products. Please refresh.', 'error'); }
    state.products.forEach(p => { p._hay = [p.name, p.brand, catName(p.category), ...(p.tags || []), p.description].join(' ').toLowerCase(); });
    state.byId = new Map(state.products.map(p => [p.id, p]));
    state.cart = state.cart.filter(it => state.byId.has(it.id)); saveCart();
    state.loading = false;
  }

  /* ================= EVENTS ================= */
  function bindEvents() {
    document.addEventListener('click', e => {
      const t = e.target.closest('button, a, summary');
      if (!t) { return; }
      const d = t.dataset;
      if ('add' in d) addToCart(d.add, '', 1);
      else if ('wish' in d) toggleWish(d.wish);
      else if ('remove' in d) removeFromCart(d.remove);
      else if ('close' in d) t.closest('dialog')?.close();
      else if ('openAuth' in d) openAuth();
      else if ('clear' in d) clearFilters();
      else if ('cat' in d) { state.filters.cat = d.cat; if (state.view !== 'home') location.hash = '#/'; applyFilters(); }
      else if ('crumbCat' in d) { state.filters.cat = d.crumbCat; setTimeout(applyFilters, 0); }
      else if ('authMode' in d) { state.authMode = d.authMode; buildAuth(); renderGoogleButton(); }
      else if ('removeFilter' in d) {
        const k = d.removeFilter, f = state.filters;
        if (k === 'q') { f.q = ''; $('#search-input').value = ''; }
        if (k === 'cat') f.cat = 'all';
        if (k === 'price') { f.min = ''; f.max = ''; $('#min-price').value = ''; $('#max-price').value = ''; }
        if (k === 'stock') { f.inStock = false; $('#in-stock').checked = false; }
        applyFilters();
      } else if (t.id === 'signin-btn') { state.authMode = 'signin'; openAuth(); }
      else if (t.id === 'signout-btn') { t.closest('details').open = false; signOut(); }
      else if (t.id === 'checkout-btn') openCheckout();
      else if (t.id === 'more-btn') { state.shown += C.PAGE_SIZE; renderGrid(true); }
      else if (t.id === 'theme-toggle') setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
      else if (t.id === 'expand-btn') setFull(!dlg.checkout.classList.contains('is-full'));
      else if (t.id === 'cart-btn') { renderCart(); dlg.cart.showModal(); }
      else if (t.id === 'filter-toggle') { const open = t.getAttribute('aria-expanded') !== 'true'; t.setAttribute('aria-expanded', String(open)); $('#filters').classList.toggle('open', open); }
      else if (t.dataset.min !== undefined && t.classList.contains('chip')) { state.filters.min = d.min; state.filters.max = d.max; $('#min-price').value = d.min; $('#max-price').value = d.max; applyPrice(); }
      else if (t.id === 'clear-filters') clearFilters();
      // links inside dialogs close the dialog so the routed page is visible
      if (t.matches('a[href^="#/"]')) { const dg = t.closest('dialog'); if (dg) dg.close(); }
      // close account menu when something inside it is chosen
      const menu = t.closest('details.menu'); if (menu && t.tagName === 'A') menu.open = false;
    });
    // click outside closes account menu; click on dialog backdrop closes dialog
    document.addEventListener('click', e => {
      const m = $('details.menu[open]'); if (m && !m.contains(e.target)) m.open = false;
      if (e.target instanceof HTMLDialogElement) e.target.close();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { const m = $('details.menu[open]'); if (m) { m.open = false; m.querySelector('summary').focus(); } } });

    const search = debounce(() => {
      state.filters.q = $('#search-input').value.trim();
      if (state.view !== 'home') location.hash = '#/';
      applyFilters();
    }, 250);
    $('#search-input').addEventListener('input', search);
    $('#search-form').addEventListener('submit', e => { e.preventDefault(); state.filters.q = $('#search-input').value.trim(); if (state.view !== 'home') location.hash = '#/'; applyFilters(); $('#results-title').scrollIntoView({ behavior: 'smooth' }); });

    $('#sort').addEventListener('change', e => { state.filters.sort = e.target.value; applyFilters(); });
    $('#in-stock').addEventListener('change', e => { state.filters.inStock = e.target.checked; applyFilters(); });
    $('#filter-form').addEventListener('submit', e => e.preventDefault());
    const applyPriceDebounced = debounce(applyPrice, 350);
    $('#min-price').addEventListener('input', applyPriceDebounced);
    $('#max-price').addEventListener('input', applyPriceDebounced);

    window.addEventListener('hashchange', () => route(false));
    dlg.auth.addEventListener('close', () => { if (!state.user) state.afterAuth = null; });
  }

  function applyPrice() {
    const min = $('#min-price').value, max = $('#max-price').value, err = $('#price-err');
    if (min !== '' && max !== '' && Number(min) > Number(max)) { err.hidden = false; err.textContent = '⚠ Minimum price is higher than maximum.'; return; }
    err.hidden = true;
    state.filters.min = min; state.filters.max = max;
    applyFilters();
  }

  /* ================= BOOT ================= */
  async function boot() {
    $('#perk-free').textContent = `Free delivery over ${money(C.FREE_DELIVERY_THRESHOLD)}`;
    $('#support-phone').textContent = C.SUPPORT_PHONE;
    $('#support-phone').href = 'tel:' + C.SUPPORT_PHONE.replace(/\s/g, '');
    setTheme(document.documentElement.dataset.theme || 'light');
    renderAccount(); updateBadges(0);
    Auth.refresh().then(u => { state.user = u; renderAccount(); if (state.view === 'orders') renderOrders(); }); // confirm the session with the server
    $('#grid').replaceChildren(...skeletonCards(8));
    bindEvents(); route(true); initGoogle();
    await loadProducts();
    renderCart(); applyFilters(); route(true);
  }
  boot();
})();
