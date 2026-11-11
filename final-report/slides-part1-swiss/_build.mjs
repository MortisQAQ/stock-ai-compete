import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const tplPath = 'C:/Users/J/.agents/skills/guizang-ppt-skill/assets/template-swiss.html';
const motionPath = 'C:/Users/J/.agents/skills/guizang-ppt-skill/assets/motion.min.js';
const outPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'index.html');

let html = readFileSync(tplPath, 'utf8').replace(/\r\n/g, '\n');
const slides = readFileSync(path.join(root, '_slides.partial.html'), 'utf8').trim();
const extraCss = readFileSync(path.join(root, '_deck-extra.css'), 'utf8');
const notes = readFileSync(path.join(root, '_notes.partial.js'), 'utf8').trim();
const motionB64 = Buffer.from(readFileSync(motionPath, 'utf8'), 'utf8').toString('base64');

function must(cond, label) {
  if (!cond) { console.error('FAILED: ' + label); process.exit(1); }
}

/* 1 · title */
const titleOld = '<title>[必填] 替换为 PPT 标题 · Deck Title</title>';
must(html.includes(titleOld), 'title placeholder found');
html = html.replace(titleOld, '<title>openOutcry · 让 Agent 试炼可见 · FYP 2026 Term 1 · Act 01</title>');

/* 2 · slides region */
const startMark = '<!-- SLIDES_HERE';
const endMark = '\n</div>\n\n<div id="nav"></div>';
const s = html.indexOf(startMark);
const e = html.indexOf(endMark, s);
must(s > 0 && e > s, 'slides region located');
html = html.slice(0, s) + slides + '\n</div>\n\n<div id="nav"></div>' + html.slice(e + endMark.length);

/* 3 · speaker notes */
const nStart = html.indexOf('const SPEAKER_NOTES = [');
const nEnd = html.indexOf('window.__SPEAKER_NOTES__', nStart);
must(nStart > 0 && nEnd > nStart, 'SPEAKER_NOTES located');
html = html.slice(0, nStart) + notes + '\n' + html.slice(nEnd);

/* 4 · additive CSS before </style> */
const styleClose = '\n</style>\n</head>';
must(html.includes(styleClose), 'style close located');
html = html.replace(styleClose, '\n' + extraCss + '\n</style>\n</head>');

/* 5 · S13 three-forces card selector includes .card-accent */
const selOld = "const cards = grid ? [...grid.querySelectorAll(':scope > div:nth-child(2) > .card-fill')] : [];";
const selNew = "const cards = grid ? [...grid.querySelectorAll(':scope > div:nth-child(2) > .card-fill, :scope > div:nth-child(2) > .card-accent')] : [];";
must(html.includes(selOld), 'three-forces card selector found');
html = html.replace(selOld, selNew);

/* 6 · inline Motion One as data: URL module so file:// double-click plays animations without CORS errors */
const oldImport = "motion = await import('./assets/motion.min.js');";
must(html.includes(oldImport), 'motion import found');
html = html.replace(oldImport, "motion = await import('data:text/javascript;base64," + motionB64 + "');");

/* 7 · 字体栈 · 拉丁优先 Inter / 中文优先微软雅黑（全局唯一权威定义）
   只改这一处令牌，页面里不再出现第二份 font-family 名单。 */
const FONT_SANS = '"Inter","Segoe UI","Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans SC",system-ui,sans-serif';
const FONT_ZH = '"Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans SC",sans-serif';
const FONT_MONO = '"JetBrains Mono","Cascadia Mono",Consolas,ui-monospace,SFMono-Regular,monospace';

const fontTokenRules = [
  [/--font-display:'Inter'[^;]*;/, '--font-display:' + FONT_SANS + ';', 'font-display token'],
  [/--font-sans:'Inter'[^;]*;/, '--font-sans:' + FONT_SANS + ';\n  --font-zh:' + FONT_ZH + ';', 'font-sans token'],
  [/--font-mono:'JetBrains Mono'[^;]*;/, '--font-mono:' + FONT_MONO + ';', 'font-mono token'],
  [/--sans-zh:'Noto Sans SC'[^;]*;/, '--sans-zh:var(--font-zh);', 'compat --sans-zh alias'],
];
for (const [re, rep, label] of fontTokenRules) {
  must(re.test(html), label + ' found');
  html = html.replace(re, rep);
}

/* 8 · 去掉 var(--sans),var(--sans-zh) 的重复尾巴
   --sans 已经把中文族排在 sans-serif 之前，再追加 --sans-zh 属于死代码，
   计算样式里会显示成 "…, sans-serif, \"Microsoft YaHei\", …" 的脏列表。 */
const dupFontRe = /var\(--sans\),var\(--sans-zh\)/g;
must(dupFontRe.test(html), 'duplicated var(--sans),var(--sans-zh) found');
html = html.replace(dupFontRe, 'var(--sans)');

/* 9 · Google Fonts 改为非阻塞：答辩现场可能没网，字体不能挡住首屏 */
const fontLinkRe = /<link rel="stylesheet" data-gz-fonts="([^"]*)" href="([^"]+)">/;
must(fontLinkRe.test(html), 'google fonts stylesheet link found');
html = html.replace(fontLinkRe, (m, fams, href) =>
  '<link rel="stylesheet" data-gz-fonts="' + fams + '" href="' + href + '" media="print" onload="this.media=\'all\'">');

writeFileSync(outPath, html, 'utf8');
console.log('built:', outPath, Buffer.byteLength(html, 'utf8'), 'bytes');
