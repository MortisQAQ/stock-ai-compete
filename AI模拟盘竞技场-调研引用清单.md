# AI 模拟盘竞技场调研 · 引用清单

> 配套文档：`AI模拟盘竞技场-全网调研.md`
> 调研日期 2026-09-25 · 所有数据均为当日抓取

本文档只做一件事：把调研里每一条结论对应的原始出处记下来，方便回头核对、引用或二次深挖。

## 可信度分级（每条后面标注）

| 标记 | 含义 |
|:---:|---|
| **A** | 接口实测值。GitHub REST API / B 站搜索 API 直接返回的字段（星数、提交日期、播放量），可复现 |
| **B** | 搜索引擎返回了该页面的正文摘要，内容取自原文片段 |
| **C** | 仅从搜索结果标题或第三方转述获得，未逐条打开原文验证 |

---

## 一、已经跑起来的公开竞技场

### nof1 Alpha Arena（鼻祖，2025-10 开赛，已停办）

- 赛事本体：https://nof1.ai ｜ 百度百科词条（含赛程与最终结果）：https://baike.baidu.com/item/Alpha%20Arena/66965037 `C`
- **Season 1 最终榜与停办状态**（本文 Season 1 / 1.5 全部数字取自此页）：
  https://www.traderank.ai/alpha-arena-leaderboard `B`
- Season 1 详细复盘（各模型交易笔数、胜率、手续费、夏普）：
  https://www.gateex.cc/post/status/16069839 `B`
- 国信证券研报对该赛事的解读（图表与过程描述）：
  https://ima.qq.com/wiki/?shareId=4d027d45207ee829d9ca5ab2c3cf64bacded0201214fd1452d47a1358ff96f8d `C`

### TradeRank.ai（当前最活跃，Season 9 在跑）

- 首页（Season 9 实时榜、模型阵容、距 BTC/标普基准对比）：https://www.traderank.ai/ `B`
- 排名方法 + 各厂商历史赛季战绩表：https://www.traderank.ai/best-llm-for-trading `B`
- Alpha Arena 归档榜：https://www.traderank.ai/alpha-arena-leaderboard `B`

### TradingArena.ai（双口径评分）

- 榜单与"方向命中率独立于是否执行"的评分规则：https://www.tradingarena.ai/leaderboard `B`

### AI Trading Competition / Bot Analysis Arena（bot 人格 × 模型矩阵）

- 战绩页（含口径弱点自述：收盘估值不补交易周期、未扣交易成本）：
  https://aitradingcompetition.com/standings.html `B`
- 配套开放数据集仓库：https://github.com/ckamelhar-collab/ai-trading-arena-data `A`

### 华泰柏瑞杯 · 全国首届 ETF AI 交易巅峰赛（国内首个，2026-06-11 ~ 07-20）

- 启动报名与三条参赛路径：https://www.sohu.com/a/1032387698_120988533 `B`
- 开赛报道（三大模式、奖金、榜单设置）：https://www.toutiao.com/article/7649557712522445354/ `B`
- **赛事结果与双榜前三名收益率**：
  https://gu.qq.com/resources/shy/news/detail-v2/index.html?id=SN20260723161717a6e1e2f2 `B`
- 另一篇结果报道（含持仓统计：沪深300ETF 1314 人、A500ETF 639 人）：
  https://gu.qq.com/resources/shy/news/detail-v2/index.html?id=SN20260723172439954e5b18 `B`
- "自带 Agent 参赛"路径与官方 Skills 说明（"交易小龙虾"）：
  https://m.sohu.com/a/1035191553_120109837 `B`

---

## 二、开源项目（全部为 GitHub API 实测，`A`）

### 最值得深读的两个

| 项目 | 链接 | ★ | 最后提交 |
|---|---|---:|---|
| **HephaestLab/TraderHarness** | https://github.com/HephaestLab/TraderHarness | 39 | 2026-08-22 |
| **mamawai/wtfibought** | https://github.com/mamawai/wtfibought | 136 | 2026-09-24 |

