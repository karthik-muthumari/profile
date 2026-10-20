#!/usr/bin/env node
// Round-2 browser tests: work-email-primary, footer alignment, mobile animation completion, motion tiers
// (full / gentle / off) incl. the reduced-motion default and the footer switch, failsafe, hero image.
//   node e2e-round2.mjs <origin> [--base /profile] [--out dir] [--thorough] [--only footer,contact,anim,tiers,failsafe,image]
// Needs `cd tests && npm i` (playwright-core) and a Chrome binary (CHROME_PATH or macOS default).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { auditViewport, failing, PROBE_JS } from './anim-audit.mjs';
import { WORK_EMAIL, PERSONAL_EMAIL, PREFERRED_BADGE, MOTION_KEY } from './contact.config.mjs';
const { chromium } = createRequire(import.meta.url)('playwright-core');

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const base = opt('--base', process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '');
const shotDir = path.resolve(opt('--out', path.join(import.meta.dirname, '../screenshots/round2')));
const only = new Set(opt('--only', 'contact,footer,image,tiers,failsafe,anim').split(','));
const thorough = argv.includes('--thorough') || process.env.QA_THOROUGH === '1';
const origin = (argv.find((a) => !a.startsWith('--')) || 'http://127.0.0.1:4173').replace(/\/+$/, '');
fs.mkdirSync(shotDir, { recursive: true });
const url = (r) => origin + base + (r.startsWith('/') ? r : '/' + r);
const exe = process.env.CHROME_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, headless: true });
const results = [];
const rec = (id, ok, msg, warn = false) => { const status = ok ? 'PASS' : (warn ? 'WARN' : 'FAIL'); results.push({ id, status, msg }); console.log(`${status.padEnd(4)} ${id}  ${msg}`); };
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const mobileCtx = (w, h, o = {}) => browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: o.reduced ? 'reduce' : 'no-preference', javaScriptEnabled: o.js !== false, colorScheme: o.scheme || 'light', userAgent: IPHONE });
const desktopCtx = (w = 1280, h = 800, o = {}) => browser.newContext({ viewport: { width: w, height: h }, reducedMotion: o.reduced ? 'reduce' : 'no-preference', colorScheme: o.scheme || 'light' });
async function scrollThrough(page) {
  await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += Math.max(200, innerHeight / 2)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 130)); } });
  await page.waitForTimeout(1200);
}
const load = async (page, route = '/') => { await page.goto(url(route), { waitUntil: 'load' }); await page.waitForTimeout(2800); };

// =====================================================================================================
// 1. WORK e-mail is the PREFERRED contact (DOM / interaction level)
// =====================================================================================================
if (only.has('contact')) for (const [w, h] of [[375, 812], [768, 1024], [1440, 900]]) {
  const tag = `@${w}`;
  const ctx = w < 1024 ? await mobileCtx(w, h) : await desktopCtx(w, h); const page = await ctx.newPage();
  await load(page); await scrollThrough(page);
  const d = await page.evaluate(({ WORK, PERSONAL }) => {
    const q = (s, r = document) => [...r.querySelectorAll(s)];
    const mails = (root) => q('a[href^="mailto:"]', root).map((a) => a.getAttribute('href').replace(/^mailto:/i, '').toLowerCase());
    const sec = document.querySelector('section#contact'); const hero = document.querySelector('section#about, section[aria-label="Introduction"]'); const foot = document.querySelector('footer');
    const hdr = document.querySelector('header, nav');
    const cardOf = (addr) => { const a = q('a[href^="mailto:"]', sec).find((x) => x.getAttribute('href').toLowerCase() === 'mailto:' + addr); if (!a) return null; let el = a; while (el.parentElement && el.parentElement !== sec) { const p = el.parentElement; const hasBoth = [WORK, PERSONAL].every((e) => q('a[href^="mailto:"]', p).some((x) => x.getAttribute('href').toLowerCase() === 'mailto:' + e)); if (hasBoth) break; el = p; } return el; };
    const wc = cardOf(WORK), pc = cardOf(PERSONAL);
    const pos = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) }; };
    const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0.9; };
    const heroMail = hero ? q('a[href^="mailto:"]', hero)[0] : null;
    const hr = heroMail ? heroMail.getBoundingClientRect() : null;
    const copyBtns = q('button', sec).map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim()).filter((t) => /copy/i.test(t));
    return {
      contactMails: mails(sec), footerMails: mails(foot), heroMails: hero ? mails(hero) : [], headerMails: hdr ? mails(hdr) : [],
      workCardText: wc ? wc.innerText : null, personalCardText: pc ? pc.innerText : null, workPos: pos(wc), personalPos: pos(pc), workVisible: vis(wc),
      heroAria: heroMail ? (heroMail.getAttribute('aria-label') || '') : null, heroSize: hr ? [Math.round(hr.width), Math.round(hr.height)] : null, heroVisible: heroMail ? vis(heroMail) : false,
      copyBtns, ctaHref: [...document.querySelectorAll('header a, nav a')].filter((a) => /contact/i.test(a.textContent)).map((a) => a.getAttribute('href')),
    };
  }, { WORK: WORK_EMAIL.toLowerCase(), PERSONAL: PERSONAL_EMAIL.toLowerCase() });
  rec(`work-primary: #contact order work -> personal ${tag}`, d.contactMails[0] === WORK_EMAIL.toLowerCase() && d.contactMails.includes(PERSONAL_EMAIL.toLowerCase()), `mailto order in #contact: ${d.contactMails.join(' , ')}`);
  const wp = d.workPos, pp = d.personalPos;
  rec(`work-primary: work card is first visually ${tag}`, !!wp && !!pp && (wp.top < pp.top - 4 || (Math.abs(wp.top - pp.top) <= 4 && wp.left < pp.left)), JSON.stringify({ work: wp, personal: pp }));
  rec(`work-primary: "Preferred" badge on work card only ${tag}`, PREFERRED_BADGE.test(d.workCardText || '') && !PREFERRED_BADGE.test(d.personalCardText || ''), `work card has badge=${PREFERRED_BADGE.test(d.workCardText || '')}, personal card has badge=${PREFERRED_BADGE.test(d.personalCardText || '')}`);
  rec(`work-primary: hero mail icon is work-only, visible, >=44px ${tag}`, d.heroMails.length > 0 && d.heroMails.every((e) => e === WORK_EMAIL.toLowerCase()) && d.heroVisible && d.heroSize && d.heroSize[0] >= 44 && d.heroSize[1] >= 44, `hero mailto=${d.heroMails.join(',') || '(none)'} size=${d.heroSize} aria-label="${d.heroAria}"`);
  rec(`work-primary: hero mail aria-label mentions work ${tag}`, /work/i.test(d.heroAria || ''), `aria-label="${d.heroAria}"`, true);
  rec(`work-primary: footer lists work first ${tag}`, d.footerMails[0] === WORK_EMAIL.toLowerCase() && d.footerMails.includes(PERSONAL_EMAIL.toLowerCase()), d.footerMails.join(' , '));
  rec(`work-primary: nav/header mailto (if any) is work ${tag}`, d.headerMails.every((e) => e === WORK_EMAIL.toLowerCase()), d.headerMails.length ? d.headerMails.join(',') : `no mailto in header; CTA href=${d.ctaHref.join(',') || '(none)'}`);
  rec(`work-primary: copy buttons labelled work/personal in order ${tag}`, d.copyBtns.length >= 2 && /work/i.test(d.copyBtns[0]) && /personal/i.test(d.copyBtns[1]), d.copyBtns.join(' | ') || '(none found)', true);
  // JSON-LD in the rendered document
  const ld = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent).join('\n'));
  rec(`work-primary: JSON-LD email is work ${tag}`, ld.toLowerCase().includes(WORK_EMAIL.toLowerCase()) && !ld.toLowerCase().includes(PERSONAL_EMAIL.toLowerCase()), 'structured data carries the work address only');
  if (w === 375 || w === 1440) await page.locator('section#contact').screenshot({ path: path.join(shotDir, `contact-work-first-${w}.png`) }).catch(() => {});
  await ctx.close();
}

