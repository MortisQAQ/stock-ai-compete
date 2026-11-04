import { NavLink } from 'react-router-dom'
import { NAV } from '../../nav'

export function MobileNav() {
  return (
    <nav className="mnav" aria-label="移动导航">
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to}>
          {item.short}
        </NavLink>
      ))}
    </nav>
  )
}
