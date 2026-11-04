import { useRun } from '../../store/RunProvider'

const ITEMS = [
  { k: 'run', v: 'run_demo_001' },
  { k: 'clock', v: '2024-04-23 09:15' },
  { k: 'data cutoff', v: '2024-04-22 23:59:58' },
  { k: 'evidence', v: 'ev_018 · ev_024' },
  { k: 'sample', v: '20 / 60 交易日' },
]

export function Tape() {
  const { status, state } = useRun()
  const parts = [
    { k: 'status', v: status, warn: true },
    ...ITEMS.slice(0, 1),
    ITEMS[1],
    ITEMS[2],
    ITEMS[3],
    ITEMS[4],
    { k: 'mode', v: state.mode === 'goal' ? '自主推进' : '逐单确认' },
  ]
  const row = [...parts, ...parts]
  return (
    <div className="tape" aria-hidden="true">
      <div className="tape-in">
        {row.map((p, i) => (
          <span key={i}>
            {p.k} <b>{p.v}</b>
            {'warn' in p && p.warn ? ' ●' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
