// 排版硬约束：全局最小字号 13px
//   静态层：TSX/CSS 里不许出现写死的 px 字号（会绕过 clamp 下限）
//   运行时：六个路由 × 三个视口，逐文本节点检查 computed font-size 与横向溢出
//
//   node scripts/check-type-floor.mjs             # 只检查，有违例退出码 1
//   node scripts/check-type-floor.mjs --shots     # 顺带把截图写到 docs/shots/
//   CHECK_BASE=http://localhost:5183 ...          # 指定被检地址（默认自动探 5183/5173）
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { chromium } from 'playwright-core'

const ROOT_ = path.resolve(import.meta.dirname, '..')

/** 全局硬下限：唯一来源是 tokens.css 里的 --fs-min，脚本、文档都引用它 */
const FLOOR = (() => {
  const css = fs.readFileSync(path.join(ROOT_, 'src/styles/tokens.css'), 'utf8')
  const hit = css.match(/--fs-min:\s*(\d+(?:\.\d+)?)px/)
  return hit ? Number(hit[1]) : 13
})()
/** 正文/说明的软下限，只做提示不判失败 */
const SOFT = { body: 17, note: 15 }

const ROOT = ROOT_
const SRC = path.join(ROOT, 'src')
const SHOT_DIR = path.join(ROOT, 'docs', 'shots')
const WANT_SHOTS = process.argv.includes('--shots')
const ROUTES = ['studio', 'training', 'review', 'connect', 'protocol', 'guide']
const VIEWPORTS = [
  [390, 844],
  [768, 1024],
  [1280, 800],
  [1440, 940],
  [1920, 1080],
]

