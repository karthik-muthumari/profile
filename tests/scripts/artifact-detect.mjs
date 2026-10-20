#!/usr/bin/env node
// Round-2 "hero artifact" detector. Would have caught the two user-reported defects:
//   (A) a faint lighter RECTANGLE with hard straight edges in the lower right of the hero (dark, ~1683x850)
//   (B) a mild dark RECTANGLE behind the skills marquee (esp. behind the leftmost chip at the fade edge) + marquee motion "a bit off"
//
//   node artifact-detect.mjs <origin+base> [--out dir] [--label before|after] [--sizes 1683x850,1440x900,...] [--schemes dark,light]
//                            [--t 1.5] [--minlen 100] [--quick]
//
// Checks per viewport x colour scheme (Chrome, DPR 1, tier "full" = no OS reduced-motion):
//   edge:*      hero screenshot (content masked by DOM boxes) is scanned for LONG STRAIGHT LUMINANCE STEPS (vertical + horizontal).
//               Step = slope-compensated difference of 5-px medians on both sides of a candidate edge (1-px grid lines are rejected by the
//               median, smooth radial glows by the slope compensation). A run of >= minlen px at >= T luma levels = hard-edged rectangle -> FAIL.
//   strip:*     marquee background (pixels between/around chips, chips masked) vs. the hero background directly above/below the strip,
//               column by column, at 3 animation phases. Median step in the middle / fade zones must be < limits -> else "rectangle behind marquee".
//   frames:*    two screenshots 2 s apart: edges re-scanned in both; chip positions must advance by speed*2s.
//   motion:*    marquee track translateX sampled every frame for 3 s: moving left, constant velocity (no jitter / reversals), speed == P/duration.
//   seam:*      geometric (chip[N+i] at the end of the cycle == chip[i] at t=0, end translate == list pitch) and visual
//               (screenshot just before vs just after the loop restart is identical, no jump, no empty gap at any phase).
// Exit code 1 when any FAIL.  Evidence: <out>/hero-<w>x<h>-<scheme>.png (+ marquee strip crops, + edge overlays when defects are found), results.json.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const label = opt('--label', 'run');
const out = path.resolve(opt('--out', path.join(import.meta.dirname, '../evidence/round2-artifacts', label)));
const sizes = opt('--sizes', '1683x850,1440x900,1280x800,768x1024,430x932').split(',').map((s) => s.split('x').map(Number));
const schemes = opt('--schemes', 'dark,light').split(',');
// T: steps of 1-1.5 levels are 8-bit banding of the radial glows (curved/short, present in any smooth gradient); the reported defects measured 4-9 levels.
const T = +opt('--t', 2.0);
const MINLEN = +opt('--minlen', 100);
const VERBOSE = argv.includes('--verbose');
const origin = (argv.find((a) => !a.startsWith('--')) || 'http://127.0.0.1:4181/profile').replace(/\/+$/, '');
fs.mkdirSync(out, { recursive: true });
const exe = process.env.CHROME_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, headless: true });
const results = [];
const rec = (id, ok, msg, warn = false) => { const status = ok ? 'PASS' : (warn ? 'WARN' : 'FAIL'); results.push({ id, status, msg }); console.log(`${status.padEnd(4)} ${id}  ${msg}`); };

