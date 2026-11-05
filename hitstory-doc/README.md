# openOutcry 文档目录

## 目录内容

| 文件 | 说明 |
|---|---|
| `openOutcry-产品设计与功能-MVP.md` | 产品文档（MVP），当前权威版本；飞书 [revision 289](https://bcnd63yb3pzy.feishu.cn/wiki/EBGTwakxVijGCYkedzfcSxrInJc)（2026-10-30 14:22）的 Markdown 快照 |
| `openOutcry-产品设计与功能-MVP.mdx` | 产品文档 MDX 实时组件版（与 `openoutcry-web/src/docs/openOutcry-产品设计与功能-MVP.mdx` 同源，直接挂载前端组件与 `?raw` 源码） |
| `导师周报与演播稿-openOutcry.md` | 月度周报：汇报策略、演播动线、逐字口播稿、答辩预案 |
| `openOutcry-Agent工作室与外部接入设计建议-v0.1.md` | Agent 工作室与控制台设计 |
| `openOutcry-受控搜索工具调研与设计-v0.2.md` | 时点掩码与受控检索方案 |
| `FYP Planning Report_ ... .md` | 立项规划报告 |
| `AI模拟盘竞技场-全网调研.md` | 竞品与市场调研 |
| `preview.html` | 旧版单文件离线预览（已废弃，改用 openoutcry-web 的 `/#/guide` 路由） |

## 预览

**当前预览方式：主站路由 `/#/guide`。**

```powershell
cd D:\projects\playground\stock-ai-compete\openoutcry-web
npm run dev      # 打开 http://localhost:5183/#/guide
```

该路由直接编译 `openoutcry-web/src/docs/openOutcry-产品设计与功能-MVP.mdx`，正文里的
`<CodeDemo>` 会挂载主站真实组件（训练委托单、订单审批票据、账户账本、净值曲线），
并可通过 `?raw` 同步展示同一份 .tsx 源码。

### mermaid 图表

文档里的 ```mermaid 代码块在**构建期**由 Playwright 渲染成静态 SVG：

```powershell
cd openoutcry-web
npm run diagrams   # 修改 mermaid 后必须执行，产物在 src/docs/diagrams/
```

产物（`src/docs/diagrams/*.svg` 与 `index.generated.ts`）需要提交，这样 `npm run build`
本身不依赖 Chromium。若忘记重新生成，新图会退化为运行时 mermaid 渲染，而不是显示成源码。

### 旧版离线预览

`preview.html` 由 `_archive/attempt-2026-10-29/docbuild/build.mjs` 从旧快照生成，仅作历史留档：

```powershell
cd D:\projects\playground\stock-ai-compete\_archive\attempt-2026-10-29\docbuild
node build.mjs "D:\projects\playground\stock-ai-compete\hitstory-doc\openOutcry-产品设计与功能-MVP.mdx" "D:\projects\playground\stock-ai-compete\hitstory-doc\preview.html"
```

## 说明

文档站（docs.html）已删除。后续如需在 Web 主项目内提供文档页，应作为 `openoutcry-web` 的一个路由实现，
并复用主站的设计系统（`--paper` / `--ink` / 宋体标题 / Card / Stamp 等），不要另起独立站点。目前对外
分享与评阅暂以飞书知识库为准：https://bcnd63yb3pzy.feishu.cn/wiki/SYwXw5XH2iKfK5kXnqnc6nvknlf
