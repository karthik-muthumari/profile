# 01 · Design tokens

Source of truth in code: `tokens.css` (CSS vars) + `tailwind.theme.extend.js` (Tailwind mapping). This page documents values and usage. Copy both files into the Next app (e.g. `app/tokens.css` imported from `app/globals.css`; `tailwind.config` requires/pastes the extend object).

Concept **"Ember & Ink"**: saffron/amber accent over deep ink (dark) or warm paper (light), with a sky-blue counter-accent. Sampled from the photos (mustard jacket, autumn leaves, blue sky). Dark is the default; OS preference is honoured until the user toggles (stored in `localStorage['theme']`).

## 1. Colour (hex for reference; code uses RGB channels `--c-*` → `rgb(var(--c-x) / <alpha>)`)

| Role | CSS var | Tailwind | Dark | Light |
|---|---|---|---|---|
| Page background | `--c-bg` | `bg-bg` | `#0B0D12` | `#FBF8F2` |
| Card / panel | `--c-surface` | `bg-surface` | `#12151C` | `#FFFFFF` |
| Raised / hover | `--c-surface-2` | `bg-surface-2` | `#1A1E28` | `#F3EEE4` |
| Hairline (decorative) | `--c-border` | `border-line` | `#262B38` | `#E4DDCF` |
| Control border (≥3:1) | `--c-border-strong` | `border-line-strong` | `#6C758B` | `#857E6D` |
| Text | `--c-text` | `text-fg` | `#EDEBE6` | `#14161C` |
| Muted text | `--c-muted` | `text-fg-muted` | `#A3A9B8` | `#545B6B` |
| Subtle text (captions) | `--c-subtle` | `text-fg-subtle` | `#8A91A3` | `#5E6574` |
| Accent (text/links/icons) | `--c-accent` | `text-accent` | `#FFB547` | `#9A5200` |
| Accent hover text | `--c-accent-hi` | `text-accent-hi` | `#FFD28A` | `#783E00` |
| Accent fill end / light fill | `--c-accent-lo` | `bg-accent-lo` | `#FF8A3D` | `#F5A524` |
| Text on accent fill | `--c-on-accent` | `text-accent-ink` | `#1A1204` | `#1A1204` |
| Counter-accent (sky) | `--c-accent-2` | `text-sky` | `#5CC8FF` | `#0B6A9C` |
| Focus ring | `--c-focus` | `ring-focus` | `#7DD3FF` | `#0B5FFF` |
| Success | `--c-success` | `text-success` | `#4ADE80` | `#157F3B` |
| Code block bg | `--c-code-bg` | `bg-code` | `#10131A` | `#F6F1E8` |

**Rule:** accent *text* uses `--c-accent` (it flips to burnt amber in light for contrast). Accent *fills* (buttons, chips, timeline dots) use `bg-grad-accent` with `text-accent-ink` in both themes.

### Verified contrast (WCAG 2.x, computed)
Dark (on bg / surface / surface-2): text 16.3/15.3/14.0 · muted 8.3/7.8/7.1 · subtle 6.2/5.8/5.3 · accent 11.1/10.4/9.5 · sky 10.3/9.7/8.9 · control-border 4.2/4.0/3.6 · ink-on-accent-fill 10.6 (7.9 at gradient end).
Light (on bg / surface / surface-2): text 17.1/18.1/15.6 · muted 6.4/6.8/5.9 · subtle 5.5/5.9/5.1 · accent 5.5/5.9/5.1 · sky 5.6/5.9/5.1 · control-border 3.8/4.0/3.5 · ink-on-amber-fill 9.1 · focus ring 4.8.
All text pairs ≥ 4.5:1 (AA); UI borders/focus ≥ 3:1. Hairline `--c-border` is decorative only (never the sole indicator of a control).

### Gradients & glow
| Token | Use |
|---|---|
| `--grad-accent` | primary button fill, timeline dots, progress bar, active tab underline |
| `--grad-text` | `.text-gradient` on ONE key headline word (hero name highlight, section keyword) |
| `--grad-ring` | conic ring around avatar (rotates, 14s linear) |
| `--glow-hero` | two radial blobs behind the hero (amber top-right, sky bottom-left); absolutely positioned, `pointer-events:none`, parallax-linked (see 04) |
| `--shadow-glow` | hover state of featured cards, avatar halo |
| `.grain` | fixed full-screen noise overlay (opacity .06 dark / .035 light) for a tactile premium feel |

