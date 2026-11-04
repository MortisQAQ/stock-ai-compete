# openOutcry Web · 交互原型 v2

openOutcry 是面向 A 股的 LLM 交易 Agent 评测与训练场。本仓库是它的**交互原型前端**：
用 React + Vite + React Router 把早期单文件 HTML 原型拆成可维护的模块，便于继续做交互优化。

> 所有数字、公司名与事件均为虚构演示数据，不代表真实行情或绩效。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5183
npm run build      # 产出 dist/
npm run preview    # 预览构建产物
npm run typecheck  # 只做类型检查
npm run check:type # 排版硬约束：全站最小字号 ≥13px、禁止写死 px（需先 npm run dev）
npm run audit:ui   # 组件层回归：对比度 / 点按尺寸 / 溢出 / 焦点契约
```

构建用 `base: './'` + `HashRouter`，因此 `dist/` 可以直接丢到 GitHub Pages 的子路径，
不需要任何 404 重写规则。

## 目录结构

```
src/
  main.tsx                 应用入口
  App.tsx                  路由表（6 个页面）+ Provider 装配
  nav.ts                   导航与页面标题（单一来源）
  types.ts                 领域类型：运行状态、事件、提案、持仓、成交
  data/                    演示数据（agents / market / run / protocol）
  lib/                     纯函数：format 格式化、chart 坐标与路径、exportRun
  store/
    RunProvider.tsx        运行状态机（useReducer）+ 动作 + toast
    DialogProvider.tsx     全站弹窗路由
    derive.ts              派生选择器：合计、状态文案、是否可审批
  components/
    chrome/                Tape / Masthead / SideNav / MobileNav / AppShell
    ui/                    shadcn 源码组件（Button / Card / Badge / Tabs /
                           Dialog / Modal / Input / Textarea / Select / Label）
                           + 原有 Stamp / Toasts
    charts/                EquityChart / DrawdownChart / ToolUsageChart（手写 SVG）
    ledger/                DecisionLedger（筛选 + 自动跟随 + 跳转最新）
    proposal/              ProposalTicket（数量步进 + 批准 / 改单 / 拒绝）
    run/                   StatBand / AccountLedger / HoldingsList / DetailTabs
                           ResearchBudget / TrustMarkers / Composer
    dialogs/               7 个弹窗：快照 / 回放 / 详情 / 改单 / 中止 / 自主运行 / Agent 配置
  routes/                  6 个页面
  styles/                  tokens · base · chrome · ui · studio · training · review · misc
                           index.css 负责 CSS 分层与 shadcn 语义变量
```

### 状态与交互的边界

- **运行状态**只在 `RunProvider` 里改，页面不直接 setState 业务数据。
- **弹窗**不挂在页面里，统一由 `DialogProvider` 路由，任何组件都能 `open({ kind })`。
- **派生数据**（合计、状态文案、能否审批）集中在 `store/derive.ts`，避免各页面重复判断。

## 已实现的交互

| 场景 | 行为 |
| --- | --- |
| 台账 | 类型筛选（全部/思考/工具/订单/人工）+ 计数；在底部时自动跟随新事件，滚上去后出现「N 条新事件↓」 |
| 审批 | 数量步进 → 批准；精确改单弹窗；拒绝；提交后出现「演示开盘撮合」 |
| 输入 | `⌘/Ctrl + ↵` 发送；`/goal` 进入自主推进；运行时显示字数 |
| 弹窗 | ESC / 点遮罩关闭，焦点陷阱与焦点归还，滚动锁定 |
| 键盘 | 页签支持 ← → Home End；`:focus-visible` 统一描边；`Tab` 首项为「跳到主内容」 |
| 反馈 | Toast 队列（成功/提示/警告），新事件行高亮 1.4s |
| 无障碍 | `role="log"` + `aria-live`、`aria-pressed`、`aria-selected`、`prefers-reduced-motion` |

## 规范文档

- **排版与响应式**：[docs/design-typography.md](./docs/design-typography.md) —— 全局字号硬约束、最小字号表、流体标尺、密度预算、反模式清单、验收标准。
- **组件层**：[docs/design-components.md](./docs/design-components.md) —— shadcn 落地方式、CSS 分层规则、组件变体表、焦点与动效契约。
- 验收脚本：`npm run check:type`（排版硬约束）、`npm run audit:ui`（组件层），截图落在 `docs/shots/`。

### 全局字号硬约束

**任何可见文字的计算字号不得低于 13px；正文 ≥17px；说明 ≥15px。**
TSX 里禁止写 `text-[12px]` 这类硬编码 px，只用 `text-micro / note / data / body / row / h2 / kpi / h1 / display`
九个工具类（映射见 [design-typography.md](./docs/design-typography.md) 第 2 节）。
`npm run check:type` 会静态扫描写死 px + 逐路由逐文本节点断言下限，出现 1 处违例即失败。

## 设计语言

「纸质大厅」：骨白纸面 + 墨绿黑 + 朱砂红 + 黄铜微标签；票据卡用硬投影与 1px 墨线，
状态用旋转印章，数字一律进深色仪器带（`#0E1613`）+ 等宽 tabular-nums。
A 股口径为**红涨绿跌**（`#C2352A` / `#1E7A4B`）。

## 组件层

基础组件（按钮、卡片、页签、弹窗、表单控件）用 [shadcn/ui](https://ui.shadcn.com) 的源码：
`npx shadcn@latest add <组件>` 把文件拉进 `src/components/ui/`，再按上面的语言改写——
圆角收到 2–6px、阴影换成硬投影、字改成等宽大写小字、配色映射到自家 token。
于是 shadcn 负责无障碍与状态机（Radix），我们负责长相。

Tailwind 只取 `theme` + `utilities` 两层（跳过 preflight），旧纸张版式整体包在 `@layer components`，
所以 `className` 覆写永远生效，不会被历史 CSS 反压。细节见 [docs/design-components.md](./docs/design-components.md)。
