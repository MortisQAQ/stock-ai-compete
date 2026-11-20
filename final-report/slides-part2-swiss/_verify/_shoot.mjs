import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire('D:/agents/skills/playwright-skill/node_modules/playwright-core/index.js');
const { chromium } = require('D:/agents/skills/playwright-skill/node_modules/playwright-core');
const path = require('node:path');

const root = 'D:/projects/playground/stock-ai-compete/final-report/slides-part2-swiss';
const out = path.join(root, '_verify', 'shots');
mkdirSync(out, { recursive: true });
const fileUrl = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');

const browser = await chromium.launch({
  executablePath: 'C:\\Users\\J\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
await page.route('**/*', (route) => {
  const u = route.request().url();
  if (u.startsWith('file://') || u.startsWith('data:')) return route.continue();
  return route.abort();
});

const report = [];
for (let n = 1; n <= 7; n++) {
  await page.goto(fileUrl + '?slide=' + n, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(2800);
  await page.screenshot({ path: path.join(out, 'p2-' + n + '.png') });

  const m = await page.evaluate(() => {
    const q = +new URLSearchParams(location.search).get('slide') - 1;
    const sec = [...document.querySelectorAll('section.slide')][q];
    const r = sec.getBoundingClientRect();
    const res = { slide: q + 1, w: Math.round(r.width), h: Math.round(r.height), minFont: 999, minFontText: '', overflow: [], navHits: [], notes: [] };
    const walk = (node) => {
      for (const c of node.children) {
        const cs = getComputedStyle(c);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        if (c.classList.contains('ascii-bg')) continue;
        const b = c.getBoundingClientRect();
        const hasText = [...c.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim());
        if (hasText) {
          const fs = parseFloat(cs.fontSize);
          if (fs < res.minFont) { res.minFont = Math.round(fs * 10) / 10; res.minFontText = c.textContent.trim().slice(0, 30); }
        }
        if (b.width > 0 && b.height > 0) {
          if (b.bottom > r.bottom + 1 || b.right > r.right + 1 || b.top < r.top - 1) {
            res.overflow.push({ tag: c.tagName, cls: c.className.toString().slice(0, 40), bottom: Math.round(b.bottom), right: Math.round(b.right) });
          }
          if (b.bottom > r.top + r.height * 0.955 && hasText) {
            res.navHits.push({ cls: c.className.toString().slice(0, 36), bottom: Math.round(b.bottom), text: c.textContent.trim().slice(0, 22) });
          }
        }
        walk(c);
      }
    };
    walk(sec);
    return res;
  });
  report.push(m);
}

console.log(JSON.stringify({ errs, report }, null, 1));
await browser.close();
