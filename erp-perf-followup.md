# ERP /products performance — follow-up

The `003_web_api_indexes.sql` migration has been run successfully. Result:
`GET /api/products?category=hardware` improved from ~1.9-2s to ~1.1-1.6s —
better, but still the slowest endpoint by far (vs. ~0.2s for the new `/tree`
endpoint, which is now cached).

Two further improvements to consider:

## 1. Add short-TTL caching to /products

Unlike `/categories/:slug/subcategories` and `/categories/:slug/tree`
(now `Cache-Control: public, max-age=3600`), `/products` currently returns
`Cache-Control: public, max-age=0, must-revalidate` — effectively no caching.

Stock counts don't need to be real-time on a catalog browse page. Adding a
short TTL, e.g.:

```
Cache-Control: public, max-age=60
```

(or even 30s) would let browsers/CDN cache the response and remove most of
this 1-1.6s cost on repeat views within that window, while keeping stock
data reasonably fresh.

## 2. Profile the /products query further

1.1-1.6s still seems high even with the new indexes from migration 003. Worth
running `EXPLAIN ANALYZE` on the actual query behind `/api/products?category=hardware`
to confirm:
- the new indexes (`idx_stock_items_category`, etc.) are actually being used
  (not skipped due to query shape, e.g. functions on the indexed column, or
  the planner preferring a seq scan on a small table)
- whether the per-item `stock_quantities` aggregation (sum of stock across
  locations) is being done efficiently — e.g. via a single grouped join vs.
  N+1 subqueries per product
