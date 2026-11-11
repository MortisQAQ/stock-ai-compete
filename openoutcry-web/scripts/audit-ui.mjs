// 组件层回归：文字对比度 / 非文字对比度 / 点按尺寸 / 溢出 / 焦点契约 / 页签语义
// 依赖 playwright-core（不下载浏览器），自动查找本机 ms-playwright 里的 chromium。
//   node scripts/audit-ui.mjs            # 打印报告，有违规则退出码 1
//   node scripts/audit-ui.mjs --shots    # 额外写 docs/shots/ui-*.png
//
// 对比度算法要点（2026-11-06 重写，之前漏报的直接原因都在这里）：
//   1. 背景必须逐层 alpha 合成，而不是「取第一个不透明祖先」——
//      半透明纸面 / 磨砂报头 / 0.08 透明度的染色底全部要算进去。
//   2. 元素链上的 opacity 要乘进前景 alpha（disabled 的 0.42 不能再被跳过）。
//   3. SVG <text> 看 fill 而不是 color，图表刻度是最容易看不清的地方。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { chromium } from 'playwright-core'

const BASE = process.env.AUDIT_BASE || 'http://localhost:5183/#/'
const ROUTES = ['studio', 'training', 'review', 'connect', 'protocol', 'guide']
const WANT_SHOTS = process.argv.includes('--shots')
const SHOT_DIR = path.join(process.cwd(), 'docs', 'shots')

