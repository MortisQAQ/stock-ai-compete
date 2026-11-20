import { createRequire } from 'node:module';
const require = createRequire('D:/agents/skills/playwright-skill/node_modules/playwright-core/index.js');
const { chromium } = require('D:/agents/skills/playwright-skill/node_modules/playwright-core');
const path = require('node:path');
const root = 'D:/projects/playground/stock-ai-compete/final-report/slides-part2-swiss';
const fileUrl = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
const browser = await chromium.launch({ executablePath: 'C:\\Users\\J\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe', args: ['--allow-file-access-from-files'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.route('**/*', (r) => (r.request().url().startsWith('file://') || r.request().url().startsWith('data:')) ? r.continue() : r.abort());
for (const [n, name] of [[7, 'crop-7.png'], [2, 'crop-2.png']]) {
  await page.goto(fileUrl + '?slide=' + n, { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(root, '_verify', 'shots', name), clip: { x: 0, y: 700, width: 1600, height: 200 } });
  const m = await page.evaluate(() => {
    const q = +new URLSearchParams(location.search).get('slide') - 1;
    const sec = [...document.querySelectorAll('section.slide')][q];
    const half = [...sec.querySelectorAll('.split-half > .half')];
    const out = half.map(h => { const b = h.getBoundingClientRect(); return { l: Math.round(b.left), w: Math.round(b.width) }; });
    const meta = [...sec.querySelectorAll('.t-meta')].map(e => { const b = e.getBoundingClientRect(); return { txt: e.textContent.trim().slice(0, 14), l: Math.round(b.left), t: Math.round(b.top) }; });
    return { halves: out, metas: meta };
  });
  console.log(n, JSON.stringify(m));
}
await browser.close();
