import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Lock, Settings2, Shield } from 'lucide-react'

import { AGENT_ORDER, agentOf } from '../../data/agents'
import { SESSION_PRESETS, UNIVERSE_PRESETS } from '../../data/trainings'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useTraining } from '../../store/TrainingProvider'
import type { AgentId, Mode } from '../../types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Stamp } from '../ui/Stamp'
import { cn } from '../../lib/utils'

const CAPITALS = [
  { label: '¥100,000', value: 100000 },
  { label: '¥200,000', value: 200000 },
] as const

const TEAM_ROLES_ZH = ['主交易员（唯一有权下单）', '研究员（只读备忘录）', '风控官（只读否决）'] as const
const TEAM_ROLES_EN = ['Lead Trader (sole order tool)', 'Researcher (read-only)', 'Risk Officer (read-only)'] as const

const MODES: Array<{ id: Mode; zh: string; en: string }> = [
  { id: 'approval', zh: '逐案确认 (HITL)', en: 'Per-Order Approval (HITL)' },
  { id: 'goal', zh: '/goal 自主推进', en: '/goal Autonomous' },
]

/**
 * 委托单（Step 02 核心控件）：
 * 一次训练由「时段与抗污染 × 标的池漏斗 × 单执行者团队 × 资金与三阶段节拍」四格定义。
 * 点击「开具委托单」真实写入全局台账 № 0043 并同步到 Step 03 历史训练场。
 */
