# 组件层 · shadcn/ui 落地说明

> 目标：按钮 / 卡片这类基础组件不再手写样式，而是**把 shadcn 的源码下载进仓库，再按「纸质大厅」改写**。
> shadcn 的定位就是「源码归你」，所以这里没有黑盒依赖：每个组件都是 `src/components/ui/*.tsx` 里可以直接改的文件。

## 1. 装了哪些东西

| 依赖 | 作用 |
| --- | --- |
| `tailwindcss` + `@tailwindcss/vite` | v4，原子类引擎，走 Vite 插件（没有 tailwind.config.js） |
| `tw-animate-css` | 弹窗进出场动画的 `animate-in / fade-in-0 / zoom-in-95` |
| `class-variance-authority` | 变体（variant / size）定义 |
| `clsx` + `tailwind-merge` | `cn()`：条件拼接 + 冲突消解（`src/lib/utils.ts`） |
| `radix-ui` | 无样式无障碍原语（Dialog / Tabs / Slot / Label / Separator） |
| `lucide-react` | 图标，统一 14px（`size-3.5`） |

`components.json` 已就位，后续可以直接继续拉组件：

```bash
npx shadcn@latest add tooltip popover select
```

拉下来的文件是**原始形态**（圆角 8px、系统字体、灰阶配色），必须按第 4 节改写一遍再用。

## 2. 为什么不直接套默认样式

默认的 shadcn 是「现代 SaaS 卡片」：大圆角、柔和阴影、14px 无衬线、冷灰配色。
本产品的语言是**纸质大厅**：骨白纸面、墨线、朱砂印、黄铜微标签、等宽大写小字、硬投影。
两者冲突的地方全部在组件源码里改掉，而不是在外面堆 `!important`：

| 维度 | shadcn 默认 | 本项目 |
| --- | --- | --- |
| 圆角 | 8–12px | 2/3/4/6px（`--radius-xs…lg`） |
| 阴影 | 柔和模糊 | 硬投影：静止 1px、悬停 2px、票据 3px / 弹窗 8px |
| 字号 | 14px sans | 13–14px 等宽大写，字距 0.08em（**全局下限 13px，见 [design-typography](design-typography.md) 第 0 节**） |
| 主色 | 近黑中性 | 墨 `#16211c` + 朱砂 `#b63425` + 黄铜 `#7c6036` + 松绿漆板 `#14352c` |
| 焦点 | ring 3px 半透明 | 全局 `:focus-visible` 2px 朱砂描边，offset 3px |

## 3. CSS 分层（改这套东西前必读）

`src/styles/index.css` 声明了固定层序：

```css
@layer theme, base, components, utilities;
```

- `theme` —— 设计令牌（`tokens.css`）+ shadcn 语义变量（`:root` / `@theme inline`）
- `base` —— 重置与排版基础（`base.css`）
- `components` —— 历史版式样式（`chrome/ui/studio/training/review/misc.css`），**全部包在 `@layer components { … }` 里**
- `utilities` —— Tailwind 原子类

这样做的原因很实际：旧 CSS 里有 `button { border: 0; background: none }` 这类重置，
如果不分层，它会盖掉组件上的 `border` / `bg-` 工具类（无层样式优先级高于任何 `@layer`）。
分层之后，**组件写 utilities，旧版式写 components，utilities 永远赢**，所以 `className` 覆写随时生效。

另外为了不动既有排版，Tailwind **跳过了 preflight**，只引入 `theme.css` + `utilities.css` 两层：

```css
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);
```

## 4. 语义变量映射

```css
:root {
  --background: var(--bone);        /* #eae3d3 纸面 */
  --foreground: var(--ink);         /* #16211c 墨 */
  --card: var(--bone-hi);           /* #f8f4e9 卡面 */
  --primary: var(--ink);            /* 墨仍是「字与线」的颜色 */
  --destructive: var(--ver);        /* #b63425 朱砂 */
  --muted-foreground: #5b665e;      /* 4.68:1 on 纸面，过 AA */
  --border: rgba(22, 33, 28, 0.17);
  --ring: var(--ver);
}
```

组件里因此可以写 `bg-card` / `text-muted-foreground` / `border-input`，自动继承产品色板。
深色面（见第 9 节「漆板系统」）另有一组：`bg-instrument` / `text-instrument-foreground` / `border-instrument-border`，
以及可以直接用的 `border-plate-0` / `text-plate-dim` / `bg-plate-2` 等。

## 5. 组件清单

### Button `src/components/ui/Button.tsx`

| variant | 用途 | 形态 |
| --- | --- | --- |
| `default` | 常规操作（配置、次要按钮） | 纸面 + 墨线 + 1px 硬投影 |
| `solid` | 主操作（进入训练场） | 松绿漆板底 `--pine` + 骨白字，悬停亮一档（`--plate-2`） |
| `ver` | 高风险确认（批准、模拟连接） | 朱砂底白字 |
| `ghost` | 文字按钮（取消、回放轨迹） | 透明，悬停 6% 墨 |
| `outline` | 弱化的实体按钮 | 透明底 + 32% 墨线 |
| `secondary` | 次要在深底上 | 骨线底 |
| `link` | 行内链接 | 朱砂下划线 |

尺寸：`xs` 26 / `sm` 30 / `default` 36 / `lg` 42 / `icon` 36。
交互：悬停抬 1px 且投影加到 2px，按下投影收掉并下沉 1px；`asChild` 可直接渲染成 `<Link>`。

### Card `src/components/ui/Card.tsx`

```tsx
<Card variant="instrument">
  <CardHeader>当前运行 <Badge variant="instrument">run_demo_001</Badge></CardHeader>
  <CardContent>…</CardContent>
</Card>
```

