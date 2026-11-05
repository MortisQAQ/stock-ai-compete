import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from 'react'

import { MermaidDiagram } from './MermaidDiagram'

function extractCodeInfo(children: ReactNode): { className?: string; text: string } | null {
  if (!isValidElement(children)) return null
  const props = children.props as { className?: string; children?: ReactNode }
  const raw = props.children
  const text = Array.isArray(raw) ? raw.join('') : typeof raw === 'string' ? raw : ''
  return { className: props.className, text }
}

function MdxPre(props: ComponentPropsWithoutRef<'pre'>) {
  const info = extractCodeInfo(props.children)
  // 未经构建期预渲染的 mermaid 代码块：交给运行时兜底，而不是当普通代码打印出来
  if (info?.className?.includes('language-mermaid')) {
    return <MermaidDiagram code={info.text} />
  }
  return <pre className="code" {...props} />
}

function MdxTable(props: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="mdx-table-wrap">
      <table {...props} />
    </div>
  )
}

const MDX_COMPONENTS = {
  pre: MdxPre,
  table: MdxTable,
  MermaidDiagram,
}

/**
 * 由 @mdx-js/rollup 的 providerImportSource 调用，向所有 .mdx 自动注入自定义标签映射。
 */
export function useMDXComponents(overrides?: Record<string, unknown>) {
  return { ...MDX_COMPONENTS, ...overrides }
}
