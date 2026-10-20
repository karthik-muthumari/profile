# 04 · Animation choreography (Framer Motion — `framer-motion` v11/12 or `motion/react`)

Put shared constants in `lib/motion.ts`. All components are `'use client'`. Respect `useReducedMotion()` everywhere (see §11).

## 1. Constants
```ts
// lib/motion.ts
import type { Variants, Transition } from 'framer-motion'

export const ease = {
  outExpo: [0.16, 1, 0.3, 1] as const,   // entrances (fast start, long soft landing)
  inOut:   [0.65, 0, 0.35, 1] as const,  // theme / layout
  out:     [0.22, 1, 0.36, 1] as const,  // hover
}
export const dur = { fast: 0.15, base: 0.28, med: 0.5, slow: 0.7, hero: 0.9 }
export const spring = {
  soft:   { type: 'spring', stiffness: 120, damping: 16, mass: 0.9 } as Transition,  // avatar, big objects
  snappy: { type: 'spring', stiffness: 380, damping: 28 } as Transition,             // buttons, chips, toggles
  card:   { type: 'spring', stiffness: 300, damping: 24 } as Transition,             // card lift
  layout: { type: 'spring', stiffness: 400, damping: 36 } as Transition,             // nav pill / layoutId
}
export const stagger = { tight: 0.05, base: 0.08, loose: 0.12 }   // seconds between children
export const viewport = { once: true, amount: 0.2, margin: '0px 0px -80px 0px' } as const
// amount .2 for tall blocks; use amount: 0.6 for small items (chips/stats)
```

## 2. Section entrance (whileInView, once)
```ts
export const sectionContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: stagger.base, delayChildren: 0.05 } },
}
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.outExpo } },
}
export const fadeIn: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: dur.med } } }
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show:   { opacity: 1, scale: 1, transition: spring.soft },
}
export const slideX = (dir: 1 | -1): Variants => ({           // alternating timeline cards
  hidden: { opacity: 0, x: 48 * dir },
  show:   { opacity: 1, x: 0, transition: { duration: dur.slow, ease: ease.outExpo } },
})
// usage
// <motion.section variants={sectionContainer} initial="hidden" whileInView="show" viewport={viewport}>
//   <motion.div variants={fadeUp}>…</motion.div>
```
Rules: parent holds `initial/whileInView/viewport`; children only use `variants`. Grid children stagger `0.08` capped at 6 items — beyond that use stagger `0.04` (use `custom` index: `delay: Math.min(i,6)*0.08`). Mobile: reduce y offset to 16 (use `useMediaQuery` or `y: 'clamp'` via CSS var). Never animate layout-affecting props (`height` only for accordion) — use `transform` and `opacity` (+ `filter: blur` only on hero text/avatar).

### Section heading reveal
Split H2 into words; each word `overflow-hidden` wrapper with inner `motion.span`:
```ts
export const wordReveal: Variants = {
  hidden: { y: '110%', opacity: 0 },
  show:   (i: number) => ({ y: '0%', opacity: 1, transition: { duration: 0.7, ease: ease.outExpo, delay: i * 0.06 } }),
}
```
Eyebrow bar: `scaleX 0→1`, origin left, 0.5s, ease outExpo, then eyebrow text fades in (+0.1s). Provide the full heading as `aria-label` on the h2 and mark the split spans `aria-hidden`.

## 3. Hero choreography (on mount, not whileInView) — total ≈ 1.4s
Timeline (seconds from mount):
| t | Element | Variant |
|---|---|---|
| 0.00 | background glow + grid | opacity 0→1, 1.2s ease inOut |
| 0.10 | eyebrow chip | `fadeUp` (y 16) |
| 0.20–0.45 | H1 line 1 words, line 2 words | `wordReveal`, 0.06 stagger; gradient word last |
| 0.55 | lead paragraph | `fadeUp` blur 6→0 |
| 0.70 | CTA row (children stagger 0.08) | `fadeUp` y 16 |
| 0.15 | **avatar stack** | below |
| 0.90 | tech marquee | `fadeIn` |
| 1.10 | scroll cue | `fadeIn`, then bounce y [0,6,0] 1.8s infinite |
```ts
export const heroContainer: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }
export const avatarEnter: Variants = {
  hidden: { opacity: 0, scale: 0.82, filter: 'blur(14px)', rotate: -4 },
  show:   { opacity: 1, scale: 1, filter: 'blur(0px)', rotate: 0, transition: { ...spring.soft, delay: 0.15, filter: { duration: 0.7 } } },
}
export const avatarIdle = { y: [0, -14, 0], rotate: [-0.6, 0.6, -0.6] }      // transition: { duration: 6, ease: 'easeInOut', repeat: Infinity }
export const glowPulse  = { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }    // { duration: 5, ease: 'easeInOut', repeat: Infinity }
export const badgeFloat = (i: number) => ({ animate: { y: [0, -8, 0] }, transition: { duration: 4.5 + i * 0.6, ease: 'easeInOut', repeat: Infinity, delay: i * 1.2 } })
```
Start `avatarIdle` only after the entrance completes (`onAnimationComplete` → set state, or nest idle on an inner `motion.div`). Use nested elements: outer = entrance + parallax, inner = idle float, so transforms don't fight.
Avatar pointer parallax:
```ts
const mx = useMotionValue(0), my = useMotionValue(0)
const sx = useSpring(mx, { stiffness: 120, damping: 18 }), sy = useSpring(my, { stiffness: 120, damping: 18 })
const rotY = useTransform(sx, [-0.5, 0.5], [-3, 3]); const rotX = useTransform(sy, [-0.5, 0.5], [3, -3])
const tx = useTransform(sx, [-0.5, 0.5], [-10, 10]);  const ty = useTransform(sy, [-0.5, 0.5], [-10, 10])
// onPointerMove on hero: mx.set(e.clientX / innerWidth - 0.5) …  enable only when matchMedia('(pointer:fine)') and !reducedMotion
```
Hero scroll-linked (see §8): glow translateY 0→-40px, avatar scale 1→0.94 & opacity 1→0.6 over first 60% of hero height, text translateY 0→-24.

