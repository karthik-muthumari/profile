# Deployment guide — GitHub Pages

This site is a static Next.js export (`output: 'export'`). `npm run build` writes flat files to `out/`, and GitHub Actions publishes that folder to GitHub Pages. No server runtime is needed.

## 1. How asset paths work (basePath / assetPrefix)

GitHub Pages serves a site from one of two places:

| Repo name | Site URL | Base path |
|---|---|---|
| `<owner>.github.io` (user site) | `https://<owner>.github.io/` | `""` (empty) |
| any other repo, e.g. `my-profile` (project site) | `https://<owner>.github.io/my-profile/` | `/my-profile` |

A project site lives under a subpath, so root-absolute URLs like `/_next/...` or `/avatar/x.webp` would 404. The base path is therefore set at build time from one environment variable, `NEXT_PUBLIC_BASE_PATH`:

- **`next.config.mjs`** reads it, normalises it (leading slash, no trailing slash) and sets `basePath` and `assetPrefix` to it. When it is empty, neither is set. It also sets `trailingSlash: true` and `images.unoptimized: true`, because the Next.js image optimiser needs a server.
- **Next.js-generated URLs:** `next/link` and the `_next/` chunks are prefixed automatically.
- **Plain asset URLs:** `<img>`, CSS and `public/` files go through the `asset()` helper in `src/lib/asset.ts`, which prefixes the same variable. Never hard-code `/something.png` in components; use `asset("/something.png")`.
- **`.nojekyll`:** GitHub Pages runs Jekyll by default, which drops the `_next/` folder. The workflow adds `out/.nojekyll` to prevent this.

The workflow computes `NEXT_PUBLIC_BASE_PATH` for you from the repository name, so the same code deploys correctly either way. You only set it by hand for local builds.

## 2. Launch steps

1. **Check your contact details** in `content/resume.ts`: both emails, GitHub and LinkedIn are set there. This is the only place to edit them. The export gate (`tests/scripts/check-export.mjs`, allow-list in `tests/scripts/contact.config.mjs`) fails the build if any email other than those two appears, or if placeholder text such as `example.com` or `TODO` is left in. If you change an email, update the allow-list too.
2. **Create a GitHub repository** and push this project to `main`. Keep `pics/` out of it (it is git-ignored; the originals are 7–11 MB).
3. **Enable Pages:** repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. **Push to `main`.** `.github/workflows/deploy.yml` runs on every push to `main` and on manual **Run workflow**. It:
   1. installs dependencies with `npm ci` (Node 22),
   2. computes the base path from the repo name,
   3. runs `npm run build` and adds `.nojekyll`,
   4. runs two QA gates, `tests/scripts/check-paths.mjs` and `tests/scripts/check-export.mjs`. They fail the build on broken local URLs, a missing 404 page, leaked contact details or oversized images,
   5. uploads `out/` and deploys it with `actions/deploy-pages`.
5. **Open the URL** shown on the deploy job (also under **Settings → Pages**).

The build downloads Google Fonts through `next/font/google`, so it needs internet access. GitHub Actions has it.

## 3. Test locally before pushing

```bash
npm ci

# User-site layout (base path ""), served at http://localhost:3000/
npm run build
npm run start:out

# Project-site layout, to rehearse the /my-profile subpath
npm run build:pages            # NEXT_PUBLIC_BASE_PATH=/my-profile
node tests/scripts/serve.mjs out 4173 --base /my-profile
# then open http://127.0.0.1:4173/my-profile/ (the server only answers under the prefix, like Pages)
```

If your repo is not called `my-profile`, build with `NEXT_PUBLIC_BASE_PATH=/<your-repo> npm run build`.

To run the QA gates yourself:

```bash
node tests/scripts/check-paths.mjs  out --base "/my-profile"
node tests/scripts/check-export.mjs out --base "/my-profile"
```

To build into a separate directory per mode, use `tests/scripts/build-isolated.sh <workdir> [base-path]`, which writes `<workdir>/out`. Concurrent builds into the shared `out/` caused a spurious failure during QA.

## 4. Day-to-day

- **New blog post:** add a Markdown file with frontmatter (`title`, `date`, `summary`, `tags`) to `content/posts/`, then push.
- **Pixar avatar:** drop `public/avatar/pixar-avatar.webp` (or `.png`, `.webm`, `.mp4`) and push. Until then the hero shows the cropped photo.
- **Custom domain:** set it under **Settings → Pages**. The site is then served from the domain root, so the base path must be empty. Either use a `<owner>.github.io` repo or edit the "Compute base path" step in the workflow to set `BASE=""`.

## 5. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Page loads with no styling or scripts, 404s on `/_next/...` | The base path was empty on a project site. Check the "Compute base path" step log. |
| Images 404 on the live site only | A component references `/path` instead of `asset("/path")`. |
| `_next/` 404s everywhere | `.nojekyll` is missing from the artifact. |
| Refreshing `/blog/<slug>/` gives 404 | Use the trailing slash. The export is built with `trailingSlash: true`. |
| Workflow fails at a QA gate | Read the gate output. It names the broken URL or the file that leaked. |

## 6. Known limits

See `tests/validation-report.md` for the full list. The deploy workflow has not yet run on GitHub, because the project had no remote. The first push is its first real run, so check the Actions tab. Safari, Firefox, real devices and Lighthouse were not tested.
