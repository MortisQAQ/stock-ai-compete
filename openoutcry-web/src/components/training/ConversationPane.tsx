import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Check, Copy, Pause, Play, Plus, ShieldAlert } from 'lucide-react'

import {
  formatAgent,
  formatConversation,
  formatEvent,
  formatEvidence,
} from '../../i18n/helpers'
import { seq } from '../../lib/format'
import { cn } from '../../lib/utils'
import { useDialog } from '../../store/DialogProvider'
import { useRun, useWorkspaceKind } from '../../store/RunProvider'
import { useActiveWorkbenchTask } from '../../store/TrainingProvider'
import type { EventKind, TranslationKey } from '../../types'

const KIND_KEY: Record<EventKind, TranslationKey> = {
  agent: 'training.conv.kinds.agent',
  tool: 'training.conv.kinds.tool',
  order: 'training.conv.kinds.order',
  user: 'training.conv.kinds.user',
  error: 'training.conv.kinds.error',
  system: 'training.conv.kinds.system',
}

type FilterId = 'all' | 'agent' | 'tool' | 'order' | 'user'

const FILTERS: ReadonlyArray<{ id: FilterId; labelKey: TranslationKey }> = [
  { id: 'all', labelKey: 'training.conv.filters.all' },
  { id: 'agent', labelKey: 'training.conv.filters.agent' },
  { id: 'tool', labelKey: 'training.conv.filters.tool' },
  { id: 'order', labelKey: 'training.conv.filters.order' },
  { id: 'user', labelKey: 'training.conv.filters.user' },
]

interface Props {
  className?: string
  hideHeader?: boolean
}

