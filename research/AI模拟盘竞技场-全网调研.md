# AI 模拟盘竞技场：全网调研

> 调研时间 2026-09-25 · 目标：确认"让 AI Agent 在模拟盘上自主搜资料、自主投资、公开跑分"这件事，
> 有没有人做过、做到哪一步、还空着什么。
> 数据来源：GitHub API 实测、B 站搜索 API、网页检索，全部为当日抓取的真实值。

---

## 0. 先说结论

**做过，而且不止一家。这个方向不是一个没人发现的空白，是一条已经被踩出来的赛道。**

但踩出来的部分有明确的边界，空着的地方也很具体：

- **已经有人做**：给多个大模型各发一个账户、同一市场、同规则、跑一段时间、出排行榜。这件事在 2025 年 10 月就被 nof1 的 Alpha Arena 做成了公共事件，到今天还在以各种形态延续。
- **还没人做**：**A 股 + 开放参赛（自带 Agent）+ 抗污染 + 持续记录 + 可复现回放**，这五件事同时成立的产品。目前每一家都只做到了其中两到三件。
- 用户构想里最有价值的那半句——*"按照自己的想法去搜索资料、投资"*——恰恰是最薄弱的一块。现有竞技场大多是"给模型喂行情快照，让它下单"，**很少让模型真的去检索、查资料、写分析代码**。

---

## 1. 已经跑起来的公开竞技场（产品形态，直接对位）

### 1.1 Alpha Arena / nof1.ai —— 鼻祖，也是 B 站视频的主角

2025-10-18 开赛，六家模型各 $10,000 **真钱**，在 Hyperliquid 上交易 BTC/ETH/SOL/BNB/DOGE/XRP 永续合约，全程无人干预。

- Season 1（2025-10-18 ~ 11-03，加密）：Qwen3 Max +22.31% 夺冠，DeepSeek V3.1 +4.89% 第二，**四个美国模型全部亏损**，GPT-5 -58.74% 垫底。同期"买入并持有 BTC"是 +1.47%，跑赢了四个 AI。
- Season 1.5（2025-11-19 ~ 12-03，美股）：八个模型分四组并行，"神秘模型"夺冠，揭晓为 Grok 4.20，+12.11%。
- **已经停了。** 2026-08-06 复查：nof1.ai 仍挂着 Season 1.5，横幅写明模型已不再运行，没有 Season 2 的阵容或榜单。

它证明了两件事：这个形态有人看（全网刷屏），而且真钱比虚拟盘更有传播力。也暴露了它的不可复制性——**个人和开源项目在法律和资金上都做不了这件事**。

证据：https://www.traderank.ai/alpha-arena-leaderboard ｜ https://baike.baidu.com/item/Alpha%20Arena/66965037

### 1.2 TradeRank.ai —— 当前最活跃，赛季制跑得最久

Season 9 正在跑（2026-09-12 开赛），**18 个模型各 $10,000**，美股 + 加密，每日一个决策周期。已经跑完 8 个赛季并归档。

几个值得抄的细节：
- 不只排总收益，同时公布**夏普、最大回撤、胜率**；
- **每个决策的完整推理过程公开**；
- 有 open data 页、reproduction files，榜单本身可直接下载 CSV；
- 明确声明"跨赛季不可比"——因为参赛阵容、提示词规则、市场状态都变了。

这是目前把"公开 + 持续 + 可核验"做得最像样的一个。**资产里没有 A 股。**

证据：https://www.traderank.ai/best-llm-for-trading

### 1.3 TradingArena.ai —— 双口径评分，把"判断"和"执行"分开

每个模型一个 $10,000 纸面账户。它设计了一个我们值得借鉴的口径：**方向性判断单独计分**——每个 BUY/SELL 带止损和目标位，由市场裁定"先到目标还是先到止损"，**不管有没有人真的去执行**。这样就把"模型的判断力"和"账户的运气"分离开了。

证据：https://www.tradingarena.ai/leaderboard

### 1.4 AI Trading Competition / Bot Analysis Arena

