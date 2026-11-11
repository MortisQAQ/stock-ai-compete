
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire('D:/agents/skills/playwright-skill/node_modules/playwright-core/index.js');
const { chromium } = require('D:/agents/skills/playwright-skill/node_modules/playwright-core');

const root = process.cwd();
const outDir = path.join(root, '_verify', 'shots');
mkdirSync(outDir, { recursive: true });
const label = process.argv[2] || 'font';
const shotPrefix = process.argv[3] || label;
const fileUrl = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');

const browser = await chromium.launch({
  executablePath: 'C:\\Users\\J\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const failures = [];
const consoleErrors = [];
page.on('requestfailed', r => failures.push(r.url().slice(0, 100) + ' :: ' + (r.failure()?.errorText || '')));
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') consoleErrors.push('console.error: ' + m.text().slice(0, 160)); });

const report = [];
for (let n = 1; n <= 6; n++) {
  await page.goto(fileUrl + '?slide=' + n, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForFunction(() => document.fonts.check('16px "Inter"') && document.fonts.check('16px "JetBrains Mono"'), null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outDir, shotPrefix + '-' + n + '.png') });

  const data = await page.evaluate(() => {
    const cjk = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;
    const TRANSPARENT = /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\s*\)|transparent/;
    const sections = [...document.querySelectorAll('section.slide')];
    const sec = sections[+new URLSearchParams(location.search).get('slide') - 1] || sections[0];
    const sr = sec.getBoundingClientRect();
    const posterArea = sr.width * sr.height;
    const hasDirectText = (n) => [...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim());
    const colorVisible = (c) => c && !TRANSPARENT.test(c);
    const label = (n) => {
      const cls = n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : n.tagName.toLowerCase();
      const t = (n.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 44);
      return t ? cls + ' "' + t + '"' : cls;
    };
    const meaningful = [];
    for (const n of [sec, ...sec.querySelectorAll('*')]) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (parseFloat(cs.opacity) < 0.06) continue;
      if (cs.position === 'fixed') continue;
      const r = n.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) continue;
      if (n === sec || n.classList.contains('canvas-card')) continue;
      if (cs.position === 'absolute' && r.width * r.height >= posterArea * 0.82) continue;
      if (n.matches('canvas.ascii-bg, canvas.mag-bg, .grain, .dot-mat, .ring-mat, .cross-mat')) continue;
      const isText = hasDirectText(n);
      const isMedia = ['IMG', 'SVG', 'CANVAS'].includes(n.tagName);
      const isRule = n.tagName === 'HR' || (r.height <= 4 && (parseFloat(cs.borderTopWidth) >= 1 || parseFloat(cs.borderBottomWidth) >= 1 || colorVisible(cs.backgroundColor)));
      const hasFill = colorVisible(cs.backgroundColor) && r.width * r.height >= 1600;
      const hasBorder = (parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)) >= 1 && r.width * r.height >= 1600;
      if (!(isText || isMedia || isRule || hasFill || hasBorder)) continue;
      meaningful.push({
        tag: n.tagName.toLowerCase(),
        cls: n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : '',
        label: label(n),
        top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right),
        w: Math.round(r.width), h: Math.round(r.height),
        fs: Math.round(parseFloat(cs.fontSize) * 10) / 10,
        fw: cs.fontWeight, ls: cs.letterSpacing,
        ff: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
        hasCJK: cjk.test(n.textContent || ''),
        isText,
        text: (n.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 44),
      });
    }
    return { slideTop: Math.round(sr.top), slideH: Math.round(sr.height), slideW: Math.round(sr.width), scrollH: sec.scrollHeight, clientH: sec.clientHeight, meaningful };
  });

  const over = data.meaningful.filter(i => i.bottom > 837).sort((a, b) => b.bottom - a.bottom);
  const maxBottom = Math.max(0, ...data.meaningful.map(i => i.bottom));
  const lowest = data.meaningful.reduce((m, i) => (!m || i.bottom > m.bottom ? i : m), null);
  const textOnly = data.meaningful.filter(i => i.isText);
  const lowestText = textOnly.reduce((m, i) => (!m || i.bottom > m.bottom ? i : m), null);

  const orphans = await page.evaluate(() => {
    const cjk = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;
    const secs = [...document.querySelectorAll('section.slide')];
    const sec = secs[+new URLSearchParams(location.search).get('slide') - 1] || secs[0];
    const out = [];
    for (const el of sec.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (['CANVAS', 'SCRIPT', 'STYLE', 'SVG', 'IMG'].includes(el.tagName)) continue;
      // 只处理"叶子级"文本块：子元素全为行内元素，避免 <span>/<em> 被漏算成孤字
      const kids = [...el.children].filter(c => !['BR', 'WBR'].includes(c.tagName));
      if (kids.some(c => !getComputedStyle(c).display.startsWith('inline'))) continue;
      const tns = [];
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let t = tw.nextNode(); t; t = tw.nextNode()) if (t.textContent.trim()) tns.push(t);
      if (!tns.length) continue;
      if (!cjk.test(el.textContent)) continue;
      if (parseFloat(cs.fontSize) < 13) continue;
      const lines = new Map();
      for (const tn of tns) {
        const raw = tn.textContent;
        for (let i = 0; i < raw.length; i++) {
          const ch = raw[i];
          if (/\s/.test(ch)) continue;
          const rg = document.createRange();
          rg.setStart(tn, i); rg.setEnd(tn, i + 1);
          const rc = rg.getBoundingClientRect();
          if (!rc.width) continue;
          const key = Math.round(rc.top * 2) / 2;
          if (!lines.has(key)) lines.set(key, { chars: 0, text: '', width: 0, left: rc.left, right: rc.right });
          const L = lines.get(key);
          L.chars++; L.text += ch; L.width += rc.width;
          L.left = Math.min(L.left, rc.left); L.right = Math.max(L.right, rc.right);
        }
      }
      if (lines.size < 2) continue;
      const keys = [...lines.keys()].sort((a, b) => a - b);
      const last = lines.get(keys[keys.length - 1]);
      const lastCore = last.text.replace(/[，。、；：！？）」』】·…—,.!?;:)"'\]]/g, '');
      const boxW = el.getBoundingClientRect().width;
      const shortRatio = boxW > 0 ? last.width / boxW : 1;
      if (lastCore.length <= 2 || (shortRatio < 0.12 && lastCore.length <= 4)) {
        out.push({
          cls: el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : el.tagName.toLowerCase(),
          lines: keys.length, lastLine: last.text, lastCoreChars: lastCore.length,
          lastWidth: Math.round(last.width), lastLineRatio: Math.round(shortRatio * 100) / 100,
          text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
        });
      }
    }
    return out;
  });

  report.push({
    slide: n,
    maxBottom,
    lowest: lowest ? { label: lowest.label, bottom: lowest.bottom } : null,
    lowestText: lowestText ? { label: lowestText.label, bottom: lowestText.bottom } : null,
    overCount: over.length,
    over: over.slice(0, 10).map(o => ({ label: o.label, bottom: o.bottom, fs: o.fs })),
    orphans,
    slideTop: data.slideTop, slideH: data.slideH,
    scrollOverflow: data.scrollH - data.clientH,
    blocks: data.meaningful.filter(i => i.isText).map(i => ({ label: i.label, top: i.top, bottom: i.bottom, w: i.w, h: i.h, fs: i.fs, fw: i.fw, ls: i.ls, ff: i.ff })),
  });
}

