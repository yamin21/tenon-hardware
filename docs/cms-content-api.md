# CMS content API — frontend contract

Spec for the endpoints the ERP needs to expose so staff can edit policy
pages and landing-page copy without a developer touching HTML. This
document defines the contract; the actual CMS (admin UI, database,
these endpoints) is built in the ERP (`erp.tenon.mv`), a separate
codebase from this storefront repo.

## Status: per ERP team's reply (2026-06-23, relayed by Yamin)

The ERP team reported back that both endpoints below are built. The
points in this section are *as relayed*, not independently verified
against their actual running API — confirm directly with them before
treating anything here as final, especially before real content goes
live:

- **Auth:** both routes are public, no `x-api-key` required.
  `Cache-Control: public, max-age=60`.
- **Revision history:** one level of undo on policy pages (previous
  version restorable, not full history). No undo on homepage content.
- **`cookie-policy` will never be added** — dropped from their plans.
  It 404s permanently. [cookie-policy.html](../cookie-policy.html)
  stays fully hardcoded forever; do not wire it up to this API.
- **Scope, phase 1:** policy/info pages (Terms, Privacy, Refund,
  Shipping, About Us — **not** Cookie Policy, see above) and
  landing-page copy (hero slides, "why choose us" cards).
- **Publish latency:** instant. Staff hit save, the next page load
  reflects it — no rebuild, no deploy. This rules out baking CMS
  content into the static build; it has to be a runtime fetch.
- **Pattern:** identical to how this site already loads dynamic data
  — `js/api.js`'s `apiFetch()` helper (`{ data }` response envelope,
  `API_BASE = https://erp.tenon.mv/api`), minus the `x-api-key` header
  for these specific routes since they're public.

## Phase 1a: Policy pages

These are naturally "one rich-text blob per page" — low complexity,
build this first.

**Endpoint:** `GET /api/cms/pages/:slug`

**Slugs:** `terms-of-service`, `privacy-policy`, `refund-policy`,
`shipping-policy`, `about-us`. (`cookie-policy` is not and will never
be one of these — see "Status" above.)

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

**`why_choose_us.icon` — verified against our codebase:** should be
`check-circle`, `truck`, `message-circle`, `clipboard-list`. Per the
relayed reply, the ERP's first pass used `headset` instead — checked
directly against the actual SVG on the live homepage
([index.html:280](../index.html#L280), "Expert Support" card) and
it's a chat-bubble shape, not a headset. We need to send
`message-circle` back to them as the correction. Staff can't
hand-write SVG path data, so this must stay a constrained picker,
never arbitrary SVG/HTML — same approach already used for the
category icons (`CATEGORY_ICONS` in index.html).

**`theme` — verified against our codebase:** should be `tools`,
`plumbing`, `electrical`, `default`. Per the relayed reply, the ERP's
first pass used `hardware` and `paint`, neither of which exist — the
real values map to the `slide--tools`/`slide--plumbing`/
`slide--electrical` background classes in
[css/styles.css:672-674](../css/styles.css#L672), confirmed by
reading the file directly. `default` is new on our side: there was no
fallback background for an unrecognized theme (a `.carousel-slide`
with no modifier class rendered with no background at all, breaking
the white-text-on-dark-gradient design) — added `.slide--default` as
a neutral fallback gradient (verified by screenshot) so an "unknown
value → default" behavior on their end will actually render correctly
once we send them this enum.

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

## Reported as settled (per the relayed reply — not independently verified)

- Auth, caching, revision history, and `cookie-policy` scope, as
  stated in "Status" above.
- A slug with no content yet returns a normal 404, per ERP, as the
  expected/intended behavior during rollout.

## Still open

- Icon/theme enums above are corrections we still need to send back
  to ERP — they haven't seen `message-circle`/`default` yet. Don't
  treat these as agreed until they confirm.
- Nothing in this doc has been checked against the actual running
  endpoints from this side (no request has been made to
  `erp.tenon.mv/api/cms/*` yet). Worth doing before frontend
  integration work starts, rather than coding against the relayed
  description alone.