// =====================================================================================================
// 2. FOOTER alignment: labels/addresses consistent, no overlap, no overflow (320/375/414/768/1280)
// =====================================================================================================
const FOOTER_JS = `async () => {
  const f = document.querySelector('footer'); if (!f) return { error: 'no <footer>' };
  const vw = innerWidth, sy = scrollY; const T = (r) => ({ l: r.left, r: r.right, t: r.top + sy, b: r.bottom + sy, w: r.width, h: r.height });
  const rectOf = (el) => T(el.getBoundingClientRect());
  const textRect = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); const rs = [...rg.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5); if (!rs.length) return null; const l = Math.min(...rs.map((r) => r.left)), r2 = Math.max(...rs.map((r) => r.right)), t = Math.min(...rs.map((r) => r.top)), b = Math.max(...rs.map((r) => r.bottom)); return T({ left: l, right: r2, top: t, bottom: b, width: r2 - l, height: b - t }); };
  const baseline = (el) => { const p = document.createElement('span'); p.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'; el.appendChild(p); const y = p.getBoundingClientRect().top + sy; p.remove(); return y; };
  const leafBy = (root, re) => [...root.querySelectorAll('*')].filter((e) => !e.children.length && re.test((e.textContent || '').trim())).pop() || null;
  const out = { vw, scrollW: document.documentElement.scrollWidth, footer: rectOf(f) };
  // container = first div with padding inside footer
  const cont = f.querySelector('.container-x') || f.firstElementChild; { const cr = cont.getBoundingClientRect(), cc = getComputedStyle(cont); const l = cr.left + parseFloat(cc.paddingLeft), r = cr.right - parseFloat(cc.paddingRight); out.container = { l, r, t: cr.top + sy, b: cr.bottom + sy, w: r - l, h: cr.height }; }   // CONTENT box (padding removed)
  // --- contact rows
  out.rows = [...f.querySelectorAll('a[href^="mailto:"]')].map((a) => {
    const all = [...a.querySelectorAll('*')]; const label = all.filter((e) => !e.children.length && /^(work|personal)$/i.test((e.textContent || '').trim()))[0] || null;
    const addr = all.filter((e) => /@/.test(e.textContent || '') && !all.some((c) => c !== e && e.contains(c) && /@/.test(c.textContent || '')))[0] || all.find((e) => /@/.test(e.textContent)) || null;
    const ar = a.getBoundingClientRect();
    return { href: a.getAttribute('href').replace(/^mailto:/i, ''), anchor: T(ar), label: label ? { text: label.textContent.trim(), box: textRect(label), base: baseline(label) } : null, addr: addr ? { box: textRect(addr), base: baseline(addr), own: rectOf(addr) } : null };
  });
  // --- headings / columns
  const head = (re) => leafBy(f, re); const exH = head(/^explore$/i), coH = head(/^contact$/i);
  out.exploreHead = exH ? textRect(exH) : null; out.contactHead = coH ? textRect(coH) : null;
  const brand = f.querySelector('p.font-display, [class*="font-display"]'); out.brand = brand ? textRect(brand) : null;
  const nav = f.querySelector('nav'); out.explore = nav ? [...nav.querySelectorAll('a')].map((a) => ({ text: a.textContent.trim(), box: rectOf(a), tbox: textRect(a) })) : [];
  out.socials = [...f.querySelectorAll('a[target="_blank"]')].map((a) => ({ label: a.getAttribute('aria-label'), box: rectOf(a) }));
  const bottom = [...f.querySelectorAll('p')].filter((p) => /©|Built with/i.test(p.textContent)); out.bottom = bottom.map((p) => ({ text: p.textContent.trim().slice(0, 30), box: textRect(p), base: baseline(p) }));
  // --- overlap + overflow of every text line
  const lines = []; const tw = document.createTreeWalker(f, NodeFilter.SHOW_TEXT);
  while (tw.nextNode()) { const n = tw.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width > 0.5 && r.height > 0.5) lines.push({ txt: n.textContent.trim().slice(0, 22), node: lines.length ? 0 : 0, l: r.left, r: r.right, t: r.top + sy, b: r.bottom + sy, el, n }); }
  out.overflowRight = lines.filter((x) => x.r > vw + 0.5 || x.l < -0.5).map((x) => x.txt + ' ' + Math.round(x.l) + '..' + Math.round(x.r));
  out.overflowBox = lines.filter((x) => { const c = x.el.closest('a,li,p,h2,h3,button,div'); if (!c) return false; const r = c.getBoundingClientRect(); return x.r > r.right + 1.5 || x.l < r.left - 1.5; }).map((x) => x.txt + ' outside its box').slice(0, 5);
  const ov = []; for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) { const a = lines[i], b = lines[j]; if (a.n === b.n) continue; const ix = Math.min(a.r, b.r) - Math.max(a.l, b.l), iy = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ix > 1 && iy > 2) ov.push(a.txt + ' x ' + b.txt); }
  out.overlaps = ov.slice(0, 6);
  // --- back-to-top button vs footer text (it is position:fixed)
  const fab = [...document.querySelectorAll('button,a')].find((e) => /(back to )?top/i.test(e.getAttribute('aria-label') || '') && getComputedStyle(e).position === 'fixed');
  if (fab) { const fr = fab.getBoundingClientRect(); const cs = getComputedStyle(fab); out.fab = { visible: cs.visibility !== 'hidden' && +cs.opacity > 0.1 && fr.width > 0, l: fr.left, r: fr.right, t: fr.top, b: fr.bottom };
    out.fabHits = lines.filter((x) => { const ix = Math.min(x.r, fr.right) - Math.max(x.l, fr.left), iy = Math.min(x.b - sy, fr.bottom) - Math.max(x.t - sy, fr.top); return ix > 1 && iy > 1; }).map((x) => x.txt); }
  // --- motion control inside footer
  const mc = [...f.querySelectorAll('[role="radiogroup"], [role="group"], fieldset')].find((e) => /motion|animation/i.test((e.getAttribute('aria-label') || '') + (e.textContent || '') + (e.getAttribute('aria-labelledby') || '')));
  out.motion = mc ? { box: rectOf(mc), opts: [...mc.querySelectorAll('[role="radio"],button,input[type="radio"],label')].map((o) => { const r = o.getBoundingClientRect(); return { text: (o.getAttribute('aria-label') || o.textContent || '').trim().slice(0, 16), w: Math.round(r.width), h: Math.round(r.height) }; }) } : null;
  out.footerLinks = [...f.querySelectorAll('a[href]')].map((a) => { const r = a.getBoundingClientRect(); return { t: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 22), w: Math.round(r.width), h: Math.round(r.height) }; });
  return out;
}`;
if (only.has('footer')) for (const w of [320, 375, 414, 768, 1280]) {
  const tag = `@${w}`;
  const ctx = w < 1024 ? await mobileCtx(w, 800) : await desktopCtx(w, 800); const page = await ctx.newPage();
  await load(page); await scrollThrough(page);
  await page.locator('footer').scrollIntoViewIfNeeded(); await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(900);
  const g = await page.evaluate(`(${FOOTER_JS})()`);
  await page.locator('footer').screenshot({ path: path.join(shotDir, `footer-${w}.png`) }).catch(() => {});
  await page.screenshot({ path: path.join(shotDir, `footer-${w}-viewport.png`) }).catch(() => {});
  if (g.error) { rec(`footer: present ${tag}`, false, g.error); await ctx.close(); continue; }
  const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
  rec(`footer: no horizontal scroll ${tag}`, g.scrollW <= g.vw + 1 && g.vw <= w + 1, `scrollWidth=${g.scrollW} layout viewport=${g.vw} (nominal ${w}; a mobile browser widens the layout viewport when content is wider than the screen)`);
  rec(`footer: no text outside viewport ${tag}`, g.overflowRight.length === 0, g.overflowRight.join(' | ') || 'all footer text inside 0..viewport');
  rec(`footer: no text spilling out of its own box ${tag}`, g.overflowBox.length === 0, g.overflowBox.join(' | ') || 'every text line stays inside its link/paragraph box');
  rec(`footer: no overlapping text lines ${tag}`, g.overlaps.length === 0, g.overlaps.join(' | ') || 'no two text lines intersect');
  if (g.fab) rec(`footer: back-to-top button does not cover text ${tag}`, !g.fab.visible || g.fabHits.length === 0, g.fab.visible ? (g.fabHits.length ? 'covers: ' + g.fabHits.join(' | ') : 'visible at page bottom, covers no footer text') : 'button hidden at bottom'); else rec(`footer: back-to-top button located ${tag}`, false, 'no fixed "top" button found (selector aria-label~/top/)', true);
  // rows
  const rows = g.rows; const wk = rows.find((r) => r.href.toLowerCase() === WORK_EMAIL.toLowerCase()), ps = rows.find((r) => r.href.toLowerCase() === PERSONAL_EMAIL.toLowerCase());
  rec(`footer: both e-mail rows present, work first ${tag}`, rows.length === 2 && !!wk && !!ps && rows[0] === wk && wk.anchor.t < ps.anchor.t, rows.map((r) => r.href).join(' , '));
  if (wk && ps && wk.label && ps.label && wk.addr && ps.addr) {
    const lblX = [wk.label.box.l, ps.label.box.l], adX = [wk.addr.box.l, ps.addr.box.l];
    rec(`footer: labels share one left edge ${tag}`, near(lblX[0], lblX[1], 0.6), `work label x=${lblX[0].toFixed(1)}, personal label x=${lblX[1].toFixed(1)}`);
    rec(`footer: addresses share one left edge ${tag}`, near(adX[0], adX[1], 0.6), `work address x=${adX[0].toFixed(1)}, personal address x=${adX[1].toFixed(1)}`);
    for (const [name, r] of [['work', wk], ['personal', ps]]) {
      const sameLine = Math.abs(r.label.box.t - r.addr.box.t) < r.label.box.h * 0.8;
      if (sameLine) {
        rec(`footer: ${name} label left of address, clear gap ${tag}`, r.addr.box.l - r.label.box.r >= 6, `label ${r.label.box.l.toFixed(0)}..${r.label.box.r.toFixed(0)} | address starts ${r.addr.box.l.toFixed(0)} (gap ${(r.addr.box.l - r.label.box.r).toFixed(0)}px)`);
        rec(`footer: ${name} label+address share a baseline ${tag}`, near(r.label.base, r.addr.base, 1.5), `label baseline y=${r.label.base.toFixed(1)}, address baseline y=${r.addr.base.toFixed(1)}`);
      } else {
        rec(`footer: ${name} label stacked above address, same left edge ${tag}`, near(r.label.box.l, r.addr.box.l, 1.5) && r.addr.box.t >= r.label.box.b - 1, `label x=${r.label.box.l.toFixed(1)} y=${r.label.box.t.toFixed(0)}..${r.label.box.b.toFixed(0)}; address x=${r.addr.box.l.toFixed(1)} y=${r.addr.box.t.toFixed(0)}`);
      }
    }
    rec(`footer: both rows use the same layout mode ${tag}`, (Math.abs(wk.label.box.t - wk.addr.box.t) < wk.label.box.h * 0.8) === (Math.abs(ps.label.box.t - ps.addr.box.t) < ps.label.box.h * 0.8), 'work and personal rows are either both side-by-side or both stacked');
    if (g.contactHead) rec(`footer: row labels align with the "Contact" heading ${tag}`, near(g.contactHead.l, lblX[0], 2.5), `heading x=${g.contactHead.l.toFixed(1)}, labels x=${lblX[0].toFixed(1)}`);
    for (const r of rows) rec(`footer: ${r.label?.text} row inside container ${tag}`, r.addr.box.r <= g.container.r + 1 && r.addr.box.l >= g.container.l - 1, `address ${r.addr.box.l.toFixed(0)}..${r.addr.box.r.toFixed(0)} container ${g.container.l.toFixed(0)}..${g.container.r.toFixed(0)}`);
  } else rec(`footer: label+address spans found in each row ${tag}`, false, 'could not identify label (Work/Personal) and address elements inside the footer mailto links');
  // headings & columns
  if (g.exploreHead && g.contactHead && w >= 640) rec(`footer: "Explore" and "Contact" headings share a top edge ${tag}`, near(g.exploreHead.t, g.contactHead.t, 2), `Explore y=${g.exploreHead.t.toFixed(0)}, Contact y=${g.contactHead.t.toFixed(0)}`);
  if (g.brand && g.exploreHead) { const leftEdges = [['brand', g.brand.l], ['Explore', g.exploreHead.l], ...g.bottom.slice(0, 1).map((b) => ['bottom bar', b.box.l])].filter(([n]) => w < 1024 || n !== 'Explore'); const left0 = g.container.l; rec(`footer: left-column items share the container's left edge ${tag}`, leftEdges.every(([, x]) => near(x, left0, 1.5)), leftEdges.map(([n, x]) => `${n}=${x.toFixed(1)}`).join(', ') + ` (container ${left0.toFixed(1)})`); }
  const so = g.socials; if (so.length && g.contactHead) rec(`footer: social icons start at the contact column's left edge ${tag}`, near(so[0].box.l, g.contactHead.l, 3), `first icon x=${so[0].box.l.toFixed(1)} vs heading x=${g.contactHead.l.toFixed(1)}`, true);
  if (w < 640 && g.explore.length) { const lines = new Set(g.explore.map((e) => Math.round(e.box.t / 8))).size; rec(`footer: Explore links wrap in <=2 lines on phones ${tag}`, lines <= 2, `${g.explore.length} links on ${lines} line(s)`, true); }
  if (g.bottom.length === 2) rec(`footer: bottom bar texts do not collide / right text inside container ${tag}`, g.bottom[1].box.r <= g.container.r + 1 && (g.bottom[1].box.t >= g.bottom[0].box.b - 1 || g.bottom[1].box.l >= g.bottom[0].box.r + 8), g.bottom.map((b) => `${b.text}: ${b.box.l.toFixed(0)}..${b.box.r.toFixed(0)} y=${b.box.t.toFixed(0)}`).join(' | '));
  if (g.bottom.length === 2 && w >= 640) rec(`footer: bottom bar texts share a baseline ${tag}`, near(g.bottom[0].base, g.bottom[1].base, 1.5), `${g.bottom[0].base.toFixed(1)} vs ${g.bottom[1].base.toFixed(1)}`);
  const small = g.footerLinks.filter((l) => l.h < 44 || l.w < 44 && !/^[A-Za-z]{2}/.test(l.t));
  const tiny = g.footerLinks.filter((l) => l.h < 44);
  rec(`footer: every footer link >=44px tall ${tag}`, tiny.length === 0, tiny.length ? tiny.map((l) => `${l.t} ${l.w}x${l.h}`).join(' | ') : `${g.footerLinks.length} links, min height ${Math.min(...g.footerLinks.map((l) => l.h))}px`, w >= 768);
  if (g.motion) rec(`footer: motion control inside container, options >=44px ${tag}`, g.motion.box.r <= g.container.r + 1 && g.motion.box.l >= g.container.l - 1 && g.motion.opts.filter((o) => /full|gentle|off/i.test(o.text)).every((o) => o.h >= 44 || o.w >= 44), JSON.stringify(g.motion.opts.map((o) => `${o.text}:${o.w}x${o.h}`)));
  await ctx.close();
}
// dark theme sanity at 375 (alignment is theme independent, but overlap/overflow must hold in both)
if (only.has('footer')) {
  const ctx = await mobileCtx(375, 800, { scheme: 'dark' }); const page = await ctx.newPage(); await load(page); await scrollThrough(page);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(700);
  const g = await page.evaluate(`(${FOOTER_JS})()`);
  rec('footer: dark theme @375 no overflow / overlap', !g.error && g.overlaps.length === 0 && g.overflowRight.length === 0 && g.scrollW <= g.vw + 1, g.error || `overlaps=${g.overlaps.length} overflow=${g.overflowRight.length}`);
  await page.locator('footer').screenshot({ path: path.join(shotDir, 'footer-375-dark.png') }).catch(() => {});
  await ctx.close();
}

