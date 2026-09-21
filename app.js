'use strict';

/* =========================================================
   1. DATA — sample product catalog (trusted, static data)
   ========================================================= */
const PRODUCTS = [
  { id:'p01', category:'clothing', name:'Ankara Print Wrap Dress', price:18500, rating:4.6,
    images:['https://placehold.co/600x750/1F2B25/C8A24A?text=Ankara+Wrap+Dress+1','https://placehold.co/600x750/16201C/C8A24A?text=Ankara+Wrap+Dress+2','https://placehold.co/600x750/0E1512/C8A24A?text=Ankara+Wrap+Dress+3'],
    description:'A bold Ankara wrap dress cut for movement, with an adjustable waist tie and a print that turns heads at every owambe.',
    variants:[{ type:'Size', options:['S','M','L','XL'] }, { type:'Color', options:['Amber','Emerald'] }],
    reviews:[
      { author:'Zainab O.', rating:5, comment:'Fits true to size and the fabric is thick quality, not see-through at all.', date:'2026-07-02' },
      { author:'Chidinma A.', rating:4, comment:'Beautiful print, wish it came in more colors.', date:'2026-06-14' }
    ] },
  { id:'p02', category:'clothing', name:'Oversized Streetwear Hoodie', price:14000, rating:4.4,
    images:['https://placehold.co/600x750/1F2B25/F4EFE3?text=Streetwear+Hoodie+1','https://placehold.co/600x750/16201C/F4EFE3?text=Streetwear+Hoodie+2'],
    description:'Heavyweight cotton-blend hoodie with a boxy oversized fit and embroidered Jibuy crest — built for Lagos harmattan mornings.',
    variants:[{ type:'Size', options:['S','M','L','XL','XXL'] }, { type:'Color', options:['Black','Sand'] }],
    reviews:[
      { author:'Tobi K.', rating:5, comment:'Warm, soft, and the fit is exactly like the photos.', date:'2026-08-01' },
      { author:'Ifeoma N.', rating:4, comment:'Good quality but runs a size big.', date:'2026-07-20' }
    ] },
  { id:'p03', category:'clothing', name:'Agbada-Inspired Kaftan', price:32000, rating:4.8,
    images:['https://placehold.co/600x750/1F2B25/C8A24A?text=Agbada+Kaftan+1','https://placehold.co/600x750/16201C/C8A24A?text=Agbada+Kaftan+2','https://placehold.co/600x750/0E1512/C8A24A?text=Agbada+Kaftan+3'],
    description:'A modern take on the classic agbada silhouette in breathable senator fabric, hand-finished embroidery at the collar.',
    variants:[{ type:'Size', options:['M','L','XL','XXL'] }, { type:'Color', options:['Ivory','Navy'] }],
    reviews:[
      { author:'Emeka U.', rating:5, comment:'Wore this to my brother\u2019s wedding, got so many compliments.', date:'2026-05-30' }
    ] },
  { id:'p04', category:'clothing', name:'High-Waist Denim Jeans', price:11500, rating:4.3,
    images:['https://placehold.co/600x750/1F2B25/F4EFE3?text=Denim+Jeans+1','https://placehold.co/600x750/16201C/F4EFE3?text=Denim+Jeans+2'],
    description:'Stretch denim with a flattering high-waist cut and raw hem detail — an everyday staple.',
    variants:[{ type:'Size', options:['28','30','32','34','36'] }, { type:'Wash', options:['Light Wash','Dark Wash'] }],
    reviews:[
      { author:'Blessing E.', rating:4, comment:'Comfortable stretch, holds shape all day.', date:'2026-07-11' },
      { author:'Kunle S.', rating:5, comment:'Bought for my sister, she loves it.', date:'2026-06-02' }
    ] },
  { id:'p05', category:'clothing', name:'Lagos Nights Satin Slip Dress', price:16800, rating:4.5,
    images:['https://placehold.co/600x750/1F2B25/C8A24A?text=Satin+Slip+Dress+1','https://placehold.co/600x750/16201C/C8A24A?text=Satin+Slip+Dress+2'],
    description:'Fluid satin slip dress with adjustable straps — dress it up with heels or down with sneakers for a night out.',
    variants:[{ type:'Size', options:['S','M','L'] }, { type:'Color', options:['Wine','Black','Gold'] }],
    reviews:[
      { author:'Amaka F.', rating:4, comment:'Silky and flattering, runs slightly small.', date:'2026-08-10' }
    ] },
  { id:'p06', category:'wine', name:'Chapman Red Blend 750ml', price:9200, rating:4.5,
    images:['https://placehold.co/600x750/1F2B25/7A2436?text=Chapman+Red+Blend','https://placehold.co/600x750/16201C/7A2436?text=Back+Label'],
    description:'A smooth, fruit-forward red blend with notes of blackcurrant and spice — chill slightly for the best pour.',
    variants:[{ type:'Pack', options:['Single Bottle','Pack of 3'] }],
    reviews:[
      { author:'Segun A.', rating:5, comment:'Goes down easy, perfect for small gatherings.', date:'2026-07-25' },
      { author:'Ronke I.', rating:4, comment:'Nice balance, not too sweet.', date:'2026-06-19' }
    ] },
  { id:'p07', category:'wine', name:'Zinlaw Sparkling Ros\u00e9 750ml', price:12500, rating:4.7,
    images:['https://placehold.co/600x750/1F2B25/C8A24A?text=Sparkling+Rose','https://placehold.co/600x750/16201C/C8A24A?text=Back+Label'],
    description:'Crisp sparkling ros\u00e9 with delicate bubbles and a hint of strawberry — the go-to for celebrations.',
    variants:[{ type:'Pack', options:['Single Bottle','Pack of 3'] }],
    reviews:[
      { author:'Ngozi T.', rating:5, comment:'Was the star of my birthday table.', date:'2026-08-05' }
    ] },
  { id:'p08', category:'wine', name:'Naija Palm Reserve Wine 750ml', price:7800, rating:4.2,
    images:['https://placehold.co/600x750/1F2B25/7A2436?text=Palm+Reserve+Wine','https://placehold.co/600x750/16201C/7A2436?text=Back+Label'],
    description:'A locally inspired reserve wine with a warm, earthy palm-sweetened finish.',
    variants:[{ type:'Pack', options:['Single Bottle','Pack of 3'] }],
    reviews:[
      { author:'Femi B.', rating:4, comment:'Different from regular wine, in a good way.', date:'2026-05-15' }
    ] },
  { id:'p09', category:'wine', name:'Golden Harvest Moscato 750ml', price:8900, rating:4.6,
    images:['https://placehold.co/600x750/1F2B25/C8A24A?text=Golden+Moscato','https://placehold.co/600x750/16201C/C8A24A?text=Back+Label'],
    description:'Sweet, aromatic moscato with notes of peach and honeysuckle — best served chilled.',
    variants:[{ type:'Pack', options:['Single Bottle','Pack of 3'] }],
    reviews:[
      { author:'Halima D.', rating:5, comment:'My favorite, so smooth and sweet.', date:'2026-07-30' },
      { author:'Chuka P.', rating:4, comment:'Great for beginners who don\u2019t like dry wine.', date:'2026-06-27' }
    ] },
  { id:'p10', category:'beads', name:'Coral Waist Beads Set', price:6500, rating:4.4,
    images:['https://placehold.co/600x750/1F2B25/7A2436?text=Coral+Waist+Beads','https://placehold.co/600x750/16201C/7A2436?text=Detail'],
    description:'Hand-strung coral waist beads with an adjustable elastic closure, set of 3 strands.',
    variants:[{ type:'Length', options:['Standard','Extended'] }],
    reviews:[
      { author:'Aisha M.', rating:5, comment:'Beautiful color, exactly as pictured.', date:'2026-08-12' }
    ] },
  { id:'p11', category:'beads', name:'Handwoven Ankara Clutch', price:9900, rating:4.5,
    images:['https://placehold.co/600x750/1F2B25/C8A24A?text=Ankara+Clutch+1','https://placehold.co/600x750/16201C/C8A24A?text=Ankara+Clutch+2'],
    description:'A compact handwoven clutch in vibrant Ankara fabric with a gold-tone clasp and detachable wrist strap.',
    variants:[{ type:'Color', options:['Amber','Emerald','Wine'] }],
    reviews:[
      { author:'Precious L.', rating:4, comment:'Sturdy and fits my phone and card wallet easily.', date:'2026-07-08' }
    ] },
  { id:'p12', category:'beads', name:'Yoruba Royal Bead Necklace', price:13200, rating:4.9,
    images:['https://placehold.co/600x750/1F2B25/C8A24A?text=Royal+Bead+Necklace+1','https://placehold.co/600x750/16201C/C8A24A?text=Royal+Bead+Necklace+2'],
    description:'Statement coral and gold-tone bead necklace inspired by traditional Yoruba royal regalia — handcrafted, one strand.',
    variants:[{ type:'Length', options:['Choker','Long'] }],
    reviews:[
      { author:'Folake W.', rating:5, comment:'Museum-quality craftsmanship, worth every naira.', date:'2026-08-16' },
      { author:'Bayo R.', rating:5, comment:'Bought for my wife\u2019s birthday, she cried happy tears.', date:'2026-06-30' }
    ] }
];

