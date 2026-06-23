# CMS for storefront content — build request for ERP team

**From:** Storefront team (tenon-hardware repo)
**To:** ERP team (erp.tenon.mv)
**What we need:** A handful of read endpoints in the ERP API so staff
can edit website copy without filing a dev ticket every time.

## Background

The storefront (tenon.mv) is a static HTML site. Right now, all
copy — policy pages (Terms, Privacy, Refund, Shipping, Cookie Policy,
About Us) and the homepage's hero/marketing copy — is hardcoded
directly into the HTML. The only thing staff can currently update
themselves is product/inventory data, because that already goes
through the ERP. Any text change to a policy page or the homepage
requires a developer to edit and redeploy.

We want to extend the existing ERP API with a small CMS so staff can
edit this content the same way they manage products today.

## What we need from you

Two new read endpoints on the existing ERP API (`erp.tenon.mv/api`),
following the same conventions the storefront already uses for
products/categories: `x-api-key` header auth, JSON responses wrapped
in `{ "data": ... }`.

We're not asking you to build everything at once — **start with Phase
1**, since it's the simpler data model. Phase 2 can follow once that's
working.

---

### Phase 1: Policy pages

One blob of rich text per page. This is the simpler case — basically a
slug, a title, and an HTML body, editable by staff in a rich-text
field.

**`GET /api/cms/pages/:slug`**

Slugs we need, mapping 1:1 to existing pages: `terms-of-service`,
`privacy-policy`, `refund-policy`, `shipping-policy`, `cookie-policy`,
`about-us`.

Response:
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

Requirements on your side:
- `body_html` must be **sanitized server-side** before it's returned.
  The storefront will inject it directly into the page via
  `innerHTML` with no further sanitization on our end — whatever you
  send is what gets rendered, so any unsafe markup needs to be
  stripped before it leaves the API.
- A 404 for a slug that doesn't exist yet should be a normal,
  unsurprising response — we expect that during rollout, while only
  some pages have been migrated into the CMS.

Note: `title` here is just the page's on-screen heading. It is **not**
the same as the page's `<title>` tag, meta description, or social
sharing tags — those stay hardcoded on our side since they're
SEO/technical concerns, not editorial content staff need to touch.

### Phase 2: Homepage sections

More structured — this isn't free text, it's discrete fields per
content block. Build this after Phase 1 is live.

**`GET /api/cms/landing`**

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

Two specific asks for how staff author this:

1. **`why_choose_us.icon` should be a constrained picker, not free
   text.** Staff can't hand-author SVG icon code. Give them a fixed
   list to choose from (e.g. `check-circle`, `truck`, `headset`,
   `clipboard-list`) — the storefront already maps a fixed icon set
   like this elsewhere on the site, so we'll do the same mapping on
   our end. Please don't accept arbitrary SVG/HTML in this field.

2. **`theme` should be constrained too** — it controls which
   background style a hero slide gets. If a value comes through that
   we don't recognize, we'll fall back to a default rather than
   erroring, but a fixed enum on your side (or just letting us define
   the allowed list) avoids drift.

Note: the hero is pure marketing copy, no product data — the homepage
today happens to also show a decorative "featured product" mini-card
on each slide, but that's purely cosmetic (a CSS-drawn shape, not a
real photo, and the Add to Cart button isn't wired to a real catalog
item). It's not part of what we're asking you to build; we're dropping
it when we move the homepage onto this CMS.

### Phase 3 (new ask): brand logos

The homepage has a "Trusted brands we carry" marquee — today it's 10
hardcoded text placeholders (Metabo, Bosch, DeWalt, etc.), no real
logos. We'd like this added to `GET /api/cms/landing` as a new field:

```json
"brands": [
  { "name": "Metabo", "logo_url": "https://.../cms/brands/metabo.png" }
]
```

Same conventions as hero/category images — array order is display
order, `logo_url` should be a full resolvable URL (like you already
do for hero/category images, not the relative-path version from
earlier). We don't have real logo files yet on our side, so there's
no urgency — our frontend already falls back to the current hardcoded
placeholders when this field is empty or missing, so nothing breaks
either way in the meantime.

---

## Open questions for you to weigh in on

1. **Auth model:** should these endpoints require the same
   `x-api-key` as the rest of `/api`, or can they be public and
   CDN-cacheable? This content isn't user-specific or sensitive, so
   public + cacheable is probably better for performance, but we
   wanted your input before treating it differently from the rest of
   the API.
2. **Revision history / undo:** does the admin UI need versioning or
   rollback for edits? This matters more for legal text (Terms,
   Privacy) than marketing copy — worth deciding before staff start
   editing real policy content through it.
3. **Timeline:** any constraints on your side for fitting Phase 1
   into a sprint? Happy to clarify anything in this doc on a call if
   useful.

## How we'll consume this (for context, not action needed from you)

On our side: each page will fetch its content on load and render it
in, the same pattern the storefront already uses for product/category
data. If the fetch fails (your API is down, or a slug isn't migrated
yet), the page keeps showing its current hardcoded fallback rather
than breaking — so there's no hard dependency risk from your endpoints
having downtime. We'll also cache responses for ~60 seconds client-side
to avoid hitting your API on every page view, the same way we already
do for category data — so "instant" publish in practice means staff
see their change within about a minute, not on every single request.
