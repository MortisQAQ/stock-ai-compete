// 把 MDX 产品文档里的 ```mermaid 代码块在构建期预渲染成静态 SVG。
// 目的：文档页不再依赖运行时 mermaid（避免沙箱 / 离线 / 二次渲染导致图表退化成源码）。
//   node scripts/build-diagrams.mjs
// 产物：
//   src/docs/diagrams/<hash>.svg        每张图一个文件
//   src/docs/diagrams/index.generated.ts  hash -> svg 原文映射
import fs from 'node:fs'
import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'

import { chromium } from 'playwright-core'

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')
const ROOT = path.resolve(HERE, '..')
const SRC = path.join(ROOT, 'src', 'docs', 'openOutcry-产品设计与功能-MVP.mdx')
const OUT_DIR = path.join(ROOT, 'src', 'docs', 'diagrams')
const GEN = path.join(OUT_DIR, 'index.generated.ts')

function resolveChromium() {
  if (process.env.SHOTS_CHROME) return process.env.SHOTS_CHROME
  const roots = [
    path.join(process.env.LOCALAPPDATA || '', 'ms-playwright'),
    path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright'),
  ].filter(Boolean)
  for (const root of roots) {
    if (!fs.existsSync(root)) continue
    for (const d of fs.readdirSync(root).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
      for (const rel of ['chrome-win64/chrome.exe', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-linux/chrome']) {
        const c = path.join(root, d, rel)
        if (fs.existsSync(c)) return c
      }
    }
  }
  return undefined
}

const mdx = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n')
const blocks = [...mdx.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1].trim())
if (blocks.length === 0) {
  console.log('没有找到 mermaid 代码块，跳过。')
  process.exit(0)
}

const hashOf = (code) => crypto.createHash('sha1').update(code).digest('hex').slice(0, 10)
const hashes = blocks.map(hashOf)

fs.mkdirSync(OUT_DIR, { recursive: true })
// 清掉不再被引用的旧图
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith('.svg') && !hashes.includes(f.replace(/\.svg$/, ''))) fs.unlinkSync(path.join(OUT_DIR, f))
}

const mermaidEntry = path.join(ROOT, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js')
const browser = await chromium.launch({ executablePath: resolveChromium() })
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 })
await page.setContent('<html><body style="margin:0;background:#F8F4E9"></body></html>')
await page.addScriptTag({ path: mermaidEntry })

const rendered = new Map()
for (const [i, code] of blocks.entries()) {
  const hash = hashes[i]
  if (rendered.has(hash)) continue
  const svg = await page.evaluate(
    async ({ code, id }) => {
      const m = window.mermaid
      m.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        suppressErrorRendering: true,
        theme: 'base',
        fontFamily: '"Noto Serif SC","Source Han Serif SC",Georgia,serif',
        themeVariables: {
          fontSize: '15px',
          primaryColor: '#F8F4E9',
          primaryTextColor: '#16211C',
          primaryBorderColor: '#16211C',
          secondaryColor: '#EAE3D3',
          tertiaryColor: '#DED6C3',
          lineColor: '#3D4A43',
          textColor: '#16211C',
          edgeLabelBackground: '#F8F4E9',
          clusterBkg: '#F8F4E9',
          clusterBorder: '#7C6036',
          actorBkg: '#F8F4E9',
          actorBorder: '#16211C',
          signalColor: '#3D4A43',
        },
      })
      const out = await m.render(id, code)
      return out.svg
    },
    { code, id: 'd' + i },
  )
  rendered.set(hash, svg)
  fs.writeFileSync(path.join(OUT_DIR, hash + '.svg'), svg, 'utf8')
  process.stdout.write('  diagram ' + (i + 1) + '/' + blocks.length + '\r')
}
await browser.close()
console.log('')

const imports = []
const entries = []
let n = 0
for (const [hash, svg] of rendered) {
  const name = 'd' + n++
  imports.push("import " + name + " from './" + hash + ".svg?raw'")
  entries.push('  ' + JSON.stringify(hash) + ': ' + name + ',')
}

const ts = [
  '// 该文件由 scripts/build-diagrams.mjs 生成，请勿手改。',
  '// 修改 MDX 里的 mermaid 代码块后执行：npm run diagrams',
  ...imports,
  '',
  'export const DIAGRAMS: Record<string, string> = {',
  ...entries,
  '}',
  '',
].join('\n')

fs.writeFileSync(GEN, ts, 'utf8')
console.log('diagrams:', rendered.size, '| 输出目录:', path.relative(ROOT, OUT_DIR))
