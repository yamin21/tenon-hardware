// ── Shared UI helpers (header, mobile menu, cart, toast, search, quick view) ──
// Pages provide: cartItems, renderCart(), and (for quick view) modalProduct/modalQty.

// ── Cart persistence ────────────────────────────────────────
const CART_STORAGE_KEY = 'tenon_cart';

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems)); } catch {}
}

// ── Location picker (Malé / Thinadhoo stock routing) ──────────
const LOCATIONS = {
  male:      { label: 'Malé',      region: 'Greater Malé Region' },
  thinadhoo: { label: 'Thinadhoo', region: 'Gaafu Dhaalu Atoll' }
};

function initLocationPicker() {
  if (!document.getElementById('locationModal')) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="modal-overlay" id="locationOverlay" onclick="closeLocationModal()"></div>
      <div class="location-modal" id="locationModal">
        <button class="modal-close" id="locationClose" onclick="closeLocationModal()" aria-label="Close" style="display:none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2>Choose your location</h2>
        <p>We'll show accurate stock and delivery options for your area.</p>
        <div class="location-options">
          <button class="location-option" onclick="chooseLocation('male')">
            <strong>Malé</strong>
            <span>Greater Malé Region</span>
          </button>
          <button class="location-option" onclick="chooseLocation('thinadhoo')">
            <strong>Thinadhoo</strong>
            <span>Gaafu Dhaalu Atoll</span>
          </button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
  }
  updateLocationPill();
  if (!getLocation()) openLocationModal(true);
}

function updateLocationPill() {
  const pill = document.getElementById('locationPill');
  if (!pill) return;
  const loc = getLocation();
  pill.querySelector('span').textContent = loc ? LOCATIONS[loc].label : 'Set location';
}

function openLocationModal(forced) {
  document.getElementById('locationOverlay').classList.add('modal-overlay--visible');
  document.getElementById('locationModal').classList.add('location-modal--open');
  document.getElementById('locationClose').style.display = forced ? 'none' : '';
  document.body.style.overflow = 'hidden';
}

function closeLocationModal() {
  if (!getLocation()) return;
  document.getElementById('locationOverlay').classList.remove('modal-overlay--visible');
  document.getElementById('locationModal').classList.remove('location-modal--open');
  document.body.style.overflow = '';
}

function chooseLocation(loc) {
  const changed = getLocation() !== loc;
  setLocation(loc);
  updateLocationPill();
  if (changed) location.reload();
  else closeLocationModal();
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('toast--visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('toast--visible'), 3000);
}

// ── Scroll effects (rAF-throttled to avoid layout thrashing) ──
// Reading scrollHeight/scrollY on every raw scroll event forces a
// synchronous layout recalc dozens of times per second. Batch updates
// to once per animation frame instead.
function initScrollEffects({ threshold = 10, scrollTopBtn = false } = {}) {
  const header = document.getElementById('siteHeader');
  const btn = scrollTopBtn ? document.getElementById('scrollTopBtn') : null;
  let ticking = false;

  function update() {
    header.classList.toggle('site-header--scrolled', window.scrollY > threshold);
    if (btn) {
      const atBottom = (window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 40;
      btn.classList.toggle('scroll-top-btn--visible', atBottom);
    }
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
}

function onScrollThrottled(el, handler) {
  let ticking = false;
  el.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => { handler(); ticking = false; });
    }
  }, { passive: true });
}

// ── Category nav arrows ───────────────────────────────────
function scrollCatNav(dir) {
  document.getElementById('catNavInner').scrollBy({ left: dir * 240, behavior: 'smooth' });
}

function updateCatNavArrows() {
  const el = document.getElementById('catNavInner');
  const atStart = el.scrollLeft <= 4;
  const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
  document.getElementById('catNavLeft').classList.toggle('cat-nav-arrow--visible', !atStart);
  document.getElementById('catNavRight').classList.toggle('cat-nav-arrow--visible', !atEnd);
}

