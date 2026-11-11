# 开源 AI 投资框架：模拟盘 / 跑分 / 训练能力对比

> 调研时间：2026-09-21 ｜ 方法：GitHub API 实测 — 8 个头部框架 README 全文 + 6 组 issue 检索 + 4 组补充搜索
> 命题：TradingAgents、QuantDinger 等开源 AI 投资框架，有没有提供"让 AI 跑分、训练"的模拟盘服务？这是不是它们欠缺的？

---

## 0. 结论

**是。这是它们集体缺失的一块，而且是结构性缺失。**

但要精确区分三件事：
- **回测（backtest）**——它们**都有**：TradingAgents、ai-hedge-fund、Qlib、FinRL 全都有。
- **持续运行的 forward 模拟盘**——**基本没有**：只有 QuantDinger（且只覆盖 crypto/美股，**不含 A股**），以及 TradingAgents-CN 的一个**半成品附属功能**（bug 成堆、两个月未更新）。
- **AI 跑分 / 排行榜 / 训练轨迹**——**0 个**。搜索 "paper trading agent leaderboard A-share" 结果为空。

---

## 1. 逐项实证

| 框架 | Stars | 历史回测 | 持续模拟盘 | 跑分/排行榜 | 训练能力 | A股/港股 |
|---|---|---|---|---|---|---|
| **TradingAgents** | 107,889 | ✅ | ❌ | ❌ | ❌ | ❌ |
| **ai-hedge-fund** | 63,643 | ✅ | ❌（README 曾夸大） | ❌ | ❌ | ❌ |
| **OpenBB** | 73,335 | ❌ | ❌ | ❌ | ❌ | △ |
| **Qlib** | 48,713 | ✅ | ❌ | ❌ | ✅ 模型训练 | △ |
| **RD-Agent** | 14,703 | △ | ❌ | ✅（但评的是 Agent 工程能力，不是炒股） | ✅ | △ |
| **FinRL** | 16,364 | ✅ | ❌ | ❌ | ✅ **RL** 训练 | ❌ |
| **TradingAgents-CN** | 31,917 | ✅ | ⚠️ 半成品 | ❌ | ❌ | ✅ A股 |
| **QuantDinger** | 11,720 | ✅ | ✅ crypto / 美股 | ❌ | ❌ | ❌ A股仅行情 |

> README 关键词取证：TradingAgents 全文无 "paper trading" / "leaderboard" / "模拟" / "虚拟"；ai-hedge-fund 全文无上述任一；OpenBB 全文只有 "dataset" 一次；Qlib 无 paper trading 与 simulation。

---

## 2. 两条决定性证据（用户"求而不得"）

### ① ai-hedge-fund issue #667（2026-07-11）
> **「Root README overstates paper/live/persistent trading capability versus roadmap status」**
> —— README 夸大了它的 paper / live / 持久化交易能力，与实际 roadmap 不符。

63k stars 的头部项目，用户冲着"paper trading"进来，发现**根本没有**，于是提了这个问题。
至今仍在补救：issue #714（2026-09-19，两天前仍在 open）
> 「Harden educational **paper path**: CI, ledger continuity, paper broker, daemon, personas, quant models」

### ② TradingAgents issue #805（still open，2026-09-07）
> **「Temporal Knowledge Leakage in LLM Backtesting（Model-Level Future Information Contamination）」**

用户已经在抱怨：**LLM 回测存在时间维度的知识泄漏**——模型在训练数据里见过这段行情，回测等于开卷考试。
这条 issue 恰好证明了"回测无法替代模拟盘跑分"，而且是社区自己提出的。

另外还有 issue #119「Where is the backtesting ?」——连回测都不好找。

---

## 3. TradingAgents-CN 有模拟盘，为什么不算？

它确实有一句「模拟交易系统：虚拟交易环境，验证投资策略效果」，但：
- 只是长长 feature 列表里的**一行**；
- 相关 issue 几乎全是 **BUG**：
  - #768 `[BUG] 模拟交易-初始化账户-异常报错`
  - #667 `[BUG] 模拟交易并发买入导致可用资金扣减异常`
  - #622 `[BUG] 在浏览器模拟交易菜单路径下回车后 403`
  - #668 `Fix cash deduction logic in paper.py`