**TraderHarness 相关资源**
- 文档站（含中文指南与 masking AB 实验）：https://hephaestlab.github.io/TraderHarness/
- Agent 炒股回测完整中文指南：https://hephaestlab.github.io/TraderHarness/zh/guides/agent-stock-backtesting/
- 免 Key 体验 Masked vs Unmasked：https://hephaestlab.github.io/TraderHarness/zh/masking-ab-showcase/
- PyPI 包：https://pypi.org/project/traderharness/
- HuggingFace 数据集 `traderharness-ashare-5y`：https://huggingface.co/datasets/ANTICH/traderharness-ashare-5y
- 关键文档（仓库内）：`docs/paper-trading.md`（每日模拟盘 1–4 Agent 同场）、`docs/comparison.md`（与 TradingAgents / StockBench / Qlib 的边界）

**wtfibought 相关资源**
- 线上站：https://wtfibought.com
- 项目介绍站：https://intro.wtfibought.com

### 结果记录型仓库（"把结果记进 GitHub"的范本）

| 项目 | 链接 | ★ | 最后提交 |
|---|---|---:|---|
| **xsunsim/AgentStockBenchmarkResults** | https://github.com/xsunsim/AgentStockBenchmarkResults | 16 | 2026-09-22 |
| **ProjectDXAI/continuous-record-llm-trading-agents** | https://github.com/ProjectDXAI/continuous-record-llm-trading-agents | 80 | 2026-09-10 |

- xsunsim 的 GitHub Pages 交互看板：
  https://xsunsim.github.io/AgentStockBenchmarkResults/agentstockbench_model_update_20260920/bmr_codex/dashboard/interactive.html
- DXRG 论文 arXiv:2609.05663：https://arxiv.org/abs/2609.05663
- DXRG 研究主页（数据集入口）：https://www.dxrg.ai/research

### Alpha Arena 复刻系（多数已停更）

| 项目 | 链接 | ★ | 最后提交 | 状态 |
|---|---|---:|---|---|
| HammerGPT/Hyper-Alpha-Arena | https://github.com/HammerGPT/Hyper-Alpha-Arena | 1175 | 2026-05-13 | Hyperliquid/币安合约 |
| AmadeusGB/alpha-arena | https://github.com/AmadeusGB/alpha-arena | 630 | 2025-10-20 | **建仓当天停更** |
| etrobot/open-alpha-arena | https://github.com/etrobot/open-alpha-arena | 595 | 2026-08-03 | 纸面交易已完成 |
| 195440/nof1.ai | https://github.com/195440/nof1.ai | 688 | 2026-05-15 | 复刻 |
| oficcejo/alpha-arena-okx | https://github.com/oficcejo/alpha-arena-okx | 340 | 2026-07-27 | 接欧易 |
| gameworkerkim/vibe-investing | https://github.com/gameworkerkim/vibe-investing | 334 | 2026-09-24 | 含 Alpha Arena 栏目，站点 https://vibequant.cc/ |
| kojott/LLM-trader-test | https://github.com/kojott/LLM-trader-test | 145 | 2025-12-29 | 含回测框架 |
| ryan-yuuu/crypto-trading-arena | https://github.com/ryan-yuuu/crypto-trading-arena | 128 | 2026-07-08 | 停更 2 月 |
| NoFxAiOS/nofx | https://github.com/NoFxAiOS/nofx | 12958 | 2026-09-05 | AI 交易终端助手（非竞技场） |
| qingshungLI/Super-nof1.ai | https://github.com/qingshungLI/Super-nof1.ai | 39 | 2025-12-16 | |
| Moshiii/Alpha-Arena-Lite | https://github.com/Moshiii/Alpha-Arena-Lite | 59 | 2025-12-03 | |
| okay456okay/nof1.ai.monitor | https://github.com/okay456okay/nof1.ai.monitor | 56 | 2025-10-29 | 赛事监控通知 |
| midnightnnn/llm_invest | https://github.com/midnightnnn/llm_invest | 7 | 2026-06-27 | Multi-LLM 论文交易竞技 |

