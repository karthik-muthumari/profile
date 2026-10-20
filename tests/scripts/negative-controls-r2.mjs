#!/usr/bin/env node
// Round-2 negative controls: proves the new browser checks can FAIL. Serves tiny mock pages that contain exactly one
// planted defect each and requires e2e-round2.mjs / anim-audit.mjs to flag it (and the "good" mock to pass).
//   node negative-controls-r2.mjs            (no build needed; uses Chrome like e2e-round2)
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { auditViewport, failing } from './anim-audit.mjs';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const here = import.meta.dirname;

const FOOT = (rowsCss, extra = '') => `<footer><div class="container-x" style="padding:0 16px;max-width:1152px;margin:0 auto"><h2 style="font-size:12px">Contact</h2>
<style>.row{display:flex;gap:12px;min-height:44px;align-items:center;text-decoration:none;color:#06c} .lab{font-size:12px;text-transform:uppercase;width:80px} ${rowsCss}</style>
<a class="row" href="mailto:karthik.muthumari@mindera.com"><span class="lab">Work</span><span class="ad">karthik.muthumari@<wbr>mindera.com</span></a>
<a class="row" href="mailto:karthikmuthumari7@gmail.com"><span class="lab">Personal</span><span class="ad">karthikmuthumari7@<wbr>gmail.com</span></a>${extra}
<p>© 2026 Karthik Muthumari</p></div></footer>`;
const page = (body, head = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>mock</title>${head}</head><body style="margin:0;font:14px sans-serif"><main><h1>Mock</h1>${'<p>filler</p>'.repeat(40)}</main>${body}</body></html>`;

const REVEAL_OK = `<main id="m"><div id="a" style="opacity:0;transform:translateY(20px)">Revealed item</div><div style="height:2000px"></div></main><script>setTimeout(()=>{const a=document.getElementById('a');a.style.opacity='1';a.style.transform='none'},300)</script>`;
const SITES = {
  // footer controls (each: one planted layout defect). Good variant = left aligned stacked rows.
  '/footer-good/': page(FOOT('.row{flex-direction:column;align-items:flex-start;gap:0}.lab{width:auto}')),
  '/footer-zigzag/': page(FOOT('.row{justify-content:center}')),                       // the live-site bug: each row centred independently
  '/footer-overflow/': page(FOOT('.ad{white-space:nowrap;font-size:20px}')),             // address wider than a 320px phone
  '/footer-overlap/': page(FOOT('.lab{position:absolute;width:auto} .row{position:relative}')),   // labels laid on top of the addresses
  '/footer-leftedge/': page(FOOT('.row{flex-direction:column;align-items:flex-start;gap:0}.lab{width:auto}', '')).replace('<a class="row" href="mailto:karthikmuthumari7', '<a class="row" style="padding-left:9px" href="mailto:karthikmuthumari7'),   // one row indented 9px
  // motion tiers: a page that ignores the OS reduce-motion setting and has no control
  '/no-tiers/': page('<footer><p>© 2026</p></footer>'),
  // animation completion
  '/anim-good/': page(REVEAL_OK),
  '/anim-stuck-opacity/': page(`<main><div style="opacity:0">Never revealed paragraph</div><div style="height:2000px"></div></main>`),
  '/anim-stuck-transform/': page(`<main><div id="a" style="opacity:1;transform:translateY(30px)">Parked 30px below its place</div><div style="height:2000px"></div></main><script>setTimeout(()=>{document.getElementById('a').style.opacity='0.999'},400)</script>`),
};
const srv = http.createServer((req, res) => { const p = new URL(req.url, 'http://x').pathname; const b = SITES[p] || SITES[p.endsWith('/') ? p : p + '/']; if (!b) { res.statusCode = 404; return res.end('nope'); } res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(b); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${srv.address().port}`;
const shots = fs.mkdtempSync(path.join(os.tmpdir(), 'nc2-'));

const runE2E = (route, only) => {
  // e2e-round2 appends route to origin+base: use base = route (the mock serves '/<name>/' as the "home")
  const r = spawnSync('node', [path.join(here, 'e2e-round2.mjs'), origin, '--base', route.replace(/\/$/, ''), '--only', only, '--out', shots], { encoding: 'utf8', maxBuffer: 1 << 26 });
  return r.stdout.split('\n').filter((l) => /^(PASS|FAIL|WARN)/.test(l)).map((l) => ({ st: l.slice(0, 4).trim(), id: l.slice(5).split('  ')[0] }));
};
let bad = 0;
const expectFail = (name, rows, re) => { const hit = rows.filter((x) => x.st === 'FAIL' && re.test(x.id)); const ok = hit.length > 0; if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  control "${name}" -> expected FAIL matching ${re}; got ${hit.length ? hit.map((h) => h.id).slice(0, 3).join(' | ') : 'no such FAIL (' + rows.filter((x) => x.st === 'FAIL').length + ' other FAILs)'}`); };
const expectNoFail = (name, rows, re) => { const hit = rows.filter((x) => x.st === 'FAIL' && re.test(x.id)); const ok = hit.length === 0 && rows.length > 0; if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  baseline "${name}" -> no FAIL matching ${re}${ok ? '' : ': ' + hit.map((h) => h.id).join(' | ')}`); };

// footer geometry checks (the mock pages are phone/desktop agnostic; checks run at 320..1280)
const good = runE2E('/footer-good/', 'footer');
expectNoFail('left-aligned footer (stacked rows)', good, /labels share|addresses share|overlapping|outside viewport|horizontal scroll|spilling|same layout|stacked above/);
expectFail('zig-zag footer (each row centred) -> labels/addresses misaligned', runE2E('/footer-zigzag/', 'footer'), /labels share one left edge|addresses share one left edge/);
expectFail('address wider than a 320px phone -> overflow', runE2E('/footer-overflow/', 'footer'), /no horizontal scroll @320|no text outside viewport @320|spilling/);
expectFail('labels positioned over addresses -> overlap', runE2E('/footer-overlap/', 'footer'), /overlapping text lines|label left of address, clear gap|stacked above address/);
expectFail('one row indented 9px -> misaligned labels', runE2E('/footer-leftedge/', 'footer'), /labels share one left edge|addresses share one left edge/);
// motion tiers
expectFail('site ignoring OS reduce-motion / no tier control', runE2E('/no-tiers/', 'tiers'), /defaults to "gentle"|footer control offers|control shows Gentle/);

// animation completion audit
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const aud = async (route) => { const r = await auditViewport(browser, origin, route, 375, 667, null, 'nc', {}); return failing(r); };
const g = await aud('/anim-good/'); { const ok = g.length === 0; if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  baseline "element that animates in and settles" -> audit finds ${g.length} stuck`); }
const so = await aud('/anim-stuck-opacity/'); { const ok = so.length > 0; if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  control "element left at opacity:0" -> audit flags ${so.length} (${so.map((x) => x.k).join(',')})`); }
const st = await aud('/anim-stuck-transform/'); { const ok = st.some((x) => /transform/.test(x.reason || '')); if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  control "element parked on translateY(30px)" -> audit flags ${st.length} (${st.map((x) => x.reason).join(',')})`); }
await browser.close(); srv.close(); fs.rmSync(shots, { recursive: true, force: true });
console.log(bad ? `NEGATIVE CONTROLS R2: FAIL (${bad})` : 'NEGATIVE CONTROLS R2: PASS (round-2 browser checks proven able to fail)');
process.exit(bad ? 1 : 0);
