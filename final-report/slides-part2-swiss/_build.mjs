#!/usr/bin/env node
/**
 * openOutcry · Part 2（瑞士风 7 页）构建脚本
 * ---------------------------------------------------------------
 * 用法：
 *   node _build.mjs            # → index.html
 *   node _build.mjs out.html   # 只写指定文件
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const tplPath = 'C:/Users/J/.agents/skills/guizang-ppt-skill/assets/template-swiss.html';
const motionPath = 'C:/Users/J/.agents/skills/guizang-ppt-skill/assets/motion.min.js';

const CFG = {
  title: 'openOutcry · 用户痛点与核心需求 · 2026 秋 毕业设计 · 第二幕',
  slides: '_slides.partial.html',
  notes: '_notes.partial.js',
  css: '_deck-extra.css',
  fonts: {
    sans: '"Inter","Segoe UI","Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans SC",system-ui,sans-serif',
    zh: '"Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans SC",sans-serif',
    mono: '"JetBrains Mono","Cascadia Mono","Consolas","Microsoft YaHei",ui-monospace,SFMono-Regular,monospace',
  },
};

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const outTargets = positional.length
  ? [path.resolve(positional[0])]
  : [path.join(root, 'index.html')];

let html = readFileSync(tplPath, 'utf8').replace(/\r\n/g, '\n');
const slides = readFileSync(path.join(root, CFG.slides), 'utf8').trim();
const extraCss = readFileSync(path.join(root, CFG.css), 'utf8');
const notes = readFileSync(path.join(root, CFG.notes), 'utf8').trim();
const motionB64 = Buffer.from(readFileSync(motionPath, 'utf8'), 'utf8').toString('base64');

function must(cond, label) {
  if (!cond) { console.error('FAILED: ' + label); process.exit(1); }
}

/* 1 · 标题 */
const titleOld = '<title>[必填] 替换为 PPT 标题 · Deck Title</title>';
must(html.includes(titleOld), 'title placeholder found');
html = html.replace(titleOld, '<title>' + CFG.title.replace(/&/g, '&amp;') + '</title>');

/* 2 · 中文页直接用模板自带快捷键文案，断言它确实是中文 */
must(html.includes('<span>← → 翻页</span>'), 'Chinese hint arrow label present');
must(html.includes('<span class="ppt-key">P</span>演讲模式'), 'Chinese hint presenter label present');

/* 3 · Lucide 走 CDN：断网时未加守卫的调用会抛页面错误。本 deck 不用图标，
       保留运行时但把调用改成存在性守卫。 */
const lucideOld = '<script>lucide.createIcons();</script>';
must(html.includes(lucideOld), 'lucide bootstrap found');
html = html.replace(lucideOld, '<script>if(window.lucide&&lucide.createIcons)lucide.createIcons();</script>');

/* 4 · 页面区 */
const startMark = '<!-- SLIDES_HERE';
const endMark = '\n</div>\n\n<div id="nav"></div>';
const s = html.indexOf(startMark);
const e = html.indexOf(endMark, s);
must(s > 0 && e > s, 'slides region located');
html = html.slice(0, s) + slides + '\n</div>\n\n<div id="nav"></div>' + html.slice(e + endMark.length);

/* 5 · 演讲备注 */
const nStart = html.indexOf('const SPEAKER_NOTES = [');
const nEnd = html.indexOf('window.__SPEAKER_NOTES__', nStart);
must(nStart > 0 && nEnd > nStart, 'SPEAKER_NOTES located');
html = html.slice(0, nStart) + notes + '\n' + html.slice(nEnd);

/* 6 · 追加 CSS */
const styleClose = '\n</style>\n</head>';
must(html.includes(styleClose), 'style close located');
html = html.replace(styleClose, '\n' + extraCss + '\n</style>\n</head>');

/* 7 · 演讲者预览 iframe：内部固定 1600×900 逻辑视口，再由容器 transform 等比缩放。 */
const BT = String.fromCharCode(96);
const frameSizeOld = '    frame.style.width=' + BT + '${width}px' + BT + ';frame.style.height=' + BT + '${height}px' + BT + ';';
const frameSizeNew = "    frame.style.width='1600px';frame.style.height='900px';frame.style.transform='translate('+((availableWidth-width)/2)+'px,'+((availableHeight-height)/2)+'px) scale('+(width/1600)+')';";
must(html.includes(frameSizeOld), 'presenter preview frame sizing line found');
html = html.replace(frameSizeOld, frameSizeNew);

/* 8 · 字体栈：全局唯一权威定义 */
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

/* 9 · 去掉 var(--sans),var(--sans-zh) 的重复尾巴 */
const dupFontRe = /var\(--sans\),var\(--sans-zh\)/g;
must(dupFontRe.test(html), 'duplicated var(--sans),var(--sans-zh) found');
html = html.replace(dupFontRe, 'var(--sans)');

/* 10 · Google Fonts 非阻塞：答辩现场可能没网，字体不能挡住首屏 */
const fontLinkRe = /<link rel="stylesheet" data-gz-fonts="([^"]*)" href="([^"]+)">/;
must(fontLinkRe.test(html), 'google fonts stylesheet link found');
html = html.replace(fontLinkRe, (m, fams, href) =>
  '<link rel="stylesheet" data-gz-fonts="' + fams + '" href="' + href + '" media="print" onload="this.media=\'all\'">');

/* 11 · Motion One 以 data: URL 内联，双击 file:// 也能播动画 */
const oldImport = "motion = await import('./assets/motion.min.js');";
must(html.includes(oldImport), 'motion import found');
html = html.replace(oldImport, "motion = await import('data:text/javascript;base64," + motionB64 + "');");

/* 12 · 写出 */
for (const out of outTargets) writeFileSync(out, html, 'utf8');
console.log('built · ' + Buffer.byteLength(html, 'utf8') + ' bytes');
for (const out of outTargets) console.log('  -> ' + out);