const COUPONS = {
  'JIBUY10': { type:'percent', value:10, label:'10% off your order' },
  'NEWGEN':  { type:'flat', value:2000, minSubtotal:20000, label:'\u20a62,000 off orders over \u20a620,000' },
  'FREESHIP':{ type:'freeship', label:'Free delivery' }
};

const DELIVERY_FEES = { Lagos:1500, Abuja:2500, Other:3500 };
const FREE_DELIVERY_THRESHOLD = 150000;

/* =========================================================
   2. STATE + PERSISTENCE
   ========================================================= */
const STORAGE_KEYS = { cart:'jibuy_cart_v1', wishlist:'jibuy_wishlist_v1', theme:'jibuy_theme_v1', delivery:'jibuy_delivery_v1', lastOrder:'jibuy_last_order_v1' };

function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){ return fallback; }
}
function saveJSON(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){ /* storage unavailable — fail silently */ }
}

const state = {
  cart: loadJSON(STORAGE_KEYS.cart, []),         // [{ productId, variant:{Type:option,...}, qty }]
  wishlist: loadJSON(STORAGE_KEYS.wishlist, []), // [productId, ...]
  couponCode: null,
  deliveryState: loadJSON(STORAGE_KEYS.delivery, 'Lagos'),
  filters: { search:'', category:'all', minPrice:null, maxPrice:null, sort:'featured' },
  currentProductId: null,
  galleryIndex: 0
};

