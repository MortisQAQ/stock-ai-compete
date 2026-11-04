import type { RunState, Totals } from '../types'
import { agentOf } from '../data/agents'

/** 导出当前运行的完整快照（虚构数据，仅用于演示） */
export function exportRun(state: RunState, totals: Totals): void {
  const payload = {
    notice: '全部为虚构原型数据，非真实绩效',
    exportedAt: new Date().toISOString(),
    agent: agentOf(state.agent),
    run: {
      id: 'run_demo_001',
      status: state.status,
      clock: state.clock,
      mode: state.mode,
      collaboration: state.collaboration,
    },
    proposal: state.proposal,
    account: { ...totals, cash: state.cash, fees: state.fees, realized: state.realized },
    holdings: state.holdings,
    trades: state.trades,
    events: state.events,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'openOutcry-run_demo_001.json'
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
