import { useState, type ComponentType } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  ChartLine,
  Globe,
  Menu,
  MessagesSquare,
  Moon,
  Plug,
  ScrollText,
  SquarePen,
  Sun,
  X,
} from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { PRIMARY_NAV, REFERENCE_NAV, titleOf } from '../../nav'
import { useLocale } from '../../store/LocaleProvider'
import { useTraining } from '../../store/TrainingProvider'
import { TRAINING_STATUS_TEXT, TRAINING_STATUS_TEXT_EN } from '../../store/selectors'
import type { TrainingTask } from '../../types'
import { cn } from '../../lib/utils'

type IconType = ComponentType<{ size?: number | string; 'aria-hidden'?: boolean; className?: string }>

/** 页面图标：与 routes.ts 严格对应 */
const ICON: Record<string, IconType> = {
  '/connect': Plug,
  '/studio': SquarePen,
  '/training': MessagesSquare,
  '/review': ChartLine,
  '/live': Activity,
  '/protocol': ScrollText,
  '/guide': BookOpen,
}

interface TaskListGroupProps {
  title: string
  tasks: TrainingTask[]
  activeTaskId: string
  onRoute: boolean
  onOpenTask: (id: string) => void
}

/** 单层任务列表（移除点击不换内容的假二级子会话，释放 900px 投影空间） */
function TaskListGroup({ title, tasks, activeTaskId, onRoute, onOpenTask }: TaskListGroupProps) {
  const { isEn } = useLocale()
  const statusMap = isEn ? TRAINING_STATUS_TEXT_EN : TRAINING_STATUS_TEXT
  return (
    <div className="rail-group">
      <div className="rail-sec-hd">
        <span>{title}</span>
        <b>{tasks.length}</b>
      </div>

      <ul className="rail-tasks">
        {tasks.map((task) => {
          const active = task.id === activeTaskId && onRoute
          return (
            <li className="rail-task" key={task.id}>
              <button
                type="button"
                className="rail-task-main"
                aria-current={active ? 'page' : undefined}
                onClick={() => onOpenTask(task.id)}
              >
                <span className="rail-task-name">{task.name}</span>
                <span className="rail-task-meta">
                  <i className={cn('rail-dot', task.status)} aria-hidden />
                  {statusMap[task.status]}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * 左侧栏内容（桌面常驻 + 移动端抽屉共用）：
 *   上 = 品牌（直达 01 Agent 库）
 *   中上 = 五步主流程（01 → 05 严格单向因果顺序）
 *   中下 = 训练任务（在上）+ 实战账户（在下）
 *   底 = 参考区（协议与 Skill / 产品说明）+ ZH/EN 与 暗色/亮色高对比演示开关
 */
function RailBody({ onNavigate }: { onNavigate?: () => void }) {
  const { tasks, current, selectTask, liveTasks, liveCurrent, selectLiveTask } = useTraining()
  const { lang, isEn, theme, toggleLang, toggleTheme, bi } = useLocale()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const onTraining = pathname === '/training'
  const onLive = pathname === '/live'

  const openGroupTask = (route: '/training' | '/live', select: (id: string) => void, onRoute: boolean, id: string) => {
    select(id)
    if (!onRoute) navigate(route)
    onNavigate?.()
  }

  return (
    <>
      <div className="rail-top">
        <Link
          className="rail-brand"
          to="/connect"
          onClick={onNavigate}
          aria-label={bi('openOutcry 首页', 'openOutcry Home')}
        >
          <b>openOutcry</b>
          <s aria-hidden />
        </Link>
        <p className="rail-tagline">
          {bi('A 股投资 Agent 训战台', 'A-Share Agent Training & Live Desk')}
        </p>
      </div>

      <nav className="rail-nav" aria-label={bi('五步核心流程', 'Core 5-Step Workflow')}>
        {PRIMARY_NAV.map((item) => {
          const Icon = ICON[item.to] ?? SquarePen
          return (
            <NavLink key={item.to} to={item.to} onClick={onNavigate}>
              <span className="rail-step-no">{item.n}</span>
              <Icon size={16} aria-hidden />
              <span className="truncate">{isEn ? item.sub : item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="rail-sec">
        <TaskListGroup
          title={bi('训练任务', 'Training Runs')}
          tasks={tasks}
          activeTaskId={current.id}
          onRoute={onTraining}
          onOpenTask={(id) => openGroupTask('/training', selectTask, onTraining, id)}
        />
        <TaskListGroup
          title={bi('实战账户', 'Live Accounts')}
          tasks={liveTasks}
          activeTaskId={liveCurrent.id}
          onRoute={onLive}
          onOpenTask={(id) => openGroupTask('/live', selectLiveTask, onLive, id)}
        />
      </div>

      <div className="rail-ref" aria-label={bi('参考资料', 'Reference')}>
        <div className="rail-ref-hd">{bi('参考', 'Reference')}</div>
        <div className="rail-ref-links">
          {REFERENCE_NAV.map((item) => {
            const Icon = ICON[item.to] ?? BookOpen
            return (
              <NavLink key={item.to} to={item.to} onClick={onNavigate}>
                <Icon size={15} aria-hidden />
                <span className="truncate">{isEn ? item.sub : item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </div>

      <div className="rail-tools">
        <button
          type="button"
          className="rail-tool-btn"
          onClick={toggleLang}
          aria-label={bi('切换中英文', 'Switch Language')}
        >
          <Globe size={15} aria-hidden />
          <span>{lang === 'zh' ? 'EN' : '中文'}</span>
        </button>
        <button
          type="button"
          className="rail-tool-btn"
          onClick={toggleTheme}
          aria-label={bi('切换暗色/亮色演示主题', 'Toggle Dark/Light Theme')}
        >
          {theme === 'dark' ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
          <span>{theme === 'dark' ? bi('亮色投影', 'Light') : bi('暗色仪器', 'Dark')}</span>
        </button>
      </div>

      <div className="rail-foot">
        <span className="rail-foot-dot" aria-hidden />
        <span>{bi('交互原型 · 虚构演示数据', 'Interactive Prototype · Mock Data')}</span>
      </div>
    </>
  )
}

/** 桌面常驻左栏 + 移动端抽屉：一套内容，两种容器 */
export function Sidebar() {
  const { pathname } = useLocation()
  const { lang, bi } = useLocale()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <aside className="rail" aria-label={bi('站点导航', 'Site Navigation')}>
        <RailBody />
      </aside>

      <div className="rail-mobile">
        <button
          type="button"
          className="rail-mobile-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label={bi('打开导航', 'Open Navigation')}
          aria-haspopup="dialog"
        >
          <Menu size={18} aria-hidden />
        </button>
        <span className="rail-mobile-title">{titleOf(pathname, lang)}</span>
      </div>

      <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="rail-drawer-overlay" />
          <DialogPrimitive.Content
            className="rail-drawer-panel"
            aria-label={bi('站点导航抽屉', 'Navigation Drawer')}
          >
            <DialogPrimitive.Title className="sr-only">
              {bi('站点导航', 'Site Navigation')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {bi('切换页面、训练任务、语言与主题', 'Switch pages, runs, language and theme')}
            </DialogPrimitive.Description>
            <div className="rail-drawer-close">
              <button
                type="button"
                className="rail-mobile-btn"
                onClick={() => setDrawerOpen(false)}
                aria-label={bi('关闭导航', 'Close Navigation')}
              >
                <X size={18} aria-hidden />
              </button>
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
