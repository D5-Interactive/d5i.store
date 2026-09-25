# D5i.store

Static site for D5-Interactive. No build step — plain HTML, Bootstrap 5.3.3 (CDN), vanilla JS.
Deployed straight from `main` via GitHub Pages at <https://d5i.store>.

---

## Layout

```
index.html                  home
src/pages/                  STAFF / SERVICES / PRODUCTS
src/staff/<First_Last>/     one folder per member
    <First_Last>.md         the member file (name, position, teams, github)
    blogs/ products/ research/   optional, each with a manifest.json
    bin/                    optional media (headshot lives here)
src/products/ src/services/ same pattern
src/css/style.css           site styling
src/css/bot.css             D5-DOG widget
src/js/load.js              markdown loader
src/js/bot.js               D5-DOG behaviour
src/bin/                    favicon, D5-DOG sprite + bark
```

## Adding content

Copy the `_template` from `services/`, `products/`, or `staff/`. Name the folder and the
`.md` file the same thing. To add a staff member:

- Copy `src/staff/_template` to `src/staff/First_Last`
- Rename the internal `.md` to `First_Last.md`
- Add the folder + filename to `src/staff/manifest.json` — **the manifest drives the page;
  a folder that isn't listed never appears, and a listed folder that doesn't exist is
  silently skipped**
- Headshots go in `src/staff/First_Last/bin/` and are referenced from the `.md` as
  `![Name](bin/headshot.jpg)`. Paths are resolved relative to the `.md`, not the page.
  **Members with no headshot fall back to a generated initials avatar automatically**,
  so nothing is required.
- Recognised fields: `**Position:**`, `**Nickname:**`, `**Teams:**`, `**Skills / Focus:**`,
  `**University:**`. `Position` is shown on the card; if absent, `Teams` is used instead.
  `Teams` renders as chips and is comma-separated.

## D5-DOG

The help assistant in the bottom-right corner. Click the dog for the bark.

To change the contact address, reply text, or FAQ answers, edit the `CONFIG` block at the
top of `src/js/bot.js` — that plus the `RULES` array is the whole thing. Contact and
suggestion are plain `mailto:` links, so there is no backend and no third-party form.

Each page sets its own base path before loading the script, because pages sit at two
different depths:

```html
<script>window.D5I_BOT_BASE = '../../';</script>   <!-- src/pages/* -->
<script>window.D5I_BOT_BASE = '';</script>          <!-- index.html     -->
<script src="../js/bot.js"></script>
```

## Private data

`src/staff/_roster.local.json` holds Discord handles and is **gitignored** — the whole repo
is served as the public site, so anything committed here is public. Discord handles are
deliberately not published on the site. To restore them later, add a `**Discord:**` field
to a member's `.md`.
