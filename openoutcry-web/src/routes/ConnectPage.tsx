import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Code2, Plus, Shield, SlidersHorizontal } from 'lucide-react'

import { AGENTS, AGENT_ORDER, cardJsonOf, cardPathOf } from '../data/agents'
import { useDialog } from '../store/DialogProvider'
import { useLocale } from '../store/LocaleProvider'
import { useRun } from '../store/RunProvider'
import { useTraining } from '../store/TrainingProvider'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Stamp } from '../components/ui/Stamp'
import { money } from '../lib/format'
import { cn } from '../lib/utils'
import type { AgentId } from '../types'

function KV({ k, v, last = false }: { k: string; v: string; last?: boolean }) {
  return (
    <div
      className={
        'flex items-baseline justify-between gap-4 py-2' +
        (last ? '' : ' border-b border-[var(--line-soft)]')
      }
    >
      <span className="text-note text-muted-foreground">{k}</span>
      <b className="text-right font-mono text-note font-semibold text-foreground">{v}</b>
    </div>
  )
}

/**
 * Step 01 · Agent 库（主从一屏布局）：
 * 左侧列表扫清「内置只读模板 + 本地外部 Agent」，右侧即刻审查 Agent 卡配置与 JSON，
 * 选定后直接带着该 Agent 进入 Step 02 训练委托台；接入新 Agent 收进弹窗避免长页滚屏。
 */
