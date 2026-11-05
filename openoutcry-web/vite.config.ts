import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const DIAGRAM_DIR = fileURLToPath(new URL('./src/docs/diagrams', import.meta.url))

/**
 * 把 MDX 里的 ```mermaid 代码块替换成 <MermaidDiagram id="…" />。
 *
 * 图在构建期就由 scripts/build-diagrams.mjs 渲染成静态 SVG，
 * 页面因此不依赖运行时 mermaid —— 沙箱、离线或动态 chunk 失败都不会退化成源码。
 * 新增的代码块还没有预渲染产物时保持原样，由 MermaidDiagram 运行时兜底。
 */
function mdxMermaidStatic(): Plugin {
  return {
    name: 'mdx-mermaid-static',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.mdx') || !code.includes('language-mermaid') && !code.includes('```mermaid')) return null
      let replaced = 0
      const next = code.replace(/```mermaid\r?\n([\s\S]*?)```/g, (whole, body: string) => {
        const source = body.trim()
        const hash = crypto.createHash('sha1').update(source).digest('hex').slice(0, 10)
        if (!fs.existsSync(path.join(DIAGRAM_DIR, hash + '.svg'))) return whole
        replaced += 1
        return '<MermaidDiagram id="' + hash + '" code={' + JSON.stringify(source) + '} />'
      })
      if (!replaced) return null
      return { code: next, map: null }
    },
  }
}

// 相对 base + HashRouter：构建产物可直接丢到 GitHub Pages 子路径
export default defineConfig({
  base: './',
  plugins: [
    mdxMermaidStatic(),
    { enforce: 'pre', ...mdx({ remarkPlugins: [remarkGfm], providerImportSource: '@/docs/mdxProvider' }) },
    react({ include: [/\.(jsx|tsx|mdx)$/] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5183, strictPort: true },
})
