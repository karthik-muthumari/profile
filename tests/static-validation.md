# Static export validation strategy

Target: Next.js `output: 'export'` site → `out/` → GitHub Pages, served either at the root
(`https://<user>.github.io/`) or under a project subpath (`https://<user>.github.io/<repo>/`).
Base path comes from `NEXT_PUBLIC_BASE_PATH` (empty by default; `/my-profile` for the simulated subpath).

All tooling lives in `tests/` and is isolated from the app's `package.json`:

| Script | Deps | Purpose |
|---|---|---|
| `scripts/check-paths.mjs` | none | Crawl `out/`; every referenced local URL must resolve **under the base path**, Pages-style and case-sensitive. **CI gate.** |
| `scripts/check-export.mjs` | none | Export structure, privacy leak scan, **contact-details gate**, image budget/EXIF-GPS, JS weight, HTML/a11y/blog lint. **CI gate.** |
| `scripts/contact.config.mjs` | none | Owner-approved contact details (the two e-mails, LinkedIn, GitHub) + placeholder patterns; imported by check-export, e2e and negative-controls. **Edit here if details change.** |
| `scripts/negative-controls.mjs` | none | Plants defects (phone, address, original photo, third e-mail, placeholders, wrong LinkedIn, removed mailto) into a *copy* of a clean export and requires the gate to FAIL on the right check. |
| `scripts/serve.mjs` | none | GitHub-Pages-like static server (`--base /my-profile` makes the site reachable *only* under the prefix, so unprefixed `/_next/...` 404s). |
| `scripts/e2e.mjs` | `tests/node_modules` (`playwright-core`, `axe-core`) + a Chrome binary | Browser checks: widths, overflow, tap targets, client-side nav, requests, theme, reduced motion, axe, contact-link checks, screenshots. |

One-time setup for the browser tests: `cd tests && npm install` (Chrome is auto-detected on macOS; else `CHROME_PATH=...`).
> ⚠ `tests/node_modules` ships `.d.ts` files. The app's `tsconfig.json` should `exclude` `tests` (and `design`) so `next build` type-checking never walks them.

## 0. Matrix to run

```bash
# A. root hosting
rm -rf out && NEXT_PUBLIC_BASE_PATH= npm run build
node tests/scripts/check-paths.mjs out
node tests/scripts/check-export.mjs out
node tests/scripts/serve.mjs out 4173 &                       # http://127.0.0.1:4173/
node tests/scripts/e2e.mjs http://127.0.0.1:4173

node tests/scripts/negative-controls.mjs out               # all planted defects must be caught

# B. project-subpath hosting (simulates https://user.github.io/my-profile/)
rm -rf out && NEXT_PUBLIC_BASE_PATH=/my-profile npm run build
node tests/scripts/check-paths.mjs out --base /my-profile
node tests/scripts/check-export.mjs out --base /my-profile
node tests/scripts/serve.mjs out 4174 --base /my-profile &    # http://127.0.0.1:4174/my-profile/
node tests/scripts/e2e.mjs http://127.0.0.1:4174 --base /my-profile
kill %1 %2 2>/dev/null
```
(`touch out/.nojekyll` before `check-export` — CI does this; locally set `ALLOW_NO_NOJEKYLL=1` to downgrade.)

Quick manual probes with curl while B is serving (expect `200 404 301`):
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4174/my-profile/            # 200
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4174/_next/static/           # 404  (nothing may live outside the prefix)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4174/my-profile             # 301 -> /my-profile/
# any unprefixed root-relative URL left in the HTML is a bug on a project site:
grep -rEoh '(href|src)="/[^"]*"' out --include=*.html | grep -v '="/my-profile/' | sort -u   # expect: nothing (when built with the base)
```

## (a) Base-path-correct asset paths
Pass criteria (automated by `check-paths.mjs` + `e2e.mjs`):
1. **Every** `href/src/srcset/poster/og:image/inline url()` in every HTML file, every CSS `url()` (fonts, images) and the
   RSC/hydration script payload strings resolve to a real file in `out/` after stripping the base. Dir → `index.html`, `/x` → `x.html`.
2. Under base `/my-profile`, every root-relative URL begins with `/my-profile/` (else it 404s on the project site).
3. Resolution is **case-sensitive** (macOS is not; Pages/Linux is) – `Avatar.PNG` vs `avatar.png` is caught.
4. Webpack `publicPath` in `_next/static/chunks/webpack-*.js` equals `<base>/_next/` (otherwise lazy chunks / client navigation 404 even though first paint works).
5. Browser run: zero 4xx/failed requests while loading each route at each width (`network …` rows) and zero console errors.
6. Client-side navigation: clicking each internal link keeps the SPA alive (a `window.__spaMarker` set before the click survives) and the landed URL is under the base; deep-link hard reload of a blog post returns 200; `/definitely-not-here/` returns 404 using `404.html` and its links also carry the base.
7. Favicon, manifest/icons, `og:image` (should be an **absolute** `https://` URL for crawlers – flagged as WARN if root-relative), `next/font` woff2 files.

