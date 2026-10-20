# 05 · Accessibility notes (target WCAG 2.2 AA)

## Contrast
All token pairs verified (see 01 §1). Rules for implementers:
- Body/long text: `text-fg` or `text-fg-muted` on `bg`, `surface`, or `surface-2`. `text-fg-subtle` only ≥14px on those same surfaces.
- Accent text: use `text-accent` (it auto-darkens in light mode). **Never** put `#FFB547`/`#F5A524` as text on the light background (2:1) — only as fill with `text-accent-ink`.
- `.text-gradient` passes at every stop in both themes; keep it to large (≥24px) display text only.
- Text over images/glow (hero): glows are ≤ .28 alpha, verified not to drop `text-fg` below 7:1; if a photo is ever behind text, add a `bg-bg/70` scrim.
- Glass chips: ensure `bg-surface/70` over blur still gives ≥4.5:1 for text; use `/85` if unsure.
- Non-text UI (input borders, icon buttons, focus ring, chart-ish dots) ≥ 3:1: use `border-line-strong`; `border-line` hairlines are decorative only.

## Focus
- Global: `:focus-visible { outline: 3px solid rgb(var(--c-focus)); outline-offset: 3px }` (in tokens.css). Never `outline:none` without replacement.
- Cards that are links: ring on the card (outline radius follows `rounded-md/lg`).
- Skip link first in DOM; `<main id="main" tabIndex={-1}>`.
- Mobile menu: focus trap, Esc closes, focus returns to trigger, `aria-expanded`, `aria-controls`; background inert (`inert` attr) while open.
- After route change focus main + live-region title announcement.
- Tab order = visual order (hero avatar/badges are decorative and not focusable; on mobile avatar appears first visually *and* in DOM only if it's `aria-hidden`/decorative — otherwise keep DOM text-first and reorder with CSS `order`).

## Semantics
- One `<h1>` per page (Hero name; post title on post pages). Sections use `<section aria-labelledby>` + h2; project/job titles h3.
- Landmarks: `header/nav[aria-label="Primary"]/main/footer`. Timeline = `<ol>` with `<li>` per entry (decorative line/dots `aria-hidden`); dates in `<time datetime>`.
- Marquee duplicate `aria-hidden`; badges around avatar `aria-hidden`; split-word headings keep full text in `aria-label`.
- Stretched-link cards: single link name = the title; no nested interactive inside link (extra links above via z-index, as siblings).
- Icon-only buttons have `aria-label`. External links `rel="noopener noreferrer"` + visually hidden "(opens in new tab)".
- Theme toggle announces target state via label; colour scheme meta `<meta name="color-scheme" content="dark light">` and `theme-color` per scheme.
- Language `<html lang="en">`. Images have meaningful `alt` (avatar) or `alt=""` (decorative). Code blocks focusable (`tabIndex=0`) for keyboard scroll with `aria-label`.

## Motion
- `MotionConfig reducedMotion="user"` + CSS `prefers-reduced-motion` (tokens.css) + per-feature fallbacks in 04 §11.
- No flashing >3/s; no autoplaying motion >5s without pause: the infinite avatar float/ring/marquee are decorative — marquee pauses on hover/focus and a visually-unobtrusive pause control is NOT required if it is `aria-hidden` decorative and static under reduced motion (WCAG 2.2.2 exception: ok if non-essential; to be safe, stop marquee after 3 loops on touch).
- Animated entrances must never hide content from non-JS/assistive tech: SSR renders final-state content; `initial="hidden"` styles apply client-side only (use `initial={false}` when JS disabled isn't possible; at minimum ensure content is in DOM and readable).
- Don't rely on hover: all hover info reachable by focus/tap.

## Touch & responsive
Targets ≥44×44 (24px min per 2.5.8, aim 44). Support 200% zoom and 320px reflow with no horizontal scroll; text resizable (rem units, clamp uses rem). Respect `env(safe-area-inset-*)` on sticky nav/footer for notched phones.

## Quick QA checklist (for `qa`)
1. Tab through the home page: visible focus ring on every interactive element, logical order.
2. Toggle OS "reduce motion": no float/spin/parallax, content visible, no layout jump.
3. Axe/Lighthouse a11y ≥ 95 in both themes.
4. 200% zoom & 320px width: no clipping/overlap; hero avatar scales down (min 260px).
5. Light theme: all accent text uses burnt amber (≥4.5:1).
6. Keyboard: open/close mobile menu, Esc, focus return; "Read more" toggles with Enter/Space.
