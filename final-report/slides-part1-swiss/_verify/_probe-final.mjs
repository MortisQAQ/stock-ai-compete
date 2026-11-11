
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
const targets = [
  [1, 'h1.h-hero', '封面主标'],
  [1, '.lead', '封面副标'],
  [1, '.t-meta', '元信息'],
  [2, '[data-anim="title-block"] > div', '02 中文标题'],
  [2, '.image-hero-stats > div:nth-child(1) .kpi-hero', '02 KPI 2026'],
  [2, '.image-hero-stats > div:nth-child(2) .kpi-hero', '02 KPI SkillHub'],
  [2, '.image-hero-stats > div:nth-child(3) .kpi-hero', '02 KPI 1 句指令'],
  [3, 'h2', '03 大标题'],
  [3, '.ledger-num', '03 账本数字'],
  [3, '.ledger-label', '03 账本标签'],
  [3, '.ledger-desc', '03 账本正文'],
  [4, '.col-ttl', '04 对偶标题'],
  [4, '.col-list li', '04 列表项'],
  [5, '.gap-title', '05 断层标题'],
  [5, '.force-num', '05 力序号'],
  [5, '.force-card h4', '05 卡片标题'],
  [5, '.force-card p', '05 卡片正文'],
  [6, 'h2', '06 收口标题'],
  [6, '.takeaway-list .tk-num', '06 结论序号'],
  [6, '.takeaway-list h4', '06 结论标题'],
  [6, '.takeaway-list p', '06 结论正文'],
];
const rows = [];
for (const [slide, sel, name] of targets) {
  await page.goto(fileUrl + '?slide=' + slide, { waitUntil: 'load' });
  await page.waitForFunction(() => document.fonts.check('16px "Inter"'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  const { root: doc } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: doc.nodeId, selector: 'section.slide' });
  const { nodeIds: hits } = await cdp.send('DOM.querySelectorAll', { nodeId: nodeIds[slide - 1], selector: sel });
  const { fonts } = hits.length ? await cdp.send('CSS.getPlatformFontsForNode', { nodeId: hits[0] }) : { fonts: [] };
  const info = await page.evaluate(([s, i]) => {
    const el = document.querySelectorAll('section.slide')[i].querySelector(s);
    const cs = getComputedStyle(el);
    return { fw: cs.fontWeight, fs: cs.fontSize, ls: cs.letterSpacing, ff: cs.fontFamily };
  }, [sel, slide - 1]);
  rows.push({
    '页': slide, '元素': name, 'font-size': info.fs, 'font-weight': info.fw, 'letter-spacing': info.ls,
    'font-family[0]': info.ff.split(',')[0].replace(/"/g, ''),
    '实际平台字体': fonts.map(f => f.familyName).join(' + '),
  });
}
console.log(JSON.stringify(rows, null, 0));
await browser.close();