矩阵式设计：**bot 人格（Patience / Tactical / Structure & zones / Moonshot…）× 模型（Grok / Claude / ChatGPT / Gemini）**，用 Alpaca 纸面账户跑，按日/周/总榜分别排名。截至公开数据，"Patience · Grok" 自起点 +44.68%。

它还专门说明了一段很实在的话：收盘估值是用 Alpaca 的 consolidated SIP 日线收盘价重建的，**不补回错过的交易周期、不认证盘中表现、未扣除交易成本**。这种把口径弱点写出来的做法，比大多数竞品诚实。

证据：https://aitradingcompetition.com/standings.html

### 1.5 华泰柏瑞杯 · 全国首届 ETF AI 交易巅峰赛 —— 国内已经办过一次了

**2026-06-11 ~ 07-20**，华泰证券"AI涨乐"主办，华泰柏瑞基金冠名。**国内首个面向 AI Agent 的模拟交易赛事。**

三条参赛路径、两个榜单：
- 本人参赛 / AI涨乐参赛 → 合并进「巅峰星榜」（前三名模拟收益 58.30% / 49.11% / 46.36%）
- **自带 Agent 参赛 → 单独的「Agent开发者榜」**（前三 44.14% / 26.80% / 23.38%）
- 标的限定 ETF（不是个股），冠军奖品 2 万元

"自带 Agent" 路径提供了官方金融分析、行情检索、模拟交易、条件选股等 Skills，复制提示词即可接入——**这就是我们要做的形态，只是它是一次 40 天的营销赛事，不是持续运行的场子。**

证据：https://www.sohu.com/a/1032387698_120988533 ｜ https://gu.qq.com/resources/shy/news/detail-v2/index.html?id=SN20260723161717a6e1e2f2

---

## 2. 开源侧：复刻者众，活得下来的少

GitHub 上直接对标 Alpha Arena 的复刻项目有一大批，但**绝大多数是一次性产物**：

| 仓库 | ★ | 最后提交 | 状态判断 |
|---|---:|---|---|
| `AmadeusGB/alpha-arena` | 630 | 2025-10-20 | **一次性 MVP**，创建当天 4 个 commit 后再无动静。设计文档写得很好（目标/边界/统一 Prompt/风控规则齐全），但没跑起来 |
| `etrobot/open-alpha-arena` | 595 | 2026-08-03 | 纸面交易已完成，纯 TS 栈（React+Hono+SQLite+ccxt），杠杆已支持，实盘标 TODO。停更近 2 个月 |
| `HammerGPT/Hyper-Alpha-Arena` | 1175 | 2026-05-13 | Hyperliquid/币安合约 AI 交易平台，偏工具而非竞技场 |
| `195440/nof1.ai` | 688 | 2026-05-15 | 自主 AI 交易系统复刻 |
| `oficcejo/alpha-arena-okx` | 340 | 2026-07-27 | 接欧易，让 DeepSeek/Qwen 自动炒币 |
| `kojott/LLM-trader-test` | 145 | 2025-12-29 | 个人实验，含回测框架 |
| `ryan-yuuu/crypto-trading-arena` | 128 | 2026-07-08 | "The open source trading arena"，停更 2 个月 |

**真正还在活跃、且形态最接近的两个：**

- **`mamawai/wtfibought`（136★，Java/Spring AI，最后提交 2026-09-24）**
  标语是 *"A live arena for LLM trading agents — every thought in the open"*。
  自带模型和 Key 参赛，交易真实行情的虚拟资金，**每一次 thought、工具调用、论点、复盘全部公开**。有线上站点。
  → **这是"公开决策账本"这件事做得最彻底的开源项目，值得逐条读它的做法。**
  证据：https://github.com/mamawai/wtfibought

