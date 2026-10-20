# 06 · Contact addendum

> **UPDATE (round 2, see `07-round2-fixes.md` §1): the WORK email is now the primary/preferred contact; Personal is secondary. Wherever this doc says Personal is primary, read Work.**
 (two emails + LinkedIn + GitHub)

Supersedes the "email TBC / placeholder" wording in 02 (Footer, Contact strip), 03 (§3.1 CTA row, §3.2 Nav, Contact). **Phone number and home address must NOT appear anywhere.** Only the four items below are published.

## Data (single source: `content/contact.ts` or similar)
```ts
export const CONTACT = {
  emails: [
    { id: 'personal', label: 'Personal', address: 'karthikmuthumari7@gmail.com',     aria: 'Email Karthik at personal address' },
    { id: 'work',     label: 'Work',     address: 'karthik.muthumari@mindera.com',    aria: 'Email Karthik at work' },
  ],
  linkedin: { label: 'LinkedIn', href: 'https://www.linkedin.com/in/karthikmuthumari/', aria: 'Karthik on LinkedIn (opens in new tab)' },
  github:   { label: 'GitHub',   href: 'https://github.com/karthik-muthumari',          aria: 'Karthik on GitHub (opens in new tab)' },
}
```
**Primary CTA = Personal email** (`karthikmuthumari7@gmail.com`) everywhere a single email CTA is needed (hero, nav, footer lead). Work email is always shown as the secondary, labelled option. Both addresses are real `mailto:` links (static site, no JS required).

