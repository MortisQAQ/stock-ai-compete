import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { useToast } from '../../store/ToastProvider'
import { exportRun } from '../../lib/exportRun'
import { titleOf } from '../../nav'
import { Button } from '../ui/Button'

export function Masthead() {
  const { state, totals } = useRun()
  const { open } = useDialog()
  const { notify } = useToast()
  const { pathname } = useLocation()

  return (
    <header className="masthead">
      <Link className="mast-brand" to="/studio" aria-label="openOutcry 首页">
        <b>openOutcry</b>
        <s />
        <em>交易智能体评测设施</em>
      </Link>

      <div className="mast-crumb">
        <span>工作空间</span>
        <span>/</span>
        <b>{titleOf(pathname)}</b>
      </div>

      <div className="mast-right">
        <Button variant="ghost" size="sm" className="max-[900px]:hidden" onClick={() => open({ kind: 'snapshot' })}>
          运行快照
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="max-[900px]:hidden"
          onClick={() => {
            exportRun(state, totals)
            notify('已导出 JSON', 'success')
          }}
        >
          导出 JSON
        </Button>
        <Button variant="solid" size="sm" asChild>
          <Link to="/training">
            进入训练场
            <ArrowUpRight aria-hidden />
          </Link>
        </Button>
      </div>
    </header>
  )
}
