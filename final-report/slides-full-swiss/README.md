# openOutcry 期末答辩 · 完整网页 PPT（瑞士风 · IKB · 23 页）

> 单文件 `index.html`（410 KB，含内嵌演讲者模式运行时与 Motion One），图片在同目录 `images/`。
> 直接双击打开即可放映，不需要本地服务器；断网也能正常翻页与播放入场动效（字体走系统回退）。
>
> **第一、二幕（01–12 页）是原版内容的移植**：版式、观众文案、图片、章节衔接全部来自
> `slides-merged-swiss`（= `slides-part1-swiss` + `slides-part2-swiss`），不是为新版重写的稿子；
> 第三至第五幕（13–23 页）沿用本完整版原有内容。

## 怎么用

| 操作 | 键 |
|---|---|
| 翻页 | `←` / `→` / 滚轮 / 触屏 |
| 总览 | `ESC` |
| 演讲者模式（当前页 + 下一页 + 备注 + 计时） | `P` |
| 低功耗静态模式（停动画，投屏更稳） | `B` |
| 激光笔 / 圈选 / 清除 | `L` / `C` / `X` |

演讲备注按 `data-slide-id` 绑定，共 23 条；每页都带标题/目的/讲稿/转场。
计划时长合计 **16.1 分钟**（现场 20 分钟档，留约 3.9 分钟缓冲）。
页码统一写成 `NN / 23`，与页面顺序一一对齐。

## 版本变更（2026-11-19 · 一、二幕回滚为原版）

| 项 | 旧 | 新 |
|---|---|---|
| 总页数 | 21 | **23**（第一幕 5 页 + 第二幕 7 页复原本页数） |
| 第一幕（背景） | 5 页新写稿（`cover-can-we-trust` … `roadmap-five-parts`） | 原版 5 页（`cover-evaluation-ground` … `presentation-roadmap`） |
| 第二幕（需求） | 5 页新写稿（`is-one-right-call-enough` … `not-another-stock-picker`） | 原版 7 页（`act02-cover` … `handoff-to-part-3`），含「不是再造一个荐股的 AI」与「交给系统设计」两页收束 |
| 第三至第五幕 | 11 页 | 内容不动，仅页码 11–21 → 13–23 |
| 演讲备注 | 21 条（新版口播） | 23 条；一、二幕的 `talk` 逐字回到两份原稿（`第一部分-背景与潮流引入-设计与演讲稿.md` 5 页、`第二部分-用户痛点与核心需求-设计与演讲稿.md` 四段） |

备注与两份中文原稿的逐字对照（脚本已核对）：

**补充改版记录（2026-11-20）**：在恢复原版 23 页底座后，第 02 页（`commercial-wave`，方案 A）、第 03 页（`attention-first`，GitHub + YouTube + B 站三维实证）、第 04 页（`two-questions`，TradeRank 11 赛季牛熊实证 + 唯一核心顾虑 + 亮出 openOutcry AI 训练场）以及第 06 页（`act02-cover`，去花哨、改用 S09 极简暗底 + 低噪点阵章隔页）已结合真实调研与产品定位完成重构，第 05 页（`presentation-roadmap`）的导引文案及第 07、09 页演讲备注的过渡衔接句也已同步微调。

| 页 | 与原稿的关系 |
|---|---|
| 01–05 | `talk` 拼接后与第一幕原稿 5 段口播**完全一致**（只按分句断行） |
| 07–10 | `talk` 拼接后与第二幕原稿片段一、二、三、四（前半）**完全一致** |
| 11 | 前两句与片段四结尾**逐字一致**（断行处逗号改句号），末句「这三件事，就是第三部分要回答的问题。」是原 deck 自己的过渡句 |
| 06 / 12 | 原稿没有对应文字（幕封与小结页），沿用原 deck 自己的 3 句转场/小结话术 |

> 注意：本次是在原文件上就地替换，**旧 21 页版的第一、二幕（10 页新写稿）没有留副本**。
> 一、二幕的权威源仍是 `slides-merged-swiss`（未改动）；13–23 页未动，可照常回退。

