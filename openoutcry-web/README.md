# openOutcry Web · 交互原型 v2

openOutcry 是面向 A 股的 LLM 交易 Agent 评测与训练场。本仓库是它的**交互原型前端**：
React + Vite + React Router，页面按路由拆分加载，交互状态集中在一个运行状态机里。

> 所有数字、公司名与事件均为虚构演示数据，不代表真实行情或绩效。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5183
npm run build      # tsc --noEmit + vite build，产出 dist/
npm run preview    # 预览构建产物
npm run typecheck  # 只做类型检查
npm test           # 单元测试（watch）
npm run test:run   # 单元测试（一次性，CI 用）
npm run check:type # 排版硬约束：全站最小字号 ≥13px、禁止写死 px 字号（需先 npm run dev）
npm run audit:ui   # 组件层回归：对比度 / 点按尺寸 / 溢出 / 焦点契约
```

构建用 `base: './'` + `createHashRouter`，因此 `dist/` 可以直接丢到 GitHub Pages 的子路径，
不需要任何 404 重写规则。

## 架构

```
src/
  app/                     应用装配层
    routes.ts              路由表：唯一声明（路径 + 导航文案 + 懒加载入口）
    router.tsx             路由器装配（布局路由 / HydrateFallback / NotFound）
    RouteError.tsx         路由级错误边界
    lazyPage.ts            动态 import → route.lazy 的适配器
    App.tsx                Provider 与路由的装配顺序
  main.tsx                 应用入口
  nav.ts                   由路由表派生导航与页面标题
  types.ts                 领域类型：运行、Agent、训练任务、事件、提案、持仓、成交
  data/                    演示数据（agents / market / run / protocol / trainings）
  mocks/                   只读档案（冻结的训练任务）
  lib/                     纯函数：format 格式化、chart 坐标与路径、exportRun
  store/
    RunProvider.tsx        运行状态机（useReducer）+ 动作
    ToastProvider.tsx      全站提示队列（独立于运行状态）
    DialogProvider.tsx     全站弹窗路由 + 焦点归还
    selectors.ts           派生选择器：账户表头、持仓行、训练状态文案
    derive.ts              运行状态派生：合计、状态文案、是否可审批
    trainingTasks.ts       当前运行 → 训练任务列表
  components/
    chrome/                Tape / Masthead / SideNav / MobileNav / AppShell
    ui/                    shadcn 源码组件（Button / Card / Badge / Tabs /
                           Dialog / Modal / Input / Textarea / Select / Label /
                           Prose）+ Stamp / Toasts
    charts/                EquityChart / DrawdownChart / ToolUsageChart（手写 SVG）
    proposal/              ProposalTicket（数量步进 + 批准 / 改单 / 拒绝）
    run/                   StatBand / AccountLedger / HoldingsList / DetailTabs /
                           RunStatusCard
    studio/                MandateTicket / TrainingLedger
    training/              ConversationPane / WorkbenchPane / TaskSwitcher /
                           MobileTaskView / AssistantSheet
    dialogs/               7 个弹窗：快照 / 回放 / 详情 / 改单 / 中止 / 自主运行 / Agent 配置
  routes/                  6 个页面（每个页面一个独立 chunk）
  styles/                  tokens · base · chrome · ui · studio · training · review · misc
                           index.css 负责 CSS 分层与 shadcn 语义变量映射
