import { NavLink } from 'react-router-dom'
import { NAV } from '../../nav'

const SHORT: Record<string, string> = {
  '/studio': '新建训练',
  '/training': '训练场',
  '/review': '复盘',
  '/connect': '接入',
  '/protocol': '协议',
  '/guide': '说明',
}

export function MobileNav() {
  return (
    <nav className="mnav" aria-label="移动导航">
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to}>
          {SHORT[item.to] ?? item.label}
        </NavLink>
      ))}
    </nav>
  )
}
