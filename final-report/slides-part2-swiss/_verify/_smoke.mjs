import { createRequire } from 'node:module';
const require = createRequire('D:/agents/skills/playwright-skill/node_modules/playwright-core/index.js');
const { chromium } = require('D:/agents/skills/playwright-skill/node_modules/playwright-core');
const path = require('node:path');
const root = 'D:/projects/playground/stock-ai-compete/final-report/slides-part2-swiss';
const fileUrl = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
const browser = await chromium.launch({
  executablePath: 'C:\\Users\\J\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type()==='error' && !m.text().includes('ERR_FAILED')) errs.push('console: ' + m.text().slice(0,140)); });
await page.route('**/*', (r) => (r.request().url().startsWith('file://') || r.request().url().startsWith('data:')) ? r.continue() : r.abort());
await page.goto(fileUrl, { waitUntil: 'load' });
await page.waitForTimeout(2500);

const nav = await page.evaluate(() => ({
  slides: document.querySelectorAll('section.slide').length,
  ids: [...document.querySelectorAll('section.slide')].map(s => s.dataset.slideId),
  layouts: [...document.querySelectorAll('section.slide')].map(s => s.dataset.layout),
  notes: (window.__SPEAKER_NOTES__ || []).length,
  navDots: document.querySelectorAll('#nav .dot').length,
  motionReady: document.body.classList.contains('motion-ready'),
  lowPowerHint: !!document.querySelector('.ppt-low-power-label'),
}));

// 逐页翻页
for (let i = 0; i < 6; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(700); }
const lastIdx = await page.evaluate(() => window.__currentSlideIndex);

// 打开演讲者模式
await page.keyboard.press('p');
await page.waitForTimeout(1800);
const pres = await page.evaluate(() => {
  const el = document.querySelector('#ppt-presenter');
  const visible = el && getComputedStyle(el).display !== 'none';
  const t = document.querySelector('#ppt-presenter .ppt-notes-title');
  const body = document.querySelector('#ppt-presenter .ppt-notes-body, #ppt-presenter .ppt-purpose-copy');
  return {
    visible: !!visible,
    bodyClass: document.body.className,
    title: t ? t.textContent.trim().slice(0, 40) : null,
    hasPurpose: !!document.querySelector('#ppt-presenter .ppt-purpose-copy'),
    hasTimer: !!document.querySelector('#ppt-presenter .ppt-time-value'),
    hasGrid: !!document.querySelector('#ppt-presenter .ppt-overview-grid'),
    frames: document.querySelectorAll('#ppt-presenter .ppt-frame').length,
    text: (el ? el.innerText : '').slice(0, 260).replace(/\s+/g, ' '),
  };
});
await page.screenshot({ path: path.join(root, '_verify', 'shots', 'presenter.png') });

// 低功耗 B
await page.keyboard.press('p');
await page.waitForTimeout(900);
await page.keyboard.press('b');
await page.waitForTimeout(500);
const lowPower = await page.evaluate(() => document.body.classList.contains('low-power'));

console.log(JSON.stringify({ errs, nav, lastIdx, pres, lowPower }, null, 1));
await browser.close();
