# 附录 A · DSH 客户端插件系统源码研究

> 本文是 `openOutcry-Cordis插件架构-前端与后端.md` 的附录，对 DSH 0.2.1-rc.3 解包源码的逐文件考据。
> 引用格式为 `文件路径:行号`，路径相对 `tmp/dsh-src/`（解包目录）。

> 结论全部来自对本地已解包源码的实际阅读。引用格式为 `文件路径:行号`，路径相对于 `tmp/dsh-src/`。
> 版本：所有 `@deepseek-ai/dsh-*` 包均为 `0.2.1-rc.3`，cordis 为 `4.0.5`（`_root` 根 manifest 与各包 `package.json`）。
> 解包范围内**没有** `dsh-client-web`（shell 启动内核）、`dsh-client-ui-slots`、`dsh-client-connection`、`dsh-api-remotes`、`dsh-client-ui-conversation/sidebar/session` 等包，凡涉及这些包内部实现的结论都会显式标注为"未验证"。

---

## 0. 概览

整套机制是**三段式**的，不是"构建期把插件打进主 bundle"，而是**运行时按需拉 classic script**：

| 段 | 位置 | 职责 |
|---|---|---|
| 组合层（Node） | `dsh-client-modules/lib/index.js` | 扫 Loader 条目 → 读 `package.json` 的 `dsh.client` → 组装 boot graph → 挂 `/plugins` 路由 → 向 HTML `<head>` 注入 `window.__DSH_BOOT__` |
| wire | `/plugins/...` + `window.__DSH_BOOT__` + `/plugins/events`(SSE) | 组合产物、启动图、热更帧 |
| 加载层（浏览器） | `dsh-client-modules/lib/client.js` | lazy-CJS 模块表，作为 vendored cordis Loader 的 `internal` 接缝 |
| 运行层（浏览器） | `cordis` + `dsh-client-ui-renderer` | 插件上下文/依赖注入（cordis）+ 插槽注册与 React 渲染（slots） |

一句话概括契约：

> **一个客户端插件包 = 一个 npm 包，`package.json` 里写 `dsh.client`（`platform: 'web'`）并导出 `./client` 子路径；该子路径是一个"只调用 `window.__ModuleLoader__.load({id, factory})` 注册工厂"的 classic script；工厂返回一个 cordis 插件对象 `{ name?, inject?, apply }`，`apply(ctx)` 里通过 `ctx.slots.*`、`ctx.reflect.provide`、`ctx.remote`、`ctx.effect` 等注册一切。**

### ⚠️ 一处需要更正的前提

任务描述把 `dsh-client-ui-cordis` 当作"浏览器侧的 cordis 容器"。**它不是。**

它的 `package.json` description 是 *"Cordis dynamic-plugin definition card: the keyed cordis_define tool row with its run/stop switch"*（`dsh-client-ui-cordis/package.json:4`），README 写的是"渲染历史生成的插件卡片 + 进程内定义的控制面板"（`dsh-client-ui-cordis/README.md:7-9`）。它是**一个普通的客户端 UI 插件**，只是恰好叫 cordis——它给 `cordis_define`/`cordis_run` 这些**模型工具调用**渲染卡片。

真正的"浏览器侧 cordis 容器"是：vendored 的 `@deepseek-ai/cordis`（`cordis/src/*.ts`）+ `@deepseek-ai/cordis-plugin-loader` 在页面里跑的那一份，由 `dsh-client-modules` 供代码、由 `dsh-client-ui-renderer` 供 slots/React 面。详见第 3 节。

---

## 1. 一个客户端插件包长什么样？

### 1.1 package.json 的关键字段

以 `dsh-client-ui-goal`（最典型的"纯 UI 插件"）为例：

~~~json
{
  "name": "@deepseek-ai/dsh-client-ui-goal",
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".":            { "types": "./lib/types/index.d.ts", "default": "./lib/index.js" },
    "./client":     { "types": "./lib/types/client/index.d.ts", "default": "./lib/client.js" },
    "./src/*": "./src/*",
    "./package.json": "./package.json",
    "./locale/*.json": "./locale/*.json"
  },
  "dsh": {
    "client": {
      "inject": ["@deepseek-ai/dsh-api-remotes", "...", "@deepseek-ai/dsh-client-ui-renderer"],
      "platform": "web"
    }
  },
  "peerDependencies": { "@deepseek-ai/cordis": "~4.0.5" }
}
~~~
（`dsh-client-ui-goal/package.json:1-45`）

四个关键点：

**(a) `dsh.client` —— 唯一的"我是客户端插件"标记。**

解析器只认这四个字段（`dsh-client-modules/lib/index.js:54-75`）：

~~~js
function parseDshClient(pkgName, value) {
  if (typeof value !== "object" || value === null) throw ...
  if (typeof decl.platform !== "string") throw new Error(... "dsh.client.platform must be a string");
  const inject   = optionalStringArray(pkgName, "dsh.client.inject", decl.inject);
  const external = optionalStringArray(pkgName, "dsh.client.external", decl.external);
  if (decl.immediately !== void 0 && typeof decl.immediately !== "boolean") throw ...
  return { platform: decl.platform, ...inject, ...external, ...immediately };
}
~~~

- `platform`：必须是字符串，且**只有等于 `"web"` 才会被收进客户端图**（`lib/index.js:733`：`if (decl === void 0 || decl.platform !== "web") return null;`）。
- `inject`：**包名**数组，声明"这些客户端包必须先激活"（例：`dsh-client-ui-layout` 注入 `dsh-client-ui-renderer`/`ui-session`/`ui-theme`/`client-shortcuts`）。注意它和插件**导出的** `inject` 不是一回事，后者是 **service 名**数组，见 §3.3。
- `external`：**非 baseline 的模块请求**。baseline 由 shell 的冻结模块表 `PLATFORM_MODULES` 提供（react、cordis、ui-slots、ui-primitives 等），只有超出这张表的名字才需要在此声明；声明值要么是提供它的动态包行，要么是静态表里的精确 key（`README.md:48`、`lib/index.js:412-444`）。
- `immediately`：布尔，进 wire 的 `plugins[].immediately`。

**(b) `exports["./client"]` 是硬要求。**

~~~js
const clientRel = clientExportOf(packageName, pkg.exports);
if (clientRel === void 0) throw new Error(
  "client-modules: " + packageName + " declares dsh.client but exports no \"./client\" bundle");
~~~
（`dsh-client-modules/lib/index.js:737-738`）

`clientExportOf` 接受字符串形式或带 `default` 的一层条件对象（`lib/index.js:172-182`）。

