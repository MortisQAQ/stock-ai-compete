#!/usr/bin/env node
/**
 * openOutcry 期末答辩完整版（瑞士风 · IKB · 21 页）
 * -----------------------------------------------
 * 把 _slides.partial.html / _notes.partial.js / _deck-extra.css
 * 注入 guizang-ppt-skill 的 assets/template-swiss.html，输出 index.html。
 *
 * 用法： node _build.mjs [out.html]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SKILL = process.env.GZ_SKILL || 'C:/Users/J/.agents/skills/guizang-ppt-skill';
const tplPath = path.join(SKILL, 'assets/template-swiss.html');
const motionPath = path.join(SKILL, 'assets/motion.min.js');

const CFG = {
  title: 'openOutcry · 可信任的投资 Agent 评测与迭代环境 · FYP 期末答辩 2026-12-07',
  sans: '"Inter","Segoe UI","Microsoft YaHei UI","Microsoft YaHei","Noto Sans SC","PingFang SC",system-ui,sans-serif',
  mono: '"JetBrains Mono","Cascadia Mono","Consolas","Microsoft YaHei UI","Microsoft YaHei",ui-monospace,monospace',
};

function must(cond, label) {
  if (!cond) {
    console.error('BUILD FAILED: ' + label);
    process.exit(1);
  }
}

const slides = readFileSync(path.join(root, '_slides.partial.html'), 'utf8').trim();
const notes = readFileSync(path.join(root, '_notes.partial.js'), 'utf8').trim();
const extraCss = readFileSync(path.join(root, '_deck-extra.css'), 'utf8');

let html = readFileSync(tplPath, 'utf8').replace(/\r\n/g, '\n');
const motionB64 = Buffer.from(readFileSync(motionPath, 'utf8'), 'utf8').toString('base64');

/* 1 · title */
const titleOld = '<title>[必填] 替换为 PPT 标题 · Deck Title</title>';
must(html.includes(titleOld), 'title placeholder');
html = html.replace(titleOld, '<title>' + CFG.title.replace(/&/g, '&amp;') + '</title>');

/* 2 · lucide 兜底 */
const lucideOld = '<script>lucide.createIcons();</script>';
must(html.includes(lucideOld), 'lucide bootstrap');
html = html.replace(lucideOld, '<script>if(window.lucide&&lucide.createIcons)lucide.createIcons();</script>');

/* 3 · slides */
const startMark = '<!-- SLIDES_HERE';
const endMark = '\n</div>\n\n<div id="nav"></div>';
const s = html.indexOf(startMark);
const e = html.indexOf(endMark, s);
must(s > 0 && e > s, 'slides region');
html = html.slice(0, s) + slides + '\n</div>\n\n<div id="nav"></div>' + html.slice(e + endMark.length);

/* 4 · SPEAKER_NOTES */
const nStart = html.indexOf('const SPEAKER_NOTES = [');
const nEnd = html.indexOf('window.__SPEAKER_NOTES__', nStart);
must(nStart > 0 && nEnd > nStart, 'SPEAKER_NOTES region');
html = html.slice(0, nStart) + notes + '\n' + html.slice(nEnd);

/* 5 · extra css */
const styleClose = '\n</style>\n</head>';
must(html.includes(styleClose), 'style close');
html = html.replace(styleClose, '\n' + extraCss + '\n</style>\n</head>');

/* 6 · 字体栈（中文走雅黑/Noto，拉丁走 Inter/Segoe） */
const fontRules = [
    [/--font-display:'Inter'[^;]*;/, '--font-display:' + CFG.sans + ';', 'font-display'],
    [/--font-sans:'Inter'[^;]*;/, '--font-sans:' + CFG.sans + ';', 'font-sans'],
    [/--font-mono:'JetBrains Mono'[^;]*;/, '--font-mono:' + CFG.mono + ';', 'font-mono'],
    [/--sans-zh:'Noto Sans SC'[^;]*;/, '--sans-zh:"Microsoft YaHei UI","Microsoft YaHei","Noto Sans SC",sans-serif;', 'sans-zh'],
];
for (const [re, rep, label] of fontRules) {
    if (re.test(html)) html = html.replace(re, rep);
    else console.warn('skip font rule: ' + label);
}

/* 7 · Motion One 内联为 data URI，断网也能播准入场动效 */
const oldImport = "motion = await import('./assets/motion.min.js');";
must(html.includes(oldImport), 'motion import');
html = html.replace(oldImport, "motion = await import('data:text/javascript;base64," + motionB64 + "');");

/* 8 · Google Fonts 非阻塞，离线时不卡首屏 */
const fontLinkRe = /<link rel="stylesheet" data-gz-fonts="([^"]*)" href="([^"]+)">/;
if (fontLinkRe.test(html)) {
    html = html.replace(fontLinkRe, (m, fams, href) =>
        '<link rel="stylesheet" data-gz-fonts="' + fams + '" href="' + href + '" media="print" onload="this.media=\'all\'">');
}

/* 9 · 演讲者预览：固定 1600x900 画布再整体缩放
       —— deck 里所有字号都有 14/16/18px 下限，若 iframe 只有 400px 宽，
          这些下限会让内容挤在一起。固定 1600x900 渲染再 scale 才和正式放映一致。 */
const BT = String.fromCharCode(96);
const frameSizeOld = '    frame.style.width=' + BT + '${width}px' + BT + ';frame.style.height=' + BT + '${height}px' + BT + ';';
const frameSizeNew = "    frame.style.width='1600px';frame.style.height='900px';frame.style.transform='translate('+((availableWidth-width)/2)+'px,'+((availableHeight-height)/2)+'px) scale('+(width/1600)+')';";
if (html.includes(frameSizeOld)) {
  html = html.replace(frameSizeOld, frameSizeNew);
} else {
  console.warn('skip: presenter frame sizing patch (template changed)');
}
const presenterCss = '\n#ppt-presenter .ppt-frame{position:absolute;top:0;left:0;width:1600px;height:900px;max-width:none;max-height:none;aspect-ratio:auto;transform-origin:top left}\n';
html = html.replace('\n</style>\n</head>', presenterCss + '\n</style>\n</head>');

const out = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'index.html');
writeFileSync(out, html, 'utf8');
/* 页码统计：先去掉注释，否则模板的「SLIDES 插入区」注释里的示例 <section> 会被误算；
   一、二幕的 <section> 带 data-act，class 属性也不是紧跟标签名，所以要按属性匹配。 */
const htmlNoComments = html.replace(/<!--[\s\S]*?-->/g, '');
const slideCount = (htmlNoComments.match(/<section\b[^>]*class="[^"]*\bslide\b/g) || []).length;
console.log('built · ' + slideCount + ' slides · ' + Math.round(Buffer.byteLength(html, 'utf8') / 1024) + ' KB');
console.log('  -> ' + out);
