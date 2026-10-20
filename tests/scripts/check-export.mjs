#!/usr/bin/env node
// Export sanity + privacy + image budget + static HTML/a11y lint.  Zero dependencies.
//   node check-export.mjs <outDir> [--base /my-profile] [--cv ../docs/Karthik_Muthumari_CV.txt] [--pics ../pics] [--json]
// Env budgets: IMG_MAX_KB (per image, default 500), IMG_TOTAL_MB (default 3), IMG_MAX_PX (default 2400),
//              JS_TOTAL_KB (uncompressed _next/static/chunks, default 1500)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { EMAIL_ALLOWLIST, WORK_EMAIL, PERSONAL_EMAIL, LINKEDIN_URL, GITHUB_URL, PLACEHOLDER_RAW, PLACEHOLDER_VISIBLE, PREFERRED_BADGE, AVATAR_MAX_KB, AVATAR_MAX_PX, ORIGINAL_PHOTO_NAMES, MOTION_KEY } from './contact.config.mjs';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const json = argv.includes('--json');
const cvPath = path.resolve(opt('--cv', path.join(import.meta.dirname, '../../docs/Karthik_Muthumari_CV.txt')));
const picsDir = path.resolve(opt('--pics', path.join(import.meta.dirname, '../../pics')));
let base = (opt('--base', process.env.NEXT_PUBLIC_BASE_PATH ?? '')).replace(/\/+$/, '');
const out = path.resolve(argv.filter((a) => !a.startsWith('--'))[0] || '../out');
if (!fs.existsSync(out)) { console.error('out dir not found: ' + out); process.exit(2); }

const IMG_MAX = +(process.env.IMG_MAX_KB || 500) * 1024;
const IMG_TOTAL = +(process.env.IMG_TOTAL_MB || 3) * 1024 * 1024;
const IMG_PX = +(process.env.IMG_MAX_PX || 2400);
const JS_TOTAL = +(process.env.JS_TOTAL_KB || 1500) * 1024;

const results = [];   // {id, status: PASS|FAIL|WARN, msg}
const rec = (id, ok, msg, warnOnly = false) => results.push({ id, status: ok ? 'PASS' : (warnOnly ? 'WARN' : 'FAIL'), msg });

const walk = (d, acc = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p, acc) : acc.push(p); } return acc; };
const files = walk(out);
const rel = (p) => path.relative(out, p).split(path.sep).join('/');
const has = (r) => fs.existsSync(path.join(out, r));
const textOf0 = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

