#!/usr/bin/env node
/**
 * openOutcry · Part 1（瑞士风 5 页）构建脚本
 * ---------------------------------------------------------------
 * 用法：
 *   node _build.mjs                     # 中文主稿（默认）→ index.html + index-zh.html
 *   node _build.mjs --lang zh           # 同上
 *   node _build.mjs --lang en           # 英文旧稿 → index-en.html（本轮不重建）
 *   node _build.mjs out.html            # 位置参数仍然兼容：只写这一个文件
 *   node _build.mjs --lang en out.html  # 指定语言 + 指定输出
 *
 * 语言差异只在三处：页面片段、文档语言/标题/快捷键提示、字体令牌。
 * 演讲备注两种语言共用 _notes.partial.js（中文，按既定约定维持）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const tplPath = 'C:/Users/J/.agents/skills/guizang-ppt-skill/assets/template-swiss.html';
const motionPath = 'C:/Users/J/.agents/skills/guizang-ppt-skill/assets/motion.min.js';

/* ---------- 语言配置 ---------- */
const LANGS = {
  zh: {
    label: '中文主稿',
    slides: '_slides.partial.html',
    notes: '_notes.partial.js',
    title: 'openOutcry · 任意投资 Agent 的评测与训练场 · 2026 秋 毕业设计 · 第一幕',
    htmlLang: 'zh-CN',
    /* 模板自带的中文快捷键提示就是中文页要的文案，这里只做存在性断言 */
    hintSwaps: [],
    fonts: {
      sans: '"Inter","Segoe UI","Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans SC",system-ui,sans-serif',
      zh: '"Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans SC",sans-serif',
      mono: '"JetBrains Mono","Cascadia Mono","Consolas","Microsoft YaHei",ui-monospace,SFMono-Regular,monospace',
    },
    outputs: ['index.html', 'index-zh.html'],
  },
  en: {
    label: '英文旧稿',
    slides: '_slides.en.partial.html',
    notes: '_notes.partial.js',
    title: 'openOutcry — Evaluation & Training Ground for Investment Agents · FYP 2026 Term 1 · Act 01',
    htmlLang: 'en',
    /* 观众页英文；演讲者控件与备注保持中文 */
    hintSwaps: [
      ['aria-label="快捷控制"', 'aria-label="Shortcut controls"', 'hint toolbar aria-label'],
      ['<span>← → 翻页</span>', '<span>← → Navigate</span>', 'hint arrow label'],
      ['<span class="ppt-low-power-label">静态</span>', '<span class="ppt-low-power-label">Static</span>', 'hint low-power label'],
      ['<span class="ppt-key">ESC</span>总览', '<span class="ppt-key">ESC</span>Overview', 'hint overview label'],
      ['<span class="ppt-key">P</span>演讲模式', '<span class="ppt-key">P</span>Presenter', 'hint presenter label'],
      ["window.__lowPowerMode ? '动态' : '静态'", "window.__lowPowerMode ? 'Motion' : 'Static'", 'low-power toggle label'],
    ],
    /* 英文：拉丁 Inter → Segoe UI → Helvetica Neue 优先；
       后面保留中文族，是因为演讲者视图里的备注仍是中文。 */
    fonts: {
      sans: '"Inter","Segoe UI","Helvetica Neue",Arial,"Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif',
      zh: '"Inter","Segoe UI","Microsoft YaHei","PingFang SC",system-ui,sans-serif',
      mono: '"JetBrains Mono","Cascadia Mono",Consolas,ui-monospace,SFMono-Regular,monospace',
    },
    outputs: ['index-en.html'],
  },
};

/* ---------- 参数 ---------- */
const argv = process.argv.slice(2);
let lang = 'zh';
const positional = [];
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === '--lang') {
    lang = argv[i + 1];
    i += 1;
  } else if (a.startsWith('--lang=')) {
    lang = a.slice('--lang='.length);
  } else if (a === '--help' || a === '-h') {
    console.log('usage: node _build.mjs [--lang zh|en] [out.html]');
    process.exit(0);
  } else if (a.startsWith('--')) {
    console.error('FAILED: unknown flag ' + a);
    process.exit(1);
  } else {
    positional.push(a);
  }
}
const cfg = LANGS[lang];
if (!cfg) {
  console.error('FAILED: --lang must be zh or en, got ' + JSON.stringify(lang));
  process.exit(1);
}

/* ---------- 读入 ---------- */
let html = readFileSync(tplPath, 'utf8').replace(/\r\n/g, '\n');
const slides = readFileSync(path.join(root, cfg.slides), 'utf8').trim();
const extraCss = readFileSync(path.join(root, '_deck-extra.css'), 'utf8');
const notes = readFileSync(path.join(root, cfg.notes), 'utf8').trim();
const motionB64 = Buffer.from(readFileSync(motionPath, 'utf8'), 'utf8').toString('base64');

function must(cond, label) {
  if (!cond) { console.error('FAILED: ' + label); process.exit(1); }
}

/* 1 · 标题 */
const titleOld = '<title>[必填] 替换为 PPT 标题 · Deck Title</title>';
must(html.includes(titleOld), 'title placeholder found');
html = html.replace(titleOld, '<title>' + cfg.title.replace(/&/g, '&amp;') + '</title>');

/* 2 · 文档语言（模板默认 zh-CN；英文页才需要改写） */
if (cfg.htmlLang === 'zh-CN') {
  must(html.includes('<html lang="zh-CN"'), 'html lang attribute found (zh-CN default)');
} else {
  must(html.includes('<html lang="zh-CN"'), 'html lang attribute found');
  html = html.replace('<html lang="zh-CN"', '<html lang="' + cfg.htmlLang + '"');
}

