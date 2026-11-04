import { defineConfig } from 'vitest/config'

/**
 * 只测纯逻辑：格式化、图表坐标、派生选择器。
 *
 * 组件的视觉与交互交给 scripts/audit-ui.mjs 与 scripts/check-type-floor.mjs
 * （真实浏览器里跑对比度、点按尺寸、字号下限），不在这里复制一遍 DOM 断言。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