export function MandateTicket() {
  const navigate = useNavigate()
  const { open } = useDialog()
  const { nextMandateNo, draftAgent, issueMandate } = useTraining()
  const { isEn, bi } = useLocale()

  const [from, setFrom] = useState('2024-04-01')
  const [to, setTo] = useState('2024-04-26')
  const [session, setSession] = useState<string>(SESSION_PRESETS[0].id)
  const [universe, setUniverse] = useState<string>(UNIVERSE_PRESETS[0].id)
  const [team, setTeam] = useState<AgentId[]>([draftAgent])
  const [capital, setCapital] = useState<number>(CAPITALS[0].value)
  const [mode, setMode] = useState<Mode>('approval')
  const [blindMask, setBlindMask] = useState(true)
  const [issuedNo, setIssuedNo] = useState<string | null>(null)

  const toggleAgent = (id: AgentId) => {
    setIssuedNo(null)
    setTeam((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  const chosenUniverse = UNIVERSE_PRESETS.find((u) => u.id === universe) ?? UNIVERSE_PRESETS[0]
  const chosenSession = SESSION_PRESETS.find((s) => s.id === session) ?? SESSION_PRESETS[0]
  const roles = isEn ? TEAM_ROLES_EN : TEAM_ROLES_ZH

  const days = useMemo(() => {
    const a = new Date(from).getTime()
    const b = new Date(to).getTime()
    if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0
    return Math.max(1, Math.round(((b - a) / 86400000 / 7) * 5))
  }, [from, to])

  const budget = Math.max(1, team.length) * 400

  const handleIssue = () => {
    if (team.length === 0 || days === 0) return
    const created = issueMandate({
      title: `${from.slice(5)}~${to.slice(5)} · ${chosenUniverse.name}${team.length > 1 ? ` · ${team.length} Agent 委员会` : ''}`,
      from,
      to,
      days,
      universeId: chosenUniverse.id,
      universeLabel: chosenUniverse.name,
      cadenceId: chosenSession.id,
      cadenceLabel: chosenSession.name,
      team,
      capital,
      mode,
      blindMask,
    })
    setIssuedNo(created.no)
  }

  return (
    <section aria-labelledby="mandate-h" className="mt-5">
      <div className="section-hd">
        <h2 id="mandate-h">{bi('开具委托单', 'Issue Training Mandate')}</h2>
        <div className="section-hd-side">
          <span className="count">{issuedNo ?? nextMandateNo}</span>
          <Stamp tone={issuedNo ? 'lime' : 'slate'}>
            {issuedNo ? bi('已开具 · 口径锁定', 'Issued · Locked') : bi('草稿', 'Draft')}
          </Stamp>
        </div>
      </div>

      <div className="plate">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--line-soft)] px-[var(--sp-5)] py-3">
          <span className="label">Training Mandate Contract</span>
          <div className="flex flex-wrap items-center gap-2 font-mono text-micro text-[var(--fg-2)]">
            <span>
              {from} → {to} · {days} {bi('交易日', 'trading days')}
            </span>
            {days < 60 ? (
              <span className="rounded bg-[var(--warn-soft)] px-2 py-0.5 text-[var(--warn)]">
                {bi('< 60 日门槛 · 不排名', '< 60d threshold · Unranked')}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-[var(--sp-6)] gap-y-0 p-[var(--sp-5)] md:grid-cols-2">
          {/* 01 时段与抗污染 */}
          <fieldset className="min-w-0 pb-[var(--sp-5)]">
            <legend className="sr-only">{bi('训练时段与抗污染', 'Window & Contamination Controls')}</legend>
            <FieldHead
              no="01"
              title={bi('时段与节拍', 'Window & Cadence')}
              note={bi('快慢双时钟架构', 'Dual-Clock Harness')}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value)
                  setIssuedNo(null)
                }}
                aria-label={bi('起始日期', 'Start Date')}
                className="h-10 min-w-[144px] flex-1 px-3 font-mono text-note"
              />
              <ArrowRight aria-hidden className="size-4 shrink-0 text-[var(--fg-2)]" />
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value)
                  setIssuedNo(null)
                }}
                aria-label={bi('结束日期', 'End Date')}
                className="h-10 min-w-[144px] flex-1 px-3 font-mono text-note"
              />
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {SESSION_PRESETS.map((s) => (
                <Choice
                  key={s.id}
                  name="session"
                  checked={session === s.id}
                  onSelect={() => {
                    setSession(s.id)
                    setIssuedNo(null)
                  }}
                  title={isEn ? s.nameEn : s.name}
                  note={isEn ? s.noteEn : s.note}
                />
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--lime-soft)] px-2.5 py-1 font-mono text-micro text-[var(--lime)]">
                <Lock size={13} aria-hidden />
                {bi('PIT 时点截断（强制）', 'PIT Cutoff (Enforced)')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setBlindMask((v) => !v)
                  setIssuedNo(null)
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-micro transition-colors',
                  blindMask
                    ? 'bg-[var(--lime-soft)] text-[var(--lime)]'
                    : 'bg-[var(--bg-2)] text-[var(--fg-2)]',
                )}
              >
                <Shield size={13} aria-hidden />
                {blindMask
                  ? bi('双盲实体匿名 · Seed 42', 'Blind Mask · Seed 42')
                  : bi('未开启实体匿名（明牌）', 'Unmasked Tickers')}
              </button>
            </div>
          </fieldset>

          {/* 02 标的池三级漏斗 */}
          <fieldset className="min-w-0 pb-[var(--sp-5)]">
            <legend className="sr-only">{bi('标的池漏斗', 'Stock Universe Funnel')}</legend>
            <FieldHead no="02" title={bi('标的池漏斗', 'Universe Funnel')} note={chosenUniverse.code} />
            <div className="flex flex-col gap-2">
              {UNIVERSE_PRESETS.map((u) => (
                <Choice
                  key={u.id}
                  name="universe"
                  checked={universe === u.id}
                  onSelect={() => {
                    setUniverse(u.id)
                    setIssuedNo(null)
                  }}
                  title={isEn ? u.nameEn : u.name}
                  note={isEn ? u.noteEn : u.note}
                />
              ))}
            </div>
            <p className="mt-2.5 text-note text-[var(--fg-2)]">
              {bi(
                '原则：底池可宽可全（防选池偏差），Agent 盘前经受控工具筛入 ≤12 只焦点关注池。',
                'Wide universe prevents cherry-picking; Agent screens into a ≤12-stock focus watchlist via MCP.',
              )}
            </p>
          </fieldset>

          {/* 03 单执行者团队 */}
          <fieldset className="min-w-0 pb-[var(--sp-4)] md:border-t md:border-[var(--line-soft)] md:pt-[var(--sp-4)]">
            <legend className="sr-only">{bi('Agent 团队', 'Agent Team')}</legend>
            <FieldHead
              no="03"
              title={bi('单执行者团队（1–3 位）', 'Single-Executor Team (1–3)')}
              note={bi(`已选 ${team.length} 位`, `${team.length} selected`)}
            />
            <div className="flex flex-col gap-1.5">
              {AGENT_ORDER.map((id) => {
                const agent = agentOf(id)
                const idx = team.indexOf(id)
                const on = idx >= 0
                const role = on ? (roles[idx] ?? roles[2]) : '—'
                return (
                  <label
                    key={id}
                    className={cn(
                      'relative flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                      on ? 'bg-[var(--lime-soft)]' : 'bg-[var(--bg-2)] hover:bg-[var(--bg-3)]',
                    )}
                  >
                    {on ? (
                      <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] rounded-l-lg bg-[var(--lime)]" />
                    ) : null}
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleAgent(id)}
                      className="size-4 shrink-0 accent-[var(--lime)]"
                    />
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-note font-medium',
                        on ? 'text-[var(--fg-0)]' : 'text-[var(--fg-1)]',
                      )}
                    >
                      {agent.name}
                    </span>
                    <span
                      className={cn(
                        'cond shrink-0 text-micro',
                        on ? 'text-[var(--lime)]' : 'text-[var(--fg-2)]',
                      )}
                    >
                      {role}
                    </span>
                  </label>
                )
              })}
            </div>
            {team.length === 0 ? (
              <p className="mt-2 text-note text-[var(--up)]">
                {bi('至少需要委托 1 位 Agent', 'Select at least 1 Agent')}
              </p>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-9 w-full justify-start px-2 text-micro font-normal"
                onClick={() => open({ kind: 'agent', agentId: team[0] })}
              >
                <Settings2 aria-hidden className="size-3.5" />
                {bi(`配置主交易员 ${agentOf(team[0]).name.split(' · ')[0]}`, `Configure Lead ${agentOf(team[0]).name.split(' · ')[0]}`)}
              </Button>
            )}
          </fieldset>

          {/* 04 资金与规则 */}
          <fieldset className="min-w-0 pb-[var(--sp-4)] md:border-t md:border-[var(--line-soft)] md:pt-[var(--sp-4)]">
            <legend className="sr-only">{bi('资金与规则', 'Capital & Rules')}</legend>
            <FieldHead
              no="04"
              title={bi('资金与协作规则', 'Capital & Rules')}
              note={`¥${capital.toLocaleString('en-US')}`}
            />
            <div className="grid grid-cols-2 gap-2">
              {CAPITALS.map((c) => (
                <Chip
                  key={c.label}
                  checked={capital === c.value}
                  onSelect={() => {
                    setCapital(c.value)
                    setIssuedNo(null)
                  }}
                  label={c.label}
                />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <Chip
                  key={m.id}
                  checked={mode === m.id}
                  onSelect={() => {
                    setMode(m.id)
                    setIssuedNo(null)
                  }}
                  label={isEn ? m.en : m.zh}
                />
              ))}
            </div>
            <dl className="mt-3.5 border-t border-[var(--line-soft)] pt-2 text-note">
              <Row k={bi('A 股硬规则', 'A-Share Rules')} v={bi('T+1 · 100股整手 · 涨跌停校验', 'T+1 · 100-lot · Price Limits')} />
              <Row k={bi('佣金 / 滑点', 'Fee / Slippage')} v={bi('¥5 最低 + 印花税 / 万三', '¥5 min + Stamp / 3 bps')} />
              <Row k={bi('定价口径', 'Pricing Basis')} v={bi('未复权真实历史价', 'Unadjusted Historical Price')} />
            </dl>
          </fieldset>
        </div>

        {/* 摘要 + 开具 + 直达训练场 */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line-soft)] px-[var(--sp-5)] py-4">
          <div className="min-w-0">
            <p className="font-sans text-body font-semibold leading-snug text-[var(--fg-0)]">
              {days} {bi('交易日', 'days')} · {isEn ? chosenUniverse.nameEn : chosenUniverse.name} ·{' '}
              {team.length} {bi('位 Agent', team.length > 1 ? 'Agents' : 'Agent')} ·{' '}
              {mode === 'approval' ? bi('逐案确认', 'HITL Approval') : '/goal'}
            </p>
            <p className="cond mt-1 text-micro text-[var(--fg-2)]">
              {bi(
                `工具预算 ${budget} 次 · 全保真事件留痕 · 委托开具后不可篡改`,
                `Tool budget ${budget} calls · Append-only trace · Immutable once issued`,
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {issuedNo ? (
              <Button variant="solid" size="sm" onClick={() => navigate('/training')}>
                {bi(`带着 ${issuedNo} 进入历史训练场 →`, `Enter Training Arena (${issuedNo}) →`)}
              </Button>
            ) : (
              <Button
                variant="solid"
                size="sm"
                disabled={team.length === 0 || days === 0}
                onClick={handleIssue}
              >
                {bi(`开具委托单 ${nextMandateNo}`, `Issue Mandate ${nextMandateNo}`)}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-[var(--fg-2)]">{k}</dt>
      <dd className="truncate font-mono text-note text-[var(--fg-0)]">{v}</dd>
    </div>
  )
}

function FieldHead({ no, title, note }: { no: string; title: string; note: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-micro font-semibold text-[var(--lime)]">{no}</span>
        <span className="font-sans text-body font-semibold text-[var(--fg-0)]">{title}</span>
      </div>
      <span className="cond truncate text-micro text-[var(--fg-2)]">{note}</span>
    </div>
  )
}

function Choice({
  name,
  checked,
  onSelect,
  title,
  note,
}: {
  name: string
  checked: boolean
  onSelect: () => void
  title: string
  note: string
}) {
  return (
    <label
      className={cn(
        'relative flex cursor-pointer items-start gap-3 rounded-lg px-3.5 py-2.5 transition-colors',
        checked ? 'bg-[var(--lime-soft)]' : 'bg-[var(--bg-2)] hover:bg-[var(--bg-3)]',
      )}
    >
      {checked ? <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] rounded-l-lg bg-[var(--lime)]" /> : null}
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-1 size-4 shrink-0 accent-[var(--lime)]"
      />
      <span className="min-w-0 flex-1">
        <span className={cn('block text-note font-semibold', checked ? 'text-[var(--fg-0)]' : 'text-[var(--fg-1)]')}>
          {title}
        </span>
        <span className="mt-0.5 block text-micro text-[var(--fg-2)]">{note}</span>
      </span>
    </label>
  )
}

function Chip({ checked, onSelect, label }: { checked: boolean; onSelect: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onSelect}
      className={cn(
        'h-10 rounded-lg border px-3 font-mono text-note font-medium transition-colors',
        checked
          ? 'border-[var(--line-lime)] bg-[var(--lime-soft)] text-[var(--fg-0)]'
          : 'border-[var(--line-soft)] bg-[var(--bg-2)] text-[var(--fg-1)] hover:bg-[var(--bg-3)]',
      )}
    >
      {label}
    </button>
  )
}