// ── Mobile menu ────────────────────────────────────────────
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const overlay = document.getElementById('mobileOverlay');
  const btn = document.getElementById('hamburger');
  const open = menu.classList.toggle('mobile-menu--open');
  overlay.classList.toggle('mobile-overlay--visible', open);
  btn.classList.toggle('hamburger--open', open);
  btn.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}

// ── Mobile nav: accordion item showing child categories ──
function buildMobileNavItem(sub, kids) {
  const item = document.createElement('div');
  item.className = 'mobile-nav-cat';

  const row = document.createElement('div');
  row.className = 'mobile-nav-cat-row';

  const a = document.createElement('a');
  a.href = 'category.html?sub=' + sub.slug;
  a.textContent = sub.name;
  row.appendChild(a);

  if (kids && kids.length) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mobile-nav-toggle';
    toggle.setAttribute('aria-label', 'Toggle ' + sub.name + ' subcategories');
    toggle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    const children = document.createElement('div');
    children.className = 'mobile-nav-children';
    children.innerHTML = kids.map(c => `<a href="category.html?sub=${sub.slug}&child=${c.slug}">${c.name}</a>`).join('');

    toggle.addEventListener('click', () => {
      const open = children.classList.toggle('mobile-nav-children--open');
      toggle.classList.toggle('mobile-nav-toggle--open', open);
    });

    row.appendChild(toggle);
    item.appendChild(row);
    item.appendChild(children);
  } else {
    item.appendChild(row);
  }
  return item;
}

// ── Cart sidebar ───────────────────────────────────────────
function toggleCart() {
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  const open = sidebar.classList.toggle('cart-sidebar--open');
  overlay.classList.toggle('cart-overlay--visible', open);
  sidebar.setAttribute('aria-hidden', String(!open));
  document.body.style.overflow = open ? 'hidden' : '';
}

function addToCart(name, price, image) {
  const existing = cartItems.find(i => i.name === name);
  if (existing) existing.qty++;
  else cartItems.push({ name, price, image, qty: 1 });
  saveCart();
  renderCart();
  if (!document.getElementById('cartSidebar').classList.contains('cart-sidebar--open')) toggleCart();
}

// ── Search suggestions ─────────────────────────────────────
function showSearchSuggestions() {
  document.getElementById('searchSuggestions').classList.add('search-suggestions--visible');
}

function hideSearchSuggestions() {
  setTimeout(() => document.getElementById('searchSuggestions').classList.remove('search-suggestions--visible'), 150);
}

function handleSearchInput(val) {
  if (val.length > 0) showSearchSuggestions();
  else hideSearchSuggestions();
}

function setSearch(el) {
  document.getElementById('searchInput').value = el.textContent.trim();
  hideSearchSuggestions();
  doSearch();
}

// ── Quick view modal ────────────────────────────────────────
function openQuickView(title, brand, price, oldPrice, imgUrl) {
  modalProduct = { title, brand, price, oldPrice, image: imgUrl };
  modalQty = 1;
  document.getElementById('modalBrand').textContent = brand;
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalQty').textContent = 1;
  const imgEl = document.getElementById('modalImg');
  imgEl.className = 'modal-img';
  imgEl.innerHTML = imgUrl ? `<img src="${imgUrl}" alt="${title}" style="width:100%;height:100%;object-fit:contain;padding:16px;">` : '';
  const pr = document.getElementById('modalPriceRow');
  pr.innerHTML = `<strong class="modal-price">${price != null ? 'MVR ' + Number(price).toLocaleString() : 'Contact for price'}</strong>${oldPrice ? `<span class="price-old">MVR ${Number(oldPrice).toLocaleString()}</span>` : ''}`;
  document.getElementById('quickViewModal').classList.add('quick-view-modal--open');
  document.getElementById('modalOverlay').classList.add('modal-overlay--visible');
  document.body.style.overflow = 'hidden';
}

function closeQuickView() {
  document.getElementById('quickViewModal').classList.remove('quick-view-modal--open');
  document.getElementById('modalOverlay').classList.remove('modal-overlay--visible');
  document.body.style.overflow = '';
}

function addToCartFromModal() {
  for (let i = 0; i < modalQty; i++) addToCart(modalProduct.title, modalProduct.price, modalProduct.image);
  closeQuickView();
}
