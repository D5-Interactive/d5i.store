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

## Performance notes

The staff grid paints **twice**. The first paint happens off the manifest alone,
turning folder names into display names, so names are on screen in about 150 ms
without waiting for a single markdown file. The 24 member files then fetch in
parallel and repaint with teams, roles, and headshots. Fetching them one at a time
instead cost roughly 3.5 s of pure latency, which is what the "loading…" used to
feel like. Product and service cards use the same parallel fetch.

The heaviest asset on the page is the Bootstrap CSS/JS from the CDN (~486 KB
transferred), not the site's own content.

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
  so nothing is required — but do not reference a headshot that does not exist, or
  every visit to the staff page logs a 404.
- Recognised fields: `**Position:**`, `**Nickname:**`, `**Teams:**`, `**Skills / Focus:**`,
  `**University:**`. `Position` is shown on the card; if absent, `Teams` is used instead.
  `Teams` renders as chips and is comma-separated.

## StarSec signup

`src/pages/STARSEC-SIGNUP.html` is the competition signup for StarSec at Rowdy
CyberCon (November 6-7, 2026: team training on the Friday, competition on the
Saturday, both at SP1 on the UTSA Downtown Campus). It is a per-person form: each entrant signs up once
and picks Captain or Operator.

**To add, edit or remove a question, change only the `FIELDS` array at the top of
`src/js/signup.js`.** The page, the labels, the validation and the submitted email
are all generated from it. Each entry supports `key`, `label`, `type`
(`text` / `email` / `tel` / `url` / `select` / `textarea`), `required`, `options`,
`placeholder`, `hint`, `pattern` (RegExp source) and `width` (`half` / `full`).

Submissions go to `CONFIG.email` in `src/js/signup.js`. Out of the box it opens a
pre-filled email via `mailto:`. To collect responses in a database instead, set
`CONFIG.endpoint` to a Formspree or Web3Forms URL and the form will `POST` to it
instead — no other change needed. There is still a "Copy instead" button, which is
the fallback for anyone whose device has no mail client configured.

UTSA addresses are validated to end in `@utsa.edu`; set `CONFIG.emailDomain` to
`null` to accept any domain.

## D5-DOG "where is X?" lookup

Ask D5-DOG "where is walker caskey", "where is the debug tool", or "who is on
the hardware team" and it resolves against `src/data/search-index.json`, which
holds one record per staff member, page, product, service, blog post and paper.

`src/js/tern.js` runs three stages, in order, because they fail differently:

1. **Lexical** — exact names, name fragments, aliases, team names. Instant,
   offline, deterministic. Answers the large majority of real queries.
2. **Edit distance** — typos, up to 2 characters. Also free.
3. **Semantic** — [Ternlight](https://github.com/soycaporal/ternlight) mini
   (`@ternlight/mini`, MIT), vendored in `src/bin/ternlight/`. 4.8 MB gzipped,
   384-dim, L2-normalized, ~1.7 ms per embedding on CPU.

**The 4.8 MB model is only downloaded if stages 1 and 2 come up empty.** Nothing
extra is fetched on page load, and opening the panel does not trigger it either.

### Why the model is a fallback and not the main path

Measured, not assumed. Given only the model, "where is walker caskey" ranked
Walker's *blog post* above his *staff profile*; a naive lexical+semantic blend
scored **9/15** where lexical alone scored **11/15**, because semantic kept
overturning confident name matches. The model also cannot handle typos here:
"where is walkr casky" put Walker Caskey 4th at cosine 0.163, while pure
gibberish reached 0.266 — a correct answer sitting *below* the noise floor, so
no threshold separates them. Edit distance fixes that for free.

The semantic stage is therefore only trusted when it is clearly ahead:
`threshold` 0.29 and `minMargin` 0.045, both set from measurements. Across 12
paraphrase probes, correct answers scored a margin of 0.060–0.247 and wrong
ones 0.003–0.027. Anything thinner falls through to the human handoff rather
than showing a shaky answer as fact.

If the wasm fails to load — offline, blocked, old browser — stages 1 and 2 keep
working and the bot simply loses fuzzy matching. No error is thrown.

### Regenerating the index

Vectors are precomputed at build time so the browser only ever embeds the
visitor's query. After adding staff, a product, or a post:

```bash
npm install --no-save @ternlight/mini
node scripts/build-search-index.mjs
```

Use the same tier you ship. Switching between `mini` and `base` invalidates the
stored vectors, so regenerate when you change.

## D5-DOG

The help assistant in the bottom-right corner. Click the dog for the bark; it also
barks when you send it a message or pick a menu option. The checkbox in the panel
footer mutes it and the choice persists.

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
