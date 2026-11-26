import type { BandItem } from '../../types'

/** 四格 KPI 资产带：聚焦核心数字，去除底部重复标签条 */
export function StatBand({ items }: { items: BandItem[] }) {
  return (
    <div className="band">
      <div className="band-in">
        {items.map((item) => (
          <div className="band-cell" key={item.label}>
            <span className="label">{item.label}</span>
            <b className={item.tone ?? undefined}>{item.value}</b>
          </div>
        ))}
      </div>
    </div>
  )
}
