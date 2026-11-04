import { useEffect, useMemo, useRef, useState } from 'react'
import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { seq } from '../../lib/format'
import type { EventKind, LedgerFilter } from '../../types'

const FILTERS: Array<{ id: LedgerFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'agent', label: '思考' },
  { id: 'work', label: '工具与订单' },
  { id: 'user', label: '人工' },
]

const KIND_LABEL: Record<EventKind, string> = {
  agent: 'AGENT',
  tool: 'TOOL',
  order: 'ORDER',
  user: 'HUMAN',
  error: 'ERROR',
}

export function DecisionLedger() {
  const { state } = useRun()
  const { open } = useDialog()
  const [filter, setFilter] = useState<LedgerFilter>('all')
  const [atBottom, setAtBottom] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [flashId, setFlashId] = useState<number | null>(null)

  const bodyRef = useRef<HTMLDivElement>(null)
  const lastIdRef = useRef(state.events[state.events.length - 1]?.id ?? 0)
  const filterRef = useRef(filter)
  filterRef.current = filter

  const counts = useMemo(() => {
    const base: Record<LedgerFilter, number> = { all: state.events.length, agent: 0, work: 0, user: 0 }
    for (const e of state.events) {
      if (e.kind === 'agent') base.agent += 1
      else if (e.kind === 'tool' || e.kind === 'order') base.work += 1
      else if (e.kind === 'user') base.user += 1
    }
    return base
  }, [state.events])

  const visible = useMemo(() => {
    if (filter === 'all') return state.events
    if (filter === 'work') return state.events.filter((e) => e.kind === 'tool' || e.kind === 'order')
    return state.events.filter((e) => e.kind === filter)
  }, [state.events, filter])

  // 新事件：在底部就自动跟随，否则累计提示
  useEffect(() => {
    const last = state.events[state.events.length - 1]
    const el = bodyRef.current
    if (!el) return
    const isNew = last ? last.id > lastIdRef.current : false
    if (last) lastIdRef.current = last.id

    if (atBottom) {
      el.scrollTop = el.scrollHeight
      setPendingCount(0)
    } else if (isNew) {
      setPendingCount((c) => c + 1)
    }
    if (isNew) {
      setFlashId(last.id)
      const timer = window.setTimeout(() => setFlashId(null), 1400)
      return () => window.clearTimeout(timer)
    }
  }, [state.events, atBottom])

  // 切换筛选时回到底部
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    setAtBottom(true)
    setPendingCount(0)
  }, [filter])

  const jumpToLatest = () => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    setAtBottom(true)
    setPendingCount(0)
  }

  return (
    <div className="ledger" style={{ position: 'relative' }}>
      <div className="ledger-hd">
        <span className="label">Decision Ledger</span>
        <b>{state.events.length} 条事件</b>
      </div>

      <div className="ledger-filters" role="group" aria-label="按事件类型筛选">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <div
        className="ledger-body"
        ref={bodyRef}
        role="log"
        aria-live="polite"
        aria-label="决策事件台账"
        onScroll={(e) => {
          const el = e.currentTarget
          const distance = el.scrollHeight - el.scrollTop - el.clientHeight
          const next = distance < 24
          if (next !== atBottom) setAtBottom(next)
          if (next && pendingCount) setPendingCount(0)
        }}
      >
        {visible.length === 0 ? (
          <p className="ledger-empty">该类型暂无事件</p>
        ) : (
          visible.map((e) => (
            <div className={'ev' + (e.id === flashId ? ' is-new' : '')} key={e.id}>
              <div className="ev-seq">
                <b>#{seq(e.id)}</b>
                <i>{e.at}</i>
              </div>
              <div className="ev-body">
                <div className="ev-meta">
                  <span className={'chip ' + e.kind}>{KIND_LABEL[e.kind]}</span>
                  <span className="ev-time">{e.meta}</span>
                </div>
                <div className="ev-title">{e.title}</div>
                <div className="ev-text">{e.body}</div>
                {e.kind === 'tool' ? (
                  <button type="button" className="ev-link" onClick={() => open({ kind: 'detail', id: 'proposal' })}>
                    查看当时的证据快照
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {!atBottom && pendingCount > 0 ? (
        <button type="button" className="jump-latest" onClick={jumpToLatest}>
          {pendingCount} 条新事件 ↓
        </button>
      ) : null}

      <div className="ledger-foot">
        <span>逐条编号 · 不可改写</span>
        <span className={state.status === 'disconnected' ? 'down' : 'live'}>
          {state.status === 'disconnected' ? '● 连接断开' : '● 连接正常'}
        </span>
      </div>
    </div>
  )
}
