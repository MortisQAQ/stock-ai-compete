# openOutcry Web · 架构 Code Review

> 审查对象：`openoutcry-web`（React 19 + Vite 8 + React Router 7 + Tailwind 4 + shadcn/Radix）
> 规模：75 个源文件 / 7,125 行（含约 2,000 行 CSS）
> 审查时间：2026-11-05　审查方式：逐文件通读 + 静态扫描 + 实跑 `tsc` / `vite build`
> 基线结果：`npm run typecheck` 通过；`vite build` 通过（2200 modules，JS 464.19 kB / gzip 145.66 kB，CSS 71.85 kB，**单 chunk**）

---

## 0. 一句话结论

**方向是对的，落地是"原型级"的。** 状态与展示分离、弹窗集中路由、设计 token、自建可访问性验收脚本——这些在原型里很少见，说明作者知道该往哪走。但三件事会阻止它变成可交付的产品：**代码没进版本库**、**设计 token 有两个互相矛盾的来源**、**业务状态机里写死了演示数据**。其余问题（无路由拆分、无错误边界、无 lint/测试、死代码、类型断言逃逸）都属于第二个迭代该收的债。

### 评分

| 维度 | 现状 | 评价 |
|---|---|---|
| 分层与目录组织 | 按文件类型分层（components/routes/store/data） | 及格，已到该转 feature 分层的规模 |
| 状态管理 | Context + useReducer + 派生选择器 | 良好（边界清楚），但单 Provider 承担过多 |
| 组件设计 | shadcn 源码 + 自有 token 重绘，变体用 cva | 良好，符合 shadcn 官方推荐的定制方式 |
| 设计系统 | CSS 变量 + Tailwind `@theme inline` | **不合格**：同一语义色存在两份不同取值 |
| 性能 | 无路由拆分、无 memo 滥用、无重型图表库 | 中等：体积不大但首屏全量 |
| 可测试性 | 无单测、无 lint、无 CI | 不及格（纯函数已经很好测，却没人测） |
| 可访问性 | skip-link、role=log、aria-*、焦点归还 | 良好，属于同类原型的上游水平 |
| 类型安全 | strict 全开 | 良好，但有 5 处断言绕过 |
| 交付物管理 | **整个 web 工程 untracked** | 不合格：磁盘坏 = 项目没了 |

---

## 1. P0 · 会直接造成损失的问题

### 1.1 整个前端工程没有进版本库

`git status` 里 `?? openoutcry-web/`——75 个源文件、约 7,000 行代码、以及整个交付物，**一个都没提交**。同时仓库根还有 16 项未提交的删除（`D`）堆着（`AI投资框架-模拟盘能力对比.md`、`scripts/repos_clone.py` 等）。

这不是风格问题，是数据安全问题：`git log` 里没有任何一次提交能还原今天的状态。

**改法**
```bash
# openoutcry-web/.gitignore 补上生成物
node_modules/
dist/
docs/shots/
*.local
```
```bash
git add openoutcry-web && git commit -m "feat(web): 交互原型 v2 首次入库"
```
根目录那 16 项删除建议单独一个 commit（`chore: 清理过时的调研稿与一次性脚本`），别和代码混在一起。

### 1.2 设计 token 有两个真源，同一个颜色有两个值

`src/styles/tokens.css` 与 `src/styles/index.css` 各自定义了一套调色板，**取值还不一样**：

| 语义 | tokens.css | index.css `@theme inline` | 结果 |
|---|---|---|---|
| 朱砂 `ver` | `#b63425` | `--color-ver: #c2352a` | `var(--ver)` 与 `text-ver` 不同色 |
| 墨 `ink` | `#16211c` | `--color-ink: #121a15` | 同上 |
| 纸 `bone` | `#eae3d3` | `--color-bone: #ede7da` | 同上 |

