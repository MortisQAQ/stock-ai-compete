import { createRequire } from 'node:module';
const require = createRequire('D:/agents/skills/playwright-skill/node_modules/playwright-core/index.js');
const { chromium } = require('D:/agents/skills/playwright-skill/node_modules/playwright-core');
const path = require('node:path');
const root = 'D:/projects/playground/stock-ai-compete/final-report/slides-part2-swiss';
const fileUrl = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
const browser = await chromium.launch({
  executablePath: 'C:\\Users\\J\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
await page.route('**/*', (r) => (r.request().url().startsWith('file://') || r.request().url().startsWith('data:')) ? r.continue() : r.abort());

for (const n of [3, 6, 7]) {
  await page.goto(fileUrl + '?slide=' + n, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => {
    const q = +new URLSearchParams(location.search).get('slide') - 1;
    const sec = [...document.querySelectorAll('section.slide')][q];
    const card = sec.querySelector('.canvas-card');
    const cs = getComputedStyle(card);
    const out = { slide: q + 1, cardPadBottom: cs.paddingBottom, cardRect: card.getBoundingClientRect().toJSON(), items: [] };
    for (const sel of ['.ink-banner', '.mani-top', '.mani-left', '.mani-right', '.ev-foot', '.tl-wrap', '.four-cards', '.takeaway-list', '.q-list', '.duo-compare']) {
      const el = sec.querySelector(sel);
      if (!el) continue;
      const b = el.getBoundingClientRect();
      out.items.push({ sel, top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) });
    }
    const nav = document.querySelector('#nav');
    const dot = nav && nav.querySelector('.dot');
    out.nav = nav ? { rect: nav.getBoundingClientRect().toJSON(), dotBg: dot ? getComputedStyle(dot).backgroundColor : null } : null;
    const hint = document.querySelector('#hint');
    out.hint = hint ? hint.getBoundingClientRect().toJSON() : null;
    return out;
  });
  console.log(JSON.stringify(m));
}
await browser.close();
