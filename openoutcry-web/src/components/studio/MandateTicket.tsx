import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Settings2 } from 'lucide-react'

import { AGENT_ORDER, agentOf } from '../../data/agents'
import { useDialog } from '../../store/DialogProvider'
import { SESSION_PRESETS, UNIVERSE_PRESETS } from '../../data/trainings'
import type { AgentId } from '../../types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Stamp } from '../ui/Stamp'
import { cn } from '../../lib/utils'

const CAPITALS = ['¥100,000', '¥200,000'] as const
/** 按委托顺序分配角色：先选的做交易，其次研究，第三位风控 */
const TEAM_ROLES = ['交易', '研究', '风控'] as const
const MODES = ['逐案确认', '自主推进'] as const

/**
 * 委托单：新建训练页的核心控件。
 * 一次训练由「时段 × 标的池 × 团队 × 规则」四件事定义，所以表单就是四格。
 * 原型阶段只做本地状态，不写回 RunStore。
 */
export function MandateTicket() {
  const navigate = useNavigate()
  const { open } = useDialog()
  const [from, setFrom] = useState('2024-04-23')
  const [to, setTo] = useState('2024-05-21')
  const [session, setSession] = useState<string>(SESSION_PRESETS[0].id)
  const [universe, setUniverse] = useState<string>(UNIVERSE_PRESETS[0].id)
  const [team, setTeam] = useState<AgentId[]>(['native'])
  const [capital, setCapital] = useState<string>(CAPITALS[0])
  const [mode, setMode] = useState<string>(MODES[0])
  const [issued, setIssued] = useState(false)

  const toggleAgent = (id: AgentId) =>
    setTeam((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const chosenUniverse = UNIVERSE_PRESETS.find((u) => u.id === universe) ?? UNIVERSE_PRESETS[0]
  const chosenSession = SESSION_PRESETS.find((s) => s.id === session) ?? SESSION_PRESETS[0]

  /** 原型：用日期跨度粗估交易日，真正接入后由交易日历给出 */
  const days = useMemo(() => {
    const a = new Date(from).getTime()
    const b = new Date(to).getTime()
    if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0
    return Math.max(1, Math.round((b - a) / 86400000 / 7 * 5))
  }, [from, to])

  const budget = Math.max(1, team.length) * 400

  return (
    <section aria-labelledby="mandate-h" className="mt-9">
      <div className="section-hd">
        <h2 id="mandate-h">开具委托单</h2>
        <div className="section-hd-side">
          <span className="count">№ 0043</span>
          <Stamp tone={issued ? 'ver' : 'brass'}>{issued ? '已开具' : '草稿'}</Stamp>
        </div>
      </div>

      <div className="border border-[var(--ink)] bg-card shadow-[var(--hard)]">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[var(--ink)] px-4 py-2.5">
          <span className="label">Training Mandate</span>
          <span className="whitespace-nowrap font-mono text-micro tracking-[0.14em] text-[var(--ink-3)]">
            {from} → {to} · {days} 个交易日
          </span>
        </div>

        <div className="grid divide-y divide-[var(--rule)] md:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-y-0">
          {/* 01 时段 */}
          <fieldset className="min-w-0 p-4">
            <legend className="sr-only">训练时段</legend>
            <FieldHead no="01" title="时段" note="交易日历受控" />
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="起始日期"
                className="h-9 min-w-0 flex-1 px-2 font-mono text-note"
              />
              <ArrowRight aria-hidden className="size-3.5 shrink-0 text-[var(--ink-3)]" />
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="结束日期"
                className="h-9 min-w-0 flex-1 px-2 font-mono text-note"
              />
            </div>
            <div className="mt-2.5 space-y-1.5">
              {SESSION_PRESETS.map((s) => (
                <Choice
                  key={s.id}
                  name="session"
                  checked={session === s.id}
                  onSelect={() => setSession(s.id)}
                  title={s.name}
                  note={s.note}
                />
              ))}
            </div>
          </fieldset>

          {/* 02 标的池 */}
          <fieldset className="min-w-0 p-4">
            <legend className="sr-only">标的池</legend>
            <FieldHead no="02" title="标的池" note={chosenUniverse.code} />
            <div className="space-y-1.5">
              {UNIVERSE_PRESETS.map((u) => (
                <Choice
                  key={u.id}
                  name="universe"
                  checked={universe === u.id}
                  onSelect={() => setUniverse(u.id)}
                  title={u.name}
                  note={u.note}
                />
              ))}
            </div>
          </fieldset>

          {/* 03 团队 */}
          <fieldset className="min-w-0 p-4">
            <legend className="sr-only">Agent 团队</legend>
            <FieldHead no="03" title="团队" note={team.length + ' 位'} />
            <div className="space-y-1.5">
              {AGENT_ORDER.map((id) => {
                const agent = agentOf(id)
                const on = team.includes(id)
                const role = TEAM_ROLES[team.indexOf(id)] ?? '观察'
                return (
                  <label
                    key={id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 border px-2 py-1.5 transition-colors',
                      on
                        ? 'border-[var(--ink)] bg-[var(--bone-lo)]'
                        : 'border-[var(--rule)] hover:border-[var(--rule-strong)]',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleAgent(id)}
                      className="size-3.5 shrink-0 accent-[var(--ink)]"
                    />
                    <span className="min-w-0 flex-1 truncate text-note font-medium text-ink">
                      {agent.name.split(' · ')[0]}
                    </span>
                    <span
                      className={
                        'shrink-0 font-mono text-micro uppercase tracking-[0.1em] ' +
                        (on ? 'text-[var(--ink-2)]' : 'text-[var(--ink-3)]')
                      }
                    >
                      {on ? role : '—'}
                    </span>
                  </label>
                )
              })}
            </div>
            {team.length === 0 ? (
              <p className="mt-2 text-note text-[var(--ver)]">至少需要委托 1 位 Agent</p>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 h-8 w-full justify-start px-1 text-micro font-normal"
                onClick={() => open({ kind: 'agent', agentId: team[0] })}
              >
                <Settings2 aria-hidden className="size-3" />
                配置 {agentOf(team[0]).name.split(' · ')[0]}
              </Button>
            )}
          </fieldset>

          {/* 04 规则 */}
          <fieldset className="min-w-0 p-4">
            <legend className="sr-only">资金与规则</legend>
            <FieldHead no="04" title="规则" note={capital} />
            <div className="grid grid-cols-2 gap-1.5">
              {CAPITALS.map((c) => (
                <Chip key={c} checked={capital === c} onSelect={() => setCapital(c)} label={c} />
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {MODES.map((m) => (
                <Chip key={m} checked={mode === m} onSelect={() => setMode(m)} label={m} />
              ))}
            </div>
            <dl className="mt-2.5 space-y-1.5 border-t border-[var(--rule)] pt-2 text-note text-[var(--ink-3)]">
              <Row k="费用" v="¥5 / 笔" />
              <Row k="滑点" v="万三" />
              <Row k="时段" v={chosenSession.name} />
            </dl>
          </fieldset>
        </div>

        {/* 摘要 + 开具 */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[var(--ink)] bg-[var(--bone-lo)]/60 px-4 py-3">
          <div className="min-w-0">
            <p className="font-serif text-row font-bold leading-snug tracking-[-0.01em] text-ink">
              {days} 个交易日 · {chosenUniverse.name} · {team.length} 位 Agent · {mode}
            </p>
            <p className="mt-1 font-mono text-micro uppercase tracking-[0.14em] text-[var(--ink-2)]">
              工具预算 {budget.toLocaleString('en-US')} 次 · 逐条留痕 · 不可事后改写
            </p>
          </div>
          <div className="flex items-center gap-2">
            {issued ? (
              <Button variant="outline" size="sm" onClick={() => navigate('/training')}>
                进入训练场
              </Button>
            ) : null}
            <Button
              variant="solid"
              size="sm"
              disabled={team.length === 0 || days === 0}
              onClick={() => setIssued(true)}
            >
              {issued ? '已开具' : '开具委托单'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt>{k}</dt>
      <dd className="truncate font-mono text-note text-ink-2">{v}</dd>
    </div>
  )
}

function FieldHead({ no, title, note }: { no: string; title: string; note: string }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-2 border-b border-[var(--rule)] pb-1.5">
      <span className="flex items-baseline gap-1.5">
        <span className="font-mono text-micro tracking-[0.1em] text-[var(--ver)]">{no}</span>
        <span className="text-body font-semibold tracking-[0.04em] text-ink">{title}</span>
      </span>
      <span className="shrink-0 font-mono text-micro uppercase tracking-[0.1em] text-[var(--ink-3)]">
        {note}
      </span>
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
        'flex cursor-pointer items-start gap-2 border px-2 py-1.5 transition-colors',
        checked
          ? 'border-[var(--ink)] bg-[var(--bone-lo)]'
          : 'border-[var(--rule)] hover:border-[var(--rule-strong)]',
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-[3px] size-3.5 shrink-0 accent-[var(--ver)]"
      />
      <span className="min-w-0">
        <span className="block text-note font-medium leading-snug text-ink">{title}</span>
        <span
          className={
            'mt-0.5 block text-micro leading-snug ' +
            (checked ? 'text-[var(--ink-2)]' : 'text-[var(--ink-3)]')
          }
        >
          {note}
        </span>
      </span>
    </label>
  )
}

function Chip({ checked, onSelect, label }: { checked: boolean; onSelect: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={cn(
        'whitespace-nowrap border px-1.5 py-2 font-mono text-note transition-colors',
        checked
          ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--bone-hi)]'
          : 'border-[var(--rule)] text-ink-2 hover:border-[var(--rule-strong)]',
      )}
    >
      {label}
    </button>
  )
}