// ---------------------------------------------------------------------------------------------- analysis page (canvas)
const ANALYSIS_JS = `(() => {
  async function load(b64) {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight; const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, w, h).data;
    const L = new Float32Array(w * h); for (let i = 0, j = 0; i < L.length; i++, j += 4) L[i] = 0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2];
    return { w, h, L, rgba: d };
  }
  function mask(w, h, rects, margin) {
    const M = new Uint8Array(w * h);
    for (const r of rects) {
      if (r.ring) { const { cx, cy, r0, r1 } = r.ring; const x0 = Math.max(0, Math.floor(cx - r1)), x1 = Math.min(w, Math.ceil(cx + r1)), y0 = Math.max(0, Math.floor(cy - r1)), y1 = Math.min(h, Math.ceil(cy + r1));
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d >= r0 && d <= r1) M[y * w + x] = 1; } continue; }
      const x0 = Math.max(0, Math.floor(r.x - margin)), x1 = Math.min(w, Math.ceil(r.x + r.w + margin)), y0 = Math.max(0, Math.floor(r.y - margin)), y1 = Math.min(h, Math.ceil(r.y + r.h + margin));
      for (let y = y0; y < y1; y++) M.fill(1, y * w + x0, y * w + x1); }
    return M;
  }
  const buf = new Float32Array(5);
  const med5 = (L, i) => { buf[0] = L[i]; buf[1] = L[i + 1]; buf[2] = L[i + 2]; buf[3] = L[i + 3]; buf[4] = L[i + 4]; buf.sort(); return buf[2]; };
  // vertical-edge scan on an (W x H) luminance plane; returns [{pos, from, to, cnt, mean, sign}]
  function scan(L, M, W, H, y0, y1, T, minLen, x0 = 0, x1 = W) {
    const S = new Int8Array(W * H); const V = new Float32Array(W * H);
    for (let y = y0; y < y1; y++) {
      const row = y * W; const pm = new Int32Array(W + 1); for (let x = 0; x < W; x++) pm[x + 1] = pm[x] + M[row + x];
      for (let x = Math.max(10, x0); x < Math.min(W - 10, x1); x++) {
        if (pm[x + 10] - pm[x - 10] > 0) { S[row + x] = 2; continue; }
        const Lm = med5(L, row + x - 5), Rm = med5(L, row + x), Lf = med5(L, row + x - 10), Rf = med5(L, row + x + 5);
        const step = (Rm - Lm) - ((Lm - Lf) + (Rf - Rm)) / 2; V[row + x] = step; S[row + x] = step >= T ? 1 : step <= -T ? -1 : 0;
      }
    }
    const found = [];
    // smooth along the edge (32-sample running mean of the per-pixel step; the page carries a film-grain overlay of about +-2 levels)
    const SM = 32; const pv = new Float64Array(H + 1), pn = new Int32Array(H + 1);
    for (let x = Math.max(10, x0); x < Math.min(W - 10, x1); x++) {
      for (let y = 0; y < H; y++) { const s = S[y * W + x]; pv[y + 1] = pv[y] + (s === 2 || y < y0 || y >= y1 ? 0 : V[y * W + x]); pn[y + 1] = pn[y] + (s === 2 || y < y0 || y >= y1 ? 0 : 1); }
      let cur = null; const flush = () => { if (cur && cur.last - cur.start + 1 >= minLen && cur.cnt >= minLen * 0.8 && cur.cnt / cur.nn >= 0.85 && cur.cnt >= 0.6 * (cur.last - cur.start + 1)) found.push({ pos: x, from: cur.start, to: cur.last, cnt: cur.cnt, mean: cur.sum / cur.cnt, sign: cur.sign }); cur = null; };
      for (let y = y0; y < y1; y++) {
        if (S[y * W + x] === 2) continue;
        const a = Math.max(0, y - SM / 2), b = Math.min(H, y + SM / 2 + 1); const n = pn[b] - pn[a];
        if (cur) cur.nn++;
        const m = n >= SM * 0.6 ? (pv[b] - pv[a]) / n : 0; const s = m >= T ? 1 : m <= -T ? -1 : 0;
        if (s === 0) { if (cur && ++cur.zeros > 6) flush(); continue; }
        if (cur && cur.sign === s) { cur.cnt++; cur.last = y; cur.zeros = 0; cur.sum += m; }
        else { flush(); cur = { sign: s, start: y, last: y, cnt: 1, nn: 1, zeros: 0, sum: m }; }
      }
      flush();
    }
    found.sort((a, b) => a.pos - b.pos); let cl = [];
    for (const f of found) { const p = cl[cl.length - 1]; if (p && f.pos - p.pos <= 5 && f.sign === p.sign) { if (Math.abs(f.mean) * f.cnt > Math.abs(p.mean) * p.cnt) cl[cl.length - 1] = f; } else cl.push(f); }
    // a true step also produces opposite-signed "lobes" (~ -step/2) about 5-10 px either side: keep only the dominant one of such a group
    cl = cl.filter((e) => !cl.some((f) => f !== e && f.sign !== e.sign && Math.abs(f.pos - e.pos) <= 12 && Math.abs(f.mean) > Math.abs(e.mean) * 0.9 && f.from < e.to && e.from < f.to));
    return cl.sort((a, b) => b.cnt - a.cnt);
  }
  const transpose = (A, W, H, Ctor) => { const B = new Ctor(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) B[x * H + y] = A[y * W + x]; return B; };
  window.__edges = async (b64, rects, margin, roi, T, minLen) => {
    const { w, h, L } = await load(b64); const M = mask(w, h, rects, margin);
    const y1 = Math.min(h, Math.floor(roi.y1)), y0 = Math.max(0, Math.floor(roi.y0));
    const v = scan(L, M, w, h, y0, y1, T, minLen).map((e) => ({ axis: 'v', x: e.pos, y0: e.from, y1: e.to, len: e.cnt, step: +e.mean.toFixed(2) }));
    const Lt = transpose(L, w, h, Float32Array), Mt = transpose(M, w, h, Uint8Array);
    const hz = scan(Lt, Mt, h, w, 0, w, T, minLen, y0, y1).map((e) => ({ axis: 'h', y: e.pos, x0: e.from, x1: e.to, len: e.cnt, step: +e.mean.toFixed(2) }));
    // overlay for evidence
    let overlay = null; const all = [...v, ...hz];
    if (all.length) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); g.drawImage(img, 0, 0);
      g.lineWidth = 2; g.strokeStyle = '#ff2d55'; g.fillStyle = '#ff2d55'; g.font = '14px monospace';
      for (const e of v) { g.beginPath(); g.moveTo(e.x + 0.5, e.y0); g.lineTo(e.x + 0.5, e.y1); g.stroke(); g.fillText('step ' + e.step + ' len ' + e.len, Math.min(w - 150, e.x + 6), e.y0 + 14); }
      for (const e of hz) { g.beginPath(); g.moveTo(e.x0, e.y + 0.5); g.lineTo(e.x1, e.y + 0.5); g.stroke(); g.fillText('step ' + e.step + ' len ' + e.len, e.x0 + 6, e.y - 4); }
      overlay = c.toDataURL('image/png').split(',')[1]; }
    return { size: [w, h], v, h: hz, overlay };
  };
  // marquee strip: column-wise background step vs hero background above/below the strip (chips + other content masked)
  window.__strip = async (b64, rects, chipRects, mq, margin) => {
    const { w, h, L, rgba } = await load(b64); const M = mask(w, h, [...rects, ...chipRects], margin);
    const med = (arr) => { if (!arr.length) return null; arr.sort((a, b) => a - b); return arr[arr.length >> 1]; };
    const x0 = Math.ceil(mq.x), x1 = Math.floor(mq.x + mq.w), top = Math.round(mq.y), bot = Math.round(mq.y + mq.h);
    const cols = [];
    for (let x = x0; x < x1; x++) {
      const inside = [], above = [], below = [];
      for (let y = top + 3; y < bot - 3; y++) if (!M[y * w + x]) inside.push(L[y * w + x]);
      for (let y = top - 14; y < top - 5; y++) if (y >= 0 && !M[y * w + x]) above.push(L[y * w + x]);
      for (let y = bot + 5; y < bot + 14; y++) if (y < h && !M[y * w + x]) below.push(L[y * w + x]);
      if (inside.length < 6 || (above.length < 5 && below.length < 5)) continue;
      const ref = med([...above, ...below]);
      cols.push({ x: (x - x0) / (x1 - x0), d: med(inside) - ref, inside: med(inside), ref });
    }
    const zone = (a, b) => { const s = cols.filter((c) => c.x >= a && c.x < b).map((c) => c.d); return { n: s.length, med: s.length ? +med(s.slice()).toFixed(2) : null, max: s.length ? +Math.max(...s.map(Math.abs)).toFixed(2) : null }; };
    // darkest/lightest channel-wise check at left edge: raw colours in first gap columns
    return { cols: cols.length, left: zone(0, 0.12), mid: zone(0.12, 0.88), right: zone(0.88, 1.001), all: zone(0, 1.001) };
  };
  // compare two crops (same size) -> fraction of pixels differing by more than thr luma levels, plus max
  window.__diff = async (a64, b64, rect, thr) => {
    const A = await load(a64), B = await load(b64); let n = 0, big = 0, max = 0, sum = 0;
    for (let y = Math.max(0, Math.floor(rect.y)); y < Math.min(A.h, Math.ceil(rect.y + rect.h)); y++) for (let x = Math.max(0, Math.floor(rect.x)); x < Math.min(A.w, Math.ceil(rect.x + rect.w)); x++) { const d = Math.abs(A.L[y * A.w + x] - B.L[y * B.w + x]); n++; sum += d; if (d > thr) big++; if (d > max) max = d; }
    return { n, frac: n ? big / n : 0, max: +max.toFixed(1), mean: n ? +(sum / n).toFixed(3) : 0 };
  };
})()`;
const ap = await browser.newPage();
await ap.goto('about:blank');
await ap.evaluate(ANALYSIS_JS);

