# 03 · Component specs

Home page order: **Nav → Hero → About strip (stats) → Experience → Skills → Projects → Blog (latest 3) → Awards & Education → Contact → Footer.**
Content comes from `docs/Karthik_Muthumari_CV.txt`. **Never render phone or address.** Contact CTA: `mailto:` placeholder (email TBC) + GitHub/LinkedIn placeholders.

---
## 3.1 Hero  ★ with Pixar avatar slot

### Content hierarchy
1. Eyebrow chip: pulsing green dot + "Open to interesting problems" (micro caps) — *placeholder wording, editable*.
2. Display H1: `Hi, I'm Karthik` line 1; line 2: `Full-stack engineer` where "*engineer*" is Instrument Serif italic + `.text-gradient`.
3. Lead (max 52ch): "13+ years building resilient, accessible web platforms — React, Next.js, Node.js, GraphQL and serverless AWS — for retail, fintech and healthcare." (CV: Wipro 8.5 + Mindera 5 ≈ 13.5 yrs.)
4. CTA row: **Primary** "View my work" (grad-accent pill, `↓` icon) → `#projects`; **Secondary** "Read the blog" (outline pill, `border-line-strong`) → `/blog`; **Tertiary** icon buttons GitHub / LinkedIn / Mail (44×44, ghost).
5. Tech marquee (below CTAs, mask-fade edges): React · Next.js · Node.js · GraphQL · Apollo Federation · AWS (Certified Solution Architect) · CDK · Terraform · Playwright — mono chips, infinite slow marquee (40s linear; pauses on hover; static wrapped row under reduced motion).
6. Floating mini-badges around the avatar (desktop only, decorative `aria-hidden`): "AWS Certified", "13+ yrs", "IBM Hackathon Winner" — glass chips (`bg-surface/70 backdrop-blur border-line rounded-pill px-3 py-1.5 text-small`) each with own float offset.

### ★ AVATAR SLOT (high-visibility, swappable)

**Component:** `components/hero/HeroAvatar.tsx`. Single source path constant — change ONE line to swap:
```ts
// components/hero/avatar.config.ts   <<< THE ONE PLACE TO SWAP THE AVATAR >>>
export const AVATAR = {
  // 1. Pixar-style asset (drop file into public/avatar/ — first that exists wins; see resolution below)
  //    Recommended: transparent WebP/PNG 1200×1200 (or 1:1), subject centred with head at ~35% from top.
  src: '/avatar/pixar-avatar.webp',   // alt supported: pixar-avatar.png | .webm/.mp4 (video) | .json (Lottie)
  kind: 'image' as 'image' | 'video' | 'lottie',
  // 2. Fallback = real photo crop (temporary). Frontend-dev creates this from pics/DSC03212.JPG:
  //    sips -Z 1200 → crop square around the face → public/avatar/karthik-fallback.jpg (<250KB, quality ~82)
  fallbackSrc: '/avatar/karthik-fallback.jpg',
  alt: 'Illustrated portrait of Karthik Muthumari',
  fallbackAlt: 'Portrait photo of Karthik Muthumari',
}
```
Resolution: render `<img src={withBasePath(AVATAR.src)}>`; `onError` → swap to `fallbackSrc` and set `data-avatar-state="fallback"`. Because export is static, the check is client-side only; also allow build-time check script (frontend-dev optional: `fs.existsSync('public/avatar/pixar-avatar.webp')` → set `NEXT_PUBLIC_AVATAR_READY`). Always prefix with basePath (GitHub Pages subpath).

**Photo choice for fallback:** `pics/DSC03212.JPG` (4000×4000 square, face centred upper-middle, warm autumn bokeh that matches the amber palette). Crop: square, centre ≈ (50%, 42%) of the frame, subject occupying ~70% of height. Alt choices: `DSC03127.JPG` (landscape 6000×3376; crop 3376² around x≈43%) and `DSC01768.JPG` (portrait full-body; crop head+shoulders from top 35%, blue sky background — good for the cooler light theme). Do **not** copy originals; use downscaled copies only.