function persistCart(){ saveJSON(STORAGE_KEYS.cart, state.cart); }
function persistWishlist(){ saveJSON(STORAGE_KEYS.wishlist, state.wishlist); }

/* =========================================================
   3. UTILITIES
   ========================================================= */
function qs(sel, ctx){ return (ctx||document).querySelector(sel); }
function qsa(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }

function escapeHTML(str){
  return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function formatNaira(amount){
  return '\u20a6' + Math.round(amount).toLocaleString('en-NG');
}

function debounce(fn, delay){
  let timer = null;
  return function(...args){
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function getProduct(id){ return PRODUCTS.find(p => p.id === id) || null; }

function starString(rating){
  const rounded = Math.round(rating);
  return '\u2605'.repeat(rounded) + '\u2606'.repeat(5 - rounded);
}

function lineKey(productId, variant){ return productId + '::' + JSON.stringify(variant); }

/* =========================================================
   4. CART / WISHLIST LOGIC
   ========================================================= */
function addToCart(productId, variant, qty){
  const key = lineKey(productId, variant);
  const existing = state.cart.find(l => lineKey(l.productId, l.variant) === key);
  if (existing){ existing.qty += qty; }
  else{ state.cart.push({ productId, variant, qty }); }
  persistCart();
  renderCartBadges();
  renderCartDrawer();
}

function updateCartLineQty(key, qty){
  const line = state.cart.find(l => lineKey(l.productId, l.variant) === key);
  if (!line) return;
  if (qty <= 0){ removeCartLine(key); return; }
  line.qty = qty;
  persistCart();
  renderCartBadges();
  renderCartDrawer();
}

function removeCartLine(key){
  state.cart = state.cart.filter(l => lineKey(l.productId, l.variant) !== key);
  persistCart();
  renderCartBadges();
  renderCartDrawer();
}

function cartLines(){
  return state.cart
    .map(l => ({ ...l, product: getProduct(l.productId) }))
    .filter(l => l.product);
}

function cartSubtotal(){
  return cartLines().reduce((sum, l) => sum + l.product.price * l.qty, 0);
}

function cartItemCount(){
  return state.cart.reduce((n, l) => n + l.qty, 0);
}

function computeDiscount(subtotal){
  if (!state.couponCode) return 0;
  const coupon = COUPONS[state.couponCode];
  if (!coupon) return 0;
  if (coupon.type === 'percent') return subtotal * (coupon.value / 100);
  if (coupon.type === 'flat') return subtotal >= (coupon.minSubtotal || 0) ? coupon.value : 0;
  return 0;
}

function computeDelivery(subtotal){
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  if (state.couponCode === 'FREESHIP') return 0;
  return DELIVERY_FEES[state.deliveryState] ?? DELIVERY_FEES.Other;
}

function isWishlisted(productId){ return state.wishlist.includes(productId); }

function toggleWishlist(productId){
  if (isWishlisted(productId)){
    state.wishlist = state.wishlist.filter(id => id !== productId);
    showToast('Removed from wishlist');
  }else{
    state.wishlist.push(productId);
    showToast('Added to wishlist');
  }
  persistWishlist();
  renderCartBadges();
  syncWishlistButtons();
}

function syncWishlistButtons(){
  qsa('[data-wishlist-toggle]').forEach(btn => {
    const active = isWishlisted(btn.dataset.wishlistToggle);
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

/* =========================================================
   5. TOASTS
   ========================================================= */
function showToast(message, type){
  const region = qs('#toast-region');
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'error' ? ' is-error' : '');
  toast.textContent = message; // textContent — never innerHTML — for user-facing/dynamic text
  region.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

/* =========================================================
   6. RENDER: PRODUCT GRID (SHOP + WISHLIST)
   ========================================================= */
function renderSkeletons(container, count){
  container.innerHTML = '';
  for (let i = 0; i < count; i++){
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = '<div class="skeleton-thumb"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div>';
    container.appendChild(card);
  }
}

function buildProductCard(product){
  const card = document.createElement('article');
  card.className = 'product-card';
  const wishlisted = isWishlisted(product.id);
  card.innerHTML = `
    <div class="thumb-wrap">
      <a href="#/product/${product.id}" tabindex="-1">
        <img src="${product.images[0]}" alt="" loading="lazy" decoding="async">
      </a>
      <button type="button" class="wishlist-toggle${wishlisted ? ' is-active' : ''}" data-wishlist-toggle="${product.id}"
        aria-pressed="${wishlisted}" aria-label="${wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4.5 5.6 4 8 3.7 10 5 12 7.3 14 5 16 3.7 18.4 4 22 4.5 23.5 8 22 11.7 19.5 16.4 12 21 12 21Z"/></svg>
      </button>
    </div>
    <div class="card-body">
      <p class="card-category">${escapeHTML(product.category)}</p>
      <h3 class="card-name"><a href="#/product/${product.id}">${escapeHTML(product.name)}</a></h3>
      <p class="card-rating"><span class="stars" aria-hidden="true">${starString(product.rating)}</span><span>${product.rating.toFixed(1)}</span></p>
      <p class="card-price">${formatNaira(product.price)}</p>
      <button type="button" class="btn btn-primary card-add-btn" data-quick-add="${product.id}">Add to cart</button>
    </div>`;
  return card;
}

function filteredSortedProducts(){
  const f = state.filters;
  let list = PRODUCTS.filter(p => {
    if (f.category !== 'all' && p.category !== f.category) return false;
    if (f.search && !p.name.toLowerCase().includes(f.search.toLowerCase())) return false;
    if (f.minPrice != null && p.price < f.minPrice) return false;
    if (f.maxPrice != null && p.price > f.maxPrice) return false;
    return true;
  });
  switch(f.sort){
    case 'price-asc': list = list.slice().sort((a,b) => a.price - b.price); break;
    case 'price-desc': list = list.slice().sort((a,b) => b.price - a.price); break;
    case 'rating': list = list.slice().sort((a,b) => b.rating - a.rating); break;
    case 'newest': list = list.slice().reverse(); break;
    default: break; // featured = catalog order
  }
  return list;
}

function renderShopGrid(){
  const grid = qs('#product-grid');
  const results = filteredSortedProducts();
  qs('#results-count').textContent = `${results.length} item${results.length === 1 ? '' : 's'}`;
  grid.innerHTML = '';
  if (results.length === 0){
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<h2>No products match your search</h2><p>Try a different keyword or clear your filters.</p>`;
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn btn-outline';
    clearBtn.textContent = 'Clear all filters';
    clearBtn.addEventListener('click', clearFilters);
    empty.appendChild(clearBtn);
    grid.appendChild(empty);
    return;
  }
  const frag = document.createDocumentFragment();
  results.forEach(p => frag.appendChild(buildProductCard(p)));
  grid.appendChild(frag);
}

function loadShopWithSkeleton(){
  const grid = qs('#product-grid');
  renderSkeletons(grid, 8);
  setTimeout(renderShopGrid, 350); // simulate network fetch
}

function renderWishlistGrid(){
  const grid = qs('#wishlist-grid');
  grid.innerHTML = '';
  const items = state.wishlist.map(getProduct).filter(Boolean);
  if (items.length === 0){
    grid.innerHTML = `<div class="empty-state"><h2>Your wishlist is empty</h2><p>Tap the heart on any product to save it here.</p></div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach(p => frag.appendChild(buildProductCard(p)));
  grid.appendChild(frag);
}

function clearFilters(){
  state.filters = { search:'', category:'all', minPrice:null, maxPrice:null, sort:'featured' };
  qs('#search-input').value = '';
  qs('#price-min').value = '';
  qs('#price-max').value = '';
  qs('#sort-select').value = 'featured';
  qsa('.chip').forEach(c => c.classList.toggle('is-active', c.dataset.category === 'all'));
  renderShopGrid();
}

/* =========================================================
   7. RENDER: PRODUCT DETAIL
   ========================================================= */
function renderProductDetail(productId){
  const product = getProduct(productId);
  const container = qs('#product-detail-content');
  if (!product){
    container.innerHTML = `<div class="empty-state"><h2>Product not found</h2><p>It may have been removed.</p></div>`;
    return;
  }
  state.currentProductId = productId;
  state.galleryIndex = 0;

  const selectedVariant = {};
  product.variants.forEach(v => { selectedVariant[v.type] = v.options[0]; });

  const relatedProducts = PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, 3);
  const wishlisted = isWishlisted(product.id);

  container.innerHTML = `
    <div class="product-detail">
      <div class="gallery">
        <div class="gallery-main"><img id="gallery-main-img" src="${product.images[0]}" alt="${escapeHTML(product.name)}"></div>
        <div class="gallery-thumbs" role="tablist" aria-label="Product images">
          ${product.images.map((img, i) => `<button type="button" class="${i === 0 ? 'is-active' : ''}" data-gallery-index="${i}" role="tab" aria-selected="${i === 0}"><img src="${img}" alt=""></button>`).join('')}
        </div>
      </div>
      <div class="detail-info">
        <p class="detail-category">${escapeHTML(product.category)}</p>
        <h1>${escapeHTML(product.name)}</h1>
        <p class="detail-rating"><span class="stars" aria-hidden="true">${starString(product.rating)}</span><span>${product.rating.toFixed(1)} (${product.reviews.length} reviews)</span></p>
        <p class="detail-price">${formatNaira(product.price)}</p>
        <p class="detail-desc">${escapeHTML(product.description)}</p>

        <form id="detail-form">
          ${product.variants.map(v => `
            <div class="variant-group" data-variant-type="${escapeHTML(v.type)}">
              <span>${escapeHTML(v.type)}</span>
              <div class="variant-options">
                ${v.options.map((opt, i) => `<button type="button" class="${i === 0 ? 'is-active' : ''}" data-variant-option="${escapeHTML(opt)}">${escapeHTML(opt)}</button>`).join('')}
              </div>
            </div>`).join('')}

          <div class="qty-row">
            <span>Quantity</span>
            <div class="qty-stepper">
              <button type="button" id="qty-decrease" aria-label="Decrease quantity">\u2212</button>
              <input type="number" id="qty-input" value="1" min="1" max="20" aria-label="Quantity">
              <button type="button" id="qty-increase" aria-label="Increase quantity">+</button>
            </div>
          </div>

          <div class="detail-actions">
            <button type="button" id="detail-add-to-cart" class="btn btn-primary">Add to cart \u2014 ${formatNaira(product.price)}</button>
            <button type="button" class="btn btn-outline wishlist-btn-lg${wishlisted ? ' is-active' : ''}" data-wishlist-toggle="${product.id}" aria-pressed="${wishlisted}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4.5 5.6 4 8 3.7 10 5 12 7.3 14 5 16 3.7 18.4 4 22 4.5 23.5 8 22 11.7 19.5 16.4 12 21 12 21Z"/></svg>
              ${wishlisted ? 'Saved' : 'Save'}
            </button>
          </div>
        </form>

        <section class="reviews" aria-label="Customer reviews">
          <h2>Reviews</h2>
          ${product.reviews.map(r => `
            <div class="review">
              <div class="review-head"><span class="review-author">${escapeHTML(r.author)}</span><span>${escapeHTML(r.date)}</span></div>
              <p class="card-rating"><span class="stars" aria-hidden="true">${starString(r.rating)}</span></p>
              <p>${escapeHTML(r.comment)}</p>
            </div>`).join('')}
        </section>
      </div>
    </div>

    ${relatedProducts.length ? `
    <h2 class="related-heading">You may also like</h2>
    <div class="product-grid" id="related-grid"></div>` : ''}
  `;

  if (relatedProducts.length){
    const relatedGrid = qs('#related-grid');
    relatedProducts.forEach(p => relatedGrid.appendChild(buildProductCard(p)));
  }

  // Gallery interactions
  qsa('[data-gallery-index]', container).forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.galleryIndex);
      qs('#gallery-main-img').src = product.images[idx];
      qsa('[data-gallery-index]', container).forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-selected', String(b === btn)); });
    });
  });

  // Variant selection
  qsa('.variant-group', container).forEach(group => {
    const type = group.dataset.variantType;
    qsa('[data-variant-option]', group).forEach(btn => {
      btn.addEventListener('click', () => {
        selectedVariant[type] = btn.dataset.variantOption;
        qsa('[data-variant-option]', group).forEach(b => b.classList.toggle('is-active', b === btn));
      });
    });
  });

  // Quantity stepper
  const qtyInput = qs('#qty-input', container);
  qs('#qty-decrease', container).addEventListener('click', () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
  });
  qs('#qty-increase', container).addEventListener('click', () => {
    qtyInput.value = Math.min(20, Number(qtyInput.value) + 1);
  });
  qtyInput.addEventListener('change', () => {
    const val = Math.min(20, Math.max(1, Number(qtyInput.value) || 1));
    qtyInput.value = val;
  });

  // Add to cart
  qs('#detail-add-to-cart', container).addEventListener('click', () => {
    const qty = Number(qtyInput.value) || 1;
    addToCart(product.id, { ...selectedVariant }, qty);
    showToast(`${product.name} added to cart`);
  });

  // Wishlist toggle
  qsa('[data-wishlist-toggle]', container).forEach(btn => {
    btn.addEventListener('click', () => {
      toggleWishlist(btn.dataset.wishlistToggle);
      const active = isWishlisted(product.id);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
      btn.lastChild.textContent = active ? ' Saved' : ' Save';
    });
  });
}

