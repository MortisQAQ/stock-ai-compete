import type { ReactNode } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

export interface CodeDemoProps {
  /** 演示模块标题 */
  title: string
  /** 对应的真实前端源码路径（如 src/components/proposal/ProposalTicket.tsx） */
  file: string
  /** 通过 ?raw 导入的真实源码字符串 */
  code: string
  /** 可选：底部补充说明 */
  caption?: string
  /** 实时挂载的真实 React 组件 */
  children: ReactNode
}

/**
 * MDX 文档专用的「实时交互演示 + 真实前端源码」容器。
 * 直接挂载 openoutcry-web 的真实业务组件，并用 Vite ?raw 同步展示同一份源码文件。
 */
export function CodeDemo({ title, file, code, caption, children }: CodeDemoProps) {
  return (
    <section className="doc-demo not-prose" aria-label={title}>
      <Tabs defaultValue="preview" className="gap-0">
        <div className="doc-demo-hd">
          <div className="doc-demo-title">
            <span className="label">Live Component</span>
            <b>{title}</b>
            <span className="doc-demo-path">{file}</span>
          </div>
          <TabsList variant="segmented">
            <TabsTrigger value="preview">交互演示</TabsTrigger>
            <TabsTrigger value="source">前端源码</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="preview" className="m-0">
          <div className="doc-demo-stage">{children}</div>
        </TabsContent>

        <TabsContent value="source" className="m-0">
          <pre className="code code-block">
            <code>{code.trim()}</code>
          </pre>
        </TabsContent>
      </Tabs>

      {caption ? <div className="doc-demo-caption">{caption}</div> : null}
    </section>
  )
}
