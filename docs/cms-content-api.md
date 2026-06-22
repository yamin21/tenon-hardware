# CMS content API — frontend contract

Spec for the endpoints the ERP needs to expose so staff can edit policy
pages and landing-page copy without a developer touching HTML. This
document defines the contract; the actual CMS (admin UI, database,
these endpoints) is built in the ERP (`erp.tenon.mv`), a separate
codebase from this storefront repo.

## Decisions already made

- **Scope, phase 1:** policy/info pages (Terms, Privacy, Refund,
  Shipping, Cookie Policy, About Us) and landing-page copy (hero
  slides, "why choose us" cards).
- **Publish latency:** instant. Staff hit save, the next page load
  reflects it — no rebuild, no deploy. This rules out baking CMS
  content into the static build; it has to be a runtime fetch.
- **Pattern:** identical to how this site already loads dynamic data
  — `js/api.js`'s `apiFetch()` helper (`x-api-key` header, `{ data }`
  response envelope, `API_BASE = https://erp.tenon.mv/api`). The CMS
  endpoints should follow the same conventions so the frontend code
  reuses the existing fetch plumbing.

## Phase 1a: Policy pages

These are naturally "one rich-text blob per page" — low complexity,
build this first.

**Endpoint:** `GET /api/cms/pages/:slug`

**Slugs:** `terms-of-service`, `privacy-policy`, `refund-policy`,
`shipping-policy`, `cookie-policy`, `about-us`

**Response:**
```json
{
  "data": {
    "slug": "about-us",
    "title": "About Us",
    "body_html": "<h2>Who We Are</h2><p>...</p>",
    "updated_at": "2026-06-20T09:00:00Z"
  }
}
```

- `body_html` is sanitized server-side (staff write rich text in the
  ERP admin; the ERP is responsible for stripping anything unsafe
  before it ever reaches the storefront — this frontend will inject
  it via `innerHTML` with no further sanitization).
- `title` becomes the page's `<h1>`. It is **not** the same as the
  `<title>`/meta description tags — those stay hardcoded per page
  (see "What stays static" below).

**Frontend integration:** each policy page's `<main><section
class="policy-page">...</section></main>` content (currently
hardcoded HTML, e.g. [about-us.html](../about-us.html)) gets replaced
with a fetch-and-render on load, the same pattern `getCategoryTree()`
already uses in [js/api.js](../js/api.js):

```js
async function loadPageContent(slug) {
  const el = document.querySelector('.policy-content');
  try {
    const { title, body_html } = await apiFetch(`/cms/pages/${slug}`);
    document.querySelector('h1').textContent = title;
    el.innerHTML = body_html;
  } catch {
    // Keep the hardcoded fallback already in the HTML — see below.
  }
}
```

**Fallback behavior:** on fetch failure (ERP down, slug not yet
created), the page should keep showing the current hardcoded content
rather than an empty/broken page. Practically: don't delete the
existing hardcoded HTML when wiring this up — only overwrite it after
a successful fetch. This also means policy pages stay fully readable
with JS disabled or before the CMS exists, which matters since these
are exactly the pages with full SEO investment (meta tags, schema.org,
Lighthouse-checked).

## Phase 1b: Landing page sections

More complex — these aren't single blobs, they're structured content
blocks. Build after 1a is working.

**Endpoint:** `GET /api/cms/landing`

**Response:**
```json
{
  "data": {
    "hero_slides": [
      {
        "tag": "New 2026 Collection",
        "title": "Professional Power Tools for Serious Builders",
        "body": "Industrial-grade equipment trusted by contractors across the Maldives. Built to last, priced right.",
        "cta_primary": { "label": "Shop Power Tools", "href": "category.html" },
        "cta_secondary": { "label": "View All Products", "href": "category.html" },
        "theme": "tools"
      }
    ],
    "why_choose_us": [
      {
        "icon": "check-circle",
        "title": "Curated Selection",
        "body": "Every product is hand-picked from trusted global brands. No knockoffs, no compromises — just proven quality."
      }
    ],
    "updated_at": "2026-06-20T09:00:00Z"
  }
}
```

**Hero slides are pure marketing copy — no product card.** The current
homepage hardcodes a decorative "featured product" mini-card on each
slide (badge, image, brand, price, an Add to Cart button — see
[index.html:104-120](../index.html#L104-L120)). It's purely cosmetic
today: the image is a CSS shape, not a photo, and the Add to Cart
button passes a fabricated string as the cart line's `id`
(`addToCart('Metabo SB 18 LT BL Drill', ...)`), not a real product ID
— so clicking it actually adds an unfulfillable fake item to the
cart. The CMS-driven hero model drops this concept entirely; slides
are just `tag`/`title`/`body`/CTAs/`theme`. Whoever eventually
reworks the live homepage to consume this API should remove that
card rather than carry the bug forward.

**On the `why_choose_us.icon` field:** staff authoring in a CMS admin
can't hand-write SVG path data. Recommend a constrained icon picker —
a fixed named set (e.g. `check-circle`, `truck`, `headset`,
`clipboard-list`) that the frontend maps to a fixed SVG, the same
approach already used for [the category icons](../index.html) (see
`CATEGORY_ICONS` in index.html). The ERP should NOT accept arbitrary
SVG/HTML in this field.

**`theme` field:** maps to the existing `slide--tools` /
`slide--plumbing` / `slide--electrical` background classes in
[css/styles.css](../css/styles.css). Either constrain it to a fixed
enum matching existing themes, or treat new values as "use a default
theme" rather than erroring.

## What stays static (not CMS-driven)

- `<title>`, meta description, canonical URL, OG/Twitter tags,
  schema.org JSON-LD — these rarely change and are technical/SEO
  concerns, not editorial content. Changing them needs a developer.
- Header, footer, navigation — structural chrome, already deduplicated
  into [partials/](../partials/). Unrelated to this CMS effort.

## Caching

This site already caches `getCategoryTree()` in `localStorage` for 60
seconds ([js/api.js](../js/api.js), `CATEGORY_TREE_TTL`) to avoid
re-fetching on every page load. Apply the same pattern here — these
endpoints are exactly the kind of "changes rarely, fetched on every
page load" data that pattern exists for. A short TTL (60s) still
satisfies "instant" for staff (next page load within a minute reflects
the change) without hitting the ERP API on every single navigation.

## Open questions for whoever builds the ERP side

- Auth: do these endpoints need the same `x-api-key` as the rest of
  `/api`, or should CMS content be publicly cacheable (e.g. behind a
  CDN) since it's not user-specific? Public + CDN-cacheable is
  probably right for SEO/perf, but confirm before exposing it
  differently from the rest of the API.
- What happens on a 404 for a slug that's never been created in the
  CMS yet (e.g. mid-rollout, only some policy pages migrated)? The
  frontend fallback behavior above assumes a 404 is a normal,
  expected case, not an error to alert on.
- Versioning/rollback: does the ERP admin need an "undo" or revision
  history for edits? Out of scope for this frontend contract, but
  worth deciding before staff start using it for real legal text.