于是同样的"朱砂红"，写 `className="text-ver"` 得到 `#c2352a`，写 `style={{color:'var(--ver)'}}` 得到 `#b63425`。这类色差肉眼几乎看不出，但会在对比度检查、深浅色切换、设计评审对色卡时随机翻车。shadcn 官方讨论里明确讲过：**不要绕开 CSS 变量体系去硬编码颜色，否则主题就不再是单一真源**（[shadcn-ui#9754](https://github.com/shadcn-ui/ui/discussions/9754)）。

**改法**：tokens.css 做唯一真源，`@theme` 只做映射，不再写字面量。
```css
@theme inline {
  --color-ver: var(--ver);
  --color-ink: var(--ink);
  --color-bone: var(--bone);
  /* …全部改成 var() 引用 */
}
```
顺手删掉 `tokens.css` 里与 `@theme` 重复的 `--radius-*` / `--ease-out-quart`（现在两处都在定义，一处改了另一处不会跟着改）。

### 1.3 业务状态机里写死了演示数据

`store/RunProvider.tsx` 是全站唯一的业务状态入口（README 也是这么承诺的），但 reducer 长这样：

```ts
// RunProvider.tsx:97
case 'fill': {
  const price = 20.36
  const fee = 7
  const holdings = state.holdings.map((h) =>
    h.name === '公司-017' ? { ...h, quantity: h.quantity - qty, ... } : h)
  realized: round(state.realized + (price - 18.2) * qty - fee)
```

成交价、手续费、标的代码、成本价全部硬编码在 reducer 里；`approve` 事件文案里的 `¥20.30`（RunProvider.tsx:73）也是另一份独立常量。后果：

- 换任何一个标的、任何一笔成交，reducer 都要重写；
- 撮合结果不能来自"环境"，与产品叙事（"平台只揭示价格，不替 Agent 决策"）矛盾；
- 想写 reducer 单测都没法写——输入不变，输出永远是公司-017。

**改法**：reducer 只吃结构化动作，不碰业务数值。
```ts
type Action =
  | { type: 'approve'; quantity: number; limit: number; actor: Actor }
  | { type: 'fill'; fill: { asset: string; quantity: number; price: number; fee: number; cost: number } }

case 'fill': {
  const { asset, quantity, price, fee, cost } = action.fill
  return applyFill(state, { asset, quantity, price, fee, cost })  // 纯函数，放 store/fill.ts
}
```
`applyFill` 与 `totalsOf` / `canDecide` 一样进 `store/` 的纯函数层，直接 `vitest` 覆盖。

### 1.4 全局 Toast 寄生在 RunProvider 里

`useRun()` 同时返回运行状态、派生值、**动作**和**toast 队列**（RunProvider.tsx:255 起的 `value`）。任何页面想弹一条提示，都必须先依赖运行状态；将来运行状态换成服务端数据源，toast 也得跟着搬。另外 `notify` 里的 `window.setTimeout`（RunProvider.tsx:241）没有清理，组件卸载后仍会 `setState`；`list.slice(-2)` 把队列限制成 3 条且是隐式行为。

**改法**：拆成 `ToastProvider`（自带 `useToast`），RunProvider 只管运行；或者把 `notify` 放进 `actions` 之外的独立 context，用 `useRef` 存 timer 并在卸载时清空。

---

## 2. P1 · 架构债，越早还越便宜

### 2.1 没有路由级代码分割，也没有错误边界

`App.tsx` 静态 import 6 个页面，构建出**单个 464 kB chunk**（gzip 146 kB）。首屏只需要 `/studio`，却把 Review 页的三个图表、Protocol 页的 JSON 示例、Connect 页的长文案全部打进主包。同时全仓 0 个 `ErrorBoundary`：任何一处渲染异常都会白屏。

Vite 官方与社区共识都是 **先拆路由、再拆组件**（[reactrouter 文档](https://reactrouter.com/explanation/code-splitting)、[bundle 优化实践](https://www.renovateapi.com/blog/react-vite-bundle-optimization-code-splitting)）。当前用的是 React Router 7 的声明式 `<Routes>`，其实已经有更合适的形态：

```tsx
const router = createHashRouter([{
  element: <AppShell />,
  errorElement: <RouteError />,          // 路由级错误边界
  children: ROUTES.map(r => ({
    path: r.path,
    lazy: () => r.load(),                 // 每页一个 chunk
  })),
}])
```
预期收益：`/studio` 首屏可砍掉图表与示例页代码，gzip 大概能降到 90–110 kB 区间；顺带拿到 v7 的 `errorElement`/`HydrateFallback` 能力。

### 2.2 死代码与重复工具函数（约 260 行）

| 文件 | 行数 | 状态 |
|---|---|---|
| `components/run/Composer.tsx` | 64 | 已被 `ConversationPane` 取代，全仓 0 引用 |
| `components/ledger/DecisionLedger.tsx` | 162 | 同上（台账能力搬进会话流），0 引用 |
| `components/ui/Separator.tsx` | 26 | 0 引用 |
| `data/market.ts` `COMPARE_SERIES` | 5 | 0 引用 |
| `lib/format.ts` `cn()` | 2 | 与 `lib/utils.ts` 的 `cn` **重复** |

第二件更要紧：项目里有**两个 `cn`**。`lib/utils.ts` 的是 shadcn 标准版（`clsx` + `twMerge`，能消解 Tailwind 冲突）；`lib/format.ts` 的是朴素版（只 `join(' ')`），而 `components/ui/Stamp.tsx:2` 偏偏用的是后者。也就是说**唯一一个走朴素版的基础组件，恰恰最容易被 `className` 覆盖失效**。删掉 `format.ts` 里的 `cn`，全站统一 `@/lib/utils`。

（顺带：`DecisionLedger` 里那套"筛选 + 到底自动跟随 + N 条新事件"的交互写得不错，删之前确认会话流已经覆盖它，别把能力一起丢了。）

### 2.3 依赖表里有三份 Radix 阴影包

`package.json` 同时声明了聚合包 `radix-ui`（代码实际在用，`import { Dialog } from 'radix-ui'`）与三个单体包 `@radix-ui/react-dialog` / `react-slot` / `react-tabs`（**0 引用**）。此外还有一个 `cn@^0.5.0`——全站 0 引用，且它并不是 UI 工具包（`cn` 函数是本地的）。多装的包不仅让 `npm i` 变慢，还扩大了供应链面。

```bash
npm uninstall @radix-ui/react-dialog @radix-ui/react-slot @radix-ui/react-tabs cn
```
（`tw-animate-css` 要留：`animate-in` / `fade-in-0` 这些类靠它。）

### 2.4 "事实"被抄写在 5 个组件里

`run_demo_001` / `sess_demo_001` / `2024-04-22 23:59:58` / `工具调用 12/20` / `32k/100k token` 出现在：

- `components/chrome/Tape.tsx:4-9`（run、clock、cutoff 写死在组件常量里）
- `components/dialogs/SnapshotDialog.tsx:14`
- `components/training/WorkbenchPane.tsx:252`
- `components/training/MobileTaskView.tsx:86,109`
- `components/run/RunStatusCard.tsx:8`（`const used = 12`，还配一个写死的 20）

这些是**运行时的元数据**，应该只有一份来源。建议在 `data/run.ts` 导出 `RUN_META = { id, sessionId, dataCutoff, budget: { used, total }, tokens: {...} }`，或直接进 `RunState`；组件只读不写。否则"改一处、漏四处"是必然。

### 2.5 手工 history 与路由共存

`routes/TrainingPage.tsx:32-56` 用 `window.history.pushState` 给"助手页"压一条历史，关闭时 `history.back()`。但全站路由由 HashRouter 管理，两边共用同一个 history 栈：助手页打开时按浏览器后退，`popstate` 会把 `assistantOpen` 置 false，同时 HashRouter 也会消费这次后退——再打开、再关闭就可能多退一步（退出到上一个路由）。

**改法二选一**：
1. 正规路由：`<Route path="/training/assistant" element={<AssistantSheet/>} />`，用 `navigate(-1)` 关闭；
2. 保持 overlay，但 `pushState({ ooAssistant: true })` 后监听 `popstate`，**校验 `event.state?.ooAssistant`** 再决定是否关闭，并且不要在没有自己压栈的情况下调 `back()`。

### 2.6 类型断言的 5 处逃逸

| 位置 | 代码 | 问题 |
|---|---|---|
| `data/run.ts:13` | `{ ...pnl: 2168.6, cost: 20, ... } as Trade` | `cost` 不是 `Trade` 字段，靠断言把多余字段塞进去；`Trade` 少了个 `cost`，等于类型模型缺字段 |
| `data/agents.ts:106` | `AGENTS[id as AgentId] ?? AGENTS.native` | 未知 id **静默降级**成内置卡，与产品文案"卡里没有的字段不会被猜出来"自相矛盾 |
| `data/run.ts:26` | `createInitialRun(agent = 'native')` | 参数退化成 `string`，内部再 `as RunState['agent']` |
| `store/RunProvider.tsx:229` | `useReducer(reducer, 'native' as AgentId, ...)` | 可用 `createInitialRun` 的默认参数消掉 |
| `routes/ConnectPage.tsx:269` / `run/DetailTabs.tsx:34` | `e.target.value as AgentId` / `value as TabId` | 建议加 `isAgentId(v): v is AgentId` 守卫；`as` 只是让类型闭嘴，运行时该炸还是炸 |

```ts
// 建议
export const createInitialRun = (agent: AgentId = 'native'): RunState => ({...})
export const agentOf = (id: string): AgentMeta | undefined =>
  (AGENTS as Record<string, AgentMeta>)[id]
```
让调用方显式处理 `undefined`（`agentOf(id) ?? PLACEHOLDER`），比把未知卡悄悄变成"内置卡"诚实得多，也更符合这个产品"不猜、不补默认值"的叙事。

### 2.7 委托单与训练场是两套互不相通的数据

`MandateTicket` 填完点"开具委托单"只 `setIssued(true)`（注释也写了"原型阶段只做本地状态，不写回 RunStore"）；`StudioPage` 的"当前训练"读的是 `TRAINING_SEED` 里写死的 `trn_0042`；`TrainingPage` 又读 `trainingTasksOf(state)`（由 `RunState` 派生的 live 任务 + 三份 mock 档案）。**三个数据源，零连接**。

用户在首页开一张"20 个交易日、3 位 Agent"的委托单，进训练场看到的仍是"公司-017 减仓"那个写死的运行。这是答辩现场最容易被问穿的地方。

**改法**：在 reducer 里加 `training' 切片 + `{ type: 'createTraining'; draft: MandateDraft }`，委托单提交时 dispatch，训练场读 `state.training`；`TRAINING_SEED` 降级成"历史档案"（和 `MOCK_ARCHIVES` 合并成一个 `mocks/` 目录）。

### 2.8 派生口径在页面里被重复实现

README 承诺"派生数据集中在 `store/derive.ts`"，实际：

- 四格表头：`WorkbenchPane.tsx:56` 的 `liveBandItems` 与 `ReviewPage.tsx:21` 的 `band` 各写一遍（label / note / tone 逻辑几乎逐字相同）；
- 持仓列表：`HoldingsList.tsx` 与 `DetailTabs.tsx` 的 holdings 页签各渲染一次，`pnl = quantity * (price - cost)` 各算一次；
- 状态文案：`data/trainings.ts:28` 与 `store/trainingTasks.ts:21` 各有一个 `STATUS_TEXT`（同名不同值：`pending` 一个叫"待确认"一个叫"待确认"，但 `TrainingTaskStatus` 与 `TrainingStatus` 是两套并行枚举）。

建议 `store/derive.ts` 扩成 `selectors.ts`：`bandItemsFor`、`holdingRows(state)`、`trainingStatusText` 全部收进去；页面只做布局。

### 2.9 Modal 在 render 阶段写 ref

`components/ui/Modal.tsx:27`：
```tsx
if (open && restoreRef.current === null && typeof document !== 'undefined') {
  restoreRef.current = document.activeElement as HTMLElement | null
}
```
render 期间读 `document.activeElement` 并写 ref，是 React 明确列出的反模式（并发渲染下 render 可能被丢弃/重放）。归还焦点也靠 `setTimeout(..., 0)` 赌 Radix 的卸载时序。

**更简单的做法**：把 `open/onClose` 交给 Radix 的 `DialogTrigger` + `DialogClose`，Radix 会自动把焦点还给触发元素——现在之所以要手写，是因为弹窗由 `DialogProvider` 从外部唤起、没有 trigger 可还。可以让 `DialogProvider.open()` 记录 `document.activeElement`（在**事件回调**里，不是在 render 里），关闭时归还。

### 2.10 AssistantSheet 手搓 focus trap

`AssistantSheet.tsx:86-115` 用 `querySelectorAll` + Tab 边界判断手写焦点环，而项目里其它弹窗早已用 Radix（自带焦点陷阱）。两套无障碍实现并存，意味着两套 bug：手写版不处理动态禁用、不处理 shadow root、不处理 IME。

**改法**：直接用 Radix `Dialog`，`modal` 保持 true，`DialogContent` 用 `translate-y-full → 0` 的 CSS 过渡做推入动画（`data-[state=open]` 已有动画钩子），history 集成按 2.5 处理。

---

## 3. P2 · 一致性与工程化

### 3.1 内联 style 与写死 hex 绕过 token

29 处 `style={{...}}`，其中典型：
- 四个弹窗里重复写 `style={{fontSize:'var(--fs-body)', lineHeight:1.7, color:'var(--ink-2)'}}`（`ConfirmDialogs.tsx:36,71,109`、`DetailDialog.tsx:46,101`、`ReplayDialog.tsx:16`）→ 缺一个 `<Prose/>` / `<Note/>` 组件；
- `ReviewPage.tsx:101-125` 图例直接写 `#E8785F` / `#D6BE6E` → 图表色应从 `tokens.css` 出，否则换肤时图例和曲线对不上。

### 3.2 "禁止写死 px"这条规则名存实亡

README 与 `check-type-floor.mjs` 都声明"TSX 里禁止写死 px 字号"，但尺寸侧大量存在：`Button` 的 `h-[30px]` / `size-[30px]`（Button.tsx:45）、`Input` / `Select` 的 `h-[36px]`、`Modal` 的 `max-h-[calc(100dvh-2.5rem)]`、`ConversationPane` 的 `max-h-[120px]`、`TrainingPage` 的 `-mx-[38px]` / `-mb-[90px]`、`StudioPage` 的 `h-[3px]`。脚本只匹配 `text-[Npx]`，所以约束"看着在，实际不拦"。

两条路选一条：要么把控件高度也 token 化（`--control-h-sm: 30px` 等，再用 `h-[var(--control-h-sm)]`），要么把规则诚实地收窄成"字号禁止 px"，并在 README 写清尺寸的例外。

### 3.3 零测试、零 lint、零 CI

- 0 个 `*.test.ts(x)`；
- 没有 `eslint.config.*`、`.prettierrc`；
- 没有 CI 配置。

而这两个脚本做的其实是"验收"而非"回归"：需要先起 dev server、依赖本机 ms-playwright 的 chromium、`audit-ui.mjs` 默认地址是 `localhost:5183`（dev 而非构建产物）。它们在**当前机器**上很有价值，但换台机器/换个人就跑不动。

**最小可行补法**（半天工作量）：
```bash
npm i -D vitest eslint @eslint/js typescript-eslint
```
- 单测目标就选现成的纯函数：`store/derive.ts`（totals / canDecide / statusLabel）、`lib/chart.ts`（bounds / project / drawdownSeries）、`lib/format.ts`（signed / round / tone）。这几个函数的错误会直接显示成错误数字，值得锁住。
- ESLint 用 flat config + `react-hooks` 插件（现在的 `Modal` 问题、`DecisionLedger` 里 `filterRef.current = filter` 的写法，都能被规则提前抓到）。
- CI 三个 job：`tsc --noEmit`、`vite build`、`vitest run`。

### 3.4 残留调试脚本

`openoutcry-web/probe-check.mjs` 硬编码 `C:/Users/J/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe`，是某次排查用的临时脚本。删掉，或收进 `scripts/` 并复用 `check-type-floor.mjs` 里的 `resolveChromium()`。

`dist/` 是过期产物（已在 .gitignore，但目录还在），本地验证一律以 `vite build` 现跑为准。

### 3.5 目录应按 feature 收拢

现在 `components/run` 与 `components/training` 语义重叠（`ConversationPane` 吞掉了 `run/Composer`，`TrainingLedger` 在 `studio/` 却讲 training），`store/trainingTasks.ts` 里同时塞了实体定义、mock 数据、派生函数和文案映射。

已经到了该转向 feature-based 的规模（[React 官方目录建议](https://react.dev/learn/thinking-in-react)、[feature folders 实践](https://www.robinwieruch.de/react-folder-structure/)）：

```
src/
  app/            App.tsx · router.tsx · providers.tsx
  features/
    studio/       MandateTicket · TrainingLedger · useMandateDraft
    training/     ConversationPane · WorkbenchPane · TaskSwitcher · AssistantSheet
    review/       ReviewPage · EquityChart · DrawdownChart · ToolUsageChart
    connect/      ConnectPage · AgentCard
    protocol/     ProtocolPage
  entities/       run/（RunProvider · reducer · applyFill · selectors）
                  agent/（agents.ts · card.ts）
                  training/（types.ts · selectors.ts）
  shared/         ui/ · lib/ · hooks/ · styles/
  mocks/          run.ts · trainings.ts · market.ts · archives.ts
```
判断标准很简单：**改一个功能时，需要动几个目录？** 现在改训练场要动 `components/training` + `components/run` + `store` + `data` 四处。

### 3.6 全局 CSS 类缺少命名空间

`styles/` 里 1,900+ 行全局类：`.index`、`.page`、`.note`、`.cols`、`.steps`、`.meter`、`.tape`、`.band`……全部裸露在全局作用域。`@layer` 只解决了"谁覆盖谁"，没解决"谁撞谁"——这些名字和第三方库、浏览器扩展、甚至未来某个组件的类名撞车时，调试成本极高。

最低成本的修法：加前缀（`.oo-index` / `.oo-page`），或把 `chrome/`、`studio/` 这几块迁到 CSS Modules（Vite 原生支持，零配置）。

---

## 4. 值得保留的部分

不要在做上面这些重构时把这些一起改掉了：

1. **派生与状态分离**：`derive.ts` 里 `totalsOf` / `canDecide` / `runStatusLabel` 是纯函数，正确姿势；只是还没"唯一化"。
2. **`DialogProvider` 集中挂载**：8 个弹窗统一由 `Dialogs.tsx` 路由，组件里只管 `open({kind})`。这比到处 `useState` 干净得多。
3. **图表手写 SVG**：`lib/chart.ts` + 三个组件，没引 recharts/d3。整个应用 gzip 146 kB，图表体积贡献接近 0，这是很克制的一手。
4. **设计系统分层**：`theme → base → components → utilities` 的 `@layer` 顺序理解正确，shadcn 组件落在 utilities 层、旧版式落在 components 层，`className` 永远能覆盖——这是很多人配 Tailwind 4 + shadcn 会踩的坑。
5. **自建验收脚本**：字号下限、对比度、点按尺寸、焦点契约、页签语义、六路由 × 五视口截图。原型阶段做到这个程度，罕见到值得单独表扬。
6. **可访问性细节**：skip-link、`role="log"` + `aria-live`、`aria-pressed`/`aria-current`、`prefers-reduced-motion`、ESC/遮罩关闭、焦点归还、`:focus-visible` 统一描边。这些不是原型必须做的事，但做了就是加分。
7. **`types.ts` + strict**：领域模型集中、`noUnusedLocals`/`noUnusedParameters` 打开且能过。

---

## 5. 建议的落地顺序

| 阶段 | 内容 | 预估 |
|---|---|---|
| 本周 | ① 代码入库 ② token 单一真源 ③ 删死代码/重复 `cn`/多余依赖 ④ 删 `probe-check.mjs` | 半天 |
| 下周 | ⑤ 路由拆包 + 错误边界 ⑥ reducer 去硬编码（`applyFill` 纯函数） ⑦ Toast 拆 Provider ⑧ 修 history/Modal/AssistantSheet 三处状态与无障碍问题 | 2 天 |
| 下下周 | ⑨ 委托单 → reducer → 训练场打通（2.7） ⑩ `selectors.ts` 收口 ⑪ vitest + eslint + CI | 2–3 天 |
| 之后 | ⑫ feature 目录迁移、CSS 命名空间、px 规则统一（可与新功能并行） | 按需 |

---

## 6. 参考

- React 官方：Thinking in React / Code Organization —— https://react.dev/learn/thinking-in-react
- React Router：Code Splitting 说明 —— https://reactrouter.com/explanation/code-splitting
- Vite 打包与路由拆包实践 —— https://www.renovateapi.com/blog/react-vite-bundle-optimization-code-splitting
- shadcn/ui 定制最佳实践（讨论 #9754）—— https://github.com/shadcn-ui/ui/discussions/9754
- shadcn 颜色体系与 Tailwind v4 token 迁移 —— https://www.shadcndeck.com/blog/shadcn-color-palette
- React 目录结构实践（feature folders）—— https://www.robinwieruch.de/react-folder-structure/

> 说明：上述链接为本次检索命中的公开资料；受限环境无法逐页抓取正文，观点以官方文档通行结论与本仓实际代码证据为准。