**(c) `peerDependencies` 里必须有 cordis。** 六个包全部声明 `"@deepseek-ai/cordis": "~4.0.5"`——插件在浏览器里用的是**页面里那一份** cordis，包本身不打包它（`dsh-client-ui-{cordis,goal,layout,renderer}/package.json` 的 peerDependencies）。

**(d) 宿主半 `.` 入口必须存在。** 即便是纯 UI 插件，也要有一个空的 host `apply`：

~~~js
// dsh-client-ui-goal/lib/index.js
/**
* Goal surface plugin, node half. Pure UI plugin: the empty apply exists so
* the plugin appears in the host cordis.yml / Loader; the browser half
* ships via exports["./client"], discovered through the package.json
* dsh.client declaration.
*/
function apply() {}
export { apply };
~~~

原因：`ClientModuleRegistry` 是**扫 Host Loader 的已启用条目**来发现客户端插件的（`lib/index.js:545-558`），没有 host 行就没有 Loader 条目，也就不会被扫到。

另外，**可安装的 bundle**（用户级插件）还有一个 `dsh.bundle.patch` 字段，指向一段 YAML patch，用来把行插进 Loader：

~~~json
{ "dsh": { "bundle": { "patch": "./cordis.patch.yml" },
           "client": { "platform": "web", "immediately": true,
                       "inject": ["@deepseek-ai/dsh-client-ui-conversation"] } } }
~~~
（`_skill/templates/decoration/package.json`，随包发行的插件开发 skill 模板）

~~~yaml
# _skill/templates/decoration/cordis.patch.yml
- insert:
    - id: my-decoration
      name: '@local/my-decoration'
~~~

### 1.2 入口文件导出什么？

这是最容易误解的一点：**`./client` 不是一个 ESM 模块，而是一段立即执行、把自己注册进全局队列的 classic script。**

`dsh-client-ui-goal/lib/client.js` 的开头与结尾：

