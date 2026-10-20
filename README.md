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

The hero shows `public/avatar/karthik-fallback.jpg` (cropped real photo) until you add your illustrated avatar:

1. Drop **`public/avatar/pixar-avatar.webp`** (or `.png`; `.webm`/`.mp4` for an animated loop) — transparent, square, ≥1200px, ≤400 KB works best.
2. `npm run build`. The first existing candidate is picked at build time; nothing else to change.

Config / alternate filenames: `src/components/hero/avatar.config.ts`. In `npm run dev` a dashed "AVATAR SLOT" outline marks the area (hidden in production builds).

## Contact data

All contact details live in one place: `content/resume.ts` → `profile` (`emails[]` — personal and work —, `github`, `linkedin`). The Contact section, footer and hero icons read from it; `primaryEmail` (the first entry) feeds single-email buttons. Change an address there and rebuild.

- The phone number and home address from the CV are intentionally **never** published.
- `pics/` holds 7–11 MB originals and is git-ignored; only downscaled copies in `public/` ship.