Known high-risk spots to eyeball if a check fails:
* `next/image` with `unoptimized: true` does **not** add `basePath` to string `src`; plain `<img src="/avatar.jpg">` never does. Use a helper (`withBase()` / `process.env.NEXT_PUBLIC_BASE_PATH + src`) for everything under `public/`.
* CSS `background-image: url(/img/x.jpg)` in Tailwind arbitrary values / globals.css, inline `style={{backgroundImage}}`, `<link rel=icon>`, `metadata.icons`, `metadataBase`.
* Markdown blog bodies: images/links written as `/images/x.png` inside `.md` files are rendered verbatim → must be rewritten at render time (rehype plugin / component override) or authored relative.
* `<Link href="/blog/x">` is basePath-aware; raw `<a href="/blog/x">` is not.
* `router.push`, `window.location`, `fetch('/data.json')`.

## (b) Mobile responsive scaling (`e2e.mjs`, widths 320/375/768/1024/1440)
| Check | Pass | Warn | Fail |
|---|---|---|---|
| Horizontal overflow | `scrollWidth ≤ innerWidth` and no visible element's right edge > viewport (unless clipped by an `overflow` ancestor) | – | any |
| Tap targets (links/buttons/inputs; inline links in prose exempt per WCAG 2.5.8) | all ≥ 44×44 | some 24–44 (reported as count) | any < 24 px |
| Type | body ≥ 16 px, smallest text ≥ 12 px | smallest 11–12 or body < 16 | smallest < 11 px |
| Hero avatar slot (`[data-avatar-slot]`, `#avatar-slot` or `--avatar "<selector>"`) | fully inside viewport, width ≥ min(160px, 45 % vw) at every width | selector not found | clipped/off-screen/too small |
| Viewport meta | `width=device-width`, no `user-scalable=no` / `maximum-scale=1` | – | missing / zoom disabled |
Screenshots (full page) per route×width land in `tests/screenshots/<root|myprofile>/` for human review – the script cannot judge *beauty*, only breakage.
Manual extras: iOS Safari `100vh` jumps (use `dvh`), sticky header covering anchors (`scroll-margin-top`), landscape phone 667×375, 200 % browser zoom, text-resize 150 %.

## (c) Export sanity & privacy (`check-export.mjs`)
* `out/index.html`, `out/404.html`, `out/_next/static/`, `out/.nojekyll`, `blog/index.html`, ≥ 1 `blog/<slug>/index.html`, favicon.
* No server-only artefacts: no `out/api/`, `out/_next/server/`, `.env*`, raw `.md/.mdx/.ts(x)`; source maps → WARN.
* Config review (manual/grep in app): `grep -n "output" next.config.*` → `'export'`; no `getServerSideProps`, `revalidate`, route handlers, `middleware`, `next/headers`, `cookies()`, rewrites/redirects/headers (ignored by export). `npm run build` itself fails on most of these.
* **Privacy (strict, unchanged)** – scans every text file in `out/` (html, js, css, json, txt, xml, map, svg, rsc):
  * phone: numbers derived from `docs/Karthik_Muthumari_CV.txt` (any spacing/format, `+44`/`0` prefix variants) + static patterns `+44 777`, `0777…`, `tel:` links;
  * address: `Ryehill`, `NG2 2LQ`/`NG22LQ` (case-insensitive);
  * original photos: any file named `DSC*`, any image > 2 MB, any file whose SHA-256 equals a file in `pics/`;
  * EXIF **GPS** tag in any shipped JPEG (resizing with `sips` usually keeps EXIF!). Strip with `sips -d … ` / `exiftool -all=` if flagged.
  * Also grep manually: `grep -rIlF -e "+44" -e "Ryehill" -e "NG2" out || echo clean` and review `docs/`-derived markdown that is bundled at build time.
