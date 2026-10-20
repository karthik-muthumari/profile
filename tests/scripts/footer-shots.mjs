#!/usr/bin/env node
// node footer-shots.mjs <origin+base> <outDir>   -> footer screenshots at 320/375/414/768/1280 + geometry dump
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const [origin, out] = [process.argv[2].replace(/\/+$/, ''), process.argv[3]]; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
for (const w of [320, 375, 414, 768, 1280]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); await p.goto(origin + '/', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
  await p.waitForTimeout(1500);
  const f = p.locator('footer').first(); await f.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  await f.screenshot({ path: path.join(out, `footer-${w}.png`) });
  const g = await p.evaluate(() => [...document.querySelectorAll('footer h2, footer li, footer a, footer p, footer ul, footer nav')].map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}[${(e.getAttribute('aria-label') || e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 28)}] x=${Math.round(r.left)}..${Math.round(r.right)} y=${Math.round(r.top + scrollY)} w=${Math.round(r.width)} h=${Math.round(r.height)}`; }));
  fs.writeFileSync(path.join(out, `footer-${w}.txt`), `viewport ${w} scrollWidth=${await p.evaluate(() => document.documentElement.scrollWidth)}\n` + g.join('\n'));
  await ctx.close();
}
await b.close();
