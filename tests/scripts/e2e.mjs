#!/usr/bin/env node
// Browser smoke tests: responsive overflow, tap targets, type size, client-side nav, failed requests,
// console errors, theme, reduced motion, axe-core a11y, screenshots.
//   node e2e.mjs <origin> [--base /my-profile] [--out ../screenshots/<tag>] [--routes /,/blog/] [--avatar "<css selector>"]
// Needs: `cd tests && npm i` (playwright-core + axe-core) and a Chrome/Chromium binary.
//   CHROME_PATH=/path/to/chrome  (default: macOS Google Chrome, then playwright's own browser)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
import { WORK_EMAIL, PERSONAL_EMAIL, LINKEDIN_URL, GITHUB_URL, PLACEHOLDER_VISIBLE } from './contact.config.mjs';
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const base = opt('--base', process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '');
const shotDir = path.resolve(opt('--out', path.join(import.meta.dirname, '../screenshots', base ? base.replace(/\W/g, '') : 'root')));
let routes = opt('--routes', '/,/blog/').split(',');
const avatarSel = opt('--avatar', '[data-avatar-slot], #avatar-slot, [data-testid="avatar-slot"], [data-avatar-state]');
const origin = argv[0] || 'http://127.0.0.1:4173';
fs.mkdirSync(shotDir, { recursive: true });

const exe = process.env.CHROME_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, headless: true });
const results = [];
const rec = (id, status, msg) => { results.push({ id, status, msg }); console.log(`${status.padEnd(4)} ${id}  ${msg}`); };
const url = (r) => origin + base + (r.startsWith('/') ? r : '/' + r);


// Effective hit area: element rect, or (stretched-link pattern: ::after{position:absolute;inset:0}) the positioned
// ancestor's rect, but only if the top-left and bottom-left inset points (14px in, clear of rounded corners) of that ancestor really resolve to the link.
const HIT_JS = `(el) => {
  const r = el.getBoundingClientRect(); let rect = { w: r.width, h: r.height, stretched: false };
  const pa = getComputedStyle(el, '::after');
  if (pa.position === 'absolute' && pa.content !== 'none') {
    let a = el.parentElement; while (a && getComputedStyle(a).position === 'static') a = a.parentElement;
    if (a) { a.scrollIntoView({ block: 'center', behavior: 'instant' }); const ar = a.getBoundingClientRect(); const pts = [[ar.left + 14, ar.top + 14], [ar.left + 14, ar.bottom - 14]];
      if (pts.every(([x, y]) => { const t = document.elementFromPoint(x, y); return t && (t === el || el.contains(t)); })) rect = { w: ar.width, h: ar.height, stretched: true }; }
  }
  return rect;
}`;

const WIDTHS = [[320, 640], [375, 812], [768, 1024], [1024, 768], [1440, 900]];

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  // scroll through the page so whileInView / IntersectionObserver animations fire
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += Math.max(200, innerHeight / 2)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    scrollTo(0, 0); await new Promise((r) => setTimeout(r, 700));
  });
}