移植方式：`_slides.partial.html` 里 01–12 页的 `<section>` 直接取自 `slides-merged-swiss`，
只做了两件机械改动 —— ① 页眉页码由「幕内 x / 05」「幕内 x / 07」改为统一的 `NN / 23`；
② 页眉右侧的分幕标题（如「02 / 23 · 商业浪潮」）原样保留。页面内文案、图片、类名一律未动，
`data-act="1"/"2"` 原样保留，供 `_deck-extra.css` 里的「一、二幕移植层」做作用域隔离。
`slides-merged-swiss` 目录本身未被修改。

**唯一例外：第 02 页（2026-11-19 二次改版，用户确认的「方案A」）**——观众文案按新方案重写，
版式从「左栏标题 + 右侧证据卡」改成「通栏标题带 + 左三例/右实拍」；演讲备注只改 `purpose`，
`talk` 仍逐字是原稿第一段口播，未改。详见下节。

### 第 02 页 · 方案A 改版说明

- 主标题：`金融 Agent 正在崛起，/ 一个新市场正在打开。`（两行，字号仍是 `min(5.2vw,9.2vh)`，未为了塞进版式下调）
- 副标题：`从金融研究、估值建模到投资决策辅助，AI Agent 正在进入真实的投资工作流。`
- 三例（名称 — 类别 / 一句描述）：`OpenAI — 专业投研 / AI 深入金融研究与财务建模。`、
  `Kimi — 智能分析 / 深度研究与估值能力加速普及。`、`同花顺问财 — 投资工具化 / 金融 Skills 开始走向普通投资者。`
  （第三例保留 accent 编号与 2px accent 底线，标记「这一条有本机实拍」）
- 页面结论（压在左栏底部）：`投资 AI 的商业化，正在从概念走向产品。`
- 版式：标题通栏（右侧 27vw 放副标题），主体左栏 3 例 + 底部结论、右栏右对齐的实拍卡；
  问财截图保持 4:3 原比例、未裁切未缩小（528×396，与改版前同尺寸），字号全部 ≥16px。
- 所有新样式都收在 `_deck-extra.css` 末尾的「02 页 · 方案A」块里，用
  `html[lang="zh-CN"] .slide[data-slide-id="commercial-wave"]` 双限定，其他页不受影响。

## 页面清单（data-layout 已登记）