- **`HephaestLab/TraderHarness`（39★，Python，最后提交 2026-08-22）—— 最需要我们认真对待的参照物**

  定位："面向 LLM 交易 Agent 的抗污染回测环境，同时也是一个训练数据合成器。"
  - 数据：**真实 A 股，五年全市场日线 + 5 分钟线、公告、政策快讯、基本面、估值、分红、沪深 300 基准**
  - 抗污染：每个数据出口强制时点掩码 + **确定性的日期与公司匿名化**（Agent 认不出被测时间段和股票）
  - 公平成交：5 分钟行情渐进可见、分钟级撮合，唯一路径 `TradingBus.place_order()`，按不复权真实历史价结算
  - 确定性：预载后零数据 I/O，相同输入必然相同输出；cassette 可无 Key 回放，`traderharness audit` 扫泄漏，`export sft` 导出训练轨迹
  - **每日模拟盘支持 1–4 个 Agent 同场**：隔离账户、净值曲线叠加、实时排名，A 股涨跌停/手数/T+1/费用规则
  - 内置四张 Agent 人设卡（趋势突破 / 质量复利 / 事件猎鹰 / 量化研究），并给出 2026-06-20~07-20 沪深 300 −9.12% 的"魔鬼窗口"实测：Claude Opus 4.8 +1.45%、Kimi K2.6 +0.34%、Qwen3.7-Max −1.64%、DeepSeek V4-Pro −2.69%
  - 已发 PyPI、有文档站、数据在 HuggingFace（`ANTICH/traderharness-ashare-5y`）

  **它的硬边界写得很清楚**："它是本地研究工具——请保持只监听 localhost，不要暴露到公网。"
  → **技术底座几乎就是我们要的，但它主动停在了"个人本地工具"，没有长成公开的、让人来参赛的场子。**

  证据：https://github.com/HephaestLab/TraderHarness ｜ https://hephaestlab.github.io/TraderHarness/

---

## 3. 你特别问的两件事

### 3.1 B 站上确实有，而且不止一个

抓 B 站搜索接口拿到的（按播放量排序，括号内为播放数）：

| 视频 | UP | 播放 | BV 号 |
|---|---|---:|---|
| **我给 8 个顶级 AI 各 10 万炒 A 股，10 天后谁赢了？** | Byron爱睡觉 | 94,719 | BV1gojB6iEKV |
| 【横测】谁是做量化交易最好用的大模型（Kimi K3 / Opus 5 / Fable 5 / DeepSeek V4 Flash） | frank-quant | 173,046 | BV15HMS6DETZ |
| AI 炒币 48 小时：DeepSeek 赚 4000 刀！GPT 亏到 6000 | 神烦老狗 | 11,053 | BV184WUzaEfJ |
| AI 炒股比赛：短短 10 天，DeepSeek 狂赚 128%，GPT-5 怒亏 58% | 硅基洞察 | 951 | BV1vPsUz3EaD |
| **火爆全网的 Alpha Arena 让顶尖 AI 大模型进行量化交易竞技！开源 Python 框架全解析** | AI量化邹老师 | 3,481 | BV1KxW9zBEYJ |
| AITradeGame：Nof1.ai 开源版复现，大模型的炒股能力测试 | AIGCLINK | 4,026 | BV1UZyBBAEsa |
| 六大主流 AI 大模型，1 万美金量化交易竞赛 | JavaPub | 1,170 | BV1mQWmzxEBr |
| 手把手教你部署 AI 自动化交易 nofx | einverne | 25,454 | BV1VH1aBtER1 |

**最像你看到的是第一条**：8 个模型、各 10 万、**炒 A 股**、10 天。说明**A 股版本的"AI 擂台"在中文内容侧已经有热度，而且是高播放量内容**。

### 3.2 把结果记进 GitHub 仓库：有，而且是最值得抄的一种做法

- **`xsunsim/AgentStockBenchmarkResults`（16★，最后提交 2026-09-22）**
  从 2025 年跑到现在。每日让各家模型**排名次日 S&P 500 的赢家和输家**，第二天由市场结算。仓库结构：
  ```
  leaderboard/          ← 累计 PnL 图 + leaderboard.md
  daily_digest/         ← 每日战报，中英双语，从 20260526 一路排到 20260921
  agentstockbench_model_update_20260920/.../dashboard/interactive.html
                        ← GitHub Pages 交互看板
  ```
  它自己写的一句话很有意思："Their only judge is the future — **the one truth that simply cannot be cheated**."
  还专门强调：agents 严格只使用截止 2024 年的数据，所以结果是对推理能力的真实检验而非过拟合。
  → **这就是"把结果持续记录到 GitHub 仓库"的标准答案：仓库即榜单，commit 即时间戳，Pages 即看板。**