/* =========================================================
   8. RENDER: CART DRAWER + BADGES
   ========================================================= */
function renderCartBadges(){
  const cartCount = cartItemCount();
  const wishCount = state.wishlist.length;
  const cartBadge = qs('#cart-count');
  const wishBadge = qs('#wishlist-count');
  cartBadge.textContent = String(cartCount);
  cartBadge.dataset.zero = String(cartCount === 0);
  wishBadge.textContent = String(wishCount);
  wishBadge.dataset.zero = String(wishCount === 0);
  qs('#cart-open-btn').setAttribute('aria-label', `Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`);
  qs('#wishlist-link').setAttribute('aria-label', `Wishlist, ${wishCount} item${wishCount === 1 ? '' : 's'}`);
}

function renderCartDrawer(){
  const container = qs('#cart-items');
  const lines = cartLines();
  container.innerHTML = '';

  if (lines.length === 0){
    container.innerHTML = `<div class="empty-state"><h2>Your cart is empty</h2><p>Browse the shop to add something you love.</p></div>`;
  }else{
    const frag = document.createDocumentFragment();
    lines.forEach(l => {
      const key = lineKey(l.productId, l.variant);
      const variantText = Object.entries(l.variant).map(([k,v]) => `${k}: ${v}`).join(' \u00b7 ');
      const row = document.createElement('div');
      row.className = 'cart-line';
      row.innerHTML = `
        <img src="${l.product.images[0]}" alt="" loading="lazy">
        <div class="cart-line-info">
          <p class="cart-line-name">${escapeHTML(l.product.name)}</p>
          <p class="cart-line-variant">${escapeHTML(variantText)}</p>
          <div class="cart-line-row">
            <div class="qty-stepper">
              <button type="button" data-cart-dec="${key}" aria-label="Decrease quantity">\u2212</button>
              <span aria-live="polite">${l.qty}</span>
              <button type="button" data-cart-inc="${key}" aria-label="Increase quantity">+</button>
            </div>
            <span class="cart-line-price">${formatNaira(l.product.price * l.qty)}</span>
          </div>
          <button type="button" class="remove-line-btn" data-cart-remove="${key}">Remove</button>
        </div>`;
      frag.appendChild(row);
    });
    container.appendChild(frag);
  }

  qsa('[data-cart-dec]', container).forEach(b => b.addEventListener('click', () => {
    const line = state.cart.find(l => lineKey(l.productId, l.variant) === b.dataset.cartDec);
    if (line) updateCartLineQty(b.dataset.cartDec, line.qty - 1);
  }));
  qsa('[data-cart-inc]', container).forEach(b => b.addEventListener('click', () => {
    const line = state.cart.find(l => lineKey(l.productId, l.variant) === b.dataset.cartInc);
    if (line) updateCartLineQty(b.dataset.cartInc, line.qty + 1);
  }));
  qsa('[data-cart-remove]', container).forEach(b => b.addEventListener('click', () => {
    removeCartLine(b.dataset.cartRemove);
    showToast('Removed from cart');
  }));

  renderTotals();
}