// ---------- 1. structure ----------
for (const r of ['index.html', '404.html', '_next/static']) rec(`structure:${r}`, has(r), has(r) ? 'present' : 'MISSING');
rec('structure:.nojekyll', has('.nojekyll'), has('.nojekyll') ? 'present' : 'MISSING (Pages/Jekyll would drop _next/; CI step creates it – OK if only checking a local build)', !has('.nojekyll') && process.env.ALLOW_NO_NOJEKYLL === '1');
const bad = files.map(rel).filter((r) => /^(api\/|_next\/server\/|\.next\/|.*\.env.*|.*\.(ts|tsx|md|mdx)$)/.test(r) && !/\.(txt)$/.test(r));
rec('structure:no-server-or-source', bad.length === 0, bad.length ? 'unexpected: ' + bad.slice(0, 10).join(', ') : 'no api/, server bundles, .env, raw .md/.ts');
const maps = files.map(rel).filter((r) => r.endsWith('.map'));
rec('structure:no-sourcemaps', maps.length === 0, maps.length ? `${maps.length} .map files published` : 'none', true);
const blogIdx = has('blog/index.html');
rec('structure:blog-index', blogIdx, blogIdx ? 'blog/index.html present' : 'blog/index.html MISSING');
const posts = files.map(rel).filter((r) => /^blog\/[^/]+\/index\.html$/.test(r));
rec('structure:blog-posts', posts.length > 0, `${posts.length} post page(s): ${posts.join(', ')}`);
// favicon
const idxHtml = has('index.html') ? fs.readFileSync(path.join(out, 'index.html'), 'utf8') : '';
const hasIconLink = /<link[^>]+rel=["'](?:shortcut )?icon["']/i.test(idxHtml);
rec('structure:favicon', hasIconLink || has('favicon.ico'), hasIconLink ? 'index.html has <link rel=icon>' : (has('favicon.ico') ? 'favicon.ico present' : 'no favicon'));

// ---------- 2. privacy ----------
const textExt = new Set(['.html', '.js', '.css', '.json', '.txt', '.xml', '.map', '.svg', '.webmanifest', '.rsc', '']);
let phoneRes = [], addrRes = [new RegExp('Ryehill', 'i'), /NG2\s?2LQ/i];
let cvNote = '';
if (fs.existsSync(cvPath)) {
  const cv = fs.readFileSync(cvPath, 'utf8');
  const phones = new Set();
  for (const m of cv.matchAll(/(\+?\d[\d\s().-]{8,}\d)/g)) { const d = m[1].replace(/\D/g, ''); if (d.length >= 10 && d.length <= 15) phones.add(d); }
  for (const d of phones) {
    const body = d.startsWith('44') ? d.slice(2) : d.replace(/^0/, '');
    phoneRes.push(new RegExp(`(?:\\+?44|0)[\\s().-]*${[...body].join('[\\s().-]*')}`));
  }
  cvNote = `${phones.size} phone number(s) derived from CV`;
}
phoneRes.push(/\+44\s?\(?0?\)?\s?777/, /\b0?777\d[\s-]?\d{5,6}\b/, /href=["']tel:/i);
const hits = [];
for (const f of files) {
  const ext = path.extname(f).toLowerCase();
  if (!textExt.has(ext)) continue;
  const t = fs.readFileSync(f, 'utf8');
  for (const re of [...phoneRes, ...addrRes]) if (re.test(t)) hits.push(`${rel(f)} matches /${re.source.length > 30 ? re.source.slice(0, 12) + '…' : re.source}/`);
}
rec('privacy:no-phone-or-address', hits.length === 0, hits.length ? 'LEAK: ' + hits.slice(0, 10).join('; ') : `scanned ${files.length} files for phone/address patterns (${cvNote || 'static patterns only; CV file not found'}): none found`);

// ---------- 2b. contact details (owner-approved: exactly two e-mails, LinkedIn, GitHub; no placeholders) ----------
const EXT_TLD = new Set(['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg', 'ico', 'css', 'js', 'mjs', 'json', 'map', 'txt', 'html', 'woff', 'woff2', 'ttf', 'mp4', 'webm', 'md', 'ts', 'tsx', 'node']);
const allow = new Set(EMAIL_ALLOWLIST.map((e) => e.toLowerCase()));
const foundEmails = new Map();    // email -> [files]
const decode = (t) => t.replace(/\\u0040/gi, '@').replace(/&#(?:x0*40|64);|&commat;/gi, '@').replace(/%40/g, '@');
for (const f of files) {
  if (!textExt.has(path.extname(f).toLowerCase())) continue;
  const t = decode(fs.readFileSync(f, 'utf8'));
  for (const m of t.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g)) {
    const e = m[0].toLowerCase(); const tld = e.split('.').pop();
    if (EXT_TLD.has(tld) && !allow.has(e)) continue;          // image@2x.png, file@1.0.js ...
    (foundEmails.get(e) || foundEmails.set(e, []).get(e)).push(rel(f));
  }
}
const rogue = [...foundEmails.keys()].filter((e) => !allow.has(e));
rec('contact:email-allowlist', rogue.length === 0,
  rogue.length ? 'NON-APPROVED e-mail(s) published: ' + rogue.map((e) => `${e} in ${[...new Set(foundEmails.get(e))].slice(0, 3).join(',')}`).join('; ')
    : `only approved e-mails found in out/: ${[...foundEmails.keys()].join(', ') || '(none)'}`);
const mailtos = new Map();        // lower-case target -> pages
for (const p of files.filter((f) => f.endsWith('.html'))) {
  for (const m of fs.readFileSync(p, 'utf8').matchAll(/href=["']mailto:([^"'?#]+)/gi)) {
    const e = decodeURIComponent(m[1]).toLowerCase(); (mailtos.get(e) || mailtos.set(e, []).get(e)).push(rel(p));
  }
}
const badMailto = [...mailtos.keys()].filter((e) => !allow.has(e));
rec('contact:mailto-targets-approved', badMailto.length === 0, badMailto.length ? 'unexpected mailto: ' + badMailto.join(', ') : `mailto targets: ${[...mailtos.keys()].join(', ') || '(none)'}`);
for (const [label, addr] of [['work', WORK_EMAIL], ['personal', PERSONAL_EMAIL]]) {
  const pgs = mailtos.get(addr.toLowerCase()) || [];
  rec(`contact:mailto-${label}-on-home`, pgs.includes('index.html'), pgs.includes('index.html') ? `<a href="mailto:${addr}"> on index.html (+${pgs.length - 1} other page(s))` : `no mailto:${addr} link on index.html`);
  const withoutLink = files.filter((f) => /(^|\/)index\.html$/.test(f) && !mailtos.get(addr.toLowerCase())?.includes(rel(f))).map(rel);
  rec(`contact:mailto-${label}-all-pages`, withoutLink.length === 0, withoutLink.length ? `missing on: ${withoutLink.join(', ')}` : 'present on every page (footer/contact)', true);
}
// ---- Round 2: WORK e-mail is the PREFERRED contact (first, badged, hero mail icon, JSON-LD) ----
{
  const home = idxHtml;
  const firstMail = (h) => { const m = h.match(/href=["']mailto:([^"'?#]+)/i); return m ? decodeURIComponent(m[1]).toLowerCase() : null; };
  const order = [...home.matchAll(/href=["']mailto:([^"'?#]+)/gi)].map((m) => decodeURIComponent(m[1]).toLowerCase());
  rec('contact:work-first-on-home', firstMail(home) === WORK_EMAIL.toLowerCase(), `first mailto in index.html = ${firstMail(home)}; sequence: ${[...new Set(order)].join(' -> ')}`);
  // every block (hero / contact / footer): the first mailto inside must be the work address, and personal must never precede work
  const regions = { contact: /<section\b[^>]*\bid=["']contact["'][\s\S]*?<\/section>/i, footer: /<footer\b[\s\S]*?<\/footer>/i, hero: /<section\b[^>]*\bid=["']about["'][\s\S]*?<\/section>/i };
  const bad2 = [];
  for (const [name, re] of Object.entries(regions)) {
    const m = home.match(re); if (!m) { if (name !== 'hero') bad2.push(`${name}: region not found`); continue; }
    const seq = [...m[0].matchAll(/href=["']mailto:([^"'?#]+)/gi)].map((x) => decodeURIComponent(x[1]).toLowerCase());
    if (seq.length && seq[0] !== WORK_EMAIL.toLowerCase()) bad2.push(`${name}: first mailto is ${seq[0]}`);
    if (name === 'hero' && seq.includes(PERSONAL_EMAIL.toLowerCase())) bad2.push('hero: mailto points at the personal address');
    if (name === 'contact' && !seq.includes(WORK_EMAIL.toLowerCase())) bad2.push('contact: no work mailto');
  }
  rec('contact:work-first-in-hero-contact-footer', bad2.length === 0, bad2.length ? bad2.join('; ') : 'hero mail icon, #contact and <footer>: work address comes first (hero links only to work)');
  // nav/header: if it carries any mailto it must be the work address
  const hdr = home.match(/<header\b[\s\S]*?<\/header>/i); const hdrMails = hdr ? [...hdr[0].matchAll(/href=["']mailto:([^"'?#]+)/gi)].map((x) => decodeURIComponent(x[1]).toLowerCase()) : [];
  rec('contact:nav-mailto-is-work-if-any', hdrMails.every((e) => e === WORK_EMAIL.toLowerCase()), hdrMails.length ? `header mailto: ${[...new Set(hdrMails)].join(', ')}` : 'header/nav has no mailto (CTA is the #contact anchor)');
  rec('contact:preferred-badge-present', PREFERRED_BADGE.test(textOf0(home)), PREFERRED_BADGE.test(textOf0(home)) ? '"Preferred" label is in the static HTML' : 'no "Preferred" text found in index.html');
  // JSON-LD Person.email
  const ld = [...home.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const emails = []; const walkLd = (o) => { if (Array.isArray(o)) o.forEach(walkLd); else if (o && typeof o === 'object') { for (const [k, v] of Object.entries(o)) { if (k === 'email') emails.push(String(v)); walkLd(v); } } };
  let ldErr = ''; for (const t of ld) { try { walkLd(JSON.parse(t)); } catch (e) { ldErr = e.message; } }
  const ldNorm = emails.map((e) => e.replace(/^mailto:/i, '').toLowerCase());
  rec('contact:jsonld-email-is-work', !ldErr && ld.length > 0 && ldNorm.length > 0 && ldNorm.every((e) => e === WORK_EMAIL.toLowerCase()),
    ldErr ? `JSON-LD parse error: ${ldErr}` : (!ld.length ? 'no application/ld+json block on /' : (ldNorm.length ? `JSON-LD email(s): ${ldNorm.join(', ')}` : 'JSON-LD has no email property')));
  rec('contact:jsonld-no-personal-email', !ld.join(' ').toLowerCase().includes(PERSONAL_EMAIL.toLowerCase()), 'personal address must not be the structured-data contact');
}
// LinkedIn / GitHub: exact URLs, no other profile links on site pages (blog posts may cite other GitHub repos)
const socialProblems = []; const seenSocial = new Set();
for (const p of files.filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(p, 'utf8'); const isPost = /^blog\/[^/]+\/index\.html$/.test(rel(p));
  for (const m of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    const h = m[1].replace(/&amp;/g, '&');
    if (/^https?:\/\/([a-z0-9-]+\.)*linkedin\.com/i.test(h)) { seenSocial.add(h); if (h !== LINKEDIN_URL) socialProblems.push(`${rel(p)}: ${h}`); }
    if (/^https?:\/\/([a-z0-9-]+\.)*github\.com/i.test(h) && !isPost) { seenSocial.add(h); if (h !== GITHUB_URL) socialProblems.push(`${rel(p)}: ${h}`); }
  }
}
rec('contact:social-urls-exact', socialProblems.length === 0 && seenSocial.has(LINKEDIN_URL) && seenSocial.has(GITHUB_URL),
  socialProblems.length ? 'wrong URL(s): ' + socialProblems.slice(0, 5).join(' | ') : (seenSocial.has(LINKEDIN_URL) && seenSocial.has(GITHUB_URL) ? `exact ${LINKEDIN_URL} and ${GITHUB_URL} present; no other linkedin/github profile links` : `missing: ${[LINKEDIN_URL, GITHUB_URL].filter((u) => !seenSocial.has(u)).join(', ')}`));
const phHits = [];
for (const f of files) {
  const ext = path.extname(f).toLowerCase();
  if (!['.html', '.txt', '.json', '.xml', '.webmanifest'].includes(ext) && !/_next\/static\/chunks\/(app|pages)\//.test(f.split(path.sep).join('/'))) continue;
  const t = fs.readFileSync(f, 'utf8');
  for (const re of PLACEHOLDER_RAW) if (re.test(t)) phHits.push(`${rel(f)} ~ ${re.source}`);
}
rec('contact:no-placeholder-urls', phHits.length === 0, phHits.length ? phHits.slice(0, 6).join(' | ') : 'no hello@example.com / example.com / your-*-handle in HTML, RSC payloads or app chunks');

// original photos
const origHashes = new Map();
if (fs.existsSync(picsDir)) for (const f of fs.readdirSync(picsDir)) {
  const p = path.join(picsDir, f); if (fs.statSync(p).isFile()) origHashes.set(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'), f);
}
const leakedOrig = [];
const imgs = [];
const IMGEXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
for (const f of files) {
  const ext = path.extname(f).toLowerCase();
  if (/(^|\/)DSC\d+/i.test(rel(f))) leakedOrig.push(rel(f) + ' (camera filename)');
  if (IMGEXT.has(ext) || ext === '.svg' || ext === '.ico') {
    const st = fs.statSync(f);
    if (st.size > 2 * 1024 * 1024) leakedOrig.push(rel(f) + ` (${(st.size / 1048576).toFixed(1)} MB)`);
    if (origHashes.size && origHashes.has(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'))) leakedOrig.push(rel(f) + ' == original ' + origHashes.get(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')));
    if (IMGEXT.has(ext)) imgs.push({ f, size: st.size });
  }
}
rec('privacy:no-original-photos', leakedOrig.length === 0, leakedOrig.length ? 'FOUND: ' + leakedOrig.join('; ') : `no DSC* names, no image >2MB, no sha256 match with ${origHashes.size} originals in pics/`);

// ---------- 3. image budget, dimensions, EXIF/GPS ----------
function dims(buf, ext) {
  try {
    if (ext === '.png') return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    if (ext === '.gif') return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
    if (ext === '.jpg' || ext === '.jpeg') {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const m = buf[i + 1];
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
    if (ext === '.webp' && buf.toString('ascii', 0, 4) === 'RIFF') {
      const fmt = buf.toString('ascii', 12, 16);
      if (fmt === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
      if (fmt === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
      if (fmt === 'VP8L') { const b = buf.readUInt32LE(21); return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]; }
    }
  } catch { /* ignore */ }
  return null;
}
function jpegHasGps(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return false;
  let i = 2;
  while (i < buf.length - 4 && buf[i] === 0xff) {
    const m = buf[i + 1]; const len = buf.readUInt16BE(i + 2);
    if (m === 0xe1 && buf.toString('ascii', i + 4, i + 8) === 'Exif') {
      const t = i + 10; const le = buf.toString('ascii', t, t + 2) === 'II';
      const r16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o)); const r32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
      const ifd = t + r32(t + 4); const n = r16(ifd);
      for (let k = 0; k < n; k++) if (r16(ifd + 2 + k * 12) === 0x8825) return true;
      return false;
    }
    i += 2 + len;
  }
  return false;
}
let total = 0; const oversize = [], big = [], gps = [];
for (const { f, size } of imgs) {
  total += size;
  const ext = path.extname(f).toLowerCase(); const buf = fs.readFileSync(f);
  if (size > IMG_MAX) oversize.push(`${rel(f)} ${(size / 1024).toFixed(0)}KB`);
  const d = dims(buf, ext); if (d && Math.max(...d) > IMG_PX) big.push(`${rel(f)} ${d.join('x')}`);
  if ((ext === '.jpg' || ext === '.jpeg') && jpegHasGps(buf)) gps.push(rel(f));
}
rec('images:per-file-budget', oversize.length === 0, oversize.length ? `> ${IMG_MAX / 1024}KB: ${oversize.join('; ')}` : `${imgs.length} raster images, all ≤ ${IMG_MAX / 1024}KB`);
rec('images:total-budget', total <= IMG_TOTAL, `total raster image bytes = ${(total / 1048576).toFixed(2)} MB (budget ${(IMG_TOTAL / 1048576).toFixed(0)} MB)`);
rec('images:max-dimension', big.length === 0, big.length ? `> ${IMG_PX}px: ${big.join('; ')}` : `no image longer side > ${IMG_PX}px`, true);
rec('privacy:no-exif-gps', gps.length === 0, gps.length ? 'EXIF GPS in: ' + gps.join(', ') : 'no GPS EXIF tag in any JPEG');

// ---- Round 2: hero photo = web copy of pics/MyProfilePic.PNG ----
{
  const bn = (f) => path.basename(f);
  const origNames = files.filter((f) => ORIGINAL_PHOTO_NAMES.some((re) => re.test(bn(f)))).map(rel);
  rec('images:no-original-or-leftover-names', origNames.length === 0, origNames.length ? 'shipped but must not be: ' + origNames.join(', ') : 'no MyProfilePic.* original, no DSC*, no portrait-{square,tall,wide}.jpg leftovers in out/');
  const upper = files.map(rel).filter((r) => /\.(PNG|JPG|JPEG|WEBP|GIF|AVIF)$/.test(r) || (IMGEXT.has(path.extname(r).toLowerCase()) && path.basename(r) !== path.basename(r).toLowerCase()));
  rec('images:lowercase-filenames', upper.length === 0, upper.length ? 'upper-case image name/extension (404s on case-sensitive Pages): ' + upper.join(', ') : 'every image file name and extension is lowercase');
  // the image the hero actually uses: <img> with data-avatar-state or alt containing "portrait" (before next/image or plain)
  const hero = [...idxHtml.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]).filter((t) => /data-avatar-state|portrait/i.test(t));
  rec('images:hero-img-found', hero.length > 0, hero.length ? `${hero.length} hero <img>: ${hero[0].slice(0, 140)}` : 'no <img data-avatar-state|alt~portrait> in index.html');
  for (const tag of hero.slice(0, 1)) {
    const m = tag.match(/\bsrc=["']([^"']+)["']/i); let src = m ? m[1].split('?')[0] : '';
    const okBase = !base || src.startsWith(base + '/');
    rec('images:hero-src-has-base', okBase, src + (base ? ` (base ${base})` : ''));
    const rp = src.slice(base.length).replace(/^\//, ''); const fp = path.join(out, rp);
    rec('images:hero-file-exists-lowercase', has(rp) && rp === rp.toLowerCase() && !/portrait-(square|tall|wide)/.test(rp), `${rp} exists=${has(rp)} lowercase=${rp === rp.toLowerCase()}`);
    if (has(rp)) {
      const st = fs.statSync(fp); const buf = fs.readFileSync(fp); const ext = path.extname(fp).toLowerCase(); const d = dims(buf, ext);
      rec('images:hero-size-budget', st.size <= AVATAR_MAX_KB * 1024, `${rp} = ${(st.size / 1024).toFixed(0)} KB (budget ${AVATAR_MAX_KB} KB)`);
      rec('images:hero-dimensions', !!d && Math.max(...d) <= AVATAR_MAX_PX && Math.min(...d) >= 400, d ? `${d.join('x')} (400..${AVATAR_MAX_PX}px; the multi-megapixel original must not ship)` : 'could not read dimensions');
      const sha = crypto.createHash('sha256').update(buf).digest('hex');
      rec('images:hero-not-original', !origHashes.has(sha), origHashes.has(sha) ? 'IDENTICAL to ' + origHashes.get(sha) : `sha256 differs from all ${origHashes.size} originals in pics/`);
    }
  }
  // metadata in non-JPEG rasters (PNG eXIf/tEXt-GPS, WebP EXIF chunk) – jpegHasGps only covers JPEG
  const meta = [];
  for (const { f } of imgs) {
    const ext = path.extname(f).toLowerCase(); const b = fs.readFileSync(f);
    if (ext === '.png') { let i = 8; while (i + 8 <= b.length) { const len = b.readUInt32BE(i); const typ = b.toString('ascii', i + 4, i + 8); if (typ === 'eXIf') meta.push(rel(f) + ' (PNG eXIf chunk)'); if ((typ === 'tEXt' || typ === 'iTXt' || typ === 'zTXt') && /GPS|Exif|xmp/i.test(b.toString('latin1', i + 8, i + 8 + Math.min(len, 400)))) meta.push(rel(f) + ` (PNG ${typ} metadata)`); if (typ === 'IEND') break; i += 12 + len; } }
    if (ext === '.webp' && b.toString('ascii', 0, 4) === 'RIFF') { let i = 12; while (i + 8 <= b.length) { const typ = b.toString('ascii', i, i + 4); const len = b.readUInt32LE(i + 4); if (typ === 'EXIF' || typ === 'XMP ') meta.push(rel(f) + ` (WebP ${typ.trim()} chunk)`); i += 8 + len + (len & 1); } }
    if ((ext === '.jpg' || ext === '.jpeg') && b.includes(Buffer.from('http://ns.adobe.com/xap/1.0/')) && /GPS/i.test(b.toString('latin1', 0, Math.min(b.length, 65536)))) meta.push(rel(f) + ' (JPEG XMP GPS)');
  }
  rec('privacy:no-exif-in-png-webp-xmp', meta.length === 0, meta.length ? 'metadata present: ' + meta.join('; ') : 'no EXIF/XMP/GPS metadata chunk in any PNG/WebP/JPEG');
}

// ---- Round 2: motion-tier + failsafe plumbing visible in the export (static smoke only; behaviour is tested in e2e.mjs) ----
{
  const chunkText = files.filter((f) => /_next\/static\/chunks\/.*\.js$/.test(f.split(path.sep).join('/'))).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const hasKey = chunkText.includes(`"${MOTION_KEY}"`) || chunkText.includes(`'${MOTION_KEY}'`);
  rec('motion:tier-code-shipped', /gentle/.test(chunkText) && hasKey && /data-motion|dataset\.motion|\.motion\s*=/.test(chunkText + idxHtml), `chunks contain "gentle" tier=${/gentle/.test(chunkText)}, localStorage key "${MOTION_KEY}"=${hasKey}, data-motion hook=${/data-motion|dataset\.motion/.test(chunkText + idxHtml)}`);
  const ns = /<noscript>[\s\S]*?<style>[\s\S]*?opacity\s*:\s*1[\s\S]*?<\/style>[\s\S]*?<\/noscript>/i.test(idxHtml);
  rec('motion:noscript-reveal-fallback', ns, ns ? '<noscript><style> forces opacity:1 so no-JS visitors do not see an empty page' : 'no <noscript> style override: with JS disabled framer "initial" styles (opacity:0) leave content invisible');
}

// ---------- 4. JS weight ----------
const js = files.filter((f) => /_next\/static\/chunks\/.*\.js$/.test(f.split(path.sep).join('/')));
const jsBytes = js.reduce((a, f) => a + fs.statSync(f).size, 0);
rec('weight:js-total', jsBytes <= JS_TOTAL, `${js.length} chunks, ${(jsBytes / 1024).toFixed(0)} KB uncompressed (budget ${JS_TOTAL / 1024} KB; all-routes sum, not first-load)`, true);
const totalAll = files.reduce((a, f) => a + fs.statSync(f).size, 0);
rec('weight:out-total', totalAll < 20 * 1024 * 1024, `out/ = ${(totalAll / 1048576).toFixed(2)} MB across ${files.length} files`, true);

// ---------- 5. HTML lint (a11y/SEO/blog rendering) ----------
const pages = files.filter((f) => f.endsWith('.html'));
const problems = {};
const P = (k, page, msg) => { (problems[k] ||= []).push(`${rel(page)}${msg ? ': ' + msg : ''}`); };
const textOf = (h) => h.replace(/<a\b[^>]*>\s*#\s*<\/a>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
for (const p of pages) {
  const h = fs.readFileSync(p, 'utf8'); const is404 = rel(p).startsWith('404');
  if (!/<html[^>]+lang=["'][a-z-]+["']/i.test(h)) P('html-lang', p);
  if (!/<title>[^<]{2,}<\/title>/i.test(h)) P('title', p);
  const vp = h.match(/<meta[^>]+name=["']viewport["'][^>]*content=["']([^"']+)["']/i);
  if (!vp || !/width=device-width/.test(vp[1])) P('viewport', p, 'missing width=device-width');
  else if (/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(vp[1])) P('viewport-zoom', p, vp[1]);
  if (!is404 && !/<meta[^>]+name=["']description["']/i.test(h)) P('meta-description', p);
  const h1 = (h.match(/<h1[\s>]/gi) || []).length;
  if (h1 !== 1) P('single-h1', p, `${h1} <h1>`);
  for (const im of h.matchAll(/<img\b[^>]*>/gi)) if (!/\balt=/.test(im[0])) P('img-alt', p, im[0].slice(0, 80));
  for (const a of h.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)) if (!/rel=["'][^"']*noopener/.test(a[0])) P('noopener', p, a[0].slice(0, 80));
  if (!/<main\b/i.test(h) && !is404) P('landmark-main', p);
  const t = textOf(h);
  const ph = t.match(PLACEHOLDER_VISIBLE); if (ph) P('placeholder-text', p, ph[0]);
  if (/\b(undefined|\[object Object\]|NaN)\b/.test(t)) P('rendered-garbage', p, (t.match(/.{0,30}\b(undefined|\[object Object\]|NaN)\b.{0,30}/) || [''])[0]);
  if (/^blog\/[^/]+\/index\.html$/.test(rel(p))) {
    if (t.length < 400) P('blog-content-length', p, `only ${t.length} chars of text`);
    // (code blocks may legitimately show markdown, so <pre> is stripped first)
    if (/(^|\s)#{1,6}\s\w|```|\*\*\w|^---\s*title:|\btitle:\s.*\bdate:/m.test(textOf(h.replace(/<pre[\s\S]*?<\/pre>/gi, ' ')))) P('blog-raw-markdown', p, 'raw markdown/frontmatter leaked into HTML text');
    if (!/<article\b/i.test(h)) P('blog-article-tag', p);
  }
}
const lintRules = { 'html-lang': 'FAIL', title: 'FAIL', viewport: 'FAIL', 'viewport-zoom': 'FAIL', 'meta-description': 'WARN', 'single-h1': 'FAIL', 'img-alt': 'FAIL', noopener: 'WARN', 'landmark-main': 'WARN', 'rendered-garbage': 'FAIL', 'placeholder-text': 'FAIL', 'blog-content-length': 'FAIL', 'blog-raw-markdown': 'FAIL', 'blog-article-tag': 'WARN' };
for (const [k, sev] of Object.entries(lintRules)) {
  const v = problems[k];
  rec(`html:${k}`, !v, v ? `${v.length} page(s): ${v.slice(0, 5).join(' | ')}` : `ok on ${pages.length} pages`, sev === 'WARN');
}

// ---------- report ----------
const nFail = results.filter((r) => r.status === 'FAIL').length;
if (json) console.log(JSON.stringify({ out, nFail, results }, null, 2));
else {
  console.log(`check-export  out=${out}`);
  for (const r of results) console.log(`  ${r.status.padEnd(4)}  ${r.id.padEnd(32)} ${r.msg}`);
  console.log(nFail ? `RESULT: FAIL (${nFail} failing checks)` : `RESULT: PASS (${results.filter((r) => r.status === 'WARN').length} warnings)`);
}
process.exit(nFail ? 1 : 0);