// =====================================================================================================
// 3. Hero image (runtime): web copy loads under the base path, no original/leftover requested, EXIF checked statically
// =====================================================================================================
if (only.has('image')) for (const [w, h] of [[375, 812], [1280, 800]]) {
  const ctx = w < 1024 ? await mobileCtx(w, h) : await desktopCtx(w, h); const page = await ctx.newPage(); const reqs = []; const bad = [];
  page.on('request', (r) => reqs.push(r.url())); page.on('response', (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));
  await load(page); await scrollThrough(page);
  const im = await page.evaluate(() => { const i = document.querySelector('[data-avatar-state] img, img[alt*="ortrait" i]'); if (!i) return null; const r = i.getBoundingClientRect(); return { src: i.currentSrc || i.src, nat: [i.naturalWidth, i.naturalHeight], shown: [Math.round(r.width), Math.round(r.height)], complete: i.complete, alt: i.alt, state: i.closest('[data-avatar-state]')?.getAttribute('data-avatar-state') }; });
  rec(`image: hero photo loaded (naturalWidth>0) @${w}`, !!im && im.complete && im.nat[0] > 0, im ? JSON.stringify(im) : 'no hero <img>');
  if (im) {
    const u = new URL(im.src); rec(`image: hero src under base ${base || '/'} and lowercase @${w}`, (!base || u.pathname.startsWith(base + '/')) && u.pathname === u.pathname.toLowerCase(), u.pathname);
    rec(`image: hero has meaningful alt @${w}`, /karthik|portrait/i.test(im.alt), `alt="${im.alt}"`);
    rec(`image: hero sharp enough (natural >= 1.0x displayed) @${w}`, im.nat[0] >= im.shown[0] * 1.0, `natural ${im.nat.join('x')} shown ${im.shown.join('x')} (dpr ${w < 1024 ? 2 : 1})`, true);
  }
  const forbidden = reqs.filter((r) => /mypropic|MyProfilePic|DSC\d|portrait-(square|tall|wide)|\.PNG(\?|$)/.test(r));
  rec(`image: no original/leftover image requested @${w}`, forbidden.length === 0, forbidden.join(' | ') || `${reqs.length} requests, none for MyProfilePic.PNG / DSC* / portrait-*.jpg`);
  rec(`image: no 4xx for images @${w}`, bad.length === 0, bad.join(' | ') || 'none');
  if (w === 375) await page.locator('[data-avatar-state]').first().screenshot({ path: path.join(shotDir, 'hero-avatar-375.png') }).catch(() => {});
  await ctx.close();
}

