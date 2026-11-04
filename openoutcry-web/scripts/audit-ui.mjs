// 组件层回归：对比度 / 点按尺寸 / 溢出 / 焦点契约 / 页签语义
// 依赖 playwright-core（不下载浏览器），自动查找本机 ms-playwright 里的 chromium。
//   node scripts/audit-ui.mjs            # 打印报告，有违规则退出码 1
//   node scripts/audit-ui.mjs --shots    # 额外写 docs/shots/ui-*.png
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
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const x = v / 255
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const parse = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const p = m[1].split(',').map(Number)
    return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }
  }
  const bgOf = (el) => {
    let n = el
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor)
      if (c && c.a > 0.75) return c.rgb
      n = n.parentElement
    }
    return [237, 231, 218]
  }
  const out = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim()
    if (!text) continue
    const el = node.parentElement
    if (!el || el.closest('[aria-hidden="true"]')) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.9) continue
    const rect = el.getBoundingClientRect()
    if (rect.width < 4 || rect.height < 4) continue
    const fg = parse(cs.color)
    if (!fg) continue
    const bg = bgOf(el)
    const l1 = lum(fg.rgb)
    const l2 = lum(bg)
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    const size = parseFloat(cs.fontSize)
    const bold = parseInt(cs.fontWeight, 10) >= 600
    const min = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5
    if (ratio < min) {
      out.push({
        text: text.slice(0, 18),
        ratio: +ratio.toFixed(2),
        min,
        size,
        cls: (el.className || '').toString().split(' ').slice(0, 3).join(' '),
      })
    }
  }
  const seen = new Set()
  return out.filter((o) => {
    const k = o.cls + '|' + o.ratio
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const problems = []
const add = (scope, msg) => problems.push(scope + ' · ' + msg)

const browser = await chromium.launch({ executablePath: resolveChromium() })
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } })
page.on('pageerror', (e) => add('runtime', 'pageerror ' + String(e).slice(0, 120)))
page.on('console', (m) => {
  if (m.type() === 'error') add('runtime', m.text().slice(0, 120))
})

const report = []
for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(350)
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

  report.push({ route, ...stats })
  if (stats.overflowX > 0) add(route, '横向溢出 ' + stats.overflowX + 'px')
  stats.contrast.forEach((c) => add(route, '对比度 ' + c.ratio + ':1 < ' + c.min + ' 「' + c.text + '」 ' + c.cls))
  if (stats.smallTaps.length) add(route, '点按目标过小 ' + stats.smallTaps.join(', '))
}

// 弹窗契约：打开 → 焦点进弹窗 → ESC → 焦点归还
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

// 移动端
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
for (const route of ROUTES) {
  await mobile.goto(BASE + route, { waitUntil: 'networkidle' })
  await mobile.waitForTimeout(300)
  const m = await mobile.evaluate(() => {
    const de = document.documentElement
    return {
      overflowX: de.scrollWidth - de.clientWidth,
      smallTaps: [...document.querySelectorAll('[data-slot="button"], .mnav a')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 2 && r.height > 2 && r.height < 34
        })
        .map((el) => (el.textContent || '').trim().slice(0, 12) + ' h=' + Math.round(el.getBoundingClientRect().height)),
    }
  })
  if (m.overflowX > 0) add('mobile/' + route, '横向溢出 ' + m.overflowX + 'px')
  if (m.smallTaps.length) add('mobile/' + route, '点按目标 <34px ' + m.smallTaps.join(', '))
}

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

console.log('route                 overflow  contrast-violations  small-taps')
for (const r of report) {
  console.log(
    r.route.padEnd(20),
    String(r.overflowX).padStart(6),
    String(r.contrast.length).padStart(16),
    String(r.smallTaps.length).padStart(12),
  )
}

if (problems.length) {
  console.log('\n发现 ' + problems.length + ' 项问题：')
  problems.forEach((p) => console.log(' - ' + p))
  process.exitCode = 1
} else {
  console.log('\n组件层检查通过：无对比度、点按尺寸、溢出、焦点契约问题。')
}