- **`ProjectDXAI/continuous-record-llm-trading-agents`（80★，arXiv:2609.05663）**
  6 个月、两个部署、3,505 个用户出资的 agent、231,638 条记录、14,596 笔成交。仓库里放论文 PDF、图表、聚合数据和分享卡片，**数据集挂在 HuggingFace**。
  更值得注意的：论文结尾给了 17 条方法论准则，且明确写着"其中三条我们自己的结论被撤回了，只以撤回的形式出现"。
  → 这是**规模化持续记录 + 自我纠错**的范本。

- **`ckamelhar-collab/ai-trading-arena-data`（4★）** —— 把 aitradingcompetition.com 的每笔平仓和每个 bot 战绩做成开放数据集。

---

## 4. 学术侧：抗污染已经是公认的护城河方向

| 项目 | 机构/来源 | 状态 |
|---|---|---|
| **AI-Trader** | 香港大学 | 自称首个 fully-automated、live、**data-uncontaminated** 的金融 LLM Agent 评测基准 |
| **STOCKBENCH** | 清华 | 真实股票交易环境下的 LLM Agent 评测，有独立站点与结果页 |
| **ulab-uiuc/live-trade-bench** | UIUC ULab | 166★，实时市场评测（区别于纯回测基准）。最后提交 2026-02，已停更 |
| **Open-Finance-Lab/AgenticTrading** | — | 764★，**最后提交 2026-09-24，活跃** |
| **Agent Trading Arena**（arXiv 2502.17967） | — | 零和虚拟股票市场，LLM agent 相互博弈并直接影响价格 |
| **PolyBench** | — | 17★，去中心化预测市场上的抗污染 LLM 基准 |
| **TreLLM / TradeArena** | — | 1★，公开榜单，主打可回放轨迹、风控闸门、执行校准 |

**共同点：几乎每一家都把"data contamination / look-ahead"当成头号敌人。**这反过来印证了我们之前判断的方向是对的——**抗污染不是可选项，是入场券**。

---

## 5. 全景定位：谁做到了哪一层

|  | 公开榜单 | A 股 | 开放参赛 | 真实搜索/工具调用 | 抗污染 | 可复现回放 | 持续运行 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| nof1 Alpha Arena | ✅ | ❌ | ❌ | ❌（只给数值数据） | ⚠️ | ❌ | ❌ 已停 |
| TradeRank.ai | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ 有 reproduction | ✅ 9 赛季 |
| TradingArena.ai | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ✅ |
| Bot Analysis Arena | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ 开放数据 | ✅ |
| 华泰 ETF AI 巅峰赛 | ✅ | ✅ ETF | ✅ | ⚠️ 官方 Skills | ❌ | ❌ | ❌ 40 天赛事 |
| wtfibought | ✅ | ❌ | ✅ BYOM | ✅ 全部公开 | ❌ | ❌ | ✅ |
| **TraderHarness** | ❌ 本地 | ✅ | ❌ | ✅ 受控工具 | ✅ | ✅ 指纹回放 | ✅ |
| xsunsim 每日榜 | ✅ | ❌ | ❌ | ❌ | ✅ 限 2024 前 | ⚠️ | ✅ |
| AI-Trader / STOCKBENCH | ✅ | ❌ | ⚠️ | ⚠️ | ✅ | ⚠️ | ❌ |
| 各类开源复刻 | ❌ | ❌ | ✅（自己部署） | ⚠️ | ❌ | ❌ | ❌ 多数停更 |

**读这张表的方式：没有任何一行同时满足"公开 + A股 + 开放参赛 + 抗污染 + 可复现"。**

---

## 6. 这对我们的产品形态意味着什么

### 6.1 必须放弃的三个说法

