# D5IO

Static site. Brutalist. Hosted on GitHub Pages.

---

## Adding content

All three dynamic sections work the same way: drop a `.md` file in the folder, add its filename to `manifest.json`.

### Staff — `src/staff/`

```md
# Full Name
**Role:** Title
**Email:** email@domain.com

One paragraph bio. Keep it short.

- Skill one
- Skill two
```

Update `src/staff/manifest.json`:
```json
["alice.md", "bob.md", "newperson.md"]
```

### Services — `src/services/`

Same pattern. Add `.md`, update `manifest.json`.

### Products — `src/products/`

Same pattern. Add `.md`, update `manifest.json`.

---

## Editing the home page

Open `index.html`. The hero section and About blurb are plain HTML — edit inline.

## Styles

One file: `src/css/style.css`. No build step, no preprocessor.

## JavaScript

One file: `src/js/load.js`. Contains a ~30-line markdown parser and the card loader. Touch it only if you need to extend the MD syntax.

---

## Deploy

Push to GitHub. Enable Pages in repo settings → set source to main branch root. Add your domain to `CNAME`.

GitHub Pages serves static files. The JS `fetch()` calls work because the `.md` files and `manifest.json` are just static assets.

---

## Structure

```
D5io/
  index.html          ← home page
  CNAME               ← custom domain
  license
  src/
    css/style.css     ← all styles (one file)
    js/load.js        ← md parser + card loader
    pages/
      STAFF.html
      SERVICES.html
      PRODUCTS.html
    staff/
      manifest.json   ← ["alice.md", "bob.md"]
      alice.md
      bob.md
    services/
      manifest.json
      *.md
    products/
      manifest.json
      *.md
    media/
      img/
      sfx/
```
