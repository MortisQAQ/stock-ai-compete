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
 *
 * 版式：**2×2 栅格**，不是四列等宽。
 * 四列等宽时每一列只有 ~280px，所有控件被压成同一种高度、同一种间距，
 * 眼睛找不到任何分组依据 —— 这正是「元素排列太密集」的根因。
 * 改成 2×2 之后每格有 560px，标题 / 控件 / 选项可以按 --sp-3 起跳，
 * 而不用靠缩字号把东西塞进去。
 * 容器是「板」不是「框」：只有一根上边线 + 一档底色，左右不出线。
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
    <section aria-labelledby="mandate-h" className="mt-11">
      <div className="section-hd">
        <h2 id="mandate-h">开具委托单</h2>
        <div className="section-hd-side">
          <span className="count">№ 0043</span>
          <Stamp tone={issued ? 'lime' : 'slate'}>{issued ? '已开具' : '草稿'}</Stamp>
        </div>
      </div>

      {/* 板：一根上边线 + 一档底色，左右不出线 */}
      <div className="plate">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--line-soft)] px-[var(--sp-5)] py-[var(--sp-4)]">
          <span className="label">Training Mandate</span>
          <span className="cond text-micro text-[var(--fg-2)]">
            {from} → {to} · {days} 个交易日
          </span>
        </div>

        <div className="grid grid-cols-1 gap-x-[var(--sp-7)] gap-y-0 p-[var(--sp-5)] md:grid-cols-2">
          {/* 01 时段 */}
          <fieldset className="min-w-0 pb-[var(--sp-6)]">
            <legend className="sr-only">训练时段</legend>
            <FieldHead no="01" title="时段" note="交易日历受控" />
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="起始日期"
                className="h-11 min-w-0 flex-1 px-3 font-mono text-note"
              />
              <ArrowRight aria-hidden className="size-4 shrink-0 text-[var(--fg-2)]" />
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="结束日期"
                className="h-11 min-w-0 flex-1 px-3 font-mono text-note"
              />
            </div>
            <div className="mt-[var(--sp-4)] flex flex-col gap-2">
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
          <fieldset className="min-w-0 pb-[var(--sp-6)]">
            <legend className="sr-only">标的池</legend>
            <FieldHead no="02" title="标的池" note={chosenUniverse.code} />
            <div className="flex flex-col gap-2">
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
          <fieldset className="min-w-0 pb-[var(--sp-6)] md:border-t md:border-[var(--line-soft)] md:pt-[var(--sp-5)]">
            <legend className="sr-only">Agent 团队</legend>
            <FieldHead no="03" title="团队" note={team.length + ' 位'} />
            <div className="flex flex-col gap-2">
              {AGENT_ORDER.map((id) => {
                const agent = agentOf(id)
                const on = team.includes(id)
                const role = TEAM_ROLES[team.indexOf(id)] ?? '观察'
                return (
                  <label
                    key={id}
                    className={cn(
                      'relative flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2.5 transition-colors',
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
                      {agent.name.split(' · ')[0]}
                    </span>
                    <span
                      className={cn(
                        'cond shrink-0 text-micro',
                        on ? 'text-[var(--lime)]' : 'text-[var(--fg-2)]',
                      )}
                    >
                      {on ? role : '—'}
                    </span>
                  </label>
                )
              })}
            </div>
            {team.length === 0 ? (
              <p className="mt-[var(--sp-3)] text-note text-[var(--up)]">至少需要委托 1 位 Agent</p>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-10 w-full justify-start px-2 text-micro font-normal"
                onClick={() => open({ kind: 'agent', agentId: team[0] })}
              >
                <Settings2 aria-hidden className="size-3.5" />
                配置 {agentOf(team[0]).name.split(' · ')[0]}
              </Button>
            )}
          </fieldset>

          {/* 04 规则 */}
          <fieldset className="min-w-0 pb-[var(--sp-6)] md:border-t md:border-[var(--line-soft)] md:pt-[var(--sp-5)]">
            <legend className="sr-only">资金与规则</legend>
            <FieldHead no="04" title="规则" note={capital} />
            <div className="grid grid-cols-2 gap-2">
              {CAPITALS.map((c) => (
                <Chip key={c} checked={capital === c} onSelect={() => setCapital(c)} label={c} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <Chip key={m} checked={mode === m} onSelect={() => setMode(m)} label={m} />
              ))}
            </div>
            <dl className="mt-[var(--sp-5)] border-t border-[var(--line-soft)] pt-[var(--sp-3)] text-note">
              <Row k="费用" v="¥5 / 笔" />
              <Row k="滑点" v="万三" />
              <Row k="时段" v={chosenSession.name} />
            </dl>
          </fieldset>
        </div>

        {/* 摘要 + 开具 */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-[var(--line-soft)] px-[var(--sp-5)] py-[var(--sp-5)]">
          <div className="min-w-0">
            <p className="font-sans text-body font-semibold leading-snug tracking-[-0.01em] text-[var(--fg-0)]">
              {days} 个交易日 · {chosenUniverse.name} · {team.length} 位 Agent · {mode}
            </p>
            <p className="cond mt-2 text-micro text-[var(--fg-2)]">
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
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-[var(--fg-2)]">{k}</dt>
      <dd className="truncate font-mono text-note text-[var(--fg-0)]">{v}</dd>
    </div>
  )
}

function FieldHead({ no, title, note }: { no: string; title: string; note: string }) {
  return (
    <div className="mb-[var(--sp-4)] flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
      <span className="flex items-baseline gap-2.5">
        {/* 分节序号 01/02/03 → 酸橙：它是坐标系里的刻度，不是告警 */}
        <span className="cond text-micro text-[var(--lime)]">{no}</span>
        <span className="text-body font-semibold tracking-[0.01em] text-[var(--fg-0)]">{title}</span>
      </span>
      <span className="cond shrink-0 text-micro text-[var(--fg-2)]">{note}</span>
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
        'relative flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-3.5 py-3 transition-colors',
        checked ? 'bg-[var(--lime-soft)]' : 'bg-[var(--bg-2)] hover:bg-[var(--bg-3)]',
      )}
    >
      {checked ? (
        <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] rounded-l-lg bg-[var(--lime)]" />
      ) : null}
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-1 size-4 shrink-0 accent-[var(--lime)]"
      />
      <span className="min-w-0">
        <span
          className={cn(
            'block text-note font-medium leading-snug',
            checked ? 'text-[var(--fg-0)]' : 'text-[var(--fg-1)]',
          )}
        >
          {title}
        </span>
        {/* 选中项底色是 lime-soft，比 --bg-1 亮一档：注文必须跟着抬到 --fg-1，
            否则 fg-2 在其上只有 4.0:1 */}
        <span
          className={cn(
            'mt-1 block text-micro leading-snug',
            checked ? 'text-[var(--fg-1)]' : 'text-[var(--fg-2)]',
          )}
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
        'relative min-h-11 whitespace-nowrap rounded-lg px-3 font-mono text-note transition-colors',
        checked
          ? 'bg-[var(--lime-soft)] text-[var(--fg-0)]'
          : 'bg-[var(--bg-2)] text-[var(--fg-1)] hover:bg-[var(--bg-3)]',
      )}
    >
      {checked ? (
        <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] rounded-l-lg bg-[var(--lime)]" />
      ) : null}
      {label}
    </button>
  )
}