export function ConversationPane({ className, hideHeader = false }: Props) {
  const kind = useWorkspaceKind()
  const { state, actions } = useRun()
  const { task, conversation } = useActiveWorkbenchTask()
  const { open } = useDialog()
  const { t } = useTranslation()
  const agent = formatAgent(state.agent, t)
  const convView = formatConversation(task, conversation, t)

  const [text, setText] = useState('')
  const [filter, setFilter] = useState<FilterId>('all')
  const [pauseScroll, setPauseScroll] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<number | null>(null)
  const [atBottom, setAtBottom] = useState(true)
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevCount = useRef(state.events.length)
  const inputId = useId()

  const isLive = state.kind === 'live'
  const aborted = state.status === 'aborted'
  const last = state.events[state.events.length - 1]
  const lastView = last ? formatEvent(last, t) : null
  const waitingHuman = state.status === 'active' && state.proposal.status === 'pending'
  const connected = state.status !== 'disconnected'

  const visibleEvents = state.events.filter((e) => {
    if (filter === 'all') return true
    if (filter === 'agent') return e.kind === 'agent' || e.kind === 'system'
    return e.kind === filter
  })

  const scrollToBottom = (smooth = true) => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  useEffect(() => {
    const el = bodyRef.current
    if (!el || pauseScroll) return
    if (state.events.length === prevCount.current) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140
    prevCount.current = state.events.length
    if (nearBottom) scrollToBottom(false)
  }, [state.events.length, pauseScroll])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [text])

  const send = () => {
    const value = text.trim()
    if (!value || aborted) return
    if (value === '/goal') {
      setText('')
      if (isLive) {
        actions.enterGoalMode()
        return
      }
      open({ kind: 'goal', scope: kind })
      return
    }
    actions.sendGuidance(value)
    setText('')
    requestAnimationFrame(() => scrollToBottom(false))
  }

  const copy = async (id: number, payload: string) => {
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(id)
      window.setTimeout(() => setCopied(null), 1400)
    } catch {
      /* 剪贴板不可用时静默 */
    }
  }

  return (
    <section aria-label={t('training.conv.paneAria')} className={cn('conv-pane', className)}>
      {hideHeader ? null : (
        <header className="conv-hd">
          <span aria-hidden className="conv-avatar">
            {agent.name.replace(/[^A-Za-z\u4e00-\u9fa5]/g, '').slice(0, 2)}
          </span>
          <div className="conv-hd-main">
            <h2 className="conv-title">{convView.name}</h2>
            <p className="conv-sub">
              <i aria-hidden className="conv-dot" data-on={connected ? 'y' : 'n'} />
              {isLive ? (
                <>
                  {agent.name} · {t('training.conv.liveSub')}
                </>
              ) : (
                <>
                  {agent.name} · {connected ? t('training.conv.online') : t('training.conv.offline')} ·{' '}
                  {state.mode === 'goal' ? t('training.conv.goalMode') : t('training.conv.hitlMode')}
                </>
              )}
            </p>
          </div>
        </header>
      )}

      {/* 轻量事件筛选 + 暂停滚动开关 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-soft)] px-4 py-2">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t('training.conv.filterAria')}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                'rounded px-2 py-0.5 font-mono text-micro transition-colors',
                filter === f.id
                  ? 'bg-[var(--lime-soft)] font-semibold text-[var(--lime)]'
                  : 'text-[var(--fg-2)] hover:text-[var(--fg-0)]',
              )}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPauseScroll((v) => !v)}
          aria-pressed={pauseScroll}
          className={cn(
            'inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-micro transition-colors',
            pauseScroll ? 'bg-[var(--warn-soft)] text-[var(--warn)]' : 'text-[var(--fg-2)] hover:text-[var(--fg-0)]',
          )}
        >
          {pauseScroll ? <Play size={12} aria-hidden /> : <Pause size={12} aria-hidden />}
          {pauseScroll ? t('training.conv.paused') : t('training.conv.follow')}
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {last && lastView ? t('training.conv.srLatest', { seq: seq(last.id), title: lastView.title }) : ''}
      </p>

      <div
        ref={bodyRef}
        onScroll={(e) => {
          const el = e.currentTarget
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60)
        }}
        className="conv-body"
      >
        {visibleEvents.length === 0 ? (
          <p className="py-8 text-center text-note leading-relaxed text-[var(--ink-2)]">
            {t('training.conv.emptyFiltered')}
          </p>
        ) : null}

        {visibleEvents.map((e) => {
          const isMine = e.kind === 'user'
          const isTool = e.kind === 'tool'
          const isOrder = e.kind === 'order'
          const isSystem = e.kind === 'system'
          const openBody = expanded[e.id] ?? false
          const view = formatEvent(e, t)

          return (
            <div key={e.id} className="space-y-3">
              {view.divider ? (
                <div className="flex items-center gap-2 py-1">
                  <span className="h-px flex-1 bg-[var(--line)]" aria-hidden />
                  <span className="rounded bg-[var(--bg-2)] px-2.5 py-0.5 font-mono text-micro text-[var(--fg-1)]">
                    {view.divider}
                  </span>
                  <span className="h-px flex-1 bg-[var(--line)]" aria-hidden />
                </div>
              ) : null}

              {isSystem ? (
                <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-2)] px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2 font-mono text-micro text-[var(--lime)]">
                    <span>{view.title}</span>
                    <span className="text-[var(--fg-2)]">{view.at}</span>
                  </div>
                  {view.body ? <p className="mt-1 text-note leading-relaxed text-[var(--fg-1)]">{view.body}</p> : null}
                </div>
              ) : isMine ? (
                <div className="flex flex-col items-end gap-1">
                  <div className="max-w-[88%] rounded-[16px] rounded-br-[6px] bg-[var(--bg-3)] px-3.5 py-2.5 text-body leading-[1.6] text-[var(--ink)]">
                    {view.body || view.title}
                  </div>
                  <span className="pr-1 font-mono text-micro tabular-nums text-[var(--ink-2)]">{view.at}</span>
                </div>
              ) : isTool || isOrder ? (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => ({ ...prev, [e.id]: !openBody }))}
                    aria-expanded={openBody}
                    className={cn(
                      'group flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left transition-colors',
                      isOrder ? 'bg-[var(--up-soft)] hover:bg-[var(--bg-3)]' : 'bg-[var(--bg-2)] hover:bg-[var(--bg-3)]',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full font-mono text-micro font-bold',
                        isOrder ? 'bg-[var(--ver)] text-[var(--bg-1)]' : 'bg-[var(--brass-hi)] text-[var(--bg-0)]',
                      )}
                    >
                      {isOrder
                        ? isLive
                          ? t('training.conv.glyphOrderLive')
                          : t('training.conv.glyphOrderSim')
                        : t('training.conv.glyphTool')}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-note font-medium text-[var(--ink)]">{view.title}</span>
                    <span className="shrink-0 font-mono text-micro tracking-[0.04em] text-[var(--ink-2)]">
                      {isOrder && isLive ? t('training.conv.advisoryShort') : t(KIND_KEY[e.kind])} · {view.at}
                    </span>
                  </button>

                  {openBody ? (
                    <div className="space-y-2 rounded-[10px] border border-[var(--line)] bg-[var(--bg-1)] p-3">
                      {view.body ? <p className="whitespace-pre-wrap text-note leading-relaxed text-[var(--ink-2)]">{view.body}</p> : null}

                      {e.evidenceItems && e.evidenceItems.length > 0 ? (
                        <div className="space-y-2 pt-1">
                          {e.evidenceItems.map((ev) => {
                            const evView = formatEvidence(ev, t)
                            return (
                              <div
                                key={ev.id}
                                className="rounded-md border border-[var(--line-soft)] bg-[var(--bg-2)] px-3 py-2"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-micro">
                                  <span className="font-semibold text-[var(--fg-0)]">
                                    {ev.id} · {evView.title}
                                  </span>
                                  <span className="text-[var(--lime)]">
                                    {ev.publishedAt} · {ev.pitPass ? t('training.conv.pitPass') : t('training.conv.pitBlocked')}
                                  </span>
                                </div>
                                <p className="mt-1 text-note leading-relaxed text-[var(--fg-1)]">{evView.summary}</p>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}

                      {view.interceptedNote ? (
                        <div className="flex items-start gap-2 rounded-md bg-[var(--warn-soft)] px-3 py-2 font-mono text-micro text-[var(--warn)]">
                          <ShieldAlert size={15} aria-hidden className="mt-0.5 shrink-0" />
                          <span>{view.interceptedNote}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="group space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      aria-hidden
                      className="block size-[5px] rounded-full"
                      style={{ background: e.kind === 'error' ? 'var(--ver)' : 'var(--lime)' }}
                    />
                    <span className="font-mono text-micro font-semibold tracking-[0.04em] text-[var(--ink-2)]">
                      {view.speakerRole ?? agent.shortName}
                    </span>
                    <span className="font-mono text-micro tabular-nums tracking-[0.04em] text-[var(--ink-2)]">
                      {view.at}
                    </span>
                    <button
                      type="button"
                      onClick={() => copy(e.id, view.title + '\n' + view.body)}
                      aria-label={t('training.conv.copyMessage')}
                      className="ml-auto rounded p-0.5 text-[var(--ink-2)] opacity-0 transition-opacity hover:text-[var(--ink)] focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      {copied === e.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p
                    className={cn(
                      'text-body font-semibold leading-[1.55] text-[var(--ink)]',
                      e.kind === 'error' && 'text-[var(--ver)]',
                    )}
                  >
                    {view.title}
                  </p>
                  {view.body ? <p className="whitespace-pre-wrap text-body leading-[1.7] text-[var(--ink-2)]">{view.body}</p> : null}
                </div>
              )}
            </div>
          )
        })}

        {waitingHuman ? (
          <div className="rounded-[12px] bg-[var(--warn-soft)] px-3.5 py-3">
            <span className="font-mono text-micro font-semibold uppercase tracking-[0.14em] text-[var(--warn)]">
              {isLive ? t('training.conv.waitingLiveTitle') : t('training.conv.waitingSimTitle')}
            </span>
            <p className="mt-1.5 text-note leading-relaxed text-[var(--fg-0)]">
              {isLive ? t('training.conv.waitingLiveBody') : t('training.conv.waitingSimBody')}
            </p>
          </div>
        ) : null}

        {!atBottom ? (
          <div className="sticky bottom-1 flex justify-center">
            <button
              type="button"
              onClick={() => scrollToBottom()}
              className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--bg-1)] px-2.5 py-1 font-mono text-micro uppercase tracking-[0.1em] text-[var(--ink-2)]"
            >
              <ArrowDown size={13} />
              {t('training.conv.latest')}
            </button>
          </div>
        ) : null}
      </div>

      <form
        className="conv-form"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <div className="conv-input">
          <label htmlFor={inputId} className="sr-only">
            {isLive ? t('training.conv.inputLiveAria') : t('training.conv.inputSimAria')}
          </label>
          <textarea
            id={inputId}
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                send()
              }
            }}
            rows={1}
            disabled={aborted}
            placeholder={
              aborted
                ? t('training.conv.placeholderAborted')
                : isLive
                  ? t('training.conv.placeholderLive')
                  : t('training.conv.placeholderSim')
            }
          />
          <div className="conv-bar">
            {isLive ? (
              <button
                type="button"
                className="conv-plus"
                onClick={() => open({ kind: 'editHolding', scope: kind })}
                aria-label={t('training.conv.editHoldingsAria')}
                title={t('training.conv.editHoldingsTitle')}
              >
                <Plus size={16} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                className="conv-plus"
                disabled={aborted}
                onClick={() => open({ kind: 'goal', scope: kind })}
                aria-label={t('training.conv.goalAria')}
                title={t('training.conv.goalTitle')}
              >
                <Plus size={16} aria-hidden />
              </button>
            )}
            <button
              type="submit"
              className="conv-send"
              disabled={aborted || !text.trim()}
              aria-label={t('training.conv.sendAria')}
            >
              <ArrowUp size={16} aria-hidden />
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