* **Contact details (owner-approved publication; replaces the old "work e-mail must not appear" rule)** – `check-export.mjs`:
  * `contact:email-allowlist` – every e-mail-shaped string in **any** text file of `out/` (HTML, RSC payload, JS, JSON; `\u0040`/`&#64;`/`%40` decoded; `image@2x.png`-style file names ignored) must be one of exactly **karthik.muthumari@mindera.com** or **karthikmuthumari7@gmail.com**;
  * `contact:mailto-targets-approved` – every `mailto:` target is on that list; `contact:mailto-work-on-home` / `contact:mailto-personal-on-home` – both `mailto:` links present on `index.html` (WARN if missing from other pages' footer);
  * `contact:social-urls-exact` – LinkedIn anchors equal `https://www.linkedin.com/in/karthikmuthumari/` and GitHub anchors equal `https://github.com/karthik-muthumari` exactly, both present, and no other linkedin/github profile links on site pages (blog posts may cite other GitHub repos);
  * `contact:no-placeholder-urls` + `html:placeholder-text` – no `hello@example.com`, `example.com`, `your-*-handle`, `TODO(user)` anywhere in HTML/RSC/app chunks, and no TODO/FIXME/TBD/lorem/"your email" in visible text.
  * Browser (`e2e.mjs` section 4), for **light and dark × 320/375/768/1440 × root and `/my-profile`**: `section#contact` exists; both addresses are shown as **text** there; each of the 4 links (work mail, personal mail, LinkedIn, GitHub) is inside the section, visible, inside the viewport, topmost at its centre (not covered), ≥ 44×44 px, not `tabindex=-1`, reachable by pressing Tab from page top, shows a focus ring, external links have `rel=noopener`; axe scoped to the section (WCAG 2/2.2 AA + best-practice) has 0 violations; no horizontal overflow; footer of `/blog/` carries the contact links (WARN if not). The full-page axe runs (light/dark) are kept.
  * **Negative controls** – `node tests/scripts/negative-controls.mjs <cleanOut> [--base …]`: baseline must pass, then 13 planted defects must each trip the expected check: phone, address, postcode, `tel:` link, original photo, **third e-mail** (text / `mailto:` / inside a JS chunk), placeholder e-mail, TODO text, wrong LinkedIn URL, work/personal `mailto:` removed.
* `.nojekyll` is created by the workflow after the build (Pages ignores `_next/` otherwise → all JS/CSS 404).

## (d) Blog routes
* `blog/index.html` lists posts; each `blog/<slug>/index.html` exists, has exactly one `<h1>`, an `<article>`, ≥ 400 chars of text, no `undefined`/`[object Object]`/`NaN`, no leaked frontmatter or raw markdown (`# `, ``` ``` ```, `**`).
* Every post slug in the markdown source directory has a generated page (`generateStaticParams` complete): `diff <(ls content/blog | sed 's/\.mdx\?$//' | sort) <(ls out/blog | grep -v -e index -e '\.' | sort)` (adjust path to the app's content dir).
* Browser: open from `/blog/` by click (SPA) and by hard reload (e2e `blog-post-*`); code blocks / images / external links inside posts work and don't overflow at 320 px (`pre` must scroll internally, images `max-width:100%`).
* Unknown slug → 404 page (`dynamicParams = false` is implied by export).

## (e) Accessibility / theme / reduced motion
* Static lint (all pages): `<html lang>`, `<title>`, meta description, one `<h1>`, `alt` on every `<img>`, `rel=noopener` on `target=_blank`, `<main>` landmark.
* axe-core (WCAG 2 A/AA + 2.2 AA + best-practice) in light and dark; serious/critical → FAIL, others WARN. Includes colour-contrast.
* Theme: `prefers-color-scheme` honoured on first load without flash (check `<html>` class set by an inline script before paint – look for a flash in the screenshots/video), toggle flips class + background, choice persists on reload, `localStorage` access is try/catch-guarded (private mode).
* Reduced motion: with `prefers-reduced-motion: reduce` all text is visible **without scrolling/animation triggers** (no content stuck at `opacity:0`), no infinite CSS animations; framer-motion code should use `useReducedMotion()`/`MotionConfig reducedMotion="user"` (code review – rAF loops are invisible to the script).
* Keyboard: Tab order visible focus ring (`focus-visible` check), skip-link (manual), mobile menu operable by keyboard + Esc closes (manual).
* No-JS: `curl` the HTML – hero name, experience and blog titles must be present in the static markup (SEO + graceful fallback): `curl -s http://127.0.0.1:4173/ | grep -c "Karthik"`.

## (f) Image & weight budget
* Per raster image ≤ 500 KB (`IMG_MAX_KB`), total images ≤ 3 MB (`IMG_TOTAL_MB`), longest side ≤ 2400 px (`IMG_MAX_PX`, warn) – the photos in `pics/` are 7–11 MB so a resize step is mandatory; for a 1600 px hero, convert to WebP/AVIF or `sips -s formatOptions 70` JPEG.
* Hero image should have `width`/`height` (no CLS), `priority`/`fetchpriority=high`; below-fold images `loading=lazy`.
* JS: sum of `_next/static/chunks/*.js` ≤ 1.5 MB uncompressed (warn; per-route first-load is shown by `next build` output – first load JS under ~200 kB gzip is the aspiration).
* Optional Lighthouse (not installed by default): `npx lighthouse http://127.0.0.1:4173/ --preset=desktop --only-categories=performance,accessibility,seo,best-practices --chrome-flags="--headless"` and again with `--form-factor=mobile`.

## Exit criteria
Release-ready when: `check-paths`, `check-export` and `negative-controls` exit 0 for **both** base paths, `e2e.mjs` has 0 FAIL for both, every WARN is either fixed or listed (with reason) in `validation-report.md`, and the workflow's gate (check-paths + check-export) is green on a real push.

## Limits of this strategy (stated up front)
* Chrome-only; no Safari/Firefox rendering, no real-device touch/iOS viewport quirks.
* Local Pages emulation ≠ real Pages (CDN caching, HTTPS, `404.html` behaviour for deep-nested missing paths, custom-domain/CNAME).
* Visual quality/animation feel needs a human on screenshots/real devices; `e2e.mjs` detects breakage, not taste.
* The Pixar avatar is a placeholder; only its slot geometry is tested.