// =====================================================================================================
// 4. Motion tiers: default, reduced-motion default = gentle, footer control, persistence
// =====================================================================================================
const optLoc = (page, tier) => {
  const f = page.locator('footer');
  const re = new RegExp(`^\\s*(motion:\\s*)?${tier}\\b`, 'i');
  return f.getByRole('radio', { name: re }).or(f.getByRole('button', { name: re })).or(f.locator(`[data-motion-option="${tier}"]`)).first();
};
const isOn = async (loc) => loc.evaluate((e) => e.getAttribute('aria-checked') === 'true' || e.getAttribute('aria-pressed') === 'true' || e.checked === true || e.getAttribute('data-state') === 'on' || e.getAttribute('data-state') === 'checked' || e.hasAttribute('data-active') || (e.querySelector && e.querySelector('input[type="radio"]:checked') !== null));
const probe = (page) => page.evaluate(`(${PROBE_JS})()`);
const stored = (page) => page.evaluate((k) => { try { return localStorage.getItem(k); } catch { return 'ERR'; } }, MOTION_KEY);
const dm = (page) => page.evaluate(() => document.documentElement.dataset.motion || null);

if (only.has('tiers')) {
  // 4a. OS "reduce motion" emulation, nothing stored -> default tier = gentle, everything revealed
  {
    const ctx = await mobileCtx(375, 812, { reduced: true }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await load(page);
    rec('tiers: reduce-motion device defaults to "gentle" (data-motion)', (await dm(page)) === 'gentle', `html[data-motion]=${await dm(page)} (matchMedia reduce=${await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)})`);
    rec('tiers: default choice is not written to storage (it is a default, not a choice)', (await stored(page)) === null, `localStorage.${MOTION_KEY}=${await stored(page)}`, true);
    const pr = await probe(page);
    rec('tiers: gentle keeps a soft float (alive, <=5.5px) on a reduce-motion phone', pr.avatarRange !== null && pr.avatarRange > 0.3 && pr.avatarRange <= 5.5, `avatar vertical range over 2.5s = ${pr.avatarRange}px`);
    rec('tiers: gentle has nothing rotating/spinning', pr.rotating === 0, `${pr.rotating} rotating element(s)`);
    const hid = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,p,li,a,button,img')].filter((el) => { const r = el.getBoundingClientRect(); if (!r.height || r.top > innerHeight || el.closest('[aria-hidden="true"],.sr-only')) return false; let o = 1, p = el; while (p && p !== document.documentElement) { o *= +getComputedStyle(p).opacity; p = p.parentElement; } return o < 0.9 && getComputedStyle(el).visibility !== 'hidden'; }).map((e) => e.tagName + ':' + (e.textContent || e.alt || '').trim().slice(0, 20)));
    rec('tiers: gentle first viewport fully visible after intro', hid.length === 0, hid.slice(0, 5).join(' | ') || 'every first-viewport element opacity>=0.9');
    const mqs = await page.evaluate(() => { const m = document.querySelector('.marquee'); if (!m) return null; const mr = m.getBoundingClientRect(); const cs = getComputedStyle(m); const shown = (c) => c.getClientRects().length > 0; const chips = [...m.querySelectorAll('.chip')].filter((c) => shown(c) && !c.closest('[aria-hidden="true"]')); const all = [...m.querySelectorAll('.chip')].filter(shown);
      const out = chips.filter((c) => { const r = c.getBoundingClientRect(); return r.left < mr.left - 0.5 || r.right > mr.right + 0.5; }).length; const tr = m.querySelector('.marquee-track'); const a = tr ? tr.getAnimations().length : 0;
      return { n: chips.length, shownAll: all.length, out, anims: a, mask: cs.maskImage + '|' + (cs.webkitMaskImage || ''), pseudo: getComputedStyle(m, '::before').content, sw: document.documentElement.scrollWidth, vw: innerWidth }; });
    rec('tiers: gentle marquee is a static wrapped row (all chips inside the strip, no duplicate group, no animation, no fade mask/overlay)', !!mqs && mqs.n === 9 && mqs.shownAll === 9 && mqs.out === 0 && mqs.anims === 0 && !/url|gradient/.test(mqs.mask) && /^(none|normal|"")$/.test(mqs.pseudo) && mqs.sw <= mqs.vw, JSON.stringify(mqs));
    const hint = await page.evaluate(() => /reduced because|device asks|reduce motion|prefers reduced/i.test(document.querySelector('footer')?.innerText || ''));
    rec('tiers: footer explains why animations are reduced (auto-gentle hint)', hint, hint ? 'hint text present' : 'no hint text in footer', true);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(600);
    const g = optLoc(page, 'gentle');
    rec('tiers: footer control shows Gentle selected on a reduce-motion phone', (await g.count()) > 0 && (await isOn(g)), (await g.count()) ? `gentle selected=${await isOn(g)}` : 'footer motion control not found');
    await page.screenshot({ path: path.join(shotDir, 'tiers-reduce-default-footer-375.png') }).catch(() => {});
    // user opts into Full while the OS still says reduce
    const f = optLoc(page, 'full');
    if (await f.count()) {
      await f.scrollIntoViewIfNeeded(); await f.click(); await page.waitForTimeout(800);
      rec('tiers: reduce-motion phone can switch to Full (data-motion+storage)', (await dm(page)) === 'full' && (await stored(page)) === 'full', `data-motion=${await dm(page)} stored=${await stored(page)}`);
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(1500);
      const p2 = await probe(page);
      rec('tiers: Full on a reduce-motion phone really animates (ring/blobs rotate, avatar floats > gentle)', p2.rotating > 0 && p2.avatarRange > (pr.avatarRange || 0), `rotating=${p2.rotating} avatarRange=${p2.avatarRange}px (gentle was ${pr.avatarRange}px)`);
      await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
      rec('tiers: Full choice survives reload (overrides OS default)', (await dm(page)) === 'full', `data-motion after reload=${await dm(page)}`);
    } else rec('tiers: Full option exists', false, 'footer motion control option "Full" not found');
    rec('tiers: no page errors on reduce-motion phone', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
    await ctx.close();
  }
  // 4b. no OS preference -> Full; control walk-through Full -> Gentle -> Off, reload persistence, SPA nav, keyboard
  {
    const ctx = await desktopCtx(1280, 800); const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await load(page);
    rec('tiers: no OS preference defaults to "full"', (await dm(page)) === 'full', `data-motion=${await dm(page)}`);
    const pf = await probe(page);
    rec('tiers: full is alive (running anims >= 8, something rotates, avatar floats >1.5px)', pf.running >= 8 && pf.rotating > 0 && pf.avatarRange > 1.5, JSON.stringify(pf), false);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(700);
    const opts = {}; for (const t of ['full', 'gentle', 'off']) opts[t] = optLoc(page, t);
    const have = await Promise.all(Object.values(opts).map((o) => o.count()));
    rec('tiers: footer control offers Full, Gentle and Off', have.every((n) => n > 0), `option counts full/gentle/off = ${have.join('/')}`);
    const grp = await page.locator('footer [role="radiogroup"]').count();
    rec('tiers: control is a labelled radiogroup', grp > 0 && !!(await page.locator('footer [role="radiogroup"]').first().evaluate((e) => e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || '').catch(() => '')), grp ? 'role=radiogroup with accessible name' : 'no role=radiogroup in footer', true);
    if (have.every((n) => n > 0)) {
      rec('tiers: Full is selected by default', await isOn(opts.full), `full selected=${await isOn(opts.full)}`);
      for (const t of ['gentle', 'off', 'full']) {
        await opts[t].scrollIntoViewIfNeeded(); await opts[t].click(); await page.waitForTimeout(900);
        rec(`tiers: click ${t} -> data-motion, aria state, storage`, (await dm(page)) === t && (await isOn(opts[t])) && (await stored(page)) === t, `data-motion=${await dm(page)} selected=${await isOn(opts[t])} stored=${await stored(page)}`);
        await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(1600);
        const p = await probe(page);
        if (t === 'gentle') rec('tiers: gentle behaviour (float <=5.5px, no rotation)', p.rotating === 0 && p.avatarRange <= 5.5 && p.avatarRange > 0.3, JSON.stringify(p));
        if (t === 'off') rec('tiers: off behaviour (nothing moves: no float, no rotation, no infinite animation)', p.rotating === 0 && p.avatarRange < 0.5 && p.infinite === 0, JSON.stringify(p));
        if (t === 'full') rec('tiers: switching back to full restores motion', p.rotating > 0 && p.avatarRange > 1.5, JSON.stringify(p));
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(500);
      }
      // persistence: choose Off, reload, SPA-navigate to the blog, hard-load a post
      await opts.off.click(); await page.waitForTimeout(500);
      await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
      rec('tiers: Off persists after reload', (await dm(page)) === 'off', `data-motion=${await dm(page)}`);
      const pOff = await probe(page);
      rec('tiers: after reload Off is truly static', pOff.rotating === 0 && pOff.avatarRange < 0.5 && pOff.infinite === 0, JSON.stringify(pOff));
      const hiddenOff = await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } await new Promise((r) => setTimeout(r, 500)); return [...document.querySelectorAll('h1,h2,h3,p,li,article')].filter((e) => { let o = 1, p = e; while (p && p !== document.documentElement) { o *= +getComputedStyle(p).opacity; p = p.parentElement; } return o < 0.9 && e.getBoundingClientRect().height > 0 && !e.closest('[aria-hidden="true"],.sr-only'); }).map((e) => e.tagName + ':' + e.textContent.trim().slice(0, 20)); });
      rec('tiers: Off shows every section fully (no hidden content)', hiddenOff.length === 0, hiddenOff.slice(0, 5).join(' | ') || 'all text blocks opaque after scroll');
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(400);
      const blogLink = page.locator('footer a[href$="/blog/"]').first();
      if (await blogLink.count()) {
        await page.evaluate(() => { window.__spa = 'alive'; }); await blogLink.click(); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800);
        rec('tiers: choice kept on client-side navigation to /blog/', (await dm(page)) === 'off' && (await page.evaluate(() => window.__spa)) === 'alive', `data-motion=${await dm(page)} on ${new URL(page.url()).pathname}`);
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(400);
        rec('tiers: control also present in the /blog/ footer', (await optLoc(page, 'gentle').count()) > 0, 'footer on /blog/');
      }
      await page.goto(url('/blog/'), { waitUntil: 'load' }); await page.waitForTimeout(800);
      rec('tiers: choice applied on a fresh hard load of another page before paint', (await dm(page)) === 'off', `data-motion=${await dm(page)}`);
      // keyboard operation
      await page.goto(url('/'), { waitUntil: 'load' }); await page.waitForTimeout(1200); await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(400);
      const k = optLoc(page, 'gentle'); await k.focus();
      const ring = await k.evaluate((e) => { const c = getComputedStyle(e); return (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) || c.boxShadow !== 'none' || (e.parentElement && getComputedStyle(e.parentElement).boxShadow !== 'none') || (e.closest('label') ? getComputedStyle(e.closest('label')).boxShadow !== 'none' : false); });
      rec('tiers: focused option has a visible focus indicator', ring, ring ? 'outline/box-shadow present' : 'no outline or box-shadow on focused option', true);
      let ok = false, how = '';
      for (const key of ['Space', 'Enter', 'ArrowRight', 'ArrowLeft']) { await page.keyboard.press(key); await page.waitForTimeout(300); if ((await dm(page)) === 'gentle') { ok = true; how = key; break; } if (key === 'ArrowRight' || key === 'ArrowLeft') { /* radiogroup arrows move selection */ } }
      rec('tiers: option can be activated from the keyboard', ok, ok ? `activated with ${how}` : `data-motion stayed ${await dm(page)}`);
      if (ok) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); const a = await dm(page); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(250); const b2 = await dm(page);
        rec('tiers: arrow keys move the selection (radiogroup pattern)', a === 'off' && b2 === 'gentle', `ArrowRight -> ${a}, ArrowLeft -> ${b2}`); }
    }
    rec('tiers: no page errors while switching', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
    await ctx.close();
  }
  // 4c. phone: control usable by touch, 44px, inside viewport
  {
    const ctx = await mobileCtx(320, 700); const page = await ctx.newPage(); await load(page); await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(600);
    const o = optLoc(page, 'off');
    if (await o.count()) {
      const box = await o.boundingBox();
      rec('tiers: Off option >=44px and fully inside a 320px viewport', !!box && box.height >= 44 && box.x >= 0 && box.x + box.width <= 320, JSON.stringify(box && { x: Math.round(box.x), w: Math.round(box.width), h: Math.round(box.height) }));
      await o.tap(); await page.waitForTimeout(700);
      rec('tiers: tapping Off on a phone works', (await dm(page)) === 'off', `data-motion=${await dm(page)}`);
    } else rec('tiers: phone control present', false, 'no footer motion control');
    await ctx.close();
  }
}