- 它是**给你手动记账**的模拟器，**不是让 AI 自主跑**；没有多 Agent 同场、没有跑分、没有排行；
- repo 已**两个月未更新**（最后推送 2026-07-24）。

→ 属于"有这个功能"但绝不是"这项服务"。

---

## 4. 为什么回测不能顶替模拟盘跑分（核心论证）

| 维度 | 历史回测 | Forward 模拟盘 |
|---|---|---|
| 作弊成本 | **极高偏低**——LLM 训练语料里就有这段行情（TradingAgents #805 正在抱怨） | 极低——向前跑，未来数据尚未产生 |
| 选股 vs 选时 | 回测通常先**给定标的**，AI 只需判断买卖点 | 必须**从全市场自选**，更接近真实决策 |
| 行为一致性 | 一次性 | 连续数十个交易日暴露止损纪律、风格漂移、情绪化决策 |
| 可公证性 | 可调区间、调参数刷分 | 每天公开跑，无法挑选窗口 |
| 能不能"training" | 静态 | 持续产出带时间戳的决策轨迹数据 |

**一句话：模拟盘不是"更好的回测"，它是唯一作弊成本足够低的评测方式。**

---

## 5. A股衍生生态：一堆投研框架，零个竞技场

基于 TradingAgents 改造的 A股项目（说明需求真实存在）:

| 项目 | Stars | 定位 |
|---|---|---|
| simonlin1212/TradingAgents-astock | 3,392 | A股多 Agent 投研，7 位分析师按 A股规则辩论 |
| qusong0627/QuantMind | 1,517 | 集成 Qlib + RD-Agent + TradingAgents 的量化平台 |
| TNT-Likely/PanWatch（盯盘侠） | 1,095 | **AI 盯盘助手**：TradingAgents 决策 + A/港/美股实时监控 + 持仓管理 + 全渠道推送 |
| KylinMountain/TradingAgents-AShare | 839 | 15 名 Agent 模拟机构协作与对抗辩论 |

> ⚠️ **注意 PanWatch（1,095★，今天仍在更新）**：它的定位和我们的 P0「盯盘 + 推送 + 三市场」高度重叠，是**真实竞品**，需要单独跟进分析。它没有模拟盘跑分，但它的前端体验与推送闭环可能比我们早。

**搜索 "StockBench trading agent"、"paper trading agent leaderboard A-share"：均为 0 结果。**

---

## 6. 所以我们的位置在哪：四层阶梯

```
L3  抗污染评测 + 公开跑分 + 决策证据留痕      ← 空缺，我们的位置
L2  持续运行的 forward 模拟盘                 ← QuantDinger(crypto/US)、TradingAgents-CN(半成品)
L1  历史回测 + 单次 DR训练                    ← TradingAgents 107k / ai-hedge-fund 63k / Qlib 48k / FinRL 16k
L0  数据平台 + 投研 Agent                     ← OpenBB 73k / RD-Agent 14k
```

**上面三层全都站满了人，最上面那层是空的。**

而且 L2→L3 的跨越有真实门槛，不是"加个页面"就行：需要时点掩码、日期与公司匿名化、确定性回放、A股/港股撮合规则、决策留痕格式——这正是所有框架都没啃的硬骨头。

---

## 7. 最终判断

**是的，这就是它们欠缺的，而且是最难被快速补上的那一块。**

理由不是"它们没想到"（有人在 issue 里点名要），而是**结构性原因**：
- TradingAgents / ai-hedge-fund / Qlib：**学术论文/教程 Demo 出身**，目标是"跑通一次决策"，不是"长期托管一个账户"；
- QuantDinger：路线锁定在 crypto + 传统券商的实盘闭环，A股 Data only，且已转向多租户计费 SaaS；
- OpenBB：**纯数据**，不做交易模拟（商业模式在数据服务）；
- 所有中文衍生：**投研/盯盘**导向，做的是"帮人看"，不是"让 AI 练"。

**唯一提醒**：这条路的价值不在"模拟盘"三个字，而在于它是唯一能证明"AI 真的会投资"、且能被公开核验的方式。谁先把**公信力**建立起来，谁就占住这层——而公信力需要时间积累，**先发优势是真实且可防守的**。
