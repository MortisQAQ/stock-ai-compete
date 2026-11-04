import type { ReactNode } from 'react'

import type { BandItem } from '../../types'

export function StatBand({ items, tags }: { items: BandItem[]; tags?: ReactNode }) {
  return (
    <div className="band">
      <div className="band-in">
        {items.map((item) => (
          <div className="band-cell" key={item.label}>
            <span className="label">{item.label}</span>
            <b className={item.tone ?? undefined}>{item.value}</b>
            <small>{item.note}</small>
          </div>
        ))}
      </div>
      {tags ? <div className="band-tags">{tags}</div> : null}
    </div>
  )
}