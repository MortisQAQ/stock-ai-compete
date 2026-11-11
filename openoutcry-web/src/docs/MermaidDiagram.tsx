import { useEffect, useId, useState } from 'react'

import { DIAGRAMS } from './diagrams/index.generated'

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null

/** 运行时兜底用的 mermaid：只有没预渲染的新图才会走到这里 */
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        theme: 'base',
        // 深色仪器：与 tokens.css 同一套值。预渲染图由 docs.css 覆写，
        // 这里只影响"没预渲染、运行时现画"的兜底路径，两边不能走散。
        fontFamily: 'Inter, "Noto Sans SC", system-ui, sans-serif',
        themeVariables: {
          fontSize: '15px',
          background: '#08090b',
          primaryColor: '#15181c',
          primaryTextColor: '#f2f4f6',
          primaryBorderColor: 'rgba(255,255,255,0.22)',
          secondaryColor: '#1c2026',
          tertiaryColor: '#0e1013',
          lineColor: 'rgba(255,255,255,0.22)',
          textColor: '#f2f4f6',
          edgeLabelBackground: '#15181c',
          clusterBkg: '#050607',
          clusterBorder: 'rgba(255,255,255,0.10)',
          actorBkg: '#15181c',
          actorBorder: 'rgba(255,255,255,0.22)',
          signalColor: 'rgba(255,255,255,0.22)',
        },
      })
      return mermaid
    })
  }
  return mermaidPromise
}

export interface MermaidDiagramProps {
  /** 预渲染图的键（构建期由 scripts/build-diagrams.mjs 生成） */
  id?: string
  /** 原始 mermaid 源码，仅用于未预渲染时的运行时兜底 */
  code?: string
}

export function MermaidDiagram({ id, code }: MermaidDiagramProps) {
  const reactId = useId()
  const graphId = 'mmd-' + reactId.replace(/[^a-zA-Z0-9]/g, '')
  const staticSvg = id ? DIAGRAMS[id] : undefined
  const [dynamicSvg, setDynamicSvg] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (staticSvg || !code) return
    let active = true
    void (async () => {
      try {
        const mermaid = await loadMermaid()
        const { svg } = await mermaid.render(graphId, code.trim())
        if (active) setDynamicSvg(svg)
      } catch {
        if (active) setFailed(true)
      }
    })()
    return () => {
      active = false
    }
  }, [code, graphId, staticSvg])

  const svg = staticSvg ?? dynamicSvg

  if (svg) {
    return (
      <figure
        className="mdx-diagram"
        role="img"
        aria-label="产品架构与流程图"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    )
  }

  if (failed) {
    return (
      <figure className="mdx-diagram mdx-diagram-failed">
        <div className="mdx-diagram-note">
          <b>图表未能渲染</b>
          <span>该图还没有预渲染产物，运行 npm run diagrams 重新生成即可。</span>
        </div>
      </figure>
    )
  }

  return (
    <figure className="mdx-diagram" aria-busy="true">
      <div className="mdx-diagram-note">正在绘制流程图…</div>
    </figure>
  )
}
