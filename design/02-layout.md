# 02 · Layout grids

## Breakpoints (Tailwind `screens` in the mapping)
| Name | Range | Tailwind | Container max | Columns | Gutter (col gap) | Page side padding |
|---|---|---|---|---|---|---|
| Mobile | 360–639 | base (design floor 360; must not scroll horizontally at 320) | 100% | 4 | 16 | 16 |
| Large mobile / small tablet | 640–767 | `sm` | 100% (content cap 600, centred) | 6 | 20 | 24 |
| Tablet | 768–1023 | `md` | 720 | 8 | 24 | 32 |
| Desktop | 1024–1279 | `lg` | 960→ 1024 usable (max-w container 72rem with gutters) | 12 | 24 | 40 |
| Wide | ≥1280 | `xl`/`2xl` | `max-w-container` 1152 (hero & projects may use `max-w-wide` 1280) | 12 | 32 | 40 (auto margins beyond max) |

Use `mx-auto w-full max-w-container px-gutter`. Beyond 1536px nothing grows further; backgrounds/glows may bleed to the edges. Sections are full-bleed `<section>` wrappers with the inner container.
Vertical rhythm: `py-section` between sections; section header block (eyebrow + H2 + lead) has `mb-10 md:mb-14`.

## Global frame
- **Nav** (sticky, `h-16`, z-50): full-width bar with `backdrop-blur-xl bg-bg/70 border-b border-line/60`; becomes `bg-bg/85` + `shadow-sm` after scrollY > 24. Inner container `max-w-wide`.
  - ≥768: logo wordmark left ("KM" monogram in a rounded square + "Karthik Muthumari" hidden below `lg`), links centre/right (Home, Experience, Projects, Blog, Contact), theme toggle at far right. Active link has an animated pill (shared `layoutId="nav-pill"`).
  - <768: wordmark + theme toggle + hamburger (44×44). Menu = full-screen sheet below the bar (`fixed inset-x-0 top-16 bottom-0`), links in `text-h2` stacked with 16px gaps, staggered in (see 04). Body scroll locked while open; `Esc` closes; focus trapped.
- **Footer**: border-top `border-line`, `py-12`. Desktop 12-col: brand+tagline (col 1–5), nav links (6–8), social/contact (9–12). Mobile: single column, 32px gaps. Bottom row: © year, "Built with Next.js, deployed on GitHub Pages", back-to-top button. **No phone/address.** Contact = email link placeholder (`mailto:` TBC) + GitHub/LinkedIn.

## Hero  (min-height `100svh − nav` on ≥768; auto on mobile with `pt-28 pb-16`)
| BP | Grid | Avatar |
|---|---|---|
| Mobile 360–639 | 1 col, **avatar first (order-1) centred above text**, text centred-left aligned *left*; gap 32 | 280×280 (min(72vw, 300px)) |
| `sm` 640–767 | 1 col, same, avatar 320×320 | 320 |
| Tablet 768–1023 | 2-col grid `1.1fr 0.9fr` (avatar kept prominent), gap 32, vertically centred | 360×360 |
| Desktop 1024–1279 | 12-col: text cols 1–7, avatar cols 8–12, align-items centre; avatar bleeds 24px past right container edge | 440×440 |
| Wide ≥1280 | same, text 1–7, avatar 8–12 | 520×520 (max 560 at ≥1536) |

Scroll cue (animated chevron + "Scroll") bottom centre at ≥768, hidden on mobile.

## Experience (timeline)
- Section header left-aligned; below it a vertical timeline.
- **Mobile (<768):** 1 col. Line at `left: 14px`, 2px wide; dots 12px on the line; cards `ml-10` full width. Date chip sits above the card title.
- **Tablet (768–1023):** same left-line layout, card max-w 640, left margin 56.
- **Desktop (≥1024):** centred line (`left-1/2`), cards alternate left/right (cols 1–5 / 8–12), date label on the opposite side of the line (cols 8–12 / 1–5) in mono. Row gap 48. Dots 16px with glow ring.
- Group structure (from CV): **2 employer groups** (Mindera 2021–Present; Wipro 2012–2021), each a large employer card header (company, role, duration "5 yrs"/"8.5 yrs"), and under each the client projects as nested cards (Kingfisher, Selfridges; Capital One, US LBM, Coach, Cardinal Health). On desktop, employer headers span the line centred (pill on the line); projects alternate.
- Below timeline: **Skills** band (see components) and **Awards/Education** two-up.

## Projects (grid)
| BP | Columns | Gap | Card |
|---|---|---|---|
| Mobile | 1 | 16 | full width, `min-h` auto |
| `sm` | 1 (or 2 if card min 280) → use `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]` | 20 | |
| Tablet | 2 | 24 | |
| Desktop | 3 (12-col, 4 span each); first/featured card spans 2 cols × 1 row (`lg:col-span-2`) when number of cards ≥ 5 | 24 | |
| Wide | 3 (same) at `max-w-wide` | 32 | |
Optional filter chips row above grid (All / Frontend / Backend / Cloud / AI) — `flex-wrap gap-2`, horizontally scrollable (`overflow-x-auto snap-x`, no wrap) on mobile.

## Blog
**Roll (`/blog`)**
- Header: H1 "Writing", lead. Container `max-w-container`.
- Mobile: 1 col list of cards (16 gap). Tablet: 2 cols. Desktop: featured latest post spans full row (12 cols: image/glyph cols 1–6, text 7–12), then 3-col grid beneath. Wide: same.
- Tag filter chips same as projects.
**Post (`/blog/[slug]`)**
- Hero block: back link, tags, H1 (`max-w-[20ch]`-ish; allow wrap), meta row (date · reading time · author avatar 32px).
- Body column `max-w-prose` (44rem = 704) centred on all breakpoints ≥768; at ≥1280 a sticky TOC (width 224) appears in the right margin (12-col: body cols 3–9, TOC cols 10–12); hidden below 1280.
- Prose styles (Tailwind typography plugin or custom `.prose`): H2 `text-h3` mt-12; H3 `text-h4`; links `text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent`; blockquote with 3px left `accent` bar + `font-serif italic text-lead`; inline code `font-mono bg-surface-2 px-1.5 py-0.5 rounded-xs`; code blocks `bg-code border border-line rounded-md p-4 overflow-x-auto text-mono`, language label top-right in micro caps; images `rounded-lg` full prose width, optional `-mx-4 md:-mx-12` bleed for wide figures.
- Bottom: prev/next post cards (2-col ≥768, stacked on mobile), then footer.
- Reading progress bar fixed under nav (scroll-linked, see 04).

## Contact strip (end of home page)
Full-width panel `rounded-xl bg-surface border border-line` with `glow-hero` backdrop; H2 "Let's build something", email button + GitHub + LinkedIn. Mobile stacked; ≥768 row with space-between.