function renderTotals(){
  const subtotal = cartSubtotal();
  const discount = computeDiscount(subtotal);
  const delivery = computeDelivery(subtotal - discount);
  const total = Math.max(0, subtotal - discount) + delivery;

  qs('#cart-subtotal').textContent = formatNaira(subtotal);
  qs('#cart-discount').textContent = discount > 0 ? '\u2212' + formatNaira(discount) : formatNaira(0);
  qs('#cart-delivery').textContent = delivery === 0 ? 'Free' : formatNaira(delivery);
  qs('#cart-total').textContent = formatNaira(total);

  const checkoutBtn = qs('#checkout-btn');
  if (cartLines().length === 0){
    checkoutBtn.setAttribute('aria-disabled', 'true');
    checkoutBtn.style.pointerEvents = 'none';
    checkoutBtn.style.opacity = '.5';
  }else{
    checkoutBtn.removeAttribute('aria-disabled');
    checkoutBtn.style.pointerEvents = '';
    checkoutBtn.style.opacity = '';
  }
}

/* Cart drawer open/close with focus trap */
let lastFocusedBeforeDrawer = null;
function openCartDrawer(){
  const drawer = qs('#cart-drawer');
  const overlay = qs('#cart-overlay');
  lastFocusedBeforeDrawer = document.activeElement;
  overlay.hidden = false;
  drawer.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  qs('#cart-close-btn').focus();
  document.addEventListener('keydown', trapDrawerFocus);
}
function closeCartDrawer(){
  const drawer = qs('#cart-drawer');
  const overlay = qs('#cart-overlay');
  drawer.classList.remove('is-open');
  document.removeEventListener('keydown', trapDrawerFocus);
  setTimeout(() => { drawer.hidden = true; overlay.hidden = true; }, 250);
  if (lastFocusedBeforeDrawer) lastFocusedBeforeDrawer.focus();
}
function trapDrawerFocus(e){
  const drawer = qs('#cart-drawer');
  if (e.key === 'Escape'){ closeCartDrawer(); return; }
  if (e.key !== 'Tab') return;
  const focusables = qsa('button, input, select, a[href]', drawer).filter(el => !el.disabled);
  if (focusables.length === 0) return;
  const first = focusables[0], last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
}