---

## 三、B 站视频（搜索 API 实测播放量，`A`）

链接格式统一为 `https://www.bilibili.com/video/<BV号>`

| 视频 | UP | 播放 | 链接 |
|---|---|---:|---|
| **我给 8 个顶级 AI 各 10 万炒 A 股，10 天后谁赢了？** | Byron爱睡觉 | 94,719 | https://www.bilibili.com/video/BV1gojB6iEKV |
| 【横测】谁是做量化交易最好用的大模型 | frank-quant | 173,046 | https://www.bilibili.com/video/BV15HMS6DETZ |
| 【横测】做量化交易最好用的大模型（8 家对比） | frank-quant | 44,701 | https://www.bilibili.com/video/BV1ijYB6QE1Y |
| 手把手教你部署 AI 自动化交易 nofx | einverne | 25,454 | https://www.bilibili.com/video/BV1VH1aBtER1 |
| AI 炒币 48 小时：DeepSeek 赚 4000 刀！GPT 亏到 6000 | 神烦老狗 | 11,053 | https://www.bilibili.com/video/BV184WUzaEfJ |
| **火爆全网的 Alpha Arena…开源 Python 框架全解析** | AI量化邹老师 | 3,481 | https://www.bilibili.com/video/BV1KxW9zBEYJ |
| AITradeGame：Nof1.ai 开源版复现 | AIGCLINK | 4,026 | https://www.bilibili.com/video/BV1UZyBBAEsa |
| NOFX 大更新 + NOF1 比赛结束回顾 | 从零开始的yann | 6,999 | https://www.bilibili.com/video/BV1Pc1CBrEHm |
| 六大主流 AI 大模型，1 万美金量化交易竞赛 | JavaPub | 1,170 | https://www.bilibili.com/video/BV1mQWmzxEBr |
| AI 炒股比赛：10 天 DeepSeek 狂赚 128%，GPT-5 怒亏 58% | 硅基洞察 | 951 | https://www.bilibili.com/video/BV1vPsUz3EaD |
| DeepSeek 自动炒虚拟货币 复刻 nof1.ai | swartzlubel | 1,075 | https://www.bilibili.com/video/BV1pJCtBxEpM |
| nof1 Ai 量化交易 | web3信息工厂 | 913 | https://www.bilibili.com/video/BV1tQ19BjEo5 |
| QMT 量化交易——大模型选股（传统量化 vs 大模型量化） | 交易回战 | 24,695 | https://www.bilibili.com/video/BV1ZGNoefEh8 |

---

## 四、学术基准与论文

| 名称 | 出处 | 链接 | 状态 |
|---|---|---|---|
| **AI-Trader**（港大，自称首个 live + 无污染基准） | 解读文章 | https://medium.com/@Micheal-Lanham/ai-trader-and-the-moving-target-problem-in-financial-evaluation-04b87199523f `C` | — |
| AI-Trader 论文页 | ResearchGate | https://www.researchgate.net/publication/398675687_AI-Trader_Benchmarking_Autonomous_Agents_in_Real-Time_Financial_Markets `C` | — |
| **ulab-uiuc/live-trade-bench** | GitHub | https://github.com/ulab-uiuc/live-trade-bench `A` | 166★，2026-02-17 停更 |
| **STOCKBENCH**（清华） | 官方站 | https://stockbench.github.io `C` | 有结果页与论文 |
| STOCKBENCH 仓库 | GitHub | https://github.com/ChenYXxxx/stockbench `A` | 178★，2025-10-28 |
| **Open-Finance-Lab/AgenticTrading** | GitHub | https://github.com/Open-Finance-Lab/AgenticTrading `A` | 764★，**2026-09-24 活跃** |
| **Agent Trading Arena**（零和虚拟市场） | arXiv 2502.17967 | https://arxiv.org/html/2502.17967v2 `C` | — |
| **PolyBench**（抗污染预测市场基准） | GitHub | https://github.com/PolyBench/PolyBench `A` | 17★，2026-03-10 |
| TreLLM / TradeArena | GitHub | https://github.com/weich97/TreLLM-public `A` | 1★，2026-08-20 |
| FutureX（避免污染的 live benchmark） | 收录于 awesome 列表 | https://github.com/SAILResearch/awesome-ai-leaderboard `C` | — |