// =====================================================================================================
// 5. Failsafe: nothing may stay hidden (no JS / IntersectionObserver never fires / slow CPU+network)
// =====================================================================================================
const visibleCheck = (page, scopeToViewport = true) => page.evaluate((vp) => [...document.querySelectorAll('main h1,main h2,main h3,main p,main li,main a,main button,main img')].filter((el) => {
  if (el.closest('[aria-hidden="true"],.sr-only,noscript')) return false; const r = el.getBoundingClientRect(); if (!r.height || !r.width) return false; if (vp && (r.bottom < 0 || r.top > innerHeight)) return false;
  let o = 1, p = el; while (p && p !== document.documentElement) { o *= +getComputedStyle(p).opacity; p = p.parentElement; } return o < 0.5 && getComputedStyle(el).visibility !== 'hidden';
}).map((e) => e.tagName + ':' + (e.textContent || e.alt || '').trim().slice(0, 24)), scopeToViewport);
if (only.has('failsafe')) {
  { // JS disabled
    const ctx = await mobileCtx(375, 812, { js: false }); const page = await ctx.newPage(); await page.goto(url('/'), { waitUntil: 'load' }); await page.waitForTimeout(800);
    const hid = await page.evaluate(() => [...document.querySelectorAll('main h1,main h2,main h3,main p,main li,main a,main img,h1')].filter((el) => { if (el.closest('[aria-hidden="true"],.sr-only')) return false; const r = el.getBoundingClientRect(); if (!r.height) return false; let o = 1, p = el; while (p && p !== document.documentElement) { o *= +getComputedStyle(p).opacity; p = p.parentElement; } return o < 0.5; }).map((e) => e.tagName + ':' + (e.textContent || '').trim().slice(0, 24)));
    const txt = await page.evaluate(() => document.body.innerText.length);
    rec('failsafe: JavaScript disabled -> all content readable (noscript reveal)', hid.length === 0 && txt > 1500, `${txt} chars of text; hidden elements: ${hid.length}${hid.length ? ' e.g. ' + hid.slice(0, 5).join(' | ') : ''}`);
    await page.screenshot({ path: path.join(shotDir, 'failsafe-nojs-375.png'), fullPage: true }).catch(() => {});
    await ctx.close();
  }
  { // IntersectionObserver that never reports: first viewport must still appear (failsafe forces reveal)
    const ctx = await mobileCtx(375, 812); await ctx.addInitScript(() => { window.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }; });
    const page = await ctx.newPage(); await page.goto(url('/'), { waitUntil: 'load' }); await page.waitForTimeout(4200);
    const hid = await visibleCheck(page);
    rec('failsafe: IntersectionObserver never fires -> on-screen content still revealed within ~4s', hid.length === 0, hid.slice(0, 6).join(' | ') || 'every on-screen element visible');
    await page.evaluate(() => scrollTo(0, innerHeight * 3)); await page.waitForTimeout(4500);
    const hid2 = await visibleCheck(page);
    rec('failsafe: ...and after scrolling (re-check on scroll end) ', hid2.length === 0, hid2.slice(0, 6).join(' | ') || 'on-screen content at 3 viewports down is visible', true);
    await page.screenshot({ path: path.join(shotDir, 'failsafe-no-io-375.png') }).catch(() => {});
    await ctx.close();
  }
  { // 4x CPU + slow 4G
    const ctx = await mobileCtx(375, 812); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    const t0 = Date.now(); await page.goto(url('/'), { waitUntil: 'load' }); const tLoad = Date.now() - t0; await page.waitForTimeout(3200);
    const hid = await visibleCheck(page);
    rec('failsafe: 4x CPU + slow-4G -> on-screen content visible 3.2s after load', hid.length === 0, `load took ${tLoad}ms; ${hid.length ? 'hidden: ' + hid.slice(0, 6).join(' | ') : 'all on-screen content visible'}`);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await ctx.close();
  }
}

