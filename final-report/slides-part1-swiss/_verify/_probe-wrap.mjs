
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire('D:/agents/skills/playwright-skill/node_modules/playwright-core/index.js');
const { chromium } = require('D:/agents/skills/playwright-skill/node_modules/playwright-core');
const root = process.cwd();
const browser = await chromium.launch({
  executablePath: 'C:\\Users\\J\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/') + '?slide=6';
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => document.fonts.check('16px "Inter"'), null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);

const probe = await page.evaluate(() => {
  const secs = [...document.querySelectorAll('section.slide')];
  const sec = secs[5];
  const p = sec.querySelector('.takeaway-list p');
  const lineInfo = (el) => {
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const map = new Map();
    for (let t = tw.nextNode(); t; t = tw.nextNode()) {
      const raw = t.textContent;
      for (let i = 0; i < raw.length; i++) {
        if (/\s/.test(raw[i])) continue;
        const r = document.createRange();
        r.setStart(t, i); r.setEnd(t, i + 1);
        const rc = r.getBoundingClientRect();
        if (!rc.width) continue;
        const k = Math.round(rc.top);
        map.set(k, (map.get(k) || '') + raw[i]);
      }
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  };
  const before = lineInfo(p);
  const out = { before, box: Math.round(p.getBoundingClientRect().width) };
  for (const mode of ['pretty', 'balance']) {
    p.style.textWrap = mode;
    out[mode] = lineInfo(p);
    p.style.textWrap = '';
  }
  // 也看看整栏其它段落
  out.allBefore = [...sec.querySelectorAll('.takeaway-list p')].map(x => lineInfo(x));
  return out;
});
console.log(JSON.stringify(probe, null, 1));
await browser.close();