~~~js
// 第 1-9 行
window.__ModuleLoader__.load({
  id: "@deepseek-ai/dsh-client-ui-goal",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react_jsx_runtime = require("react/jsx-runtime");
    let react = require("react");
    let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
~~~

~~~js
// 第 654-659 行（工厂的返回）
    exports.GoalBar = GoalBar;
    exports.GoalDock = GoalDock;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
~~~

所以：

- **脚本层**：`window.__ModuleLoader__.load({ id, factory })`，`id` **等于包名**（`dsh-client-modules/lib/client.js:701-714` 会 `stripClientSuffix` 后按包名索引，重复注册直接抛错）。
- **工厂层**：`factory(require) -> exports`，是个 CJS 工厂，同步 `require` 走共享模块表。
- **导出层**：`{ apply, inject, name? }` —— 这正是 cordis 的 **object plugin** 形态（`cordis/src/registry.ts:8-10, 130-133`）：

~~~ts
function isApplicable(object: Plugin) {
  return object && typeof object === 'object' && typeof object.apply === 'function'
}
...
export interface Object<T = any> extends Base<T> {
  apply(ctx: Context, config: T): any
}
~~~

而 `Base` 里可选的元数据就是 `name` / `Config` / `inject` / `provide` / `intercept`（`registry.ts:100-111`）。`RegistryService.plugin()` 里还有一条细节：`if (name === 'apply') name = undefined`（`registry.ts:324-325`）——所以**导出一个名为 `name` 的常量是有效的**，`dsh-client-hmr` 就导出了 `name = "client-hmr"`（`dsh-client-hmr/lib/client.js:239, 311`）。

默认导出（`export default`）在浏览器里用不上：客户端 bundle 不是 ESM。Host 半才有 `unwrapExports` 的 ESM/CJS 归一（`cordis-plugin-loader/lib/index.js:666-672`），浏览器侧工厂直接返回 `module.exports`。

---

## 2. 客户端插件如何被发现和加载？

**运行时通过 HTTP 拉取 classic script，不是构建期打包。**

### 2.1 Host 侧：`dsh-client-modules` 的 Node half 做了什么

它导出一个 cordis Service：

~~~js
var ClientModuleRegistry = class extends Service {
  static inject = ["loader"];
  ...
  constructor(ctx) {
    super(ctx, "clientModules");
    ...
    ctx.on("internal/plugin", (fiber) => {          // 增量：每个插件发射都标脏
      const entryName = fiber.entry?.options.name;
      if (entryName === void 0) return;
      this.dirty.add(entryName);
      ...
    });
    for (const entry of ctx.loader.entries()) this.dirty.add(entry.options.name);
    this.composed = this.compose();
    ...
    ctx.inject(["webServer"], registerWebCarrier);   // 挂 /plugins 前缀路由
    ctx.on("webserver/index-inject", (table) => {    // 往 index HTML 注入
      table.push(...bootInjections(this.composed));
    });
  }
~~~
（`dsh-client-modules/lib/index.js:513-573`，节选）

完整链路：

1. **发现**：扫 `ctx.loader.entries()`，对每个条目 `locatePkgJson` 找到最近的 `package.json`（`lib/index.js:762-809`），读 `pkg.dsh.client`，`platform !== 'web'` 的丢弃（`lib/index.js:720-750`）。
2. **快照**：读 `lib/client.js` 字节 + `mtimeMs/ctimeMs/size` 基线（`captureArtifactBaseline`，`lib/index.js:813-822`），rev 由这三元组 hash 出来（`artifactRevision`，`lib/index.js:193-200`）——**不 hash 内容**。
3. **排序**：`orderByModuleGraph` 按 `external` 做拓扑排序，自请求和环直接抛错（`lib/index.js:422-444`）。
4. **打包成 combo**：把多个 `client.js` 拼成一条 URL `/plugins/??a/client.js,b/client.js&rev=...`，单条 URL 上限 3 KiB，超了分区；分两个 phase：`bootstrap`（模块系统自身）和 `application`（其余）（`lib/index.js:160-253, 369-400`）。
5. **发路由**：`webServer.register({ kind: "prefix", path: "/plugins", handler: this.serveBundle })`（`lib/index.js:563-569`）；同时暴露 `fetchBundle(request)` 给没有 web server 的 shell 载体（`lib/index.js:590-605`）。
6. **注入 index**：往 `<head>` 依次塞：注册队列脚本 → application combo 的 `<link rel=preload>` → bootstrap combo 的阻塞 `<script>` → `window.__DSH_BOOT__` 全局（`lib/index.js:460-505`）。

注入的队列外壳（`lib/index.js:461-482`，节选）：

~~~js
const queue = "(()=>{" +
"const pendingQueue=[]" +
"window.__ModuleLoader__={" +
"  mode:\"queue\"," +
"  pendingQueue," +
"  load(registration){pendingQueue.push(registration)}," +
"  create(options){" +
"    ... const exports=registration.factory(specifier=>{ throw ... });" +
"    return exports.createClientModuleSystem(this,{id:registration.id,exports},options)" +
"  }" +
"}" +
"})()";
~~~

也就是说：**HTML 里先装一个"只排队"的 facade**，插件脚本执行时把 `{id, factory}` 推进 `pendingQueue`；shell 调用 `create()` 时才真正实例化模块系统，并把 facade 切成 `mode: "live"`，之后 `load()` 直接落到 `ClientModuleSystem.register`（`lib/client.js:692-700`）。

### 2.2 wire 的形状

`window.__DSH_BOOT__` = boot graph，解析器在 `lib/client.js:108-160`：

~~~js
if (typeof graph.rev !== "string") throw ...
const release = decodeRelease(graph.release);           // { version, commit? }
if (!Array.isArray(graph.entries)) throw ...
if (!Array.isArray(graph.batches)) throw ...
for (const value of graph.entries) {
  const row = value;
  if (typeof row.id !== "string" || typeof row.url !== "string" || typeof row.rev !== "string") throw ...
  const inject   = optionalStringArray(subject, "inject", row.inject);
  const external = optionalStringArray(subject, "external", row.external);
  ...
}
~~~

行结构（`graphRow`，`lib/index.js:401-411`）：`{ id, url, rev, inject?, immediately?, external? }`；batch 结构 `{ phase: 'bootstrap'|'application', url, rev, entries: [...] }`。

`release` = `{ version, commit }`（`lib/index.js:536-544`，commit 在构建时硬编码为 `"be72761"`）。**页面只应用与自身 boot release 相同的图**，换了 release 就只发公告不换插件（`lib/client.js:407-414`，`dsh-client-modules/README.md:44`）。

### 2.3 浏览器侧：lazy-CJS 模块表

核心模型写在 `lib/client.js:13-27` 的文件头注释里：

~~~js
/**
* Lazy CJS model: executing a plugin bundle only REGISTERS its
* factory (window.__ModuleLoader__.load({id, factory})); every module body
* side effect — including CSS injection — lives inside the factory closure and
* runs at materialization, not at script execution.
* Materialization (factory(require) -> exports) happens on first import/require
* and is memoized in ClientModuleLoader.loadCache; ...
* Resolution branch order (import): seed word -> shell instance; memoized
* record -> exports; graph row -> register its dependency factories and own
* factory; registered factory -> materialize; anything else -> throw (loud —
* the runtime mirror of the build-time bundle purity gate).
*/
~~~

脚本怎么来（`lib/client.js:580-594`）：

~~~js
/** Default bundle-load hook: same-origin external classic script. */
const defaultLoadBundle = (url) => new Promise((resolve, reject) => {
  const el = document.createElement("script");
  el.async = true;
  el.src = url;
  el.addEventListener("load", () => { el.remove(); resolve(); }, { once: true });
  el.addEventListener("error", () => { el.remove(); reject(new Error(
    "client-modules: bundle script " + url + " failed to load")); }, { once: true });
  document.head.append(el);
});
~~~

失败策略：batch 传输失败重试一次；batch 执行了但没注册目标行 → 永不重放（重放会撞重复注册），改用该包自己的单资源 URL；一个 batch 失败对每行最多 3 次请求（`lib/client.js:728-770` 的注释与实现）。

**分块**：tsdown 把源码里的 `import()` 编译成 `require.async("./client.<name>.js")`；对应脚本按 `/plugins/<pkg>/client.<name>.js?rev=<rev>` 按需拉（`README.md:34`、`lib/index.js:220-231`）。

**服务出口**：`ctx.modules`（`lib/client.js:994-1004`）：

~~~js
const inject = ["loader"];
function apply(ctx) {
  const modules = ctx.loader.internal;
  if (modules?.version !== "client") throw new Error("client-modules: the Loader has no client module system");
  ctx.reflect.provide("modules", modules);
}
~~~

即：**模块系统本身作为 Loader 的 `internal` 接缝被装上**，再以 `ctx.modules` 暴露给页面（HMR 用、诊断用）。

### 2.4 为什么是 classic script 而不是 ESM？

因为 vendored Loader 唯一消费代码的入口是 `EntryTree.import` → `internal.import`（`README.md:84`），而 `internal` 被换成了这个 lazy-CJS 表。这让"代码怎么到达"完全由 `dsh-client-modules` 拥有，而"条目治理（fiber 生命周期、inject 等待、update/refresh）"仍留在 vendored cordis 侧。

---

## 3. 浏览器侧的 cordis 容器

### 3.1 谁构成容器

- **cordis 本体**：`@deepseek-ai/cordis` 4.0.5（`cordis/src/context.ts`、`fiber.ts`、`reflect.ts`、`registry.ts`、`service.ts`）。
- **Loader**：`@deepseek-ai/cordis-plugin-loader`，在页面里把 boot graph 的每一行变成 Loader 条目（`entry.options.name` 就是包名）。
- **代码供给**：`dsh-client-modules` 的 `ClientModuleSystem`（`internal`）。
- **UI 面**：`dsh-client-ui-renderer` 安装 slot renderer 并提供 `ctx.uiRenderer`。

`ClientEntries` 用 Loader 建条目的方式（`dsh-client-modules/lib/client.js:483-505`）：

~~~js
async create(loader, id) {
  const options = { name: id };            // 行名 = 包名
  const entryId = loader.ensureId(options);
  try { await loader.create(options); }
  finally { this.managed.set(id, loader.resolve(entryId)); }
}
async replace(entry, id, rev, generation) {
  this.index.invalidateForReplacement(id, rev);
  await this.modules.prefetch(id);
  if (!this.current(generation)) return;
  await tearDownEntryFiber(entry);
  removeOwnedStyles(id);
  await this.modules.import(id, "", {});
  await entry.refresh();
  await entry.fiber?.await();
}
~~~

Loader 侧拿到模块命名空间后交给 cordis 注册（`cordis-plugin-loader/lib/index.js:450-465`）：

~~~js
async _init() {
  let moduleNamespace;
  try { moduleNamespace = await this.parent.tree.import(this.options.name, this.getOuterStack); }
  catch (error) { this.ctx.logger.error(error); return; }
  const plugin = this.loader.unwrapExports(moduleNamespace);
  this._patchContext([]);
  this.loader.showLog(this, "apply");
  this.fiber = this.ctx.registry.plugin(plugin, this.options.config, this.getOuterStack).ctx.fiber;
}
~~~

### 3.2 插件在浏览器里注册什么

从实际插件看，注册面有五类：

| 面 | API | 例子 |
|---|---|---|
| **service** | `new XxxService(ctx, "name")`（继承 cordis `Service`）或 `ctx.reflect.provide(name, value)` | `slots`（`ui-renderer`）、`layout`（`ui-layout`）、`modules` |
| **slot** | `ctx.slots.register(...)` / `registerFactory` / `inject` | `ui-goal`、`ui-layout`、`ui-cordis` |
| **effect** | `ctx.effect(fn, label)` | 一切生命周期绑定 |
| **event** | `ctx.on(event, fn)` / `ctx.emit` | `ctx.on("connection/reset", ...)` |
| **locale / shortcut** | `ctx.locale.register(ns, {zh,en})`、`ctx.shortcuts.register({...})` | `ui-goal`、`ui-layout` |

service 注册有两种写法，本质同一条路径。类形式（`cordis/src/service.ts:42-58`）：

~~~ts
constructor(protected ctx: Context, name: string) {
  name ??= this.constructor['provide'] as string
  ...
  self.ctx.reflect.provide(name, self, this[symbols.check])
  return self
}
~~~

命令式形式（`dsh-client-ui-renderer/lib/client.js:1867-1875`）：

~~~js
function apply(ctx) {
  new SlotRegistry(ctx).install(createSlotRenderer());
  ctx.reflect.provide("uiRenderer", { mount: (container) => {
    const root = mountApp(container, buildRenderApp({ ctx }));
    return () => { root.unmount(); };
  } });
}
~~~

`reflect.provide` 把值绑到**当前 fiber** 的 effect 上，fiber 卸载即注销，并 `notify` 唤醒依赖它的 fiber（`cordis/src/reflect.ts:277-305, 314-336`）。

### 3.3 依赖注入怎么做

**插件导出的 `inject` 是 service 名数组**，不是包名：

~~~js
// dsh-client-ui-goal/lib/client.js:557-565
/** Required services for the Goal dock, command-input projection, Remote mutations, and copy. */
const inject = ["slots", "sessions", "remote", "remote.goals", "locale", "uiConversation"];
~~~

`ui-layout` 是 `["slots", "theme", "locale", "shortcuts"]`（`dsh-client-ui-layout/lib/client.js:589-594`），`ui-renderer` 是 `[]`（`lib/client.js:1833`）。

机制：`Inject.resolve` 把数组归一成 `{ name: null }` 映射（`cordis/src/registry.ts:71-89`），`Fiber` 据此只在所有 service 可用时才激活；service 上下线时 `reflect.notify` 遍历所有 fiber、`_checkImpl(name)` + `_refresh()` 重算（`reflect.ts:314-336`）。所以**插件会随依赖出现/消失自动装卸**。

可选依赖用 `ctx.inject([...], cb)`：`ctx.inject(["webServer"], registerWebCarrier)`（`dsh-client-modules/lib/index.js:570`）——服务缺席时插件照常激活，只是这段不跑。

**注意三层 `inject` 不要混淆**：

| 位置 | 值类型 | 语义 |
|---|---|---|
| `package.json` → `dsh.client.inject` | 包名 | 客户端包激活顺序（wire 上的 `plugins[].inject`） |
| `lib/client.js` 导出的 `inject` | service 名 | cordis 依赖注入，缺一个就不激活 |
| `package.json` → `dsh.client.external` | 模块 specifier | 非 baseline 的 `require` 请求，由模块表解析 |

### 3.4 生命周期

一切注册都应包在 `ctx.effect` 里，fiber 卸载时自动回收。`ui-layout` 的一个 `apply` 里就把 store、service、root 注册、快捷键、订阅全塞进一个 effect，并显式返回组合 disposer（`dsh-client-ui-layout/lib/client.js:601-699`）：

~~~js
ctx.effect(() => {
  const handle = createLayoutStore();
  const instance = handle.create();
  ...
  const disposeService      = ctx.reflect.provide("layout", layout);
  const disposeRegistration = ctx.slots.register({ name: "root", ... }, AppFrame);
  ...
  return () => {
    disposeShortcut(); layout.dispose(); disposePanels();
    disposeRegistration(); disposePanelInfo(); disposeService();
  };
}, "ui-layout: service + root registration");
~~~

---

## 4. UI 扩展点：往界面里插东西

### 4.1 真实 API 名字

全部挂在 `ctx.slots`（`SlotRegistry extends Service`，`dsh-client-ui-renderer/lib/client.js:1305-1352`）：

| API | 签名（从调用点归纳） | 作用 |
|---|---|---|
| `ctx.slots.register(options, Component)` | `(options, React.ComponentType) => disposer` | 往**已声明的** slot 里注册一个条目 |
| `ctx.slots.registerFactory(options, Component)` | 同上 | 注册可复用 Component Factory（带 local slot） |
| `ctx.slots.inject(ownerKey, callback)` | `(key, () => disposer \| disposer[]) => disposer` | 等某个 slot **被声明后**再注册；声明撤销则卸载，重新声明则重装 |
| `ctx.slots.provideRoot({ hooks, props? })` | | 往 root 注入全局标准 hook 源 |
| `ctx.slots.entries(key)` | `(key) => Entry[]` | 读某 slot 当前条目（`ui-layout` 用它算 main 的合法 panel id） |
| `ctx.slots.subscribe(key, fn)` | | 订阅某 slot 的注册变化 |
| `ctx.slots.snapshot(root?)` | | 导出声明树（只读检视） |

`register` / `registerFactory` 都被 `ctx.effect` 包了一层，所以返回值是 fiber 绑定的 disposer（`lib/client.js:1813-1820`）：

~~~js
SlotRegistry.prototype.register = function register(rawOptions, component) {
  const options = rawOptions;
  return this.ctx.effect(() => this["_register"](options, component), "slots.register()");
};
~~~

### 4.2 先声明、再注册：`children`

slot 不是全局预置的一堆 key，而是**由占用者声明**的。声明写在 root（或某个 keyed 条目）的 `children` 里（`dsh-client-ui-layout/lib/client.js:623-653`）：

~~~js
const disposeRegistration = ctx.slots.register({
  name: "root",
  locale: "common",
  children: {
    "sidebar":       { kind: "single", scope: "root" },
    "main":          { kind: "keyed",  scope: "root" },
    "rightbar":      { kind: "single", scope: "root" },
    "shell.bottom":  { kind: "single", scope: "root" },
    "shell.overlay": { kind: "list",   scope: "root" },
    "shell.leading": { kind: "single", scope: "root" }
  },
  store
}, AppFrame);
~~~

`kind` 有 `single` / `keyed` / `list` / `chain`（`chain` 走 `renderSlotChain`，见 `lib/client.js:346-348, 374-375`）；`scope` 是 `root` 或 `session`。

这也解释了一个容易踩的坑：**往别人的 slot 里注册，必须用 `ctx.slots.inject(ownerKey, ...)` 包住**，因为声明可能比你晚到，也可能中途塌缩。`_skill/references/practices.md:36` 把它写成硬规则：

> Contribute through slots: `ctx.slots.inject(ownerKey, () => ctx.slots.register(...))`. The callback's registrations are disposed when the owning declaration collapses and reinstalled when it returns.

### 4.3 注册选项的形态

从调用点归纳出的键（`name` 必填，其余可选）：

| 键 | 含义 | 出处 |
|---|---|---|
| `name` | 目标 slot key | 所有调用 |
| `id` | `single` slot 里的身份（`sidebar.footer.action` 用 `id: "cordis-panel"`） | `ui-cordis/lib/client.js:1411-1414` |
| `key` | `keyed` slot 里的键（`tool.call.toolview` 用 `key: "cordis_define"`） | `ui-cordis/lib/client.js:1446-1448` |
| `order` | 同 slot 内排序（`conversation.input.dock` 用 `order: 10`） | `ui-goal/lib/client.js:604-608` |
| `priority` | 同 cell 竞争时的优先（`conversation.user.text.node` 用 `priority: 100`） | `ui-goal/lib/client.js:577-581` |
| `locale` | 该条目使用的字典命名空间 | `ui-goal:585`、`ui-cordis:1414` |
| `inject` | `(sessionId?) => { hooks?, props?, ...callbacks }`，注入到组件 props | `ui-goal:609-650` |
| `children` | 声明该条目拥有的子 slot | `ui-layout:626-651`、`ui-cordis:1456-1459` |
| `store` | 作用域 store（handle 或 factory） | `ui-layout:652` |

`inject` 的返回值会**合并进组件 props**，所以"数据 + 回调"是同一个通道。`ui-goal` 的 dock 条目（`dsh-client-ui-goal/lib/client.js:604-651`，节选）：

~~~js
ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
  name: "conversation.input.dock",
  id: "goal",
  order: 10,
  locale: NS,
  inject: (sessionId) => {
    const binding = sessions.binding(sessionId);
    if (binding === void 0) throw new Error("ui-goal: session \"" + sessionId + "\" is unavailable");
    return {
      hooks: { goalActivation: createGoalActivationSource({ ... }) },
      onEdit:   async (objective) => { ... ctx.remote.goals.edit(sessionId, ref, { objective }); },
      onPause:  async () => ctx.remote.goals.pause(sessionId, ref),
      onResume: async () => ctx.remote.goals.resume(sessionId, ref),
      onClear:  async () => ctx.remote.goals.clear(sessionId, ref)
    };
  }
}, GoalDock));
~~~