/* 3 · 底部快捷键提示 */
if (cfg.hintSwaps.length === 0) {
  /* 中文页直接用模板自带文案：断言它确实是中文，避免模板升级后悄悄变成英文 */
  must(html.includes('<span>← → 翻页</span>'), 'Chinese hint arrow label present');
  must(html.includes('<span class="ppt-key">P</span>演讲模式'), 'Chinese hint presenter label present');
} else {
  for (const [from, to, label] of cfg.hintSwaps) {
    must(html.includes(from), label + ' found');
    html = html.replace(from, to);
  }
}

/* 3b · Lucide 走 CDN：断网时未加守卫的调用会抛页面错误。本 deck 不用图标，
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

/* 5 · 演讲备注（中文，两版共用） */
const nStart = html.indexOf('const SPEAKER_NOTES = [');
const nEnd = html.indexOf('window.__SPEAKER_NOTES__', nStart);
must(nStart > 0 && nEnd > nStart, 'SPEAKER_NOTES located');
html = html.slice(0, nStart) + notes + '\n' + html.slice(nEnd);

/* 6 · 追加 CSS（中文规则收在 html[lang="zh-CN"] 作用域内，英文页不受影响） */
const styleClose = '\n</style>\n</head>';
must(html.includes(styleClose), 'style close located');
html = html.replace(styleClose, '\n' + extraCss + '\n</style>\n</head>');

/* 7 · S13 三力卡选择器要包含 .card-accent */
const selOld = "const cards = grid ? [...grid.querySelectorAll(':scope > div:nth-child(2) > .card-fill')] : [];";
const selNew = "const cards = grid ? [...grid.querySelectorAll(':scope > div:nth-child(2) > .card-fill, :scope > div:nth-child(2) > .card-accent')] : [];";
must(html.includes(selOld), 'three-forces card selector found');
html = html.replace(selOld, selNew);

/* 8 · Motion One 以 data: URL 内联，双击 file:// 也能播动画 */
const oldImport = "motion = await import('./assets/motion.min.js');";
must(html.includes(oldImport), 'motion import found');
html = html.replace(oldImport, "motion = await import('data:text/javascript;base64," + motionB64 + "');");

/* 8b · 演讲者预览 iframe：内部固定 1600×900 逻辑视口，再由容器 transform 等比缩放。
        原实现把 iframe 直接设成展示尺寸（当前页 ~740×416、下一页 ~270×152），
        iframe 内部就按这个窄视口排版；deck 里 vw/vh 与 18px/14px 的 px 下限混排，
        小视口下 px 下限压过比例，标题与正文被重新排版（下一页出现竖排/只露左缘）。
        这里只改 fitFrame 里设置 iframe 尺寸的那一行，几何计算与 sizeInk 都保留：
        width/height 仍是 16:9 展示尺寸（用于缩放比与居中），iframe 盒子固定 1600×900。 */
const BT = String.fromCharCode(96);
const frameSizeOld = '    frame.style.width=' + BT + '${width}px' + BT + ';frame.style.height=' + BT + '${height}px' + BT + ';';
const frameSizeNew = "    frame.style.width='1600px';frame.style.height='900px';frame.style.transform='translate('+((availableWidth-width)/2)+'px,'+((availableHeight-height)/2)+'px) scale('+(width/1600)+')';";
must(html.includes(frameSizeOld), 'presenter preview frame sizing line found');
html = html.replace(frameSizeOld, frameSizeNew);

/* 9 · 字体栈：全局唯一权威定义（只改这里，页面与 CSS 不出现第二份 font-family 名单）
       中文页：拉丁 Inter → Segoe UI，中文 Microsoft YaHei 优先；英文页：Inter / Segoe UI 优先。 */
const fontTokenRules = [
  [/--font-display:'Inter'[^;]*;/, '--font-display:' + cfg.fonts.sans + ';', 'font-display token'],
  [/--font-sans:'Inter'[^;]*;/, '--font-sans:' + cfg.fonts.sans + ';\n  --font-zh:' + cfg.fonts.zh + ';', 'font-sans token'],
  [/--font-mono:'JetBrains Mono'[^;]*;/, '--font-mono:' + cfg.fonts.mono + ';', 'font-mono token'],
  [/--sans-zh:'Noto Sans SC'[^;]*;/, '--sans-zh:var(--font-zh);', 'compat --sans-zh alias'],
];
for (const [re, rep, label] of fontTokenRules) {
  must(re.test(html), label + ' found');
  html = html.replace(re, rep);
}

/* 10 · 去掉 var(--sans),var(--sans-zh) 的重复尾巴：--sans 已含中文族，
        再追加 --sans-zh 是死代码，计算样式里会显示成脏列表。 */
const dupFontRe = /var\(--sans\),var\(--sans-zh\)/g;
must(dupFontRe.test(html), 'duplicated var(--sans),var(--sans-zh) found');
html = html.replace(dupFontRe, 'var(--sans)');

/* 11 · Google Fonts 非阻塞：答辩现场可能没网，字体不能挡住首屏 */
const fontLinkRe = /<link rel="stylesheet" data-gz-fonts="([^"]*)" href="([^"]+)">/;
must(fontLinkRe.test(html), 'google fonts stylesheet link found');
html = html.replace(fontLinkRe, (m, fams, href) =>
  '<link rel="stylesheet" data-gz-fonts="' + fams + '" href="' + href + '" media="print" onload="this.media=\'all\'">');

/* 12 · 写出 */
const targets = positional.length
  ? [path.resolve(positional[0])]
  : cfg.outputs.map((f) => path.join(root, f));
for (const out of targets) writeFileSync(out, html, 'utf8');
console.log('built [' + lang + ' · ' + cfg.label + '] ' + Buffer.byteLength(html, 'utf8') + ' bytes');
for (const out of targets) console.log('  -> ' + out);