```

### 路由与代码分割

- **路由表只有一份**：`app/routes.ts` 是纯数据，一行一个路由；`nav.ts`、面包屑、
  移动端底栏都从它派生。加页面只改这里。
- **按路由懒加载**：每个页面通过 `lazyPage(() => import(...), '导出名')` 变成独立 chunk，
  首屏只下载当前路由的代码。
- **错误边界**：布局路由挂了 `errorElement`，页面级异常只替换内容区，纸面外壳与导航仍在。
- 切页时 `AppShell` 读 `useNavigation()` 显示细进度条，避免 chunk 加载时"点了没反应"。

### 状态与交互的边界

- **运行状态**只在 `RunProvider` 里改，页面不直接 setState 业务数据。
- **提示**由 `ToastProvider` 负责，与运行状态解耦；组件用 `useToast()`，不再从 `useRun()` 里拿。
- **弹窗**不挂在页面里，统一由 `DialogProvider` 路由，任何组件都能 `open({ kind })`；
  焦点归还也在这一层（`open()` 时记录触发元素，关闭后还回去）。
- **派生数据**（账户表头、持仓行、状态文案、能否审批）集中在 `store/selectors.ts`
  与 `store/derive.ts`，页面只做布局。

### 设计令牌单一真源

`styles/tokens.css` 是**唯一**的颜色来源；`styles/index.css` 的 `@theme inline` 只做映射
（`--color-ver: var(--ver)`），不再写字面量。改色只改一处，`text-ver`、`var(--ver)`、
图表曲线与图例同步变化。

控件高度走 `--control-h-*`（`h-[var(--control-h-md)]`），图表色板走 `--chart-*`。

## 已实现的交互

| 场景 | 行为 |
| --- | --- |
| 会话流 | 我的插话靠右气泡、Agent 直接写在纸上、工具/提案折叠成一条，可展开、可复制 |
| 审批 | 数量步进 → 批准；精确改单弹窗；拒绝；提交后出现「演示开盘撮合」 |
| 输入 | `Enter` 发送（`Shift+Enter` 换行，兼容 IME）；`/goal` 进入自主推进；运行时显示字数 |
| 任务切换 | 右栏切换训练任务，中栏换成该任务的实时台账或冻结档案 |
| 移动端 | 单列任务视图 + 右下浮动按钮拉起的全屏助手页（浏览器后退可关闭） |
| 弹窗 | ESC / 点遮罩关闭，焦点陷阱与焦点归还，滚动锁定（Radix） |
| 键盘 | 页签支持 ← → Home End；`:focus-visible` 统一描边；`Tab` 首项为「跳到主内容」 |
| 反馈 | Toast 队列（成功/提示/警告） |
| 无障碍 | `role="log"` + `aria-live`、`aria-pressed`、`aria-selected`、`prefers-reduced-motion` |

## 规范文档

- **排版与响应式**：[docs/design-typography.md](./docs/design-typography.md) —— 全局字号硬约束、最小字号表、流体标尺、密度预算、反模式清单、验收标准。
- **组件层**：[docs/design-components.md](./docs/design-components.md) —— shadcn 落地方式、CSS 分层规则、组件变体表、焦点与动效契约。
- **架构审查**：[docs/code-review-2026-11-05.md](./docs/code-review-2026-11-05.md) —— 问题清单、修复记录与仍待处理项。
- 验收脚本：`npm run check:type`（排版硬约束）、`npm run audit:ui`（组件层），截图落在 `docs/shots/`。

### 排版硬约束

**任何可见文字的计算字号不得低于 13px；正文 ≥17px；说明 ≥15px。**
TSX 里禁止写死字号 px（`text-[12px]`），只用 `text-micro / note / data / body / row / h2 / kpi / h1 / display`
九个工具类（映射见 [design-typography.md](./docs/design-typography.md) 第 2 节）。
`npm run check:type` 会静态扫描写死 px 字号 + 逐路由逐文本节点断言下限，出现 1 处违例即失败。

控件尺寸同理走令牌：新增控件高度请加到 `--control-h-*`，不要在 TSX 里写 `h-[36px]`。

## 测试

- **单元测试**（`vitest`，18 个用例）：`lib/format`（金额/百分比/取整）、
  `lib/chart`（值域、坐标映射、回撤序列）、`store/derive`（合计、状态文案、审批权限）。
  只测纯函数——它们算错会直接变成页面上的错误数字。
- **不做组件快照测试**：视觉与交互由 `check-type-floor.mjs` 与 `audit-ui.mjs` 在真实浏览器里
  检查对比度、点按尺寸、字号下限与横向溢出，比 DOM 快照更接近用户看到的结果。

## 设计语言

「纸质大厅」：骨白纸面 + 墨绿黑 + 朱砂红 + 黄铜微标签；票据卡用硬投影与 1px 墨线，
状态用旋转印章，数字一律进深色仪器带 + 等宽 tabular-nums。
A 股口径为**红涨绿跌**（`--ver` / `--down`）。

## 组件层

基础组件（按钮、卡片、页签、弹窗、表单控件）用 [shadcn/ui](https://ui.shadcn.com) 的源码：
`npx shadcn@latest add <组件>` 把文件拉进 `src/components/ui/`，再按上面的语言改写——
圆角收到 2–6px、阴影换成硬投影、字改成等宽大写小字、配色映射到自家 token。
于是 shadcn 负责无障碍与状态机（Radix），我们负责长相。

Tailwind 只取 `theme` + `utilities` 两层（跳过 preflight），旧纸张版式整体包在 `@layer components`，
所以 `className` 覆写永远生效，不会被历史 CSS 反压。细节见 [docs/design-components.md](./docs/design-components.md)。

## 已知取舍（留到接后端时处理）

1. **撮合数据写死在 reducer 里**：成交价、费用与标的代码在 `RunProvider` 的 `fill` 分支中，
   接真实环境时应改成 action 携带成交结果（见审查报告 P0-3）。
2. **运行元数据分散在组件里**：`run_demo_001`、资料时点、工具预算等在 Tape / SnapshotDialog /
   WorkbenchPane / RunStatusCard 各写一份，等确定数据来源后统一收口。
3. **委托单与训练场尚未打通**：`MandateTicket` 只做本地状态，训练场读的是运行状态派生的任务，
   两者在三套数据源上；与 1、2 一起在后端阶段统一。

目录迁移到 `features/` 与全局 CSS 类加命名空间同样留到功能稳定后做——两者都会大面积改动文件路径，
放在同一个提交里会淹没功能改动。
