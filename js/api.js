const API_BASE = 'https://erp.tenon.mv/api';
const API_KEY  = '834b2eac6c2e8fccf5e68b159c226af17afe1a5eaa4a1974c3e6e85018456086';

async function apiFetch(path) {
  const res = await fetch(API_BASE + path, {
    headers: { 'x-api-key': API_KEY }
  });
  if (!res.ok) throw new Error('API error: ' + res.status);
  const json = await res.json();
  return json.data;
}

async function getCategories() {
  return apiFetch('/categories');
}

async function getSubcategories(categorySlug) {
  return apiFetch('/categories/' + categorySlug + '/subcategories');
}

// ── Customer location (multi-warehouse stock routing) ────────
const LOCATION_KEY = 'tenon_location';

function getLocation() {
  try { return localStorage.getItem(LOCATION_KEY); } catch { return null; }
}

function setLocation(loc) {
  try { localStorage.setItem(LOCATION_KEY, loc); } catch {}
}

function withLocation(path) {
  const loc = getLocation();
  if (!loc) return path;
  return path + (path.includes('?') ? '&' : '?') + 'location=' + loc;
}

async function getProducts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(withLocation('/products' + (qs ? '?' + qs : '')));
}

async function getProduct(id) {
  return apiFetch(withLocation('/products/' + id));
}

async function createOrder(order) {
  const headers = { 'x-api-key': API_KEY, 'Content-Type': 'application/json' };

  const { data: { session } } = await sb.auth.getSession();
  if (session) headers['Authorization'] = 'Bearer ' + session.access_token;

  const res = await fetch(API_BASE + '/orders', {
    method: 'POST',
    headers,
    body: JSON.stringify(order)
  });
  if (!res.ok) throw new Error('Order error: ' + res.status);
  return (await res.json()).data;
}

async function getMyOrders() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(API_BASE + '/orders', {
    headers: { 'x-api-key': API_KEY, 'Authorization': 'Bearer ' + session.access_token }
  });
  if (!res.ok) throw new Error('Orders error: ' + res.status);
  return (await res.json()).data;
}

// ── Wishlist (requires sign-in) ────────────────────────────────
async function authHeader() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Not signed in');
  return { 'x-api-key': API_KEY, 'Authorization': 'Bearer ' + session.access_token };
}

async function getWishlist() {
  const res = await fetch(API_BASE + '/wishlist', { headers: await authHeader() });
  if (!res.ok) throw new Error('Wishlist error: ' + res.status);
  return (await res.json()).data;
}

async function addToWishlist(stockItemId) {
  const headers = await authHeader();
  headers['Content-Type'] = 'application/json';
  const res = await fetch(API_BASE + '/wishlist', {
    method: 'POST',
    headers,
    body: JSON.stringify({ stock_item_id: stockItemId })
  });
  if (!res.ok) throw new Error('Wishlist error: ' + res.status);
}

async function removeFromWishlist(stockItemId) {
  const res = await fetch(API_BASE + '/wishlist/' + encodeURIComponent(stockItemId), {
    method: 'DELETE',
    headers: await authHeader()
  });
  if (!res.ok) throw new Error('Wishlist error: ' + res.status);
}

// ── Image sizing ──────────────────────────────────────────────
// Shopify CDN resizes images on the fly via a `width` query param.
function shopifyImg(url, width) {
  if (!url || !url.includes('cdn.shopify.com')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('width', width);
    return u.toString();
  } catch {
    return url;
  }
}

// ── Category tree caching ────────────────────────────────────
// Subcategories + their children rarely change, so cache the whole
// tree in localStorage to avoid an N+1 fetch waterfall on every load.
const CATEGORY_TREE_TTL = 60 * 1000; // 1 minute

async function getCategoryTree(categorySlug) {
  const cacheKey = 'cat-tree-v2-' + categorySlug;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < CATEGORY_TREE_TTL) return data;
    }
  } catch {}

  const tree = (await apiFetch('/categories/' + categorySlug + '/tree'))
    .sort((a, b) => a.name.localeCompare(b.name));

  try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: tree })); } catch {}
  return tree;
}

// ── CMS-managed landing content (hero slides, etc.) ────────────
// No cache here, unlike the category tree above — staff expect a
// change to show up on the very next page load, not within a minute.
//
// image_url values from the CMS are relative paths (e.g.
// "cms/hero/169...jpg"), not full URLs. CMS_ASSET_BASE is an
// unconfirmed guess at the asset host — update this once ERP
// confirms where these are actually served from.
const CMS_ASSET_BASE = 'https://erp.tenon.mv';

function resolveCmsAsset(path) {
  if (!path) return '';
  return /^https?:\/\//.test(path) ? path : CMS_ASSET_BASE + '/' + path.replace(/^\/+/, '');
}

async function getLandingContent() {
  return apiFetch('/cms/landing');
}
