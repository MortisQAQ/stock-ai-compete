#!/usr/bin/env node
/**
 * openOutcry · Part 1 + Part 2 合并版（瑞士风 12 页）构建脚本
 * ---------------------------------------------------------------
 * 从 ../slides-part1-swiss 与 ../slides-part2-swiss 读取最新源码，
 * 自动按 data-act="1" / data-act="2" 隔离样式，合并生成：
 *   - _slides.partial.html
 *   - _notes.partial.js
 *   - _deck-extra.css
 *   - index.html
 *
 * 用法：
 *   node _build.mjs            # → index.html
 *   node _build.mjs out.html   # → 指定输出
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const reportRoot = path.dirname(root);
const p1Dir = path.join(reportRoot, 'slides-part1-swiss');
const p2Dir = path.join(reportRoot, 'slides-part2-swiss');

const tplPath = 'C:/Users/J/.agents/skills/guizang-ppt-skill/assets/template-swiss.html';
const motionPath = 'C:/Users/J/.agents/skills/guizang-ppt-skill/assets/motion.min.js';

const CFG = {
  title: 'openOutcry · 任意投资 Agent 的评测与训练场 · 2026 秋 毕业设计（第一、二幕）',
  fonts: {
    sans: '"Inter","Segoe UI","Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans SC",system-ui,sans-serif',
    zh: '"Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans SC",sans-serif',
    mono: '"JetBrains Mono","Cascadia Mono","Consolas","Microsoft YaHei",ui-monospace,SFMono-Regular,monospace',
  },
};

function must(cond, label) {
  if (!cond) {
    console.error('FAILED: ' + label);
    process.exit(1);
  }
}

/* ---------- 1. 合并页面片段 ---------- */
const s1 = readFileSync(path.join(p1Dir, '_slides.partial.html'), 'utf8')
  .replace(/<section class="slide /g, '<section data-act="1" class="slide ');
const s2 = readFileSync(path.join(p2Dir, '_slides.partial.html'), 'utf8')
  .replace(/<section class="slide /g, '<section data-act="2" class="slide ');
const slides = s1.trim() + '\n\n' + s2.trim();
writeFileSync(path.join(root, '_slides.partial.html'), slides + '\n', 'utf8');

/* ---------- 2. 合并演讲备注 ---------- */
function loadNotes(file) {
  const code = readFileSync(file, 'utf8') + '\n;SPEAKER_NOTES;';
  return vm.runInNewContext(code);
}
const mergedNotes = [
  ...loadNotes(path.join(p1Dir, '_notes.partial.js')),
  ...loadNotes(path.join(p2Dir, '_notes.partial.js')),
];
const notes = 'const SPEAKER_NOTES = ' + JSON.stringify(mergedNotes, null, 2) + ';';
writeFileSync(path.join(root, '_notes.partial.js'), notes + '\n', 'utf8');

/* ---------- 3. 按 data-act 隔离并合并 CSS ---------- */
function scopeCss(css, act) {
  let cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.replace(/#ppt-presenter\s+\.ppt-frame\s*\{[^}]*\}/g, '');
  return cleaned.replace(/([^{}]+)\{([^}]*)\}/g, (_, sel, body) => {
    const selectors = sel.split(',').map((s) => s.trim()).filter(Boolean);
    const scoped = selectors.map((s) => {
      if (s.startsWith('html[lang="zh-CN"] ')) {
        return 'html[lang="zh-CN"] .slide[data-act="' + act + '"] ' + s.slice('html[lang="zh-CN"] '.length);
      }
      if (s.startsWith('.slide.dark ')) {
        return '.slide[data-act="' + act + '"].dark ' + s.slice('.slide.dark '.length);
      }
      if (s.startsWith('.slide ')) {
        return '.slide[data-act="' + act + '"] ' + s.slice('.slide '.length);
      }
      return '.slide[data-act="' + act + '"] ' + s;
    });
    return scoped.join(',\n') + ' {' + body + '}\n';
  });
}

const css1 = scopeCss(readFileSync(path.join(p1Dir, '_deck-extra.css'), 'utf8'), 1);
const css2 = scopeCss(readFileSync(path.join(p2Dir, '_deck-extra.css'), 'utf8'), 2);
const presenterCss = '\n#ppt-presenter .ppt-frame{position:absolute;top:0;left:0;width:1600px;height:900px;max-width:none;max-height:none;aspect-ratio:auto;transform-origin:top left}\n';
const extraCss = '/* PART 1 */\n' + css1 + '\n/* PART 2 */\n' + css2 + presenterCss;
writeFileSync(path.join(root, '_deck-extra.css'), extraCss, 'utf8');

/* ---------- 4. 注入模板并输出 ---------- */
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const outTargets = positional.length
  ? [path.resolve(positional[0])]
  : [path.join(root, 'index.html')];

let html = readFileSync(tplPath, 'utf8').replace(/\r\n/g, '\n');
const motionB64 = Buffer.from(readFileSync(motionPath, 'utf8'), 'utf8').toString('base64');

const titleOld = '<title>[必填] 替换为 PPT 标题 · Deck Title</title>';
must(html.includes(titleOld), 'title placeholder found');
html = html.replace(titleOld, '<title>' + CFG.title.replace(/&/g, '&amp;') + '</title>');

must(html.includes('<span>← → 翻页</span>'), 'Chinese hint arrow label present');
must(html.includes('<span class="ppt-key">P</span>演讲模式'), 'Chinese hint presenter label present');

const lucideOld = '<script>lucide.createIcons();</script>';
must(html.includes(lucideOld), 'lucide bootstrap found');
html = html.replace(lucideOld, '<script>if(window.lucide&&lucide.createIcons)lucide.createIcons();</script>');

const startMark = '<!-- SLIDES_HERE';
const endMark = '\n</div>\n\n<div id="nav"></div>';
const s = html.indexOf(startMark);
const e = html.indexOf(endMark, s);
must(s > 0 && e > s, 'slides region located');
html = html.slice(0, s) + slides + '\n</div>\n\n<div id="nav"></div>' + html.slice(e + endMark.length);

const nStart = html.indexOf('const SPEAKER_NOTES = [');
const nEnd = html.indexOf('window.__SPEAKER_NOTES__', nStart);
must(nStart > 0 && nEnd > nStart, 'SPEAKER_NOTES located');
html = html.slice(0, nStart) + notes + '\n' + html.slice(nEnd);

const styleClose = '\n</style>\n</head>';
must(html.includes(styleClose), 'style close located');
html = html.replace(styleClose, '\n' + extraCss + '\n</style>\n</head>');

const selOld = "const cards = grid ? [...grid.querySelectorAll(':scope > div:nth-child(2) > .card-fill')] : [];";
const selNew = "const cards = grid ? [...grid.querySelectorAll(':scope > div:nth-child(2) > .card-fill, :scope > div:nth-child(2) > .card-accent')] : [];";
if (html.includes(selOld)) {
  html = html.replace(selOld, selNew);
}

const BT = String.fromCharCode(96);
const frameSizeOld = '    frame.style.width=' + BT + '${width}px' + BT + ';frame.style.height=' + BT + '${height}px' + BT + ';';
const frameSizeNew = "    frame.style.width='1600px';frame.style.height='900px';frame.style.transform='translate('+((availableWidth-width)/2)+'px,'+((availableHeight-height)/2)+'px) scale('+(width/1600)+')';";
must(html.includes(frameSizeOld), 'presenter preview frame sizing line found');
html = html.replace(frameSizeOld, frameSizeNew);

const fontTokenRules = [
  [/--font-display:'Inter'[^;]*;/, '--font-display:' + CFG.fonts.sans + ';', 'font-display token'],
  [/--font-sans:'Inter'[^;]*;/, '--font-sans:' + CFG.fonts.sans + ';\n  --font-zh:' + CFG.fonts.zh + ';', 'font-sans token'],
  [/--font-mono:'JetBrains Mono'[^;]*;/, '--font-mono:' + CFG.fonts.mono + ';', 'font-mono token'],
  [/--sans-zh:'Noto Sans SC'[^;]*;/, '--sans-zh:var(--font-zh);', 'compat --sans-zh alias'],
];
for (const [re, rep, label] of fontTokenRules) {
  must(re.test(html), label + ' found');
  html = html.replace(re, rep);
}

const dupFontRe = /var\(--sans\),var\(--sans-zh\)/g;
must(dupFontRe.test(html), 'duplicated var(--sans),var(--sans-zh) found');
html = html.replace(dupFontRe, 'var(--sans)');

const fontLinkRe = /<link rel="stylesheet" data-gz-fonts="([^"]*)" href="([^"]+)">/;
must(fontLinkRe.test(html), 'google fonts stylesheet link found');
html = html.replace(fontLinkRe, (m, fams, href) =>
  '<link rel="stylesheet" data-gz-fonts="' + fams + '" href="' + href + '" media="print" onload="this.media=\'all\'">');

const oldImport = "motion = await import('./assets/motion.min.js');";
must(html.includes(oldImport), 'motion import found');
html = html.replace(oldImport, "motion = await import('data:text/javascript;base64," + motionB64 + "');");

for (const out of outTargets) writeFileSync(out, html, 'utf8');
console.log('built merged deck · ' + mergedNotes.length + ' slides · ' + Buffer.byteLength(html, 'utf8') + ' bytes');
for (const out of outTargets) console.log('  -> ' + out);
