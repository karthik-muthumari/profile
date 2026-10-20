# Visual design spec — Karthik Muthumari portfolio ("Ember & Ink")

Entry point for `frontend-dev`. Static Next.js export (App Router, Tailwind, Framer Motion). Owner: `designer`. Privacy: **do not render the phone number or home address** from the CV anywhere.

## Files
| File | Contents |
|---|---|
| `tokens.css` | **Copy into the app.** Dark + light CSS variables (RGB channels), fluid type, spacing, radii, shadows, gradients, focus ring, theme cross-fade, grain, avatar keyframes |
| `tailwind.theme.extend.js` | Tailwind `theme.extend` mapping (colours w/ alpha, fonts, font sizes, radii, shadows, keyframes). Comments explain v3 vs v4 |
| `01-tokens.md` | Palettes + verified contrast, typography table, `next/font/google` setup, spacing, radii, elevation |
| `02-layout.md` | Grids/containers per breakpoint; Nav, Footer, Hero, Experience, Projects, Blog roll + post |
| `03-components.md` | Content hierarchy, states, responsive rules for every section; **Hero avatar slot (§3.1)**; buttons |
| `04-motion.md` | Framer Motion variants/springs/staggers, hover/tap, timeline draw-in, route transitions, theme toggle, scroll-linked, reduced-motion fallbacks |
| `05-accessibility.md` | Contrast, focus, semantics, motion, QA checklist |
| `06-contact-update.md` | **Addendum:** two emails (Personal = primary CTA, Work), LinkedIn, GitHub; ContactCard + copy-to-clipboard, per-breakpoint layout, nav/hero/footer CTAs, a11y names. Supersedes email placeholders elsewhere |

## Look in one paragraph
Deep ink background (`#0B0D12`) with warm saffron (`#FFB547`) accents and a sky-blue counter-accent; light theme is warm paper (`#FBF8F2`) with burnt-amber text accents. Headlines in Bricolage Grotesque (tight, large) with a single Instrument Serif *italic* word per heading; Inter body; JetBrains Mono for dates/tech chips. Soft radial amber/sky glows, a faint masked grid, film grain, glass chips, pill buttons, spotlight-follow cards, a scroll-drawn gradient timeline line.

## Page structure (home `/`)
Nav → **Hero** (avatar slot) → Stats strip → **Experience timeline** → Skills → **Projects grid** → **Blog** (latest 3) → Awards & Education → Contact → Footer. Routes: `/`, `/blog`, `/blog/[slug]`, `404`.

## Key decisions at a glance
- Theme: `data-theme` on `<html>`, default dark, follows OS until toggled, persisted in `localStorage('theme')`, no-flash inline script (04 §9). Use semantic Tailwind classes (`bg-bg text-fg bg-surface border-line text-accent`), not `dark:` variants.
- **Hero avatar slot:** ONE config file `components/hero/avatar.config.ts` → `public/avatar/pixar-avatar.webp` (transparent, 1:1, ≥1200px; `.png`/video/Lottie also supported via `kind`). Fallback = cropped real photo `public/avatar/karthik-fallback.jpg` made from a downscaled `pics/DSC03212.JPG` (face-centred square). Sizes 280/320/360/440/520 px. Blob-masked photo fallback; unmasked, ring-overlapping when a transparent Pixar asset is present. Details: `03-components.md` §3.1.
- Motion: `MotionConfig reducedMotion="user"`, constants in `lib/motion.ts` (copy from 04 §1), entrances via `whileInView` + `viewport={{once:true, amount:.2}}`, transform/opacity only.
- Fonts: `Bricolage_Grotesque`, `Inter`, `Instrument_Serif`, `JetBrains_Mono` from `next/font/google` (self-hosted at build → fine for static export).
- Always prefix asset URLs with `NEXT_PUBLIC_BASE_PATH` (GitHub Pages subpath), including avatar paths and CSS `url()`s (the grain overlay is an inline data-URI, so it's safe).

## Implementation order suggestion
1. `tokens.css` + Tailwind mapping + fonts + theme provider/toggle/no-flash script. 2. `lib/motion.ts`, `MotionConfig`. 3. Nav/Footer/Hero (+avatar slot). 4. Experience timeline. 5. Projects grid. 6. Blog roll + post. 7. Route transitions. 8. a11y pass against `05`.

Questions → message `designer`.