`inject` 还可以返回 **`disposer` 的可迭代集合**——`ui-cordis` 用一个 generator 一次注册两个 keyed 条目（`ui-cordis/lib/client.js:1475-1486`）：

~~~js
ctx.slots.inject("tool.call.toolview", function* () {
  yield ctx.slots.register({ name: "tool.call.toolview", key: "cordis_stop",     locale: NS }, CordisActionRow);
  yield ctx.slots.register({ name: "tool.call.toolview", key: "cordis_undefine", locale: NS }, CordisActionRow);
});
~~~

### 4.4 渲染面：组件拿到的 props

渲染由**占用者**在自己的组件里调 `renderSlot`（`dsh-client-ui-layout/lib/client.js:118-120, 301-347`）：

~~~js
function MainPanel({ usePanelInfo, renderSlot }) {
  return renderSlot("main", {}, { entryKey: usePanelInfo((info) => info.activePanelId) ?? "conversation" });
}
...
const overlays = react.useMemo(() => renderSlot("shell.overlay", {}), [renderSlot]);
const leading  = react.useMemo(() => renderSlot("shell.leading", {}), [renderSlot]);
~~~

标准 props 是**框架注入**的（组件"zero cordis or framework imports"，见 `ui-layout/lib/client.js:96-108` 的模块注释）：`{ useStore, useSessions, usePanelInfo, actions, renderSlot, t }`（`AppFrame` 签名，`ui-layout/lib/client.js:208`），外加 `inject` 注入的 `hooks` / 回调。