## 1. `ContactCard` (shared atom)
Row component, one per email: `[icon 20px] [label micro-caps over address mono] [copy button]`.
- Container: `group relative flex items-center gap-3 rounded-lg border border-line bg-surface p-4 min-h-[64px]`.
- Left icon tile 40×40 `rounded-md bg-surface-2 text-accent` (lucide `Mail` for personal, `Briefcase` for work).
- Text block (flex-1, min-w-0): label `text-micro uppercase text-fg-subtle` ("Personal" / "Work"); address `font-mono text-mono text-fg break-all sm:break-normal` as the `mailto:` link (stretched `::after` so the entire card is clickable) with `aria-label` from data (e.g. `Email Karthik at work`). Visible text is the address, so the aria-label begins with the visible words "Email Karthik"; also append the address in a visually hidden span: `<span class="sr-only">: karthik.muthumari@mindera.com</span>` (satisfies WCAG 2.5.3 Label in Name).
- Right: copy `IconButton` 44×44 (`relative z-10`, above the stretched link so it's a sibling, not nested), lucide `Copy` → `Check`. `aria-label="Copy work email address"` / `"Copy personal email address"`.
- Primary (Personal) variant: `border-accent/40 shadow-glow` + "Preferred" micro pill (`bg-grad-accent text-accent-ink rounded-pill px-2 py-0.5 text-micro`) at top-right of the card (hidden <360 if it overflows; `sr-only` text still read: "Preferred contact").
- Rest/hover/focus/active:
  - rest: as above. hover (fine pointer): `border-accent/60 bg-surface-2`, card `y:-2` (spring.snappy), icon tile bg→`accent/12`, address underline slides in (`decoration` 250ms). 
  - focus-visible on link: standard 3px focus ring drawn on the **card** (`focus-within`-style: `has-[a:focus-visible]:outline …` or put outline on the stretched link's `::after` with `border-radius: inherit`). Copy button has its own ring.
  - active/tap: scale .985.
- Tap targets: whole card ≥ 64px high; copy button 44×44; adjacent targets ≥ 8px apart.

### Copy-to-clipboard behaviour
- `navigator.clipboard.writeText(address)`; fallback to a hidden textarea + `document.execCommand('copy')` if unavailable (e.g. http preview). Never block the mailto link.
- Feedback: icon swaps `Copy`→`Check` (AnimatePresence `mode="wait"`, scale .4→1 spring.snappy, colour `text-success`), tooltip-less "Copied" label beside the button on ≥640 (fades in 0.15s, 1.8s), then reverts. Also a polite live region `<span role="status" aria-live="polite" class="sr-only">Work email copied to clipboard</span>` (always present in DOM; text set on copy, cleared after 2s). A shared toast (03 §3.10) is optional — don't double-announce.
- Failure: show "Copy failed — select the address manually" in the same live region; address stays selectable (`select-all` on the mono span).

## 2. Contact section (home `#contact`, end of page)
Replace the old strip with this layout inside the existing panel (`rounded-xl bg-surface border border-line` + `glow-hero`):
- Header: eyebrow "06 — CONTACT", H2 "Let's build *something* great" (one serif-italic word), lead `text-fg-muted` "Open to conversations about full-stack, cloud and AI-assisted engineering. Email is best." Optionally mention "Replies within a few days" — omit if unsure.
- Contact cards: Personal first (primary), Work second. Under them a social row: LinkedIn + GitHub as `Button secondary` pills with icon + label (`h-12`, ≥44px), each opens in new tab (`target="_blank" rel="noopener noreferrer"`, trailing `↗`, sr-only "(opens in new tab)").
- Primary action button (optional, above cards on mobile): `Button primary` "Email me" → `mailto:karthikmuthumari7@gmail.com`, aria-label "Email Karthik at personal address". Skip this button if the card already serves as CTA to avoid redundancy — **recommended: include only in Hero/Nav, not here** (the cards are the CTA here).
| BP | Layout |
|---|---|
| Mobile 360–639 | single column, `gap-3`: header → Personal card → Work card → LinkedIn button → GitHub button (buttons full-width, stacked, or 2-col grid if each fits ≥ 140px). Address wraps (`break-all`) rather than overflowing; at 320px font-size stays 13px. Panel padding `p-5` |
| `sm`–Tablet 640–1023 | header on top; cards in 2 columns (`grid-cols-2 gap-4`) if both addresses fit (work address is the longest, ~30 chars ≈ 270px mono at 13px → fits ≥ 640); else stacked. Socials in a row beneath, auto width |
| Desktop ≥1024 | 12-col panel `p-12`: header cols 1–5; right cols 7–12: stacked cards (Personal then Work), socials row beneath them, left-aligned |
| Wide ≥1280 | same, panel inside `max-w-container` |
Entrance: `sectionContainer` + `fadeUp` per child (stagger .08, order: header, personal, work, socials).

## 3. Footer
Contact column (desktop cols 9–12; mobile full-width section "Contact" `h2.sr-only`/visible h3):
- Compact text links, not cards: `Personal — karthikmuthumari7@gmail.com`, `Work — karthik.muthumari@mindera.com` (label `text-fg-subtle`, address `text-accent` link, mono 13px, `py-2` so each link line is ≥ 44px tall incl. padding, `-mx-2 px-2` hit area). Optional small copy icon button (44×44 hit area, 16px icon) after each on ≥640 only.
- Social icon buttons (GitHub, LinkedIn) 44×44 ghost icon buttons with the aria-labels from data, hover scale 1.08.
- Mobile: stacked list, 8px gaps; desktop same stack. Footer must still show © and no other personal details.

## 4. Hero / Nav contact CTAs
- **Hero CTA row** (03 §3.1 item 4): Primary "View my work" stays. Replace the tertiary Mail ghost button with: Mail icon button → `mailto:karthikmuthumari7@gmail.com` (aria-label "Email Karthik at personal address"), GitHub and LinkedIn ghost icon buttons with data aria-labels. (Work email is not in the hero; one primary email only.)
- **Nav:** add a right-side pill button "Contact" (secondary, `h-10 px-4`) before the theme toggle on ≥768 that anchors to `#contact` (on other routes, `/#contact`). On <768 it is the last item in the mobile sheet, styled as primary button full-width (`h-12`). Do not put mailto in the nav; `#contact` keeps the choice of address visible.

## 5. Motion & reduced motion
- Card hover lift, icon-tile tint, address underline, copy-icon swap spring: as above (spring.snappy; durations ≤ 0.28s).
- Reduced motion (`MotionConfig reducedMotion="user"` + explicit): no lift/scale; hover = colour/border change only; copy icon swaps instantly (no scale/rotate), "Copied" label appears without fade; no stagger on section entrance (opacity-only 0.2s).

## 6. Accessibility summary
- Names: `Email Karthik at personal address` / `Email Karthik at work` (+ sr-only address); `Copy personal email address` / `Copy work email address`; `Karthik on LinkedIn (opens in new tab)`; `Karthik on GitHub (opens in new tab)`.
- Contrast: address text `text-fg` on `surface` (≥ 14:1 dark / 18:1 light); footer address links use `text-accent` (burnt amber in light, 5.5:1+); label `text-fg-subtle` ≥ 5.1:1. Success tick `text-success` ≥ 5:1 on surface.
- Focus: 3px `--c-focus` ring, offset 3px, on card and on copy button separately; tab order = card link → copy button → next card.
- Cards are `<li>` in a `<ul aria-label="Email addresses">`; socials in `<ul aria-label="Social links">`.
- No hover-only info (copy button always visible, not hover-revealed).

## 7. Privacy guard
Do not include the phone number or street address in the page, metadata (`<meta>`, JSON-LD `Person` schema must only have name, jobTitle, url, `sameAs` [LinkedIn, GitHub], `email` optional = personal), `sitemap`, or content markdown. QA: grep the built `out/` for the phone-number and address strings from the CV; it must return nothing.
