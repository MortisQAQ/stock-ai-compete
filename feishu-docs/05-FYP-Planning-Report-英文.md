# FYP Planning Report

> 来源：https://bcnd63yb3pzy.feishu.cn/wiki/LxmfwctMsiZLwGkGPYTcOUEKn7d
> 导出时间：2026-10-16 ｜ 由飞书知识库导出为 Markdown

---

# Project Goal

Build a **public, continuously running** evaluation and training facility for LLM trading agents. Users submit their own AI investment agent configuration; it researches, decides and trades on contamination-resistant A-share historical and live data, and returns **a verifiable scorecard and a full decision record**. Out of scope: live trading, a general-purpose backtesting engine, and per-stock recommendations.

Three criteria define success by the end of the project:

1. **A demonstrable loop**: one configuration completes a simulated trading period and produces an equity curve and a per-trade decision record;
2. **One discriminating result**: competing models score similarly on decision quality but differ sharply on behavioural stability (decision flip rate);
3. **Uncertainty stated as such**: conclusions with too few samples are labelled "insufficient evidence" and left unranked.

# Significance

**What.** The facility gives an agent rule-correct A-share matching and accounting, contamination-resistant data, and a fully logged decision record. Users submit a model, prompt, tool set and risk gate; the system reports **where that configuration is unreliable**.

**Who.** Primary users are individuals already using AI to support investment decisions, including independent researchers and practitioners at small institutions; they have investment experience but no way to check whether an AI conclusion holds up. Secondary users are developers building LLM trading agents.

**Why.** An A-share AI trading comparison on Bilibili reached **95,000 views**; when HKU's [AI-Trader](https://arxiv.org/abs/2512.10971) added A-shares to its benchmark, **none of six mainstream models beat the SSE-50 baseline**. The slot is open: public arenas concentrate on crypto and US equities, A-shares have seen one 40-day competition, and [TraderHarness](https://github.com/HephaestLab/TraderHarness) covers A-shares and is open source yet stays a local tool.

# Problem Statement

**There is no basis for judging whether a conclusion is reliable.** Existing tools give conclusions without a traceable process: which data produced it, whether a rerun would change it, and whether following it would have made money all go unanswered.

**Return as the only standard is the weakest signal.** Across nine seasons and 2,826 trades on [TradeRank](https://www.traderank.ai/llm-trading-benchmark), only **46.2%** of model-seasons were profitable, and on A-shares all six tested models underperformed the index. A strategy can post a flattering in-sample Sharpe and turn negative out of sample; a leaderboard that omits the split and any significance test shows the reader very little.

**The evaluation protocol itself is untrustworthy.** A model may recognise the tested period and companies from training memory, which makes the test open-book, and general backtesting frameworks do not target A-share rules, so T+1, price limits, call auction and dividend adjustments must be rewritten. Point-in-time leakage is raised in issue trackers, but nobody has turned it into a sustainable, reproducible facility.

<callout emoji="💡">
**The question this project answers**: can evaluation move from which model earned most to a verifiable, reproducible measurement of performance?
</callout>

# Proposed Solutions

The proposal starts with A-shares and combines evaluation and training in one place, with capability in three layers. Baseline (entry ticket): market and financial data, single-stock analysis, report generation, MCP and Skills. Arena core (carries the innovation): matching engine, simulated accounts, decision logging, contamination resistance, multi-agent co-trading, metric set. **Differentiating layer** (what others cannot build): health report, tool ablation, leaderboard exposure effect, synthetic markets.

| # | Deliverable | Acceptance test |
|-|-|-|
| D1 | A-share matching and accounting engine | T+1, price limits, call auction, fees, dividend adjustments correct |
| D2 | Contamination-resistant data layer | Point-in-time masking at every exit, entity anonymisation, leak audit clean |
| D3 | Decision ledger | Reasoning, evidence, tool calls and outcome logged for every decision |
| D4 | Metric set and health report | Return, risk and attribution plus process metrics; in-sample and out-of-sample separate; no ranking below 20 days |
| D5 | Multi-agent co-trading and tool ablation | Shared capital and rules, isolated accounts, live ranking; ablation supported |
| D6 | Minimum loop demo and open-source repository | Create agent, enter, view equity, export report, end to end |

# Proposed Timelines

The schedule runs across the two terms of 2026-27, 12 weeks each: Term 1 from September to early December 2026, Term 2 from January to April 2027. Three submissions are due this term and are marked in the table.

<table><colgroup><col/><col/><col/></colgroup><thead><tr><th vertical-align="top">Term</th><th vertical-align="top">Weeks</th><th vertical-align="top">Work and output</th></tr></thead><tbody><tr><td rowspan="3" vertical-align="top">Term 1</td><td vertical-align="top">Weeks 1-4 (September)</td><td vertical-align="top">Competitor teardown and track positioning; <b>Planning report submitted 30 September</b></td></tr><tr><td vertical-align="top">Weeks 5-8 (October)</td><td vertical-align="top">Competitor research closed, product plan finalised; <b>mid-term progress report submitted 31 October</b></td></tr><tr><td vertical-align="top">Weeks 9-12 (November to early December)</td><td vertical-align="top">Technical research covering data sources, matching engine, contamination resistance and the evaluation protocol; development begins; <b>term-end report submitted 2 December</b></td></tr><tr><td rowspan="4" vertical-align="top">Term 2</td><td vertical-align="top">Weeks 1-3 (January)</td><td vertical-align="top">Data layer, A-share matching engine, simulated accounts and equity (D1)</td></tr><tr><td vertical-align="top">Weeks 4-6 (February)</td><td vertical-align="top">Contamination-resistant data layer: point-in-time masking, entity anonymisation (D2); decision ledger (D3)</td></tr><tr><td vertical-align="top">Weeks 7-8 (early March)</td><td vertical-align="top">Metric set and health report, multi-agent co-trading and tool ablation (D4, D5); <b>week 8 output: real returns from the investment agent on historical and live arenas</b></td></tr><tr><td vertical-align="top">Weeks 9-12 (late March to April)</td><td vertical-align="top">Demo and review archive, regression tests; blind cohort and leaderboard exposure experiment; open-source release and final materials (D6)</td></tr></tbody></table>

**Risks handled up front**: the leaderboard and the health report are scored separately; the first version skips synthetic markets; A-shares come first. Not investment advice.
