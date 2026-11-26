import { useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
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
import { formatTask } from '../../i18n/helpers'
import { useLocale } from '../../store/LocaleProvider'
import { useTraining } from '../../store/TrainingProvider'
import { trainingStatusText } from '../../store/selectors'
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
  const { lang } = useLocale()
  const { t } = useTranslation()
  return (
    <div className="rail-group">
      <div className="rail-sec-hd">
        <span>{title}</span>
        <b>{tasks.length}</b>
      </div>

      <ul className="rail-tasks">
        {tasks.map((task) => {
          const active = task.id === activeTaskId && onRoute
          const view = formatTask(task, t)
          return (
            <li className="rail-task" key={task.id}>
              <button
                type="button"
                className="rail-task-main"
                aria-current={active ? 'page' : undefined}
                onClick={() => onOpenTask(task.id)}
              >
                <span className="rail-task-name">{view.name}</span>
                <span className="rail-task-meta">
                  <i className={cn('rail-dot', task.status)} aria-hidden />
                  {trainingStatusText(task.status, lang)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RailBody({ onNavigate }: { onNavigate?: () => void }) {
  const { tasks, current, selectTask, liveTasks, liveCurrent, selectLiveTask } = useTraining()
  const { theme, marketColors, toggleLang, toggleTheme, toggleMarketColors } = useLocale()
  const { t } = useTranslation()
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
          aria-label={t('nav.homeAria')}
        >
          <b>openOutcry</b>
          <s aria-hidden />
        </Link>
        <p className="rail-tagline">{t('sidebar.tagline')}</p>
      </div>

      <nav className="rail-nav" aria-label={t('sidebar.workflowAria')}>
        {PRIMARY_NAV.map((item) => {
          const Icon = ICON[item.to] ?? SquarePen
          return (
            <NavLink key={item.to} to={item.to} onClick={onNavigate}>
              <span className="rail-step-no">{item.n}</span>
              <Icon size={16} aria-hidden />
              <span className="truncate">{t(item.labelKey)}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="rail-sec">
        <TaskListGroup
          title={t('sidebar.trainingRuns')}
          tasks={tasks}
          activeTaskId={current.id}
          onRoute={onTraining}
          onOpenTask={(id) => openGroupTask('/training', selectTask, onTraining, id)}
        />
        <TaskListGroup
          title={t('sidebar.liveAccounts')}
          tasks={liveTasks}
          activeTaskId={liveCurrent.id}
          onRoute={onLive}
          onOpenTask={(id) => openGroupTask('/live', selectLiveTask, onLive, id)}
        />
      </div>

      <div className="rail-ref" aria-label={t('sidebar.referenceAria')}>
        <div className="rail-ref-hd">{t('sidebar.reference')}</div>
        <div className="rail-ref-links">
          {REFERENCE_NAV.map((item) => {
            const Icon = ICON[item.to] ?? BookOpen
            return (
              <NavLink key={item.to} to={item.to} onClick={onNavigate}>
                <Icon size={15} aria-hidden />
                <span className="truncate">{t(item.labelKey)}</span>
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
          aria-label={t('sidebar.switchLangAria')}
        >
          <Globe size={15} aria-hidden />
          <span>{t('sidebar.switchLangLabel')}</span>
        </button>
        <button
          type="button"
          className="rail-tool-btn"
          onClick={toggleTheme}
          aria-label={t('sidebar.toggleThemeAria')}
        >
          {theme === 'dark' ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
          <span>{theme === 'dark' ? t('sidebar.themeLight') : t('sidebar.themeDark')}</span>
        </button>
      </div>

      <div className="rail-foot justify-between">
        <span className="inline-flex items-center gap-2">
          <span className="rail-foot-dot" aria-hidden />
          <span>{t('sidebar.prototypeMock')}</span>
        </span>
        <button
          type="button"
          onClick={toggleMarketColors}
          className="font-mono text-micro text-[var(--fg-1)] underline decoration-dotted underline-offset-2 hover:text-[var(--fg-0)]"
          title={t('sidebar.toggleMarketColorsTitle')}
        >
          {marketColors === 'cn' ? t('sidebar.colorsCn') : t('sidebar.colorsIntl')}
        </button>
      </div>
    </>
  )
}

/** 桌面常驻左栏 + 移动端抽屉：一套内容，两种容器 */
export function Sidebar() {
  const { pathname } = useLocation()
  const { lang } = useLocale()
  const { t } = useTranslation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <aside className="rail" aria-label={t('sidebar.siteNavAria')}>
        <RailBody />
      </aside>

      <div className="rail-mobile">
        <button
          type="button"
          className="rail-mobile-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label={t('sidebar.openNavAria')}
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
            aria-label={t('sidebar.navDrawerAria')}
          >
            <DialogPrimitive.Title className="sr-only">
              {t('sidebar.siteNavAria')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {t('sidebar.navDrawerDesc')}
            </DialogPrimitive.Description>
            <div className="rail-drawer-close">
              <button
                type="button"
                className="rail-mobile-btn"
                onClick={() => setDrawerOpen(false)}
                aria-label={t('sidebar.closeNavAria')}
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