export function ConnectPage() {
  const { state } = useRun('training')
  const { records, setDraftAgent } = useTraining()
  const { open } = useDialog()
  const { isEn, bi } = useLocale()
  const navigate = useNavigate()

  const [selected, setSelected] = useState<AgentId>(state.agent)
  const [inspectTab, setInspectTab] = useState<'card' | 'json'>('card')

  const card = AGENTS[selected]
  const quotes = records.filter((r) => r.team.includes(selected)).map((r) => r.no)

  const goToMandate = () => {
    setDraftAgent(selected)
    navigate('/studio')
  }

  return (
    <>
      <div className="vlabel page-vlabel" aria-hidden="true">
        OPENOUTCRY / 01 AGENT ROSTER / 2026
      </div>

      <div className="pagehead">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="label">{bi('01 — Agent 库', '01 — Agent Roster')}</span>
            <Stamp tone="slate" size="sm">
              {bi('密钥不出本机 · 统一 Agent 卡', 'Keys Stay Local · Unified Agent Card')}
            </Stamp>
          </div>
          <h1>{bi('挑一个内置模板，或把你自己的 Agent 接进来。', 'Pick a built-in template or plug in your own Agent.')}</h1>
          <p className="deck">
            {bi(
              '平台不绑死单一模型，而是用一张透明的 Agent 卡声明人格、风险上限与受控工具白名单；卡里未上报的字段绝不瞎猜。',
              'Model-agnostic by design: every built-in or local agent is described by a transparent Agent Card declaring persona, risk caps, and tool whitelist.',
            )}
          </p>
        </div>
        <div className="pagehead-actions">
          <Button variant="outline" size="sm" onClick={() => open({ kind: 'onboard' })}>
            <Plus size={15} aria-hidden />
            {bi('接入新 Agent', 'Connect New Agent')}
          </Button>
          <Button variant="solid" size="sm" onClick={goToMandate}>
            {bi('去开具委托单', 'Create Mandate')}
            <ArrowRight size={15} aria-hidden />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section aria-label={bi('我的 Agent 列表', 'My Agents')} className="flex min-w-0 flex-col gap-2.5">
          <div className="flex items-baseline justify-between px-1">
            <span className="label">
              {bi(`已登记 Agent（${AGENT_ORDER.length}）`, `Registered Agents (${AGENT_ORDER.length})`)}
            </span>
            <span className="font-mono text-micro text-[var(--fg-2)]">
              {bi('内置 1 · 本地 3', '1 Built-in · 3 Local')}
            </span>
          </div>

          {AGENT_ORDER.map((id) => {
            const meta = AGENTS[id]
            const active = selected === id
            const inUse = state.agent === id
            return (
              <Card
                key={id}
                interactive
                onClick={() => setSelected(id)}
                aria-pressed={active}
                className={cn(
                  'transition-colors',
                  active && 'shadow-[inset_3px_0_0_var(--lime),inset_0_0_0_1px_var(--line-lime)]',
                )}
              >
                <CardContent className="py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-sans text-body font-semibold text-[var(--fg-0)]">
                      {meta.name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {inUse ? <Badge variant="pine">{bi('当前在跑', 'Active')}</Badge> : null}
                      <Badge variant={meta.cardOrigin === 'builtin' ? 'pine' : 'outline'}>
                        {meta.cardOrigin === 'builtin'
                          ? bi('内置只读', 'Built-in')
                          : bi('本地 ACP', 'Local ACP')}
                      </Badge>
                    </span>
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-note leading-relaxed text-[var(--fg-2)]">
                    {meta.description}
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--line-soft)] pt-2 font-mono text-micro text-[var(--fg-1)]">
                    <span>{bi('模型', 'Model')}: {meta.model}</span>
                    <span>{bi('风险', 'Risk')}: {meta.riskProfile}</span>
                    <span>{bi('单票上限', 'Cap')}: {meta.maxPositionPct}%</span>
                    <span>{bi('工具', 'Tools')}: {meta.tools}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <button
            type="button"
            onClick={() => open({ kind: 'onboard' })}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--line-strong)] bg-[var(--bg-1)] px-4 py-3 text-note font-medium text-[var(--fg-1)] transition-colors hover:border-[var(--lime)] hover:text-[var(--fg-0)]"
          >
            <Plus size={16} aria-hidden className="text-[var(--lime)]" />
            {bi('接入本地新 Agent（Prompt / CLI 三步握手）', 'Connect Local Agent (Prompt / CLI 3-Step)')}
          </button>
        </section>

        <section aria-label={bi('Agent 卡详情', 'Agent Card Inspector')} className="min-w-0">
          <Card className="h-full">
            <CardHeader className="flex-wrap gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span>{card.name}</span>
                <span className="font-mono text-micro text-[var(--fg-2)]">{cardPathOf(selected)}</span>
              </div>
              <div className="flex items-center gap-1 rounded-md bg-[var(--bg-2)] p-0.5">
                <button
                  type="button"
                  onClick={() => setInspectTab('card')}
                  className={cn(
                    'flex items-center gap-1 rounded px-2.5 py-1 font-mono text-micro',
                    inspectTab === 'card'
                      ? 'bg-[var(--lime-soft)] font-semibold text-[var(--fg-0)]'
                      : 'text-[var(--fg-2)]',
                  )}
                >
                  <SlidersHorizontal size={13} aria-hidden />
                  {bi('结构化配置', 'Spec')}
                </button>
                <button
                  type="button"
                  onClick={() => setInspectTab('json')}
                  className={cn(
                    'flex items-center gap-1 rounded px-2.5 py-1 font-mono text-micro',
                    inspectTab === 'json'
                      ? 'bg-[var(--lime-soft)] font-semibold text-[var(--fg-0)]'
                      : 'text-[var(--fg-2)]',
                  )}
                >
                  <Code2 size={13} aria-hidden />
                  JSON
                </button>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Stamp tone={card.qualification.startsWith('受控') ? 'pine' : 'slate'} size="sm">
                  {card.qualification}
                </Stamp>
                <Badge variant="outline">
                  {card.cardOrigin === 'builtin'
                    ? bi('内置卡 · 只读模板', 'Built-in · Read-only')
                    : bi('本地卡 · 可覆盖同名内置卡', 'Local Card · Overrides Built-in')}
                </Badge>
                {card.strategyTags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>

              {inspectTab === 'card' ? (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
                  <div className="min-w-0">
                    <div className="mb-3 rounded-lg bg-[var(--bg-2)] p-3.5">
                      <div className="font-mono text-micro text-[var(--fg-2)]">
                        {bi('人格与策略指令（Persona）', 'Persona & Strategy Prompt')}
                      </div>
                      <p className="mt-1.5 text-note leading-relaxed text-[var(--fg-0)]">
                        {card.persona || bi('尚未填写人格说明', 'No persona configured yet')}
                      </p>
                    </div>
                    <KV k={bi('来源与版本', 'Source & Version')} v={`${card.source} · ${card.version}`} />
                    <KV k={bi('声明模型', 'Declared Model')} v={card.model} />
                    <KV k={bi('风险档与周期', 'Risk & Holding')} v={`${card.riskProfile} · ${card.holdingPeriod}`} />
                    <KV
                      k={bi('建议初始资金', 'Default Capital')}
                      v={money(card.initialCash) + bi('（以委托单为准）', ' (mandate overrides)')}
                    />
                    <KV
                      k={bi('风控上限', 'Position Limits')}
                      v={bi(`最多 ${card.maxPositions} 只 · 单票 ≤ ${card.maxPositionPct}%`, `Max ${card.maxPositions} pos · ≤ ${card.maxPositionPct}% each`)}
                    />
                    <KV
                      k={bi('受控工具白名单', 'MCP Tool Whitelist')}
                      v={
                        card.tools === 0
                          ? bi('未声明（不可运行）', 'Undeclared (blocked)')
                          : bi(`${card.tools} 个受控只读/下单工具`, `${card.tools} sandboxed MCP tools`)
                      }
                    />
                    <KV
                      k={bi('历史委托引用', 'Referenced Runs')}
                      v={quotes.length === 0 ? bi('暂未被训练引用', 'None yet') : quotes.join(' · ')}
                      last
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="mb-1.5 font-mono text-micro text-[var(--fg-2)]">
                      {bi('平台读取的原始 Agent 卡', 'Raw Agent Card JSON')}
                    </div>
                    <pre className="code max-w-full overflow-x-auto">{cardJsonOf(card)}</pre>
                  </div>
                </div>
              ) : (
                <pre className="code max-w-full overflow-x-auto">{cardJsonOf(card)}</pre>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-3.5">
                <span className="flex items-center gap-2 text-note text-[var(--fg-2)]">
                  <Shield size={15} aria-hidden className="text-[var(--lime)]" />
                  {isEn
                    ? 'Research tools, portfolio view, and order gateway are injected by the arena at runtime.'
                    : '研究工具、账户视图与唯一下单网关均由训练场按实验快照注入，Agent 无法直接改账。'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => open({ kind: 'agent', agentId: selected })}>
                    {bi('查看/微调草稿', 'Inspect / Edit Draft')}
                  </Button>
                  <Button variant="solid" size="sm" onClick={goToMandate}>
                    {bi(`用「${card.name.split(' · ')[0]}」开具委托单 →`, `Create Mandate with ${card.name.split(' · ')[0]} →`)}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  )
}
