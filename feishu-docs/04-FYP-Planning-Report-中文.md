# FYP Planning Report：A 股 LLM 交易 Agent 评测与训练场

> 来源：https://bcnd63yb3pzy.feishu.cn/wiki/SiuXwEuvwikkmEkkTZVcSwHpnBd
> 导出时间：2026-10-16 ｜ 由飞书知识库导出为 Markdown

---

# Project Goal（项目目标）

做一套**公开、可持续运行**的 LLM 交易 Agent 评测与训练设施：用户提交自己的 AI 投资 Agent 配置，它在抗污染的 A 股历史与实时数据上自主研究、决策、下单，最后交出**可核验的成绩与决策档案**。

结题前要达成三条标准：

1. **闭环能演示**：一个配置跑完模拟交易，产出净值曲线与逐笔决策档案；
2. **得出一条有区分度的结论**：模型决策质量接近，行为稳定性（决策翻转率）差异显著；
3. **不确定就说不确定**：样本不足的结论标注「不足以判断」，不给排名。

# Significance（项目意义）

**What。**给 Agent 提供规则正确的 A 股撮合与账户、抗污染数据、全量留痕的决策档案。用户提交模型、提示词、工具集与风控闸门，系统回答**这个配置哪里不可靠**。

**Who。**主要是已经在用 AI 辅助投资决策的个人（个人研究者、中小机构从业者），他们有投资经验，却没有验证 AI 结论的手段；次要使用者是开发 LLM 交易 Agent 的开发者。

**Why。**B 站 A 股版 AI 交易横评播放量 **9.5 万**；港大 [AI-Trader](https://arxiv.org/abs/2512.10971) 把 A 股纳入评测后，六个主流模型**没有一个跑赢 SSE-50 基准**。位置还空着：公开竞技场集中在加密货币和美股，A 股只有一场 40 天赛事；[TraderHarness](https://github.com/HephaestLab/TraderHarness) 覆盖 A 股且开源，却只做本地工具。

# Problem Statement（问题陈述）

**判断结论是否可靠，目前没有依据。**现有工具给出结论，却不给可回溯的过程：结论来自哪些数据、重跑会不会变、照着做能不能赚钱，都答不上来。

**收益作为唯一标准，信号最弱。**[TradeRank](https://www.traderank.ai/llm-trading-benchmark) 九个赛季、2,826 笔交易里只有 **46.2%** 的模型-赛季盈利；A 股实测中六个模型全部跑输基准。样本内夏普好看、样本外由正转负，榜单不报样本内外差异与统计显著性，看不出多少是噪音。

**评测协议本身不可信。**模型可能用训练记忆认出被测的时间段和公司，等于开卷考试；通用回测框架不以 A 股规则为目标，T+1、涨跌停、集合竞价、除权都要重写。时点泄漏已在 issue 里提出，却没人做成可持续的复算设施。

<callout emoji="💡">
**本项目要回答的问题**：能否把评测从「比谁赚得多」改成可核验、可复现的绩效测量？
</callout>

# Proposed Solutions（方案与交付物）

方案以 A 股为起点，把评测与训练合到一个场子里，能力分三层。基础能力（入场券）：行情财务数据、个股分析、报告生成、MCP 与 Skill。训练场核心（创新点载体）：撮合引擎、模拟账户、决策留痕、抗污染、多 Agent 同场、指标集。差异化（别人做不了的）：体检报告、工具消融、榜单暴露效应、合成市场。

| 编号 | 交付物 | 验收标准 |
|-|-|-|
| D1 | A 股撮合与账户引擎 | T+1、涨跌停、集合竞价、费用、除权规则正确 |
| D2 | 抗污染数据层 | 数据出口强制时点掩码，实体匿名化，泄漏审计无发现 |
| D3 | 决策留痕账本 | 每次决策的理由、依据、工具调用与结果全量留痕 |
| D4 | 指标集与体检报告 | 收益、风险、归因加过程指标；样本内外分开；20 日以下不排名 |
| D5 | 多 Agent 同场与工具消融 | 统一资金与规则、账户隔离、实时排名；可做消融 |
| D6 | 最小闭环 Demo 与开源仓库 | 建 Agent、参赛、看净值、导出报告端到端跑通 |

# Proposed Timelines（进度安排）

排期按 2026-2027 学年两个学期展开，每学期 12 周：第 1 学期为 2026 年 9 月至 12 月初，第 2 学期为 2027 年 1 月至 4 月。本学期需交三份材料，已标注在表内。

<table><colgroup><col/><col/><col/></colgroup><thead><tr><th vertical-align="top">学期</th><th vertical-align="top">周次</th><th vertical-align="top">主要工作与产出</th></tr></thead><tbody><tr><td rowspan="3" vertical-align="top">第 1 学期</td><td vertical-align="top">第 1-4 周（9 月）</td><td vertical-align="top">竞品实测与赛道定位；<b>9 月 30 日提交 Planning report</b></td></tr><tr><td vertical-align="top">第 5-8 周（10 月）</td><td vertical-align="top">竞品调研收口、产品方案定稿；<b>10 月 31 日提交中间进度报告</b></td></tr><tr><td vertical-align="top">第 9-12 周（11 月至 12 月初）</td><td vertical-align="top">技术方案调研，含数据源、撮合引擎、抗污染、评测协议；进入开发；<b>12 月 2 日提交期末报告</b></td></tr><tr><td rowspan="4" vertical-align="top">第 2 学期</td><td vertical-align="top">第 1-3 周（1 月）</td><td vertical-align="top">数据层、A 股撮合引擎、模拟账户与净值（D1）</td></tr><tr><td vertical-align="top">第 4-6 周（2 月）</td><td vertical-align="top">抗污染数据层：时点掩码、实体匿名化（D2）；决策留痕账本（D3）</td></tr><tr><td vertical-align="top">第 7-8 周（3 月上半月）</td><td vertical-align="top">指标集与体检报告、多 Agent 同场与工具消融（D4、D5）；<b>第 8 周产出：投资 Agent 在历史交易场与实时交易场上的真实收益</b></td></tr><tr><td vertical-align="top">第 9-12 周（3 月下半月至 4 月）</td><td vertical-align="top">Demo 与复盘档案、回归测试；盲跑组与榜单暴露效应实验；开源发布与结题材料（D6）</td></tr></tbody></table>

**风险已预留**：榜单与体检报告分开统计；首版不做合成市场；先占 A 股。不构成投资建议。