ctx 级只有一个渲染入口，且只允许 `'root'`（`lib/client.js:1531-1535`）：

~~~js
renderSlot(key, owner) {
  if (key !== "root") throw new Error("ctx-level renderSlot only renders 'root' (got \"" + key +
    "\"); child slots render through the component props face");
  if (this._renderer === void 0) throw new Error("slot renderer not installed — boot must call ctx.slots.install(createSlotRenderer()) before rendering 'root'");
  if (this._core.entries("root").length === 0) throw new Error("'root' has no registration — a layout entry must register into 'root' before the shell renders it");
  return this._renderer.renderRoot(this.hostFace(), owner);
}
~~~

React 绑定由 `createSlotRenderer()` 提供，最终由 `ctx.uiRenderer.mount(container)` 挂载（`lib/client.js:1267-1277, 1867-1875`）；`mount` 会先 hydrate 掉 boot 页的 `[data-dsh-boot]` DOM（`lib/client.js:1848-1862`）。

### 4.5 在解包范围内能确认的 slot 名

| slot | kind / 用途 | 声明方 / 使用方 |
|---|---|---|
| `root` | 唯一 ctx 级 | `ui-layout` 注册 `AppFrame` |
| `sidebar` / `main` / `rightbar` | 三列 | `ui-layout` 声明并渲染 |
| `shell.bottom` / `shell.overlay` / `shell.leading` | 框架级座位 | `ui-layout` |
| `conversation.input.dock` | 输入框上方 dock（Todo/Goal/Queue 卡片栈） | `ui-goal` 注册（`README.md:30`） |
| `conversation.chat.node` | 聊天流节点渲染器（keyed by kind） | `ui-goal` 注册 `key: "command-input"` |
| `conversation.user.text.node` | 用户消息内文本节点 | `ui-goal` 注册 `key: "command"` |
| `conversation.composer.dock` | 输入区装饰位（**随包 skill 推荐的默认落点**） | `_skill/templates/decoration/client.js:16` |
| `sidebar.footer.action` | 侧栏底部动作位 | `ui-cordis` 注册 `id: "cordis-panel"` |
| `tool.call.toolview` | 工具调用卡片（keyed by 工具名） | `ui-cordis` 注册 `cordis_define`/`cordis_run`/`cordis_stop`/`cordis_undefine` |
| `tool.view.cordis` | 包自有的业务视图座位 | `ui-cordis` 在自己的条目里 `children` 声明 |

