// Browser check for the Sycamore Square site: loads every page at phone and desktop widths in Chromium,
// clicks every tab and scenario, and fails on console errors, broken requests, missing images or sideways scroll.
//
// Setup once:  npm install --no-save playwright@1.64.1 && npx playwright install chromium
// Run:         node scripts/browser_check.mjs
// Optional:    CHROMIUM_PATH=/path/to/chrome to use an existing browser.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
const WIDTHS = [360, 1280];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.pdf': 'application/pdf',
  '.glb': 'model/gltf-binary', '.txt': 'text/plain', '.zip': 'application/zip' };
// Third-party hosts whose hiccups should not fail a content edit.
const THIRD_PARTY = /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/;

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(ROOT, p.endsWith('/') ? p + 'index.html' : p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [];

for (const width of WIDTHS) {
  for (const page of PAGES) {
    const ctx = await browser.newContext({ viewport: { width, height: 860 } });
    const p = await ctx.newPage();
    const where = `${page} at ${width}px`;
    p.on('console', m => { if (m.type() === 'error' && !THIRD_PARTY.test(m.text())) problems.push(`${where}: console error: ${m.text().slice(0, 200)}`); });
    p.on('pageerror', e => problems.push(`${where}: script error: ${String(e).slice(0, 200)}`));
    p.on('response', r => { if (r.url().startsWith(BASE) && r.status() >= 400) problems.push(`${where}: ${r.status()} for ${r.url().replace(BASE, '')}`); });

    await p.goto(BASE + page, { waitUntil: 'networkidle' });
    const scroll = async label => {
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      if (sw > width) problems.push(`${where}: page scrolls sideways (${sw}px wide) ${label}`);
    };
    await scroll('after load');

    const tabs = p.locator('.tab');
    for (let i = 0; i < await tabs.count(); i++) {
      const t = tabs.nth(i);
      await t.scrollIntoViewIfNeeded();
      await t.click();
      await p.waitForTimeout(150);
      await scroll(`with the "${(await t.textContent()).trim()}" tab open`);
    }

    const scenarios = p.locator('.seg-btn[data-scenario]');
    for (let i = 0; i < await scenarios.count(); i++) {
      const b = scenarios.nth(i);
      await b.scrollIntoViewIfNeeded();
      await b.click();
      await p.waitForTimeout(250);
      const name = await b.getAttribute('data-scenario');
      const ok = await p.evaluate(() => (document.getElementById('plan-cards')?.textContent || '').trim().length > 50);
      if (!ok) problems.push(`${where}: the ${name} scenario shows no plan numbers`);
      await scroll(`in the ${name} scenario`);
    }

    // Scroll through to load lazy images, then confirm every visible image loaded.
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } });
    await p.waitForLoadState('networkidle');
    await p.waitForTimeout(300);
    const broken = await p.evaluate(() => [...document.images]
      .filter(img => img.offsetParent !== null && img.getBoundingClientRect().width > 0)
      .filter(img => img.loading !== 'lazy' || img.complete)
      .filter(img => !(img.complete && img.naturalWidth > 0))
      .map(img => img.getAttribute('src')));
    for (const src of broken) problems.push(`${where}: image did not load: ${src}`);
    await ctx.close();
  }
}

await browser.close();
server.close();
if (problems.length) {
  console.log([...new Set(problems)].map(s => 'FAIL  ' + s).join('\n'));
  console.log(`${new Set(problems).size} browser problem(s) found.`);
  process.exit(1);
}
console.log(`Browser check passed: ${PAGES.length} pages at ${WIDTHS.join(' and ')}px.`);