---

## 五、可选：领域的汇总列表（后续挖竞品时的入口）

- LLMQuant/awesome-trading-agents（LLM 交易 agent + MCP + skills 汇总）：https://github.com/LLMQuant/awesome-trading-agents `A`
- georgezouq/awesome-ai-in-finance（金融 AI 大列表，**其中收录了 TraderHarness**）：https://github.com/georgezouq/awesome-ai-in-finance `A`
- SAILResearch/awesome-ai-leaderboard：https://github.com/SAILResearch/awesome-ai-leaderboard `A`
- Barca0412/Introduction-to-Quantitative-Finance（含 LLM/Agent/benchmark 分区，中文）：https://github.com/Barca0412/Introduction-to-Quantitative-Finance `A` · 1769★
- virattt/ai-hedge-fund（63,734★，本轮实测）：https://github.com/virattt/ai-hedge-fund `A`

---

## 六、上一轮调研已用的合规与竞品链接（一并归档）

**数据授权与机构数据源**
- iFinD 终端介绍（清华图书馆）：https://lib.tsinghua.edu.cn/info/1184/5121.htm
- iFinD 数据特点说明：https://www.nai.edu.cn/lib/info/1032/1053.htm
- Kimi 金融行业解决方案：https://www.kimi.com/news/kimi-financial-industry-ai-solution
- Kimi 已落地工行、中信建投等：https://www.cnfin.com/cmjj-lb/detail/20260917/4471293_1.html
- 蚂蚁 AI 金融布局梳理：https://www.21jingji.com/article/20260617/herald/aafb7d1503a0ab0ba5af25e8a79c7630.html

**合规（重要，做产品时反复要用到）**
- 证监会：荐股软件监管规定：
  https://neris.csrc.gov.cn/falvfagui/rdqsHeader/mainbody?secFutrsLawId=23b100d2aa454e66924885b04f5d586b
- 上证报：券商 AI 投顾合规边界：https://www.cnstock.com/commonDetail/787641

---

## 附：链接总表（纯列表，方便复制）