> 完整清单需要运行时查 `Slots.listSubTree`（`_skill/SKILL.md:18` 明说用 `cordis_inspect_query` 查 Client `Slots`），解包范围只覆盖上表这些。

### 4.6 其它扩展面（不是 slot）

- **聊天流新节点类型**：`ctx.uiConversation.events.register(definition)` + 在 `conversation.chat.node` 下用该定义的 `kind` 注册视图（`ui-goal:571`；`practices.md:38`）。
- **用户文本渲染规则**：`ctx.uiConversation.userText.register(rule)`（`ui-goal:572`）。
- **全局面板（"页面"级）**：往 `main` 这个 keyed slot 注册 `key`，然后 `ctx.layout.selectPanel(id)` 切过去；`null` 表示回到 Conversation（`ui-layout/README.md:44`；`selectPanel` 会先查 `main` 的注册表，不存在就抛错，`README.md:66`）。
- **快捷键 / 命令**：`ctx.shortcuts.register({ id, label, aliases, defaults, regions, modals, resolve })`（`ui-layout:654-688`）。注意这是**物理键位注册表**，不是命令面板。
- **文案**：`ctx.locale.register(ns, { zh, en })` + `ctx.locale.bind(ns)`（`ui-goal:573-576`、`ui-layout:602-606`）。

### 4.7 设置页 / 命令面板：部分未找到

- **设置页**：解包范围内没有 `dsh-client-ui-settings*` 的实现。只能从生成的包目录看到存在"设置导航入口 + feature 自有 tab 注册进去的 tab chrome"：`@deepseek-ai/dsh-client-ui-settings-plugins` —— *"the Settings navigation entry and the tab chrome feature-owned tabs register into"*（`dsh-agent/-preset/skills/cordis-composition-reference/references/packages.md:104`）。**具体 API 名未找到**（该包未解包）。
- **命令面板**：解包范围内**没有**叫 palette 的东西。最接近的是 `@deepseek-ai/dsh-client-ui-commands`（*"Client command surface: global directory cache, '/' source, three command UI kinds, popupSelect registry"*，同上 `:75`）与 `dsh-client-shortcuts`。**`ctx.commands` 在整个解包树里 grep 命中 0 次**，所以"往命令面板加东西"的 API 未找到。

---

## 5. 客户端插件如何与宿主（Node 侧）通信

### 5.1 唯一的业务通道：`ctx.remote`

`ctx.remote` 是 `@deepseek-ai/dsh-api-gateway` 的 Client 半（`ClientRemote`）：

> The same `./client` import selects standalone Node ESM `lib/client.node.js` or browser loader factory `lib/client.browser.js` … `@deepseek-ai/dsh-api-gateway/client` provides `ctx.remote`
> （`dsh-api-gateway/README.md:9, 96`）

调用形态（`ui-goal` 实测用法）：

~~~js
// 一元调用：ctx.remote.<namespace>.<method>(...)
const result = await ctx.remote.goals.get(sessionId);
await ctx.remote.goals.edit(sessionId, ref, { objective });
await ctx.remote.goals.pause(sessionId, ref);

// 转发事件订阅
const off = ctx.remote.$on("goal/activation-changed", (event) => {
  if (event.sessionId === sessionId) listener(event.goal);
});
~~~
（`dsh-client-ui-goal/lib/client.js:621-626, 632-647`）

命名空间由 `@deepseek-ai/dsh-api-remotes` 的 BFF 装配决定（`api-remotes` 未解包，但 `ui-goal/package.json` 的 `dsh.client.inject` 里就有它）。

### 5.2 通道细节

一元调用走 **HTTP POST `/api`**，通过 Connection 的 RPC 面：

~~~js
// dsh-api-gateway/lib/client.browser.js:1826
const result = await this.connection.rpc.call("/api", endpoint, { args: prepared.args }, prepared.signal);
~~~

流式走**共享 WebSocket**：

~~~js
// dsh-api-gateway/lib/client.browser.js:106
const REMOTE_STREAM_MUX_PATH = "/api/remote.mux";
// :1688
const local = connection.rpc.open?.("/api", endpoint, payload, signal, uplink);
~~~

- 一元：`InvokeRemoteRequest` 带 `peer`，Host 侧 `ctx.typertGateway.invoke()` 做端点/参数/权限校验后调业务 Service（`README.md:21-27`）。
- 流：一个 `/api/remote.mux` 承载多条**逻辑流**；Host 每 2s Ping，两个间隔无活动就断（`README.md:53-57`）。每条逻辑流还带**同一条流上的 Client→Host 上行**（`RemoteStream<Out, In>`，`README.md:59-63`）。
- 事件：Host 通过 `registerRemoteEvents()` 注册一个应用事件源，占用内部端点 `$events`；Client 的 `$on` 就是这条流（`README.md:71-75`）。

### 5.3 返回值契约（重要）

一元调用**永远不 reject 传输错误**，统一折叠成 `RemoteResult<T>`：

> Every unary call resolves to `RemoteResult<T>` — `{ ok: true, value }` or `{ ok: false, error }` — and never rejects for a carrier problem … `error` is a live `RemoteError` instance, so `throw result.error` keeps throw semantics, and `isRemoteFailure(value)` is the one predicate a consumer needs
> （`dsh-api-gateway/README.md:118`）

`ui-goal` 的用法印证了这一点——它到处判 `result.ok`（`lib/client.js:47-49`）：

~~~js
deps.getGoal().then((result) => {
  if (read !== readEpoch || startedAtEvent !== eventEpoch) return;
  if (!result.ok) return;
  const goal = result.value;
  ...
});
~~~

### 5.4 其它 Client 半服务（同属"与宿主通信"）

| 服务 | 提供方 | 用途 |
|---|---|---|
| `ctx.connection` | `dsh-client-connection` | 认证 RPC 载体、`state`/`reconnect()`、`connection/reset` 事件 |
| `ctx.sessions` | `dsh-client-ui-session` | session binding、projection 读取 |
| `ctx.remote.$mount()` | api-gateway | 客户端插件**自己挂一份** Host→Client 生成贡献（`README.md:100`） |

### 5.5 不要和 `/plugins/events` 混淆

`/plugins/events` 是 **HMR 的 SSE 通道**（`dsh-client-hmr/lib/index.js:8`），只送 `{type:'graph'}` 和 `{type:'rebuilt'}` 两种帧，与业务 Remote 完全无关。

