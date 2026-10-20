#!/usr/bin/env node
// Crawl an Next.js static export and verify every referenced local URL resolves to a file
// *as GitHub Pages would serve it* under a given base path.  Zero dependencies.
//
//   node check-paths.mjs <outDir> [--base /my-profile] [--json]
//   (base defaults to env NEXT_PUBLIC_BASE_PATH, "" = root hosting)
//
// What it checks
//  * HTML: href/src/srcset/poster/imagesrcset/content(og:image..)/inline style url()/<script> JSON strings
//  * CSS: url(...) (fonts, images) resolved relative to the CSS file URL
//  * JS : webpack publicPath (__webpack_require__.p) must equal <base>/_next/
//  * Every root-relative URL ("/x") MUST start with <base>/ (else it 404s on a project page)
//  * Targets are resolved with Pages rules (dir -> index.html, "/x" -> x.html) and CASE-SENSITIVELY
//  * Fragments (#id) on internal links: warns if the id doesn't exist in the target page
//  * http:// (mixed content) and absolute URLs pointing at localhost/github.io are flagged
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const json = argv.includes('--json');
const bi = argv.indexOf('--base');
let base = bi >= 0 ? argv.splice(bi, 2)[1] : (process.env.NEXT_PUBLIC_BASE_PATH ?? '');
base = base.replace(/\/+$/, '');
if (base && !base.startsWith('/')) base = '/' + base;
const out = path.resolve(argv.filter((a) => !a.startsWith('--'))[0] || '../out');
if (!fs.existsSync(out)) { console.error(`out dir not found: ${out}`); process.exit(2); }

const failures = []; const warnings = []; const external = new Map();
const fail = (page, url, why) => failures.push({ page, url, why });
const warn = (page, url, why) => warnings.push({ page, url, why });

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, acc) : acc.push(p);
  }
  return acc;
}
const files = walk(out);
const rel = (p) => path.relative(out, p).split(path.sep).join('/');
const pageUrlOf = (relFile) => {
  let u = '/' + relFile;
  u = u.replace(/index\.html$/, '');
  return base + u;               // e.g. /my-profile/blog/post/
};

// case-sensitive exact existence
function exactExists(relPath) {
  let cur = out;
  for (const seg of relPath.split('/').filter(Boolean)) {
    let names; try { names = fs.readdirSync(cur); } catch { return null; }
    if (!names.includes(seg)) return null;
    cur = path.join(cur, seg);
  }
  return cur;
}
const isFile = (p) => p && fs.statSync(p).isFile();
const isDir = (p) => p && fs.statSync(p).isDirectory();

// returns {file} | {error}
function resolveSitePath(pathname) {
  if (base) {
    if (pathname !== base && !pathname.startsWith(base + '/'))
      return { error: `not under base path "${base}" (would 404 on the project site)` };
    pathname = pathname.slice(base.length) || '/';
  }
  let p; try { p = decodeURIComponent(pathname); } catch { p = pathname; }
  const r = p.replace(/^\/+/, '');
  const ex = exactExists(r);
  if (ex && isFile(ex)) return { file: ex };
  if (ex && isDir(ex)) {
    const idx2 = exactExists((r ? r.replace(/\/$/, '') + '/' : '') + 'index.html');
    if (isFile(idx2)) return { file: idx2, dirNoSlash: !p.endsWith('/') };
    return { error: 'directory without index.html' };
  }
  if (!path.extname(r) && !p.endsWith('/')) {
    const h = exactExists(r + '.html');
    if (isFile(h)) return { file: h };
  }
  // helpful hint when only the case differs
  return { error: 'file not found in out/ (check spelling/case)' };
}

const SKIP = /^(mailto:|tel:|sms:|data:|javascript:|blob:|about:)/i;
const htmlIds = new Map();
function idsOf(file) {
  if (!htmlIds.has(file)) {
    const h = fs.readFileSync(file, 'utf8');
    htmlIds.set(file, new Set([...h.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1])));
  }
  return htmlIds.get(file);
}

