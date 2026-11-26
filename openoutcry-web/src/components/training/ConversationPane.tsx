import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Copy, Pause, Play, Plus, ShieldAlert } from 'lucide-react'

import { agentOf } from '../../data/agents'
import { seq } from '../../lib/format'
import { cn } from '../../lib/utils'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useRun, useWorkspaceKind } from '../../store/RunProvider'
import { useActiveWorkbenchTask } from '../../store/TrainingProvider'
import type { EventKind } from '../../types'

const KIND_LABEL_ZH: Record<EventKind, string> = {
  agent: '思考',
  tool: '工具',
  order: '提案',
  user: '我',
  error: '异常',
  system: '系统',
}

const KIND_LABEL_EN: Record<EventKind, string> = {
  agent: 'Think',
  tool: 'Tool',
  order: 'Order',
  user: 'You',
  error: 'Error',
  system: 'System',
}

type FilterId = 'all' | 'agent' | 'tool' | 'order' | 'user'

const FILTERS: Array<{ id: FilterId; zh: string; en: string }> = [
  { id: 'all', zh: '全部', en: 'All' },
  { id: 'agent', zh: '思考', en: 'Think' },
  { id: 'tool', zh: '工具', en: 'Tools' },
  { id: 'order', zh: '提案', en: 'Orders' },
  { id: 'user', zh: '人工', en: 'Human' },
]

interface Props {
  className?: string
  hideHeader?: boolean
}

/**
 * 左栏 = 阶段化可审计轨迹流（对话 + 证据工具卡 + 阶段分隔条 + 人工插话）：
 * 历史训练场与实战工作台共用同一骨架，但通过 system 提示条与 PIT 证据卡清晰区分语义。
 */