// ---------------------------------------------------------------------------------------------- DOM probes
const RECTS_JS = `() => {
  const sec = document.querySelector('section#about, section[aria-label="Introduction"]');
  const R = (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const fg = [...sec.querySelectorAll('h1, p, a, button, li, img, video, .badge-float, .chip, [data-avatar-state] img')].filter((e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden'; }).map(R);
  const hdr = [...document.querySelectorAll('header, nav')].map(R);
  // avatar rings: mask the annulus only (a bbox would also hide any glow/box edge passing through the middle of the avatar)
  const rings = [...sec.querySelectorAll('.avatar-ring-svg, .avatar-ring-dashed, .avatar-ring')].map((e) => { const r = e.getBoundingClientRect(); const D = parseFloat(getComputedStyle(e).width) || e.offsetWidth || Math.min(r.width, r.height); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; return { ring: { cx, cy, r0: D / 2 * 0.9 - 4, r1: D / 2 + 8 } }; });
  const hdrOnly = [...document.querySelectorAll('header, nav')].map(R);
  hdr.push(...rings);
  const mq = sec.querySelector('.marquee'); const tr = sec.querySelector('.marquee-track');
  const chips = tr ? [...tr.querySelectorAll('.chip')].map(R) : [];
  return { hdrOnly, fg: fg.concat(hdr), hero: R(sec), mq: mq ? R(mq) : null, chips, track: tr ? tr.getBoundingClientRect().left : null, vw: innerWidth, vh: innerHeight, sy: scrollY };
}`;
const TX_JS = `() => { const t = document.querySelector('.marquee-track'); return t ? new DOMMatrix(getComputedStyle(t).transform).m41 : null; }`;
const b64 = (buf) => buf.toString('base64');

