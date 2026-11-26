import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, Lock, Settings2, Shield } from 'lucide-react'

import { AGENT_ORDER } from '../../data/agents'
import { SESSION_PRESETS, UNIVERSE_PRESETS } from '../../data/trainings'
import { formatAgent } from '../../i18n/helpers'
import { cn } from '../../lib/utils'
import { useDialog } from '../../store/DialogProvider'
import { useTraining } from '../../store/TrainingProvider'
import type { AgentId, Mode, TranslationKey } from '../../types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Stamp } from '../ui/Stamp'

const CAPITALS = [
  { label: '¥100,000', value: 100000 },
  { label: '¥200,000', value: 200000 },
] as const

const TEAM_ROLE_KEYS: readonly TranslationKey[] = [
  'mandate.roles.lead',
  'mandate.roles.researcher',
  'mandate.roles.risk',
]

const MODES: ReadonlyArray<{ id: Mode; labelKey: TranslationKey }> = [
  { id: 'approval', labelKey: 'mandate.modes.approval' },
  { id: 'goal', labelKey: 'mandate.modes.goal' },
]

/**
 * 委托单（Step 02 核心控件）
 */
export function MandateTicket() {
  const navigate = useNavigate()
  const { open } = useDialog()
  const { nextMandateNo, draftAgent, issueMandate } = useTraining()
  const { t } = useTranslation()

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

  const days = useMemo(() => {
    const a = new Date(from).getTime()
    const b = new Date(to).getTime()
    if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0
    return Math.max(1, Math.round(((b - a) / 86400000 / 7) * 5))
  }, [from, to])

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
    <section aria-labelledby="mandate-h">
      <div className="section-hd mt-0">
        <h2 id="mandate-h">{t('mandate.title')}</h2>
        <div className="section-hd-side">
          <span className="count font-mono tabular-nums">{issuedNo ?? nextMandateNo}</span>
          <Stamp tone={issuedNo ? 'lime' : 'slate'}>
            {issuedNo ? t('mandate.issuedLocked') : t('mandate.draft')}
          </Stamp>
        </div>
      </div>

      <div className="plate">
        <div className="grid grid-cols-1 gap-x-[var(--sp-6)] gap-y-2 p-[var(--sp-5)] md:grid-cols-2">
          {/* 01 时段与抗污染 */}
          <fieldset className="min-w-0 pb-[var(--sp-5)]">
            <legend className="sr-only">{t('mandate.field01Legend')}</legend>
            <FieldHead
              no="01"
              title={t('mandate.field01Title')}
              note={`${t('mandate.daysShort', { days })}${days < 60 ? t('mandate.unrankedShort') : ''}`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value)
                  setIssuedNo(null)
                }}
                aria-label={t('mandate.startDateAria')}
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
                aria-label={t('mandate.endDateAria')}
                className="h-10 min-w-[144px] flex-1 px-3 font-mono text-note"
              />
            </div>

            <div className="mt-3.5 flex flex-col gap-2">
              {SESSION_PRESETS.map((s) => (
                <Choice
                  key={s.id}
                  name="session"
                  checked={session === s.id}
                  onSelect={() => {
                    setSession(s.id)
                    setIssuedNo(null)
                  }}
                  title={t(s.nameKey)}
                  note={t(s.noteKey)}
                />
              ))}
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--lime-soft)] px-2.5 py-1 text-micro font-medium text-[var(--lime)]">
                <Lock size={13} aria-hidden />
                {t('mandate.pitEnforced')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setBlindMask((v) => !v)
                  setIssuedNo(null)
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-micro font-medium transition-colors',
                  blindMask
                    ? 'bg-[var(--lime-soft)] text-[var(--lime)]'
                    : 'bg-[var(--bg-2)] text-[var(--fg-2)]',
                )}
              >
                <Shield size={13} aria-hidden />
                {blindMask ? t('mandate.blindMaskOn') : t('mandate.blindMaskOff')}
              </button>
            </div>
          </fieldset>

          {/* 02 标的池三级漏斗 */}
          <fieldset className="min-w-0 pb-[var(--sp-5)]">
            <legend className="sr-only">{t('mandate.field02Legend')}</legend>
            <FieldHead no="02" title={t('mandate.field02Title')} note={chosenUniverse.code} />
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
                  title={t(u.nameKey)}
                  note={t(u.noteKey)}
                />
              ))}
            </div>
          </fieldset>

          {/* 03 单执行者团队 */}
          <fieldset className="min-w-0 pb-[var(--sp-4)] md:border-t md:border-[var(--line-soft)] md:pt-[var(--sp-5)]">
            <legend className="sr-only">{t('mandate.field03Legend')}</legend>
            <FieldHead
              no="03"
              title={t('mandate.field03Title')}
              note={t('mandate.selectedCount', { count: team.length })}
            />
            <div className="flex flex-col gap-2">
              {AGENT_ORDER.map((id) => {
                const agent = formatAgent(id, t)
                const idx = team.indexOf(id)
                const on = idx >= 0
                const role = on ? t(TEAM_ROLE_KEYS[idx] ?? TEAM_ROLE_KEYS[2]) : '—'
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
                      {agent.name}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-micro font-medium',
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
              <p className="mt-2.5 text-note text-[var(--up)]">{t('mandate.selectAtLeastOne')}</p>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2.5 h-9 w-full justify-start px-2 text-micro font-normal"
                onClick={() => open({ kind: 'agent', agentId: team[0] })}
              >
                <Settings2 aria-hidden className="size-3.5" />
                {t('mandate.configureLead', { name: formatAgent(team[0], t).shortName })}
              </Button>
            )}
          </fieldset>

          {/* 04 资金与规则 */}
          <fieldset className="min-w-0 pb-[var(--sp-4)] md:border-t md:border-[var(--line-soft)] md:pt-[var(--sp-5)]">
            <legend className="sr-only">{t('mandate.field04Legend')}</legend>
            <FieldHead
              no="04"
              title={t('mandate.field04Title')}
              note={`¥${capital.toLocaleString('en-US')}`}
            />
            <div className="grid grid-cols-2 gap-2.5">
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
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {MODES.map((m) => (
                <Chip
                  key={m.id}
                  checked={mode === m.id}
                  onSelect={() => {
                    setMode(m.id)
                    setIssuedNo(null)
                  }}
                  label={t(m.labelKey)}
                />
              ))}
            </div>

            <details className="mt-4 rounded-lg border border-[var(--line-soft)] bg-[var(--bg-2)] px-3.5 py-2.5">
              <summary className="flex list-none items-center justify-between gap-2 text-micro font-medium text-[var(--fg-1)] [&::-webkit-details-marker]:hidden">
                <span>{t('mandate.rulesDrawerSummary')}</span>
                <ChevronDown size={14} aria-hidden className="text-[var(--fg-2)]" />
              </summary>
              <dl className="mt-2.5 border-t border-[var(--line-soft)] pt-2 text-note">
                <Row k={t('mandate.aShareRulesKey')} v={t('mandate.aShareRulesVal')} />
                <Row k={t('mandate.feeSlippageKey')} v={t('mandate.feeSlippageVal')} />
                <Row k={t('mandate.pricingBasisKey')} v={t('mandate.pricingBasisVal')} />
              </dl>
            </details>
          </fieldset>
        </div>

        {/* 摘要 + 开具 + 直达训练场 */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line-soft)] px-[var(--sp-5)] py-4">
          <p className="min-w-0 font-sans text-body font-medium leading-snug text-[var(--fg-1)]">
            {t('mandate.summaryLine', {
              days,
              universe: t(chosenUniverse.nameKey),
              count: team.length,
              mode: mode === 'approval' ? t('mandate.modeHitl') : '/goal',
            })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {issuedNo ? (
              <Button variant="solid" size="sm" onClick={() => navigate('/training')}>
                {t('mandate.btnEnterArena', { no: issuedNo })}
                <ArrowRight size={15} aria-hidden />
              </Button>
            ) : (
              <Button
                variant="solid"
                size="sm"
                disabled={team.length === 0 || days === 0}
                onClick={handleIssue}
              >
                {t('mandate.btnIssueMandate', { no: nextMandateNo })}
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
    <div className="mb-3.5 flex items-baseline justify-between gap-2">
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-micro font-medium tabular-nums text-[var(--lime)]">{no}</span>
        <span className="font-sans text-body font-semibold text-[var(--fg-0)]">{title}</span>
      </div>
      <span className="truncate text-micro text-[var(--fg-2)]">{note}</span>
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
        'h-10 rounded-lg border px-3 font-sans text-note font-medium transition-colors',
        checked
          ? 'border-[var(--line-lime)] bg-[var(--lime-soft)] text-[var(--fg-0)]'
          : 'border-[var(--line-soft)] bg-[var(--bg-2)] text-[var(--fg-1)] hover:bg-[var(--bg-3)]',
      )}
    >
      {label}
    </button>
  )
}