export function ConversationPane({ className, hideHeader = false }: Props) {
  const kind = useWorkspaceKind()
  const { state, actions } = useRun()
  const { conversation } = useActiveWorkbenchTask()
  const { open } = useDialog()
  const { isEn, bi } = useLocale()
  const agent = agentOf(state.agent)

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
  const waitingHuman = state.status === 'active' && state.proposal.status === 'pending'
  const connected = state.status !== 'disconnected'
  const kindLabel = isEn ? KIND_LABEL_EN : KIND_LABEL_ZH

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
    <section aria-label={bi('Agent 决策轨迹流', 'Agent Decision Trace')} className={cn('conv-pane', className)}>
      {hideHeader ? null : (
        <header className="conv-hd">
          <span aria-hidden className="conv-avatar">
            {agent.name.replace(/[^A-Za-z\u4e00-\u9fa5]/g, '').slice(0, 2)}
          </span>
          <div className="conv-hd-main">
            <h2 className="conv-title">{conversation.name}</h2>
            <p className="conv-sub">
              <i aria-hidden className="conv-dot" data-on={connected ? 'y' : 'n'} />
              {isLive ? (
                <>
                  {agent.name} · {bi('实时辅助 · 仅给建议不代下单', 'Live Advisory · No Auto-Order')}
                </>
              ) : (
                <>
                  {agent.name} · {connected ? bi('在线', 'Online') : bi('断开', 'Offline')} ·{' '}
                  {state.mode === 'goal' ? bi('/goal 自主推进', '/goal Autonomous') : bi('逐案确认', 'HITL Approval')}
                </>
              )}
            </p>
          </div>
        </header>
      )}

      {/* 轻量事件筛选 + 暂停滚动开关（借鉴 TraderHarness 控制室） */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-soft)] px-4 py-2">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label={bi('筛选轨迹事件', 'Filter trace events')}>
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
              {isEn ? f.en : f.zh}
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
          {pauseScroll ? bi('已暂停滚动', 'Paused') : bi('自动跟随', 'Follow')}
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {last ? `第 ${seq(last.id)} 条：${last.title}` : ''}
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
            {bi('当前筛选条件下暂无事件。', 'No events under this filter.')}
          </p>
        ) : null}

        {visibleEvents.map((e) => {
          const isMine = e.kind === 'user'
          const isTool = e.kind === 'tool'
          const isOrder = e.kind === 'order'
          const isSystem = e.kind === 'system'
          const openBody = expanded[e.id] ?? false

          return (
            <div key={e.id} className="space-y-3">
              {/* 交易日 / 阶段分隔条 */}
              {e.divider ? (
                <div className="flex items-center gap-2 py-1">
                  <span className="h-px flex-1 bg-[var(--line)]" aria-hidden />
                  <span className="rounded bg-[var(--bg-2)] px-2.5 py-0.5 font-mono text-micro text-[var(--fg-1)]">
                    {e.divider}
                  </span>
                  <span className="h-px flex-1 bg-[var(--line)]" aria-hidden />
                </div>
              ) : null}

              {/* 系统状态提示条（不再冒充用户气泡） */}
              {isSystem ? (
                <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-2)] px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2 font-mono text-micro text-[var(--lime)]">
                    <span>{e.title}</span>
                    <span className="text-[var(--fg-2)]">{e.at}</span>
                  </div>
                  {e.body ? <p className="mt-1 text-note leading-relaxed text-[var(--fg-1)]">{e.body}</p> : null}
                </div>
              ) : isMine ? (
                <div className="flex flex-col items-end gap-1">
                  <div className="max-w-[88%] rounded-[16px] rounded-br-[6px] bg-[var(--bg-3)] px-3.5 py-2.5 text-body leading-[1.6] text-[var(--ink)]">
                    {e.body || e.title}
                  </div>
                  <span className="pr-1 font-mono text-micro tabular-nums text-[var(--ink-2)]">{e.at}</span>
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
                      {isOrder ? (isLive ? '建' : '提') : '工'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-note font-medium text-[var(--ink)]">{e.title}</span>
                    <span className="shrink-0 font-mono text-micro tracking-[0.04em] text-[var(--ink-2)]">
                      {isOrder && isLive ? bi('建议', 'Adv') : kindLabel[e.kind]} · {e.at}
                    </span>
                  </button>

                  {openBody ? (
                    <div className="space-y-2 rounded-[10px] border border-[var(--line)] bg-[var(--bg-1)] p-3">
                      {e.body ? <p className="whitespace-pre-wrap text-note leading-relaxed text-[var(--ink-2)]">{e.body}</p> : null}

                      {/* PIT 证据卡片列表 */}
                      {e.evidenceItems && e.evidenceItems.length > 0 ? (
                        <div className="space-y-2 pt-1">
                          {e.evidenceItems.map((ev) => (
                            <div
                              key={ev.id}
                              className="rounded-md border border-[var(--line-soft)] bg-[var(--bg-2)] px-3 py-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-micro">
                                <span className="font-semibold text-[var(--fg-0)]">
                                  {ev.id} · {ev.title}
                                </span>
                                <span className="text-[var(--lime)]">
                                  {ev.publishedAt} · {ev.pitPass ? bi('✓ PIT 合格', '✓ PIT Pass') : bi('受限', 'Blocked')}
                                </span>
                              </div>
                              <p className="mt-1 text-note leading-relaxed text-[var(--fg-1)]">{ev.summary}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* 时点闸门拦截提示 */}
                      {e.interceptedNote ? (
                        <div className="flex items-start gap-2 rounded-md bg-[var(--warn-soft)] px-3 py-2 font-mono text-micro text-[var(--warn)]">
                          <ShieldAlert size={15} aria-hidden className="mt-0.5 shrink-0" />
                          <span>{e.interceptedNote}</span>
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
                      {e.speakerRole ?? agent.name.split(' · ')[0]}
                    </span>
                    <span className="font-mono text-micro tabular-nums tracking-[0.04em] text-[var(--ink-2)]">
                      {e.at}
                    </span>
                    <button
                      type="button"
                      onClick={() => copy(e.id, e.title + '\n' + e.body)}
                      aria-label={bi('复制这条消息', 'Copy message')}
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
                    {e.title}
                  </p>
                  {e.body ? <p className="whitespace-pre-wrap text-body leading-[1.7] text-[var(--ink-2)]">{e.body}</p> : null}
                </div>
              )}
            </div>
          )
        })}

        {waitingHuman ? (
          <div className="rounded-[12px] bg-[var(--warn-soft)] px-3.5 py-3">
            <span className="font-mono text-micro font-semibold uppercase tracking-[0.14em] text-[var(--warn)]">
              {isLive ? bi('等待你的实盘决策', 'Awaiting Your Live Decision') : bi('等待人工核验与审批', 'Awaiting Human Approval')}
            </span>
            <p className="mt-1.5 text-note leading-relaxed text-[var(--fg-0)]">
              {isLive
                ? bi(
                    '调仓建议单已在右侧就绪：请自行去券商端决定是否下单，完成后回来记账或标记暂不采纳。',
                    'Advisory ready on the right: decide in your own broker, then log the fill or ignore here.',
                  )
                : bi(
                    '待审提案已在右侧完成 A 股规则预检。你可以在右侧批准、改量或拒绝，也可以在下方插话要求 Agent 重新评估。',
                    'Proposal passed deterministic A-share pre-checks on the right. Approve, modify, or reject there, or send guidance below.',
                  )}
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
              {bi('最新', 'Latest')}
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
            {isLive ? bi('实盘追问或说明', 'Live follow-up') : bi('人工插话指导', 'Human guidance')}
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
                ? bi('本次运行已中止。', 'This run has been aborted.')
                : isLive
                  ? bi('追问持仓、实时行情或记录实盘想法…', 'Ask about holdings or live market…')
                  : bi('插话指导，或输入 /goal 切入自主推进…', 'Send guidance, or type /goal for autonomous mode…')
            }
          />
          <div className="conv-bar">
            {isLive ? (
              <button
                type="button"
                className="conv-plus"
                onClick={() => open({ kind: 'editHolding', scope: kind })}
                aria-label={bi('维护镜像持仓', 'Edit Mirror Holdings')}
                title={bi('手动新增或调整实盘镜像持仓', 'Edit mirror holdings')}
              >
                <Plus size={16} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                className="conv-plus"
                disabled={aborted}
                onClick={() => open({ kind: 'goal', scope: kind })}
                aria-label={bi('切换 /goal 自主推进', 'Switch to /goal autonomous mode')}
                title={bi('切入 /goal 自主推进模式', 'Enter /goal autonomous mode')}
              >
                <Plus size={16} aria-hidden />
              </button>
            )}
            <button
              type="submit"
              className="conv-send"
              disabled={aborted || !text.trim()}
              aria-label={bi('发送', 'Send')}
            >
              <ArrowUp size={16} aria-hidden />
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