| # | data-slide-id | 版式 | 主题 | 内容 | 来源 |
|---:|---|---|---|---|---|
| 01 | cover-evaluation-ground | SWISS-COVER-ASCII | accent | 封面：openOutcry 定位（ASCII 点阵底） | 原版 |
| 02 | commercial-wave | S22 | light | 商业浪潮：金融 Agent 正在崛起（三例产品化 + 问财 SkillHub 实拍卡） | 原版结构 · 本版文案（方案A） |
| 03 | attention-first | S16 | light | 开源与大众热度：GitHub 12.2万+ Stars + YouTube 448万 + B站 153.8万三维实证 | 原版结构 · 本版改版 |
| 04 | two-questions | S08 | dark | 热潮之下，投资者心中的顾虑：TradeRank 11 赛季牛熊实证 + 唯一核心顾虑 + 亮出 openOutcry AI 训练场 | 原版结构 · 本版改版 |
| 05 | presentation-roadmap | S11 | light | 答辩五个部分（横向时间线，紧扣面向散户的 AI 训练场主线） | 原版结构 · 文案微调 |
| 06 | act02-cover | S09 | dark | 第二幕章隔页：为什么用户不敢把钱交给 AI？（极简暗底 + 低噪点阵） | 原版结构 · 本版重构 |
| 07 | one-good-call | S03 | split | 一次对 ≠ 可信 + 三个要回答的问题（含 02-scenario 对照图） | 原版 |
| 08 | two-kinds-of-users | S08 | dark | 两类人，两个卡点（降门槛 / 提可信度） | 原版 |
| 09 | tools-but-no-chain | S16 | light | 工具不缺，过程是断的 + 21:9 断层图 | 原版 |
| 10 | four-requirements | S19 | light | 把困惑变成四项要求 + 验收闭环 | 原版 |
| 11 | not-another-stock-picker | S12 | light | 不是再造一个荐股的 AI + 16:10 对照图 | 原版 |
| 12 | handoff-to-part-3 | S10 | split | 小结与交棒：交给系统设计 → ACT 03 | 原版 |
| 13 | one-loop-onboarding-to-retest | S14 | light | 接入 → 配置 → 试炼 → 复盘 → 复测 | 本版 |
| 14 | three-workspaces | S15 | dark | 三个工作区（**真实界面截图 ×3**） | 本版 |
| 15 | agent-decides-platform-owns-facts | S17 | light | 目标架构（ACP / MCP / 模拟器权威） | 本版 |
| 16 | three-boundaries-of-trust | S02 | dark | 三道边界 + A 股规则行 | 本版 |
| 17 | term1-what-shipped | S22 | light | Term 1 交付（**真实工作台截图**） | 本版 |
| 18 | one-order-four-events | S11 | dark | 订单状态机：提案 / 批准 / 提交 / 撮合 + 拒绝分支 | 本版 |
| 19 | demo-walkthrough | S20 | accent | 3 分钟演示路线 | 本版 |
| 20 | verified-vs-unverified | S08 | light | 已验交互 / 未验收益 | 本版 |
| 21 | how-to-prove-it-next | S19 | light | 四层验证计划 | 本版 |
| 22 | testable-before-trustworthy | S10 | split | 结论：先可测试，再谈可信 | 本版 |
| 23 | closing-thank-you | SWISS-CLOSING-ASCII | accent | 致谢 + Q&A | 本版 |

23 页用到 15 个不同登记版式，没有连续 3 页同结构；accent / light / dark 交替。

## 图片与真实性边界

| 文件 | 来源 | 性质 |
|---|---|---|
| `02-iwencai-skillhub.png` | 同花顺问财 SkillHub 公开页面本机实拍（2026-10） | 真实产品页面截图，只说明「金融能力已商品化」，不代表本项目实现 |
| `03-github-tradingagents.png` | GitHub `TauricResearch/TradingAgents` 页面实拍（2026-11-12） | 真实页面截图，只证明项目与社区存在，不证明任何算法效果 |
| `03-youtube-ai-trading.png` | YouTube 搜索「I gave AI money to trade stocks」按观看量排序实拍（2026-11-20） | 真实页面截图，证明海外散户实测热度，不证明策略收益 |
| `03-bilibili-ai-stock.png` | B 站搜索「AI炒股」按最多播放排序实拍（2026-11-20） | 真实页面截图，证明国内社区实测热度，不证明策略收益 |
| `02-scenario-one-call.png` | 原版第二幕配图（瑞士风概念图） | **概念示意**：「单日推荐 ✓」vs「连续试炼 ?」，无真实数据 |
| `04-tool-gap-21x9.png` | 原版第二幕配图（瑞士风概念图） | **概念示意**：四类现有工具与「05 你的 Agent」验证链断裂 |
| `06-eval-vs-picker.png` | 原版第二幕配图（瑞士风概念图） | **概念示意**：「再造荐股 AI ✕」vs「持续评估能力」 |
| `12-studio-16x10.jpg` | `openoutcry-web` 运行截图（`#/studio`） | 真实界面，**界面内数据为虚构示例** |
| `12-arena-16x10.jpg` | `openoutcry-web` 运行截图（`#/training`） | 真实界面：事件流 / 待确认提案 / 账户 |
| `12-review-16x10.jpg` | `openoutcry-web` 运行截图（`#/review`） | 真实界面；页面自带「样本不足 · 不排名」标记 |
| `15-workbench-21x9.jpg` | `openoutcry-web` 运行截图（1764×756，原生 21:9） | 真实界面，演示数据 |
| `01-concept-market.webp` | GPT Image 2.5 Sunburst 生成 | **当前未被引用**：封面已改回原版 ASCII 封面，该概念主视觉留档备用 |

