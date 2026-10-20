#!/usr/bin/env node
// Animation-completion audit on mobile emulation (touch + isMobile, real touch scroll gestures).
//   node anim-audit.mjs <origin+base e.g. https://karthik-muthumari.github.io/profile> [--route /] [--shots dir]
//        [--widths 375x667,390x844,320x568] [--reduced] [--motion full|gentle|off] [--json]
//
// What it proves ("the user can see the complete animation on a phone"):
//   * scroll through the whole page slowly (touch gestures), then flick through it fast, then come back to the top
//   * after settling, EVERY content element must be fully revealed: effective opacity >= 0.98 (when a reveal set an inline
//     opacity) and no element left parked on a non-identity inline transform (translate/scale leftovers of a reveal)
//   * "never fired" tracker: every element that EVER carried an initial hidden inline style (framer `initial`) must have
//     changed afterwards, otherwise its reveal never fired
//   * motion is actually alive in the tier under test (running WAAPI animations, avatar bobbing, something rotating)
// Used standalone against the live site and imported by e2e-round2.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

// Snapshot every candidate element: effective opacity, inline-opacity flag, computed transform, rotation.
// Elements get a stable data-qa-id so two snapshots can be diffed (loops move, stuck reveals do not).
export const SNAP_JS = `() => {
  const out = []; let n = 0;
  const idt = (m) => !m || m === 'none' || m === 'matrix(1, 0, 0, 1, 0, 0)';
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('.sr-only,[aria-hidden="true"],[data-anim-ignore],noscript,script,style')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.display === 'contents') continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const isContent = el.tagName === 'IMG' || el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'svg' || ((el.innerText || '').trim().length > 0 && !el.children.length);
    if (!isContent) continue;
    if (!el.dataset.qaId) el.dataset.qaId = 'q' + (++window.__qaN || (window.__qaN = 1));
    let op = 1, inlineOp = false, p = el;
    while (p && p !== document.documentElement) { op *= parseFloat(getComputedStyle(p).opacity); if (/opacity/.test(p.getAttribute('style') || '') && parseFloat(getComputedStyle(p).opacity) < 0.98) inlineOp = true; p = p.parentElement; }
    // transform of the element and its ancestors that carry an inline transform (framer writes transforms inline)
    let tf = [], q = el; while (q && q !== document.body) { if (/transform|translate|scale|rotate/.test(q.getAttribute('style') || '')) { const t = getComputedStyle(q).transform; if (!idt(t)) tf.push(t); } q = q.parentElement; }
    out.push({ id: el.dataset.qaId, tag: el.tagName.toLowerCase(), cls: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0, 50),
      text: (el.innerText || el.getAttribute('alt') || el.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 40),
      op: +op.toFixed(3), inlineOp, tf: tf.join('|'), top: Math.round(r.top + scrollY), h: Math.round(r.height) });
  }
  return out;
}`;

// Not-fully-revealed = (inline-opacity reveal parked below 0.98) OR (anything below 0.1) OR (same non-identity inline transform in two snapshots 700ms apart)
export function diffSnaps(a, b) {
  const bm = new Map(b.map((x) => [x.id, x])); const out = []; const seenAnc = [];
  const parse = (m) => { const v = (m.match(/matrix\(([^)]+)\)/g) || []).map((s) => s.slice(7, -1).split(',').map(Number)); return v; };
  for (const x of a) {
    const y = bm.get(x.id); if (!y) continue;
    const stuckOp = (x.inlineOp && x.op < 0.98 && y.op < 0.98) || (x.op < 0.1 && y.op < 0.1);
    let stuckTf = false;
    if (x.tf && x.tf === y.tf) {
      for (const m of parse(x.tf)) { const [aa, , , d, tx, ty] = m; if (Math.abs(tx) > 1 || Math.abs(ty) > 1 || Math.abs(aa - 1) > 0.02 || Math.abs(d - 1) > 0.02) stuckTf = true; }
    }
    if (stuckOp || stuckTf) out.push({ ...x, reason: stuckOp ? `opacity=${y.op}` : `transform=${x.tf.slice(0, 50)}` });
  }
  return out;
}

