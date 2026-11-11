import { useState, type ComponentType } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ChartLine,
  ChevronDown,
  Menu,
  MessagesSquare,
  Plug,
  Plus,
  ScrollText,
  SquarePen,
  X,
} from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { NAV, titleOf } from '../../nav'
import { useTraining } from '../../store/TrainingProvider'
import { TRAINING_STATUS_TEXT } from '../../store/selectors'
import { cn } from '../../lib/utils'

type IconType = ComponentType<{ size?: number | string; 'aria-hidden'?: boolean; className?: string }>

/** 页面图标：和 routes.ts 的六个入口一一对应 */
const ICON: Record<string, IconType> = {
  '/studio': SquarePen,
  '/training': MessagesSquare,
  '/review': ChartLine,
  '/connect': Plug,
  '/protocol': ScrollText,
  '/guide': BookOpen,
}

/**
 * 左侧栏内容 —— 桌面是常驻栏，移动端塞进抽屉里复用同一份。
 *
 * 结构照 DSH：
 *   上 = 品牌 + 新建（主动作）
 *   中 = 页面索引（图标 + 名称，一行一个）
 *   下 = 训练任务树：任务 → 该任务下的若干对话
 */
function RailBody({ onNavigate }: { onNavigate?: () => void }) {
  const { tasks, current, conversation, selectTask, selectConversation } = useTraining()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const onTraining = pathname === '/training'
  const [openIds, setOpenIds] = useState<string[]>([current.id])

  const toggle = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const openTask = (id: string) => {
    selectTask(id)
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    if (!onTraining) navigate('/training')
    onNavigate?.()
  }

  const openConversation = (nextTask: string, nextConv: string) => {
    selectConversation(nextTask, nextConv)
    if (!onTraining) navigate('/training')
    onNavigate?.()
  }

  return (
    <>
      <div className="rail-top">
        <Link className="rail-brand" to="/studio" onClick={onNavigate} aria-label="openOutcry 委托台">
          <b>openOutcry</b>
          <s aria-hidden />
        </Link>
        <button
          type="button"
          className="rail-new"
          onClick={() => {
            navigate('/studio')
            onNavigate?.()
          }}
        >
          <Plus size={15} aria-hidden />
          <span>新建训练</span>
        </button>
      </div>

      <nav className="rail-nav" aria-label="页面">
        {NAV.map((item) => {
          const Icon = ICON[item.to] ?? SquarePen
          return (
            <NavLink key={item.to} to={item.to} onClick={onNavigate}>
              <Icon size={16} aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="rail-sec">
        <div className="rail-sec-hd">
          <span>训练任务</span>
          <b>{tasks.length}</b>
        </div>

        <ul className="rail-tasks">
          {tasks.map((task) => {
            const active = task.id === current.id && onTraining
            const expanded = openIds.includes(task.id)
            return (
              <li className="rail-task" key={task.id}>
                <div className="rail-task-row">
                  <button
                    type="button"
                    className="rail-task-main"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => openTask(task.id)}
                  >
                    <span className="rail-task-name">{task.name}</span>
                    <span className="rail-task-meta">
                      <i className={cn('rail-dot', task.status)} aria-hidden />
                      {TRAINING_STATUS_TEXT[task.status]}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rail-task-toggle"
                    aria-expanded={expanded}
                    aria-label={expanded ? '收起该任务的对话' : '展开该任务的对话'}
                    onClick={() => toggle(task.id)}
                  >
                    <ChevronDown size={14} aria-hidden className={cn('rail-chev', expanded && 'is-open')} />
                  </button>
                </div>

                {expanded && task.conversations.length > 0 ? (
                  <ul className="rail-convs">
                    {task.conversations.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="rail-conv"
                          aria-current={active && item.id === conversation.id ? 'page' : undefined}
                          onClick={() => openConversation(task.id, item.id)}
                        >
                          {item.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="rail-foot">
        <span className="rail-foot-dot" aria-hidden />
        <span>原型数据 · 全部虚构</span>
      </div>
    </>
  )
}

/** 桌面常驻左栏 + 移动端抽屉：一套内容，两种容器 */
export function Sidebar() {
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <aside className="rail" aria-label="站点导航">
        <RailBody />
      </aside>

      <div className="rail-mobile">
        <button
          type="button"
          className="rail-mobile-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="打开导航"
          aria-haspopup="dialog"
        >
          <Menu size={18} aria-hidden />
        </button>
        <span className="rail-mobile-title">{titleOf(pathname)}</span>
        <span className="rail-mobile-mark" aria-hidden />
      </div>

      <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="drawer-scrim" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={
              'rail-drawer ' +
              'data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=open]:duration-200 ' +
              'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=closed]:duration-150'
            }
          >
            <DialogPrimitive.Title className="sr-only">站点导航</DialogPrimitive.Title>
            <div className="rail-drawer-hd">
              <span className="label">导航</span>
              <DialogPrimitive.Close aria-label="关闭导航" className="rail-drawer-x">
                <X size={18} aria-hidden />
              </DialogPrimitive.Close>
            </div>
            <div className="rail rail--drawer">
              <RailBody onNavigate={() => setDrawerOpen(false)} />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