## 4. Hover / tap / focus
```ts
export const card = {
  rest:  { y: 0, scale: 1, transition: spring.card },
  hover: { y: -6, scale: 1.005, transition: spring.card },
  tap:   { scale: 0.985, transition: { duration: dur.fast } },
}
// <motion.article variants={card} initial="rest" whileHover="hover" whileTap="tap" whileFocus="hover">   (children can read `hover` variant)
export const btn = { whileHover: { y: -2 }, whileTap: { scale: 0.97 }, transition: spring.snappy }
export const iconBtn = { whileHover: { scale: 1.08 }, whileTap: { scale: 0.92 }, transition: spring.snappy }
export const chip = { whileHover: { y: -2 }, whileTap: { scale: 0.96 }, transition: spring.snappy }
export const arrow = { rest: { x: 0, y: 0 }, hover: { x: 4, y: -4, transition: spring.snappy } }       // ↗ in cards (child of card variants)
export const mediaZoom = { rest: { scale: 1 }, hover: { scale: 1.05, transition: { duration: 0.6, ease: ease.out } } }
```
- Link underline: CSS `background-size 0→100%` 250ms `--ease-out-expo` (no JS).
- Card spotlight: on `pointermove` set CSS vars `--mx/--my` (no React state; use `ref` + rAF). Gradient defined in 03 §3.7. Desktop fine-pointer only.
- `whileHover` is skipped on touch automatically; ensure nothing is hover-only (info must also be reachable via focus/tap).
- Magnetic primary CTA (optional, desktop): translate toward cursor max 8px, spring snappy; disabled when reduced motion.
- Nav pill: `layoutId="nav-pill"` with `spring.layout`.

## 5. Timeline
Line draw-in (scroll-linked):
```ts
const ref = useRef(null)
const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] })
const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })
// <div class="absolute left-[14px] md:left-1/2 inset-y-0 w-[2px] bg-line" />
// <motion.div style={{ scaleY, transformOrigin: 'top' }} className="absolute … w-[2px] bg-grad-accent" />
```
Dots: `whileInView={{ scale: [0.4, 1.25, 1], backgroundColor/border handled by class swap }}`; simplest: variant `dot: hidden {scale:0, opacity:0} show {scale:1, opacity:1, transition: {type:'spring', stiffness:500, damping:18}}` + a ping ring (`scale 1→2.2, opacity .6→0, 1.2s, once`). Dot triggers when its own `whileInView` with `viewport={{ once:true, amount: 1, margin:'-35% 0px -35% 0px' }}` (activates when it crosses viewport centre).
Cards: `slideX(±1)` on desktop (alternating left/right), `fadeUp` on <1024. Inside card: tech chips stagger 0.04 after card appears (`delayChildren: 0.3`).
Read-more accordion: `AnimatePresence initial={false}` → `motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.35, ease: ease.inOut}}` with `overflow:hidden`.
Employer header node: `scaleIn` + its pill glow pulse once.

## 6. Counters / stats
`useInView({once:true, amount:.6})` → `animate(0, target, {duration:1.2, ease: ease.outExpo, onUpdate})` or `useMotionValue`+`useTransform(round)`. Reduced motion: set final value directly.

## 7. Marquee
CSS-only (`@keyframes marquee { to { transform: translateX(-50%) } }`, 40s linear infinite, duplicated list `aria-hidden` for the copy); `:hover { animation-play-state: paused }`. Edge fade mask `linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)`. Reduced motion: no animation, `flex-wrap`, no duplicate.