截图都拍在 `openoutcry-web/dist` 的构建产物上（Playwright + Chromium，2× 设备像素比），没有重绘界面、没有改数据。
采样日期、来源 URL、口径与边界都写在**演讲备注的 `fallback`** 里，主屏只放结论句 —— 不把来源事实搬上屏幕。

**没有做也不该做的事**：没有把「目标后端架构」说成已部署；没有把演示撮合里写死的成交价说成真实引擎；没有给出未经实测的测试通过数或收益数字。

## 设计与校验

- 风格：瑞士国际主义 B 模板 + 单一 IKB 强调色（`data-theme="ikb"`）；直角、无阴影、无渐变、无圆角。
- 字号下限：正文 ≥18px、说明 ≥16px、meta ≥14px；中文大标题按字数分档。
- 样式分层：本版自己的 `.fs-*` 类在前，**一、二幕的移植层追加在后**，每条选择器加了
  `html[lang="zh-CN"]` 前缀并以 `[data-act="1"/"2"]` 限定作用域 —— 这样原版页面的字号/间距
  不会被本版的通用 `.timeline-h` 等规则盖掉（实测：第 05 页时间线 yr/name/desc 仍按原版尺寸渲染），
  也不会反过来影响 13–23 页。
- 校验结果（`guizang-ppt-skill`，2026-11-19）：
  - `validate-presenter-mode.mjs --target-minutes 20` → **23 slides / 23 notes / 16.1 min，0 error 0 warning**
  - `validate-swiss-deck.mjs`（含 Playwright 真实渲染测量）→ **passed**，0 error；
    只剩 21 条 warning：4 条 nav-safe（第 07 / 11 / 12 / 22 页是分屏页，整屏色块铺满到页底，不是文字越界）
    + 17 条 M2 标题间距：16 条来自一、二幕原版的紧凑间距（如 `.q-note` 的 `margin-top:.5vh`），
    第 02 页 1 条是本版有意为之——通栏标题下方 22px 处就是三例列表的顶线，这条线与右侧
    截图上边线对齐，构成一条横向网格线；要放宽到 32px 需把截图缩到约 500px 宽，故保持对齐。
  - 23 页渲染截图（1600×900，Chromium）存在 `_verify/shots/`，命名 `NN-<data-slide-id>.png`，
    用来目视核对一、二幕是否与原版一致（第 05 页时间线字号、第 09 页 S16 卡片密度都与
    `slides-part2-swiss/_verify/shots/p2-4.png` 一致）。

## 已知待确认

- 第 01 页封面右下角仍是原版的 `2026.11`（第 06 页重构后已移除日期），而第 23 页写 `2026.12.07`（答辩当天）。
  按「原样保留原版」的要求第 01 页暂未改；若要统一，改 `_slides.partial.html` 第 38 行的 `<div class="t-meta" ...>2026.11</div>` 即可。

## 重新构建

```bash
node _build.mjs          # 由 _slides.partial.html + _notes.partial.js + _deck-extra.css 生成 index.html
```

构建脚本把 guizang-ppt-skill 的 `assets/template-swiss.html` 注入并完成：标题替换、slides 注入、
SPEAKER_NOTES 注入、deck 级 CSS 追加、字体栈替换（Windows 中文回退）、Motion One 内联为 data URI、
Google Fonts 非阻塞、演讲者预览固定 1600×900 再缩放（否则预览里 14/16/18px 的字号下限会把内容挤在一起）。

> 一、二幕的源头仍是 `slides-merged-swiss`（那边由 `_build.mjs` 从 part1/part2 合并生成）。
> 本 deck 不再引用它构建，只保留这份拷贝；改动只发生在本目录的 partial 文件里。
