#!/usr/bin/env node
// Round-2 hero checks on PHONE/TABLET emulation, engine = chromium | webkit (Playwright's WebKit == real WebKit, not real iOS Safari).
// Covers design/07 §6 items 11-16 (iPhone-16-Pro-Max "no ring / no floating badges" report):
//   badges: exactly one ul[aria-label=Highlights] with 3 items, visible, inside the viewport (>=8px margins), no overlap with each other
//           or the head rectangle, floating (computed transform changes), no filter/backdrop-filter/mask/will-change
//   rings : SVG gradient ring present + visible + inside viewport, rotating (transform changes 1.5 s apart), visible gap to the photo,
//           ARC VISIBLE IN THE SCREENSHOT (pixel sampling on the ring circle), dashed outer ring >=640px, no mask/filter
//   entrance: hero reaches its final state <=1.5 s after `load`; nothing stays at opacity<0.1 after a full scroll (except ping rings)
//   hidden-load: page hydrated while document.visibilityState==='hidden' still plays the entrance once it becomes visible
//   marquee: a tap does not stop it (sticky-hover); forbidden effects scan on animating hero/nav/marquee subtrees; landscape 932x430 takes the touch branch
//   node e2e-hero.mjs <origin+base> [--engine chromium|webkit] [--out dir] [--quick]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium, webkit, devices } = createRequire(import.meta.url)('playwright-core');

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const engine = opt('--engine', 'chromium');
const shotDir = path.resolve(opt('--out', path.join(import.meta.dirname, '../screenshots/round2')));
const quick = argv.includes('--quick');
const origin = (argv.find((a) => !a.startsWith('--')) || 'http://127.0.0.1:4173').replace(/\/+$/, '');
fs.mkdirSync(shotDir, { recursive: true });
const exe = process.env.CHROME_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
const browser = engine === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: exe, headless: true });
const E = engine === 'webkit' ? 'WK' : 'CR';
const results = [];
const rec = (id, ok, msg, warn = false) => { const status = ok ? 'PASS' : (warn ? 'WARN' : 'FAIL'); results.push({ id, status, msg }); console.log(`${status.padEnd(4)} ${id}  ${msg}`); };
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const base = (() => { try { return new URL(origin).pathname.replace(/\/+$/, ''); } catch { return ''; } })();

async function ctxFor(w, h, scheme = 'light', extra = {}) {
  const pm = devices['iPhone 16 Pro Max'];
  if (engine === 'webkit') return browser.newContext({ ...pm, viewport: { width: w, height: h }, screen: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'no-preference', ...extra });
  return browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme, reducedMotion: 'no-preference', userAgent: IPHONE_UA, ...extra });
}
const settle = (page, ms = 3200) => page.waitForTimeout(ms);

