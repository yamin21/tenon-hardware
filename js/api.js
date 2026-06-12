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

async function getProducts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch('/products' + (qs ? '?' + qs : ''));
}

async function getProduct(id) {
  return apiFetch('/products/' + id);
}

async function createOrder(order) {
  const res = await fetch(API_BASE + '/orders', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
  if (!res.ok) throw new Error('Order error: ' + res.status);
  return (await res.json()).data;
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
const CATEGORY_TREE_TTL = 60 * 60 * 1000; // 1 hour

async function getCategoryTree(categorySlug) {
  const cacheKey = 'cat-tree-' + categorySlug;
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