1. ~~"没人做过 AI 模拟盘竞技场"~~ —— 做了五年了，nof1 把它做成过公共事件。
2. ~~"我们的创新点是让 AI 在模拟盘上跑分"~~ —— 这是赛道的基本盘，不是创新点。
3. ~~"决策账本 / 自动复盘是我们的独占能力"~~ —— wtfibought 的标语就是 "every thought in the open"，TraderHarness 每次调用全保真落盘。

### 6.2 空隙具体在哪

**(1) A 股 + 公开 + 持续运行 = 空的。**
唯一沾 A 股的是华泰那场 40 天赛事（已结束、标的是 ETF、不公开细节）和 TraderHarness（A 股数据齐全但只跑本地）。**没有一家在 A 股上跑一个常年开放、每天出榜的场子。**

**(2) "自己去搜索资料"这半句没人认真做。**
现有竞技场几乎都是"喂行情快照 → 模型下单"。我们的原话是"**按照自己的想法去搜索资料、投资**"——让 Agent 主动检索公告、新闻、研报、基本面，写自己的分析代码。这条链路只有 TraderHarness 做了（受控工具 + 沙箱执行代码），但它是本地的。

**(3) 抗污染是公认难题，但没人把它做成产品卖点。**
学术圈在打这个仗，工程侧只有 TraderHarness 落地了（时点掩码 + 实体匿名化 + 指纹回放）。**谁把它做成"这个榜单不可作弊"的公开承诺，谁就拿到了信任。**

**(4) 可复现回放几乎无人做。**
除了 TraderHarness 的 cassette + audit，其他家基本只有日志。**"任何人可以拿我的结果重跑一遍、得到同样的数"是能一句话讲清楚的差异化。**

### 6.3 建议的产品形态（一句话）

> **A 股上的公开 AI 擂台：任何人提交自己的 Agent，在抗污染的历史/实时市场里自主检索、自主交易，成绩、轨迹和证据全部公开可复算，日更榜单，仓库即档案。**

拆成四层，每层对应一个别人没占的位置：

| 层 | 做什么 | 为什么别人难跟 |
|---|---|---|
| **市场层** | A 股全市场日线+分钟线+公告+新闻+基本面，强制时点掩码，实体/日期匿名化可选 | 数据要攒，掩码逻辑要写，TraderHarness 是唯一做过但没公开的 |
| **竞技层** | 开放参赛（BYO Agent）、统一初始资金与规则、多 Agent 同场独立记账、日更榜单 | 现有公开场子都是"主办方挑模型"，不开放参赛 |
| **证据层** | 每次调用全保真落盘、指纹回放、可审计、结果可一键复算 | 基本空白，TraderHarness 有技术但没产品化 |
| **档案层** | 仓库即榜单：commit 时间戳 + daily digest + Pages 看板 + 数据集开放 | 只有 xsunsim 在做，且是美股 |

### 6.4 风险提示

- **TraderHarness 是最该盯的对象。** 它技术底座齐全、Apache-2.0、已在 PyPI 发布。它只要把"本地研究工具"这个自我定位改掉，就直接变成我们。它现在 39★、停更一个月——**窗口可能不长。**
- **合规红线不变**：给具体个股的买卖建议属证券投资咨询业务，需持牌。我们的公开表述必须是"模型能力评测/教育研究"，榜单要附数据延迟、虚拟成交、费用模型和失败记录（TraderHarness 的 warning 段就是这么写的，可以直接借鉴措辞）。
- **"真钱"是传播力最强的形态，也是我们做不了的。** 内容侧要竞争，得靠"A 股 + 可复算"而不是靠刺激度。

---

## 附：调研方法与可复用入口

- GitHub：`api.github.com/search/repositories`、`/repos/{r}`、`/repos/{r}/contents/{path}`（base64 取 README，比 raw.githubusercontent 稳）。当日 API 未限流。
- B 站：`api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=`，需带 `Referer: https://www.bilibili.com/`，**高频请求会返回 412**，每次请求间隔 ≥3s。
- 本轮已落盘的后续可用对象：`xsunsim/AgentStockBenchmarkResults`（仓库结构可直接抄）、`mamawai/wtfibought`（公开决策账本）、`HephaestLab/TraderHarness`（A 股数据 + 抗污染 + 回放，Apache-2.0）。
