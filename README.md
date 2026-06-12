Tenon Hardware — Landing Page

Quick start

Open the landing page locally by one of the following methods:

1) Open `index.html` directly in your browser (works for most modern browsers).

2) Serve with a simple static server (recommended):

Python 3 (from project root):

```bash
python3 -m http.server 3000
# then open http://localhost:3000 in your browser
```

Node (from project root):

```bash
node scripts/serve.mjs
# then open http://localhost:3000 in your browser
```

NPM (if you prefer):

```bash
npm start
```

Notes

- Shared logo/favicon SVGs live in `assets/`. Dev-only helper scripts (local server, Puppeteer screenshots) live in `scripts/`.
- Colors are defined in `css/styles.css` using CSS variables. Adjust `--brand` for the primary color.

Next steps

- Swap placeholder copy or images for real product photos.
- Add product listing pages and an ecommerce/cart integration if you want to sell online.