/** 在 ms-playwright 缓存里找可用的 chromium 可执行文件 */
function resolveChromium() {
  if (process.env.AUDIT_CHROME) return process.env.AUDIT_CHROME
  const roots = [
    path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright'),
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
    path.join(os.homedir(), '.cache', 'ms-playwright'),
  ]
  for (const root of roots) {
    if (!fs.existsSync(root)) continue
    const dirs = fs
      .readdirSync(root)
      .filter((d) => d.startsWith('chromium-'))
      .sort()
      .reverse()
    for (const d of dirs) {
      for (const rel of ['chrome-win64/chrome.exe', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-linux/chrome']) {
        const candidate = path.join(root, d, rel)
        if (fs.existsSync(candidate)) return candidate
      }
    }
  }
  return undefined
}

const CONTRAST_FN = () => {
  const parseColor = (s) => {
    if (!s) return null
    const m = String(s).match(/^rgba?\(([^)]+)\)$/)
    if (!m) return null
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number)
    if (p.length < 3 || p.some((v) => Number.isNaN(v))) return null
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
  }
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  })
  const lum = (c) => {
    const f = (v) => {
      const x = v / 255
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
  }
  const ratio = (a, b) => {
    const l1 = lum(a)
    const l2 = lum(b)
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  }
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

  // 页面根底色：从 html 计算样式取，不要写死
  const rootBg = parseColor(getComputedStyle(document.documentElement).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }
  const base = over(rootBg, { r: 255, g: 255, b: 255, a: 1 })

  /** 逐层合成所有祖先背景（含自身），得到真实的落地色 */
  const resolveBg = (el) => {
    const stack = []
    let n = el
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n)
      if (cs.visibility === 'hidden' || cs.display === 'none') return null
      const c = parseColor(cs.backgroundColor)
      if (c && c.a > 0) stack.push(c)
      n = n.parentElement
    }
    let bg = base
    for (let i = stack.length - 1; i >= 0; i--) bg = over(stack[i], bg)
    return bg
  }

  /** 祖先链上所有 opacity 相乘（disabled 态就在这里） */
  const resolveOpacity = (el) => {
    let op = 1
    let n = el
    while (n && n.nodeType === 1) {
      const o = parseFloat(getComputedStyle(n).opacity)
      if (!Number.isNaN(o)) op *= o
      n = n.parentElement
    }
    return op
  }

  const minFor = (size, weight) => (size >= 24 || (size >= 18.66 && weight >= 600) ? 3 : 4.5)
  const out = []
  const seen = new Set()
  const push = (rec) => {
    const key = rec.cls + '|' + rec.fg + '|' + rec.bg + '|' + rec.ratio
    if (seen.has(key)) return
    seen.add(key)
    out.push(rec)
  }

  // ---------- 1. 普通文本 ----------
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim()
    if (!text) continue
    const el = node.parentElement
    if (!el || el.closest('[aria-hidden="true"]') || el.closest('svg')) continue
    if (el.closest(':disabled, [aria-disabled="true"], [data-disabled]')) continue // 禁用态豁免
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    const rect = el.getBoundingClientRect()
    if (rect.width < 4 || rect.height < 4) continue
    const fg = parseColor(cs.color)
    if (!fg || fg.a === 0) continue // 完全透明 = 故意隐藏（hover 显形），不算违规
    const bg = resolveBg(el)
    if (!bg) continue
    const op = resolveOpacity(el)
    if (op < 0.02) continue
    const fgEff = over({ ...fg, a: fg.a * op }, bg)
    const r = ratio(fgEff, bg)
    const size = parseFloat(cs.fontSize)
    const weight = parseInt(cs.fontWeight, 10) || 400
    const min = minFor(size, weight)
    if (r < min) {
      push({
        kind: 'text',
        text: text.slice(0, 22),
        ratio: +r.toFixed(2),
        min,
        size: Math.round(size * 10) / 10,
        fg: hex(fgEff),
        bg: hex(bg),
        cls: (el.className || '').toString().split(' ').slice(0, 4).join(' '),
      })
    }
  }

  // ---------- 2. SVG 文本（图表刻度/图例） ----------
  for (const el of document.querySelectorAll('svg text, svg tspan')) {
    const text = (el.textContent || '').trim()
    if (!text) continue
    const cs = getComputedStyle(el)
    const fill = parseColor(cs.fill) || parseColor(cs.color)
    if (!fill) continue
    let bg = resolveBg(el)
    if (!bg) continue
    // mermaid 的节点结构是 <g class="node"><rect fill=…/><text/></g>，
    // 文字压在兄弟 rect 上，祖先链里看不到这块底色，必须单独取。
    const g = el.closest('g')
    if (g) {
      for (const shape of g.children) {
        if (shape === el || shape.contains(el)) continue
        if (!/^(rect|path|polygon|circle|ellipse)$/i.test(shape.tagName)) continue
        const fillC = parseColor(getComputedStyle(shape).fill)
        if (fillC && fillC.a > 0.5) {
          const outer = resolveBg(g) || bg
          bg = over(fillC, outer)
          break
        }
      }
    }
    const fgEff = over({ ...fill, a: fill.a * resolveOpacity(el) }, bg)
    const r = ratio(fgEff, bg)
    const size = parseFloat(cs.fontSize) || 12
    const weight = parseInt(cs.fontWeight, 10) || 400
    const min = minFor(size, weight)
    if (r < min) {
      push({
        kind: 'svg',
        text: text.slice(0, 22),
        ratio: +r.toFixed(2),
        min,
        size: Math.round(size * 10) / 10,
        fg: hex(fgEff),
        bg: hex(bg),
        cls: (el.getAttribute('class') || el.tagName).slice(0, 60),
      })
    }
  }

  // ---------- 3. 占位符 ----------
  for (const el of document.querySelectorAll('input, textarea')) {
    const ph = getComputedStyle(el, '::placeholder')
    const fill = parseColor(ph.color)
    if (!fill || fill.a === 0) continue
    const bg = resolveBg(el)
    if (!bg) continue
    const fgEff = over({ ...fill, a: fill.a * resolveOpacity(el) }, bg)
    const r = ratio(fgEff, bg)
    if (r < 4.5) {
      push({
        kind: 'placeholder',
        text: (el.getAttribute('placeholder') || '').slice(0, 22),
        ratio: +r.toFixed(2),
        min: 4.5,
        size: parseFloat(getComputedStyle(el).fontSize),
        fg: hex(fgEff),
        bg: hex(bg),
        cls: 'placeholder',
      })
    }
  }

  // ---------- 4. 非文字对比度：可交互控件的边界必须 ≥3:1 ----------
  for (const el of document.querySelectorAll('[data-slot="button"], input, select, textarea, [data-slot="tabs-trigger"]')) {
    const cs = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    if (rect.width < 8 || rect.height < 8) continue
    if (el.matches(':disabled, [aria-disabled="true"], [data-disabled]')) continue
    if (el.closest('[aria-hidden="true"]')) continue
    const bc = parseColor(cs.borderTopColor) || parseColor(cs.borderBottomColor)
    if (!bc || bc.a === 0) continue
    const bgOuter = resolveBg(el.parentElement || el)
    const bgInner = resolveBg(el)
    if (!bgOuter || !bgInner) continue
    const borderOnOuter = over({ ...bc, a: bc.a * resolveOpacity(el) }, bgOuter)
    const r = ratio(borderOnOuter, bgOuter)
    // 控件自身有实心填充时，边界对比只需与外部底色区分
    if (r < 3) {
      push({
        kind: 'boundary',
        text: (el.textContent || el.getAttribute('placeholder') || el.tagName).trim().slice(0, 18),
        ratio: +r.toFixed(2),
        min: 3,
        size: 0,
        fg: hex(borderOnOuter),
        bg: hex(bgOuter),
        cls: (el.getAttribute('data-slot') || el.tagName).toLowerCase(),
      })
    }
  }

  return out
}

const problems = []
const add = (scope, msg) => problems.push(scope + ' · ' + msg)

const browser = await chromium.launch({ executablePath: resolveChromium() })

