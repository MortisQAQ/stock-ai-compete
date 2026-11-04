import { NavLink, useLocation } from 'react-router-dom'
import { NAV } from '../../nav'

/**
 * 左侧站点索引。
 * 训练场页收窄成「编号窄条」（64px，靠 AppShell 的 grid 列宽配合），
 * 让工作台拿到整块视口；其余五个路由保持原来的 224px 索引列，DOM 不变。
 */
export function SideNav() {
  const { pathname } = useLocation()
  const slim = pathname === '/training'

  return (
    <aside className={slim ? 'index h-[calc(100dvh-87px)]' : 'index'}>
      {slim ? (
        <div className="flex justify-center pb-2.5">
          <span className="label text-[length:var(--fs-micro)]">Idx</span>
        </div>
      ) : (
        <div className="index-hd">
          <span className="label">Index</span>
          <p>受控历史市场 · 可审计运行</p>
        </div>
      )}

      <nav aria-label="主导航">
        {NAV.map((item) =>
          slim ? (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className="grid-cols-1 place-items-center px-0 py-3.5"
            >
              <i>{item.n}</i>
              <span className="sr-only">{item.label}</span>
            </NavLink>
          ) : (
            <NavLink key={item.to} to={item.to}>
              <i>{item.n}</i>
              <span>
                {item.label}
                <em>{item.sub}</em>
              </span>
            </NavLink>
          ),
        )}
      </nav>

      {slim ? null : (
        <div className="index-foot">
          <b>全部为虚构演示</b>
          非真实绩效，不构成投资建议。
        </div>
      )}
    </aside>
  )
}
