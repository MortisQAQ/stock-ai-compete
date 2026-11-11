
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire('D:/agents/skills/playwright-skill/node_modules/playwright-core/index.js');
const { chromium } = require('D:/agents/skills/playwright-skill/node_modules/playwright-core');
const root = process.cwd();
const fileUrl = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
const browser = await chromium.launch({
  executablePath: 'C:\\Users\\J\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('DOM.enable');
await cdp.send('CSS.enable');

async function open(slide) {
  await page.goto(fileUrl + '?slide=' + slide, { waitUntil: 'load' });
  await page.waitForFunction(() => document.fonts.check('16px "Inter"'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
}
async function fontsFor(selector, slideIdx) {
  const { root: doc } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: doc.nodeId, selector: 'section.slide' });
  const { nodeIds: hits } = await cdp.send('DOM.querySelectorAll', { nodeId: nodeIds[slideIdx], selector });
  if (!hits.length) return null;
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: hits[0] });
  const info = await page.evaluate(([s, i]) => {
    const el = document.querySelectorAll('section.slide')[i].querySelector(s);
    const cs = getComputedStyle(el);
    return { text: el.textContent.trim().slice(0, 18), fw: cs.fontWeight, fs: cs.fontSize, ff: cs.fontFamily.split(',')[0], ls: cs.letterSpacing };
  }, [selector, slideIdx]);
  return { sel: selector, ...info, platformFonts: fonts.map(f => f.familyName + ' [' + f.glyphCount + (f.isCustomFont ? ' webfont' : ' system') + ']') };
}

const out = [];
await open(3);
out.push(await fontsFor('h2', 2), await fontsFor('.ledger-desc', 2), await fontsFor('.ledger-num', 2), await fontsFor('.ledger-label', 2));
await open(1);
out.push(await fontsFor('h1.h-hero', 0), await fontsFor('.lead', 0));
await open(5);
out.push(await fontsFor('.gap-title', 4), await fontsFor('.force-card h4', 4), await fontsFor('.force-card p', 4), await fontsFor('.force-num', 4));
await open(4);
out.push(await fontsFor('.col-ttl', 3));
await open(6);
out.push(await fontsFor('h2', 5), await fontsFor('.takeaway-list h4', 5), await fontsFor('.takeaway-list p', 5));
console.log(JSON.stringify(out.filter(Boolean), null, 1));

const localFaces = await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('2d');
  const sample = '注意力，已经先到了';
  const w = (font) => { c.font = font; return Math.round(c.measureText(sample).width * 100) / 100; };
  return {
    'YaHei@400': w('400 80px "Microsoft YaHei"'),
    'YaHei@300': w('300 80px "Microsoft YaHei"'),
    'YaHei@200': w('200 80px "Microsoft YaHei"'),
    'YaHei@700': w('700 80px "Microsoft YaHei"'),
    'YaHeiLightExplicit@400': w('400 80px "Microsoft YaHei Light"'),
    'NotoSansSC@300': w('300 80px "Noto Sans SC"'),
    'NotoSansSC@400': w('400 80px "Noto Sans SC"'),
  };
});
console.log(JSON.stringify(localFaces, null, 1));
await browser.close();