/* =========================================================
   9. RENDER: CHECKOUT
   ========================================================= */
function renderCheckout(){
  const lines = cartLines();
  const container = qs('#checkout-items');
  container.innerHTML = lines.map(l => `
    <div class="summary-line">
      <img src="${l.product.images[0]}" alt="" loading="lazy">
      <div class="summary-line-name">
        <div>${escapeHTML(l.product.name)}</div>
        <div class="cart-line-variant">${escapeHTML(Object.entries(l.variant).map(([k,v]) => `${k}: ${v}`).join(' \u00b7 '))} \u00d7 ${l.qty}</div>
      </div>
      <span class="summary-line-price">${formatNaira(l.product.price * l.qty)}</span>
    </div>`).join('') || '<p>Your cart is empty.</p>';

  const subtotal = cartSubtotal();
  const discount = computeDiscount(subtotal);
  const delivery = computeDelivery(subtotal - discount);
  const total = Math.max(0, subtotal - discount) + delivery;
  qs('#co-subtotal').textContent = formatNaira(subtotal);
  qs('#co-discount').textContent = discount > 0 ? '\u2212' + formatNaira(discount) : formatNaira(0);
  qs('#co-delivery').textContent = delivery === 0 ? 'Free' : formatNaira(delivery);
  qs('#co-total').textContent = formatNaira(total);

  qs('#cf-state').value = state.deliveryState;
}

