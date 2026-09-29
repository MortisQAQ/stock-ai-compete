# 开源 AI 投研平台：优势与劣势在哪

> 调研时间：2026-09-25 ｜ 方法：15 个项目 README 全文关键词扫描 + GitHub 页面/commits 实测抓取
> 对照基线：本项目 2026-09-19 / 09-21 两份调研（同花顺 vs QuantDinger、模拟盘可行性）
> 口径：star/fork/issue 为当日实测；标「旧值」的表示本次未抓到、沿用 09-21 数据。

---

## 0. 一句话结论

**开源阵营已经把"接免费行情接口 + 多智能体分析 + 出买卖建议"这三件事做成了标配，这不是我们的机会。**

它们真正缺的还是老三样：**数据授权、投资建议的可核验性、以及"跑一段时间"的评测环境**。

> ⚠️ **代码级复核后的修正**：翻完 TradingAgents 与 astock 的源码，它们**已经有评测、也有决策账本**（v0.5.0 的 `backtest.py` + `decision_log.py`，astock 的 `performance.py`，见第 6 节）。
> 真正空着的不是"有没有评测"，而是**交易层**：不撮合、不记账、不算净值。第 3 条已按此改写。

但 4 天里有三个变化值得警惕：
- **PanWatch 涨了 665★（1,095 → 1,760）**，是全表增速最快的，定位和我们的 P0 几乎重合；
- **中文衍生已经开始做产出物**（TradingAgents-CN、astock 都能导出 PDF/Markdown 报告），"能出报告"不再是独占卖点；
- **MCP 已成入场券**（QuantDinger README 里 "mcp" 出现 22 次），不是差异化。

---

## 1. 赛道实况（2026-09-25 实测）

| 项目 | Stars | Forks | Open issues | 最近提交 | 较 09-21 | 定位 |
|---|---|---|---|---|---|---|
| TradingAgents | 108,427 | 20,766 | 83 | 09-24 | +538 | 多智能体交易框架（学术出身） |
| OpenBB | 73,436 | 7,602 | 53 | **07-20** | +101 | 开放数据平台 + Agent 接口 |
| ai-hedge-fund | 63,733 | 11,174 | 54 | 09-24 | +90 | AI 对冲基金团队 Demo |
| Qlib | 48,816 | 7,728 | 304 | 09-16 | +103 | 微软量化平台，强在模型训练 |
| TradingAgents-CN | 31,962 | 6,684 | **223** | — | +45 | 中文金融多智能体（A股研报型） |
| FinRL | 16,390 | 3,513 | 289 | — | +26 | 强化学习金融 |
| RD-Agent | 14,739 | 1,930 | 100 | — | +36 | 微软，自动 RD + 有评测榜 |
| **QuantDinger** | **12,101** | 2,473 | 22 | 09-24 | **+381** | 全栈量化 OS（crypto-first） |
| ValueCell | 11,023 | 1,804 | 64 | **03-09** | — | 社区多智能体金融应用 |
| TradingAgents-astock | 3,392（旧值） | — | — | 09-21 | — | A股多 Agent 投研 |
| **PanWatch（盯盘侠）** | **1,760** | 320 | 48 | — | **+665** | **AI 盯盘 + 三市场 + 全渠道推送** |
| QuantMind | 1,617 | 361 | 21 | 09-24 | +100 | Qlib + RD-Agent + TradingAgents 打包 |
| TradingAgents-AShare | 839（旧值） | — | — | 09-17 | — | 15 Agent 模拟机构协作 |
| TraderHarness | 39 | 1 | 1 | 08-22 | — | 抗污染回测 + 训练轨迹（非竞品） |
| alpha-pilot | 37 | 0 | 8 | 09-23 | +1 | A股 AI 模拟盘交易赛车 |

> 数据源命中（README 全文扫描）：FinRL 命中 10 个（akshare/tushare/yfinance/baostock/ccxt/alphavantage/finnhub/米筐/聚宽/FMP）；TradingAgents-CN 用 akshare + tushare + baostock；astock 用 tushare + 东方财富；QuantDinger 用 akshare + yfinance + ccxt；TradingAgents 原生只有 yfinance + Alpha Vantage。

---

## 2. 它们的优势（要尊重对手）

1. **数据成本几乎为零，且已成标配。** AkShare / Tushare / baostock / yfinance / efinance 这一层开源接口，把"拿到行情和财报"的门槛压到了 0。我们在这上面花多少力气都不构成差异。
2. **社区规模就是免费分发。** TradingAgents 108k★，4 天 +538。闭源产品要花真金白银买量，它们靠一篇论文和一个 README 就获得了全球注意力。**但要清醒：star ≠ 用户，更 ≠ 留存。**
3. **可自托管、可改造。** 源码在手，数据不出本地，能 fork 能改。这是闭源结构性做不到的，也是它们对隐私敏感用户的绝对优势。
4. **衍生生态自己会长。** 光 TradingAgents 的 A股衍生就有 astock、AShare、QuantMind 等一堆，需求被社区自发验证过了——说明赛道是真的，但也说明这块地已经不空了。
5. **工程底子有真东西。** Qlib 的模型训练与因子流水线、RD-Agent 的自动迭代与评测榜、FinRL 的 RL 训练，这些是十年积累，我们从零做没有意义，能接就接。
6. **全栈闭环只有 QuantDinger 做到了**：策略 → 回测 → paper → 实盘，外加计费、多租户、OAuth。它的商业化基建是"一次性给全"的，4 天 +381★ 说明市场认可。

---

## 3. 它们的劣势（我们的机会）

