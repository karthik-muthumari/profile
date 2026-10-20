# 07 · Round 2 fixes (live-site review of https://karthik-muthumari.github.io/profile/)

Method: headless Chrome via `playwright-core` (from `tests/node_modules`), touch + `isMobile` emulation at 320 / 375 / 414 / 768px, DPR 2, full-scroll passes, and A/B runs with `reducedMotion: 'no-preference'` vs `'reduce'`. Screenshots are in the scratchpad, not in `design/`. The spec is based on the **live** build; some items may already be patched in `src/` (flagged "verify").

> **Photo:** `pics/MyProfilePic.PNG` has been viewed; §4 is the final, exact crop spec.

---
## 1. Contact priority swap → WORK email is primary
Supersedes the "Personal = primary" rules in `06-contact-update.md` (§ Data, §1 variants, §2, §3, §4, JSON-LD).

| Place | Change |
|---|---|
| `profile.emails` order | `[work, personal]` — **Work first** |
| `ContactCard` | "Preferred" pill + `border-accent/40 shadow-glow` on **Work** (`karthik.muthumari@mindera.com`); Personal (`karthikmuthumari7@gmail.com`) gets the default (non-glow) card |
| Contact section | Work card on top / left, Personal second (secondary) |
| Hero icon-button + any single-email CTA | `mailto:karthik.muthumari@mindera.com`, `aria-label="Email Karthik at work"` |
| Nav | no mailto (unchanged: "Contact" pill → `#contact`) |
| Footer | Work row first, Personal second |
| JSON-LD `Person.email` (if present) | work address |
| Copy-button labels | unchanged (`Copy work email address` / `Copy personal email address`) |
Still **no phone number / address anywhere.**

---
## 2. Footer alignment

