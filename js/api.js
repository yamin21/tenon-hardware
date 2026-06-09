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