1. **数据源全是非授权免费接口。** 延迟、口径、可持续性都是隐患；Tushare 要积分、东财接口随时变。**商用授权这条线，没有一个人正面解决过。**（同花顺有交易所行情许可，我们至少可以做到 BYOK + 字段级来源标注。）
2. **有评测，但评的是"评级准不准"，不是"能不能赚钱"。**（此条已按源码修正，详见第 6 节）QuantDinger 有 paper 交易但不含 A股，TradingAgents-CN 的模拟盘是 bug 成堆的半成品。真正空着的，是**带撮合、带仓位、带净值的交易层评测**——TradingAgents 社区自己也在抱怨回测的时间泄漏（issue #805，9 月仍 open）。
3. **投资建议不可核验。** 多智能体辩论完直接给 BUY/SELL + 置信度，没有 citation、不能复算、没有决策账本和到期归因。**"它说得对不对"这个问题，全行业没人能回答。**
4. **产出物意识刚刚萌芽，还很粗。** TradingAgents-CN 和 astock 已经能导出 PDF/Markdown 报告，但都停在"把聊天内容存成文件"这一层，没有模板化、可分享、可交付的产出物系统。
5. **部署门槛仍然高。** Docker + PostgreSQL + Redis + 一堆 API Key 才能跑全功能；中文衍生项目同样一堆环境变量。
6. **A股在头部项目里还是二等公民。** QuantDinger 明确 `CN Stock: Data only`；TradingAgents 原生只接 yfinance 和 Alpha Vantage。A股那套特色数据（资金分层、龙虎榜席位、北向、涨跌停、连板情绪）在开源侧基本是空白。
7. **维护质量两极分化。** TradingAgents-CN 挂着 223 个 open issue；ValueCell 11k★ 但半年没提交；OpenBB 主体 2 个月没动。**star 高不等于活得久。**
8. **合规是真空地带。** 它们敢直接给个股买卖建议——这在持牌语境下是红线。我们做得"更规范"看起来是束缚，其实是可以变成信任资产的东西。

---

## 4. 对我们的定位修正（重要）

09-19 那份文档把「产出物」列为 ★★★★★ 核心卖点，现在要下调半档：

| 原判断 | 修正后 |
|---|---|
| 产出物是独占卖点 | **不再是独占**，中文衍生已经能做基础报告导出。我们的差异要在"带证据链、可复算、可交付"上，而不是"能导出 PDF" |
| Skills + MCP 是差异化 | **已经是入场券**，QuantDinger 一个 README 里 22 次提到 MCP |
| 盯盘 + 推送是我们的地 | **PanWatch 正在抢**，4 天 +665★，且移动端和推送闭环做得比我们早 |
| 模拟盘跑分是空白 | **半修正**：评测与决策账本已被 TradingAgents/astock 做了，但**交易层（撮合/仓位/净值）仍是空白**，窗口在收窄（20+ 项目在爬） |
| 决策账本 + 自动复盘是独占 | **不再是独占**：TradingAgents 的 decision_log + reflection 已是完整雏形。差异要挪到"可复算 + 可复现 + 带真实交易结果" |

唯一没被削弱的，还是那三件事：**数据授权与血缘、可核验的决策账本、抗污染的跑分评测。**

---

## 6. 代码级取证：它们的评测到底长什么样

本地源码复核（浅克隆）显示，`TradingAgents` v0.5.0（2026-09）和 `astock` 都配了评测，形态高度一致：

| | TradingAgents | astock |
|---|---|---|
| 入口 | `tradingagents/backtest.py`；CLI `tradingagents backtest NVDA,AAPL --start ... --every 7` | `tradingagents/performance.py` |
| 做法 | 对（标的 × 日期）网格逐格跑一次决策 | 汇总决策日志里已结算的记录，零 LLM 成本 |
| 记录 | `decision_log.py`：append-only markdown，日期/代码/评级/pending | 同一套 TradingMemoryLog |
| 结算 | 下次跑同一票时拉真实行情回填 raw 收益与 alpha（对区域基准） | 对沪深 300 算 alpha |
| 指标 | 按评级分组：方向命中率 + 平均 alpha | 胜率 + 盈亏；样本 < 20 直接声明是噪音 |
| 复盘 | reflection 写回日志，并按「同标的 5 条 + 跨标的 3 条」注入下次 prompt | 同左 |

**它们自己划的边界（源码原话）**：
- TradingAgents `backtest.py` 开头：*「It is not a portfolio simulator, and **must not grow one**」*——没有成交数量、成交价、现金账本，因此格子之间互相独立、持仓不结转。
- astock `performance.py`：*「**这不是回测**……持有窗口互相重叠、没有仓位管理、没有交易成本……所以这里不算夏普、不做年化」*。

→ **空缺说得更准了**：不是"没人做评测"，而是没人做**交易层**（撮合、仓位、现金、成本、净值曲线、可复现回放）。这一层是被它们**主动让出来的**——一个写进代码注释，一个写进 README。

仍成立的两条：
- 数据层的 look-ahead 它们做了（一堆 `test_*_lookahead.py` 与 point-in-time 测试），**模型层的记忆泄漏没做**，issue #805 仍 open；
- 单样本采样、文本 feeds 不归档，README 自述 *「indicative rather than repeatable」*——**结果不可复现**。

---

## 5. 风险提示

1. **窗口在收窄。** 头部 4 天涨 500★，PanWatch 这种垂直竞品涨得更快。节奏比功能完整性更重要。
2. **别在"接数据源"上刷存在感。** 免费接口谁都能接，接得多只是把别人的天花板平移过来。
3. **star 会骗人。** 判断竞品要看最近提交、open issue 数、issue 响应速度——ValueCell 11k★ 半年不动，TradingAgents-CN 223 个 open issue，这些才是真实信号。
