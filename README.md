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
node serve.mjs
# then open http://localhost:3000 in your browser
```

NPM (if you prefer):

```bash
npm start
```

Notes

- The logo and palette images are referenced from the project root (Snip20260603_35.png and Snip20260603_37.png). Keep them in the same folder as `index.html` or update the paths in `index.html` and `css/styles.css`.
- Colors are defined in `css/styles.css` using CSS variables. Adjust `--brand` for the primary color.

Next steps

- Swap placeholder copy or images for real product photos.
- Add product listing pages and an ecommerce/cart integration if you want to sell online.