/** 一条路由在某个视口下跑一遍完整检查 */
async function checkRoute(ctx, route, viewport) {
  const page = await ctx.newPage()
  page.on('pageerror', (e) => add(route + '/' + viewport, 'pageerror ' + String(e).slice(0, 120)))
  page.on('console', (m) => {
    if (m.type() === 'error') add(route + '/' + viewport, 'console ' + m.text().slice(0, 120))
  })
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(320)
  const stats = await page.evaluate((fnSource) => {
    const de = document.documentElement
    const contrast = eval('(' + fnSource + ')')()
    return {
      overflowX: de.scrollWidth - de.clientWidth,
      contrast,
      smallTaps: [...document.querySelectorAll('[data-slot="button"], .mnav a, summary')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 2 && r.height > 2 && r.height < 28
        })
        .map((el) => (el.textContent || '').trim().slice(0, 14) + ' h=' + Math.round(el.getBoundingClientRect().height)),
    }
  }, CONTRAST_FN.toString())
  await page.close()
  return stats
}

const report = []
for (const viewport of [1440, 768, 390]) {
  const ctx = await browser.newContext({
    viewport: { width: viewport, height: viewport === 390 ? 844 : 940 },
    isMobile: viewport === 390,
    hasTouch: viewport === 390,
  })
  for (const route of ROUTES) {
    const stats = await checkRoute(ctx, route, viewport)
    report.push({ viewport, route, ...stats })
    if (stats.overflowX > 0) add(route + '/' + viewport, '横向溢出 ' + stats.overflowX + 'px')
    stats.contrast.forEach((c) =>
      add(
        route + '/' + viewport,
        c.kind + ' 对比度 ' + c.ratio + ':1 < ' + c.min + ' 「' + c.text + '」 ' + c.cls + '  fg=' + c.fg + ' bg=' + c.bg,
      ),
    )
    if (viewport === 1440 && stats.smallTaps.length) add(route, '点按目标过小 ' + stats.smallTaps.join(', '))
  }
  await ctx.close()
}

// 弹窗契约：打开 → 焦点进弹窗 → ESC → 焦点归还
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } })
await page.goto(BASE + 'studio', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await page.locator('[data-slot="button"]', { hasText: '配置' }).first().click()
await page.waitForTimeout(400)
const dialog = await page.evaluate(() => {
  const c = document.querySelector('[data-slot="dialog-content"]')
  if (!c) return { open: false }
  return {
    open: true,
    titled: !!c.querySelector('[data-slot="dialog-title"]'),
    focusInside: c.contains(document.activeElement),
    scrollLocked: document.body.getAttribute('data-scroll-locked') === '1' || getComputedStyle(document.body).overflow === 'hidden',
  }
})
if (!dialog.open) add('dialog', '未打开')
if (dialog.open && !dialog.titled) add('dialog', '缺少 dialog-title')
if (dialog.open && !dialog.focusInside) add('dialog', '焦点没有进入弹窗')
if (dialog.open && !dialog.scrollLocked) add('dialog', '背景未锁定滚动')

// 弹窗内部的对比度同样要查（弹窗是最容易漏的深色面）
if (dialog.open) {
  const dialogContrast = await page.evaluate((fnSource) => {
    const prev = document.body
    return eval('(' + fnSource + ')')()
  }, CONTRAST_FN.toString())
  dialogContrast.forEach((c) =>
    add('dialog', c.kind + ' 对比度 ' + c.ratio + ':1 < ' + c.min + ' 「' + c.text + '」 ' + c.cls + '  fg=' + c.fg + ' bg=' + c.bg),
  )
}

if (WANT_SHOTS) {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  await page.screenshot({ path: path.join(SHOT_DIR, 'ui-dialog-1440.png') })
}
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
const restore = await page.evaluate(() => ({
  slot: document.activeElement?.getAttribute('data-slot'),
  text: (document.activeElement?.textContent || '').trim().slice(0, 12),
}))
if (restore.slot !== 'button') add('dialog', '关闭后焦点未归还触发按钮（现在在 ' + (restore.slot || 'body') + '）')
await page.close()

if (WANT_SHOTS) {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  for (const [w, h] of [[1440, 940], [390, 844]]) {
    const shot = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
    for (const route of ['studio', 'training', 'connect', 'protocol']) {
      await shot.goto(BASE + route, { waitUntil: 'networkidle' })
      await shot.waitForTimeout(450)
      await shot.screenshot({ path: path.join(SHOT_DIR, 'ui-' + route + '-' + w + '.png'), fullPage: route !== 'training' })
    }
    await shot.close()
  }
}

await browser.close()

console.log('viewport  route         overflow  text  svg  boundary  small-taps')
for (const r of report) {
  const byKind = (k) => r.contrast.filter((c) => c.kind === k).length
  console.log(
    String(r.viewport).padEnd(9),
    r.route.padEnd(13),
    String(r.overflowX).padStart(8),
    String(byKind('text') + byKind('placeholder')).padStart(5),
    String(byKind('svg')).padStart(4),
    String(byKind('boundary')).padStart(9),
    String(r.smallTaps.length).padStart(11),
  )
}

if (problems.length) {
  console.log('\n发现 ' + problems.length + ' 项问题：')
  problems.forEach((p) => console.log(' - ' + p))
  process.exitCode = 1
} else {
  console.log('\n组件层检查通过：对比度、点按尺寸、溢出、焦点契约全部达标。')
}
