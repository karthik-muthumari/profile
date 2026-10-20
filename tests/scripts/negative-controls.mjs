#!/usr/bin/env node
// Proves the privacy/contact gates actually bite: plants a defect into a COPY of a clean export and
// requires check-export.mjs to FAIL on the expected check id (and the untouched baseline to PASS).
//   node negative-controls.mjs <cleanOutDir> [--base /my-profile]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { WORK_EMAIL, PERSONAL_EMAIL, LINKEDIN_URL } from './contact.config.mjs';

const argv = process.argv.slice(2);
const bi = argv.indexOf('--base'); const base = bi >= 0 ? argv.splice(bi, 2)[1] : '';
const clean = path.resolve(argv[0]);
const here = import.meta.dirname;
const pics = path.resolve(here, '../../pics');
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'negctl-'));

const check = (dir) => {
  const r = spawnSync('node', [path.join(here, 'check-export.mjs'), dir, '--base', base, '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  let j; try { j = JSON.parse(r.stdout); } catch { return { code: r.status, failing: ['(unparseable output)'] }; }
  return { code: r.status, failing: j.results.filter((x) => x.status === 'FAIL').map((x) => x.id) };
};
const appendHtml = (dir, text) => { const f = path.join(dir, 'index.html'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('</body>', text + '</body>')); };
const rewriteHtml = (dir, fn) => { const f = path.join(dir, 'index.html'); fs.writeFileSync(f, fn(fs.readFileSync(f, 'utf8'))); };

const controls = [
  ['planted phone number', 'privacy:no-phone-or-address', (d) => appendHtml(d, '<p>Call +44 777 123 4567</p>')],
  ['planted home address (Ryehill)', 'privacy:no-phone-or-address', (d) => appendHtml(d, '<p>12 Ryehill Road</p>')],
  ['planted postcode (NG2 2LQ)', 'privacy:no-phone-or-address', (d) => appendHtml(d, '<p>NG2 2LQ</p>')],
  ['planted tel: link', 'privacy:no-phone-or-address', (d) => appendHtml(d, '<a href="tel:+447771234567">call</a>')],
  ['planted original photo (DSC01768.JPG)', 'privacy:no-original-photos', (d) => fs.copyFileSync(path.join(pics, 'DSC01768.JPG'), path.join(d, 'DSC01768.JPG'))],
  ['planted THIRD e-mail in text', 'contact:email-allowlist', (d) => appendHtml(d, '<p>write to someone.else@example.org</p>')],
  ['planted THIRD e-mail as mailto link', 'contact:mailto-targets-approved', (d) => appendHtml(d, '<a href="mailto:third.person@gmail.com">x</a>')],
  ['planted third e-mail inside JS chunk', 'contact:email-allowlist', (d) => { const c = path.join(d, '_next/static/chunks'); const f = fs.readdirSync(c).find((n) => n.endsWith('.js')); fs.appendFileSync(path.join(c, f), '\n;var leak="ceo@bigcorp.io";'); }],
  ['placeholder hello@example.com', 'contact:no-placeholder-urls', (d) => appendHtml(d, '<a href="mailto:hello@example.com">x</a>')],
  ['placeholder TODO text', 'html:placeholder-text', (d) => appendHtml(d, '<p>TODO: add real contact</p>')],
  ['wrong LinkedIn URL', 'contact:social-urls-exact', (d) => rewriteHtml(d, (h) => h.split(LINKEDIN_URL).join('https://www.linkedin.com/in/someone-else/'))],
  ['work e-mail mailto removed from home', 'contact:mailto-work-on-home', (d) => rewriteHtml(d, (h) => h.replace(new RegExp(`mailto:${WORK_EMAIL.replace(/\./g, '\\.')}`, 'gi'), '#'))],
  ['personal e-mail mailto removed from home', 'contact:mailto-personal-on-home', (d) => rewriteHtml(d, (h) => h.replace(new RegExp(`mailto:${PERSONAL_EMAIL.replace(/\./g, '\\.')}`, 'gi'), '#'))],
];

let bad = 0;
const base0 = check(clean);
console.log(`${base0.code === 0 ? 'PASS' : 'FAIL'}  baseline (untouched export) -> check-export exit ${base0.code}${base0.failing.length ? ' failing: ' + base0.failing.join(',') : ''}`);
if (base0.code !== 0) { console.log('Baseline is not clean; negative controls are meaningless. Aborting.'); process.exit(1); }
for (const [name, expectId, mutate] of controls) {
  const d = path.join(tmpRoot, String(Math.random()).slice(2)); fs.cpSync(clean, d, { recursive: true });
  try { mutate(d); } catch (e) { console.log(`ERR   ${name}: could not plant (${e.message})`); bad++; continue; }
  const r = check(d); const ok = r.code !== 0 && r.failing.includes(expectId);
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  control "${name}" -> expected FAIL on ${expectId}; got exit ${r.code}, failing: ${r.failing.join(',') || '(none)'}`);
}
fs.rmSync(tmpRoot, { recursive: true, force: true });
console.log(bad ? `NEGATIVE CONTROLS: FAIL (${bad})` : `NEGATIVE CONTROLS: PASS (${controls.length} planted defects all caught)`);
process.exit(bad ? 1 : 0);