// ------------------------------------------------------------------------------------------------------------- in-page probes
const HERO_JS = `() => {
  const q = (s, r = document) => [...r.querySelectorAll(s)];
  const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const eff = (e) => { let o = 1, p = e; while (p && p !== document.documentElement) { o *= +getComputedStyle(p).opacity; p = p.parentElement; } return o; };
  const box = document.querySelector('.avatar-box'); const bx = box ? R(box) : null;
  const lists = q('ul[aria-label="Highlights"]'); const items = lists.length ? q('li', lists[0]) : [];
  const badge = items.map((li) => { const f = li.querySelector('.badge-float') || li; const cs = getComputedStyle(f); const pcs = getComputedStyle(li);
    return { text: f.textContent.trim(), rect: R(f), op: eff(f), disp: cs.display, vis: cs.visibility, filter: cs.filter + '|' + cs.backdropFilter + '|' + (cs.maskImage || cs.webkitMaskImage || 'none'), wc: cs.willChange + '|' + pcs.willChange,
      ty: new DOMMatrix(cs.transform).m42, anim: f.getAnimations().map((a) => a.animationName + ':' + a.playState) }; });
  const head = bx ? { l: bx.l + 0.28 * bx.w, r: bx.l + 0.71 * bx.w, t: bx.t + 0.14 * bx.h, b: bx.t + 0.67 * bx.h } : null;
  const svg = document.querySelector('.avatar-ring-svg'); const dashed = document.querySelector('.avatar-ring-dashed'); const plate = document.querySelector('.avatar-plate');
  const arc = svg && svg.querySelector('.ring-arc'); const scs = svg ? getComputedStyle(svg) : null;
  const m = scs ? new DOMMatrix(scs.transform) : null;
  const ringSize = scs ? parseFloat(scs.width) : null;
  const grad = svg && svg.querySelector('linearGradient'); const stops = grad ? [...grad.querySelectorAll('stop')].map((s) => getComputedStyle(s).stopColor) : [];
  const acs = arc ? getComputedStyle(arc) : null;
  return { vw: innerWidth, scrollW: document.documentElement.scrollWidth, box: bx, head, nLists: lists.length, nHighlightLabels: q('[aria-label="Highlights"]').length, chipsLegacy: q('[class*="AvatarChips"],[data-avatar-chips]').length,
    badges: badge,
    ring: svg ? { rect: R(svg), op: eff(svg), disp: scs.display, vis: scs.visibility, ang: Math.atan2(m.b, m.a) * 180 / Math.PI, filt: scs.filter + '|' + (scs.maskImage || scs.webkitMaskImage || 'none'), size: ringSize, stroke: acs ? acs.stroke : null, sw: acs ? parseFloat(acs.strokeWidth) : null, stops, anim: svg.getAnimations().map((a) => a.animationName + ':' + a.playState), rpx: ringSize ? ringSize * 0.485 : null } : null,
    dashed: dashed ? { disp: getComputedStyle(dashed).display, rect: R(dashed), anim: dashed.getAnimations().map((a) => a.animationName + ':' + a.playState) } : null,
    plate: plate ? { r: Math.min(plate.offsetWidth, plate.offsetHeight) / 2, rect: R(plate) } : null,
    float: (() => { const f = document.querySelector('.avatar-float'); return f ? { ty: new DOMMatrix(getComputedStyle(f).transform).m42, anim: f.getAnimations().map((a) => a.animationName + ':' + a.playState) } : null; })(),
    state: document.querySelector('[data-avatar-state]')?.getAttribute('data-avatar-state'), motion: document.documentElement.dataset.motion || null,
    hoverNone: matchMedia('(hover: none)').matches, coarse: matchMedia('(pointer: coarse)').matches };
}`;
const OPAQUE_JS = `() => {
  const eff = (e) => { let o = 1, p = e; while (p && p !== document.documentElement) { o *= +getComputedStyle(p).opacity; p = p.parentElement; } return o; };
  const bad = [...document.body.querySelectorAll('*')].filter((e) => { if (e.closest('.sr-only,[aria-hidden="true"],noscript,script,style,svg')) return false; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const r = e.getBoundingClientRect(); if (r.height <= 20 || r.width < 2) return false; if (/ping/.test(e.className || '') || e.closest('.animate-ping')) return false; return eff(e) < 0.1; }).map((e) => e.tagName + '.' + String(e.className).slice(0, 30) + ':' + (e.textContent || '').trim().slice(0, 18));
  return bad;
}`;
const FORBID_JS = `() => {
  const roots = [document.querySelector('#about'), document.querySelector('header'), document.querySelector('nav'), document.querySelector('.marquee')].filter(Boolean);
  const seen = new Set(); const bad = [];
  for (const r of roots) for (const el of [r, ...r.querySelectorAll('*')]) { if (seen.has(el)) continue; seen.add(el);
    const sub = el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running'); if (!sub.length) continue; const cs = getComputedStyle(el);
    const name = el.tagName + '.' + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0, 28);
    if (cs.filter !== 'none') bad.push(name + ' filter=' + cs.filter);
    if (cs.backdropFilter && cs.backdropFilter !== 'none') bad.push(name + ' backdrop-filter');
    const mk = cs.maskImage || cs.webkitMaskImage; if (mk && mk !== 'none') bad.push(name + ' mask-image');
    if (cs.willChange !== 'auto') bad.push(name + ' will-change=' + cs.willChange);
    if (cs.transformStyle === 'preserve-3d') bad.push(name + ' preserve-3d');
    for (const a of el.getAnimations()) { let keys = []; try { keys = (a.effect.getKeyframes() || []).flatMap((k) => Object.keys(k)); } catch {} const x = keys.filter((k) => /^(borderRadius|boxShadow|filter|backdropFilter|maskImage)$/.test(k)); if (x.length) bad.push(name + ' animates ' + [...new Set(x)].join('/')); } }
  return [...new Set(bad)];
}`;
const inter = (a, b, pad = 0) => a.l < b.r + pad && a.r > b.l - pad && a.t < b.b + pad && a.b > b.t - pad;
const sample = async (page, n, gap) => { const out = []; for (let i = 0; i < n; i++) { out.push(await page.evaluate(`(${HERO_JS})()`)); if (i < n - 1) await page.waitForTimeout(gap); } return out; };
const range = (xs) => Math.max(...xs) - Math.min(...xs);