---

## 6. HMR：开发时客户端插件如何热更新

### 6.1 Host 侧：`dsh-client-hmr` 的 Node half

~~~js
const EVENTS_ENDPOINT = "/plugins/events";
const name = "client-hmr";
const inject = ["clientModules", "webServer"];
const Config = z.object({ pollIntervalMs: z.number().step(1).min(1).default(500) });
function sseData(frame) { return "data: " + JSON.stringify(frame) + "\n\n"; }
function bundleStat(path) {
  const bundle = statSync(path);
  return { mtimeMs: bundle.mtimeMs, ctimeMs: bundle.ctimeMs, size: bundle.size };
}
~~~
（`dsh-client-hmr/lib/index.js:8-30`，节选）

- **轮询而非 inotify**，因为网络挂载不给 inotify 事件（`README.md:53-55`）。默认 500ms。
- 元组变化 → `ctx.clientModules.rebuilt(id)` → 新 rev → 广播 `rebuilt` 帧。
- 新连接先收到当前完整 `graph` 帧（`README.md:59`）。

### 6.2 浏览器侧：`dsh-client-hmr` 的 client half

~~~js
function apply(ctx) {
  const entries = ctx.modules.entries;
  const handle = (frame) => {
    (frame.type === "graph"
      ? Promise.resolve().then(() => entries.sync(frame.graph))
      : entries.reload(frame.id, frame.rev)).catch((error) => { ctx.logger.error(error); });
  };
  ...
  ctx.effect(() => {
    const transport = globalThis.__DSH_TRANSPORT__;
    if (transport?.fetch !== void 0) { /* shell 自有载体，如 worker 预览隧道 */ }
    const source = new EventSource(EVENTS_ROUTE);   // 否则原生 EventSource
    source.addEventListener("message", (event) => { receive(event.data); });
    return () => { source.close(); };
  }, "client-hmr: event source");
}
~~~
（`dsh-client-hmr/lib/client.js:269-306`，节选）

帧校验在 `parsePluginsEventFrame`（`client.js:209-230`），`EVENTS_ROUTE` 是去掉前导斜杠的文档相对路径 `"plugins/events"`（`client.js:235`）。

**换代码的精确步骤**（`dsh-client-modules/lib/client.js:492-505`）：

1. `index.invalidateForReplacement(id, rev)` —— 作废旧模块记录（bootstrap 包直接抛错，要求整页刷新）。
2. `await this.modules.prefetch(id)` —— 先把新脚本拉下来，旧 fiber 仍在服务。
3. `await tearDownEntryFiber(entry)` —— 拆旧 fiber。
4. `removeOwnedStyles(id)` —— 移除该插件注入的 `<style data-plugin=...>`。
5. `await this.modules.import(id, "", {})` —— 物化新 exports（导入失败在这一步暴露给页面诊断，而不是只打日志）。
6. `await entry.refresh()` —— 通过 Loader 重新挂载。

**级联**：`README.md:93` 说得很清楚——fiber 的 activation epoch 把其 service provider 的 uid 串起来，替换 provider 的 fiber 会让所有依赖者经 cordis 自己重新级联，HMR 侧零簿记。

**CSS 归属**：工厂物化期间新出现的未标记 `<style>` 会被打上 `data-plugin=<id>`（`lib/client.js:617-631`），卸载时按这个标记回收。

### 6.3 开发命令与构建约定

- `pnpm run dev:web` 同时起 Host 和 rebuild watcher；`--no-serve` 只挂 watcher 到别处起的 Host（`dsh-client-hmr/README.md:34`）。
- 共享 Client tsdown preset 在**所有包内 chunk 写完后**才 stamp `lib/client.js`，所以"只重建了 chunk"也能推进包 rev，无需 Host 扫 chunk（`README.md:34`、`dsh-client-modules/README.md:30`）。
- 必须先 `pnpm run build` 产出 `lib/client.js`，否则 Host 激活即报错并列出包/路径（`dsh-client-modules/README.md:52`）。

### 6.4 限制（官方自陈）

- **粒度粗**：换 fiber + 换组件，**被重载插件的 React state 丢失**；session/workspace/connection 状态保留（`dsh-client-hmr/README.md:110`）。
- **无回滚**：旧 fiber 拆掉后，新 bundle 导入或激活失败不会恢复旧版（`README.md:112`）。
- **Web 专属**：Electron 安装与后端重启不走这条 SSE（`README.md:113`）。
- **改代码之外的启停**也走同一条图流：启用一个普通插件 = 加 Loader 行；禁用 = 删行并等异步副作用排空后再驱逐（`dsh-client-modules/README.md:42`）。

---

## 7. 最小客户端插件骨架

下面的骨架**直接来自随包发行的插件开发 skill 模板**（`_skill/templates/decoration/`），不是推断——它是官方认可的"最小可用客户端插件"。

### 7.1 文件树

~~~
my-decoration/
  package.json
  cordis.patch.yml
  index.js          # host half（空 apply）
  client.js         # browser half（注册工厂 + slot 注册）
  locale/en.json    # meta.title / meta.description（Plugin Manager 用）
  icon.svg          # ./icon 导出（可选但强烈建议）
~~~

### 7.2 package.json —— **【确认】**

~~~json
{
  "name": "@local/my-decoration",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg"
  },
  "files": ["index.js", "client.js", "cordis.patch.yml", "locale/*.json", "icon.svg"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": ["@deepseek-ai/dsh-client-ui-conversation"]
    }
  }
}
~~~

- 四字段 `platform/inject/external/immediately` 的校验见 `dsh-client-modules/lib/index.js:54-75`。
- `exports["./client"]` 缺失会抛错，见 `lib/index.js:737-738`。
- `dsh.bundle.patch` 见 `_skill/references/host-plugin.md:5`。
- `./locale/*.json` + `./icon` 是 Plugin Manager 展示元数据（`host-plugin.md:23-45`）。

### 7.3 index.js —— **【确认】**

~~~js
/** Host half of the decoration bundle; the Client module owns the rendering. */
export function apply() {}
~~~

（`_skill/templates/decoration/index.js`；同样形态见 `dsh-client-ui-goal/lib/index.js`）

### 7.4 client.js —— **【确认】**（模板原文）

~~~js
window.__ModuleLoader__.load({
  id: '@local/my-decoration',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    function Decoration() {
      return h('svg', {
        viewBox: '0 0 64 64', width: 48, height: 48,
        'aria-hidden': true,
        style: { display: 'block', pointerEvents: 'none' },
      }, h('circle', { cx: 32, cy: 32, r: 24, fill: '#247bbf' }));
    }
    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock', id: 'my-decoration', order: 5,
        }, Decoration));
      },
    };
  },
});
~~~

