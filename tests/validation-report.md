# Validation report — static-resume-blog

Date: 2026-10-20 · Tester: `qa` · **newest section first: Round 2** · · Stack: Next.js 15.5 static export (`output: 'export'`, `trailingSlash`, unoptimized images), Node v24.14, Google Chrome (headless, via `playwright-core`) on macOS.
Final run: `tests/scripts/run-all.sh` — fresh isolated build of the then-current source for **each** base path (`""` and `/my-profile`), gates, local Pages-like server, browser tests. Raw logs: `tests/evidence/{root,sub}/*.txt`; screenshots: `tests/screenshots/{root,sub}/` (git-ignored, 29 MB).

## Round 2 — work e-mail first, footer alignment, hero ring/badges on phones, motion tiers, new photo, hero artifacts — run of 2026-10-20 (qa)

**Verdict: PASS for the two user-reported artifacts and for all Round-2 scope on `/profile` (the live base path), with 1 open minor defect (the AWS badge grazes the "head rectangle" by 1 px at 360 px) and 2 items I could not verify (real iPhone Safari, GitHub Actions).**
Everything in the table was produced by scripts in `tests/scripts/` (re-runnable with `tests/scripts/run-all.sh`; `QA_MODES=prof` for one mode). Builds are isolated copies of the then-current source (`build-isolated.sh`), served by the Pages-like `serve.mjs`.

### Runs
| Run | Source snapshot | Result |
|---|---|---|
| **before** (`tests/evidence/round2-artifacts/before/`) | pre-fix source, base `/profile` | artifact detector **FAIL 50 / 200** → defects reproduced |
| run-all #1 (3 modes: root `''`, `/my-profile`, `/profile`) | after frontend's glow + marquee fix, **before** the AWS-badge nudge | logs `tests/evidence/{root,sub,prof-run1}/`, `tests/evidence/run-all-full-3modes.log` |
| run-all #2 (`QA_MODES=prof`) | latest source (incl. badge nudge), base `/profile` | `tests/evidence/prof/` — the **final** result |
| `e2e.mjs` re-run on `/profile` after fixing my axe wait (see X1/T1) | same build as #2 | `E2E PASS: 279 checks, 0 fail, 1 warn` |