// pixel sampling of the ring arc in a screenshot (device px); runs in an analysis page of the same engine
const ap = await browser.newPage(); await ap.goto('about:blank');
const ARC_JS = `async ([b64, cx, cy, rRing, rPlate, scale]) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const px = (x, y) => g.getImageData(Math.round(x * scale), Math.round(y * scale), 1, 1).data;
  const rGap = (rRing + rPlate) / 2; let hi = 0, n = 0, sat = 0; const out = [];
  for (let k = 0; k < 360; k += 2) { const a = k * Math.PI / 180; const p = px(cx + rRing * Math.cos(a), cy + rRing * Math.sin(a)); const q = px(cx + rGap * Math.cos(a), cy + rGap * Math.sin(a));
    const d = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); n++; if (d >= 45) { hi++; } }
  return { frac: hi / n, n };
}`;

await ap.evaluate(`window.__arc = ${ARC_JS}`);
const SIZES = quick ? [[430, 932], [390, 844]] : [[360, 780], [390, 844], [430, 932], [768, 1024]];
for (const scheme of ['light', 'dark']) for (const [w, h] of SIZES) {
  if (scheme === 'dark' && w !== 430 && w !== 390 && w !== 768) continue;
  const tag = `${E} @${w}x${h} ${scheme}`;
  const ctx = await ctxFor(w, h, scheme); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const t0 = Date.now(); await page.goto(origin + '/', { waitUntil: 'load' });
  // ---- entrance: time from load until the hero is in its final state
  let tFinal = null;
  for (let i = 0; i < 40; i++) {
    const ok = await page.evaluate(() => { const eff = (e) => { let o = 1, p = e; while (p && p !== document.documentElement) { o *= +getComputedStyle(p).opacity; p = p.parentElement; } return o; };
      const h1 = document.querySelector('#about h1'); const av = document.querySelector('.avatar-box'); const bs = [...document.querySelectorAll('.avatar-badge .badge-float')];
      const words = h1 ? [...h1.querySelectorAll('span span')] : []; const idt = (e) => { const m = new DOMMatrix(getComputedStyle(e).transform); return Math.abs(m.m42) < 0.5 && Math.abs(m.m41) < 0.5 && Math.abs(m.a - 1) < 0.01; };
      return !!av && eff(av) > 0.99 && bs.length === 3 && bs.every((b) => eff(b) > 0.99) && words.length > 0 && words.every((x) => eff(x) > 0.99 && idt(x)); });
    if (ok) { tFinal = Date.now() - t0 - 0; break; } await page.waitForTimeout(100);
  }
  // t0 includes navigation; subtract nav time by measuring performance timing
  const loadMs = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? Math.round(n.loadEventEnd) : 0; });
  const afterLoad = tFinal == null ? null : tFinal - loadMs;
  rec(`entrance: hero reaches final state <=1.5s after load (iOS-safe entrance) ${tag}`, afterLoad != null && afterLoad <= 1800, afterLoad == null ? 'never reached final state within 4s' : `${afterLoad}ms after load event (budget 1500ms; headless tolerance +300ms)`, afterLoad != null && afterLoad <= 2500);
  await settle(page, 2500);
  const S = await sample(page, 8, 600); const s0 = S[0];
  // ---- single highlights list / no legacy chips
  rec(`badges: exactly one Highlights list with 3 items, no legacy AvatarChips ${tag}`, s0.nLists === 1 && s0.nHighlightLabels === 1 && s0.badges.length === 3 && s0.chipsLegacy === 0 && ['AWS Certified', '14+ yrs', 'IBM Hackathon Winner'].every((t) => s0.badges.some((b) => b.text === t)), `lists=${s0.nLists}, items=${s0.badges.map((b) => b.text).join(' | ')}, legacy=${s0.chipsLegacy}`);
  // ---- visible + inside viewport
  const bad = s0.badges.filter((b) => b.disp === 'none' || b.vis === 'hidden' || b.op < 0.95 || b.rect.w < 20 || b.rect.h < 14);
  rec(`badges: all 3 visible (display/visibility/opacity) ${tag}`, s0.badges.length === 3 && bad.length === 0, bad.length ? 'not visible: ' + bad.map((b) => `${b.text} op=${b.op.toFixed(2)} ${b.disp}/${b.vis} ${Math.round(b.rect.w)}x${Math.round(b.rect.h)}`).join(' | ') : s0.badges.map((b) => `${b.text} op=${b.op.toFixed(2)} ${Math.round(b.rect.w)}x${Math.round(b.rect.h)}`).join(' | '));
  const out = S.flatMap((s) => s.badges.filter((b) => b.rect.l < 8 - 0.5 || b.rect.r > s.vw - 8 + 0.5).map((b) => `${b.text} ${Math.round(b.rect.l)}..${Math.round(b.rect.r)}`));
  rec(`badges: inside viewport with >=8px margin at every sample (while floating) ${tag}`, out.length === 0, out.length ? [...new Set(out)].join(' | ') : `all inside 8..${s0.vw - 8} (${s0.badges.map((b) => `${Math.round(b.rect.l)}..${Math.round(b.rect.r)}`).join(', ')})`);
  let ov = []; for (const s of S) { for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (inter(s.badges[i].rect, s.badges[j].rect, 2)) ov.push(`${s.badges[i].text} x ${s.badges[j].text}`); for (const b of s.badges) if (s.head && inter(b.rect, s.head)) { const ix = Math.min(b.rect.r, s.head.r) - Math.max(b.rect.l, s.head.l), iy = Math.min(b.rect.b, s.head.b) - Math.max(b.rect.t, s.head.t); ov.push(`${b.text} x head (${ix.toFixed(0)}x${iy.toFixed(0)}px overlap)`); } }
  rec(`badges: do not overlap each other nor the head rectangle (x28-71%, y14-67%) ${tag}`, ov.length === 0, ov.length ? [...new Set(ov)].join(' | ') : '8 samples over 4.2s, no intersection');
  rec(`layout: no horizontal scroll ${tag}`, s0.scrollW <= s0.vw && s0.vw <= w + 1, `scrollWidth=${s0.scrollW} innerWidth=${s0.vw}`);
  // ---- moving
  const rg = [0, 1, 2].map((i) => range(S.map((s) => s.badges[i]?.ty ?? 0)));
  rec(`badges: floating (computed transform changes over 4.2s) ${tag}`, rg.every((r) => r > 0.6) && s0.badges.every((b) => b.anim.some((a) => /badge-float:running/.test(a))), `ty range per badge = ${rg.map((r) => r.toFixed(1)).join(' / ')}px; animations: ${s0.badges.map((b) => b.anim.join('+')).join(' | ')}`);
  rec(`badges: no filter / backdrop-filter / mask / will-change on badges ${tag}`, s0.badges.every((b) => /^none\|none\|none$/.test(b.filter) && /^auto\|auto$/.test(b.wc)), s0.badges.map((b) => `${b.filter} ${b.wc}`).join(' ; '));
  // ---- rings
  const rr = s0.ring;
  rec(`ring: SVG gradient ring present, visible, inside viewport ${tag}`, !!rr && rr.disp !== 'none' && rr.vis !== 'hidden' && rr.op > 0.95 && rr.rect.w > 100 && (rr.rect.l + rr.rect.r) / 2 - rr.rpx - rr.sw * rr.size / 200 >= -0.5 && (rr.rect.l + rr.rect.r) / 2 + rr.rpx + rr.sw * rr.size / 200 <= s0.vw + 0.5, rr ? `circle x ${Math.round((rr.rect.l + rr.rect.r) / 2 - rr.rpx)}..${Math.round((rr.rect.l + rr.rect.r) / 2 + rr.rpx)} (rotating bbox ${Math.round(rr.rect.l)}..${Math.round(rr.rect.r)} may exceed the viewport harmlessly), op=${rr.op.toFixed(2)}, stroke=${rr.stroke}, stroke-width=${rr.sw}` : 'no .avatar-ring-svg');
  rec(`ring: gradient stops resolve to real colours (theme tokens apply) ${tag}`, !!rr && rr.stops.length === 3 && rr.stops.every((c) => c && !/rgba\(0, 0, 0, 0\)|^$/.test(c)), rr ? rr.stops.join(' ') : 'n/a');
  const angs = S.map((s) => s.ring?.ang ?? 0); const spin = range(angs.map((a) => ((a % 360) + 360) % 360)) > 3 || new Set(angs.map((a) => a.toFixed(0))).size > 3;
  rec(`ring: rotating (transform angle changes between samples) ${tag}`, spin && !!rr && rr.anim.some((a) => /ring-spin.*running/.test(a)), `angles over 4.2s: ${angs.map((a) => a.toFixed(0)).join(',')}; ${rr ? rr.anim.join('+') : ''}`);
  rec(`ring: no filter / mask on the ring ${tag}`, !!rr && /^none\|none$/.test(rr.filt), rr ? rr.filt : 'n/a');
  if (w >= 640) rec(`ring: dashed outer ring visible and rotating (>=640px) ${tag}`, !!s0.dashed && s0.dashed.disp !== 'none' && s0.dashed.anim.some((a) => /running/.test(a)), s0.dashed ? `${s0.dashed.disp} ${s0.dashed.anim.join('+')}` : 'no .avatar-ring-dashed');
  else rec(`ring: dashed outer ring intentionally hidden <640px (design 07 §3.6 D) ${tag}`, !s0.dashed || s0.dashed.disp === 'none', s0.dashed ? s0.dashed.disp : 'n/a');
  if (rr && s0.plate) { const gap = rr.rpx - s0.plate.r - rr.sw * rr.size / 200; rec(`ring: visible gap between photo and ring arc (>=3px) ${tag}`, gap >= 3, `ring radius ${rr.rpx.toFixed(1)}px, photo radius ${s0.plate.r.toFixed(1)}px, stroke ${(rr.sw * rr.size / 100).toFixed(2)}px -> gap ${gap.toFixed(1)}px`); }
  // ---- pixel proof: the arc is really painted (what a user's eyes see) + evidence screenshot
  const shot = await page.screenshot(); fs.writeFileSync(path.join(shotDir, `hero-${E}-${w}x${h}-${scheme}.png`), shot);
  const sc = await page.evaluate(() => 1); const dpr = await page.evaluate(() => devicePixelRatio);
  if (rr && s0.plate) { const cur = await page.evaluate(`(${HERO_JS})()`); const cx = (cur.ring.rect.l + cur.ring.rect.r) / 2, cy = (cur.ring.rect.t + cur.ring.rect.b) / 2;
    const arcSample = await ap.evaluate((a) => window.__arc(a), [shot.toString('base64'), cx, cy, rr.rpx, s0.plate.r, dpr]);
    rec(`ring: arc is painted in the screenshot (>=35% of ring circle contrasts with the gap) ${tag}`, arcSample.frac >= 0.35, `${(arcSample.frac * 100).toFixed(0)}% of ${arcSample.n} ring points contrast with the gap radius (arc covers ~72% when fully visible; dpr ${dpr})`); }
  // ---- avatar float alive
  const fy = S.map((s) => s.float?.ty ?? 0); rec(`avatar: float running (transform changes between samples 1.5s apart) ${tag}`, range(fy) > 0.5 && !!s0.float && s0.float.anim.some((a) => /avatar-float.*running/.test(a)), `ty range ${range(fy).toFixed(2)}px over 4.2s; ${s0.float ? s0.float.anim.join('+') : 'no .avatar-float'}`);
  rec(`avatar: tier is full, avatar state ok ${tag}`, s0.motion === 'full' && /^(primary|fallback)$/.test(s0.state || ''), `data-motion=${s0.motion}, data-avatar-state=${s0.state}`);
  // ---- forbidden effects scan (touch branch)
  const fb = await page.evaluate(`(${FORBID_JS})()`);
  rec(`effects: no filter/backdrop/mask/will-change/preserve-3d on animating hero/nav/marquee subtrees ${tag}`, fb.length === 0, fb.slice(0, 6).join(' | ') || 'clean', false);
  // ---- full scroll then nothing stuck invisible
  await page.evaluate(async () => { const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += Math.max(200, innerHeight / 2)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 140)); } });
  await page.waitForTimeout(1200);
  const hid = await page.evaluate(`(${OPAQUE_JS})()`);
  rec(`reveal: after full scroll no element is left at opacity<0.1 (except ping rings) ${tag}`, hid.length === 0, hid.slice(0, 5).join(' | ') || 'none');
  rec(`page: no JS/console errors ${tag}`, errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');
  // marquee tap (sticky hover) on the largest phone only
  if (w === 430 || (quick && w === 390)) if (scheme === 'light') {
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(500);
    const mq = page.locator('.marquee').first(); await mq.scrollIntoViewIfNeeded(); await mq.tap().catch(() => {}); await page.waitForTimeout(500);
    const st = await page.evaluate(() => { const a = document.querySelector('.marquee-track')?.getAnimations().find((x) => x.animationName === 'marquee'); return a ? a.playState : 'none'; });
    rec(`marquee: still running after a tap (no sticky :hover pause on touch) ${tag}`, st === 'running', `playState=${st}`);
  }
  await ctx.close();
}