const VALIDATORS = {
  name: v => v.trim().length >= 2 || 'Please enter your full name.',
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address.',
  phone: v => /^(\+234|0)[789][01]\d{8}$/.test(v.replace(/\s/g, '')) || 'Enter a valid Nigerian phone number.',
  address: v => v.trim().length >= 5 || 'Please enter your street address.',
  city: v => v.trim().length >= 2 || 'Please enter your city.'
};

function validateCheckoutForm(form){
  let valid = true;
  Object.keys(VALIDATORS).forEach(field => {
    const input = form.elements[field];
    const result = VALIDATORS[field](input.value);
    const errorEl = qs('#err-' + field);
    input.dataset.touched = 'true';
    if (result === true){
      errorEl.textContent = '';
    }else{
      errorEl.textContent = result;
      valid = false;
    }
  });
  return valid;
}

function handleCheckoutSubmit(e){
  e.preventDefault();
  const form = e.target;
  if (cartLines().length === 0){
    showToast('Your cart is empty', 'error');
    return;
  }
  if (!validateCheckoutForm(form)) {
    showToast('Please fix the highlighted fields', 'error');
    return;
  }

  const subtotal = cartSubtotal();
  const discount = computeDiscount(subtotal);
  const delivery = computeDelivery(subtotal - discount);
  const total = Math.max(0, subtotal - discount) + delivery;

  const order = {
    id: 'JB-' + Date.now().toString(36).toUpperCase(),
    date: new Date().toISOString(),
    items: cartLines().map(l => ({ name: l.product.name, variant: l.variant, qty: l.qty, price: l.product.price })),
    customer: {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      address: form.elements.address.value.trim(),
      city: form.elements.city.value.trim(),
      state: form.elements.state.value
    },
    payment: form.elements.payment.value,
    subtotal, discount, delivery, total
  };

  saveJSON(STORAGE_KEYS.lastOrder, order);
  state.cart = [];
  state.couponCode = null;
  persistCart();
  renderCartBadges();
  renderCartDrawer();
  form.reset();
  location.hash = '#/confirmation';
}

/* =========================================================
   10. RENDER: CONFIRMATION
   ========================================================= */
function renderConfirmation(){
  const order = loadJSON(STORAGE_KEYS.lastOrder, null);
  const container = qs('#confirmation-content');
  if (!order){
    container.innerHTML = `<div class="empty-state"><h2>No recent order</h2><p>Place an order to see your confirmation here.</p></div>`;
    return;
  }
  const paymentLabels = { card:'Card payment', transfer:'Bank transfer', delivery:'Pay on delivery' };
  container.innerHTML = `
    <div class="confirmation-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
    <h1>Order placed!</h1>
    <p>Thanks, ${escapeHTML(order.customer.name)}. Your order <span class="order-number">${escapeHTML(order.id)}</span> has been received.</p>
    <div class="confirmation-box">
      ${order.items.map(it => `
        <div class="summary-line">
          <div class="summary-line-name">${escapeHTML(it.name)} \u00d7 ${it.qty}</div>
          <span class="summary-line-price">${formatNaira(it.price * it.qty)}</span>
        </div>`).join('')}
      <dl class="cart-totals">
        <div><dt>Subtotal</dt><dd>${formatNaira(order.subtotal)}</dd></div>
        <div><dt>Discount</dt><dd>${order.discount > 0 ? '\u2212' + formatNaira(order.discount) : formatNaira(0)}</dd></div>
        <div><dt>Delivery</dt><dd>${order.delivery === 0 ? 'Free' : formatNaira(order.delivery)}</dd></div>
        <div class="total"><dt>Total paid</dt><dd>${formatNaira(order.total)}</dd></div>
      </dl>
      <p>Delivering to ${escapeHTML(order.customer.address)}, ${escapeHTML(order.customer.city)}, ${escapeHTML(order.customer.state)}.</p>
      <p>Payment method: ${escapeHTML(paymentLabels[order.payment] || order.payment)}.</p>
    </div>
    <a href="#/shop" class="btn btn-primary">Continue shopping</a>
  `;
}

/* =========================================================
   11. ROUTER
   ========================================================= */
const VIEWS = ['shop','product','wishlist','checkout','confirmation'];

function parseRoute(){
  const hash = location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'product' && parts[1]) return { view:'product', param:parts[1] };
  if (VIEWS.includes(parts[0])) return { view:parts[0] };
  return { view:'shop' };
}

function route(){
  const { view, param } = parseRoute();
  VIEWS.forEach(v => { qs('#view-' + v).hidden = (v !== view); });
  window.scrollTo(0, 0);

  if (view === 'shop') loadShopWithSkeleton();
  else if (view === 'product') renderProductDetail(param);
  else if (view === 'wishlist') renderWishlistGrid();
  else if (view === 'checkout') renderCheckout();
  else if (view === 'confirmation') renderConfirmation();

  syncWishlistButtons();
}

/* =========================================================
   12. THEME TOGGLE
   ========================================================= */
