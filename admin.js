/* admin.js — Jibuy admin: sign-in, products CRUD, orders, coupons.
   Local mode: protected only by a client-side check (fine for demos). For real use run server.js (API_BASE),
   where every write is authorised on the server with a bearer token. */
(() => {
  'use strict';
  const C = window.JIBUY_CONFIG;
  const { Store, Auth, img, categories } = window.Jibuy;
  const { h, money, debounce, uid } = window.Jibuy.util;
  const $ = (s, r = document) => r.querySelector(s);
  const root = $('#admin-root');
  const pd = $('#product-dialog');
  const PAGE = 20;
  const STATUSES = ['Processing', 'Awaiting delivery', 'Shipped', 'Delivered', 'Cancelled'];
  const catName = id => (categories.find(c => c.id === id) || {}).name || id;

  const st = { products: [], orders: [], coupons: [], tab: 'products', q: '', cat: 'all', page: 1 };

  function toast(msg, type = 'info') {
    const box = $('#toasts');
    while (box.children.length >= 3) box.firstElementChild.remove();
    const t = h('div', { class: 'toast ' + type }, h('span', { 'aria-hidden': 'true' }, type === 'error' ? '⚠' : type === 'success' ? '✓' : 'ℹ'), h('span', null, msg));
    box.append(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3500);
  }

  function field(id, label, opts = {}) {
    const { type = 'text', value = '', required = true, hint, wide, area, maxlength = 200, min, step } = opts;
    const input = area
      ? h('textarea', { id, rows: 4, maxlength: 1000, 'aria-describedby': id + '-err' }, value)
      : h('input', { id, type, value, maxlength, min, step, 'aria-describedby': (hint ? id + '-hint ' : '') + id + '-err', 'aria-required': required ? 'true' : null });
    return h('div', { class: 'field' + (wide ? ' wide' : '') },
      h('label', { for: id }, label, required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null), input,
      hint ? h('p', { class: 'hint', id: id + '-hint' }, hint) : null, h('p', { class: 'error', id: id + '-err', hidden: true }));
  }
  function err(id, msg) {
    const i = document.getElementById(id), e = document.getElementById(id + '-err');
    if (!i || !e) return;
    e.hidden = !msg; e.textContent = msg ? '⚠ ' + msg : '';
    if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid');
  }
  const val = id => (document.getElementById(id) || { value: '' }).value;

  /* ---------- gate (sign in / first-run setup) ---------- */
  async function showGate() {
    $('#admin-actions').replaceChildren();
    const setup = !(await Auth.adminExists());
    const form = h('form', { novalidate: true },
      field('ad-email', 'Admin email', { type: 'email' }),
      field('ad-pass', 'Password', { type: 'password', hint: setup ? 'At least 10 characters with a letter and a number.' : null, maxlength: 100 }),
      h('p', { class: 'error', id: 'ad-error', role: 'alert', hidden: true }),
      h('button', { type: 'submit', class: 'btn btn-primary block' }, setup ? 'Create admin account' : 'Sign in'));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = val('ad-email').trim(), password = val('ad-pass');
      const bad = {};
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) bad['ad-email'] = 'Enter a valid email address.';
      if (!password) bad['ad-pass'] = 'Enter your password.';
      else if (setup && !(password.length >= 10 && /[A-Za-z]/.test(password) && /\d/.test(password))) bad['ad-pass'] = 'Use at least 10 characters with a letter and a number.';
      ['ad-email', 'ad-pass'].forEach(id => err(id, bad[id]));
      const first = Object.keys(bad)[0];
      if (first) { document.getElementById(first).focus(); return; }
      const box = $('#ad-error'); box.hidden = true;
      try { setup ? await Auth.adminSetup({ email, password }) : await Auth.adminLogin({ email, password }); await showApp(); }
      catch (ex) { box.hidden = false; box.textContent = '⚠ ' + ex.message; }
    });
    root.replaceChildren(h('section', { class: 'admin-gate', 'aria-labelledby': 'gate-h' },
      h('h1', { id: 'gate-h' }, setup ? 'Set up your admin account' : 'Admin sign in'),
      setup ? h('p', { class: 'note-box' }, 'First visit: choose the admin email and password. They are stored on this device as a salted hash.') : null,
      form));
    $('#main').focus();
  }

  /* ---------- app ---------- */
  async function showApp() {
    try {
      [st.products, st.orders, st.coupons] = await Promise.all([Store.products.all({ admin: true }), Store.orders.all(), Store.coupons.all({ admin: true })]);
    } catch (ex) { toast(ex.message, 'error'); Auth.adminLogout(); return showGate(); }
    $('#admin-actions').replaceChildren(h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { Auth.adminLogout(); showGate(); } }, 'Sign out'));
    render();
  }

  function render() {
    const revenue = st.orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);
    const low = st.products.filter(p => p.stock <= 5).length;
    const stat = (l, v) => h('div', { class: 'stat' }, h('strong', null, v), h('span', { class: 'muted' }, l));
    const tab = (id, label) => h('button', { type: 'button', 'aria-current': String(st.tab === id), onclick: () => { st.tab = id; st.page = 1; render(); } }, label);
    root.replaceChildren(
      h('h1', { class: 'page-title' }, 'Store dashboard'),
      h('div', { class: 'stats' }, stat('Products', st.products.length), stat('Orders', st.orders.length), stat('Revenue (excl. cancelled)', money(revenue)), stat('Low or no stock', low)),
      h('div', { class: 'tabs', role: 'group', 'aria-label': 'Admin sections' }, tab('products', 'Products'), tab('orders', 'Orders'), tab('coupons', 'Coupons')),
      st.tab === 'products' ? productsPanel() : st.tab === 'orders' ? ordersPanel() : couponsPanel());
  }

  /* ---------- products ---------- */
  function productsPanel() {
    const q = st.q.toLowerCase();
    const list = st.products.filter(p => (st.cat === 'all' || p.category === st.cat) && (!q || (p.name + ' ' + p.brand).toLowerCase().includes(q)));
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    st.page = Math.min(st.page, pages);
    const rows = list.slice((st.page - 1) * PAGE, st.page * PAGE);

    const search = h('input', { id: 'ad-q', type: 'search', value: st.q, placeholder: 'Name or brand', maxlength: 60 });
    search.addEventListener('input', debounce(() => { st.q = search.value.trim(); st.page = 1; refreshList(); }, 250));
    const catSel = h('select', { id: 'ad-cat' }, h('option', { value: 'all' }, 'All categories'), categories.map(c => h('option', { value: c.id, selected: st.cat === c.id }, c.name)));
    catSel.addEventListener('change', () => { st.cat = catSel.value; st.page = 1; refreshList(); });

    const wrap = h('section', { 'aria-label': 'Products' },
      h('div', { class: 'panel-bar' },
        h('div', { class: 'field' }, h('label', { for: 'ad-q' }, 'Search products'), search),
        h('div', { class: 'field' }, h('label', { for: 'ad-cat' }, 'Category'), catSel),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => openProductForm(null) }, 'Add product'),
        window.Jibuy.REMOTE ? null : h('button', { type: 'button', class: 'btn btn-ghost', onclick: resetCatalogue }, 'Restore sample catalogue')),
      h('div', { id: 'plist' }));
    setTimeout(refreshList, 0);
    return wrap;

    function refreshList() {
      const qq = st.q.toLowerCase();
      const l = st.products.filter(p => (st.cat === 'all' || p.category === st.cat) && (!qq || (p.name + ' ' + p.brand).toLowerCase().includes(qq)));
      const pg = Math.max(1, Math.ceil(l.length / PAGE)); st.page = Math.min(st.page, pg);
      const r = l.slice((st.page - 1) * PAGE, st.page * PAGE);
      $('#plist').replaceChildren(
        h('div', { class: 'table-wrap' }, h('table', null,
          h('caption', null, `${l.length} products (page ${st.page} of ${pg})`),
          h('thead', null, h('tr', null, ['Photo', 'Name', 'Category', 'Price', 'Stock', 'Actions'].map(c => h('th', { scope: 'col' }, c)))),
          h('tbody', null, r.map(p => h('tr', null,
            h('td', null, h('img', { src: img(p.images[0]), alt: '', width: 44, height: 44, loading: 'lazy' })),
            h('td', null, p.name), h('td', null, catName(p.category)), h('td', null, money(p.price)),
            h('td', null, p.stock < 1 ? '✖ 0 (sold out)' : p.stock <= 5 ? `⚠ ${p.stock} (low)` : String(p.stock)),
            h('td', null, h('div', { class: 'row-actions' },
              h('button', { type: 'button', class: 'btn btn-outline btn-sm', 'aria-label': 'Edit ' + p.name, onclick: () => openProductForm(p) }, 'Edit'),
              h('button', { type: 'button', class: 'btn btn-danger btn-sm', 'aria-label': 'Delete ' + p.name, onclick: () => removeProduct(p) }, 'Delete')))))))),
        h('div', { class: 'pager' },
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', disabled: st.page <= 1, onclick: () => { st.page--; refreshList(); } }, 'Previous'),
          h('span', null, `Page ${st.page} of ${pg}`),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', disabled: st.page >= pg, onclick: () => { st.page++; refreshList(); } }, 'Next')));
    }
  }

  async function removeProduct(p) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try { await Store.products.remove(p.id); st.products = st.products.filter(x => x.id !== p.id); toast('Product deleted', 'success'); render(); }
    catch (ex) { toast(ex.message, 'error'); }
  }
  function resetCatalogue() {
    if (!confirm('Replace all products and coupons on this device with the 192-product sample catalogue?')) return;
    Auth.resetCatalogue(); showApp(); toast('Sample catalogue restored', 'success');
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return reject(new Error('Choose a PNG, JPG or WebP image.'));
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('Could not read that file.'));
      fr.onload = () => {
        const im = new Image();
        im.onerror = () => reject(new Error('That file is not a valid image.'));
        im.onload = () => {
          const s = Math.min(1, 600 / Math.max(im.width, im.height));
          const c = document.createElement('canvas');
          c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.8));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function openProductForm(p) {
    const isNew = !p;
    let imgs = p ? [...p.images] : [];
    $('#pd-title').textContent = isNew ? 'Add product' : 'Edit product';
    const list = h('div', { class: 'img-list', id: 'pf-imglist' });
    const drawImgs = () => {
      list.replaceChildren(...imgs.map((src, i) => h('div', { class: 'img-item' }, h('img', { src: img(src), alt: `Product photo ${i + 1}`, width: 64, height: 64 }),
        h('button', { type: 'button', 'aria-label': `Remove photo ${i + 1}`, onclick: () => { imgs.splice(i, 1); drawImgs(); } }, '✕'))));
      if (!imgs.length) list.replaceChildren(h('p', { class: 'muted' }, 'No photos yet.'));
    };
    drawImgs();
    const urlIn = h('input', { id: 'pf-url', type: 'url', placeholder: 'https://…/photo.jpg', maxlength: 500 });
    const fileIn = h('input', { id: 'pf-file', type: 'file', accept: 'image/png,image/jpeg,image/webp' });
    fileIn.addEventListener('change', async () => {
      try { for (const f of fileIn.files) imgs.push(await resizeImage(f)); drawImgs(); } catch (ex) { toast(ex.message, 'error'); }
      fileIn.value = '';
    });

    const form = h('form', { class: 'admin-form', novalidate: true },
      field('pf-name', 'Product name', { value: p ? p.name : '', wide: true }),
      field('pf-brand', 'Brand', { value: p ? p.brand : '' }),
      h('div', { class: 'field' }, h('label', { for: 'pf-cat' }, 'Category'), h('select', { id: 'pf-cat' }, categories.map(c => h('option', { value: c.id, selected: p && p.category === c.id }, c.name)))),
      field('pf-price', 'Price (₦)', { type: 'number', value: p ? p.price : '', min: 0, step: 100 }),
      field('pf-old', 'Old price (₦), optional', { type: 'number', value: p && p.oldPrice ? p.oldPrice : '', required: false, min: 0, step: 100 }),
      field('pf-stock', 'Stock', { type: 'number', value: p ? p.stock : 10, min: 0, step: 1 }),
      field('pf-loc', 'Seller location', { value: p ? p.location : 'Lagos' }),
      field('pf-desc', 'Description', { area: true, wide: true, value: p ? p.description : '' }),
      field('pf-feat', 'Key features (one per line)', { area: true, wide: true, required: false, value: p ? (p.features || []).join('\n') : '' }),
      field('pf-vlabel', 'Variant name, e.g. Size', { required: false, value: p && p.variants ? p.variants.label : '' }),
      field('pf-vopts', 'Variant options, comma separated', { required: false, value: p && p.variants ? p.variants.options.join(', ') : '', hint: 'Leave both blank if the product has no variants.' }),
      h('div', { class: 'check wide' }, h('input', { type: 'checkbox', id: 'pf-ver', checked: p ? p.verified : true }), h('label', { for: 'pf-ver' }, 'Verified seller')),
      h('div', { class: 'check wide' }, h('input', { type: 'checkbox', id: 'pf-feat-chk', checked: p ? p.featured : false }), h('label', { for: 'pf-feat-chk' }, 'Show first (featured)')),
      h('fieldset', { class: 'wide fs' }, h('legend', null, 'Photos'), list,
        h('div', { class: 'field' }, h('label', { for: 'pf-file' }, 'Upload photos (resized to 600px)'), fileIn),
        h('div', { class: 'coupon-row' }, h('div', { class: 'field', style: 'flex:1;margin:0' }, h('label', { for: 'pf-url' }, 'Or add an image link (https)'), urlIn),
          h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => { const u = urlIn.value.trim(); if (!/^https:\/\//i.test(u)) return toast('Image links must start with https://', 'error'); imgs.push(u); urlIn.value = ''; drawImgs(); } }, 'Add link')),
        h('p', { class: 'error', id: 'pf-img-err', hidden: true })),
      h('div', { class: 'form-actions wide' },
        h('button', { type: 'button', class: 'btn btn-ghost', 'data-close': '' }, 'Cancel'),
        h('button', { type: 'submit', class: 'btn btn-primary' }, 'Save product')));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const bad = {};
      const price = Number(val('pf-price')), old = val('pf-old') === '' ? null : Number(val('pf-old')), stock = Number(val('pf-stock'));
      if (val('pf-name').trim().length < 3) bad['pf-name'] = 'Enter a product name (3+ characters).';
      if (val('pf-brand').trim().length < 2) bad['pf-brand'] = 'Enter a brand.';
      if (!(price > 0)) bad['pf-price'] = 'Enter a price above 0.';
      if (old !== null && !(old > price)) bad['pf-old'] = 'Old price must be higher than the price.';
      if (!Number.isInteger(stock) || stock < 0) bad['pf-stock'] = 'Enter a whole number, 0 or more.';
      if (val('pf-loc').trim().length < 2) bad['pf-loc'] = 'Enter a location.';
      if (val('pf-desc').trim().length < 10) bad['pf-desc'] = 'Describe the product (10+ characters).';
      const vl = val('pf-vlabel').trim(), vo = val('pf-vopts').split(',').map(s => s.trim()).filter(Boolean);
      if ((vl && !vo.length) || (!vl && vo.length)) bad['pf-vopts'] = 'Fill in both the variant name and its options, or leave both blank.';
      ['pf-name', 'pf-brand', 'pf-price', 'pf-old', 'pf-stock', 'pf-loc', 'pf-desc', 'pf-vopts'].forEach(id => err(id, bad[id]));
      const ie = $('#pf-img-err'); ie.hidden = imgs.length > 0; ie.textContent = '⚠ Add at least one photo.';
      const first = Object.keys(bad)[0];
      if (first) { document.getElementById(first).focus(); return; }
      if (!imgs.length) return;
      const cat = val('pf-cat');
      const product = {
        ...(p || {}),
        id: p ? p.id : 'p' + Date.now().toString(36),
        name: val('pf-name').trim(), brand: val('pf-brand').trim(), category: cat, price: Math.round(price), oldPrice: old ? Math.round(old) : null,
        stock, location: val('pf-loc').trim(), description: val('pf-desc').trim(),
        features: val('pf-feat').split('\n').map(s => s.trim()).filter(Boolean),
        variants: vl ? { label: vl, options: vo } : null,
        verified: $('#pf-ver').checked, featured: $('#pf-feat-chk').checked, images: imgs,
        rating: p ? p.rating : 4.5, reviewCount: p ? p.reviewCount : 0,
        tags: [catName(cat).toLowerCase(), val('pf-brand').trim().toLowerCase()],
        created: p ? p.created : Date.now()
      };
      try {
        await Store.products.upsert(product);
        const i = st.products.findIndex(x => x.id === product.id);
        if (i >= 0) st.products[i] = product; else st.products.unshift(product);
        pd.close(); toast(isNew ? 'Product added' : 'Product saved', 'success'); render();
      } catch (ex) { toast(ex.message, 'error'); }
    });
    $('#pd-body').replaceChildren(form);
    pd.showModal();
  }

  /* ---------- orders ---------- */
  function ordersPanel() {
    if (!st.orders.length) return h('div', { class: 'empty' }, h('p', { class: 'empty-icon', 'aria-hidden': 'true' }, '📦'), h('p', { class: 'empty-title' }, 'No orders yet'), h('p', { class: 'muted' }, 'Orders placed on the storefront will appear here.'));
    return h('div', { class: 'table-wrap' }, h('table', null,
      h('caption', null, `${st.orders.length} orders`),
      h('thead', null, h('tr', null, ['Order', 'Date', 'Customer', 'Items', 'Total', 'Payment', 'Status'].map(c => h('th', { scope: 'col' }, c)))),
      h('tbody', null, st.orders.map(o => {
        const sel = h('select', { 'aria-label': `Status for order ${o.id}` }, STATUSES.map(s => h('option', { value: s, selected: s === o.status }, s)));
        sel.addEventListener('change', async () => {
          try { await Store.orders.setStatus(o.id, sel.value); o.status = sel.value; toast(`Order ${o.id} is now ${o.status}`, 'success'); }
          catch (ex) { sel.value = o.status; toast(ex.message, 'error'); }
        });
        return h('tr', null, h('td', null, o.id), h('td', null, new Date(o.created).toLocaleDateString(C.LOCALE, { dateStyle: 'medium' })),
          h('td', null, `${o.customer.name}, ${o.customer.phone}, ${o.customer.city}, ${o.customer.state}`),
          h('td', null, o.items.map(i => `${i.qty}× ${i.name}`).join('; ')), h('td', null, money(o.total)), h('td', null, o.payment), h('td', null, sel));
      }))));
  }

  /* ---------- coupons ---------- */
  function couponsPanel() {
    const form = h('form', { class: 'admin-form', novalidate: true },
      field('cp-code', 'Code', { maxlength: 20, hint: 'Letters and numbers, e.g. SALE20' }),
      h('div', { class: 'field' }, h('label', { for: 'cp-type' }, 'Type'), h('select', { id: 'cp-type' }, h('option', { value: 'percent' }, 'Percent off'), h('option', { value: 'fixed' }, 'Fixed amount off (₦)'), h('option', { value: 'shipping' }, 'Free delivery'))),
      field('cp-value', 'Value (percent or ₦)', { type: 'number', min: 0, required: false, value: 10 }),
      field('cp-min', 'Minimum order (₦)', { type: 'number', min: 0, value: 0 }),
      h('div', { class: 'form-actions wide' }, h('button', { type: 'submit', class: 'btn btn-primary' }, 'Add coupon')));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const code = val('cp-code').trim().toUpperCase(), type = val('cp-type'), value = Number(val('cp-value')), min = Number(val('cp-min'));
      const bad = {};
      if (!/^[A-Z0-9]{3,20}$/.test(code)) bad['cp-code'] = 'Use 3–20 letters or numbers.';
      else if (st.coupons.some(c => c.code === code)) bad['cp-code'] = 'That code already exists.';
      if (type !== 'shipping' && !(value > 0 && (type !== 'percent' || value <= 100))) bad['cp-value'] = type === 'percent' ? 'Enter a percent from 1 to 100.' : 'Enter an amount above 0.';
      if (!(min >= 0)) bad['cp-min'] = 'Enter 0 or more.';
      ['cp-code', 'cp-value', 'cp-min'].forEach(id => err(id, bad[id]));
      const first = Object.keys(bad)[0];
      if (first) { document.getElementById(first).focus(); return; }
      const c = { id: code, code, type, value: type === 'shipping' ? 0 : value, min, active: true, note: type === 'percent' ? `${value}% off` : type === 'fixed' ? `${money(value)} off` : 'Free delivery' };
      try { await Store.coupons.upsert(c); st.coupons.unshift(c); toast('Coupon added', 'success'); render(); } catch (ex) { toast(ex.message, 'error'); }
    });
    return h('section', { 'aria-label': 'Coupons' }, h('h2', { class: 'page-title' }, 'Coupons'), form,
      h('div', { class: 'table-wrap' }, h('table', null, h('caption', null, `${st.coupons.length} coupons`),
        h('thead', null, h('tr', null, ['Code', 'Offer', 'Minimum', 'Active', 'Actions'].map(c => h('th', { scope: 'col' }, c)))),
        h('tbody', null, st.coupons.map(c => h('tr', null, h('td', null, c.code), h('td', null, c.note), h('td', null, money(c.min)), h('td', null, c.active ? '✔ Yes' : '✖ No'),
          h('td', null, h('div', { class: 'row-actions' },
            h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: async () => { c.active = !c.active; try { await Store.coupons.upsert(c); render(); } catch (ex) { c.active = !c.active; toast(ex.message, 'error'); } } }, c.active ? 'Turn off' : 'Turn on'),
            h('button', { type: 'button', class: 'btn btn-danger btn-sm', 'aria-label': 'Delete coupon ' + c.code, onclick: async () => { if (!confirm(`Delete coupon ${c.code}?`)) return; try { await Store.coupons.remove(c.id); st.coupons = st.coupons.filter(x => x.id !== c.id); render(); } catch (ex) { toast(ex.message, 'error'); } } }, 'Delete')))))))));
  }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-close]'); if (b) b.closest('dialog')?.close();
    if (e.target instanceof HTMLDialogElement) e.target.close();
  });

  (async () => { if (Auth.isAdmin()) await showApp(); else await showGate(); })();
})();
