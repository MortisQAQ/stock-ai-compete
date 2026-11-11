
import { createRequire } from 'node:module';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
const require = createRequire('D:/agents/skills/playwright-skill/node_modules/playwright-core/index.js');
const { chromium } = require('D:/agents/skills/playwright-skill/node_modules/playwright-core');
const root = process.cwd();
mkdirSync(path.join(root, '_verify', 'shots'), { recursive: true });
const fileUrl = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
const browser = await chromium.launch({
  executablePath: 'C:\\Users\\J\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
await ctx.route('**://fonts.googleapis.com/**', r => r.abort());
await ctx.route('**://fonts.gstatic.com/**', r => r.abort());
await ctx.route('**://unpkg.com/**', r => r.abort());
await ctx.route('**://cdn.jsdelivr.net/**', r => r.abort());
const page = await ctx.newPage();
const out = [];
for (let n = 1; n <= 6; n++) {
  await page.goto(fileUrl + '?slide=' + n, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  if (n === 3) await page.screenshot({ path: path.join(root, '_verify', 'shots', 'offline-3.png') });
  const m = await page.evaluate(() => {
    const sec = [...document.querySelectorAll('section.slide')][+new URLSearchParams(location.search).get('slide') - 1];
    const hasDirectText = (n) => [...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim());
    let max = 0, who = '';
    for (const n of [sec, ...sec.querySelectorAll('*')]) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
      const r = n.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) continue;
      if (n === sec || n.classList.contains('canvas-card')) continue;
      if (!hasDirectText(n) && !['IMG', 'SVG', 'CANVAS'].includes(n.tagName)) continue;
      if (r.bottom > max) { max = r.bottom; who = (n.className || n.tagName) + ''; }
    }
    return { max: Math.round(max), who: String(who).slice(0, 60) };
  });
  out.push({ slide: n, ...m });
}
console.log(JSON.stringify({ fontsLoaded: await page.evaluate(() => document.fonts.check('16px "Inter"')), out }, null, 1));
await browser.close();