// Records every element that ever carried a "hidden" inline style (framer-motion `initial`: opacity:0 / scale(0)...)
// and whether its inline style ever changed afterwards. Hidden + never changed = reveal NEVER FIRED.
export const TRACKER_INIT = `(() => {
  const rec = new Map();   // el -> { first, changes }
  const hidden = (st) => /opacity:\\s*0(?:\\.0+)?\\s*(;|$)/.test(st) || /scale\\(0(?:\\.\\d+)?\\)/.test(st) || /scale:\\s*0\\b/.test(st);
  const see = (el) => { const st = el.getAttribute('style') || ''; const r = rec.get(el);
    if (!r) { if (hidden(st)) rec.set(el, { first: st, changes: 0 }); } else if (st !== r.first) r.changes++; };
  const scan = () => document.querySelectorAll('[style]').forEach(see);
  const start = () => { scan(); new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'attributes') see(m.target); else m.addedNodes.forEach((n) => { if (n.nodeType === 1) { see(n); n.querySelectorAll && n.querySelectorAll('[style]').forEach(see); } }); } })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['style'], subtree: true, childList: true }); };
  if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
  window.__neverFired = () => { const out = [];
    for (const [el, r] of rec) { if (!el.isConnected || r.changes > 0) continue;
      if (el.closest('.sr-only,[data-anim-ignore],noscript')) continue;
      const cs = getComputedStyle(el); if (cs.display === 'none') continue;
      const b = el.getBoundingClientRect();
      out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 50), text: (el.innerText || el.getAttribute('alt') || '').trim().replace(/\\s+/g, ' ').slice(0, 30), style: r.first.slice(0, 80), top: Math.round(b.top + scrollY), ariaHidden: !!el.closest('[aria-hidden="true"]') }); }
    return out; };
})()`;

export async function touchScroll(cdp, page, totalPx, stepPx, speed) {
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  for (let done = 0; done < totalPx; done += stepPx) {
    await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(w / 2), y: Math.round(h * 0.75), yDistance: -stepPx, speed, gestureSourceType: 'touch', preventFling: true });
    await page.waitForTimeout(120);
  }
}

// Motion probes (sampled over ~2.4s at the top of the page)
export const PROBE_JS = `async () => {
  const av = document.querySelector('[data-avatar-state] img, [data-avatar-state] video') || document.querySelector('[data-avatar-state]'); const ys = [];
  const rot = () => { const s = new Set(); for (const el of document.body.querySelectorAll('*')) { const t = getComputedStyle(el).transform; const m = t.match(/matrix\\(([^)]+)\\)/); if (!m) continue; const [a, b] = m[1].split(',').map(Number); if (Math.abs(b) > 0.02 && Math.abs(a) < 0.9999) s.add(t); } return [...s]; };
  const r0 = rot(); const runningStart = document.getAnimations().filter((a) => a.playState === 'running').length;
  const infinite = document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming?.().iterations === Infinity).length;
  for (let i = 0; i < 10; i++) { if (av) ys.push(av.getBoundingClientRect().top); await new Promise((r) => setTimeout(r, 250)); }
  const r1 = rot();
  const rotating = r0.length > 0 && r1.length > 0 && r0.join('') !== r1.join('') ? r1.length : 0;
  return { running: runningStart, infinite, avatarRange: ys.length ? +(Math.max(...ys) - Math.min(...ys)).toFixed(2) : null, rotating, dataMotion: document.documentElement.dataset.motion || null };
}`;