（`_skill/templates/decoration/client.js`，全文 22 行）

这段 22 行代码把前面所有契约都串起来了：`__ModuleLoader__.load({id, factory})` → 工厂返回 `{inject, apply}` → `apply` 里 `ctx.slots.inject` + `ctx.slots.register` → `require('react')` 走共享模块表。

### 7.5 cordis.patch.yml —— **【确认】**

~~~yaml
- insert:
    - id: my-decoration
      name: '@local/my-decoration'
~~~

（`_skill/templates/decoration/cordis.patch.yml`）

### 7.6 如果要做"有状态 + 调宿主"的插件：**【推断】**

模板只演示了纯装饰。把 §3–§5 的契约组合起来，一个带远程数据的最小插件大致是（**下面这段是反推的，不是源码原文**）：

~~~js
window.__ModuleLoader__.load({
  id: '@local/my-widget',
  factory(require) {
    const React = require('react');
    function Widget(props) {           // props 里含 inject() 注入的 hooks / 回调 / label
      return React.createElement('div', null, props.label);
    }
    return {
      name: 'my-widget',               // 【确认】cordis 读 plugin.name
      inject: ['slots', 'remote', 'locale'],   // 【确认】service 名数组
      apply(ctx) {
        ctx.effect(() => ctx.locale.register('my-widget', { zh: {}, en: {} }), 'locale');
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'my-widget',
          order: 5,
          locale: 'my-widget',
          inject: () => ({
            hooks: { /* 自建 uSES source */ },
            label: 'hi',
            onPing: async () => { const r = await ctx.remote.someNs.ping(); return r.ok ? r.value : undefined; }
          })
        }, Widget));
      }
    };
  }
});
~~~

其中：`{name, inject, apply}`、`ctx.slots.inject/register`、`inject:` 选项、`ctx.effect`、`ctx.locale.register`、`ctx.remote.*` 返回 `RemoteResult` —— **这些都有源码证据**（分别见 §1.2、§4.1、§4.3、§3.4、§4.6、§5.3）。
而"具体某个 Remote 命名空间叫什么方法"是**推断/不可知**的：命名空间由 `@deepseek-ai/dsh-api-remotes` 的装配决定（未解包），必须运行时用 `cordis_inspect_query` 查 `Service` 才能确定。

### 7.7 安装

按 `_skill/SKILL.md:9`：用 `plugin_manager` 的 `action: install_bundle` + 包目录绝对路径安装；不要手写 profile 的 `package.json` / `cordis.patch.yml`，也不要在 profile 目录里跑 pnpm。

---

## 8. 明确"未找到"的部分

| 问题 | 结论 |
|---|---|
| `dsh-client-ui-cordis` 是浏览器侧容器？ | **否**。它是动态插件卡片的 UI 插件（`dsh-client-ui-cordis/package.json:4`、`README.md:7-9`） |
| 设置页的 tab 注册 API 名 | **未找到**。只有生成目录里的描述性证据（`packages.md:104`），实现包 `dsh-client-ui-settings*` 未解包 |
| 命令面板（palette）的注册 API | **未找到**。解包树里 `palette` 只命中 logger 配色；`ctx.commands` 命中 0 次 |
| slot 注册选项的完整 TypeScript 类型 | **未找到**。解包产物只有 `lib/*.js`，`lib/types/**/*.d.ts` 未随包解出（glob 命中 0）。§4.3 的键表是从调用点归纳的 |
| `dsh.client.inject` 在浏览器里到底由谁消费排序 | **未完全验证**。在本组包内它只被校验并写进 wire 的 `plugins[].inject`（`lib/client.js:137-141, 393, 517`——`ClientEntries.start` 只读 `id`）；真正的排序消费者是 shell 启动内核（`dsh-web-app`/`dsh-client-web`），未解包 |
| `ctx.remote` 各命名空间的具体方法签名 | **未找到**（`dsh-api-remotes` 未解包）。只能确认返回值折叠为 `RemoteResult<T>` |
| 页面 shell 如何调用 `ctx.uiRenderer.mount` | **半确认**。`mount` 的实现与契约在 `ui-renderer/lib/client.js:1867-1875`，调用方（shell）未解包 |

---

## 9. 契约速查表

| 你要做的事 | 正确写法 | 证据 |
|---|---|---|
| 标记包为客户端插件 | `package.json` 加 `dsh.client.platform = "web"` | `dsh-client-modules/lib/index.js:66, 733` |
| 提供浏览器代码 | `exports["./client"]` 指向构建产物 | `lib/index.js:172-182, 737-738` |
| 注册工厂 | `window.__ModuleLoader__.load({ id: '<包名>', factory })` | `ui-goal/lib/client.js:1-3`；模板 `client.js:1` |
| 导出插件 | `factory` 返回 `{ name?, inject?: string[], apply(ctx) }` | `ui-goal:654-658`；`cordis/src/registry.ts:8-10, 100-111` |
| 声明依赖 | `inject: ['slots', 'remote', ...]`（service 名） | `ui-goal:558-565` |
| 声明包级前置 | `dsh.client.inject: ['@deepseek-ai/dsh-client-ui-conversation']`（包名） | `ui-goal/package.json`；模板 |
| 往 slot 里加东西 | `ctx.slots.inject(key, () => ctx.slots.register(opts, Component))` | `ui-goal:577-586`；`practices.md:36` |
| 声明子 slot | `ctx.slots.register({ name, children: { k: { kind, scope } } }, C)` | `ui-layout:623-653` |
| 渲染子 slot | 组件 props 里 `renderSlot(key, props, { entryKey })` | `ui-layout:118-120` |
| 提供 service | `new Svc(ctx, 'name')` 或 `ctx.reflect.provide('name', v)` | `cordis/src/service.ts:42-58`；`ui-renderer:1869` |
| 挂挂载点 | `ctx.reflect.provide('uiRenderer', { mount })` | `ui-renderer:1869-1874` |
| 调宿主 | `const r = await ctx.remote.<ns>.<m>(...)` → `r.ok / r.value / r.error` | `ui-goal:621`；`api-gateway/README.md:118` |
| 订阅宿主事件 | `ctx.remote.$on('event/name', fn)` | `ui-goal:624` |
| 生命周期 | 一切注册放 `ctx.effect(fn, label)` | `ui-layout:607-699` |
| 热更 | 无需插件侧代码；`pnpm run dev:web` | `dsh-client-hmr/README.md:34` |

