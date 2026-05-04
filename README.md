D5i Store — repository layout and developer notes
===============================================

This repository hosts a small static website (DSi-styled) built with plain HTML, CSS and JavaScript. The layout has been modularized so assets are under `assets/` and HTML pages remain at the repository root for easy hosting (e.g. GitHub Pages).

Repository structure
- `index.html` — landing page (kept at repository root for direct hosting).
- `pages/` — informational pages: `about.html`, `products.html`, `software.html`.
- `products/` — individual product pages and templates: `product-1.html`, `product-2.html`, etc.
- `assets/`
  - `css/styles.css` — main stylesheet
  - `js/product-carousel.js` — carousel behavior and keyboard support
- `bin/` — original images and logos (product images and icons)

Why this structure
- Keeps pages at root for GitHub Pages and static hosting simplicity.
- Groups script and stylesheet in `assets/` making it clear where to extend or replace pieces.
- Images remain in `bin/` to avoid duplicating binary assets; they can be moved into `assets/img/` later if desired.

Local development
 Serve the repository from the root (Python simple server is sufficient):

```bash
python -m http.server 8000
# then open http://localhost:8000/
```
