import type { AgentId, AgentMeta } from '../types'

/**
 * Agent 注册表 —— 对应 TraderHarness 的 ~/.traderharness/agents/<id>.json。
 * 每一条就是一张 Agent 卡：人格、模型、资金与风控上限、工具白名单都写在卡里。
 * 内置卡随平台发布且只读；用户目录里出现同名 id 时，本地卡覆盖内置卡。
 */
export const AGENTS: Record<AgentId, AgentMeta> = {
  codex: {
    id: 'codex',
    name: 'Codex · 价值研究',
    source: '本地 Runner',
    tag: 'Local Runner',
    version: 'v0.3',
    qualification: '探索运行 · 隔离未验证',
    description: '通过本地 Runner 接入，凭据不出本机。适合已经在自己的环境里跑通的 Agent。',
    budgetUsed: 12,
    budgetTotal: 20,
    lastSession: '7 天前',
    builtin: false,
    model: '未上报',
    tools: 4,
    persona: '你是一位价值研究员，只买被低估的好公司。关注 ROE、净利润增速与行业地位，很少交易。',
    strategyTags: ['价值', '逆向'],
    riskProfile: '保守',
    holdingPeriod: '20–60 交易日',
    initialCash: 1_000_000,
    maxPositions: 4,
    maxPositionPct: 25,
    cardOrigin: 'local',
  },
  native: {
    id: 'native',
    name: 'openOutcry · 研究员',
    source: '内置模板',
    tag: 'Built-in Template',
    version: 'v0.8',
    qualification: '受控模板 · 未执行真实审计',
    description: '开箱即用的单 Agent 模板，提示词、工具与风控已按受控评测预设，可直接开跑。',
    budgetUsed: 12,
    budgetTotal: 20,
    lastSession: '今天',
    builtin: true,
    model: 'deepseek-v4-pro',
    tools: 6,
    persona: '你是一位主观交易员，先看公告与政策，再用量价确认。盘前只研究不下单，开盘与尾盘才允许提出委托。',
    strategyTags: ['主观', '事件驱动'],
    riskProfile: '均衡',
    holdingPeriod: '3–10 交易日',
    initialCash: 1_000_000,
    maxPositions: 4,
    maxPositionPct: 25,
    cardOrigin: 'builtin',
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi · 研究助手',
    source: '本地 Runner',
    tag: 'Local Runner',
    version: '演示',
    qualification: '探索运行 · 隔离未验证',
    description: '本地 Runner 接入的第三方模型，用于横向比较研究风格差异。',
    budgetUsed: 3,
    budgetTotal: 20,
    lastSession: '3 天前',
    builtin: false,
    model: '未上报',
    tools: 4,
    persona: '你是一位偏成长的研究助手，更关注行业景气与订单变化，对估值容忍度较高。',
    strategyTags: ['成长', '景气'],
    riskProfile: '激进',
    holdingPeriod: '5–20 交易日',
    initialCash: 1_000_000,
    maxPositions: 6,
    maxPositionPct: 20,
    cardOrigin: 'local',
  },
  custom: {
    id: 'custom',
    name: '自定义 Agent',
    source: '本地 Runner',
    tag: 'Local Runner',
    version: '演示',
    qualification: '探索运行 · 隔离未验证',
    description: '尚未完成预检的自定义接入示例。',
    budgetUsed: 0,
    budgetTotal: 20,
    lastSession: '未运行',
    builtin: false,
    model: '未上报',
    tools: 0,
    persona: '',
    strategyTags: [],
    riskProfile: '均衡',
    holdingPeriod: '未设置',
    initialCash: 1_000_000,
    maxPositions: 4,
    maxPositionPct: 25,
    cardOrigin: 'local',
  },
}

/** 列表顺序：内置在前 */
export const AGENT_ORDER: AgentId[] = ['native', 'codex', 'kimi']

export const agentOf = (id: string): AgentMeta => AGENTS[id as AgentId] ?? AGENTS.native

/** Agent 卡的存放位置，与 TraderHarness 的 ~/.traderharness/agents/<id>.json 对齐 */
export const cardPathOf = (id: AgentId): string =>
  `~/.openoutcry/agents/${id}.json`

/** 把一张卡渲染成可读 JSON，用于「卡即配置」面板 */
export const cardJsonOf = (meta: AgentMeta): string =>
  JSON.stringify(
    {
      id: meta.id,
      name: meta.name,
      model: meta.model,
      persona:
        meta.persona.length > 46 ? `${meta.persona.slice(0, 46)}…` : meta.persona,
      strategy_tags: meta.strategyTags,
      risk_profile: meta.riskProfile,
      holding_period: meta.holdingPeriod,
      allowed_tools: meta.tools,
      initial_cash: meta.initialCash,
      max_positions: meta.maxPositions,
      max_position_pct: meta.maxPositionPct,
    },
    null,
    2,
  )