### Diagnosis (live build)
1. **768px:** the footer is a single column (grid only becomes multi-column at `lg`); the Contact rows used `flex-row` + `justify-center`, so each row's label+address pair is centred independently → labels land at x=229 ("Personal") vs x=221 ("Work") and addresses start at different x (zig-zag, centred in a left-aligned column). Primary visible bug.
2. **768px:** "Explore" is five 44px-tall stacked links in a full-width column → a tall empty right half; brand blurb capped at 422px; whole footer reads as unfinished.
3. **Mobile (320–414):** Explore also renders as a 5-row stack (≈240px of mostly empty space); label above address OK but label and address left edges differ from the bottom bar by 0–1px (container is `x=16/17`, fine).
4. **Back-to-top FAB overlaps the bottom bar text** ("Built with Next.js, deployed on GitHub Pages" is clipped/overlapped at 375 and 768).
5. Labels (12px caps) vs addresses (13px mono) were centre-aligned rather than baseline-aligned.
(`src/components/Footer.tsx` in the repo already has `md:grid-cols-2`, `sm:justify-start`, `pb-16`/`sm:pr-16` — **verify against the rules below; they're the target.**)

### Target structure
```tsx
<footer className="relative z-[1] border-t border-line py-12 md:py-16">
  <div className="container-x">
    <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-x-6">
      {/* brand */}      <div className="md:col-span-2 lg:col-span-4">…</div>
      {/* explore */}    <nav className="lg:col-span-3 lg:col-start-5">…</nav>
      {/* contact */}    <div className="lg:col-span-5">…</div>
    </div>
    <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 pb-20 text-small text-fg-subtle sm:flex-row sm:items-baseline sm:justify-between sm:pb-0 sm:pr-16">…</div>
  </div>
</footer>
```
| BP | Grid | Notes |
|---|---|---|
| <640 | **1 col**, `gap-y-10` | order: brand → Explore → Contact → socials → bottom bar. **Explore = wrapping inline row** (`flex flex-wrap gap-x-5`, each link `min-h-11 inline-flex items-center`): 2 lines instead of 5. Bottom bar stacked, `pb-20` so the FAB never covers text |
| 640–1023 | **2 cols** `gap-x-8`; brand spans both; Explore in col 1 (stacked list, 44px pitch); Contact in col 2 | Top edges of the two column headings align (`items-start`, same `text-micro` + `mb-3`) |
| ≥1024 | 12 col, `gap-x-6`: brand 1–4, Explore 5–7, Contact 8–12 | Contact is wide enough (≈450px) for side-by-side label/address |
| ≥1280 | same, inside `max-w-container` | |

### Contact rows (alignment-critical)
- **Rows are a 2-col grid with a fixed label column**, left-aligned, **never centred**:
  `className="grid min-h-11 grid-cols-1 items-baseline gap-x-3 py-1 lg:grid-cols-[5rem_minmax(0,1fr)]"`
  - <1024: label above address (`grid-cols-1`), label `mb-0.5`. Both rows share identical left edge = column edge.
  - ≥1024: label column `5rem`, address column starts at the same x on **every** row (fixes the zig-zag). `items-baseline` aligns the 12px label baseline with the 13/14px mono address baseline.
- Address: `font-mono text-mono`, `break-all` fallback via `[overflow-wrap:anywhere]` (keep the `<wbr>` after `@`).
- Row link is the whole `<a>` (tap area ≥44px high, `-mx-2 px-2` so text aligns with the heading while hit area extends).
- Row pitch 44–48px; `space-y-1` between rows.
- **Socials row:** `mt-5 flex gap-3`, left-aligned to the *column* edge (under the labels, not under the addresses). Buttons 44×44, icons 20px. At ≥1024 you may add visible text ("GitHub", "LinkedIn") — optional.
- Colours: addresses `text-accent`, labels `text-fg-subtle`; hover `text-accent-hi`.
- Bottom bar: left © (baseline-aligned with right text `items-baseline`), right "Built with…". `sm:pr-16` reserves FAB space. Border-top `border-line`.

---
## 3. "I don't see the complete animation on mobile" — audit

### Findings
| # | Finding | Evidence | Verdict |
|---|---|---|---|
| **A** | **`MotionConfig reducedMotion="user"` + the `prefers-reduced-motion` CSS rule in `tokens.css` turn off ALL transform motion.** Phones with iOS *Reduce Motion* (Settings → Accessibility → Motion) or Android *Remove animations* — also commonly on in low-power/accessibility profiles — see opacity-only fades: no avatar float, no ring spin, no blob morph, no marquee, no staggered slides, no timeline line scrub. | Emulation @375 touch: normal = **14 running animations**, avatar `translateY` oscillating (−13px→−10px), ring rotating; `reduce` = **1 running animation**, zero transformed elements. | ~~Most probable cause~~ **RULED OUT for this user (iPhone 16 Pro Max, Reduce Motion OFF) — see §3.5 for the real, iOS/WebKit-specific causes.** Still valid for users who do have the setting. Behaviour is correct per a11y, but the *experience* is too bare. Fix via tiered motion (§3.1). |
| B | `whileInView` thresholds | Repo already uses `amount:"some"` + `margin:"0px 0px -48px 0px"`; after a full scroll pass **no content is stuck at `opacity:0`** (only decorative `.absolute rounded-full border-2` ping rings, which are meant to be 0 at rest). Timeline dots use `-35%` bottom margin: fires when the dot crosses ~65% of viewport height — fine on 740px. | OK — keep, add failsafe (§3.2). |
| C | Mobile gets fewer ornaments than desktop by design: floating badges (`hidden lg:block`), dashed ring (`lg:`), pointer parallax (fine pointer only), card spotlight (hover). On a phone the hero is just ring + float. | code review | Add touch equivalents (§3.3). |
| D | Hover-only treatments: `whileHover` card lift/spotlight/arrow, magnetic CTA. No tap equivalent besides `whileTap` scale. | code review | §3.3 |
| E | Heavy GPU effects likely janky on mid/low phones: animated `filter: blur(14px)` entrance, `blur-[40px]` glow, multiple `backdrop-blur`, `will-change` on large layers. Jank reads as "animation doesn't play". | review | §3.4 |
| F | Static HTML contains `opacity:0` initial styles → before hydration (slow 3G) or with JS blocked the page looks empty. | typical for `initial="hidden"` SSR | §3.2 |
| G | Date chip wraps awkwardly at 375 ("Sept 2021 – Present · 5 / years"). | screenshot | Add `whitespace-nowrap` to each segment; allow chip to wrap between segments (`flex flex-wrap gap-x-2`); keep "5 yrs" abbreviated on <480px. |

### 3.1 Tiered motion (replaces 04 §11 for mobile & reduce)
> **Secondary now** (round 2b): the tiers are already implemented and harmless — keep them, but do not spend more time on them. The primary work is §3.5.
Do **not** silently override the OS setting. Instead define three tiers and give the user a visible control.
| Tier | When | Behaviour |
|---|---|---|
| `full` | default when OS has no reduce preference | everything in 04 |
| `gentle` | OS `prefers-reduced-motion: reduce` **(default for those users)** | opacity fades 0.4s + **≤12px** translateY entrances, no scale/blur/rotate, no stagger >0.04; avatar **soft float amplitude 5px, 8s** (slow, no rotate); ring static; marquee static; no parallax/spotlight/tilt; counters animate 0.6s |
| `off` | user chooses "Off" | final states instantly, no movement at all |
- Implementation: `MotionPrefsProvider` reads `localStorage['motion']` (`full|gentle|off`) else derives from `matchMedia('(prefers-reduced-motion: reduce)')` → `gentle` / `full`. Sets `data-motion` on `<html>` (CSS uses `[data-motion="off"]` to kill CSS animations; `gentle` disables only infinite spins/marquee). Wrap tree in `<MotionConfig reducedMotion={tier==='full' ? 'never' : tier==='off' ? 'always' : 'never'}>` and have `lib/motion.ts` variants read `tier` (`useMotionTier()`), so `gentle` selects the small-amplitude variants.
- Replace the blanket CSS block in tokens.css with: `@media (prefers-reduced-motion: reduce){ :root:not([data-motion="full"]) .anim-spin,.anim-morph,.anim-marquee{animation:none} }` (decorative infinite CSS animations only), and `html[data-motion="off"] *{animation:none!important;transition-duration:.001ms!important}`.
- **Control:** footer text button "Motion: Full · Gentle · Off" (segmented, `role="radiogroup"`, labelled, 44px targets), plus a one-line hint when `gentle` is auto-chosen: "Animations are reduced because your device asks for it. Switch to Full →".
- This keeps vestibular safety (no large/rotational/parallax motion at `gentle`) while letting users with the OS flag still see life on the page.

### 3.2 Corrected mobile reveal rules (applies at `max-width: 767px` / `useMediaQuery`)
```ts
// lib/motion.ts
export const vpMobile  = { once: true, amount: 0.01, margin: '0px 0px -8% 0px' } as const  // fires when ~1% visible
export const vpDesktop = { once: true, amount: 'some', margin: '0px 0px -48px 0px' } as const
// NEVER use amount > 0.15 on any element taller than 0.5×viewport (cards, timeline groups, contact panel)
export const dist = { desktop: 28, mobile: 14 }     // y offsets
export const dur  = { mobileEntrance: 0.45 }        // shorter than desktop 0.7
export const stagger = { mobile: 0.05, cap: 4 }     // max 4 staggered children, rest share the last delay
```
Rules:
1. Timeline dots/cards: trigger `margin: '0px 0px -20% 0px'` on mobile (not −35%), `slideX` disabled → `fadeUp` y 14.
2. No reveal depends on hover/pointer/large scroll distance. Scroll-linked timeline line uses `offset: ['start 90%','end 50%']` on mobile (shorter scrub distance); hero parallax amplitudes ×0.5.
3. **Failsafe so nothing stays hidden:** in `Reveal`/`SectionHeader`/cards add: `const [forced,setForced]=useState(false)`; `useEffect(()=>{ const t=setTimeout(()=>{ const r=ref.current?.getBoundingClientRect(); if(r && r.top < innerHeight*1.05) setForced(true) },2500); return()=>clearTimeout(t)},[])` and `animate={forced ? 'show' : undefined}` (keeps `whileInView` for the normal path). Also re-check on `scrollend`/`resize`/`orientationchange` for iOS where IntersectionObserver can miss after the URL-bar collapses.
4. **No-JS / pre-hydration:** `<noscript><style>[style*="opacity: 0"],[style*="opacity:0"]{opacity:1!important;transform:none!important;filter:none!important}</style></noscript>`; and in the root layout inline `<script>document.documentElement.classList.add('js')</script>` — only apply `initial="hidden"` visuals when `.js` is present is optional; the noscript rule is mandatory.
5. Cap entrance durations at 0.45s and total hero choreography at ≤1.1s on mobile (stagger 0.08 → 0.06, avatar spring delay 0.15 → 0.05).

### 3.3 Touch equivalents for hover/pointer effects
| Desktop | Mobile/touch |
|---|---|
| `whileHover` card lift −6px | `whileTap={{ y:-3, scale:0.985 }}` + `:active` border `accent/50`; release springs back (`spring.card`) |
| Spotlight follows cursor | on `pointerdown`/`touchstart` set `--mx/--my` to touch point and fade spotlight in (0.15s), fade out on `pointerup` (0.4s) |
| Pointer parallax on avatar | **Scroll-linked tilt:** `useScroll` hero → avatar `rotate` −2°→2° and `y` 0→−16px (disabled in `gentle`/`off`). Optional device tilt NOT used (permission prompt) |
| Floating badges (lg only) | **SUPERSEDED by §3.6:** floating badges on all breakpoints, no chip row. (old: Show a **chip row under the avatar on <1024**: 3 glass chips ("AWS Certified", "14+ yrs", "IBM Hackathon Winner"), `flex-wrap justify-center gap-2`, `fadeUp` stagger 0.06 after avatar, each floats `y:[0,-4,0]` 4.5s (`full` only)) |
| Dashed outer ring (lg only) | **See §3.6 D:** show from ≥640 px only, 30s reverse spin, opacity .35 (hidden on phones) |
| Avatar `whileHover` scale | `whileTap` wiggle already exists — keep; plus single-tap haptic-free "pop" scale 1.06 spring |
| Arrow `↗` nudge | Arrow nudges on `whileTap` too |
| Magnetic CTA | none on touch; CTA gets press-in `whileTap scale .97` |
No info is hover-only; every revealed element is in the DOM and visible by default.

### 3.4 Mobile performance guards
- `avatarEnter` on mobile: drop `filter: blur()` (use opacity + scale .9→1 spring); glow `blur-[28px]` max, `h/w-[120%]`; single `backdrop-blur` (nav only) — chips/menus use solid `bg-surface/90`.
- `will-change: transform` on avatar inner only; remove from glow on mobile.
- Pause infinite animations when `document.hidden` or hero out of view (already `useInView`); wrap in `LazyMotion`.
- Respect `navigator.connection.saveData` → force `gentle`.

### 3.5 iOS Safari / WebKit audit (user's device: iPhone 16 Pro Max, 430×932 CSS px, DPR 3, Reduce Motion **OFF**)
**Re-diagnosis.** §3 finding **A (Reduce Motion) is ruled out for this user** — the tiers in §3.1 stay (already built) but are secondary. The cause is almost certainly one or more WebKit behaviours below. I could not run real iOS Safari; items are ranked by likelihood × cost and were found by reading the code in `src/`. Chromium emulation will **not** reproduce them — QA must use WebKit (§6 items 11–14) and the on-device check at the end of this section.

**Hard rules for everything that moves on a touch device (`(hover:none) and (pointer:coarse)` OR width < 768):**
1. Animate **`transform` and `opacity` only**. No `filter`, `backdrop-filter`, `mask`/`clip-path`, `border-radius`, `box-shadow`, width/height/top/left keyframes, no `will-change` set statically.
2. Infinite ambient loops are **CSS keyframes on transform/opacity** (compositor thread, unaffected by main-thread jank and Low Power throttling), not JS springs/`repeat: Infinity` on large layers.
3. ≤ 4 simultaneously animating layers in the hero; no layer larger than the avatar box (300 px → 900 px at DPR 3).
4. Nothing may depend on hover, pointer position, 3D (`preserve-3d`/`rotateX/Y`), or scroll-linked JS springs.
5. Initial (`hidden`) values must be **identical at every breakpoint** (one amplitude: `y:14, opacity:0`) so no remount is needed to pick amplitudes.

#### Prioritised fixes
| P | Finding (file) | Why WebKit/iOS breaks it | Required change |
|---|---|---|---|
| **P0-1** | **Entrance plays while the page isn't visible/painted.** `HeroClient` runs `animate="show"` at hydration; `MotionPrefsProvider` also **remounts the whole tree** (`Fragment key={gate}`) whenever `(max-width:767px)` matches — i.e. on *every phone* — so hydration + remount + 3× DPR image decode all happen on the main thread during the entrance. Pages opened from Messages/Mail/LinkedIn/in-app browsers or restored tabs load in the background; Framer's animations are wall-clock based, so by the time the page is visible the sequence is already finished ("no animation"). | Hero choreography gated on `ready`: `ready = document.visibilityState==='visible' && (img.decode() ‖ 'load') && 2×requestAnimationFrame`, with a 1.5 s timeout fallback; use `animate={ready ? 'show' : 'hidden'}` and re-check on `visibilitychange`/`pageshow` (bfcache restore too). **Delete the `gate` remount** (P0-1b: per rule 5, breakpoint no longer changes hidden values; only a tier change from storage needs a remount and only when it differs from `full`). Also start the below-fold `Reveal`s only after `ready`. |
| **P0-2** | **`.avatar-blob` animates `border-radius` (`blob-morph`) on two elements** (plate *and* `<img>`, both `overflow:hidden`) inside a `[will-change:transform]` + `preserve-3d` parent. | Radius keyframes are main-thread repaints of a 900×900 px layer 60×/s; WebKit also drops the rounded clip / flickers square corners when an `overflow:hidden` + radius child sits under a composited 3D parent. Looks frozen or glitchy. | On touch: `@media (hover:none),(pointer:coarse){.avatar-blob{animation:none}}` (static blob). Keep the morph only on fine-pointer desktops. Liveliness on phones = the transform-only float + opacity glow pulse. |
| **P0-3** | **`.avatar-ring` = conic-gradient + `mask` + `rotate` animation (14 s).** | A rotating masked layer forces an offscreen mask pass every frame in WebKit; frequently renders static, tears, or vanishes during scroll. | No mask. Use `border:3px solid transparent; background: linear-gradient(rgb(var(--c-bg)),rgb(var(--c-bg))) padding-box, var(--grad-ring) border-box; animation: ring-spin 14s linear infinite;` (transform-only). (The gap-to-photo from §4.5 comes for free as the bg-coloured padding box.) |
| **P0-4** | **Hero glow = `blur-[28px]` / `sm:blur-[40px]` on a 140 % layer with an infinite `scale`+`opacity` Framer loop**; also `filter:blur` in `avatarEnter` (desktop) and `leadVariants` (non-mobile). | Safari re-rasterises the blur whenever the layer scale changes; at DPR 3 that's a ~1300 px blurred bitmap per frame. Big cause of jank, throttling and missing frames. The glow is **already a soft `radial-gradient`**, so the blur is visually redundant. | **Delete every `blur-*` / `filter:blur` on animated elements**, all breakpoints. Glow animates `opacity .8↔1` only (no scale). Remove blur from `avatarEnter` / `leadVariants`; replace with opacity + `y`. |
| **P0-5** | **Scroll-linked hero values on phones**: `scrollYProgress → scale, opacity(1→0.6), rotate(±2°), y(−16), glowY, textY` (6 motion values bound to the main thread), plus `ExperienceTimeline` `useSpring(scrollYProgress)`. | iOS delivers scroll events late/throttled during momentum; every value is a JS-driven style write → stutter and a lagging, "half-dimmed" avatar (opacity 0.6) that reads as broken. | On touch: **no scroll-linked values in the hero** (static); timeline line: `scaleY = scrollYProgress` directly (no spring) or drawn via `whileInView` on each segment (`scaleY:0→1`, 0.6 s). Scroll-linked effects only on `(hover:hover) and (pointer:fine)`. |
| **P1-6** | **`:hover` pauses the marquee** (`.marquee:hover .marquee-track{animation-play-state:paused}`) — iOS treats a tap as a *sticky hover* that persists until you tap elsewhere → after any tap near it the marquee stays frozen. Same for `.nav-link:hover::after`. | Classic iOS sticky-hover. | Wrap all hover-only CSS in `@media (hover:hover) and (pointer:fine)`. Verify Tailwind `hover:` variants are hover-gated (v4 default; v3 needs `future.hoverOnlyWhenSupported`). |
| **P1-7** | **`mask-image` on `.marquee` over a moving track.** | A static mask on a container whose child animates forces re-masking every frame in WebKit (stutter or frozen track). | Remove mask; fade the edges with two absolutely-positioned `::before/::after` `linear-gradient(to right, rgb(var(--c-bg)), transparent)` strips, `pointer-events:none`. |
| **P1-8** | **`backdrop-blur-xl` on the fixed Navbar and the mobile sheet** (`bg-bg/95 backdrop-blur-xl`). | Fixed + backdrop-filter makes WebKit repaint everything under the nav on every scroll frame and is a known source of flicker/blank layers while the URL bar collapses — it starves every other animation. | `<1024` / touch: solid `bg-bg/95` (no backdrop-filter) + `border-b`; keep blur only for `(hover:hover) and (min-width:1024px)`. Same for chips/badges: solid `bg-surface/90`. |
| **P1-9** | **`mobile` flag = `(max-width:767px)` only.** iPhone 16 Pro Max in **landscape is 932 px wide → "desktop" branch**: 48 px `slideX`, blur entrance, parallax, hover effects. | | `touch = matchMedia('(hover:none) and (pointer:coarse)').matches`; `mobile = touch \|\| width<768`. Drive `buildMotion(tier, mobile)` from it (and `useScroll` offsets). |
| **P1-10** | **Large composited layers**: `[will-change:transform]` hard-coded on the avatar inner, hero glow (`bg-glow-hero`) and (lg) glow blur; `[transform-style:preserve-3d]` on the avatar wrapper always, even when no 3D is applied. | Static `will-change` pins 3×DPR-sized textures permanently; with several, iOS evicts layers → content briefly blank or un-animated. `preserve-3d` + parent `opacity<1` forces flattening and extra offscreen passes. | Remove static `will-change`; apply `preserve-3d` and `rotateX/Y` only when `fine && full`. |
| **P1-11** | **Theme toggle uses View Transitions with a `clip-path: circle()` reveal** (`startViewTransition`, 150 vmax). | iOS 18 supports it but snapshots a 1290×2796 px page; slow, can drop frames or the animation never visibly runs. | Skip VT on touch: instant `data-theme` swap + 250 ms `background-color/color` CSS transition. |
| **P2-12** | **Long/staggered sequences + Low Power Mode.** LPM caps `requestAnimationFrame` to 30 fps (CSS animations may be throttled too) and blocks muted `<video autoplay>` (the `avatar.kind==='video'` path would show only the poster). Hero currently ≈ 1.3 s of choreography (word delays up to 0.25 s, lead +0.3, tail +0.3, 12 children staggered). | Feels slower / "incomplete". Low Power Mode is **not detectable**. | Hero total ≤ **1.0 s** on touch (word stagger ≤ 0.05, ≤ 5 items; lead/tail delays ≤ 0.15 s). Optional "lite" probe: sample 20 rAF deltas after load; if median > 28 ms → `data-motion="gentle"` equivalent without infinite loops. Never rely on video autoplay: poster must be the finished design. |
| **P2-13** | **Reveals = one IntersectionObserver per element + Framer on the main thread.** IO callbacks on iOS run late when the main thread is busy; fling-scrolling shows blank slots that pop in late. | | (Option, if P0/P1 aren't enough) one shared `IntersectionObserver` that toggles a class `.in` and **CSS transitions** (`opacity .45s, transform .45s`) on `[data-reveal]` for touch devices — compositor-driven, immune to main-thread load. Keep the failsafe. |
| **P2-14** | **Viewport units** — mobile menu `bottom-0 top-nav`, `min-h-[70vh]`, hero `min-h-[calc(100svh…)]` (md+). | iOS toolbar collapse changes the visual viewport; `vh` is the *large* viewport. | Use `svh`/`dvh` (with `vh` fallback) for anything animated or sized to the screen; no sticky+IO combos. |

#### Reference implementations
```css
/* touch-safe avatar (globals.css) */
.avatar-ring{border:3px solid transparent;background:linear-gradient(rgb(var(--c-bg)),rgb(var(--c-bg))) padding-box,var(--grad-ring) border-box;animation:ring-spin 14s linear infinite} /* no mask */
@media (hover:none),(pointer:coarse){.avatar-blob{animation:none}}
@media (hover:hover) and (pointer:fine){.marquee:hover .marquee-track{animation-play-state:paused}}
.marquee{position:relative;overflow:hidden}                      /* no mask-image */
.marquee::before,.marquee::after{content:"";position:absolute;top:0;bottom:0;width:10%;z-index:1;pointer-events:none}
.marquee::before{left:0;background:linear-gradient(to right,rgb(var(--c-bg)),transparent)}
.marquee::after{right:0;background:linear-gradient(to left,rgb(var(--c-bg)),transparent)}
```
```ts
// hero gate (HeroClient)
function useEntranceReady(imgRef: RefObject<HTMLImageElement|null>) {
  const [ready, set] = useState(false);
  useEffect(() => {
    let done = false, t = 0;
    const go = () => { if (done || document.visibilityState !== 'visible') return; done = true;
      requestAnimationFrame(() => requestAnimationFrame(() => set(true))); };
    const img = imgRef.current;
    (img?.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(go);
    t = window.setTimeout(go, 1500);                       // never block forever
    document.addEventListener('visibilitychange', go);
    window.addEventListener('pageshow', go);
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', go); window.removeEventListener('pageshow', go); };
  }, [imgRef]);
  return ready;
}
// <motion.div variants={heroContainer} initial="hidden" animate={ready ? 'show' : 'hidden'} …>
```

#### Triage (ask the user once; ≤ 1 minute)
1. iOS version (Settings ▸ General ▸ About), and is **Low Power Mode** on (yellow battery)? 2. Opened in **Safari** or an in-app browser (LinkedIn/Gmail/Instagram/Messages preview)? 3. Which part looks missing: avatar float/ring spin · hero text entrance · section reveals · marquee? 4. On a Mac: Safari ▸ Develop ▸ *[iPhone]* ▸ the page → Timelines (Frames, CPU) while scrolling the hero; frames >33 ms confirm P0-2…P0-5.

### 3.6 Phone / tablet avatar composition: floating badges + iOS-safe ring (supersedes §3.3 "chip row under avatar" and the §4.5 ring gradient)
**Re-diagnosis (user report: ring + floating badges visible on desktop only).** Confirmed by code: `BADGES` are `hidden lg:block` (floating only ≥1024 px; <1024 shows a static `AvatarChips` row), and `.avatar-ring` is `conic-gradient + mask + rotate`, which WebKit renders static/flickering (§3.5 P0-3). Both are fixed here. **The badges become floating on every breakpoint, the chip row is deleted.**

#### A. Badges on all breakpoints — single DOM set, no chip row
- **Drop `AvatarChips`** (and the `lg:hidden` list). One `<ul aria-label="Highlights">` of 3 `<li>` badges, absolutely positioned inside `.avatar-box`, **not** `aria-hidden` and not `hidden lg:block` — screen readers read them once; no duplicate list. `pointer-events:none`, `z-10` (above ring and photo, below nothing).
- Two nested elements per badge so transforms never clash: `<li>` = position + entrance (opacity + `translateY(8px)→0`, 0.45 s, delay .55 + i·.1 s, `both`, starts with the hero `ready` gate §3.5 P0-1); inner `<span class="badge-float">` = the endless float.
- Look (all sizes): `rounded-pill border border-line-strong bg-surface/95 shadow-md text-fg whitespace-nowrap`; **no `backdrop-blur` anywhere**; static shadow only (never animated). Leading 6 px `bg-accent` dot (`mr-1.5`) as the accent. On the orange photo the dark (dark theme) / white (light theme) solid chip has ≥ 7:1 text contrast and an obvious edge.

#### B. Placement (offsets relative to `.avatar-box`; W = box width)
Photo landmarks to keep clear (from §4.1, % of box): head x 28–71 %, hair top 14 %, glasses to x≈29 % at y 39–47 %, chin 67 %. Badge zones: **top-left corner** (above/left of the hair), **top-right corner**, **bottom-right** (blazer; chin ends at 67 %).
| Breakpoint | Box W | Font / padding | AWS Certified | 14+ yrs | IBM Hackathon Winner |
|---|---|---|---|---|---|
| **Phone <640** (320–430) | 230–300 (`min(72vw,300px)`) | **12 px**/1.15, `px-2.5 py-1` (10/4 px) | `left:-14%; top:12%` | `right:-10%; top:5%` | `right:-12%; bottom:10%`, **2 lines**: `max-w-[6.5rem] whitespace-normal text-center` ("IBM Hackathon / Winner") |
| **Large phone / small tablet 640–767** | 320 | 13 px, `px-3 py-1.5` | `left:-18%; top:12%` | `right:-14%; top:5%` | `right:-16%; bottom:10%`, 1 line (`whitespace-nowrap`) |
| **Tablet 768–1023** (2-col: avatar in right column, ≈ 309 px, gutter ≈ 25 px) | ≈ 310–360 | 13 px, `px-3 py-1.5` | `left:-6%; top:12%` (≤ 20 px into the 32 px column gap) | `right:-4%; top:5%` (12 px < 17 px free to viewport) | `right:-4%; bottom:10%` **2 lines** `max-w-[7rem]` |
| **Desktop ≥1024** | unchanged from today (`-left-4 top-[14%]`, `-right-2 top-[8%]`, `-right-6 bottom-[12%]`; `xl:` wider) | `text-small` 14 px, `px-3 py-1.5` | — | — | single line |
**Viewport safety valve (<768 only, avatar is centred):** for the left-anchored badge use `left: max(-14%, calc(8px - (100vw - 100%) / 2))` and for right-anchored `right: max(-12%, calc(8px - (100vw - 100%) / 2))` — keeps ≥ 8 px from the screen edge on 320-px phones (valid CSS: `100%` = box width).
**Verified fit (px from screen edge, phone):** 360 → AWS left edge 14.5, 14+ right edge 24.5, IBM 19.5; 390 → 15.6 / 25 / 21; 430 → 23 / 33 / 29; 320 → clamped to 8. Tablet 768 → right edges 12 + 13 ≥ 8 ✓. No horizontal scroll (the hero is `overflow-hidden` as a backstop, but nothing may rely on it — QA checks `scrollWidth === innerWidth`).
**Stacking order check:** no badge may cover the eyes/chin: assert the badge bounding boxes don't intersect the head rectangle (x 28–71 %, y 14–67 % of the box).

#### C. Float animation (transform only, CSS, compositor-driven)
```css
@keyframes badge-in    { from { opacity:0; transform:translate3d(0,8px,0) } to { opacity:1; transform:none } }
@keyframes badge-float { 0%,100% { transform:translate3d(0,0,0) } 50% { transform:translate3d(0,var(--bf,-4px),0) } }
.avatar-badge   { animation: badge-in .45s var(--ease-out-expo) both; animation-delay: calc(.55s + var(--i)*.1s); }
.badge-float    { display:inline-flex; animation: badge-float var(--bd,6s) ease-in-out infinite; animation-delay: var(--bl,0s); }
/* per badge: --i:0/1/2 ; --bd: 6s / 7.5s / 9s ; --bl: -1s / -3.5s / -6s (negative = already mid-float at first paint) */
@media (min-width:1024px){ .badge-float{ --bf:-8px } }          /* phones/tablets: -4px (≤ -5px) */
html[data-motion="gentle"] .badge-float, html[data-motion="off"] .badge-float { animation:none }
html[data-motion="off"] .avatar-badge { animation:none; opacity:1 }
.avatar-paused .badge-float, .avatar-paused .avatar-ring-svg { animation-play-state: paused }  /* toggled by useInView(hero) */
```
No JS springs, no `repeat: Infinity` Framer on badges (§3.5 rule 2). Phase offsets differ so they never move in sync. Amplitude 4 px on touch, 8 px desktop. ≤ 3 extra animating layers (each ≈ 100×28 px — negligible).

#### D. iOS-robust ring (replaces `.avatar-ring`; no `mask`, no opaque fill, no conic)
Use an **inline SVG** (stroke gradient) rotated by CSS `transform` on the `<svg>` element itself (HTML-level compositing → reliable in WebKit; **no SMIL, no mask, no `pathLength`**). The inside stays truly transparent so the glow shows through the gap (an opaque `padding-box` fill would paint a flat disc over the glow).
```tsx
const gid = useId();
<svg aria-hidden viewBox="0 0 100 100" className="avatar-ring-svg">
  <defs>
    <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0"   stopColor="var(--ring-a)" />
      <stop offset=".55" stopColor="var(--ring-b)" />
      <stop offset="1"   stopColor="var(--ring-c)" />
    </linearGradient>
  </defs>
  <circle className="ring-track" cx="50" cy="50" r="48.5" fill="none" />
  <circle className="ring-arc"   cx="50" cy="50" r="48.5" fill="none" stroke={`url(#${gid})`} strokeLinecap="round" strokeDasharray="220 84.7" />
</svg>
```
```css
.avatar-ring-svg{ position:absolute; left:50%; top:50%; width:112%; height:112%; margin:-56% 0 0 -56%; pointer-events:none;
  transform:rotate(-60deg); animation:ring-spin 12s linear infinite; }   /* leave the arc gap bottom-left at rest */
.ring-track{ stroke:rgb(var(--c-border-strong) / .45); stroke-width:.45 }
.ring-arc  { stroke-width:1.15 }                    /* r=48.5 → 260° arc (220 of 304.7 circumference) */
@media (min-width:768px){ .ring-arc{ stroke-width:.9 } }
@media (min-width:1024px){ .ring-arc{ stroke-width:.65 } .avatar-ring-svg{ animation-duration:16s } }
:root          { --ring-a:#FFB547; --ring-b:#FF8A3D; --ring-c:#5CC8FF }   /* dark theme */
:root[data-theme="light"]{ --ring-a:#D97706; --ring-b:#EA580C; --ring-c:#0B6A9C }  /* ≥3:1 on paper #FBF8F2 */
html[data-motion="gentle"] .avatar-ring-svg, html[data-motion="off"] .avatar-ring-svg{ animation:none }
```
(also mirror light-theme variables under the `@media (prefers-color-scheme: light)` block that tokens.css already uses — keep in step with `--grad-ring`.)
| Spec | Value |
|---|---|
| Ring diameter | **112 %** of box (svg), centre-line r = 48.5/100 of svg → inner edge is **≈ 6–8 px** (phone) from the photo extremes: this *is* the §4.5 "gap" — it sits on the page background, not on the orange |
| Thickness | arc **≈ 3.3–3.8 px** phone (1.15 u), ≈ 3.5 px tablet (.9 u), ≈ 3–4 px desktop (.65 u); track hairline ≈ 1.3 px |
| Gap (photo → ring) | ≈ 7 px phone, ≈ 8 px tablet, ≈ 11–14 px desktop (scales with box) |
| Rotation | **12 s/turn on phone/tablet (30°/s)**, 16 s desktop, `linear`, clockwise. Arc = 260° with round caps so a single frame already looks "in motion"; sky-blue end is the leading head (complementary to the orange photo) |
| Colours | dark: amber `#FFB547` → orange `#FF8A3D` → sky `#5CC8FF`; light: `#D97706` → `#EA580C` → `#0B6A9C`. Against orange wall the ring does not merge because the 7–14 px page-bg gap separates them and the sky head contrasts it; arc vs page bg ≥ 3:1 in both themes |
| Outer dashed ring | keep the existing CSS `border:dashed` element (it's a plain transform rotation, safe); **show from ≥640 px only**, 30 s reverse, opacity .35. Hide on phones (clutter, and 118 % would eat the badge overhang room) |
| Reduce/off | static at `rotate(-60deg)`; still visible |
| Perf | one 336×336 px (phone, ×DPR 3) rotating transparent layer; no filter/mask/blend |
Delete: `.avatar-ring` (mask + conic), `--grad-ring` use in the ring (token may stay for other uses), the `avatar-ring` div in `HeroAvatar`.
*Acceptance: see §6 items 15–16.*

---
## 4. New hero photo (`pics/MyProfilePic.PNG`) — FINAL framing spec (photo viewed)
**Source facts:** 1122×1402 px, portrait 4:5, **opaque (no alpha)** sRGB PNG, 2.2 MB → **Case B/C** (opaque photo, plain-ish backdrop): use the **blob-mask / `object-cover` fallback mode, not the transparent cut-out mode.** Subject: man looking up-left, round wire glasses, black hair + beard, dark blazer + black turtleneck, on a saturated orange plaster wall with two diagonal shadow bands. Landmarks in source px: hair top ≈ y155 · eyes ≈ y440 · chin/beard bottom ≈ y750 · head centre x ≈ 560 · head spans x ≈ 320–800 · turtleneck/blazer from y ≈ 720 down.

### 4.1 Primary crop — hero blob (exact, original pixel coordinates)
**Square 1122 × 1122, origin x = 0, y = 0** (full width, top-aligned; discards the bottom 280 px of blazer).
- Resulting landmarks (% of the square): hair top **14 %** · eyes **39 %** · chin **67 %** · head centre ≈ (50 %, 40 %) · hair→chin ≈ **53 %** of height (well above the ≥35 % legibility floor, recognisable at 280 px) · lapels/shoulders fill the bottom third.
- Why not tighter: only 14 % headroom exists above the hair; tighter would clip hair on blob-morph frames. The head (x 28 %–71 %) clears the mask corners.
- **Command (macOS, verified):** `sips -c 1122 1122 --cropOffset 1 0 pics/MyProfilePic.PNG --out sq.png`. ⚠ `sips` treats `--cropOffset 0 0` as "centre" (y = 140, hair nearly touching the top edge) — **use `1 0`** (y = 1 px; x is irrelevant at full width). Any other tool: crop rect `x=0 y=0 w=1122 h=1122`.
- **Export:** `sips -z 1024 1024 -s format jpeg -s formatOptions 80 sq.png --out karthik-hero.jpg` → **1024×1024 JPEG q≈80, ≈ 205 KB (measured)**. 1024 px = 2× the 520 px desktop display (retina-crisp); never upscale past the 1122 source.
- **File rules:** lowercase **`public/avatar/karthik-hero.jpg`** (if code is hard-wired to `karthik-fallback.jpg`, overwrite that file with this crop instead — one name either way). Never ship `.PNG`/`.JPG` in uppercase (GitHub Pages is case-sensitive) and never ship the 2.2 MB original. Budget **≤ 300 KB** (205 KB measured). **Strip EXIF/metadata:** `sips` does not, so run `exiftool -all= -overwrite_original karthik-hero.jpg` (or Preview ▸ Export with location unticked) and confirm `sips -g all` shows no Make/Model/GPS; an embedded sRGB profile is fine.
- Optional 640 px variant `karthik-hero-640.jpg` (≈ 85 KB) with `srcset="…-640.jpg 640w, …-1024.jpg 1024w"` `sizes="(max-width:1023px) 72vw, 520px"` — only if mobile LCP matters. WebP (~120 KB) is optional; keep JPEG as fallback.
- Alt: `Portrait of Karthik Muthumari wearing round glasses and a dark blazer, in front of an orange wall` (plain "Portrait of Karthik Muthumari" is also acceptable since the `<h1>` names him).

### 4.2 `object-position` fallback (if the asset is NOT pre-cropped)
If the full 4:5 portrait is dropped into the square `object-cover` box, **`object-position: 50% 0%`** reproduces the primary crop exactly (top-aligned). The old `50% 30%` shifts the window down 84 px (eyes 31 %, hair top 7 %, chin 60 %) — tolerable in an emergency but loses headroom. Never the default `50% 50%` (= the y = 140 centre crop). With the pre-cropped square there is no overflow, so `object-position` has no effect either way.

### 4.3 Secondary crop — small avatar (footer / nav, ≤ 128 px displayed)
**Square 660 × 660, origin x = 231, y = 122** (x 231–891, y 122–782, centred on the head): hair top ≈ 5 %, eyes ≈ 48 %, chin ≈ 95 %.
`sips -c 660 660 --cropOffset 122 231 pics/MyProfilePic.PNG --out f.png && sips -z 256 256 -s format jpeg -s formatOptions 82 f.png --out karthik-face.jpg` → **256×256, ≈ 21 KB (measured)** → `public/avatar/karthik-face.jpg`. Use in a plain `rounded-full` circle, not the morphing blob. Add only if a component needs it; otherwise reuse the hero file.

### 4.4 OG / social card (1200×630)
Don't crop the portrait wide: a 1.9:1 band can't hold hair + chin (head = 595 px tall vs a 589 px band). Compose instead: the §4.1 square at **630×630 on the right edge**, name/title on a solid dark panel on the left. (Only if the OG image is generated outside the repo; not required for the site.)

### 4.5 Ring, glow and edge treatment against the orange backdrop
| Question | Answer |
|---|---|
| **Re-tune ring?** | **Yes.** The photo's edge is saturated orange (≈ hue 18–22°, S ≈ 80–90 %); the amber→orange portion of `--grad-ring` will vanish against it in both themes. Fix: (a) add a **4–6 px gap** between photo and ring (plate padding / ring-offset filled with the page bg colour) so the ring floats off the photo; (b) make the sky/accent-2 and white end dominate: `conic-gradient(from 200deg, rgb(var(--c-accent-2)), rgb(var(--c-accent)), #fff 60%, rgb(var(--c-accent-2)))`, **3 px** (4 px if light-theme contrast vs bg < 3:1); (c) dashed outer ring stays (it sits on the page bg) at opacity **.35**. |
| **Re-tune glow?** | **Yes, mildly.** Amber/orange glow behind an orange photo reads as just a bigger orange blob. **Dark:** keep amber at opacity **.35** (reads as light spilling off the wall) plus a second `--c-accent-2` (sky) radial at **.30**, offset bottom-right, for separation. **Light:** amber glow at **.25** (saturated orange + orange glow is muddy on near-white) and favour the sky radial. Max blur 28 px on mobile (§3.4). |
| **Blob edge — dark theme** | Orange wall vs dark page ≈ 5–6:1: fine on top/left/right. But the **bottom ~25–30 % of the edge is black blazer** against the dark page → the silhouette vanishes there. Add `box-shadow: inset 0 0 0 1px rgb(255 255 255 / .14)` on the media (belt-and-braces with the ring + gap). |
| **Blob edge — light theme** | Orange vs near-white ≈ 3:1 (passes for a graphic); blazer vs near-white is high. **No extra treatment**; do *not* use the white inset hairline (it would halo on orange). Optional `0 0 0 1px rgb(var(--c-border-strong)/.25)`. |
| **Colour harmony** | The wall orange is warmer and more saturated than the accent — the photo becomes the loudest element. Don't tint or filter the photo; leave the orange CTA as is (orange photo + orange CTA is a coherent pairing). |
| **Drop-shadow / fade** | No drop-shadow (Case A only). **No bottom fade-mask** — it would make the torso float; keep a hard blob edge. |
| **Tilt / parallax (§3.3)** | OK: 14 % headroom means ±2° scroll-tilt never clips hair. |

### 4.6 Eyeball checklist (this photo)
Eyes ≈ 39 % · hair top ≈ 14 % and unclipped on all morph frames · chin ≈ 67 % · ring visible all the way round with a visible gap, including over the dark-blazer bottom in dark theme · no halo in light theme · crisp at 280 px mobile and 520 px desktop retina · file ≤ 300 KB, lowercase `.jpg`, metadata stripped, URL works under `/profile/` · `data-avatar-state` reports the new asset.

---
## 5. Files frontend-dev should touch (summary)
`content/resume.ts` (email order) · `ContactCard`/`Contact.tsx`/`Footer.tsx`/Hero CTA (work primary; footer grid per §2) · `lib/motion.ts` (+ mobile viewport/dist/stagger constants, tiers) · `ThemeProvider.tsx` (MotionConfig → tier provider) · new `MotionPrefs` provider + footer control · `Reveal.tsx`, `SectionHeader.tsx`, `ExperienceTimeline.tsx`, `ProjectsGrid.tsx` (mobile viewport, failsafe, touch equivalents) · `HeroAvatar.tsx`/`HeroClient.tsx` (chip row <lg, tilt, no blur on mobile) · `tokens.css` (reduced-motion block per §3.1) · `layout.tsx` (noscript fallback) · `public/avatar/*` (new photo per §4) · `ExperienceTimeline` date chip nowrap.

## 6. QA acceptance criteria
1. At 320/375/414/768/1024/1280: **no horizontal scroll** (`scrollWidth === innerWidth`); footer contact rows left-aligned — label left edges identical across rows and address left edges identical (Δx = 0); at ≥1024 label and address baselines equal (±1px).
2. Footer ≥640 is 2-col, ≥1024 is 3-col per §2; Explore at <640 wraps in ≤2 lines; back-to-top FAB never overlaps footer text at any width (bounding boxes don't intersect).
3. Every interactive footer/contact target ≥44×44.
4. Work email is first, has the "Preferred" badge, and is the hero mailto; Personal second. `grep` of `out/` finds no phone/address strings.
5. Emulate touch @375 with `reducedMotion:'no-preference'`: after full scroll, **zero** elements with computed opacity <0.1 and height >20px other than decorative ping rings; ≥10 running animations in hero; avatar transform changes between two samples 1.5s apart.
6. Same with `reducedMotion:'reduce'`: content fully visible, avatar float (≤5px) still present in `gentle`, no ring spin, no parallax; with `localStorage.motion='off'` nothing moves; footer Motion control works by keyboard and persists.
7. Block JS (`javaScriptEnabled:false`): all sections readable (noscript rule).
8. Throttle CPU 4× + 3G: content that is in the viewport is visible within 3s (failsafe).
9. New avatar: lowercase filename, file size within budget, loads under `/profile/` subpath, correct state (`data-avatar-state`), passes §4 eyeball checklist in both themes.
10. Date chips on timeline don't break mid-token at 320/375.
11. **WebKit run** (Playwright `webkit`, device `iPhone 15 Pro Max` 430×932 DPR 3, `reducedMotion:'no-preference'`; `npx playwright install webkit`): after load + full scroll, no element with computed opacity <0.1 and height >20px (except ping rings); hero reaches its final state ≤ 1.5 s after `load`; avatar float (transform changes between samples 1.5 s apart) is running.
12. **Forbidden-effects scan (touch emulation):** in the hero/nav/marquee subtree, `getComputedStyle` shows no `filter` ≠ none, no `backdrop-filter` ≠ none, no `mask-image`/`-webkit-mask` ≠ none on any element that is animating or has an animating descendant, no `will-change` ≠ auto, no `transform-style: preserve-3d`, and `getAnimations()` contains no animation of `border-radius`/`box-shadow`/`filter`.
13. **Hidden-load test:** open the page with `visibilityState='hidden'` for 3 s (`page.evaluate` override / new background tab), then make visible: hero entrance still plays after becoming visible (opacity at +100 ms < 1) and ends within 1.2 s; no `Fragment` remount (document element count / avatar `<img>` node identity unchanged between hydration and first paint).
14. **Sticky-hover test:** tap the marquee; `getAnimations()` still shows the track `running`. Landscape 932×430 touch emulation takes the touch/mobile branch (no blur, no `slideX` 48 px, no hero scroll-linked styles).
15. At 360 / 390 / 430 / 768 (WebKit touch emulation) all 3 badges are visible, **inside** the viewport (`getBoundingClientRect()` left ≥ 8 and right ≤ innerWidth − 8), don't intersect the head rectangle, `scrollWidth === innerWidth`, and the `AvatarChips` list no longer exists (single `ul[aria-label="Highlights"]`).
16. Badges' computed transform changes between two samples 1.5 s apart (full tier); no `filter`/`backdrop-filter`/`mask` on badge or ring; the ring `<svg>` transform changes between samples; screenshot at 3 s shows a ring arc with a visible gap to the photo in **both** themes.

---
## 7. Hero glow rectangle + marquee box/jitter (user bug, ~1683×850 dark)

### 7.1 Root causes (from the geometry; not screenshot-reproduced)
| Symptom | Cause |
|---|---|
| Faint lighter rectangle, hard edges, lower-right of hero | `HeroAvatar` reuses the **page-level** `--glow-hero` inside a 130 % box (`.avatar-glow`). Those gradients (`60% 60% at 70% 30%`, `50% 50% at 15% 80%`, transparent at 70 % of radius) are sized for a full-bleed section and **still have alpha ≈ .06–.10 where the box ends** (gradient 1 reaches y = −12 % / x = 112 %, gradient 2 reaches x = −20 % / y = 115 %). The element box clips them → visible straight edges, and the ±20 px pointer parallax slides the edge around. The hero bg layer has the same flaw against the section's bottom edge (gradient 2 ends at y ≈ 114 %), and its `y: −40 px` scroll parallax exposes the layer's bottom edge. |
| Dark box behind the left-most chip | `.marquee::before/::after` are **opaque `--c-bg` → transparent overlays**. The marquee sits over the hero's sky glow/grid, so an opaque page-bg slab is visibly *darker* than what is behind it. |
| Marquee "a bit off" | 40 s loop with a fractional `-50% − .25rem` end point (sub-pixel snap at the wrap), hard-edged opaque chips sliding under a coloured slab, and pause-on-hover with no easing. |

### 7.2 Hero glow — intended look & implementation
**Look:** soft amber light behind/right of the photo and a faint sky tint low-left; **no edge of any kind is perceivable at any scroll position or pointer position, in both themes.** Nothing but the section's own edge ever clips a glow, and there it must already be ≈ 0.
1. **Rule: every glow gradient must reach alpha 0 *inside* its element.** Use `radial-gradient(closest-side …, colour/α 0%, colour/0 100%)` (circle or ellipse, `closest-side`, last stop `100%` transparent). Centre ≥ 1 radius from every edge of the element — then clipping is impossible by construction. Never use `farthest-corner` defaults or `NN% NN% at X Y` sizes that overshoot the box.
2. **Do not reuse `--glow-hero` for the avatar.** Add `--glow-avatar` in `tokens.css`: `radial-gradient(closest-side at 50% 50%, rgb(var(--c-accent)/.35), rgb(var(--c-accent)/0) 100%), radial-gradient(closest-side at 64% 64%, rgb(var(--c-accent-2)/.30), rgb(var(--c-accent-2)/0) 100%)` (dark, per §4.5). Light theme: amber `.25` (use the light `245 165 36` value), sky `.30`. The `.avatar-glow` box stays 130 % of the avatar; the `bg-glow-hero opacity-90` class on it is replaced by `bg-glow-avatar`. Keep the opacity-only CSS pulse; no `filter: blur()` anywhere (iOS Safari rasterises a huge layer and clips it to a rectangle — exactly this bug class).
3. **Hero bg layer (`HeroClient`)**: redefine/replace `--glow-hero` with `closest-side` gradients, e.g. amber `closest-side` ellipse centred ~(72 %, 38 %) with radius ≤ 38 % of the section so it is 0 well before the section's edges; sky one centred ~(18 %, 62 %), radius ≤ 30 %. Same token feeds Contact/Projects/Blog cards (they are `overflow-hidden rounded` boxes) — closest-side makes them safe too; re-check their look after the change.
4. **Parallax must not expose edges:** make the translated layer taller than the section: `-inset-y-12` (48 px each side) instead of `inset-0`, so `y ∈ [−40, 0]` never reveals a layer edge; section keeps `overflow-hidden`. Mobile/touch: no scroll-linked `y` at all (already §3.4).
5. **Verification:** screenshot hero at 1683×850, 1280×800, 390×844, dark + light, at scrollY 0 and mid-hero, then run a pixel-edge scan (or just eyeball with levels/contrast ×4): no straight luminance step > 1.5 /255 along any line within the hero. Also pointer at all four corners of the avatar (glow shifts ±20 px) — still no edge.

### 7.3 Skills marquee — intended look & implementation
**Look:** a single row of quiet pill chips drifting left, fading smoothly into the page at both ends; the strip has **no background, border or shadow of its own**, so the hero glow shows through it untouched. Pausing/reduced-motion behaviour unchanged (§3, `gentle`/`off` → static wrapped row, no fade).
1. **Remove the `::before/::after` opaque overlays.** Fade with a mask on the *clipping wrapper* instead (it shows whatever is behind, so it can never mismatch):
   ```css
   @media (hover:hover) and (pointer:fine) {
     .marquee { -webkit-mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
                mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
                -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-size: 100% 100%; mask-size: 100% 100%; }
   }
   ```
   Always write the `-webkit-` form **and** the standard form; mask goes on the static `.marquee`, never on the animated `.marquee-track`. Use 8 % (≈ 64 px at desktop) not 10 % of a variable width: `clamp`-style `transparent, #000 clamp(24px,8%,72px)` is fine too.
   **Touch / coarse pointer: no mask and no overlay** (keeps §6 #12: no `mask-image` on an element with an animating descendant on touch/WebKit). The chips simply clip at the container edge, with the container given `padding-inline: 0` and the hero's own gutter outside it. `gentle`/`off` tiers: no mask (static wrapped row).
2. **Chip styling inside the marquee** (`.marquee .chip`): `background: rgb(var(--c-surface-2) / .6)`, `border: 1px solid rgb(var(--c-border) / .9)`, `color: rgb(var(--c-fg-muted))`, `backdrop-filter: none`, no shadow. Reads as outlined pills on the glow in dark, and as light-grey pills (surface-2 ≈ white-ish at .6 over the warm tint) in light — ≥ 4.5:1 text contrast must still hold on both (muted text on blended surface; check, bump to `--c-fg` if < 4.5). Non-marquee `.chip` usage keeps the opaque style.
3. **Seamless loop with no sub-pixel jump:** make the two halves identical *including trailing gap*. Render two groups (`<ul class="marquee-group">` ×2, second `aria-hidden`, both `display:flex; gap:.5rem; padding-right:.5rem; flex:none`) inside `.marquee-track{display:flex;width:max-content}` and animate `transform: translate3d(-50%,0,0)` exactly (no `− .25rem` fudge). Keyframes `from{transform:translate3d(0,0,0)} to{transform:translate3d(-50%,0,0)}`; `will-change` stays unset (§6 #12) — a 2D/3D translate alone gets its own layer. Ensure the track is **wider than the viewport** (one group ≥ 100 % of the largest container, ≈ 1100 px; at 9 chips ≈ 1400 px OK — if a wider screen ever shows the end, repeat the list again and keep the `-50%` maths per pair of identical groups).
4. **Speed:** constant ≈ **40–45 px/s** regardless of width. One group ≈ 1400–1500 px → `animation: marquee 34s linear infinite`. Mobile (narrower chips are the same size) keep the same duration. Pause on hover/focus only for fine pointers (already), with no easing needed; resume must not jump (`animation-play-state` toggling is fine).
5. **A11y/behaviour:** the duplicate group is `aria-hidden` and not focusable; `aria-label="Core technologies"` stays. `html[data-motion=gentle|off]` and the OS reduce-motion fallback: hide the duplicate group, `flex-wrap: wrap`, `transform:none`, no mask.
6. **Verification:** at 1683×850 dark and light, screenshot the strip at t = 0, 17 s and just after the wrap: no seam, no chip jump between two frames 16 ms apart at the wrap point (compare track `getBoundingClientRect().x` ≈ 0 ↔ −½ width), and the leftmost fading chip has **no darker rectangle** behind it (sample a pixel row 2 px above the chips vs 2 px below the strip at x = 0–60: equal within 1–2/255). Touch emulation: `getComputedStyle(.marquee).maskImage === 'none'` and no `::before/::after` content.

### 7.4 Files
`src/app/tokens.css` (`--glow-hero` closest-side, new `--glow-avatar`) · `tailwind` `bg-glow-avatar` utility (wherever `bg-glow-hero` is registered) · `HeroAvatar.tsx` (use `bg-glow-avatar`) · `HeroClient.tsx` (glow layer `-inset-y-12`) · `TechMarquee.tsx` (two groups) · `globals.css` (`.marquee` mask, drop pseudo overlays, `.marquee .chip`, keyframes).