function trackNetwork(page, bag) {
  page.on('response', (r) => { if (r.status() >= 400) bag.bad.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => bag.bad.push(`FAILED ${r.url()} ${r.failure()?.errorText}`));
  page.on('console', (m) => { if (m.type() === 'error') bag.console.push(m.text()); });
  page.on('pageerror', (e) => bag.console.push('pageerror: ' + e.message));
}

// ---------- 1. every route x width ----------
for (const route of routes) {
  for (const [w, h] of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 1024, isMobile: w < 768 });
    const page = await ctx.newPage(); const bag = { bad: [], console: [] }; trackNetwork(page, bag);
    const tag = `${route} @${w}`;
    const resp = await page.goto(url(route), { waitUntil: 'load' });
    if (!resp || resp.status() >= 400) { rec(`load ${tag}`, 'FAIL', `status ${resp?.status()}`); await ctx.close(); continue; }
    await settle(page);
    const m = await page.evaluate(({ avatarSel, HIT_JS }) => {
      const hitRect = eval(HIT_JS);
      const de = document.documentElement; const vw = innerWidth;
      const offenders = [];
      for (const el of document.body.querySelectorAll('*')) {
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.width && r.right > vw + 1 && !el.closest('[data-allow-overflow],pre,code,table,.overflow-x-auto')) {
          // ignore if an ancestor clips/scrolls it
          let p = el.parentElement, clipped = false;
          while (p && p !== document.body) { const o = getComputedStyle(p); if (/(hidden|auto|scroll|clip)/.test(o.overflowX) && p.getBoundingClientRect().right <= vw + 1) { clipped = true; break; } p = p.parentElement; }
          if (!clipped) offenders.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).toString().split(' ').slice(0, 2).join('.')} right=${Math.round(r.right)}`);
        }
      }
      const clippedBy = [];
      for (const el of document.body.querySelectorAll('a,button,h1,h2,h3,p,li,input,img,svg,span')) {
        if (el.closest('[aria-hidden="true"],[data-allow-overflow]')) continue;
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        let p = el.parentElement;
        while (p && p !== document.documentElement) {
          const o = getComputedStyle(p);
          if (/(auto|scroll)/.test(o.overflowX)) break;           // intentional scroller
          if ((o.maskImage && o.maskImage !== 'none') || (o.webkitMaskImage && o.webkitMaskImage !== 'none')) break;   // intentional fade-out marquee/strip
          if (/(hidden|clip)/.test(o.overflowX)) { const pr = p.getBoundingClientRect(); if (r.right > pr.right + 1.5 || r.left < pr.left - 1.5) clippedBy.push(`${el.tagName.toLowerCase()}[${(el.textContent || '').trim().slice(0, 18)}] ${Math.round(r.left)}..${Math.round(r.right)} vs container ${Math.round(pr.left)}..${Math.round(pr.right)}`); break; }
          p = p.parentElement;
        }
      }
      const small = []; const tiny = [];
      for (const el of document.querySelectorAll('a[href],button,input,select,textarea,[role=button],summary')) {
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        const inlineText = el.tagName === 'A' && cs.display === 'inline' && el.closest('p,li');   // WCAG 2.5.8 inline exception
        if (inlineText) continue;
        const hr = hitRect(el); const ew = Math.round(Math.max(r.width, hr.w)), eh = Math.round(Math.max(r.height, hr.h));
        const name = `${el.tagName.toLowerCase()}[${(el.getAttribute('aria-label') || el.textContent || el.getAttribute('href') || '').trim().slice(0, 24)}] ${ew}x${eh}${hr.stretched ? ' (stretched link)' : ''}`;
        if (ew < 24 || eh < 24) tiny.push(name); else if (ew < 44 || eh < 44) small.push(name);
      }
      // smallest rendered text
      let minFont = 99, minEl = '';
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (tw.nextNode()) { const n = tw.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const fs = parseFloat(cs.fontSize); if (fs < minFont) { minFont = fs; minEl = n.textContent.trim().slice(0, 30); } }
      const bodyFont = parseFloat(getComputedStyle(document.body).fontSize);
      let avatar = null;
      const a = document.querySelector(avatarSel);
      if (a) { const r = a.getBoundingClientRect(); avatar = { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top + scrollY) }; }
      const viewport = document.querySelector('meta[name=viewport]')?.content;
      return { clipped: clippedBy.slice(0, 6), nClipped: clippedBy.length, sw: de.scrollWidth, bw: document.body.scrollWidth, vw, offenders: offenders.slice(0, 6), tiny: tiny.slice(0, 8), small: small.length, smallEx: small.slice(0, 4), minFont, minEl, bodyFont, avatar, viewport };
    }, { avatarSel, HIT_JS });
    const overflow = Math.max(m.sw, m.bw) > m.vw + 1;
    rec(`no-h-overflow ${tag}`, overflow ? 'FAIL' : 'PASS', `scrollWidth=${Math.max(m.sw, m.bw)} viewport=${m.vw}` + (m.offenders.length ? ` offenders: ${m.offenders.join(' | ')}` : ''));
    rec(`no-clipped-content ${tag}`, m.nClipped ? 'FAIL' : 'PASS', m.nClipped ? `${m.nClipped} element(s) cut off by an overflow:hidden ancestor: ${m.clipped.join(' | ')}` : 'no visible content cut off by overflow:hidden containers');
    rec(`tap-targets ${tag}`, m.tiny.length ? 'FAIL' : (w < 768 && m.small ? 'WARN' : 'PASS'), m.tiny.length ? `<24px: ${m.tiny.join(' | ')}` : `${m.small} targets <44px` + (m.small ? ` e.g. ${m.smallEx.join(' | ')}` : ''));
    rec(`type-size ${tag}`, m.minFont < 11 ? 'FAIL' : (m.minFont < 12 || m.bodyFont < 16 ? 'WARN' : 'PASS'), `body=${m.bodyFont}px smallest=${m.minFont}px ("${m.minEl}")`);
    if (route === '/' || route === '') {
      if (!m.avatar) rec(`avatar-slot ${tag}`, 'WARN', `selector not found: ${avatarSel}`);
      else { const ok = m.avatar.right <= w + 1 && m.avatar.left >= -1 && m.avatar.w >= Math.min(160, w * 0.45); rec(`avatar-slot ${tag}`, ok ? 'PASS' : 'FAIL', JSON.stringify(m.avatar)); }
    }
    if (bag.bad.length) rec(`network ${tag}`, 'FAIL', bag.bad.slice(0, 6).join(' | ')); else rec(`network ${tag}`, 'PASS', 'no 4xx/failed requests');
    if (bag.console.length) rec(`console ${tag}`, 'FAIL', bag.console.slice(0, 4).join(' | ')); else rec(`console ${tag}`, 'PASS', 'no console errors');
    await page.screenshot({ path: path.join(shotDir, `${route.replace(/\W+/g, '_') || 'home'}-${w}.png`), fullPage: true });
    await ctx.close();
  }
}

// ---------- 2. client-side navigation (SPA, no full reload) + direct deep links ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage(); const bag = { bad: [], console: [] }; trackNetwork(page, bag);
  await page.goto(url('/'), { waitUntil: 'load' }); await settle(page);
  await page.evaluate(() => { window.__spaMarker = 'alive'; });
  const hrefs = await page.$$eval('a[href]', (as) => [...new Set(as.map((a) => a.getAttribute('href')).filter((h) => h && !/^(https?:|mailto:|tel:|#)/.test(h)))]);
  rec('internal-links-found', hrefs.length ? 'PASS' : 'WARN', hrefs.join(', ') || 'none');
  const unprefixed = base ? hrefs.filter((h) => h.startsWith('/') && !h.startsWith(base + '/') && h !== base) : [];
  rec('links-have-base', unprefixed.length ? 'FAIL' : 'PASS', unprefixed.length ? unprefixed.join(', ') : 'all root-relative hrefs carry the base path');
  const pagesNav = hrefs.filter((h) => !h.includes('#') && h !== (base || '') + '/').slice(0, 6);
  for (const h of pagesNav) {
    await page.goto(url('/'), { waitUntil: 'load' }); await page.evaluate(() => { window.__spaMarker = 'alive'; });
    const link = page.locator(`a[href="${h}"]`).first();
    await link.scrollIntoViewIfNeeded().catch(() => {});
    if (!(await link.isVisible().catch(() => false))) { rec(`spa-nav ${h}`, 'WARN', 'link not visible at 1280px (maybe in mobile menu)'); continue; }
    const before = bag.bad.length;
    await link.click(); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(600);
    const marker = await page.evaluate(() => window.__spaMarker);
    const u = new URL(page.url());
    const okUrl = u.pathname.startsWith(base + '/') || u.pathname === base;
    rec(`spa-nav ${h}`, marker === 'alive' && okUrl && bag.bad.length === before ? 'PASS' : 'FAIL', `landed ${u.pathname} marker=${marker} newBadRequests=${bag.bad.length - before}`);
    await page.goBack().catch(() => {}); await page.waitForTimeout(300);
  }
  // blog posts: open first post by client nav, then hard reload it
  await page.goto(url('/blog/'), { waitUntil: 'load' }); await settle(page);
  const postHref = await page.$$eval('a[href*="/blog/"]', (as) => as.map((a) => a.getAttribute('href')).find((h) => h && !/\/blog\/?$/.test(h)));
  if (!postHref) rec('blog-post-link', 'FAIL', 'no post links found on /blog/');
  else {
    await page.evaluate(() => { window.__spaMarker = 'alive'; });
    await page.click(`a[href="${postHref}"]`); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(600);
    const h1 = await page.locator('h1').first().innerText().catch(() => '');
    rec('blog-post-client-nav', (await page.evaluate(() => window.__spaMarker)) === 'alive' && h1 ? 'PASS' : 'FAIL', `${page.url()} h1="${h1.slice(0, 50)}"`);
    const r = await page.reload({ waitUntil: 'load' });
    rec('blog-post-hard-reload', r.status() === 200 ? 'PASS' : 'FAIL', `status ${r.status()}`);
    await page.screenshot({ path: path.join(shotDir, 'blog-post-1280.png'), fullPage: true });
  }
  // 404 page
  const r404 = await page.goto(url('/definitely-not-here/'));
  const t404 = await page.locator('body').innerText();
  rec('404-page', r404.status() === 404 && t404.length > 10 ? 'PASS' : 'FAIL', `status ${r404.status()} text="${t404.replace(/\s+/g, ' ').slice(0, 60)}"`);
  const bad404 = [];
  const res = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
  if (base) { const un = res.filter((h) => h.startsWith('/') && !h.startsWith(base + '/')); if (un.length) bad404.push(...un); }
  rec('404-links-have-base', bad404.length ? 'FAIL' : 'PASS', bad404.join(', ') || 'ok');
  await ctx.close();
}

// ---------- 3. theme + reduced motion + a11y ----------
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: scheme });
  const page = await ctx.newPage(); const bag = { bad: [], console: [] }; trackNetwork(page, bag);
  await page.goto(url('/'), { waitUntil: 'load' }); await settle(page);
  const bg = await page.evaluate(() => { const c = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g).map(Number); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; });
  rec(`prefers-color-scheme:${scheme}`, scheme === 'dark' ? (bg < 100 ? 'PASS' : 'WARN') : (bg > 150 ? 'PASS' : 'WARN'), `body bg luma=${bg.toFixed(0)}` + ' (WARN may just mean the site defaults to a fixed theme; confirm intent)');
  const toggle = page.locator('button[aria-label*="theme" i], button[title*="theme" i], button:has-text("theme")').first();
  if (await toggle.count()) {
    const snap = () => page.evaluate(() => document.documentElement.className + '|' + document.documentElement.dataset.theme + '|' + getComputedStyle(document.body).backgroundColor);
    const a = await snap(); await toggle.click(); await page.waitForTimeout(500); const b = await snap();
    rec(`theme-toggle (start ${scheme})`, a !== b ? 'PASS' : 'FAIL', `${a}  ->  ${b}`);
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(500);
    rec(`theme-persists (start ${scheme})`, (await snap()) === b ? 'PASS' : 'WARN', 'after reload: ' + (await snap()));
  } else rec(`theme-toggle (start ${scheme})`, 'WARN', 'no theme toggle button found (aria-label/title containing "theme")');
  await page.screenshot({ path: path.join(shotDir, `home-1280-${scheme}.png`), fullPage: true });
  await page.addScriptTag({ content: axeSrc });
  const runAxe = async (label) => {
    await page.waitForTimeout(900);   // let colour transitions finish (axe reads mid-transition colours otherwise)
    const ax = await page.evaluate(async () => { const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice'] }); return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes[0]?.target?.join(' '), html: v.nodes[0]?.html?.slice(0, 120) })); });
    const serious = ax.filter((v) => ['serious', 'critical'].includes(v.impact));
    rec(`axe ${label}`, serious.length ? 'FAIL' : (ax.length ? 'WARN' : 'PASS'), serious.length || ax.length ? ax.map((v) => `${v.id}(${v.impact},${v.n}) ${v.ex}`).join(' | ') : 'no violations');
  };
  const themeNow = () => page.evaluate(() => (document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark') ? 'dark' : 'light');
  await runAxe(`${await themeNow()} (after earlier toggle+reload; ctx prefers ${scheme})`);
  if (await toggle.count()) { await toggle.click(); await runAxe(`${await themeNow()} (after second toggle)`); }
  // keyboard focus visible
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const c = getComputedStyle(e); return { tag: e.tagName, outline: c.outlineStyle + ' ' + c.outlineWidth, shadow: c.boxShadow }; });
  rec(`focus-visible ${scheme}`, focus && (/^(solid|auto)/.test(focus.outline) && !/ 0px/.test(focus.outline) || focus.shadow !== 'none') ? 'PASS' : 'WARN', JSON.stringify(focus));
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); await page.goto(url('/'), { waitUntil: 'load' }); await page.waitForTimeout(1500);
  // NOTE: no scrolling here on purpose – content must be visible without animation triggers
  const r = await page.evaluate(() => {
    const hidden = []; for (const el of document.querySelectorAll('h1,h2,h3,p,section,article,li')) { const cs = getComputedStyle(el); const rect = el.getBoundingClientRect(); if (cs.display !== 'none' && rect.height > 0 && parseFloat(cs.opacity) < 0.05 && rect.top < innerHeight) hidden.push(el.tagName + ':' + (el.textContent || '').trim().slice(0, 25)); }
    const infinite = document.getAnimations().filter((a) => a.effect?.getTiming?.().iterations === Infinity && a.playState === 'running').length;
    return { hidden: hidden.slice(0, 6), nHidden: hidden.length, infinite, anims: document.getAnimations().length };
  });
  rec('reduced-motion: content visible', r.nHidden ? 'FAIL' : 'PASS', r.nHidden ? `invisible (opacity≈0) in first viewport: ${r.hidden.join(' | ')}` : 'no invisible text blocks in first viewport');
  rec('reduced-motion: no infinite CSS/WAAPI animations', r.infinite ? 'WARN' : 'PASS', `${r.infinite} infinite running (of ${r.anims}) – JS-driven (framer-motion rAF) loops are NOT counted here; review code for useReducedMotion`);
  await settle(page);
  const after = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,p,article,li')].filter((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0 && parseFloat(getComputedStyle(el).opacity) < 0.05).map((el) => el.tagName + ':' + el.textContent.trim().slice(0, 25)));
  rec('reduced-motion: all content visible after scrolling', after.length ? 'FAIL' : 'PASS', after.length ? after.slice(0, 6).join(' | ') : 'every text block reaches opacity>0 once scrolled into view');
  await page.screenshot({ path: path.join(shotDir, 'home-375-reduced-motion.png'), fullPage: true });
  await ctx.close();
}

// ---------- 4. Contact update: both e-mails, LinkedIn, GitHub (owner-approved) ----------
// 4 widths x 2 colour schemes. Contact links must live in <section id="contact">, be visible, inside the viewport,
// reachable by keyboard (Tab) with a visible focus ring, have >=44x44px hit area, be the topmost element at their
// centre (not covered), and the addresses must be shown as text. axe is run scoped to the section.
const CONTACT = [
  ['work email', `a[href="mailto:${WORK_EMAIL}"]`, WORK_EMAIL],
  ['personal email', `a[href="mailto:${PERSONAL_EMAIL}"]`, PERSONAL_EMAIL],
  ['LinkedIn', `a[href="${LINKEDIN_URL}"]`, null],
  ['GitHub', `a[href="${GITHUB_URL}"]`, null],
];
for (const scheme of ['light', 'dark']) {
  for (const [w, h] of [[320, 700], [375, 812], [768, 1024], [1440, 900]]) {
    const tag = `${scheme} @${w}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: w < 1024, isMobile: w < 768 });
    const page = await ctx.newPage(); const bag = { bad: [], console: [] }; trackNetwork(page, bag);
    await page.goto(url('/'), { waitUntil: 'load' }); await settle(page);
    const themeAttr = await page.evaluate(() => document.documentElement.dataset.theme || (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
    rec(`contact: theme matches prefers-color-scheme ${tag}`, themeAttr === scheme ? 'PASS' : 'WARN', `data-theme=${themeAttr}`);
    const sec = page.locator('section#contact'); await sec.scrollIntoViewIfNeeded().catch(() => {});
    if (!(await sec.count())) { rec(`contact: section#contact exists ${tag}`, 'FAIL', 'no <section id="contact">'); await ctx.close(); continue; }
    await page.waitForTimeout(800);
    const txt = (await sec.innerText()).replace(/\s+/g, ' ');
    const shown = [WORK_EMAIL, PERSONAL_EMAIL].filter((e) => !txt.toLowerCase().includes(e.toLowerCase()));
    rec(`contact: both e-mail addresses shown as text in section ${tag}`, shown.length ? 'FAIL' : 'PASS', shown.length ? `not visible as text: ${shown.join(', ')}` : 'both addresses visible in #contact text');
    const ph = txt.match(PLACEHOLDER_VISIBLE) || txt.match(/example\.(com|org)|your-.*-handle/i);
    rec(`contact: no placeholder text ${tag}`, ph ? 'FAIL' : 'PASS', ph ? ph[0] : 'none');
    for (const [label, sel] of CONTACT) {
      const loc = sec.locator(sel).first();
      if (!(await loc.count())) { rec(`contact: ${label} link in #contact ${tag}`, 'FAIL', `no ${sel} inside section#contact`); continue; }
      await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
      const g = await loc.evaluate((el, HIT_JS) => {
        const hr = eval(HIT_JS)(el);
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2; const top = document.elementFromPoint(cx, cy);
        return { w: Math.round(Math.max(r.width, hr.w)), h: Math.round(Math.max(r.height, hr.h)), stretched: hr.stretched, left: Math.round(r.left), right: Math.round(r.right), vis: cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.9, topmost: !!top && (top === el || el.contains(top)), tabindex: el.getAttribute('tabindex'), inSection: !!el.closest('section#contact'), href: el.getAttribute('href'), target: el.getAttribute('target'), rel: el.getAttribute('rel') };
      }, HIT_JS);
      const sizeOk = g.w >= 44 && g.h >= 44; const inVp = g.left >= 0 && g.right <= w + 1;
      rec(`contact: ${label} visible+unclipped+topmost ${tag}`, g.vis && inVp && g.topmost ? 'PASS' : 'FAIL', JSON.stringify({ vis: g.vis, inViewport: inVp, topmost: g.topmost, left: g.left, right: g.right }));
      rec(`contact: ${label} tap target >=44px ${tag}`, sizeOk ? 'PASS' : 'FAIL', `${g.w}x${g.h}${g.stretched ? ' (stretched-link ::after hit area, verified by elementFromPoint)' : ''}`);
      rec(`contact: ${label} href exact ${tag}`, 'PASS', g.href + (g.target === '_blank' ? ` target=_blank rel="${g.rel}"` : ''));
      if (g.target === '_blank' && !/noopener/.test(g.rel || '')) rec(`contact: ${label} rel=noopener ${tag}`, 'FAIL', `rel="${g.rel}"`);
      rec(`contact: ${label} focusable (tabindex) ${tag}`, g.tabindex !== '-1' ? 'PASS' : 'FAIL', `tabindex=${g.tabindex}`);
    }
    // keyboard reachability: Tab from the top of the page until each contact link has had focus; check visible focus indicator
    await page.evaluate(() => { scrollTo(0, 0); document.activeElement?.blur?.(); });
    const want = new Set(CONTACT.map((c) => c[0])); const focusSeen = {}; const ringBad = [];
    for (let i = 0; i < 400 && want.size; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate((specs) => {
        const e = document.activeElement; if (!e) return null; const href = e.getAttribute && e.getAttribute('href'); if (!href || !e.closest('section#contact')) return null;
        const cs = getComputedStyle(e); return { href, ring: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none' };
      });
      if (!info) continue;
      for (const [label, sel] of CONTACT) { const href = sel.slice(sel.indexOf('"') + 1, sel.lastIndexOf('"')); if (info.href === href && want.has(label)) { want.delete(label); focusSeen[label] = info.ring; if (!info.ring) ringBad.push(label); } }
    }
    rec(`contact: all 4 links reachable via Tab ${tag}`, want.size ? 'FAIL' : 'PASS', want.size ? `never focused: ${[...want].join(', ')}` : 'Tab order reaches work email, personal email, LinkedIn, GitHub');
    rec(`contact: visible focus ring on contact links ${tag}`, ringBad.length ? 'FAIL' : 'PASS', ringBad.length ? `no outline/box-shadow on: ${ringBad.join(', ')}` : 'outline or box-shadow present');
    // axe scoped to the contact section (after colour transitions settle)
    await page.addScriptTag({ content: axeSrc }); await page.waitForTimeout(800);
    const ax = await page.evaluate(async () => { const r = await axe.run({ include: [['section#contact']] }, { runOnly: ['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice'] }); return r.violations.map((v) => `${v.id}(${v.impact},${v.nodes.length}) ${v.nodes[0]?.target?.join(' ')}`); });
    rec(`contact: axe (section#contact) ${tag}`, ax.length ? 'FAIL' : 'PASS', ax.join(' | ') || 'no violations');
    const noh = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    rec(`contact: no horizontal overflow ${tag}`, noh ? 'PASS' : 'FAIL', '');
    await sec.screenshot({ path: path.join(shotDir, `contact-${scheme}-${w}.png`) }).catch(() => {});
    if (bag.bad.length || bag.console.length) rec(`contact: network/console clean ${tag}`, 'FAIL', [...bag.bad, ...bag.console].slice(0, 4).join(' | '));
    await ctx.close();
  }
}
// Footer contact links on a non-home page (/blog/) and on the 404 page
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage(); await page.goto(url('/blog/'), { waitUntil: 'load' }); await settle(page);
  for (const [label, sel] of CONTACT) {
    const n = await page.locator(`footer ${sel}`).count();
    rec(`contact: ${label} in footer of /blog/`, n ? 'PASS' : 'WARN', n ? 'present' : `no ${sel} in <footer> (contact details only on home)`);
  }
  const bodyTxt = await page.locator('body').innerText();
  rec('contact: /blog/ has no placeholder text', PLACEHOLDER_VISIBLE.test(bodyTxt) || /example\.(com|org)/i.test(bodyTxt) ? 'FAIL' : 'PASS', '');
  await ctx.close();
}
await browser.close();
const f = results.filter((r) => r.status === 'FAIL').length, w = results.filter((r) => r.status === 'WARN').length;
fs.writeFileSync(path.join(shotDir, 'e2e-results.json'), JSON.stringify(results, null, 2));
console.log(`\nE2E ${f ? 'FAIL' : 'PASS'}: ${results.length} checks, ${f} fail, ${w} warn. Screenshots: ${shotDir}`);
process.exit(f ? 1 : 0);
