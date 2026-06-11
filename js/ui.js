// ── Shared UI helpers (header, mobile menu, cart, toast, search, quick view) ──
// Pages provide: cartItems, renderCart(), and (for quick view) modalProduct/modalQty.

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

function addToCart(name, price) {
  const existing = cartItems.find(i => i.name === name);
  if (existing) existing.qty++;
  else cartItems.push({ name, price, qty: 1 });
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
  modalProduct = { title, brand, price, oldPrice };
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
  for (let i = 0; i < modalQty; i++) addToCart(modalProduct.title, modalProduct.price);
  closeQuickView();
}
