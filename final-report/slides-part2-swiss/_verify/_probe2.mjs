import { createRequire } from 'node:module';
const require = createRequire('D:/agents/skills/playwright-skill/node_modules/playwright-core/index.js');
const { chromium } = require('D:/agents/skills/playwright-skill/node_modules/playwright-core');
const path = require('node:path');
const root = 'D:/projects/playground/stock-ai-compete/final-report/slides-part2-swiss';
const fileUrl = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
const browser = await chromium.launch({
  executablePath: 'C:\\Users\\J\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
await page.route('**/*', (r) => (r.request().url().startsWith('file://') || r.request().url().startsWith('data:')) ? r.continue() : r.abort());
for (const n of [2,3,4,5,7]) {
  await page.goto(fileUrl + '?slide=' + n, { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  const m = await page.evaluate(() => {
    const q = +new URLSearchParams(location.search).get('slide') - 1;
    const sec = [...document.querySelectorAll('section.slide')][q];
    const card = sec.querySelector('.canvas-card');
    const res = { s: q+1, padB: getComputedStyle(card).paddingBottom, cardH: Math.round(card.getBoundingClientRect().height), kids: [] };
    for (const c of card.children) {
      if (c.classList.contains('ascii-bg')) continue;
      const b = c.getBoundingClientRect();
      res.kids.push({ cls: (c.className||'').toString().slice(0,26) || c.tagName, top: Math.round(b.top), bottom: Math.round(b.bottom), flex: getComputedStyle(c).flex });
    }
    const foot = sec.querySelector('.ev-foot') || sec.querySelector('.ev-foot-l');
    if (foot) { const b = foot.getBoundingClientRect(); res.foot = [Math.round(b.top), Math.round(b.bottom)]; }
    return res;
  });
  console.log(JSON.stringify(m));
}
await browser.close();