const styleEvidence = await page.evaluate(() => {
  const pick = (sel, slide) => {
    const secs = [...document.querySelectorAll('section.slide')];
    const s = secs[slide - 1];
    const el = s && s.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { slide, sel, text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 24), fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing, fontSize: cs.fontSize, lineHeight: cs.lineHeight };
  };
  return [
    ['h1.h-hero', 1], ['.lead', 1], ['.t-meta', 1],
    ['[data-anim="title-block"] > div', 2], ['.image-hero-stats .kpi-hero', 2],
    ['h2', 3], ['.ledger-num', 3], ['.ledger-desc', 3], ['.ledger-label', 3],
    ['.col-ttl', 4], ['.col-list li', 4],
    ['.gap-title', 5], ['.force-num', 5], ['.force-card h4', 5], ['.force-card p', 5], ['.gap-note', 5],
    ['h2', 6], ['.tk-num', 6], ['.takeaway-list h4', 6], ['.takeaway-list p', 6],
  ].map(([s, i]) => pick(s, i)).filter(Boolean);
});

const fonts = await page.evaluate(() => ['Inter', 'Noto Sans SC', 'JetBrains Mono', 'Microsoft YaHei', 'Segoe UI']
  .map(f => ({ family: f, loaded: document.fonts.check('16px "' + f + '"') })));

await browser.close();
const out = { label, fileUrl, failures, consoleErrors, fonts, styleEvidence, report };
writeFileSync(path.join(root, '_verify', 'measure-' + label + '.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ label, failures, consoleErrors, fonts, slides: report.map(r => ({ slide: r.slide, maxBottom: r.maxBottom, lowest: r.lowest, lowestText: r.lowestText, overCount: r.overCount, over: r.over, orphans: r.orphans, scrollOverflow: r.scrollOverflow })) }, null, 1));
