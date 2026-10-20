#!/usr/bin/env node
// Negative controls for artifact-detect.mjs: serves mock hero pages that contain exactly ONE planted defect each and requires the
// detector to FAIL on the right check (and the clean mock to PASS everything). No build needed.
//   node negative-controls-artifacts.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
const here = import.meta.dirname;

const CHIPS = ['React', 'Next.js', 'Node.js', 'GraphQL', 'Apollo Federation', 'AWS (Certified Solutions Architect)', 'CDK', 'Terraform', 'Playwright'];
const li = (c) => CHIPS.map((t) => `<li class="chip">${t}</li>`).join('');
function page({ rect = false, overlay = false, badSeam = false, seamBg = false }) {
  return `<!doctype html><html lang="en" data-motion="full"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>mock</title><style>
  :root{--bg:11 13 18} html,body{margin:0;background:rgb(var(--bg));color:#e8e8ea;font:15px/1.5 system-ui}
  header{height:64px;border-bottom:1px solid #222}
  #about{position:relative;overflow:hidden;min-height:736px}
  .glow{position:absolute;inset:0;background:radial-gradient(60% 60% at 70% 30%, rgba(245,165,36,.2), rgba(245,165,36,0) 70%)}
  .rect{position:absolute;left:62%;top:42%;right:0;bottom:0;background:rgba(255,255,255,.03)}
  .col{position:relative;max-width:620px;padding:300px 0 0 120px}
  .marquee{position:relative;overflow:hidden}
  ${overlay ? '.marquee::before,.marquee::after{content:"";position:absolute;top:0;bottom:0;width:10%;z-index:1;pointer-events:none}.marquee::before{left:0;background:linear-gradient(to right,rgb(var(--bg)),transparent)}.marquee::after{right:0;background:linear-gradient(to left,rgb(var(--bg)),transparent)}'
      : '.marquee{-webkit-mask-image:linear-gradient(to right,transparent,#000 10%,#000 90%,transparent);mask-image:linear-gradient(to right,transparent,#000 10%,#000 90%,transparent)}'}
  .track{display:flex;width:max-content;gap:8px;margin:0;padding:0;list-style:none;animation:marquee 40s linear infinite}
  .chip{padding:6px 12px;border:1px solid #333;border-radius:999px;background:rgba(255,255,255,.04);font:12px monospace;white-space:nowrap}
  @keyframes marquee{to{transform:translateX(${badSeam ? 'calc(-50% - 0px)' : 'calc(-50% - 4px)'})}}
  .next{height:200px}
  </style></head><body><header></header><section id="about" aria-label="Introduction"><div class="glow"></div>${rect ? '<div class="rect"></div>' : ''}
  <div class="col"><h1>Hi</h1><div class="marquee"><ul class="track marquee-track">${li()}${li().replace(/class="chip"/g, 'class="chip marquee-dup"')}</ul></div></div></section><section class="next"></section></body></html>`;
}
const MOCKS = {
  clean: page({}),
  rect: page({ rect: true }),
  overlay: page({ overlay: true }),
  seam: page({ badSeam: true }),
};
const srv = http.createServer((req, res) => { const k = req.url.replace(/^\/|\/.*$/g, ''); res.setHeader('content-type', 'text/html'); res.end(MOCKS[k] || '404'); });
await new Promise((r) => srv.listen(4199, '127.0.0.1', r));
let bad = 0;
const run = (name) => new Promise((resolve) => {
  const ch = spawn('node', [path.join(here, 'artifact-detect.mjs'), `http://127.0.0.1:4199/${name}`, '--out', `${process.env.TMPDIR || '/tmp'}/qa-neg-artifacts/${name}`, '--label', name, '--sizes', '1280x800', '--schemes', 'dark']);
  let o = ''; ch.stdout.on('data', (d) => (o += d)); ch.on('close', (code) => resolve({ code, lines: o.split('\n').filter((l) => /^(PASS|FAIL|WARN)/.test(l)) }));
});
const expectFail = async (name, re) => { const r = await run(name); const hit = r.lines.filter((l) => l.startsWith('FAIL') && re.test(l)); const ok = r.code === 1 && hit.length > 0; console.log(`${ok ? 'PASS' : 'FAIL'} negative control "${name}": detector ${hit.length ? 'flagged ' + hit.length + ' x /' + re.source + '/' : 'DID NOT flag /' + re.source + '/'} (exit ${r.code})`); if (!ok) { bad++; console.log(r.lines.filter((l) => /strip|edge/.test(l)).map((l) => "   " + l.slice(0, 260)).join("\n")); } };
const c = await run('clean'); const cf = c.lines.filter((l) => l.startsWith('FAIL'));
console.log(`${c.code === 0 ? 'PASS' : 'FAIL'} negative control "clean": clean mock passes all ${c.lines.length} checks (exit ${c.code})${cf.length ? ' — unexpected: ' + cf.map((l) => l.slice(0, 140)).join(' || ') : ''}`); if (c.code !== 0) bad++;
await expectFail('rect', /edge:/);                 // faint lighter rectangle with hard edges
await expectFail('overlay', /strip: no (dark\/light )?block at the (LEFT|RIGHT)/); // solid-colour fade overlay on a gradient background
await expectFail('seam', /seam:/);                 // loop end translate != list pitch
srv.close();
console.log(`\nNEGATIVE-CONTROLS-ARTIFACTS ${bad ? 'FAIL' : 'PASS'}: ${bad} control(s) misbehaved`);
process.exit(bad ? 1 : 0);
