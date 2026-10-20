#!/usr/bin/env node
// Tiny static server that mimics GitHub Pages semantics (zero deps).
//   node serve.mjs <dir> [port=4173] [--base /my-profile]
// - With --base, the site is ONLY reachable under that prefix (like a project page);
//   anything outside it (e.g. "/_next/...") returns 404 -> exposes un-prefixed asset URLs.
// - "/dir" -> 301 "/dir/" -> dir/index.html;  "/page" -> page.html (Pages does this too)
// - Missing -> 404.html with status 404.   Paths are case-SENSITIVE (like Pages/Linux).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const bi = args.indexOf('--base');
let base = bi >= 0 ? args.splice(bi, 2)[1] : (process.env.NEXT_PUBLIC_BASE_PATH || '');
base = base.replace(/\/+$/, '');
const root = path.resolve(args[0] || '../out');
const port = Number(args[1] || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json',
  '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

// case-sensitive resolution (macOS fs is case-insensitive; Pages is not)
function exactFile(rel) {
  let cur = root;
  for (const seg of rel.split('/').filter(Boolean)) {
    let names; try { names = fs.readdirSync(cur); } catch { return null; }
    if (!names.includes(seg)) return null;
    cur = path.join(cur, seg);
  }
  return cur;
}
const isFile = (p) => p && fs.existsSync(p) && fs.statSync(p).isFile();
const isDir = (p) => p && fs.existsSync(p) && fs.statSync(p).isDirectory();

function send404(res) {
  const p404 = path.join(root, '404.html');
  res.statusCode = 404;
  res.setHeader('content-type', TYPES['.html']);
  res.end(isFile(p404) ? fs.readFileSync(p404) : 'Not Found');
}

http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return send404(res); }
  const log = (code) => { if (process.env.QUIET !== '1') console.log(code, req.method, req.url); };
  res.on('finish', () => log(res.statusCode));

  if (base) {
    if (pathname === base) { res.statusCode = 301; res.setHeader('location', base + '/'); return res.end(); }
    if (!pathname.startsWith(base + '/')) return send404(res);
    pathname = pathname.slice(base.length) || '/';
  }
  const rel = pathname.replace(/^\/+/, '');
  let file = null;
  const exact = exactFile(rel);
  if (exact && isFile(exact)) file = exact;
  else if (exact && isDir(exact)) {
    if (!pathname.endsWith('/')) { res.statusCode = 301; res.setHeader('location', (base + pathname) + '/'); return res.end(); }
    const idx = exactFile(rel.replace(/\/$/, '') + '/index.html');
    if (isFile(idx)) file = idx;
  } else if (!path.extname(rel) && !pathname.endsWith('/')) {
    const h = exactFile(rel + '.html');
    if (isFile(h)) file = h;
  }
  if (!file) return send404(res);
  res.setHeader('content-type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
  res.setHeader('cache-control', 'no-cache');
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () =>
  console.log(`Serving ${root} at http://127.0.0.1:${port}${base || ''}/  (Pages-like, case-sensitive${base ? ', base=' + base : ''})`));
