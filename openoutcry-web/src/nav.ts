export interface NavItem {
  to: string
  n: string
  label: string
  sub: string
}

export const NAV: NavItem[] = [
  { to: '/studio', n: '01', label: '新建训练', sub: 'New Training' },
  { to: '/training', n: '02', label: '训练场', sub: 'Training Ground' },
  { to: '/review', n: '03', label: '结果与复盘', sub: 'Review' },
  { to: '/connect', n: '04', label: '连接 Agent', sub: 'Connect' },
  { to: '/protocol', n: '05', label: '协议与 Skill', sub: 'Protocol' },
  { to: '/guide', n: '06', label: '产品说明', sub: 'Brief' },
]

export const titleOf = (pathname: string): string =>
  NAV.find((item) => pathname === item.to)?.label ?? '新建训练'