async function edgeScan(buf, d, heroBottomLimit = true) {
  const sy = d.sy || 0;
  const roi = { y0: Math.max(0, d.hero.y), y1: Math.min(d.vh, d.hero.y + d.hero.h + (d.seamExtra ?? -12)) };
  return ap.evaluate(([b, r, m, ro, t, ml]) => window.__edges(b, r, m, ro, t, ml), [b64(buf), d.fg, 4, roi, T, MINLEN]);
}
const fmtEdges = (e) => [...e.v.map((x) => `V x=${x.x} y${x.y0}..${x.y1} len=${x.len} step=${x.step}`), ...e.h.map((x) => `H y=${x.y} x${x.x0}..${x.x1} len=${x.len} step=${x.step}`)];

// ---------------------------------------------------------------------------------------------- matrix
for (const scheme of schemes) for (const [w, h] of sizes) {
  const tag = `${w}x${h} ${scheme}`; const file = `${w}x${h}-${scheme}`;
  const touch = w < 1024;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: touch, hasTouch: touch, colorScheme: scheme, reducedMotion: 'no-preference' });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(origin + '/', { waitUntil: 'load' }); await page.waitForTimeout(3800);
  const motion = await page.evaluate(() => document.documentElement.dataset.motion);
  // --- frame 1 + motion sampling (3 s of rAF) -----------------------------------------------------------
  const d1 = await page.evaluate(`(${RECTS_JS})()`); const shot1 = await page.screenshot();
  fs.writeFileSync(path.join(out, `hero-${file}.png`), shot1);
  const samples = await page.evaluate(() => new Promise((res) => { const t0 = performance.now(), out = []; const tr = document.querySelector('.marquee-track'); const f = () => { out.push([performance.now() - t0, tr ? new DOMMatrix(getComputedStyle(tr).transform).m41 : null]); if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(out); }; requestAnimationFrame(f); }));
  // --- frame 2 (>= 2 s after frame 1) ----------------------------------------------------------------------
  const d2 = await page.evaluate(`(${RECTS_JS})()`); const shot2 = await page.screenshot();
  fs.writeFileSync(path.join(out, `hero-${file}-t+3s.png`), shot2);

  // =========== edges (A) ===========
  const e1 = await edgeScan(shot1, d1), e2 = await edgeScan(shot2, d2);
  for (const [nm, e] of [['frame 1', e1], ['frame 2 (+3s)', e2]]) {
    const list = fmtEdges(e);
    rec(`edge: no long hard-edged luminance step in hero (${nm}) @${tag}`, list.length === 0, list.length ? `${list.length} straight edge(s) >=${MINLEN}px at >=${T} levels: ${list.slice(0, 4).join(' | ')}` : `none (T=${T} levels, minLen=${MINLEN}px, content masked, 32-sample smoothing)`);
    if (VERBOSE) console.log('   all edges:', fmtEdges(e).join('\n      '));
    if (e.overlay) fs.writeFileSync(path.join(out, `edges-${file}-${nm.startsWith('frame 1') ? 'f1' : 'f2'}.png`), Buffer.from(e.overlay, 'base64'));
  }
  // lower-right quadrant only (the user's artifact): reported separately so the table can be filtered
  const lr = (e) => [...e.v.filter((x) => x.x > w * 0.5 && x.y1 > h * 0.3), ...e.h.filter((x) => x.x1 > w * 0.5 && x.y > h * 0.3)];
  rec(`edge: lower-right region clean (user-reported lighter rectangle) @${tag}`, lr(e1).length === 0 && lr(e2).length === 0, lr(e1).length || lr(e2).length ? [...lr(e1), ...lr(e2)].slice(0, 3).map((x) => JSON.stringify(x)).join(' | ') : 'no straight step in x>50%, y>30%');

  // background-only pass: hide all foreground content (text, buttons, photo, rings, badges, chips) and scan the bare hero background
  await page.evaluate(() => { const st = document.createElement('style'); st.id = '__qa_bg'; st.textContent = '#about h1,#about p,#about a,#about button,#about img,#about video,#about .badge-float,#about .chip,#about svg,#about .avatar-ring-dashed,#about .avatar-plate,#about .avatar-badge,#about .marquee-track{visibility:hidden !important}'; document.head.appendChild(st); });
  await page.waitForTimeout(150); const dbg = await page.evaluate(`(${RECTS_JS})()`); const shotBg = await page.screenshot();
  await page.evaluate(() => document.getElementById('__qa_bg')?.remove());
  fs.writeFileSync(path.join(out, `hero-bgonly-${file}.png`), shotBg);
  const eb = await edgeScan(shotBg, { ...dbg, fg: dbg.hdrOnly });
  rec(`edge: bare hero background (content hidden) has no hard-edged step @${tag}`, fmtEdges(eb).length === 0, fmtEdges(eb).length ? fmtEdges(eb).slice(0, 4).join(' | ') : 'none', false);
  if (eb.overlay) fs.writeFileSync(path.join(out, `edges-${file}-bgonly.png`), Buffer.from(eb.overlay, 'base64'));

  // =========== motion (B) ===========
  if (!d1.mq) { rec(`strip: marquee present @${tag}`, false, 'no .marquee in hero'); await ctx.close(); continue; }
  if (motion !== 'full') rec(`strip: tier is full @${tag}`, false, `data-motion=${motion}`);
  const tx = samples.map((s) => s[1]); const tms = samples.map((s) => s[0]);
  let reversals = 0; for (let i = 1; i < tx.length; i++) if (tx[i] > tx[i - 1] + 0.01) reversals++;
  const disp = tx[tx.length - 1] - tx[0], dt = tms[tms.length - 1] - tms[0];
  const info = await page.evaluate(() => { const tr = document.querySelector('.marquee-track'); const a = tr.getAnimations().find((x) => x.animationName === 'marquee'); if (!a) return null; const D = a.effect.getComputedTiming().duration; const chips = [...tr.querySelectorAll('.chip')]; const n = chips.length / 2; const lefts = chips.map((c) => c.getBoundingClientRect().left); return { D, n, P: lefts[n] - lefts[0], timing: a.effect.getTiming().easing, play: a.playState, fill: a.effect.getTiming().iterations }; });
  rec(`motion: marquee CSS animation exists, linear, infinite @${tag}`, !!info && info.timing === 'linear' && info.fill === Infinity && info.play === 'running', info ? JSON.stringify(info) : 'no getAnimations() entry named marquee');
  if (info) {
    const v = disp / dt; const exp = -info.P / info.D;
    rec(`motion: marquee moves left at P/duration (no stall) @${tag}`, disp < -5 && Math.abs(v - exp) / Math.abs(exp) < 0.12, `moved ${disp.toFixed(1)}px in ${Math.round(dt)}ms = ${(v * 1000).toFixed(1)}px/s, expected ${(exp * 1000).toFixed(1)}px/s (P=${info.P.toFixed(1)}px / ${info.D}ms)`);
    // jitter: velocity over 8-frame windows
    const vs = []; for (let i = 8; i < tx.length; i++) vs.push((tx[i] - tx[i - 8]) / (tms[i] - tms[i - 8]));
    const worst = Math.max(...vs.map((x) => Math.abs(x - v) / Math.abs(exp)));
    rec(`motion: velocity constant over 3 s (no jerk / jump), no reversals @${tag}`, reversals === 0 && worst < 0.35, `reversals=${reversals}, worst 8-frame velocity deviation ${(worst * 100).toFixed(0)}% (frames=${tx.length})`, true);
    // two frames ~3s apart: chips advance by exactly the same amount
    const dx = d2.chips.map((c, i) => c.x - d1.chips[i].x); const mn = Math.min(...dx), mx = Math.max(...dx);
    rec(`frames: all chips shift together (rigid motion) between the two frames @${tag}`, mx - mn < 0.75, `chip dx between frames: min ${mn.toFixed(2)} max ${mx.toFixed(2)} px (${d1.chips.length} chips)`);
    rec(`frames: marquee advanced the expected distance between the two frames @${tag}`, Math.abs(mn) > 20 && mn < 0, `dx=${mn.toFixed(1)}px between frame 1 and frame 2`);
  }

  // =========== strip / seam: scroll marquee into view, pause the animation at fixed phases ===========
  await page.evaluate(() => { const m = document.querySelector('.marquee'); m.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(500);
  const phases = [0, 0.33];
  for (const ph of phases) {
    await page.evaluate((p) => { const a = document.querySelector('.marquee-track').getAnimations().find((x) => x.animationName === 'marquee'); if (a) { a.pause(); a.currentTime = p * a.effect.getComputedTiming().duration; } }, ph);
    await page.waitForTimeout(120);
    const d = await page.evaluate(`(${RECTS_JS})()`); const shot = await page.screenshot();
    if (ph === 0) { const pad = 40; await page.screenshot({ path: path.join(out, `marquee-strip-${file}.png`), clip: { x: Math.max(0, d.mq.x - 24), y: Math.max(0, d.mq.y - pad), width: Math.min(w, d.mq.w + 48), height: d.mq.h + pad * 2 } }).catch(() => {}); }
    if (ph === 0.33) { const ee = await edgeScan(shot, d, true); const l = fmtEdges(ee); rec(`edge: no hard-edged step in the hero after scrolling to the marquee @${tag}`, l.length === 0, l.length ? l.slice(0, 4).join(' | ') : 'none'); if (ee.overlay) fs.writeFileSync(path.join(out, `edges-${file}-marquee-view.png`), Buffer.from(ee.overlay, 'base64')); }
  }
  // --- marquee BACKGROUND only: hide the chips (layout unchanged) so fade overlays / wrapper backgrounds are measured against the hero behind them
  await page.evaluate(() => { document.querySelector('.marquee-track').style.visibility = 'hidden'; }); await page.waitForTimeout(150);
  const dh = await page.evaluate(`(${RECTS_JS})()`); const shotH = await page.screenshot();
  await page.screenshot({ path: path.join(out, `marquee-bg-only-${file}.png`), clip: { x: Math.max(0, dh.mq.x - 24), y: Math.max(0, dh.mq.y - 40), width: Math.min(w, dh.mq.w + 48), height: dh.mq.h + 80 } }).catch(() => {});
  const sH = await ap.evaluate(([bb, r, c, mq]) => window.__strip(bb, r, c, mq, 1), [b64(shotH), [], [], dh.mq]);
  await page.evaluate(() => { document.querySelector('.marquee-track').style.visibility = ''; });
  { // hero bottom seam: bare backgrounds only (hero content hidden; boxes of next-section content that touch the boundary are masked, backgrounds are real), scan across the hero/next-section boundary
    await page.evaluate(() => { const st = document.createElement('style'); st.id = '__qa_seam'; st.textContent = '#about h1,#about p,#about a,#about button,#about img,#about video,#about .badge-float,#about .chip,#about svg,#about .avatar-ring-dashed,#about .avatar-plate,#about .avatar-badge,#about .marquee-track{visibility:hidden !important}'; document.head.appendChild(st); });
    await page.waitForTimeout(150); const ds = await page.evaluate(`(${RECTS_JS})()`); const shotS = await page.screenshot();
    await page.evaluate(() => document.getElementById('__qa_seam')?.remove());
    const bottom = Math.round(ds.hero.y + ds.hero.h);
    fs.writeFileSync(path.join(out, `hero-seam-${file}.png`), shotS);
    if (bottom > 20 && bottom < ds.vh - 12) {
      const below = await page.evaluate((bt) => [...document.body.querySelectorAll('*')].filter((e) => { const sec = document.querySelector('#about'); if (sec.contains(e) || e.contains(sec)) return false; const r = e.getBoundingClientRect(); return r.top > bt - 3 && r.top < bt + 24 && r.height < 500 && r.width > 2; }).map((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }), bottom);
      const es = await edgeScan(shotS, { ...ds, fg: [...ds.hdrOnly, ...below], seamExtra: 8 }); const sl = fmtEdges(es).filter((x) => /^H y=(\d+)/.test(x) && Math.abs(+x.match(/^H y=(\d+)/)[1] - bottom) <= 12);
      rec(`edge: no hard horizontal step where the hero ends (bare backgrounds, hero bottom at y=${bottom}) @${tag}`, sl.length === 0, sl.length ? sl.slice(0, 3).join(' | ') : 'none');
      if (es.overlay) fs.writeFileSync(path.join(out, `edges-${file}-seam.png`), Buffer.from(es.overlay, 'base64'));
    } else rec(`edge: hero bottom seam visible in the scrolled frame @${tag}`, false, `hero bottom at y=${bottom}, viewport ${ds.vh}`, true);
  }
  const lim = { mid: 1.2, edge: 1.5 };
  rec(`strip: enough background samples (chips hidden) @${tag}`, sH.cols >= 100, `${sH.cols} usable columns`, true);
  rec(`strip: marquee background == hero background, middle zone @${tag}`, sH.mid.max != null && sH.mid.max < 4 && Math.abs(sH.mid.med) < lim.mid, `median step ${sH.mid.med} levels, worst column ${sH.mid.max} (limits ${lim.mid} / 4) over ${sH.mid.n} columns`);
  rec(`strip: no dark/light block at the LEFT fade edge (behind the leftmost chip) @${tag}`, sH.left.max != null && Math.abs(sH.left.med) < lim.edge && sH.left.max < lim.edge * 2.5, `median step ${sH.left.med} levels, worst column ${sH.left.max} (limits ${lim.edge} / ${lim.edge * 2.5}) over ${sH.left.n} columns; mq=${Math.round(dh.mq.x)}..${Math.round(dh.mq.x + dh.mq.w)} x ${Math.round(dh.mq.y)}`);
  rec(`strip: no dark/light block at the RIGHT fade edge @${tag}`, sH.right.max != null && Math.abs(sH.right.med) < lim.edge && sH.right.max < lim.edge * 2.5, `median step ${sH.right.med} levels, worst column ${sH.right.max} (limits ${lim.edge} / ${lim.edge * 2.5}) over ${sH.right.n} columns`);

  if (info) {
    // geometric seam
    const g = await page.evaluate(() => { const tr = document.querySelector('.marquee-track'); const a = tr.getAnimations().find((x) => x.animationName === 'marquee'); const D = a.effect.getComputedTiming().duration; const chips = [...tr.querySelectorAll('.chip')]; const n = chips.length / 2;
      const lefts = () => chips.map((c) => c.getBoundingClientRect().left); a.currentTime = 0; const L0 = lefts(); a.currentTime = D - 0.01; const L1 = lefts(); const tx1 = new DOMMatrix(getComputedStyle(tr).transform).m41;
      return { n, P: L0[n] - L0[0], tx1, seamErr: Math.max(...L0.slice(0, n).map((x, i) => Math.abs(L1[n + i] - x))), lastRight: chips[chips.length - 1].getBoundingClientRect().right - 0, mqRight: document.querySelector('.marquee').getBoundingClientRect().right }; });
    rec(`seam: end translate equals the list pitch (loop is exactly one list long) @${tag}`, Math.abs(Math.abs(g.tx1) - g.P) < 0.6, `end translateX=${g.tx1.toFixed(2)}px, pitch chip[N]-chip[0]=${g.P.toFixed(2)}px`);
    rec(`seam: chip[N+i] at cycle end sits exactly where chip[i] starts @${tag}`, g.seamErr < 0.6, `max position error ${g.seamErr.toFixed(2)}px over ${g.n} chips`);
    // gaps: at 20 phases the strip must be fully covered by chips (no empty area at the right edge)
    const gaps = await page.evaluate(() => { const tr = document.querySelector('.marquee-track'); const a = tr.getAnimations().find((x) => x.animationName === 'marquee'); const D = a.effect.getComputedTiming().duration; const mq = document.querySelector('.marquee').getBoundingClientRect(); const worst = []; for (let k = 0; k <= 20; k++) { a.currentTime = (k / 20) * D - (k === 20 ? 0.01 : 0); const rs = [...tr.querySelectorAll('.chip')].map((c) => c.getBoundingClientRect()); const first = Math.min(...rs.map((r) => r.left)), last = Math.max(...rs.map((r) => r.right)); worst.push({ k, uncoveredLeft: Math.max(0, first - mq.left), uncoveredRight: Math.max(0, mq.right - last) }); } return worst; });
    const bad = gaps.filter((x) => x.uncoveredLeft > 1 || x.uncoveredRight > 1);
    rec(`seam: strip is never empty at the left/right edge during the whole cycle @${tag}`, bad.length === 0, bad.length ? 'empty at ' + bad.slice(0, 3).map((x) => `phase ${x.k}/20 (L ${x.uncoveredLeft.toFixed(0)}px R ${x.uncoveredRight.toFixed(0)}px)`).join(', ') : '21 phases checked, strip always filled');
    // visual seam
    const setT = (t) => page.evaluate((tt) => { const a = document.querySelector('.marquee-track').getAnimations().find((x) => x.animationName === 'marquee'); a.currentTime = tt === 'end' ? a.effect.getComputedTiming().duration - 0.3 : a.effect.getComputedTiming().duration + 0.3; }, t);
    await setT('end'); await page.waitForTimeout(120); const sa = await page.screenshot(); const dm = await page.evaluate(`(${RECTS_JS})()`);
    await setT('start'); await page.waitForTimeout(120); const sb = await page.screenshot();
    const df = await ap.evaluate(([a, b, rc]) => window.__diff(a, b, rc, 24), [b64(sa), b64(sb), dm.mq]);
    rec(`seam: no visual jump when the loop restarts (strip pixels no jump either side; sub-pixel text AA tolerated, a real jump differs by >2%) @${tag}`, df.frac < 0.02, `${(df.frac * 100).toFixed(3)}% of ${df.n} strip px differ >24 levels, max ${df.max}, mean ${df.mean}`);
    await page.evaluate(() => document.querySelector('.marquee-track').getAnimations().forEach((a) => a.play()));
  }
  rec(`page: no JS errors during the artifact run @${tag}`, errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');
  await ctx.close();
}
await ap.close(); await browser.close();
const f = results.filter((r) => r.status === 'FAIL').length, wn = results.filter((r) => r.status === 'WARN').length;
fs.writeFileSync(path.join(out, 'artifact-results.json'), JSON.stringify({ label, origin, T, MINLEN, results }, null, 2));
console.log(`\nARTIFACT-DETECT[${label}] ${f ? 'FAIL' : 'PASS'}: ${results.length} checks, ${f} fail, ${wn} warn. Evidence: ${out}`);
process.exit(f ? 1 : 0);
