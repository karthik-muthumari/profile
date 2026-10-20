# Karthik Muthumari — portfolio & blog

Animated personal portfolio + blog. **Next.js 15 (App Router) · TypeScript · Tailwind CSS 3 · Framer Motion**, exported as flat static files (`output: 'export'`) for GitHub Pages. Visual spec lives in `design/`.

## Commands

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # static site → out/   (user-site / custom domain, base path "")
npm run build:pages    # same, with NEXT_PUBLIC_BASE_PATH=/my-profile (project site)
npm run start:out      # serve out/ locally (npx serve)
npm run typecheck && npm run lint
npm run sync:design    # re-copy design/tokens.css + tailwind mapping after the designer changes them
```

### Base path (GitHub Pages project sites)

One config serves both hosting modes. Set `NEXT_PUBLIC_BASE_PATH` at **build time**:

| Hosting | Value |
|---|---|
| `https://<user>.github.io` (repo named `<user>.github.io`) or custom domain | *(empty, default)* |
| `https://<user>.github.io/<repo>` | `NEXT_PUBLIC_BASE_PATH=/<repo>` |

`next.config.mjs` turns it into `basePath` + `assetPrefix`. `next/link` handles routes automatically; for **plain `<img>`, CSS `url()`, `<link>` and any `public/` file use `asset("/path")`** from `src/lib/asset.ts`. Never hard-code root-absolute URLs.

## Structure

```
content/
  resume.ts            ← ALL resume data (profile, experience, projects, skills, awards). Edit here.
  posts/*.md           ← blog posts (frontmatter + Markdown)
src/
  app/                 layout, home, /blog, /blog/[slug], not-found (404), template (page enter animation)
  components/
    hero/              Hero, HeroAvatar (★ avatar slot), avatar.config.ts, TechMarquee
    sections/          ExperienceTimeline, ProjectsGrid, BlogRoll, Stats, Skills, Awards, Contact
    Navbar, Footer, ThemeToggle, ThemeProvider, BackToTop, RouteAnnouncer, PostExtras
  lib/                 posts.ts (build-time blog engine), motion.ts (springs/variants), asset.ts
public/                avatar/, images/ (downscaled photos only — originals in pics/ are never shipped)
design/                designer's spec (tokens, layout, motion, a11y)
```

Routes: `/`, `/blog/`, `/blog/<slug>/`, `/404.html`.

## Adding a blog post

Create `content/posts/my-post.md` (the filename is the URL slug):

```md
---
title: "My post"
date: 2026-10-01          # ISO date; newest first
summary: "One-sentence teaser shown on cards."
tags: [AWS, Node.js]
draft: false              # optional; true hides it
---
Markdown here (GFM tables, fenced code, headings get anchors + a table of contents).
```

Posts are parsed at build time (gray-matter + unified/remark/rehype) and prerendered via `generateStaticParams` — no server runtime.

## Swapping the avatar (Pixar-style slot)

The hero shows `public/avatar/karthik-fallback.jpg` (a 1040×1040 square crop of `pics/MyProfilePic.PNG`, EXIF-stripped, ~85 KB) until you add your illustrated avatar. To change the photo, crop it square around the face (face centre ≈ x50% y38%), keep it lowercase and under ~300 KB, and overwrite that file — e.g. with `sharp` (`npm ls sharp`): `sharp(src).extract({left,top,width,height}).resize(1040,1040).jpeg({quality:80,mozjpeg:true}).toFile('public/avatar/karthik-fallback.jpg')` (re-encoding drops EXIF). Never copy anything from `pics/` into `public/` unchanged. To use an illustrated avatar instead:

1. Drop **`public/avatar/pixar-avatar.webp`** (or `.png`; `.webm`/`.mp4` for an animated loop) — transparent, square, ≥1200px, ≤400 KB works best.
2. `npm run build`. The first existing candidate is picked at build time; nothing else to change.

Config / alternate filenames: `src/components/hero/avatar.config.ts`. In `npm run dev` a dashed "AVATAR SLOT" outline marks the area (hidden in production builds).

## Motion tiers (Full / Gentle / Off)

`src/components/MotionPrefs.tsx` + `buildMotion()` in `src/lib/motion.ts`. The tier is stored in `localStorage['motion']` and mirrored on `<html data-motion>` by a blocking inline script in `layout.tsx` (no flash).

- **Full** – default when the OS has no reduce-motion preference. Phones get shorter distances/durations and lower reveal thresholds; touch gets tap equivalents of hover effects (card press lights the spotlight, scroll-linked avatar tilt, chip row replaces the floating badges below `lg`).
- **Gentle** – default when the OS asks for reduced motion (or Save-Data): fades + ≤12px entrances, soft 5px avatar float, no spin/scale/parallax/marquee.
- **Off** – final states instantly, nothing moves.
- Users switch in the footer ("Motion" radio group, keyboard accessible, persisted). Reveals have a failsafe (`useFailsafe`) that force-shows anything on screen after 2.5 s, and a `<noscript>` rule keeps content visible without JS.
- If you "can't see the animation" on a phone, check iOS *Reduce Motion* / Android *Remove animations*: the site then starts in Gentle — tap **Full** in the footer.

## Contact data

All contact details live in one place: `content/resume.ts` → `profile` (`emails[]` — **work first = preferred**, then personal —, `github`, `linkedin`). The Contact section, footer and hero icons read from it; `primaryEmail` (the first entry, i.e. the work address `karthik.muthumari@mindera.com`) feeds the hero mail icon, JSON-LD and the "Preferred" badge; the personal address is the secondary card. Change an address there and rebuild.

- The phone number and home address from the CV are intentionally **never** published.
- `pics/` holds 7–11 MB originals and is git-ignored; only downscaled copies in `public/` ship.