## 8. Scroll-linked effects
| Effect | Source | Mapping |
|---|---|---|
| Reading progress bar (blog post) | `useScroll()` (page) | `scaleX` = `useSpring(scrollYProgress,{stiffness:200,damping:30})`; 3px `bg-grad-accent` fixed at `top: var(--nav-h)`, origin left |
| Nav background | `useMotionValueEvent(scrollY,'change')` | >24 → solid bg + shadow (`transition .25s`) |
| Hero parallax | `useScroll({target: hero, offset:['start start','end start']})` | glow y `[0,-40]`... text y `[0,-24]`, avatar scale `[1,.94]`, opacity `[1,.6]` over [0,.6] |
| Timeline progress | §5 | |
| Section heading parallax (optional) | per section | eyebrow bar width follows scroll — skip on mobile |
| Back-to-top | scrollY>600 | `AnimatePresence` fade+scale .8→1 |
Use `transform`/`opacity` only; no scroll-jacking; never block native scroll.

## 9. Theme toggle transition
1. Icon morph: sun ↔ moon inside the button with `AnimatePresence mode="wait" initial={false}`: exit `{rotate:90,scale:.4,opacity:0}` 0.15s, enter from `{rotate:-90,scale:.4,opacity:0}` → `{rotate:0,scale:1,opacity:1}` spring snappy. Sun rays rotate.
2. Colour cross-fade: add class `theme-transition` to `<html>` (defined in tokens.css, .4s `ease.inOut` on color/background/border/shadow), set `data-theme`, remove class after 450ms. Persist to `localStorage('theme')`; also set `color-scheme`.
3. (Progressive enhancement) If `document.startViewTransition` exists and not reduced-motion: wrap the toggle in it with a circular clip-path reveal from the toggle's centre: `::view-transition-new(root){animation: reveal .55s var(--ease-in-out)}` using `clip-path: circle(0 at var(--x) var(--y)) → circle(150vmax at …)`. Otherwise fall back to (2).
4. No-flash: inline `<script>` in `<head>` (via `dangerouslySetInnerHTML` in layout, before paint): `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}` — absence of attr = follow OS (tokens.css handles it); Set `suppressHydrationWarning` on `<html>`. Toggle logic: current = dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light':'dark').

## 10. Page / route transitions (Next App Router, static export)
Next App Router unmounts the previous page instantly, so AnimatePresence exit needs a frozen-context wrapper. Use a `template.tsx` (re-mounts per navigation) for **enter** animation (reliable, simple) and optionally a `FrozenRoute` (stores `useContext(LayoutRouterContext)` snapshot, from `next/dist/shared/lib/app-router-context.shared-runtime`) + `<AnimatePresence mode="wait">` keyed by `usePathname()` for **exit**. If the frozen-context hack proves brittle, ship enter-only (acceptable) — don't block on exit.
```ts
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16, filter: 'blur(6px)' },
  enter:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.5, ease: ease.outExpo, when: 'beforeChildren' } },
  exit:    { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.22, ease: ease.inOut } },
}
// <AnimatePresence mode="wait" initial={false}><motion.main key={pathname} variants={pageVariants} initial="initial" animate="enter" exit="exit">
```
- On route change: scroll to top instantly (`window.scrollTo(0,0)` on exit complete); hash links (`#projects`) smooth-scroll (`scroll-behavior:smooth` is set on `html` only when motion allowed).
- A thin accent progress bar under nav during navigation is unnecessary (static, instant).
- Shared-element: blog card → post title uses `layoutId={`post-title-${slug}`}` only if frozen-route exit is implemented; otherwise skip.
- Focus management: after navigation, move focus to `<main id="main" tabIndex={-1}>` and announce title (live region `aria-live="polite"` with route title) .

## 11. `prefers-reduced-motion` fallbacks
Use `const reduce = useReducedMotion()` (or `<MotionConfig reducedMotion="user">` at the root — **do this** — it disables transform/layout animation automatically but keeps opacity). Additionally:
| Feature | Reduced behaviour |
|---|---|
| Section/hero entrances | opacity 0→1, 0.2s, no y/scale/blur/stagger (set stagger 0) |
| Avatar float, ring spin, blob morph, glow pulse, badge float | **off** (static ring/shape) |
| Parallax / pointer tilt / magnetic / spotlight movement | off (spotlight may stay static) |
| Timeline line | fully drawn (scaleY 1), dots static |
| Counters | final value |
| Marquee | static wrapped list |
| Theme toggle | instant swap (no cross-fade/view-transition), icon swaps without rotation |
| Page transitions | opacity-only 0.15s |
| Smooth scrolling | `scroll-behavior:auto` |
| Video/Lottie avatar | poster/first frame only |
Helper: `export const motionSafe = (v: Variants, reduce: boolean): Variants => reduce ? { hidden:{opacity:0}, show:{opacity:1, transition:{duration:.2}} } : v`.

## 12. Performance guardrails
- Animate only `transform`, `opacity` (and `filter: blur` on ≤3 elements). `will-change: transform` only on avatar and glow.
- Pause infinite animations when offscreen (`useInView` on hero) and when `document.hidden`.
- Keep total hero JS animation count low: ring/blob/marquee are CSS; Framer drives entrance, float, parallax.
- Lazy-load below-fold sections' heavy bits; `LazyMotion features={domAnimation}` + `m.` components to keep bundle small (use `domMax` only if `layoutId` is needed — it is, for nav pill; so use `domMax` or implement the pill with CSS).