function applyTheme(theme){
  document.documentElement.dataset.theme = theme;
  saveJSON(STORAGE_KEYS.theme, theme);
  const btn = qs('#theme-toggle');
  const isLight = theme === 'light';
  btn.setAttribute('aria-pressed', String(isLight));
  btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
}

/* =========================================================
   13. EVENT WIRING
   ========================================================= */
function initEvents(){
  // Theme
  const savedTheme = loadJSON(STORAGE_KEYS.theme, 'dark');
  applyTheme(savedTheme);
  qs('#theme-toggle').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  // Search (debounced)
  qs('#search-form').addEventListener('submit', e => e.preventDefault());
  qs('#search-input').addEventListener('input', debounce(e => {
    state.filters.search = e.target.value;
    renderShopGrid();
  }, 300));

  // Category chips
  qs('#category-nav').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.filters.category = chip.dataset.category;
    qsa('.chip').forEach(c => c.classList.toggle('is-active', c === chip));
    renderShopGrid();
  });

  // Sort
  qs('#sort-select').addEventListener('change', e => {
    state.filters.sort = e.target.value;
    renderShopGrid();
  });

  // Filter panel toggle
  qs('#filter-toggle-btn').addEventListener('click', () => {
    const panel = qs('#filter-panel');
    const expanded = !panel.hidden;
    panel.hidden = expanded;
    qs('#filter-toggle-btn').setAttribute('aria-expanded', String(!expanded));
  });
  qs('#price-min').addEventListener('input', debounce(e => {
    state.filters.minPrice = e.target.value === '' ? null : Number(e.target.value);
    renderShopGrid();
  }, 300));
  qs('#price-max').addEventListener('input', debounce(e => {
    state.filters.maxPrice = e.target.value === '' ? null : Number(e.target.value);
    renderShopGrid();
  }, 300));
  qs('#clear-filters-btn').addEventListener('click', clearFilters);

  // Grid delegation: quick add + wishlist toggle (shop + wishlist + related grids)
  document.addEventListener('click', e => {
    const addBtn = e.target.closest('[data-quick-add]');
    if (addBtn){
      const product = getProduct(addBtn.dataset.quickAdd);
      if (product){
        const defaultVariant = {};
        product.variants.forEach(v => { defaultVariant[v.type] = v.options[0]; });
        addToCart(product.id, defaultVariant, 1);
        showToast(`${product.name} added to cart`);
      }
      return;
    }
    const wishBtn = e.target.closest('[data-wishlist-toggle]');
    if (wishBtn && !wishBtn.closest('#product-detail-content')){
      toggleWishlist(wishBtn.dataset.wishlistToggle);
      return;
    }
  });

  // Cart drawer open/close
  qs('#cart-open-btn').addEventListener('click', openCartDrawer);
  qs('#cart-close-btn').addEventListener('click', closeCartDrawer);
  qs('#cart-overlay').addEventListener('click', closeCartDrawer);

  // Delivery state (cart drawer)
  qs('#delivery-state-select').value = state.deliveryState;
  qs('#delivery-state-select').addEventListener('change', e => {
    state.deliveryState = e.target.value;
    saveJSON(STORAGE_KEYS.delivery, state.deliveryState);
    renderTotals();
  });

  // Coupon
  qs('#apply-coupon-btn').addEventListener('click', () => {
    const codeInput = qs('#coupon-input');
    const code = codeInput.value.trim().toUpperCase();
    const msg = qs('#coupon-message');
    if (!code){ msg.textContent = 'Enter a coupon code.'; msg.className = 'coupon-message is-error'; return; }
    const coupon = COUPONS[code];
    if (!coupon){
      msg.textContent = 'Invalid coupon code.';
      msg.className = 'coupon-message is-error';
      state.couponCode = null;
    }else if (coupon.minSubtotal && cartSubtotal() < coupon.minSubtotal){
      msg.textContent = `This code needs a subtotal of ${formatNaira(coupon.minSubtotal)} or more.`;
      msg.className = 'coupon-message is-error';
      state.couponCode = null;
    }else{
      state.couponCode = code;
      msg.textContent = `Applied: ${coupon.label}`;
      msg.className = 'coupon-message is-success';
    }
    renderTotals();
  });

  // Checkout form
  qs('#checkout-form').addEventListener('submit', handleCheckoutSubmit);
  qsa('#checkout-form input, #checkout-form select').forEach(input => {
    input.addEventListener('blur', () => {
      if (VALIDATORS[input.name]){
        input.dataset.touched = 'true';
        const result = VALIDATORS[input.name](input.value);
        qs('#err-' + input.name).textContent = result === true ? '' : result;
      }
    });
  });
  const checkoutState = qs('#cf-state');
  if (checkoutState){
    checkoutState.addEventListener('change', e => {
      state.deliveryState = e.target.value;
      saveJSON(STORAGE_KEYS.delivery, state.deliveryState);
      renderCheckout();
    });
  }

  // Router
  window.addEventListener('hashchange', route);
}

/* =========================================================
   14. INIT
   ========================================================= */
function init(){
  initEvents();
  renderCartBadges();
  renderCartDrawer();
  route();
}

document.addEventListener('DOMContentLoaded', init);
