# FONT PASS · 换字体方案与回归验证报告

日期：2026-11-06 · 工作目录：`slides-part1-swiss` · 产物：`index.html`（307,635 bytes）

## 1 · 改了哪些文件

| 文件 | 改动 | 说明 |
| --- | --- | --- |
| `_build.mjs` | 新增步骤 7/8/9 | 字体令牌替换（唯一权威定义）、去掉 `var(--sans),var(--sans-zh)` 重复尾巴、Google Fonts 改异步 |
| `_deck-extra.css` | 追加 FONT PASS 段 | 中文标题字距归零 + 字重阶梯上移 + 孤字修正；不含 font-family 声明 |
| `_slides.partial.html` | 8 处内联样式 | 内联样式无法被样式表覆盖，逐个改 letter-spacing / font-weight；封面 h1 加 `data-latin` |
| `index.html` | 重新生成 | `node _build.mjs`，连跑两次 SHA256 一致（幂等） |

## 2 · 字体栈（index.html :root 令牌区，全局唯一一份）

```css
--font-sans:  "Inter","Segoe UI","Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans SC",system-ui,sans-serif;
--font-zh:    "Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans SC",sans-serif;
--font-mono:  "JetBrains Mono","Cascadia Mono",Consolas,ui-monospace,SFMono-Regular,monospace;
--font-display: <同 --font-sans>
--sans: var(--font-sans); --sans-zh: var(--font-zh); --mono: var(--font-mono);
```

- `var(--sans),var(--sans-zh)` 出现 41 处 → 全部收敛为 `var(--sans)`（计算样式里不再有 `…, sans-serif, "Microsoft YaHei", …` 的死列表）。
- 页面内 `--font-*` 定义数 = 4（display/sans/zh/mono），旧 `'Noto Sans SC','PingFang SC'` 组合 = 0 处。

## 3 · Google Fonts 非阻塞

```html
<link rel="stylesheet" data-gz-fonts="…" href="https://fonts.googleapis.com/css2?…" media="print" onload="this.media='all'">
```

`preconnect` 两条保留；未加 `<noscript>`（雅黑 + Segoe UI 已覆盖中拉丁）。

## 4 · 最终生效值（getComputedStyle + CDP getPlatformFontsForNode 实测）

| 页 | 元素 | font-size | weight | letter-spacing | 实际平台字体 |
| --- | --- | --- | --- | --- | --- |
| 1 | 封面主标 openOutcry | 176px | 300 | -5.28px (-.03em) | Inter |
| 1 | 封面副标 | 36.8px | 400 | normal | Inter + Microsoft YaHei |
| 1 | 元信息 t-meta | 14px | 500 | 3.08px | JetBrains Mono |
| 2 | 中文标题块 | 54px | 400 | normal | Inter + Microsoft YaHei |
| 2 | KPI 2026 | 54.9px | 400 | -2.196px | Inter |
| 2 | KPI SkillHub | 39.6px | 400 | -1.782px | Inter |
| 2 | KPI 1 句指令 | 39.6px | 400 | normal | Inter + Microsoft YaHei |
| 3 | 大标题 注意力，已经先到了 | 83.2px | 300 | normal | **Microsoft YaHei Light** |
| 3 | 账本数字 118.2K | 99px | 300 | -3.96px | Inter |
| 3 | 账本标签 | 14px | 500 | 1.82px | JetBrains Mono |
| 3 | 账本正文 | 16px | 400 | normal | Inter + Microsoft YaHei |
| 4 | 对偶标题 | 57.6px | 400 | normal | Microsoft YaHei |
| 4 | 列表项 | 16px | 400 | normal | Microsoft YaHei |
| 5 | 断层标题 | 43.2px | 400 | normal | Microsoft YaHei |
| 5 | 力序号 01 | 54px | 400 | -2.16px | Inter |
| 5 | 卡片标题 | 27.45px | 400 | normal | Microsoft YaHei |
| 5 | 卡片正文 | 16px | 400 | normal | Inter + Microsoft YaHei |
| 6 | 收口标题 | 94.4px | 300 | normal | **Microsoft YaHei Light** + Microsoft YaHei（强调 span 400） |
| 6 | 结论序号 01 | 50.4px | 400 | -1.512px | Inter |
| 6 | 结论标题 | 25.92px | 400 | normal | Microsoft YaHei |
| 6 | 结论正文 | 16px | 400 | normal | Inter + Microsoft YaHei |

结论：300 → 微软雅黑 Light 面确实被选中；400 → 微软雅黑 Regular；拉丁字符走 Inter，汉字走雅黑。

## 5 · 六页像素回归（视口 1600×900，nav-safe 837px）

| 页 | 内容最低 bottom | >837px 元素 | 滚动溢出 | 孤字/孤行 |
| --- | --- | --- | --- | --- |
| 1 | 823 | 0 | 0 | 无 |
| 2 | 770 | 0 | 0 | 无 |
| 3 | 823 | 0 | 0 | 无 |
| 4 | 821 | 0 | 0 | 无 |
| 5 | 823 | 0 | 0 | 无 |
| 6 | 824 | 0 | 0 | 1 处（见下） |

改前对照：823 / 770 / 823 / 821 / 823 / 824 —— 六页最低点**逐页完全一致**。
逐元素几何 diff：只有 3 个块宽度变化（.lead 1273→1300、02 标题块 262→275、06 span 368→378），**无任何块高度/位置变化**，即断行行数零变化。

### 已知残留
- 06 页右侧第 1 条结论尾行「模型」。」（3 字形，64px/597px = 11%）。改前为「型」。」（2 字形）。已用 `text-wrap:pretty` 缓解，未彻底消除；彻底消除需改文案或加宽栏位，超出授权。
- 离线（阻断 fonts.googleapis.com / gstatic / unpkg）实测：布局仍不越界（770/797/821/794），拉丁回退 Segoe UI、等宽回退 Consolas；03 页第 4 条描述会多折一行、尾行「众。」，仅断网时出现。

## 6 · 校验器

```
node validate-presenter-mode.mjs index.html
→ Presenter validation: 6 slides, 6 notes, 2.4 planned minutes, 0 errors, 0 warnings.   (exit 0)

node validate-swiss-deck.mjs index.html
→ Swiss deck validation passed: 6 slide(s).   (exit 0, 0 error, 0 warning)
```

注：swiss 校验器自带的 Playwright 渲染测量默认会 skip（它 `resolve('playwright')`，本机只有 playwright-core 1.62.1，且默认找 chromium-1234 而实装是 1243）。用临时夹具 `C:\Users\J\AppData\Local\Temp\swiss-verify2` 桥接后，官方 M1/M2 渲染测量真实跑过，仍然 0 error / 0 warning。

## 7 · 复现命令

```powershell
node _build.mjs                     # 重建 index.html（幂等）
node _verify/measure.mjs font font  # 六页截图 + 越界/孤字/计算样式，产出 measure-font.json
node _verify/offline-check.mjs      # 断网降级检查
node _verify/_probe-final.mjs       # 计算样式 + 平台字体表
```