function resolveChromium() {
  if (process.env.CHECK_CHROME) return process.env.CHECK_CHROME
  const roots = [
    path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright'),
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
    path.join(os.homedir(), '.cache', 'ms-playwright'),
  ]
  for (const root of roots) {
    if (!fs.existsSync(root)) continue
    const dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse()
    for (const d of dirs) {
      for (const rel of ['chrome-win64/chrome.exe', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-linux/chrome']) {
        const candidate = path.join(root, d, rel)
        if (fs.existsSync(candidate)) return candidate
      }
    }
  }
  return undefined
}

async function pickBase() {
  const candidates = process.env.CHECK_BASE
    ? [process.env.CHECK_BASE]
    : ['http://localhost:5183', 'http://localhost:5173']
  for (const base of candidates) {
    try {
      const res = await fetch(base + '/', { signal: AbortSignal.timeout(2500) })
      if (res.ok) return base.replace(/\/$/, '')
    } catch {
      /* 下一个 */
    }
  }
  return null
}

/* ---------- 1. 静态扫描 ---------- */
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const staticViolations = []
for (const file of walk(SRC)) {
  const ext = path.extname(file)
  if (!['.tsx', '.ts', '.css'].includes(ext)) continue
  const rel = path.relative(ROOT, file).replace(/\\/g, '/')
  fs.readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const text = line.trim()
      // tokens.css 是唯一允许写 px 下限的地方
      if (rel.endsWith('styles/tokens.css')) return
      if (/^\s*(\/\*|\/\/|\*)/.test(text)) return
      // CSS / Tailwind 一律不许写死 px（必须走 clamp 令牌）
      const tsx = text.match(/text-\[\d+(?:\.\d+)?px\]/)
      const css = text.match(/font-size:\s*\d+(?:\.\d+)?px/)
      // SVG 的 fontSize 属性用不了 clamp，只要求不低于硬下限
      const fontSize = text.match(/fontSize=["'](\d+(?:\.\d+)?)["']/)
      const svgTooSmall = fontSize && Number(fontSize[1]) < FLOOR
      if (tsx) staticViolations.push(rel + ':' + (i + 1) + '  Tailwind 写死字号 ' + tsx[0])
      else if (css) staticViolations.push(rel + ':' + (i + 1) + '  CSS 写死字号 ' + css[0])
      else if (svgTooSmall) staticViolations.push(rel + ':' + (i + 1) + '  SVG 标签低于下限 ' + fontSize[0])
    })
}

/* ---------- 2. 运行时测量 ---------- */
const base = await pickBase()
if (!base) {
  console.log('找不到可用的预览服务：先 npm run dev，或用 CHECK_BASE 指定地址。')
  process.exitCode = 2
} else {
  const browser = await chromium.launch({ executablePath: resolveChromium() })
  const runtimeViolations = []
  const rows = []

  for (const [w, h] of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text().slice(0, 120))
    })

    for (const route of ROUTES) {
      await page.goto(base + '/#/' + route, { waitUntil: 'networkidle' })
      await page.waitForTimeout(450)
      const stat = await page.evaluate((floor) => {
        const sizes = []
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let node
        while ((node = walker.nextNode())) {
          const text = node.textContent.trim()
          if (!text) continue
          const el = node.parentElement
          if (!el || el.closest('[aria-hidden="true"]')) continue
          const cs = getComputedStyle(el)
          if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue
          const rect = el.getBoundingClientRect()
          if (rect.width < 2 || rect.height < 2) continue
          const size = +parseFloat(cs.fontSize).toFixed(1)
          sizes.push({
            size,
            text: text.slice(0, 18),
            tag: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
          })
        }
        sizes.sort((a, b) => a.size - b.size)
        const de = document.documentElement
        return {
          total: sizes.length,
          min: sizes[0] ?? null,
          under: sizes.filter((s) => s.size < floor).slice(0, 8),
          body: sizes.filter((s) => s.size >= 17).length,
          overflowX: de.scrollWidth - de.clientWidth,
        }
      }, FLOOR)

      rows.push({ w, route, ...stat })
      if (stat.min && stat.min.size < FLOOR) {
        for (const s of stat.under) {
          runtimeViolations.push(w + 'px ' + route + ' · ' + s.size + 'px 「' + s.text + '」 ' + s.tag)
        }
      }
      if (stat.overflowX > 0) runtimeViolations.push(w + 'px ' + route + ' · 横向溢出 ' + stat.overflowX + 'px')
      if (WANT_SHOTS) {
        fs.mkdirSync(SHOT_DIR, { recursive: true })
        await page.screenshot({ path: path.join(SHOT_DIR, 'after-' + w + '-' + route + '.png') })
      }
    }
    for (const e of errors) runtimeViolations.push(w + 'px · 运行时报错 ' + e)
    await page.close()
  }
  await browser.close()

  /* ---------- 3. 报告 ---------- */
  console.log('视口    路由       文本节点  最小字号  正文占比  横向溢出')
  for (const r of rows) {
    console.log(
      String(r.w).padEnd(7),
      r.route.padEnd(10),
      String(r.total).padStart(8),
      String(r.min ? r.min.size : '-').padStart(9),
      String(Math.round((r.body / r.total) * 100) + '%').padStart(9),
      String(r.overflowX).padStart(9),
    )
  }

  console.log('\n静态检查：' + (staticViolations.length ? staticViolations.length + ' 处写死 px' : '无写死 px 字号'))
  for (const v of staticViolations) console.log('  - ' + v)

  const runtimeBad = runtimeViolations.filter((v) => !v.includes('运行时报错'))
  console.log('\n运行时检查：' + (runtimeBad.length ? runtimeBad.length + ' 处低于 ' + FLOOR + 'px 或溢出' : '全部 ≥ ' + FLOOR + 'px，无横向溢出'))
  for (const v of runtimeViolations) console.log('  - ' + v)

  const bodyShare = rows.filter((r) => r.w === 1440)
  console.log('\n提示：正文软下限 ' + SOFT.body + 'px、说明 ' + SOFT.note + 'px，只作观察不作判失败。')
  console.log('1440 下达到正文的字号占比：' + bodyShare.map((r) => r.route + ' ' + Math.round((r.body / r.total) * 100) + '%').join(' / '))

  if (staticViolations.length || runtimeViolations.length) process.exitCode = 1
}
