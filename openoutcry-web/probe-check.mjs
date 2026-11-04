
import { chromium } from 'playwright-core';
const EXE = 'C:/Users/J/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
const b = await chromium.launch({ executablePath: EXE });
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:5183/?t=' + Date.now() + '#/studio', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const r = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const sheets = [...document.styleSheets].map(s => s.href || 'inline(' + (s.ownerNode?.tagName || '?') + ')');
  return { bone: cs.getPropertyValue('--bone').trim(), slate: cs.getPropertyValue('--slate').trim(), sheets };
});
console.log(JSON.stringify(r));
await b.close();