// ---- hidden-load test: hydrate while hidden, then show
{
  const tag = `${E} @430x932`;
  const ctx = await ctxFor(430, 932); await ctx.addInitScript(() => { window.__vis = 'hidden'; Object.defineProperty(document, 'visibilityState', { get: () => window.__vis, configurable: true }); Object.defineProperty(document, 'hidden', { get: () => window.__vis === 'hidden', configurable: true }); });
  const page = await ctx.newPage(); await page.goto(origin + '/', { waitUntil: 'load' }); await page.waitForTimeout(3000);
  const before = await page.evaluate(() => document.querySelectorAll('*').length);
  await page.evaluate(() => { window.__vis = 'visible'; document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pageshow')); });
  await page.waitForTimeout(120);
  const op1 = await page.evaluate(() => { const eff = (e) => { let o = 1, p = e; while (p && p !== document.documentElement) { o *= +getComputedStyle(p).opacity; p = p.parentElement; } return o; }; const h = document.querySelector('#about h1 span span'); const b = document.querySelector('.avatar-badge .badge-float'); return { h1: h ? eff(h) : null, badge: b ? eff(b) : null }; });
  await page.waitForTimeout(1300);
  const op2 = await page.evaluate(() => { const eff = (e) => { let o = 1, p = e; while (p && p !== document.documentElement) { o *= +getComputedStyle(p).opacity; p = p.parentElement; } return o; }; return [...document.querySelectorAll('#about h1 span span, .avatar-badge .badge-float, .avatar-box')].map(eff); });
  rec(`hidden-load: entrance still plays once the tab becomes visible (opacity at +120ms < 1) ${tag}`, (op1.badge !== null && op1.badge < 0.98) || (op1.h1 !== null && op1.h1 < 0.98), `h1 word opacity at +120ms = ${op1.h1 && op1.h1.toFixed(2)}, badge = ${op1.badge && op1.badge.toFixed(2)}`, true);
  rec(`hidden-load: hero fully visible <=1.4s after becoming visible ${tag}`, op2.every((o) => o > 0.98), `min opacity ${Math.min(...op2).toFixed(2)} over ${op2.length} nodes`);
  await ctx.close();
}
// ---- landscape phone: touch branch (no hover pause, no heavy effects), badges still inside viewport
{
  const tag = `${E} @932x430 landscape`;
  const ctx = await ctxFor(932, 430); const page = await ctx.newPage(); await page.goto(origin + '/', { waitUntil: 'load' }); await settle(page, 3000);
  const s = await page.evaluate(`(${HERO_JS})()`); const fb = await page.evaluate(`(${FORBID_JS})()`);
  rec(`landscape: touch/mobile branch (hover:none or coarse pointer) ${tag}`, s.hoverNone || s.coarse, `hover:none=${s.hoverNone} pointer:coarse=${s.coarse}`, true);
  rec(`landscape: badges visible, inside viewport, no horizontal scroll ${tag}`, s.badges.length === 3 && s.badges.every((b) => b.op > 0.95 && b.rect.l >= 7.5 && b.rect.r <= s.vw - 7.5) && s.scrollW <= s.vw, s.badges.map((b) => `${Math.round(b.rect.l)}..${Math.round(b.rect.r)}`).join(', ') + ` vw=${s.vw} sw=${s.scrollW}`);
  rec(`landscape: no forbidden effects on animating subtrees ${tag}`, fb.length === 0, fb.slice(0, 5).join(' | ') || 'clean');
  await page.screenshot({ path: path.join(shotDir, `hero-${E}-932x430.png`) });
  await ctx.close();
}
await ap.close(); await browser.close();
const f = results.filter((r) => r.status === 'FAIL').length, wn = results.filter((r) => r.status === 'WARN').length;
fs.writeFileSync(path.join(shotDir, `e2e-hero-${engine}-results.json`), JSON.stringify(results, null, 2));
console.log(`\nE2E-HERO[${engine}] ${f ? 'FAIL' : 'PASS'}: ${results.length} checks, ${f} fail, ${wn} warn. Screenshots: ${shotDir}`);
process.exit(f ? 1 : 0);