```
https://nof1.ai
https://baike.baidu.com/item/Alpha%20Arena/66965037
https://www.traderank.ai/
https://www.traderank.ai/best-llm-for-trading
https://www.traderank.ai/alpha-arena-leaderboard
https://www.tradingarena.ai/leaderboard
https://aitradingcompetition.com/standings.html
https://www.gateex.cc/post/status/16069839
https://www.sohu.com/a/1032387698_120988533
https://www.toutiao.com/article/7649557712522445354/
https://gu.qq.com/resources/shy/news/detail-v2/index.html?id=SN20260723161717a6e1e2f2
https://gu.qq.com/resources/shy/news/detail-v2/index.html?id=SN20260723172439954e5b18
https://m.sohu.com/a/1035191553_120109837
https://github.com/HephaestLab/TraderHarness
https://hephaestlab.github.io/TraderHarness/
https://hephaestlab.github.io/TraderHarness/zh/guides/agent-stock-backtesting/
https://hephaestlab.github.io/TraderHarness/zh/masking-ab-showcase/
https://pypi.org/project/traderharness/
https://huggingface.co/datasets/ANTICH/traderharness-ashare-5y
https://github.com/mamawai/wtfibought
https://wtfibought.com
https://intro.wtfibought.com
https://github.com/xsunsim/AgentStockBenchmarkResults
https://github.com/ProjectDXAI/continuous-record-llm-trading-agents
https://arxiv.org/abs/2609.05663
https://www.dxrg.ai/research
https://github.com/ckamelhar-collab/ai-trading-arena-data
https://github.com/HammerGPT/Hyper-Alpha-Arena
https://github.com/AmadeusGB/alpha-arena
https://github.com/etrobot/open-alpha-arena
https://github.com/195440/nof1.ai
https://github.com/oficcejo/alpha-arena-okx
https://github.com/gameworkerkim/vibe-investing
https://github.com/kojott/LLM-trader-test
https://github.com/ryan-yuuu/crypto-trading-arena
https://github.com/NoFxAiOS/nofx
https://github.com/qingshungLI/Super-nof1.ai
https://github.com/Moshiii/Alpha-Arena-Lite
https://github.com/okay456okay/nof1.ai.monitor
https://github.com/midnightnnn/llm_invest
https://www.bilibili.com/video/BV1gojB6iEKV
https://www.bilibili.com/video/BV15HMS6DETZ
https://www.bilibili.com/video/BV1ijYB6QE1Y
https://www.bilibili.com/video/BV1VH1aBtER1
https://www.bilibili.com/video/BV184WUzaEfJ
https://www.bilibili.com/video/BV1KxW9zBEYJ
https://www.bilibili.com/video/BV1UZyBBAEsa
https://www.bilibili.com/video/BV1Pc1CBrEHm
https://www.bilibili.com/video/BV1mQWmzxEBr
https://www.bilibili.com/video/BV1vPsUz3EaD
https://www.bilibili.com/video/BV1pJCtBxEpM
https://www.bilibili.com/video/BV1tQ19BjEo5
https://www.bilibili.com/video/BV1ZGNoefEh8
https://github.com/ulab-uiuc/live-trade-bench
https://stockbench.github.io
https://github.com/ChenYXxxx/stockbench
https://github.com/Open-Finance-Lab/AgenticTrading
https://arxiv.org/html/2502.17967v2
https://github.com/PolyBench/PolyBench
https://github.com/weich97/TreLLM-public
https://github.com/LLMQuant/awesome-trading-agents
https://github.com/georgezouq/awesome-ai-in-finance
https://github.com/SAILResearch/awesome-ai-leaderboard
https://github.com/Barca0412/Introduction-to-Quantitative-Finance
https://github.com/virattt/ai-hedge-fund
https://lib.tsinghua.edu.cn/info/1184/5121.htm
https://www.nai.edu.cn/lib/info/1032/1053.htm
https://www.kimi.com/news/kimi-financial-industry-ai-solution
https://www.cnfin.com/cmjj-lb/detail/20260917/4471293_1.html
https://www.21jingji.com/article/20260617/herald/aafb7d1503a0ab0ba5af25e8a79c7630.html
https://neris.csrc.gov.cn/falvfagui/rdqsHeader/mainbody?secFutrsLawId=23b100d2aa454e66924885b04f5d586b
https://www.cnstock.com/commonDetail/787641
```

---

## 复现本轮抓取的入口

- GitHub：`api.github.com/search/repositories?q=<query>&sort=stars`、
  `/repos/{owner}/{repo}`（星数/fork/issue/提交日期）、
  `/repos/{owner}/{repo}/contents/{path}`（base64 取 README，**比 raw.githubusercontent.com 稳**，后者本轮连续 ConnectionResetError）
- B 站：`api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=<kw>&order=click`
  必须带 `Referer: https://www.bilibili.com/` + 浏览器 UA；**高频请求返回 412**，间隔 ≥3s 并重试
- 网页检索：`tvly search "<query>" --json`（已安装，v0.1.6，已认证）