export async function auditViewport(browser, origin, route, w, h, shotsDir, tag, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: opts.reduced ? 'reduce' : 'no-preference',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  if (opts.motion) await ctx.addInitScript(`try{localStorage.setItem('motion', ${JSON.stringify(opts.motion)})}catch(e){}`);
  const page = await ctx.newPage(); await page.addInitScript(TRACKER_INIT); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(origin + route, { waitUntil: 'load' }); await page.waitForTimeout(2800);   // hero intro
  const cdp = await ctx.newCDPSession(page);
  const result = { viewport: `${w}x${h}`, errors: errs };
  const heightOf = () => page.evaluate(() => document.documentElement.scrollHeight);
  result.pageHeight = await heightOf();
  result.mediaReduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  result.probe = await page.evaluate(`(${PROBE_JS})()`);                          // motion alive? (hero, before any scroll)
  const snapAt = async () => { const a = await page.evaluate(`(${SNAP_JS})()`); await page.waitForTimeout(700); const b = await page.evaluate(`(${SNAP_JS})()`); return diffSnaps(a, b); };
  const firstViewport = (list) => list.filter((x) => x.top < h * 1.1);
  result.atTopHero = firstViewport(await snapAt());                               // first viewport after intro, before any scroll
  // pass 1: slow scroll (~0.55 viewport per gesture at 500px/s)
  await touchScroll(cdp, page, result.pageHeight, Math.round(h * 0.55), 500);
  await page.waitForTimeout(2200);
  result.scrollY = await page.evaluate(() => Math.round(scrollY));
  result.atBottom = await page.evaluate(() => Math.round(scrollY + innerHeight) >= document.documentElement.scrollHeight - 4);
  result.afterSlowScroll = (await snapAt()).filter((x) => !(x.top < result.scrollY - 20));   // (scroll-linked hero fades are checked after returning to the top, below)
  if (shotsDir) await page.screenshot({ path: path.join(shotsDir, `anim-${tag}-${w}-bottom.png`) }).catch(() => {});
  // pass 2: back to the top, FAST flick down (IntersectionObserver reveals often break on fast flings)
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800);
  await touchScroll(cdp, page, result.pageHeight, Math.round(h * 0.9), 2500);
  await page.waitForTimeout(2200);
  result.afterFlick = (await snapAt()).filter((x) => !(x.top < result.scrollY - 20));
  // final: return to top and audit the WHOLE page once settled (scroll-linked fades reset; everything must be revealed)
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(1500);
  result.finalAll = await snapAt();
  result.neverFired = (await page.evaluate(() => window.__neverFired())).filter((x) => !x.ariaHidden);
  if (shotsDir) await page.screenshot({ path: path.join(shotsDir, `anim-${tag}-${w}-full.png`), fullPage: true }).catch(() => {});
  await ctx.close();
  return result;
}

export const failing = (r) => ['atTopHero', 'afterSlowScroll', 'afterFlick', 'finalAll', 'neverFired'].flatMap((k) => r[k].map((x) => ({ k, ...x })));

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv.splice(i, 2)[1] : d; };
  const route = opt('--route', '/'); const shots = opt('--shots', ''); const motion = opt('--motion', ''); const widths = opt('--widths', '375x667,390x844,320x568').split(',').map((x) => x.split('x').map(Number));
  const reduced = argv.includes('--reduced'); const json = argv.includes('--json'); const origin = argv.filter((a) => !a.startsWith('--'))[0].replace(/\/+$/, '');
  if (shots) fs.mkdirSync(shots, { recursive: true });
  const exe = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const all = [];
  for (const [w, h] of widths) {
    const r = await auditViewport(browser, origin, route, w, h, shots, 'live', { reduced, motion });
    all.push(r);
    if (!json) {
      console.log(`\n=== ${r.viewport}  pageHeight=${r.pageHeight} finalScrollY=${r.scrollY} reachedBottom=${r.atBottom} reducedMotionMatches=${r.mediaReduced}  errors=${r.errors.length}`);
      console.log(`  motion probe: ${JSON.stringify(r.probe)}`);
      for (const k of ['atTopHero', 'afterSlowScroll', 'afterFlick', 'finalAll', 'neverFired']) {
        console.log(`  ${k}: ${r[k].length} element(s) not fully revealed`);
        for (const x of r[k].slice(0, 25)) console.log(`     - <${x.tag}> "${x.text}" ${x.style ? 'style=[' + x.style + '] aria-hidden=' + x.ariaHidden : x.reason} top=${x.top}`);
      }
    }
  }
  if (json) console.log(JSON.stringify(all, null, 2));
  await browser.close();
  process.exit(all.some((r) => failing(r).length) ? 1 : 0);
}