let checked = 0;
function checkUrl(raw, fromPageUrl, fromRel, kind) {
  if (raw == null) return;
  let v = raw.trim().replace(/&amp;/g, '&');
  if (!v || SKIP.test(v) || /^%23/.test(v)) return;   // url(#id) / url(%23id) = SVG fragment refs
  if (v.startsWith('#')) {
    if (kind === 'a' && v.length > 1 && fromRel.endsWith('.html')) {
      const id = decodeURIComponent(v.slice(1));
      if (id && id !== 'top' && !idsOf(path.join(out, fromRel)).has(id)) warn(fromRel, v, 'fragment id not present in this page');
    }
    return;
  }
  if (/^https?:\/\//i.test(v) || v.startsWith('//')) {
    let u; try { u = new URL(v.startsWith('//') ? 'https:' + v : v); } catch { return fail(fromRel, v, 'malformed absolute URL'); }
    external.set(v, (external.get(v) || 0) + 1);
    if (u.protocol === 'http:') warn(fromRel, v, 'http:// URL (mixed content on https Pages)');
    if (/^(localhost|127\.|0\.0\.0\.0)/.test(u.hostname)) fail(fromRel, v, 'absolute URL points at localhost');
    return;
  }
  // Strings in the RSC/hydration payload are raw props (e.g. <Link href="/blog/">, or a src later wrapped by asset()):
  // the framework/component adds the base at render time. The rendered DOM + e2e run verify the final URL, so here we
  // only require that the target EXISTS once the base is applied.
  if (kind.startsWith('script') && base && v.startsWith('/') && !v.startsWith(base + '/') && v !== base) v = base + v;
  checked++;
  let resolved;
  try { resolved = new URL(v, 'http://site.invalid' + fromPageUrl); } catch { return fail(fromRel, v, 'unparseable URL'); }
  const r = resolveSitePath(resolved.pathname);
  if (r.error) {
    return fail(fromRel, v, `${kind}: ${r.error}`);
  }
  if (kind === 'a' && r.dirNoSlash) warn(fromRel, v, 'link to directory without trailing slash (extra 301 hop; trailingSlash:true expected)');
  if (resolved.hash && kind === 'a' && r.file.endsWith('.html')) {
    const id = decodeURIComponent(resolved.hash.slice(1));
    if (id && !idsOf(r.file).has(id)) warn(fromRel, v, 'fragment id not present in target page');
  }
}

