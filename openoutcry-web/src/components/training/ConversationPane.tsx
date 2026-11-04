import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Copy, Plus } from 'lucide-react'

import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { agentOf } from '../../data/agents'
import { seq } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { EventKind } from '../../types'

const KIND_LABEL: Record<EventKind, string> = {
  agent: '思考',
  tool: '工具',
  order: '提案',
  user: '我',
  error: '异常',
}

interface Props {
  className?: string
  /** 移动端助手页自带栏头，这里就不再重复 */
  hideHeader?: boolean
}

/**
 * 左栏 = 与当前 Agent 的对话，版式照 DSH 的会话界面：
 * 我的插话靠右、圆角气泡；Agent 的话不装盒子，直接在纸上写；
 * 工具调用和提案各占一行小圆角条，点了才展开。
 * 输入区是一个大连圆角框，左侧「+」、右下圆形发送键，框内不出现滚动条。
 */
export function ConversationPane({ className, hideHeader = false }: Props) {
  const { state, actions } = useRun()
  const { open } = useDialog()
  const agent = agentOf(state.agent)
  const [text, setText] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<number | null>(null)
  const [atBottom, setAtBottom] = useState(true)
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevCount = useRef(state.events.length)
  const inputId = useId()
  const aborted = state.status === 'aborted'
  const last = state.events[state.events.length - 1]
  const waitingHuman = state.status === 'active' && state.proposal.status === 'pending'
  const connected = state.status !== 'disconnected'

  const scrollToBottom = (smooth = true) => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    if (state.events.length === prevCount.current) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140
    prevCount.current = state.events.length
    if (nearBottom) scrollToBottom(false)
  }, [state.events.length])

  // 输入框随内容长高，封顶 5 行；框内不出现滚动条，超过就整体不再长高
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
      open({ kind: 'goal' })
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
    <section
      aria-label="Agent 会话"
      className={cn('flex min-h-0 min-w-0 flex-col bg-[var(--bone-lo)]', className)}
    >
      {hideHeader ? null : (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-[var(--rule-strong)] px-4 py-3">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--rule-strong)] bg-[var(--bone-hi)] font-serif text-micro font-bold uppercase text-[var(--ink)]"
          >
            {agent.name.replace(/[^A-Za-z\u4e00-\u9fa5]/g, '').slice(0, 2)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-serif text-note font-bold leading-tight tracking-[-0.01em] text-[var(--ink)]">
              {agent.name}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 font-mono text-micro tracking-[0.05em] text-[var(--ink-2)]">
              <i
                aria-hidden
                className="block size-[5px] rounded-full"
                style={{ background: connected ? 'var(--pine)' : 'var(--ver)' }}
              />
              {connected ? '在线' : '断开'} · {state.mode === 'goal' ? '自主推进' : '逐案确认'} ·{' '}
              {state.events.length} 条
            </p>
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {last ? `第 ${seq(last.id)} 条：${last.title}` : ''}
      </p>

      <div
        ref={bodyRef}
        onScroll={(e) => {
          const el = e.currentTarget
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60)
        }}
        className="relative min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {state.events.length === 0 ? (
          <p className="py-8 text-center text-note leading-relaxed text-[var(--ink-2)]">
            还没有对话。写下第一条插话，Agent 会从这里开始。
          </p>
        ) : null}

        {state.events.map((e) => {
          const isMine = e.kind === 'user'
          const isTool = e.kind === 'tool'
          const isOrder = e.kind === 'order'
          const openBody = expanded[e.id] ?? false

          /* ---------- 我：靠右圆角气泡 ---------- */
          if (isMine) {
            return (
              <div key={e.id} className="flex flex-col items-end gap-1">
                <div className="max-w-[88%] rounded-[16px] rounded-br-[6px] border border-[var(--rule-strong)] bg-[var(--bone-hi)] px-3.5 py-2.5 text-body leading-[1.6] text-[var(--ink)]">
                  {e.body || e.title}
                </div>
                <span className="pr-1 font-mono text-micro tabular-nums text-[var(--ink-2)]">{e.at}</span>
              </div>
            )
          }

          /* ---------- 工具 / 提案：一行小条，点开展开 ---------- */
          if (isTool || isOrder) {
            return (
              <div key={e.id} className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [e.id]: !openBody }))}
                  aria-expanded={openBody}
                  className={cn(
                    'group flex w-full items-center gap-2 rounded-[10px] border px-2.5 py-2 text-left transition-colors',
                    isOrder
                      ? 'border-[var(--ver)] bg-[var(--bone-hi)] hover:bg-[var(--bone)]'
                      : 'border-[var(--rule)] bg-[var(--bone-hi)]/70 hover:bg-[var(--bone-hi)]',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-[18px] shrink-0 place-items-center rounded-full font-mono text-micro font-bold',
                      isOrder ? 'bg-[var(--ver)] text-[var(--bone-hi)]' : 'bg-[var(--brass-hi)] text-[var(--ink)]',
                    )}
                  >
                    {isOrder ? '提' : '工'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-note font-medium text-[var(--ink)]">
                    {e.title}
                  </span>
                  <span className="shrink-0 font-mono text-micro tracking-[0.04em] text-[var(--ink-2)]">
                    {KIND_LABEL[e.kind]} · {e.at}
                  </span>
                </button>
                {openBody && e.body ? (
                  <p className="whitespace-pre-wrap rounded-[10px] bg-[var(--bone)]/60 px-3 py-2 text-note leading-[1.7] text-[var(--ink-2)]">
                    {e.body}
                  </p>
                ) : null}
              </div>
            )
          }

          /* ---------- Agent：不装盒子，直接写在纸上 ---------- */
          return (
            <div key={e.id} className="group space-y-1">
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="block size-[5px] rounded-full"
                  style={{ background: e.kind === 'error' ? 'var(--ver)' : 'var(--pine)' }}
                />
                <span className="font-mono text-micro font-semibold tracking-[0.04em] text-[var(--ink-2)]">
                  {agent.name.split(' · ')[0]}
                </span>
                <span className="font-mono text-micro tabular-nums tracking-[0.04em] text-[var(--ink-2)]">{e.at}</span>
                <button
                  type="button"
                  onClick={() => copy(e.id, e.title + '\n' + e.body)}
                  aria-label="复制这条消息"
                  className="ml-auto rounded p-0.5 text-[var(--ink-2)] opacity-0 transition-opacity hover:text-[var(--ink)] focus-visible:opacity-100 group-hover:opacity-100"
                >
                  {copied === e.id ? <Check size={11} /> : <Copy size={11} />}
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
              {e.body ? (
                <p className="whitespace-pre-wrap text-body leading-[1.7] text-[var(--ink-2)]">{e.body}</p>
              ) : null}
            </div>
          )
        })}

        {waitingHuman ? (
          <div className="rounded-[12px] border border-dashed border-[var(--brass)] bg-[var(--bone-hi)]/80 px-3 py-2">
            <span className="font-mono text-micro font-semibold uppercase tracking-[0.14em] text-[var(--ink-2)]">
              等待人工确认
            </span>
            <p className="mt-1 text-note leading-relaxed text-[var(--ink-2)]">
              提案在中栏工作台等待批准或拒绝，这里不再重复放按钮。
            </p>
          </div>
        ) : null}

        {!atBottom ? (
          <div className="sticky bottom-1 flex justify-center">
            <button
              type="button"
              onClick={() => scrollToBottom()}
              className="flex items-center gap-1 rounded-full border border-[var(--rule-strong)] bg-[var(--bone-hi)] px-2.5 py-1 font-mono text-micro uppercase tracking-[0.1em] text-[var(--ink-2)] shadow-[0_2px_6px_rgba(22,33,28,0.1)]"
            >
              <ArrowDown size={10} />
              最新
            </button>
          </div>
        ) : null}
      </div>

      {/* ---------- 输入区：一个圆角大框 ---------- */}
      <form
        className="shrink-0 px-3 pb-3 pt-1"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <div className="rounded-[20px] border border-[var(--rule-strong)] bg-[var(--bone-hi)] px-2.5 pb-2 pt-2 transition-colors focus-within:border-[var(--ink)]">
          <label htmlFor={inputId} className="sr-only">
            人工插话
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
            placeholder={aborted ? '本次运行已中止。' : '插话指导…'}
            className="block max-h-[120px] w-full resize-none overflow-y-auto border-0 bg-transparent px-1.5 py-0.5 font-sans text-body leading-[1.6] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none disabled:opacity-60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          />

          <div className="mt-1 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => open({ kind: 'goal' })}
              aria-label="切到自主推进"
              className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--rule)] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
            >
              <Plus size={14} />
            </button>
            <span className="min-w-0 flex-1 truncate font-mono text-micro tracking-[0.04em] text-[var(--ink-2)]">
              /goal 自主推进 · Enter 发送
            </span>
            <button
              type="submit"
              disabled={aborted || !text.trim()}
              aria-label="发送插话"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--pine)] text-[var(--bone-hi)] transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              <ArrowUp size={15} />
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