## 2. Typography

Fonts via `next/font/google` (all variable, all available):

```ts
// app/fonts.ts
import { Bricolage_Grotesque, Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
export const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage', display: 'swap', axes: ['opsz'] })        // weights 200-800 variable
export const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })                                           // variable
export const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-instrument-serif', display: 'swap' })
export const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' })
// <html className={`${bricolage.variable} ${inter.variable} ${instrumentSerif.variable} ${jetbrains.variable}`}>
```

| Style | Family | Weight | Size (360 → 1440) | Line-height | Tracking | Tailwind |
|---|---|---|---|---|---|---|
| Display (hero name) | Bricolage | 700 | `clamp(2.75rem,1.55rem+5.2vw,6rem)` 44→96 | .98 | -0.035em | `text-display font-display` |
| H1 (post title, page title) | Bricolage | 700 | `clamp(2.25rem,1.55rem+3.1vw,4rem)` 36→64 | 1.05 | -0.03em | `text-h1 font-display` |
| H2 (section titles) | Bricolage | 700 | `clamp(1.75rem,1.30rem+2vw,2.75rem)` 28→44 | 1.12 | -0.025em | `text-h2 font-display` |
| H3 (card/job title) | Bricolage | 600 | `clamp(1.375rem,1.17rem+.9vw,1.875rem)` 22→30 | 1.2 | -0.015em | `text-h3 font-display` |
| H4 | Bricolage | 600 | `clamp(1.125rem,1.05rem+.35vw,1.3125rem)` 18→21 | 1.3 | 0 | `text-h4 font-display` |
| Lead (hero subtitle, intro) | Inter | 400 | `clamp(1.125rem,1.04rem+.4vw,1.375rem)` 18→22 | 1.55 | 0 | `text-lead` |
| Body | Inter | 400 (500 for emphasis) | `clamp(1rem,.96rem+.18vw,1.0625rem)` 16→17 | 1.65 | 0 | `text-body` |
| Small / meta | Inter | 400/500 | 14px | 1.5 | 0 | `text-small` |
| Eyebrow / tag / date | Inter | 600, UPPERCASE | 12px | 1.4 | 0.14em | `text-micro uppercase` |
| Mono (code, tech chips, dates in timeline) | JetBrains Mono | 400/500 | `clamp(.8125rem,.78rem+.12vw,.9rem)` 13→14.4 | 1.7 | 0 | `text-mono font-mono` |
| Editorial flourish | Instrument Serif *italic* | 400 | inherits heading size, +8% | inherits | -0.01em | `font-serif italic` |

**Signature type move:** in Display/H1/H2 set ONE word per heading in Instrument Serif italic (e.g. "Building *reliable* systems") and, in the hero only, apply `.text-gradient`. Use `font-variation-settings: "opsz" 96` on display sizes (Bricolage optical size axis).
Measure: body paragraphs max `66ch`; blog prose `max-w-prose` (44rem ≈ 68ch at 17px).
Tabular numbers (`font-variant-numeric: tabular-nums`) for dates and stats.

## 3. Spacing scale (4px base)
`1=4 · 2=8 · 3=12 · 4=16 · 5=20 · 6=24 · 8=32 · 10=40 · 12=48 · 16=64 · 20=80 · 24=96 · 32=128 · 40=160`. Tailwind's default scale already matches (1 = .25rem); use the defaults. Additional: `py-section` = `clamp(4.5rem, 3rem+7vw, 9rem)` (72→144) vertical rhythm between sections; `px-gutter`.

## 4. Radii
`xs 6` (inline code, kbd) · `sm 10` (chips, inputs) · `md 16` (cards) · `lg 24` (feature cards, hero panels) · `xl 32` (avatar frame fallback, big media) · `pill` (buttons, tags, nav pill) · `blob` (avatar mask).

## 5. Elevation
Dark mode uses inset hairline + deep drop; light uses warm-tinted soft drop (see `--shadow-*`). Cards at rest: `shadow-sm` + 1px `border-line`. Hover: `shadow-md` (+`shadow-glow` for featured). Never use pure-black shadows in light mode.

## 6. Iconography & misc
Lucide (`lucide-react`) icons, stroke 1.75, 20px default / 16px in chips. External-link arrow `↗`. Tech chips: pill, `bg-surface-2`, `border-line`, mono 12px, text `fg-muted`.
Z-index: grain 0 · content 1 · sticky nav 50 · mobile menu 60 · skip-link 100 · toast 70.