- `variant`：`default`（压边纸）/ `flat`（无投影）/ `instrument`（深色数字面）/ `dashed`（空缺位、添加项）/ `ghost`
- `interactive`：悬停抬升 + 鼠标指针，配 `asChild` 可整卡可点
- `CardHeader` 是「等宽大写微标签条 + 1px 分隔线」，深色卡里自动换色
- 整卡可点但内部还有按钮时，用 stretched-link：内容按钮 `after:absolute after:inset-0`，操作区 `relative z-10`

### 其它

- **Badge**：10.5px 大写方章，`secondary/outline/muted/ver/pine/brass/instrument`
- **Tabs**：Radix 驱动，`line`（下划页签）/ `segmented`（分段控件），键盘方向键与 `aria-selected` 由 Radix 负责
- **Dialog + Modal**：`Modal` 在 `Dialog` 之上固定「墨线卡头 + 纸面正文 + 底部操作条」，保留旧的 `open/kicker/title/footer/width` 调用方式
- **Input / Textarea / Select / Label**：白色纸面、3px 圆角、内阴影；高 36px，字号 `text-body`（移动端 17px，避免 iOS 自动放大）、桌面 `text-note`（15–16px）
- **Stamp**：保留的「印章」品牌件（旋转 -2°），不并入 Badge

## 6. 焦点与动效契约

- 全站 `:focus-visible` 统一 2px 朱砂描边 + 3px offset（`base.css`），组件内**不再叠 ring**，避免双描边
- 弹窗：ESC / 点遮罩关闭、焦点陷阱、滚动锁定都由 Radix 提供；**焦点归还**由 `Modal` 显式处理，因为弹窗是被 `DialogProvider` 唤起的外部状态，Radix 不知道触发按钮是谁
- 动效只做两件事：150ms 的颜色/位移过渡、弹窗 150ms 进出场；`prefers-reduced-motion` 下全部归零（`base.css`）
- Tailwind v4 的 `hover:` 自带 `@media (hover: hover)`，触屏不会出现「点完还悬停」的粘滞态

## 7. 回归检查

```bash
npm run typecheck
npm run audit:ui          # 对比度 / 点按尺寸 / 横向溢出 / 焦点契约
npm run audit:ui -- --shots   # 另外把截图写到 docs/shots/ui-*.png
```

`audit:ui` 会对 6 个路由逐页检查：

- 文本对比度是否满足 WCAG AA（正文 4.5:1、大字 3:1），连同每一处 `aria-hidden` 的装饰件一起排除
- 可交互元素的点按高度（桌面 ≥28px、触屏 ≥34px）
- 390px 视口是否有横向溢出或内容被祖先裁剪
- 弹窗打开后焦点是否进入、背景是否锁滚、关闭后焦点是否归还触发按钮

## 8. 已知取舍

- **没启用 preflight**：换来与旧样式零冲突，代价是少数元素仍靠 `base.css` 重置（例如 `button` 的默认外观）
- **没做暗色模式**：纸质大厅是单纸面主题，`dark:` 变体未启用
- **Tabs 依赖 Radix**：没有 `TabsContent` 的 `Tabs` 也能用，但语义不完整，新页面请配对使用
- **字体**：中文回落到系统字（`--sans` / `--serif` / `--mono` 未打包 webfont），跨平台字形会略有差异

## 9. 漆板系统：深色面只留一种

早期版面里有两块纯黑（顶部数字带 + 决策台账），它们与骨白纸面之间没有任何中间调，
读起来像「纸被挖了两个洞」。现在收成一条规矩：

> **深色 = 机器读数的地方；浅色 = 人读的地方。**

### 9.1 三档漆板

| 变量 | 值 | 用在哪 |
| --- | --- | --- |
| `--plate-0` | `#0f2a23` | 走带、漆板描边、最深的分隔 |
| `--plate-1` | `#14352c` | 决策台账、图表卡、运行卡、代码块 |
| `--plate-2` | `#1b4438` | 抬起层：筛选激活、toast、移动端导航 |

旧名 `--slate` / `--slate-2` / `--instrument` 已全部指向漆板，
所以 `.ledger`、`.chart-card`、`<Card variant="instrument">` 不用改 JSX，只换令牌。

### 9.2 漆板三件套

1. `1px` 描边用 `--plate-0`（比板身更深，不是纯黑）
2. 内侧 1px 黄铜刻线 `inset 0 0 0 1px rgba(211,180,120,.2)` —— 纸上是印，板上是刻
3. 硬投影不投黑：`3px 3px 0 rgba(22,33,28,.16)`

### 9.3 板面文字与涨跌

| 用途 | 变量 | 对比度 |
| --- | --- | --- |
| 正文 | `--plate-ink` `#eae6d3` | 10.6:1 |
| 次要 | `--plate-dim` `#a6b7a9` | 6.3:1 |
| 微标签 / 序号 | `--plate-faint` `#94a698` | 5.2:1 |
| 涨 | `--up-dark` `#f0917d` | 5.8:1 |
| 跌 | `--down-dark` `#8fc9a5` | 7.0:1 |
| 黄铜 | `--brass-hi` `#d3b478` | 6.7:1 |

### 9.4 顶部四格改成「结算表头」

KPI 属于人读的账目，所以回到纸面：3px 墨线压顶、1px 竖纸缝、衬线大字、标签用黄铜。
只有底下那条 30px 的**元数据脊**还是漆板 —— 它把走带、表头、台账串成一条「仪器链」，
深色因此出现在一条连续的线上，而不是散落成块。

### 9.5 一屏一块主漆板

同一屏里最多一块大面积漆板（训练场是台账，工作室是运行卡，复盘是两张图表卡）。
超出一块就退回纸面：复盘的图表卡因此更矮更薄，靠图例和留白压住分量。
