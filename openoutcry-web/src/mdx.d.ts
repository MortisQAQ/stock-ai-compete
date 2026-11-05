declare module '*.mdx' {
  import type { ComponentType } from 'react'
  const MDXComponent: ComponentType<{ components?: Record<string, ComponentType<unknown>> }>
  export default MDXComponent
}

declare module '*.svg?raw' {
  const content: string
  export default content
}
