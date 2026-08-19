# ERP API performance improvements — handoff notes

Context: the Tenon Hardware frontend (static site, `erp.tenon.mv/api` consumer)
just had client-side perf fixes applied (image resizing, response caching,
non-blocking fonts). The remaining bottlenecks are on the ERP/API side. Please
address the following, in priority order.

## 1. Add a combined category tree endpoint

Currently the frontend calls:
- `GET /api/categories/hardware/subcategories` (~1.4s)
- then, for each subcategory returned, `GET /api/categories/hardware/subcategories/{slug}/children` (~1-1.5s each, ~12 calls)

This is an N+1 waterfall. Add a single endpoint, e.g.:

```
GET /api/categories/:slug/tree
```

that returns subcategories with their `children` arrays nested in one
response. This removes the need for the frontend to make 12+ sequential/
parallel follow-up requests and fixes first-visit (cache-miss) load time,
not just repeat visits.

## 2. Add HTTP caching headers to category endpoints

`/api/categories`, `/api/categories/:slug/subcategories`, and the new
`/tree` endpoint return data that rarely changes. Add:

- `Cache-Control: public, max-age=3600` (or similar TTL)
- `ETag` / `Last-Modified` support for conditional requests (304s)

This lets browsers and any CDN in front of the API cache responses, reducing
load even on first visit / across users, not just per-browser localStorage.

## 3. Investigate slow response times on /products and /subcategories

- `GET /api/products?category=hardware` currently takes ~1.9s
- `GET /api/categories/hardware/subcategories` currently takes ~1.4s

These are slow for what should be small JSON payloads. Profile the DB
queries behind these endpoints — likely missing indexes, N+1 queries at the
DB layer, or unnecessary joins/eager-loading of fields the frontend doesn't
use. Target sub-200ms for these.

## 4. Enable response compression

Confirm gzip/brotli compression is enabled for all `/api/*` JSON responses
if not already — quick win for payload size on slower connections.

## 5. (Optional) Pre-sized image URLs

Product image URLs returned in `/products` responses point to
`cdn.shopify.com` full-size originals (~858KB). The frontend now appends a
`width` param to resize via Shopify's CDN, but if convenient, consider
returning multiple size variants (thumbnail/medium/full) directly from the
API so the frontend doesn't need to construct these URLs itself.