**Frame & shape**
- Aspect ratio **1 : 1** (square box), visually masked as an organic **blob** (`border-radius: var(--r-blob)`, `animation: blob-morph 10s ease-in-out infinite` — static shape under reduced motion). When a transparent Pixar PNG is dropped in (`data-avatar-state="primary"`), the blob mask is **removed** (`overflow: visible`, `object-fit: contain`) so the character can pop out of the ring (head/shoulders overlapping the ring's top edge by ~8%). Fallback photo state keeps the blob mask + `object-fit: cover; object-position: 50% 30%`.
- Sizes: see table in 02 — **280 / 320 / 360 / 440 / 520 px** (mobile / sm / tablet / desktop / wide). Use CSS `width: clamp(260px, 38vw, 540px)` with `aspect-ratio: 1`; ≥1024: `clamp(400px, 36vw, 540px)`.
- Position: mobile — top, centred above text; desktop — right column, vertically centred, nudged 2% up; ≥1280 overlaps the container edge by 24px so it feels large.

**Layers (back → front)**
1. `.avatar-glow` — radial blob `--glow-hero`-style, 140% of box, `blur(40px)`, opacity .9 dark / .7 light, subtle pulse (scale 1→1.08, 5s, ease-in-out, alternate).
2. `.avatar-ring` — 2px-wide conic gradient ring (`--grad-ring`) 108% of box, **rotating** (`ring-spin 14s linear infinite`), masked to a ring (`mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)`), plus a second dashed ring at 118% rotating reverse 40s at 25% opacity (desktop only).
3. `.avatar-plate` — surface disc behind the character: `bg-surface-2`, inner shadow, same blob radius (gives a "sticker plate" look under transparent PNGs).
4. `.avatar-media` — image/video/Lottie.
5. `.avatar-badges` — floating glass chips (desktop), each `animate y: [0,-8,0]` with phases 0 / 1.2 / 2.4s.
6. Dev-only marker (when `process.env.NODE_ENV !== 'production'` or `?avatar-debug`): dashed outline + corner label **"AVATAR SLOT · public/avatar/pixar-avatar.*"**, and in fallback state an always-visible tiny caption under the frame is NOT shown in production.

**Idle float animation (Framer Motion, on the whole stack):**
```ts
animate={{ y: [0, -14, 0], rotate: [-0.6, 0.6, -0.6] }}
transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
```
Mobile amplitude −8px. `prefers-reduced-motion`: no float/rotate/ring-spin/blob-morph — static ring, static shape.
**Pointer parallax (desktop, fine pointer only):** avatar-media translates ±10px / rotates ±3° following cursor (`useMotionValue` + `useSpring({stiffness:120, damping:18})`); glow moves ±20px opposite. Disabled on touch & reduced-motion.
**Entrance:** scale .85→1 + opacity 0→1 + blur(12px→0), spring `{stiffness:120,damping:16}`, delay .15s (see 04).
**Hover:** scale 1.03 spring; ring speeds to 6s.
**Click/tap (easter egg, optional):** quick wiggle `rotate [0,-6,6,-3,0]` 0.5s. Video/Lottie kind: play on mount, loop, `muted playsInline`, `poster`=fallbackSrc; pause when offscreen (IntersectionObserver) and under reduced motion show poster frame only.
**A11y:** `alt` text from config; decorative layers `aria-hidden`; glow/ring never convey info. Image `width/height` attrs set (no CLS), `priority`/`fetchPriority="high"` (LCP).
**LCP/perf:** fallback ≤ 250KB WebP/JPG; Pixar asset ≤ 400KB WebP (or ≤1.5MB webm).

### Hero background
`--glow-hero` radial blobs (absolute, parallax -40px over hero scroll); fine 1px grid pattern `bg-[linear-gradient(to_right,rgb(var(--c-border)/.35)_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--c-border)/.35)_1px,transparent_1px)] bg-[size:64px_64px]` masked with radial fade (`mask-image: radial-gradient(ellipse at 50% 40%, #000 20%, transparent 70%)`). Plus `.grain`.

### Hero states & responsive
- Mobile: avatar first, then eyebrow/H1/lead/CTAs full-width stacked buttons (primary 100%, secondary 100%, `h-12`), marquee after. Badges hidden.
- Tablet: two columns, CTAs inline.
- Desktop+: as above; scroll cue visible.

---
## 3.2 Navigation
Link states: default `text-fg-muted`; hover `text-fg` + underline slide (scaleX 0→1 from left, 200ms); active page `text-fg` with shared pill `bg-surface-2` behind (`layoutId`), `aria-current="page"`. Scroll-spy on home highlights section in view. Theme toggle: 40×40 icon button (sun/moon morph), `aria-label="Switch to light theme"`/dark, `aria-pressed` not needed (label changes). Logo: monogram "KM" in `rounded-md bg-grad-accent text-accent-ink font-display`, hover rotates −6° spring.
Mobile menu: hamburger → X morph (lines animate rotate ±45 / opacity). Items stagger. Focus trap; return focus to button on close.
Skip link: "Skip to content" visually hidden until focus; top-left pill, z-100.

## 3.3 Section header (shared)
`Eyebrow` (micro caps, `text-accent`, preceded by 24px × 2px grad-accent bar, e.g. "01 — EXPERIENCE") → H2 (with one serif-italic word) → optional lead `text-fg-muted max-w-[56ch]`. Header words reveal (see 04 `headingReveal`).

## 3.4 About strip (stats)
Row of 4 stat tiles: `13+` years · `2` employers · `AWS` Certified Solution Architect · `🏆` IBM Hackathon winner (use lucide icons, not emoji). Mobile 2×2, desktop 4×1. Tile: `bg-surface border-line rounded-md p-5`, number in `font-display text-h2` gradient, label `text-small text-fg-muted`. Numbers count up (0→target, 1.2s) when in view; reduced motion = final value.

## 3.5 Experience timeline
**Employer node** (Mindera; Wipro): large pill on the line: logo-less monogram circle + company H3 + role + duration chip "Sep 2021 – Present · 5 yrs". "Present" has a pulsing success dot.
**Project card** (`TimelineCard`): `bg-surface border border-line rounded-lg p-6 md:p-7`.
- Top row: client name (H3), sector tag (micro caps, e.g. "Retail / E-Commerce"), date range in mono `text-fg-subtle`.
- Role line (Inter 500) e.g. "Senior Engineer · 3 months".
- Summary: 2–3 lines clamped (`line-clamp-3`) with "Read more" toggle (button, `aria-expanded`) that expands via `height:auto` animation to show full bullet list from CV.
- Tech chips (mono pills), max 6 visible + "+N" chip.
- Left 3px accent edge appears on hover (scaleY 0→1).
- States: rest / hover (lift −4px, border→`accent/40`, `shadow-md`) / focus-within (focus ring on the toggle) / expanded.
**Timeline line:** 2px `bg-line`, with an overlay progress line `bg-grad-accent` that fills as the user scrolls (scroll-linked `scaleY`, see 04). Dots: 12–16px circle `bg-bg border-2 border-line-strong`; once reached turn to `bg-grad-accent` with `shadow-glow` + ping ring.
Data order (reverse-chronological): Mindera → Kingfisher (Tax Engine; Basket Orchestrator) → Selfridges (PLP; Pricing; VIP; Personal Shopper); Wipro → Capital One (Quick Check; CreditWise) → US LBM (Hines Supply) → Coach (Visual Merchandising) → Cardinal Health (Pack Manager).

## 3.6 Skills
Grouped chip clusters (Frontend · Backend · Cloud & IaC · DevOps & Testing · Mobile · AI tooling [Claude Code, Co-Pilot, Cursor, OpenSpec SDD]). Group card with H4 + chips. Desktop 3-col masonry-ish grid (`grid-cols-3`), tablet 2, mobile 1. Chip hover: bg→`accent/12`, border→`accent/50`, translateY −2px.

## 3.7 Projects grid — `ProjectCard`
Anatomy: media area (16:9, `rounded-md`; gradient + large monogram/glyph by default — no screenshots needed) → tags → H3 → 2-line description → footer (tech chips left, `↗` arrow button right). The whole card is ONE link (stretched `<a>` via `::after`) with the arrow as visual cue; additional links (repo, live) are real buttons above it in z-order.
States: rest · hover (card lift −6px, spotlight radial gradient following cursor `radial-gradient(400px at var(--mx) var(--my), rgb(var(--c-accent)/.14), transparent 60%)`, media scale 1.05, arrow translates +4/−4 and rotates 0°→−0°; no rotate) · focus-visible (3px focus ring on card) · active/tap (scale .985) · loading (skeleton shimmer if any async) · featured (`shadow-glow`, 2-col span on lg).
Content seed (from CV, frontend-dev may refine): Tax Engine (Kingfisher), Basket Orchestrator (Kingfisher), PLP micro-frontend (Selfridges), Event-driven Pricing platform (Selfridges), Quick Check (Capital One), local RAG knowledge-retrieval tooling (LanceDB + BM25 + RRF).

## 3.8 Blog
**`PostCard`**: date (mono small) + reading time, H3 title (2 lines max), excerpt (3 lines `text-fg-muted`), tags, "Read →" link text that gains underline + arrow shift on hover. Card same hover as ProjectCard. Featured: large with gradient glyph panel. **Empty state:** illustration-less message "First post coming soon" + subscribe-free copy. **Post page**: see 02; reading progress bar; share/copy-link button (clipboard, toast "Link copied", `role="status"`); prev/next cards.

## 3.9 Buttons & links
| Variant | Rest | Hover | Active | Focus | Disabled |
|---|---|---|---|---|---|
| Primary | `bg-grad-accent text-accent-ink font-semibold h-12 px-6 rounded-pill shadow-sm` | `shadow-glow`, brightness 1.05, translateY −2px, arrow icon +3px | scale .97 | 3px focus ring, offset 3px | opacity .5, no pointer |
| Secondary | `border border-line-strong text-fg rounded-pill h-12 px-6 bg-transparent` | `bg-surface-2 border-accent/60` | scale .97 | ring | same |
| Ghost icon | 44×44 `rounded-pill text-fg-muted` | `bg-surface-2 text-fg` | scale .92 | ring | same |
| Text link | `text-accent underline-offset-4 decoration-accent/40` | `text-accent-hi` decoration full | — | ring | — |
Min tap target 44×44 everywhere.

## 3.10 Misc
- **Theme toggle**, **tooltips** (none; use labels), **toasts** (bottom centre, `bg-surface-2`, 3s).
- **404 page**: Display "404" with gradient, link home; static export `404.html`.
- **Back-to-top**: appears after 600px scroll; 44px circle bottom-right 24px.