### Pass/fail table (final = `/profile` build of run #2 unless stated; "3 modes" = root, `/my-profile`, `/profile` from run #1)
| # | Scope item | Check (script) | Result |
|---|---|---|---|
| 0 | Gates | `check-paths` (base-correct URLs, case-sensitive, webpack publicPath) · `check-export` (privacy, contact allow-list, image budget, EXIF) · 13 negative controls on the real export | **PASS in all 3 modes** (0 broken, 0 warnings; 13/13 planted defects caught) |
| 1 | WORK e-mail preferred | `e2e-round2 contact`: `#contact` order work→personal, work card first visually, "Preferred" badge on work card only, hero mailto is work-only ≥44px, aria-label "…work address", footer work first, nav has no/only-work mailto, JSON-LD carries work address only, copy-button labels; `check-export`: exactly the two allowed e-mails everywhere, no phone/address | **PASS** (/profile final; root + sub PASS in run #1) |
| 2 | Footer alignment | `e2e-round2 footer` at 320/375/414/768/1280 (+dark 375): no horizontal scroll (layout viewport == nominal), no text outside viewport / spilling / overlapping, label & address left edges identical, baselines, container, heading alignment, FAB covers no text, Explore ≤2 lines on phones, links ≥44px, motion control inside container | **PASS** (192 checks, 0 fail on /profile). Negative controls for it (zig-zag, overflow, overlap, indent): **PASS** |
| 3a | Badges at every breakpoint | `e2e-hero` Chromium **and WebKit (iPhone 16 Pro Max profile, 430x932 DPR 3, isMobile, hasTouch)** at 360/390/430/768 (+932x430 landscape): single `ul[aria-label=Highlights]`, 3 items, visible, ≥8 px inside viewport at 8 samples over 4.2 s, no overlap with each other, floating (transform changes), no filter/backdrop/mask/will-change | **PASS** except the head-rectangle check, see D1 |
| 3b | Rings | SVG gradient ring present + inside viewport, gradient stops resolve, rotating (angle changes), no filter/mask, gap photo↔ring ≥3 px, **arc is painted in the screenshot** (pixel sampling on the ring circle), dashed outer ring ≥640 px (hidden <640 by design 07 §3.6 D) | **PASS** (Chromium + WebKit) |
| 3c | iOS-safe entrance / hidden-load | hero final state ≤1.5 s after `load`; page hydrated while `visibilityState==hidden` still plays the entrance once visible; nothing left at opacity <0.1 after full scroll; a tap on the marquee keeps it running; forbidden-effects scan | **PASS**; one **WARN**: WebKit @360 light entrance 2.1–2.2 s after `load` on this (headless, shared-CPU) machine vs 1.5 s budget; Chromium 0.8 s. Cannot be judged without a real device |
| 3d | Motion tiers Full / Gentle / Off, footer control, failsafe | `e2e-round2 tiers/failsafe/anim`: reduce-motion phone defaults to gentle; Full switch overrides OS; Off truly static; persistence across reload / SPA nav / hard load; radiogroup keyboard (arrows/space/enter); ≥44 px; no-JS reveal; IntersectionObserver-never-fires failsafe; 4x CPU + slow-4G; touch scroll+flick audit at 375/320 in Full/Gentle/Off/OS-reduce; new: gentle marquee is a static wrapped row | **PASS** |
| 4 | Hero photo | `check-export`: `avatar/karthik-fallback.jpg` lowercase, 82 KB (budget 400), 1040x1040, sha256 ≠ any original in `pics/`, no `MyProfilePic.*`/`DSC*`/`portrait-*.jpg` in `out/`, no EXIF/XMP/GPS; `e2e-round2 image`: loads under `/profile`, alt text, natural ≥ displayed, no request for original/leftovers, no 4xx | **PASS** |
| 5A | **Lighter rectangle, lower right** | `artifact-detect`: slope-compensated hard-edge scan (content masked) + bare-background pass (content hidden), 1683x850 · 1440x900 · 1280x800 · 768x1024 · 430x932 × dark/light × 2 frames 3 s apart | before **FAIL** (steps of 4–9 luma levels along y=457 / x=1176 at 1683x850; the same box edge at every size) → after **PASS** (0 edges ≥2 levels, all 3 modes) |
| 5B | **Dark block behind the marquee** | `artifact-detect strip`: chips hidden, per-column background of the strip vs. the hero above/below | before **FAIL** (left fade edge median **−9.4** levels dark, **+5.3** light; right edge −2.1; worst column 26) → after **PASS** |
| 5C | Hero glow / bottom edge | content-visible scan after scrolling + bare-bg scan across the hero/next-section boundary | before: hard step −7.2 levels over ~680 px at y≈615 (bottom-left glow layer cut off) → after **PASS** |
| 5D | Marquee motion "a bit off" | `artifact-detect motion/frames/seam`: linear, infinite, velocity == pitch/duration (±12 %), no reversals, 8-frame velocity deviation; two frames 3 s apart → all chips shift together by the same dx; seam: end translate == list pitch (0.00 px error), 21 phases never leave an empty strip, no visual jump at loop restart | **PASS before and after** — the geometry was never the problem; the "off" feeling was the dark block (5B). Duration changed 40 s → 26 s by frontend (design choice) |
| 6 | Negative controls of the new detector | `negative-controls-artifacts.mjs`: clean mock passes 20/20; planted faint rectangle → `edge` FAIL; planted opaque fade overlay → `strip` FAIL; planted end-translate error → `seam` FAIL | **PASS** (each control trips the right check) |
| 7 | Round-1 regression | `e2e.mjs` 279 checks on `/profile` after the fixes | **PASS** 0 fail, 1 WARN (`reduced-motion: 1 infinite running` — the `animate-ping` status dot; unchanged since round 1) |

### Before / after evidence (paths relative to `tests/`)
* before: `evidence/round2-artifacts/before/` — `hero-<w>x<h>-<scheme>.png` (+`-t+3s`), `hero-bgonly-*.png`, `marquee-strip-*.png`, `marquee-bg-only-*.png`, red-line overlays `edges-*-{f1,f2,bgonly,marquee-view}.png`, `artifact-detect.txt`, `artifact-results.json`, `e2e-hero-{chromium,webkit}.txt` (these two were run with the earlier head-overlap diagnostics: 3 FAIL = D1 only).
* after: `evidence/{root,sub,prof}/artifacts/` (same file set), `evidence/prof/*.txt` (final logs), `screenshots/prof/round2/hero-{CR,WK}-*.png` (phones; WK = iPhone 16 Pro Max profile).
* quick look: `before/edges-1683x850-dark-bgonly.png` (red line on the hard top edge, y=457) vs `evidence/prof/artifacts/hero-bgonly-1683x850-dark.png` (smooth); `before/marquee-strip-1683x850-dark.png` (dark block behind "React") vs `evidence/prof/artifacts/marquee-strip-1683x850-dark.png`.
* root cause confirmed by measurement (reported to frontend-dev, fixed by them): the `.avatar-glow` wrapper had framer's inline `transform:none` overriding Tailwind's `-translate-x/y-1/2`, so the 130 % glow box sat at x1176..1763, y457..1045 instead of being centred, and its radial gradient did not reach alpha 0 at the box edges; the marquee fade was an opaque `rgb(var(--c-bg))` gradient laid over the coloured hero glow.

### Defects in this round
| ID | Status | Description |
|---|---|---|
| A1/B1 | **FIXED, re-verified** | Hero lighter rectangle + marquee dark block + glow-layer bottom edge (details above). Found by `artifact-detect`, fixed by frontend-dev, re-verified in all 3 modes. |
| D1 | **OPEN, minor** | design/07 §6.15: the "AWS Certified" badge intersects the head rectangle (x28–71 %, y14–67 % of the avatar box). Before frontend's nudge: 5x20 px at 360, 19x21 px at 768. After the nudge (top 4 % / 3 %): 768 is clean, **360 still 5x1 px** (WebKit 5x0–1 px, Chromium 5x1 px). It does not cover eyes or chin (`screenshots/prof/round2/hero-*-360x780-light.png`), so I rate it cosmetic: nudge `.badge-aws` another ~2 px up at ≤400 px, or accept 1 px and relax the check. |
| T1 | **My test bugs, fixed** | (a) `negative-controls-r2.mjs` spawned children with `spawnSync` while its mock server lived in the same process (deadlock) → now async; the "overflow" mock was not wide enough → fixed; (b) `e2e-round2` marquee check counted chips of the hidden duplicate group → now uses `getClientRects()`; (c) `e2e.mjs` no-clipped-content exempts the scrolling marquee in the Full tier only (static tiers are checked in e2e-round2); (d) round-2 footer/hero overflow checks use the nominal width, because a mobile browser silently widens the layout viewport when content is wider than the screen. |
| X1 | **Observation, not a defect** | axe `color-contrast` (serious) on `li:nth-child(3\|4) .card .text-fg-muted` appeared intermittently in the first runs, only "after the second theme toggle". Data: dark-theme text colour on the not-yet-switched light card background (3.06:1) and vice-versa → the cards' **colour transition after a theme switch is still running at 900 ms** (reproduced standalone: violations at +900 ms, none at +3 s). The contact-update round (before round 2) passed with 0 axe fails and frontend-dev says round 2 did not touch those cards, so I **cannot say** whether this predates round 2 (my old fixed 900 ms wait may simply have been marginal). `e2e.mjs` now waits for running CSS transitions to finish and WARNs if that takes >1.3 s; the `/profile` re-run is clean (0 fail, no transition WARN). Root and `/my-profile` were not re-run with the new wait (they failed 1–2 axe checks in run #1 for this reason). UX note for frontend-dev: a >0.9 s colour transition on card backgrounds is slower than the rest of the theme switch. |

### What changed in the test suite
New: `artifact-detect.mjs`, `negative-controls-artifacts.mjs`, `e2e-hero.mjs` (Chromium + WebKit). Refreshed: `e2e-round2.mjs`, `negative-controls-r2.mjs`, `e2e.mjs` (axe waits for transitions; marquee exemption; contrast details in output), `run-all.sh` (now 3 modes `''`, `/my-profile`, `/profile`, plus WebKit hero checks, artifact detector, r2 + artifact negative controls).
Detector calibration (so nobody over-trusts it): it measures luma steps in 8-bit sRGB screenshots of headless Chrome at DPR 1; steps of 1–1.5 levels are gradient banding and are ignored (T = 2.0 levels, run ≥ 100 px, 32-sample smoothing); the reported defects measured 4–9 levels.

### NOT verified (honest limits of this round)
* **Real iPhone / real iOS Safari.** Playwright WebKit 27.2 on macOS with the iPhone 16 Pro Max device profile is the same engine family but not iOS: no iOS compositor, no Low Power Mode, no real touch/scroll physics, no address-bar viewport jumps. The original user report (ring and badges missing on iPhone 16 Pro Max Safari) is therefore verified only as "renders and animates in WebKit emulation and in Chromium touch emulation".
* **GPU-compositing artefacts.** The rectangle and dark block reproduced in headless (software-rendered) Chrome; a GPU / ProMotion / HDR display could add banding this detector cannot see. frontend-dev's own 4x-contrast comparison images agree with the detector.
* **Clipboard** (copy buttons): only labels/presence checked; `navigator.clipboard` not exercised.
* **GitHub Actions deploy / real Pages CDN / HTTPS / custom 404 behaviour.** `.github/workflows/deploy.yml` was not executed; the local Pages-like server only emulates it. `/profile` is a simulated subpath on `127.0.0.1`.
* **Hero entrance timing on slow phones** (WebKit @360 measured 2.1 s on this machine, budget 1.5 s) — needs a real device.
* **Root and `/my-profile` were not re-run after the last source change** (AWS badge nudge) and the axe-wait fix. Their last full results are run #1: artifacts PASS 200/200, round-2 PASS except my since-fixed marquee check, hero e2e only D1. The final source was verified on `/profile` only.
* Visual taste (is the new glow pretty?) is for a human; the scripts only prove the absence of hard edges / dark blocks / stuck content.
* Stale dev server: PID 22605 (`serve.mjs … 4180`, started before my restart) ignored SIGKILL from my sandbox; kill it from outside.

---

## Contact update (owner-approved publication of two e-mails) — run of 2026-10-20, after "frontend complete: contact update"

**Verdict for this change: PASS** (both base paths; all defects found in this round fixed and re-verified; no open warnings in the e2e run).
Change under test: Contact section with personal (preferred) + work e-mail cards and copy buttons, footer/hero/nav contact links, JSON-LD `Person` block carrying the personal e-mail, `sameAs` LinkedIn + GitHub, tap targets raised to 44px. Approved details (tests/scripts/contact.config.mjs): work `karthik.muthumari@mindera.com`, personal `karthikmuthumari7@gmail.com`, LinkedIn `https://www.linkedin.com/in/karthikmuthumari/`, GitHub `https://github.com/karthik-muthumari`.

Final run: `tests/scripts/run-all.sh` (fresh isolated builds; logs in `tests/evidence/{root,sub}/`):
```
== root: RESULT: PASS (0 broken, 0 warnings) | RESULT: PASS (0 warnings) | NEGATIVE CONTROLS: PASS (13 planted defects all caught) | E2E PASS: 279 checks, 0 fail, 4 warn
== sub:  RESULT: PASS (0 broken, 0 warnings) | RESULT: PASS (0 warnings) | NEGATIVE CONTROLS: PASS (13 planted defects all caught) | E2E PASS: 279 checks, 0 fail, 4 warn
```

| Check | Root | `/my-profile` | Evidence |
|---|---|---|---|
| `contact:email-allowlist` – every e-mail-shaped string in all text files (HTML, RSC payload, JS chunks, JSON-LD) is one of the two approved addresses | PASS (found exactly: karthikmuthumari7@gmail.com, karthik.muthumari@mindera.com) | PASS | `check-export.txt` |
| JSON-LD block (`"email":"mailto:karthikmuthumari7@gmail.com"`, `sameAs` LinkedIn+GitHub) handled by the allow-list | PASS for the e-mail (`application/ld+json` present in `/`; its address is on the allow-list). `sameAs` URLs are not machine-checked (the exact-URL check reads `<a href>` only); verified by eye: equal to the approved URLs | PASS | `grep` of `out/index.html` |
| `contact:mailto-targets-approved` / `mailto-work-on-home` / `mailto-personal-on-home` / present on every page | PASS (both on index + 7–8 other pages) | PASS | `check-export.txt` |
| `contact:social-urls-exact` (LinkedIn + GitHub anchors exact; no other profile links on site pages) | PASS | PASS | same |
| `contact:no-placeholder-urls`, `html:placeholder-text` (no hello@example.com / example.com / TODO / your-*-handle in HTML, RSC, app chunks, visible text) | PASS | PASS | same |
| Phone / address / original photos / EXIF-GPS (unchanged strictness) | PASS | PASS | same |
| Negative controls on the real export: planted phone, address, postcode, `tel:`, original photo, **third e-mail (text, `mailto:`, inside a JS chunk)**, `hello@example.com`, TODO text, wrong LinkedIn URL, work/personal `mailto:` removed → each trips the expected check | PASS 13/13 | PASS 13/13 | `negative-controls.txt` |
| e2e contact checks (light+dark × 320/375/768/1440 = 8 combos per mode, 189 PASS rows per mode): `#contact` exists; both addresses visible **as text**; all 4 links inside the section, visible, inside viewport, topmost at centre, **≥44×44 hit area**, not `tabindex=-1`, `rel=noopener` on `_blank`, **reachable by Tab** with visible focus ring; no placeholder text; no horizontal overflow; no network/console errors | PASS | PASS | `e2e.txt` |
| axe scoped to `section#contact` (WCAG 2/2.2 AA + best-practice), 8 combos | PASS 0 violations | PASS 0 violations | `e2e.txt` |
| Full-page axe light/dark (kept) | PASS 0 violations | PASS | `e2e.txt` |
| Footer on `/blog/` carries both mailto + LinkedIn + GitHub (375px) | PASS | PASS | `e2e.txt` |
| Footer and navigation at phone widths (320/375): screenshots reviewed by eye (`footer-320`, `menu-320` of the sheet); sheet shows Home/Experience/Projects/Blog + full-width "Contact" button; footer lists both e-mails, GitHub/LinkedIn icon buttons; `scrollWidth == viewport` | PASS (visual review of 320px only for footer+menu; 375 captured, not inspected) | PASS (same screenshots taken from this build) | manual + `no-h-overflow` / `no-clipped-content` rows |

Note on tap targets: the e-mail cards use the *stretched-link* pattern (the `<a>` is ~24px high; its `::after` covers the whole 64–87px card). `e2e.mjs` measures this effective hit area and verifies it with `elementFromPoint` at two points inside the card, so these PASS as e.g. `246x83 (stretched-link ::after hit area, verified by elementFromPoint)`.

**Re-run after the footer/logo polish (`frontend-dev` fixes for D3 and D7)** – `run-all.sh` again, fresh isolated builds:
```
== root: check-paths PASS (0 broken) | check-export PASS | NEGATIVE CONTROLS PASS (13/13) | E2E PASS: 279 checks, 0 fail, 0 warn
== sub:  check-paths PASS (0 broken) | check-export PASS | NEGATIVE CONTROLS PASS (13/13) | E2E PASS: 279 checks, 0 fail, 0 warn
```
The previous 4 tap-target WARNs are gone. (Footer at 320px eyeballed; 375px footer not re-inspected.)

### What changed since the previous run
* App: contact data/UI/JSON-LD as above (`frontend-dev`), plus the earlier fixes (avatar at 768, chip contrast).
* Tests: new `contact.config.mjs`, new `negative-controls.mjs` (13 controls, wired into `run-all.sh`), `check-export.mjs` now enforces the e-mail allow-list / exact social URLs / no placeholders (the old "work e-mail must not appear" assumption is removed; phone/address/photo checks unchanged); `e2e.mjs` gained the 8-combo contact suite, a **content-clipped-by-overflow-hidden** check (see D6) and an effective-hit-area measurement for stretched links. e2e checks per mode grew 80 → 279.
* `deploy.yml`: **no functional change needed** (the existing `check-export` gate step enforces the new contact/privacy rules automatically; only the step *name* was updated).

### Defects in this round
| ID | Sev | Finding | Status |
|---|---|---|---|
| D6 | Medium | At 320px the Contact card content was wider than its container and clipped by `overflow-hidden` (heading cut at "grea", copy buttons half hidden, GitHub/LinkedIn buttons 17px past the viewport edge). It was invisible to the old overflow check because the card clips itself; caught by the new contact checks + new `no-clipped-content` check. Cause: `1fr` grid tracks sized by min-content. | **Fixed** by frontend-dev (`minmax(0,1fr)` + `min-w-0`, tighter padding <360px); re-verified: all 320px contact/clip checks PASS in both modes. |
| D7 | Low (cosmetic) | Footer e-mail rows at 320px: the "PERSONAL" label (`w-16`) touched the address text. | **Fixed** (label stacks above the address on phones; `w-20` row layout from 640px). Re-verified by screenshot at 320px (`footer-320`: labels above addresses, no touching) |
| D3 | Info | Phone tap targets: logo 40×44 and nav "Blog" 34×44. | **Fixed** (`min-w-11` on logo and footer nav links). Re-run: e2e **0 warnings** in both modes |

### Limits specific to this change
* Copy buttons: presence/size/focus were checked, but **clipboard behaviour, the "copied" live-region announcement and the clipboard fallback were not exercised**.
* `mailto:` handlers were not opened (no mail client); only the `href`s were verified.
* JSON-LD `sameAs`/email were checked by regex/eye, not validated with Google's Rich Results tool.
* Footer/nav review at phone widths covered visual inspection of the 320px screenshots and automated overflow/size checks at 320/375; 375/768 screenshots were not individually eyeballed.
* The new `no-clipped-content` heuristic exempts scrollers and elements under a CSS mask (the hero chip strip); other deliberate clipping would need `data-allow-overflow`.

---

# Initial run (before the contact update) — retained for history

## Verdict (initial run): **PASS (with minor, non-blocking warnings)**
Both hosting modes (root and `/my-profile` project subpath) pass all path, export, privacy, and browser checks. Two defects found during the run were fixed by `frontend-dev` and re-verified (below). Not verified: real GitHub Actions/Pages run, Safari/Firefox, real devices (see "Not verified").

## Results

| # | Check | Root `/` | Subpath `/my-profile/` | Evidence |
|---|---|---|---|---|
| a1 | Every local URL (HTML attrs, srcset, CSS `url()` incl. fonts, hydration payload) resolves to a file in `out/` (case-sensitive, Pages rules) | PASS (388 URLs, 7 pages) | PASS (384 URLs) | `evidence/*/check-paths.txt` |
| a2 | webpack `publicPath` = `<base>/_next/` (lazy chunks, client nav) | PASS `/_next/` | PASS `/my-profile/_next/` | same |
| a3 | No root-relative `href/src` lacking base in rendered HTML (project build) | n/a | PASS (`grep` of `(href\|src)="/…"` not starting `/my-profile/` returned nothing) | shell grep |
| a4 | Negative control: root build checked with `--base /my-profile` | — | FAIL as expected (175 broken) → checker detects missing prefix | ran manually |
| a5 | Browser: 0 4xx / failed requests, 0 console errors, 2 routes × 5 widths | PASS | PASS | `evidence/*/e2e.txt` (`network`/`console` rows) |
| a6 | Server probes (Pages-like server; subpath mode serves *only* under the prefix) | PASS `/`=200, `/blog/`=200, `/nope/`=404, `/404.html`=200, `/_next/static/`=404 | PASS `/my-profile/`=200, `/blog/`=200, `/nope/`=404, `/404.html`=200, `/_next/static/`(un-prefixed)=404 | `evidence/*/curl-probes.txt` |
| a7 | Client-side nav keeps SPA alive (marker survives) for all internal links, URL stays under base; blog post via click + hard reload (200); 404 page renders w/ prefixed links | PASS | PASS | e2e `spa-nav*`, `blog-post-*`, `404-*` |
| b1 | No horizontal overflow at 320/375/768/1024/1440 (`/`, `/blog/`) | PASS 10/10 | PASS 10/10 | e2e `no-h-overflow` (e.g. `scrollWidth=320 viewport=320`) |
| b2 | Type size: body ≥16px, smallest 12px | PASS | PASS | e2e `type-size` |
| b3 | Tap targets: none <24px | PASS (no FAIL) | PASS | e2e `tap-targets` |
| b3w | Tap targets ≥44px on phones | **WARN** — 6–7 targets 24–44px at 320/375 (logo 40×44, nav links 32px high, one blog link 27px high) | same | e2e |
| b4 | Hero avatar slot fully inside viewport and ≥ min(160px,45%vw) | PASS (217/254/303/379/442 px at 320…1440) | PASS | e2e `avatar-slot` (selector `[data-avatar-state]`; no stable `data-avatar-slot` hook exists) |
| b5 | Viewport meta `width=device-width`, zoom not disabled | PASS | PASS | `check-export` `html:viewport*` |
| c1 | `index.html`, `404.html`, `_next/static`, `.nojekyll`, favicon, `blog/index.html`, 3 post pages | PASS | PASS | `check-export.txt` (`.nojekyll` created by build script / CI step) |
| c2 | No `api/`, `_next/server`, `.env`, raw `.md/.ts`, source maps | PASS | PASS | same |
| c3 | Privacy: phone (derived from CV, any format), `+44 777`, `tel:` links, `Ryehill`, `NG2 2LQ` absent in all 63 files of `out/` | PASS | PASS | same + independent `grep -rIl` (only framework-JS false hits on "tel:"/"777", inspected) |
| c4 | Privacy: no `DSC*`, no image >2MB, no SHA-256 match with `pics/` originals, no EXIF GPS | PASS | PASS | same |
| c5 | Negative control: planted phone/address/original photo in a copy of `out/` | FAIL as expected (4 checks) → leak detection works | — | ran manually |
| d1 | Blog index + 3 posts: one `<h1>`, `<article>`, ≥400 chars, no `undefined/NaN`, no leaked frontmatter/raw markdown (code blocks and heading anchors exempt) | PASS | PASS | `check-export.txt` |
| d2 | Posts reachable by click and hard reload | PASS | PASS | e2e |
| d3 | No-JS: hero text present in static HTML | PASS (`curl` shows "Karthik" in markup) | PASS | `curl-probes.txt` |
| e1 | Static lint: `lang`, `<title>`, description, `<main>`, alt, `rel=noopener` on all 7 pages | PASS | PASS | `check-export.txt` |
| e2 | axe-core WCAG2 A/AA/2.2 AA + best-practice, light **and** dark (4 runs/mode) | PASS 0 violations | PASS 0 violations | e2e `axe …` |
| e3 | Theme: toggle flips theme & bg, persists after reload; `prefers-color-scheme` honoured (light→luma 248, dark→13) | PASS | PASS | e2e |
| e4 | Reduced motion (`prefers-reduced-motion: reduce`): first viewport content visible; all text visible after scrolling; 0 infinite CSS/WAAPI animations | PASS | PASS | e2e |
| e5 | Keyboard focus ring visible (`outline: solid 3px`) | PASS | PASS | e2e |
| f1 | Images: all ≤500KB (max 395KB), total 1.00MB ≤3MB, max side ≤2400px | PASS | PASS | `check-export.txt` |
| f2 | JS weight: 1044KB uncompressed across all routes (budget 1500KB); `next build` first-load JS: `/` 181kB, `/blog` 160kB | PASS | PASS | same + build log |
| g | Workflow YAML parses (Ruby `YAML.load_file`): jobs `build`, `deploy`; permissions `contents: read, pages: write, id-token: write`; concurrency `pages`; base-path shell logic tested for `owner/my-profile`→`/my-profile`, `Owner/Owner.github.io`→`""`, case-insensitive | PASS (syntax/logic only) | | local commands |

## Commands run (reproduce with `tests/scripts/run-all.sh`)
```
tests/scripts/build-isolated.sh <work>/root ""            # isolated copy so builds can't race with dev's out/
tests/scripts/build-isolated.sh <work>/sub  /my-profile
node tests/scripts/check-paths.mjs  <out> --base <base>
node tests/scripts/check-export.mjs <out> --base <base>
node tests/scripts/serve.mjs <out> 4173|4174 [--base /my-profile]
node tests/scripts/e2e.mjs http://127.0.0.1:<port> --base <base>
```
Final summary lines:
```
== root: RESULT: PASS (0 broken, 0 warnings) | RESULT: PASS (0 warnings) | E2E PASS: 80 checks, 0 fail, 4 warn
== sub:  RESULT: PASS (0 broken, 0 warnings) | RESULT: PASS (0 warnings) | E2E PASS: 80 checks, 0 fail, 4 warn   (check-paths warn removed after heuristic refinement)
```
(The 4 e2e warnings per mode are the tap-target-size WARNs, row b3w.)

## Defects
| ID | Sev | Finding | Status |
|---|---|---|---|
| D1 | Medium | Hero avatar clipped ~26px at the right edge at 768px viewport (`.avatar-box` 360px inside a ~309px grid column, section `overflow-hidden`). Seen in screenshot + `avatar-slot @768` FAIL. | **Fixed** by frontend-dev (re-verified: avatar 437–740px within 768, screenshot reviewed at 320 and 768) |
| D2 | Low | Light theme: filter chip "All" (active) axe color-contrast 4.47:1 (<4.5). | **Fixed** (re-verified: axe 0 violations in both themes) |
| D3 | Info | Tap targets 24–44px on phones (nav links 32px high, logo 40px, filter chips earlier 39px, some blog links 27px). | Open, non-blocking (WCAG 2.2 AA min is 24px: met) |
| D4 | Info | `public/images/portrait-{square,tall,wide}.jpg` (~0.9 MB) are shipped but referenced nowhere in `out/` (grep). | Open, optional cleanup (not a leak: downscaled, no GPS) |
| D5 | Info (process) | Concurrent builds into the shared `out/` (frontend-dev + QA in the same minute) produced a mixed-base `out/` and a spurious 182-failure report. Not an app bug; QA now builds in an isolated copy (`build-isolated.sh`). | Resolved (tooling) |
| T1–T3 | — | QA-tool false positives fixed: `url(%23id)` SVG fragment inside CSS data-URI; heading-anchor `#` and fenced markdown inside `<pre>` flagged as "raw markdown"; Link hrefs in the RSC payload are raw props (base added at render) so payload strings are only checked for existence-with-base. Negative controls confirm the checks still catch real faults. | Resolved |

## Remaining risks
1. ~~`contact` email is a placeholder (`hello@example.com`) and GitHub/LinkedIn are placeholders in `content/resume.ts` (frontend-dev flagged them as TODO) — must be replaced before launch.~~ **Resolved by the contact update (real, owner-approved details; enforced by `check-export`).**
2. Google Fonts via `next/font/google` are fetched **at build time** (fine in Actions with network; bundled into `out/`, no runtime request to Google — confirmed by the 0 external-request network checks; external URLs in HTML: 3, all outbound links/placeholders).
3. `og:image` / canonical: no absolute-URL warning fired, but social-card previews on the real domain are untested.
4. The workflow's gate runs `check-export.mjs`, which reads `docs/Karthik_Muthumari_CV.txt` to derive phone patterns; if `docs/` isn't committed it silently falls back to static patterns (`+44 777`, `tel:`, address).
5. Framer-motion JS-driven animation loops (rAF) are invisible to the reduced-motion check; code uses `MotionConfig reducedMotion="user"` + `useReducedMotion` (seen by grep), behaviour on screenshots only.
6. If the repo is renamed or a custom domain is added, `NEXT_PUBLIC_BASE_PATH` is recomputed per run automatically (user-site → `""`), but a custom domain on a project repo would need base `""` — override needed.

## Not verified (honest limits)
* The GitHub Actions workflow has **not** been executed on GitHub (no remote; no `actionlint` installed) — only YAML syntax and the shell snippet were tested locally. `npm ci` requires `package-lock.json` to be committed (it exists locally).
* Real GitHub Pages behaviour (CDN, HTTPS, 404 for nested paths, custom domain) — emulated by `serve.mjs`, not equal to Pages.
* Browsers: Chrome only. No Safari/iOS (e.g. `100vh`/dynamic toolbar), Firefox, or physical-device touch testing; `isMobile` emulation only.
* Animation quality/smoothness and visual polish were judged only from a handful of screenshots (320, 768 hero reviewed by eye; the rest are on disk) — not a design review.
* No Lighthouse run (not installed); performance numbers are build-log/asset-size based, not lab-measured.
* The Pixar avatar is a placeholder: only the fallback photo path and slot geometry were tested, not a real `pixar-avatar.*` asset or video variant.
* Dark/light first-paint flash (FOUC) was not measured frame-by-frame.