// =====================================================================================================
// 6. Mobile animation completion (touch emulation; scroll through; every animated element ends fully visible)
// =====================================================================================================
if (only.has('anim')) {
  const full = thorough ? [[375, 667], [390, 844], [320, 568], [414, 896]] : [[375, 667], [320, 568]];
  const show = (r) => failing(r).slice(0, 6).map((x) => `${x.k}:<${x.tag}> "${x.text}" ${x.reason || x.style}`).join(' | ');
  for (const [w, h] of full) {
    const r = await auditViewport(browser, origin + base, '/', w, h, shotDir, 'full', {});
    const bad = failing(r);
    rec(`anim: FULL tier, touch ${w}x${h}: all animated elements fully revealed after scroll+flick`, bad.length === 0 && r.atBottom, bad.length ? `${bad.length} stuck: ${show(r)}` : `0 stuck of every content element; pageHeight=${r.pageHeight}px, reached bottom=${r.atBottom}, errors=${r.errors.length}`);
    rec(`anim: FULL tier, touch ${w}x${h}: motion is alive (>=8 running animations, avatar floats, something rotates)`, r.probe.running >= 8 && r.probe.avatarRange > 0.5 && r.probe.rotating > 0 && r.probe.dataMotion === 'full', JSON.stringify(r.probe));
    rec(`anim: no page errors ${w}x${h}`, r.errors.length === 0, r.errors.slice(0, 3).join(' | ') || 'none');
  }
  { // OS reduce-motion phone, default tier (gentle): content completes
    const r = await auditViewport(browser, origin + base, '/', 375, 667, shotDir, 'reduced', { reduced: true }); const bad = failing(r);
    rec('anim: reduce-motion phone (default gentle), 375x667: all content fully revealed', bad.length === 0 && r.atBottom && r.probe.dataMotion === 'gentle', bad.length ? show(r) : `0 stuck; data-motion=${r.probe.dataMotion}; probe=${JSON.stringify(r.probe)}`);
  }
  { // stored Off
    const r = await auditViewport(browser, origin + base, '/', 375, 667, shotDir, 'off', { motion: 'off' }); const bad = failing(r);
    rec('anim: tier Off, 375x667: all content immediately/fully visible', bad.length === 0 && r.atBottom && r.probe.dataMotion === 'off' && r.probe.rotating === 0, bad.length ? show(r) : `0 stuck; probe=${JSON.stringify(r.probe)}`);
  }
  { // stored Gentle without OS flag (explicit user choice)
    const r = await auditViewport(browser, origin + base, '/', 375, 667, shotDir, 'gentle', { motion: 'gentle' }); const bad = failing(r);
    rec('anim: tier Gentle (explicit), 375x667: all content fully revealed, nothing rotating', bad.length === 0 && r.probe.rotating === 0 && r.probe.dataMotion === 'gentle', bad.length ? show(r) : `0 stuck; probe=${JSON.stringify(r.probe)}`);
  }
}

await browser.close();
const f = results.filter((r) => r.status === 'FAIL').length, wn = results.filter((r) => r.status === 'WARN').length;
fs.writeFileSync(path.join(shotDir, 'e2e-round2-results.json'), JSON.stringify(results, null, 2));
console.log(`\nE2E-ROUND2 ${f ? 'FAIL' : 'PASS'}: ${results.length} checks, ${f} fail, ${wn} warn. Screenshots: ${shotDir}`);
process.exit(f ? 1 : 0);