function extractFromHtml(html, relFile) {
  const pageUrl = pageUrlOf(relFile);
  const add = (u, kind) => checkUrl(u, pageUrl, relFile, kind);
  // tags + attributes
  for (const m of html.matchAll(/<(a|link|script|img|source|video|audio|iframe|use|image|meta|form)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase(); const attrs = m[2];
    const get = (n) => { const x = attrs.match(new RegExp(`(?:^|\\s)${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i')); return x ? (x[1] ?? x[2]) : undefined; };
    if (tag === 'meta') {
      const c = get('content'); const key = (get('property') || get('name') || '').toLowerCase();
      if (c && /^(og:image|og:url|twitter:image|msapplication-tileimage)/.test(key)) {
        if (/^\//.test(c) || /^https?:/.test(c)) add(c, 'meta');
        if (/^\//.test(c) === false && !/^https?:/.test(c) && !/^data:/.test(c)) warn(relFile, c, `${key} should be absolute https URL for social crawlers`);
        if (/^\//.test(c)) warn(relFile, c, `${key} is root-relative; social crawlers need an absolute URL`);
      }
      continue;
    }
    for (const a of ['href', 'src', 'poster', 'data-src', 'action', 'xlink:href']) {
      const val = get(a); if (val !== undefined) add(val, tag === 'a' ? 'a' : (tag === 'link' ? 'link' : tag));
    }
    for (const a of ['srcset', 'imagesrcset']) {
      const val = get(a); if (!val) continue;
      for (const part of val.split(/,\s+(?=\S)/)) add(part.trim().split(/\s+/)[0], 'srcset');
    }
    const st = get('style'); if (st) for (const u of st.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) add(u[1], 'style-url');
  }
  for (const s of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
    for (const u of s[1].matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) add(u[1], 'css-url');
  // Strings inside inline scripts (Next RSC payload / hydration data): known asset-looking paths and href/src props
  for (const s of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = s[1].replace(/\\"/g, '"').replace(/\\u002F/gi, '/').replace(/\\\//g, '/');
    for (const m of body.matchAll(/"(\/[A-Za-z0-9_\-./%@~]+\.(?:js|css|woff2?|ttf|png|jpe?g|webp|avif|gif|svg|ico|webmanifest|mp4|webm|json))"/g)) add(m[1], 'script-asset');
    for (const m of body.matchAll(/"(?:href|src)":"(\/[^"#?]*)"/g)) add(m[1], 'script-prop');
  }
}

function extractFromCss(css, relFile) {
  const fileUrl = base + '/' + relFile;
  for (const u of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) checkUrl(u[1], fileUrl, relFile, 'css-url');
  for (const u of css.matchAll(/@import\s+['"]([^'"]+)['"]/g)) checkUrl(u[1], fileUrl, relFile, 'css-import');
}

let htmlCount = 0, cssCount = 0, jsCount = 0;
const publicPaths = new Set();
for (const f of files) {
  const r = rel(f); const ext = path.extname(f).toLowerCase();
  if (ext === '.html') { htmlCount++; extractFromHtml(fs.readFileSync(f, 'utf8'), r); }
  else if (ext === '.css') { cssCount++; extractFromCss(fs.readFileSync(f, 'utf8'), r); }
  else if (ext === '.js' && r.startsWith('_next/')) {
    jsCount++;
    const js = fs.readFileSync(f, 'utf8');
    for (const m of js.matchAll(/\.p\s*=\s*"([^"]*_next\/)"/g)) publicPaths.add(m[1]);
    // heuristic: bare root-relative asset literals shipped in app JS (would need basePath prefixing)
    if (base) {
      for (const m of js.matchAll(/["'`](\/(?:images?|img|avatars?|photos?|assets|fonts|media|static|favicon)[A-Za-z0-9_\-./]*\.(?:png|jpe?g|webp|avif|svg|ico|gif|woff2?))["'`]/g)) {
        const p = m[1];
        if (!js.includes(base + p) && !js.includes(`"${base}"`)) warn(r, p, 'JS literal root-relative asset path without base prefix – make sure it is wrapped with the basePath helper');
      }
    }
  }
}
for (const pp of publicPaths) {
  const expect = base + '/_next/';
  if (pp !== expect) fail('(webpack runtime)', pp, `webpack publicPath should be "${expect}" – lazy chunks / client navigation will 404`);
}
if (jsCount && publicPaths.size === 0) warn('(webpack runtime)', '', 'could not locate webpack publicPath; verify lazy chunk URLs in a browser (e2e.mjs)');

const summary = { out, base: base || '(root)', html: htmlCount, css: cssCount, js: jsCount, urlsChecked: checked,
  externalUrls: [...external.keys()], publicPaths: [...publicPaths], failures: failures.length, warnings: warnings.length };
if (json) console.log(JSON.stringify({ summary, failures, warnings }, null, 2));
else {
  console.log(`check-paths  out=${out}  base=${base || '(root)'}`);
  console.log(`  pages=${htmlCount} css=${cssCount} js=${jsCount} local URLs checked=${checked} external=${external.size}`);
  if (publicPaths.size) console.log(`  webpack publicPath: ${[...publicPaths].join(', ')}`);
  for (const w of warnings.slice(0, 50)) console.log(`  WARN  ${w.page}  ${w.url}  – ${w.why}`);
  for (const x of failures.slice(0, 100)) console.log(`  FAIL  ${x.page}  ${x.url}  – ${x.why}`);
  if (failures.length > 100) console.log(`  … ${failures.length - 100} more failures`);
  console.log(failures.length ? `RESULT: FAIL (${failures.length} broken, ${warnings.length} warnings)` : `RESULT: PASS (0 broken, ${warnings.length} warnings)`);
}
process.exit(failures.length ? 1 : 0);
