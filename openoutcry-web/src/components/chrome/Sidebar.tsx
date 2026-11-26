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

import { formatTask } from '../../i18n/helpers'
import { cn } from '../../lib/utils'
import { PRIMARY_NAV, REFERENCE_NAV, titleOf } from '../../nav'
import { useLocale } from '../../store/LocaleProvider'
import { useTraining } from '../../store/TrainingProvider'
import type { TrainingTask } from '../../types'

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

/** 单层精简任务列表：每行聚焦任务名 + 状态点 */
function TaskListGroup({ title, tasks, activeTaskId, onRoute, onOpenTask }: TaskListGroupProps) {
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
                <span className="flex items-center gap-2.5">
                  <i className={cn('rail-dot shrink-0', task.status)} aria-hidden />
                  <span className="rail-task-name">{view.name}</span>
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
 *   底 = 参考区（协议与 Skill / 产品说明）+ ZH/EN、主题与涨跌色紧凑一行开关
 */
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
          <Globe size={14} aria-hidden />
          <span>{t('sidebar.switchLangLabel')}</span>
        </button>
        <button
          type="button"
          className="rail-tool-btn"
          onClick={toggleTheme}
          aria-label={t('sidebar.toggleThemeAria')}
        >
          {theme === 'dark' ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
          <span>{theme === 'dark' ? t('sidebar.themeLightShort') : t('sidebar.themeDarkShort')}</span>
        </button>
        <button
          type="button"
          className="rail-tool-btn"
          onClick={toggleMarketColors}
          aria-label={t('sidebar.toggleMarketColorsTitle')}
          title={t('sidebar.toggleMarketColorsTitle')}
        >
          <span>{marketColors === 'cn' ? t('sidebar.colorsCnShort') : t('sidebar.colorsIntlShort')}</span>
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
