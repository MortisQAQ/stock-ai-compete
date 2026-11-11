# 附录 B · DSH 宿主（Node 侧）cordis 插件系统源码研究

> 本文是 `openOutcry-Cordis插件架构-前端与后端.md` 的附录，对 cordis 4.0.5 / cordis-plugin-loader 1.0.6 的逐文件考据。
> 引用格式为 `文件路径:行号`。

> 研究对象：`D:\projects\playground\stock-ai-compete\tmp\dsh-src\` 下已解包的 DSH 0.2.1-rc.3 运行时。
> 方法：只读源码与随包文档，所有结论附文件路径 + 行号 + ≤20 行片段。找不到的直接写「未找到」，不做推测。
> 版本证据（`_root`，即根依赖清单文件）：`@deepseek-ai/cordis` 4.0.5、`cordis-plugin-loader` 1.0.6、`cordis-plugin-group` 1.0.5、`cordis-plugin-include` 1.0.10、`@deepseek-ai/schemastery` 3.18.5。

---

## 概览

### 五个概念，一句话一个

| 概念 | 是什么 | 落在哪 |
|---|---|---|
| **Context** | 依赖容器，是一个 **Proxy**。读 `ctx.foo` 走服务解析器；`extend()/isolate()/intercept()` 派生**子上下文**而不改父级 | `cordis/src/context.ts:42` |
| **Service** | 注册在 `ctx` 上的具名 API。子类在构造函数里 `super(ctx, name)` 即完成注册，随所属 fiber 自动注销 | `cordis/src/service.ts:11` |
| **Fiber** | **一次插件应用实例**的运行时。持有依赖状态、校验后的 config、全部 effect/disposer、生命周期状态机 | `cordis/src/fiber.ts:184` |
| **Registry** | 插件注册表。把「函数 / 类 / `{apply}` 对象」归一成同一个 callback，并据此开 fiber | `cordis/src/registry.ts:195` |
| **Reflect** | 反射层。`ctx.get/set/provide/accessor/mixin` 的真身，也是 Proxy handler 的实现 | `cordis/src/reflect.ts:133` |

### 一次插件的完整时间线

```
ctx.plugin(P, config)
  └─ Registry.resolve(P) → callback        // 函数→自身；{apply}→P.apply
  └─ new Fiber(parent, config, Inject.resolve(P.inject), runtime)
       ├─ ctx = parent.extend({ fiber: this })      // 每个 fiber 一个子上下文
       ├─ inject 非空的项写进 ctx[Context.intercept]
       └─ parent.fiber.effect(...)  ← fiber 自身就是一个 effect（dispose 由父 fiber 拥有）

Fiber._checkImpl(name)  × 每个 inject          // 依赖在不在？check 谓词过不过？
Fiber._refresh()                               // 算出 epoch
  ├─ 有缺 → epoch = INACTIVE → _unload()       // 状态 PENDING，什么都不跑
  └─ 齐全 → epoch = ':uid1:uid2...' → _reload()
        ├─ config = resolveConfig(runtime, raw)  // ~standard 校验
        └─ runtime.callback(ctx, config)         // 函数调用 / new 构造
              └─ 期间用 ctx.effect / ctx.on / ctx.provide 登记的东西
                 全部进 this._disposables（逆序执行）

依赖变化（提供者出现/消失/换实例）
  → notify → _checkImpl → _refresh → epoch 变了
  → 同一个 fiber 先 _unload()（跑完所有 disposer）再 _reload()（重跑插件体）
  ※ 不是新建 fiber，是「同一个 fiber 的卸载→重载」

ctx.fiber.dispose() / entry.disabled / entry 被移除
  → 逆序跑 disposer → state=DISPOSED，uid=null，不可再启动
```

**关键洞察（后面第 2、3 节会反复用到）**：`apply()` 会被执行**多次**（每次依赖集变化都可能重跑），所以插件体必须是幂等的、所有资源都必须挂到 `ctx.effect` / `ctx.on` / `ctx.provide` 上，绝不能自己 `new` 了资源就撒手。

---

## 1. cordis 的模型

### 1.1 Context 是 Proxy，不是普通对象

`cordis/src/context.ts:71-84`：

```ts
  constructor() {
    this[symbols.isolate] = Object.create(null)
    this[symbols.intercept] = Object.create(null)
    const self = new Proxy<this>(this, ReflectService.handler)
    this.root = self
    this.baseUrl = undefined
    this.fiber = new Fiber(self, {}, Object.create(null), null, () => [])
    this.reflect = new ReflectService(self)
    this.registry = new RegistryService(self)
    this.events = new EventsService(self)
    this.logger = new LoggerService(self)
    this.fiber._disposables.clear()
    return self
  }
```

构造函数**返回 Proxy**，所以 `new Context()` 拿到的已经是代理对象。根 fiber 的 `uid = 0`、`state = ACTIVE`（`fiber.ts:320-332`）。

`Context` 的公开形状（`context.ts:16-33`）：

```ts
export interface Context {
  [symbols.isolate]: Dict<symbol>
  [symbols.intercept]: Dict
  root: this
  baseUrl?: string
  events: EventsService
  logger: LoggerService
  reflect: ReflectService
  registry: RegistryService
}
```

`ctx.on/ctx.emit/ctx.plugin/ctx.inject/ctx.get/ctx.provide/ctx.effect` 这些**不是 Context 自己的方法**，而是 `ReflectService` 在构造时 mixin 出来的 accessor（`reflect.ts:219-222`）：

```ts
    this.mixin('reflect', ['get', 'set', 'provide', 'accessor', 'mixin'])
    this.mixin('fiber', ['runtime', 'effect'])
    this.mixin('registry', ['inject', 'plugin'])
    this.mixin('events', ['on', 'once', 'parallel', 'emit', 'serial', 'bail', 'waterfall'])
```

所以 `ctx.on` 就是 `ctx.events.on` 的绑定转发，`ctx.effect` 就是 `ctx.fiber.effect`。

**代理读规则**（`reflect.ts:136-171`）：特殊属性（symbol、`prototype`、`then`、数字串、下划线开头）直接透传；否则先看 `props[prop]` 是不是 accessor，再走 `internal/get` waterfall，沿 **fiber 链**逐级向上找 `fiber.store[prop]`：

```ts
        return ctx.events.waterfall('internal/get', ctx, prop, error, () => {
          const key = target[symbols.isolate][prop]
          let fiber = (ctx[symbols.shadow] as Context ?? ctx).fiber
          while (true) {
            const impl = fiber.store?.[prop]
            if (impl) return getTraceable(ctx, impl.value)
            if (prop in fiber.inject) {
              error.message = 'cannot get required service "' + prop + '" in inactive context'
              throw error
            }
            if (!fiber.runtime) throw error
            if (fiber.parent[symbols.isolate][prop] !== key) throw error
            fiber = fiber.parent.fiber
          }
        })
```

注意两条硬约束：**未注入就取服务会抛错**（`cannot get property "x" without inject`）；**注入了但当前不活跃**也会抛（`inactive context`）。这是 DSH 里「必须写 `inject`」的运行时根据。

### 1.2 插件：三种载体，一套元数据

`cordis/src/registry.ts:91-133` 是权威定义：

```ts
export type Plugin<T = any> =
  | Plugin.Function<T>
  | Plugin.Constructor<T>
  | Plugin.Object<T>

export namespace Plugin {
  export interface Base<T = any> {
    name?: string
    Config?: StandardSchemaV1<any, T>
    inject?: Inject
    provide?: string | string[]
    intercept?: Dict<boolean>
  }
  export interface Function<T = any> extends Base<T> {
    (ctx: Context, config: T): any
  }
  export interface Constructor<T = any> extends Base<T> {
    new (ctx: Context, config: T): any
  }
  export interface Object<T = any> extends Base<T> {
    apply(ctx: Context, config: T): any
  }
}
```

**答案：三种都合法，且共享同一套元数据。** 插件是「函数 / 类 / 带 `apply` 的对象」，三者都可以挂 `name / Config / inject / provide / intercept`。

归一化只看一个函数（`registry.ts:222-228`）：

```ts
  resolve(plugin: Plugin): Function | undefined {
    try {
      if (typeof plugin === 'function') return plugin
      if (isApplicable(plugin)) return plugin.apply
    } catch {}
  }
```

`isApplicable` = `object && typeof object.apply === 'function'`（`registry.ts:8-10`）。**这意味着 ESM 模块命名空间天然就是一个 Object 插件**：`export function apply` + `export const inject` + `export const Config` 即可，这正是随包文档给出的宿主插件形态之一（`dsh-agent/-preset/skills/cordis-plugin-development/references/host-plugin.md:57-64`）：

```md
## Host plugin export forms

`index.js` exports one of these forms; do not mix them:

- `export function apply(ctx, config) {}` with optional `export const inject = ['tools']` and `export const Config`.
- A service class as the default export.

Register every resource inside `apply` with `ctx.effect` or `ctx.on` and return its cleanup.
```

### 1.3 apply 与 constructor 的分工

`fiber.ts:247-263` 是唯一的分派点：

```ts
      this._runner = {
        epoch: INACTIVE,
        getOuterStack,
        execute: function () {
          if (isConstructor(runtime.callback)) {
            // eslint-disable-next-line new-cap
            const instance = new runtime.callback(this.ctx, this.config)
            for (const hook of instance?.[symbols.initHooks] ?? []) {
              hook()
            }
            return instance?.[symbols.init]?.()
          } else {
            return runtime.callback(this.ctx, this.config)
          }
        },
        collect,
      }
```

- **类插件**：`new Ctor(ctx, config)` → 跑 `@Inject` 收集的 initHooks → 若实例有 `[Service.init]` 则调用（可返回 generator 做异步初始化，见 3.4）。
- **函数 / 对象插件**：直接 `callback(ctx, config)`。
- 两者返回值都会进 `_execute` 的 effect 收集器（`fiber.ts:356-400`）：返回函数 = disposer；返回 `Promise<Disposer>`；返回 `Iterable<Disposer>` / `AsyncIterable<Disposer>` 则逐个收集。

`isConstructor` 的判断（`utils.ts:79-89`）是「有 `prototype` 且不是 generator/async generator」——**箭头函数和 async 函数永远当函数插件**。

### 1.4 Service 的真实写法

`cordis/src/service.ts:42-59`：

```ts
  constructor(protected ctx: Context, name: string) {
    name ??= this.constructor['provide'] as string

    let self = this
    const tracker: Tracker = {
      associate: name,
      property: 'ctx',
    }
    if (self[symbols.invoke]) {
      self = createCallable(name, joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker)
    }
    self.ctx = ctx
    self.name = name
    defineProperty(self, symbols.tracker, tracker)

    self.ctx.reflect.provide(name, self, this[symbols.check])
    return self
  }
```

要点：
- 名字来自参数，或静态字段 `static provide = 'x'`；
- 构造即注册（走 `ctx.reflect.provide`），**随 fiber 卸载自动注销**；
- 声明了 `[Service.invoke]` 的服务会变成**可调用对象**（`ctx.logger()` 就是这么来的）；
- `[Service.check]` 作为可用性谓词传给 `provide`（见 2.6）。

真实例子（`cordis-plugin-timer/src/index.ts:12-16`），同时演示 `ctx.mixin` 把方法直接铺到 `ctx` 上：

```ts
export class TimerService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'timer')
    ctx.mixin('timer', ['timeout', 'interval', 'throttle', 'debounce', 'setTimeout', 'setInterval'])
  }
```

DSH 自己的核心服务（`dsh-agent/lib/index.js:322-332`）：

```js
var AgentRegistry = class extends Service {
	store = new Map();
	factory;
	initiators = new AsyncLocalStorage();
	...
	constructor(ctx) {
		super(ctx, "agents");
		ctx.inject(["typert"], (typeCtx) => {
```

导出（`dsh-agent/lib/index.js:702`）：

```js
export { AgentRegistry, AgentRegistry as default, agentCarrier, agentEvents, ... };
```

**`export default ServiceClass` 就是「类插件 + 服务」二合一**，cordis 会用 `new Ctx(ctx, config)` 实例化它，而实例化过程本身就是服务注册。

### 1.5 小结：声明一张表

| 想做的事 | 写法 | 证据 |
|---|---|---|
| 函数插件 | `ctx.plugin((ctx, config) => {...})` | `registry.ts:120-123` |
| 对象插件 | `ctx.plugin({ name, inject, apply(ctx, config) {} })` | `registry.ts:130-133` |
| ESM 模块即对象插件 | `export function apply` + `export const inject/Config` | `host-plugin.md:61` |
| 类插件 | `export default class X { constructor(ctx, config) {} }` | `fiber.ts:250-253` |
| 类插件 + 服务 | `class X extends Service { constructor(ctx){super(ctx,'x')} }` | `service.ts:42` |
| 声明依赖 | `static inject = ['a','b']` 或 `export const inject` | `registry.ts:19` |
| 声明配置 | `static Config = z.object({...})` | `registry.ts:104` |
| 显示名 | `name`（用于 fiber 诊断与 logger 名） | `registry.ts:101-102` |

---

## 2. 依赖注入

### 2.1 服务如何注册

**三条路，本质同一条**（都落到 `ctx.reflect.provide`）。

**(a) `ctx.provide(name, value)` —— 裸值**

`reflect.ts:277-305`：

```ts
  provide(name: string, value?: any, check?: () => boolean) {
    return this.ctx.fiber.effect(() => {
      if (!this.props[name]) {
        this.props[name] ??= { type: 'service' }
      } else if (this.props[name].type !== 'service') {
        throw new Error('property "' + name + '" is already declared as ' + this.props[name].type)
      }
      this.props[name] = { type: 'service' }

      this.ctx.root[symbols.isolate][name] ??= Symbol(name)
      const key = this.ctx[symbols.isolate][name]
      const impl: Impl = { name, value, fiber: this.ctx.fiber, check }
      if (this.store[key]) {
        throw new Error('service "' + name + '" has been registered at <' + this.store[key].fiber.name + '>')
      }
      this.store[key] = impl
      this.ctx.fiber.store![name] = impl
```

真实用法（`dsh-app-boot/lib/index.js:4526`）：

```js
		ctx.provide("dshHomePath", dshHomePath);
```

**(b) `ctx.set(name, value)` —— 只能改自己提供的那个**

`reflect.ts:254-265`：`impl.fiber !== this.ctx.fiber` 直接抛 `cannot set property "x" in multiple fibers`。用途是替换值而不换注册者，例如 `dsh-app-boot/lib/index.js:4511` 的 `diagnostics.logger = ctx.logger`。

**(c) `Service` 子类** —— 见 1.4，构造即 `provide`。

**注意**：同一 isolate 作用域内重复 provide 会抛（`service "x" has been registered at <fiber名>`）。这是 DSH 里 `isolate` 存在的原因——需要两个同名实现时，必须换作用域。

### 2.2 如何声明依赖

`cordis/src/registry.ts:12-24`：

```ts
export type Inject<M = Dict> = (keyof M)[] | { [K in keyof M]?: M[K] }

export type InjectKey = keyof {
  [K in keyof Context & string as Context[K] extends { [symbols.config]: any } ? K : never]: any
}
```

两种形态：**数组**（只要服务）与**对象**（服务名 → 该服务在本插件作用域下的 intercept config）。归一化在 `registry.ts:71-88`（`Inject.resolve`），数组项映射成 `null`。

写法：
- 类插件：`static inject = ['agentDefaultModel','agents', ...]`（`dsh-api-session-controller/lib/index.js:2917-2930`，12 个依赖）
- 对象插件：`inject: ['connection','fs','attachments']`（`dsh-api-session-controller/lib/index.js:2475-2479`）
- 装饰器：`@Inject('fs')`（`registry.ts:37-60`，类上累加到静态 `inject`，方法上则延迟到依赖就绪再调用）
- 行内：`ctx.inject(deps, callback)`（`registry.ts:300-302`），等价于 `ctx.plugin({ inject, apply: callback })`

`ctx.inject` 的真实用法（`dsh-agent/lib/index.js:333`）：

```js
		super(ctx, "agents");
		ctx.inject(["typert"], (typeCtx) => {
			typeCtx.typert.lookups.register("agent", {
				parameter: "agent",
				wire: "agentId",
				resource: "session",
```

这展示了 DSH 的常见模式：**服务本身不依赖某能力，但它的某个可选增强依赖**——用 `ctx.inject` 开一个子 fiber，该能力出现时自动加载，消失时自动卸载，主服务不受影响。

### 2.3 依赖未就绪时：fiber 进入 PENDING，插件体不执行

状态机（`fiber.ts:139-154`）：

```ts
/**
 * `PENDING` — waiting for required services; `LOADING` — the plugin callback
 * is running; `ACTIVE` — loaded and providing; `FAILED` — the callback or its
 * config threw; `UNLOADING` — disposers are running; `DISPOSED` — the fiber
 * was removed and cannot restart.
 */
export const enum FiberState {
  PENDING,
  LOADING,
  ACTIVE,
  FAILED,
  DISPOSED,
  UNLOADING,
}
```

即数值 0..5；`dsh-agent/lib/index.js:350` 用 `fiber.state === 5` 判断 UNLOADING，与此一致。

判定逻辑（`fiber.ts:611-623`）：

```ts
  _refresh() {
    let epoch: string | boolean = false
    epoch = ''
    for (const name of Object.keys(this.inject)) {
      const impl = this._store[name]
      if (!impl) {
        epoch = INACTIVE
        break
      }
      epoch += ':' + impl.fiber.uid
    }
    this._setEpoch(epoch)
  }
```

**epoch 是一个字符串指纹**：`INACTIVE`（有缺）或 `':uid1:uid2:...'`（齐全，且记录每个提供者的 fiber uid）。epoch 变化才驱动状态迁移（`fiber.ts:625-639`）：

```ts
  private _setEpoch(epoch: string) {
    const oldEpoch = this._runner.epoch
    if (epoch === oldEpoch) return
    this._runner.epoch = epoch
    if (this.inertia) return
    this._updateState(() => {
      if (epoch !== INACTIVE && oldEpoch === INACTIVE) {
        this.inertia = this._reload()
        return FiberState.LOADING
      } else {
        this.inertia = this._unload()
        return FiberState.UNLOADING
      }
    })
  }
```

所以「依赖没就绪」时插件**不是报错、不是排队等待，而是根本不执行**，fiber 停在 PENDING，什么都不跑。等依赖出现，`_reload()` 才第一次执行插件体。DSH 的启动审计明确把这种状态当作「等待」而非「失败」（`dsh-app-boot/README.md:107`）：`An injected service is unavailable | Warn; continue while the entry waits for its dependencies`。

### 2.4 提供者被销毁 / 重载时，依赖方会怎样

`reflect.ts:297-303`（provide 的 disposer）：

```ts
      return async () => {
        delete this.store[key]
        const fibers = this.notify([name])
        await Promise.allSettled(fibers.map(fiber => fiber.await()))
        // ensure self access before dependencies cleanup
        delete this.ctx.fiber.store![name]
      }
```

`reflect.ts:314-336`（notify）：遍历**所有 runtime 的所有 fiber**，只要 `name in fiber.inject` 且作用域匹配，就 `_checkImpl` + `_refresh`：

```ts
  notify(names: string[], filter = (ctx: Context, name: string) => ctx[symbols.isolate][name] === this.ctx[symbols.isolate][name]) {
    const fibers: Fiber[] = []
    for (const runtime of this.ctx.registry.values()) {
      for (const fiber of runtime.fibers) {
        let hasUpdate = false
        for (const name of names) {
          if (!(name in fiber.inject)) continue
          if (!filter(fiber.ctx, name)) continue
          hasUpdate = true
          fiber._checkImpl(name)
        }
        if (!hasUpdate) continue
        fiber._refresh()
        fibers.push(fiber)
      }
    }
```

**结论（这是整个系统最需要记住的一条）**：

| 事件 | 依赖方发生什么 |
|---|---|
| 提供者 fiber 卸载（服务消失） | epoch 变 INACTIVE → **同一个 fiber** `_unload()`：逆序跑完它所有 disposer，state → PENDING。插件体不报错，只是被拆掉 |
| 新的提供者出现 | epoch 变非 INACTIVE → **同一个 fiber** `_reload()`：重新 `resolveConfig`、重新执行插件体，状态 → ACTIVE |
| 提供者换实例（同名的另一个 fiber，uid 变了） | epoch 字符串变了 → 先 unload 再 reload（`fiber.ts:665-672` / `688-695`） |
| 依赖方自己被 dispose | uid=null，永不再启动 |

`_unload()`（`fiber.ts:675-696`）：

```ts
  private async _unload() {
    await Promise.all(this._disposables.clear().map(async (dispose) => {
      try {
        await composeError(async (info) => {
          await Promise.resolve()
          info.error = new Error()
          await runDisposable(dispose)
        }, this._runner.getOuterStack)
      } catch (reason) {
        this.ctx.logger.error(reason)
      }
    }))
    this.store = undefined
```

注意 `DisposableList.clear()` 返回的是 `values.reverse()`（`utils.ts:27-31`），即**逆序**；每个 disposer 的异常被 logger 吞掉，不会阻断其余清理。

### 2.5 作用域：isolate 与 intercept

- `ctx.isolate(name, label?)`（`context.ts:121-125`）：为某个服务名开独立作用域，`label` 相同则共享。
- `ctx.intercept(name, config)`（`context.ts:139-145`）：为下游插件合并该服务的配置，父级在前、越靠根越先生效（`service.ts:86-102` 的 `[symbols.resolveConfig]`，用 `Config.merge` 或浅 `Object.assign`）。
- Loader 层把这两者变成配置字段 `isolate` / `intercept`（`cordis-plugin-loader/src/config/isolate.ts:5-14`）。
- 服务实例用 `[symbols.filter]` 做隔离判定（`service.ts:61-63`）：比较 isolate 标签是否同一 symbol。

`group: true` 行的价值就在这里——把「提供方 + 消费方」放进同一个 `isolate` realm（`dsh-app-boot/README.md:136`：`a group row gives one isolate realm to a provider and its consumers`）。

### 2.6 可用性谓词 `[Service.check]`

`provide(name, value, check)` 的第三参。fiber 在 `_checkImpl` 里调用它（`fiber.ts:597-609`），返回 false 视同「服务不存在」，依赖方保持 PENDING。

Loader 用它表达「等所有 entry 都加载完」这一条件（`cordis-plugin-loader/src/index.ts:175-179`）：

```ts
  [Service.check]() {
    const config: Loader.Intercept = Service.prototype[Service.resolveConfig].call(this)
    if (config.await && this.getTasks().length) return false
    return true
  }
```

即：依赖 `loader` 且 `intercept: { loader: { await: true } }` 的插件，会一直等到整棵树 import 完成才启动。

---

## 3. 生命周期

### 3.1 `onStart` / `onStop` / `onDispose`：**未找到**

在 `cordis/src/` 全目录 grep `onStart|onStop|onDispose|onReady`，命中 **0**。cordis 4.0.5 **没有**这套命名钩子。随包文档也从未出现（`host-plugin.md` 只说「在 `apply` 里用 `ctx.effect` 或 `ctx.on` 登记资源并返回清理」）。

**真实的生命周期只有四个抓手**：

| 抓手 | 何时跑 | 语义 |
|---|---|---|
| 插件体（`apply` / `constructor`） | 依赖齐备后、每次（重）加载 | 「启动」 |
| `ctx.effect(execute, label?)` | 立即跑 `execute`，收集它产出的 disposer | 「申请资源 + 登记回收」 |
| `ctx.on(name, listener)` | 立即注册 | 「订阅」，disposer 随 fiber |
| `[Service.init]` generator | 类插件构造后 | 「异步启动序列」 |

### 3.2 `ctx.effect` 的确切契约

声明（`fiber.ts:415-418`）：

```ts
  effect(execute: () => SyncEffect, label?: string): Disposable<Promise<void>>
  /** Same as above for async effects; the disposer is also awaitable. */
  effect(execute: () => Effect, label?: string): AsyncDisposable<Promise<void>>
  effect(execute: () => Effect, label = 'anonymous'): any {
```

接受的返回形态（`fiber.ts:83-93`）：

```ts
export type Effect<T = any> =
  | SyncEffect<T>
  | AsyncEffect<T>

type SyncEffect<T = any> =
  | Disposable<T>
  | Iterable<Disposable<T>, void, void>

type AsyncEffect<T = any> =
  | Promise<Disposable<T>>
  | AsyncIterable<Disposable<T>, void, void>
```

语义（文档 `fiber.ts:402-413` + 实现 `fiber.ts:424-561`）：
1. `execute` **立即执行**，产出的 disposer 被收集；
2. 回收顺序是**逆序**（`for (const disposable of disposables.splice(0).reverse())`，`fiber.ts:431`）；
3. 可以 async，卸载时会 await；
4. disposer 二次调用是 no-op（`if (disposing) return disposalTask`）；
5. 已经 dispose 的 fiber 上再 effect 会抛 `CordisError('INACTIVE_EFFECT')`；
6. 返回的 disposer 带 `symbols.effect` 元数据，供 `getEffects()` 输出诊断树（`fiber.ts:568-572`）；
7. `label` 是给人看的，如 `'ctx.on("session/created")'`、`'session-controller: /api/file'`。

**generator 形态是 DSH 里「多段回收、顺序明确」的惯用法**（`dsh-agent/lib/index.js:352-357`）：

```js
		ctx.effect(function* () {
			yield () => this.disposeInitiators();
			yield () => {
				this.closeInitiators();
			};
		}.bind(this), "agents.initiatorLifecycle()");
```

### 3.3 `ctx.on` 的确切契约

`events.ts:288-302`：

```ts
  on(name: string | symbol, listener: (...args: any) => any, options?: boolean | EventOptions) {
    if (typeof options !== 'object') {
      options = { prepend: options }
    }

    // handle special events
    this.ctx.fiber.assertActive()
    listener = this.ctx.reflect.bind(listener)
    const result = this.bail(this.ctx, 'internal/listener', name, listener, options)
    if (result) return result

    const hooks = this._hooks[name] ||= []
    const label = 'ctx.on(' + (typeof name === 'string' ? JSON.stringify(name) : name.toString()) + ')'
    return this.register(label, hooks, listener, options)
  }
```

- 返回 `() => boolean` 的注销函数，**并且**这个注销本身是一个 effect（`events.ts:254-260`），所以 fiber 卸载时自动注销；
- `options` 支持 `prepend` 与 `global`（`events.ts:112-117`）；
- 监听器被 `reflect.bind` 包过，`this` 与参数会被 trace 到调用者上下文（`reflect.ts:408-417`）；
- `ctx.once` 是自注销包装（`events.ts:312-318`）。

**五种派发模式**（`events.ts:24-32`）：`emit`（同步、不等 Promise）、`parallel`（`Promise.allSettled`，失败聚合成 `AggregateError`）、`serial`（顺序 await，遇 bail 值停）、`bail`（同步遇 bail 停）、`waterfall`（每个监听器包住下一个，不调 `next()` 即否决）。

### 3.4 `[Service.init]`：类插件的异步启动

`include/src/index.ts:245-263` 是最清楚的例子：

```ts
  async* [Service.init]() {
    try {
      await this.read()
    } catch (error) {
      if ((error as NodeJS.ErrnoException | null)?.code !== 'ENOENT') throw error
      if (this.config.initial) {
        await this._writeFile(this.config.initial as any)
        await this.read(true)
      } else {
        throw new Error('config file not found: ' + this.filename)
      }
    }

    yield () => this.stop()
    await this.root.update(this.applyPatches(this.data!))
  }
```

`fiber.ts:257` 调用它，返回的 async generator 被 `_execute` 当 `AsyncIterable<Disposer>` 处理（`fiber.ts:383-395`）——**先 `yield` 出清理器，再继续做异步初始化**，保证「清理器一定先于可能失败的初始化登记好」。

### 3.5 禁用 / 重载 / 删除时资源如何回收

| 触发 | 代码 | 结果 |
|---|---|---|
| `disabled: true` | `entry.ts:136-139`：`if (this.disabled) { this.fiber?.dispose(); return }` | fiber dispose，逆序跑 disposer |
| 配置变化 | `entry.ts:142-156` → `fiber.update(config, true)` → `restart()` | 先 `_setEpoch(INACTIVE)` 卸载，再 `_refresh()` 重载 |
| entry 被移除 | `group.ts:37-46`：`entry.fiber?.dispose()` | 同上 |
| 插件 HMR / `registry.delete` | `registry.ts:258-267`：遍历 `runtime.fibers` 全部 dispose | 该 callback 的所有 fiber 一起拆 |
| 整棵树停 | `include/src/index.ts:265-272`：`this.root.stop()` → `EntryGroup.stop` 逐个 remove | 自底向上 |

`registry.delete`（`registry.ts:258-267`）：

```ts
  delete(plugin: Plugin) {
    const key = this.resolve(plugin)
    const runtime = key && this._internal.get(key)
    if (!runtime) return
    this._internal.delete(key)
    for (const fiber of runtime.fibers) {
      fiber.dispose()
    }
    return runtime
  }
```

fiber 自己的 dispose 是一个挂在**父 fiber** 上的 effect（`fiber.ts:265-297`），所以父插件被拆时子插件必然跟着拆——这就是 `ctx.plugin` 的「所有权」语义。

### 3.6 框架事件表

`events.ts:329-352`：

```ts
export interface Events {
  'internal/plugin'(fiber: Fiber): void
  'internal/status'(fiber: Fiber, oldValue: FiberState): void
  'internal/config'(this: Fiber, config: any, next: () => any): any
  'internal/service'(this: Context, name: string, value: any): void
  'internal/update'(this: Fiber, config: any, noSave: boolean, next: () => void): void
  'internal/get'(ctx: Context, name: string, error: Error, next: () => any): any
  'internal/set'(ctx: Context, name: string, value: any, error: Error, next: () => boolean): boolean
  'internal/listener'(this: Context, name: string, listener: any, prepend: boolean): void
  'internal/dispatch'(mode: DispatchMode, name: string, args: any[], thisArg: any): void
}
```

业务插件最常用的是 `internal/status`（如 `dsh-agent/lib/index.js:349-351`）与 `internal/update`（拦截配置更新，见 4.4）。

---

## 4. 配置

### 4.1 声明 schema：`static Config`（schemastery）

`registry.ts:104`：`Config?: StandardSchemaV1<any, T>`。DSH 全部用 `@deepseek-ai/schemastery`（`import z from '@deepseek-ai/schemastery'`）。

真实声明（`dsh-api-session-controller/lib/index.js:2931-2934`）：

```js
		static Config = z.object({
			nativeOpen: z.boolean(),
			listWorkSliceMs: z.natural().min(1).default(16)
		});
```

另一个（`dsh-api-gateway/lib/index.js:746-749`）：

```js
	static Config = z.object({
		websocketHeartbeatIntervalMs: z.number().step(1).min(1).max(MAX_TIMER_DELAY_MS).default(DEFAULT_WEBSOCKET_HEARTBEAT_INTERVAL_MS),
		streamInboxBytes: z.number().step(1).min(1).default(DEFAULT_STREAM_INBOX_BYTES)
	});
```

从调用面能确认的 schemastery 能力：`z.object` / `z.string` / `z.boolean` / `z.number` / `z.natural` / `.min` / `.max` / `.step` / `.default` / `.merge` / `['simplify']` / `['~standard']` / **可调用**（`Config(config)` 返回填好默认值的对象，`session-controller` 在构造函数里就是这么用的）。

> schemastery 本体未解包到该目录，以上为**调用面证据**，不是其源码。

### 4.2 校验发生在哪

`fiber.ts:50-62`：

```ts
export function resolveConfig(runtime: Plugin.Runtime, config: any) {
  if (!runtime.Config) return config
  // TODO: async validation
  const result = runtime.Config['~standard'].validate(config)
  if ('then' in result) {
    throw new TypeError('Async config validation is not supported')
  }
  if (result.issues) {
    throw new ValidationError(result.issues)
  } else {
    return result.value
  }
}
```

调用点（`fiber.ts:641-644`，在 `_reload` 里、执行插件体之前）：

```ts
  private _resolveConfig(config: any) {
    config = this.context.waterfall(this, 'internal/config', config, () => config)
    return this.runtime ? resolveConfig(this.runtime, config) : config
  }
```

- **只支持同步校验**（async 会抛 `Async config validation is not supported`）；
- 失败抛 `ValidationError`，fiber 进 FAILED（`fiber.ts:659-664`），异常被 logger 记录，**不会**冒泡到进程；
- 校验前先过 `internal/config` waterfall —— Loader 就挂在这里做 `!!js` 插值（`loader/src/index.ts:104-113`）。

### 4.3 从 yml 传入

配置行（`EntryOptions`，`cordis-plugin-loader/src/config/entry.ts:9-23`）：

```ts
export interface EntryOptions {
  /** Stable id inside the containing entry tree. */
  id: string
  /** Module specifier imported by the entry tree. */
  name: string
  /** Config passed to the plugin. */
  config?: any
  /** Marks this entry as a nested group. */
  group?: boolean | null
  /** Prevents this entry and descendants from running. */
  disabled?: boolean | null
  /** Required services or service intercept config for this entry. */
  inject?: Inject | null
}
```

真实 yml（`dsh-base/cordis.patch.yml:60-66`）：

```yaml
    - id: session-title
      name: '@deepseek-ai/dsh-session-title'
      config:
        fallbackMaxWords: 5
        fallbackMaxBytes: 40
        maxTitleBytes: 80
```

`config` 原样传给 `ctx.registry.plugin(plugin, this.options.config)`（`entry.ts:236`）。

### 4.4 运行时修改（热重载）

**路径 A：`fiber.update(newConfig)`（内存内）**

`fiber.ts:736-753`：

```ts
  update(config: any, noSave = false) {
    this.assertActive()
    this._config = config
    if (this.state !== FiberState.ACTIVE) {
      this._error = undefined
      this._setEpoch(INACTIVE)
      this._refresh()
      return
    }
    config = this._resolveConfig(config)
    this.context.waterfall(this, 'internal/update', config, noSave, () => {
      this.config = config
      this._error = undefined
      return this.restart()
    })
  }
```

要点：先**校验**再进 `internal/update` waterfall；`next()` 里才 `restart()`；不调 `next()` 即否决重启。`noSave` 是给持久化钩子的提示。

**路径 B：Loader 把新 config 写回 yml**

`cordis-plugin-loader/src/index.ts:115-121`：

```ts
    ctx.on('internal/update', function (config, noSave, next) {
      if (!this.entry || noSave || this.parent.fiber?.entry === this.entry) return next()
      const unparse = this.runtime?.Config?.['simplify']
      this.entry.options.config = unparse ? unparse.call(this.runtime!.Config, config) : config
      this.entry.parent.tree.write()
      return next()
    }, { global: true, prepend: true })
```

即：业务代码 `ctx.fiber.update(cfg)`（`noSave=false`）→ 用 schema 的 `simplify` 反序列化 → 写回 `entry.options.config` → `tree.write()` 落盘。`Include.write()` 用 `yaml.dump(config, { schema })` 原子写（`include/src/index.ts:289-308`，先写 `.tmp` 再 `rename`，EACCES/EBUSY/EPERM 重试 10 次）。

**路径 C：文件被外部改动 → 重读整棵树**

`include/src/index.ts:279-287`：

```ts
  async refresh() {
    try {
      if (!await this.read()) return
      await this.root.update(this.applyPatches(this.data!))
    } catch (error) {
      this.ctx.logger.warn('config reload at %C failed; keeping the running tree', this.filename)
      this.ctx.logger.warn(error)
    }
  }
```

`read()` 会先比内容，未变则直接返回 false（`include/src/index.ts:213-216`），所以 `refresh()` 是廉价的。**谁来调 `refresh()`？** —— 是 `dsh-hmr` 插件；该包**未解包到本目录**，具体 watcher 实现未找到。可见证据只有 `dsh-app-boot/README.md:63`：`The enabled dsh-hmr plugin watches the profile manifest and both user patch files, re-reads the ordered bundle layers`。

### 4.5 volatile 配置（不重启的热更新）

`cordis/README.md:103-105`：

```md
## Volatile configuration

Schemas may return `Volatile<T>` references, whose values are read through `.get()`. Cordis exports the consumer types; Loader commits volatile-only changes into the running references without restarting and notifies the owning fiber through `loader/volatile-update`. Direct `fiber.update()` retains its existing update waterfall and default restart.
```

判定在 `entry.ts:146-150`（只有 `config` 变了、fiber ACTIVE、上下文未变、且差异仅限 `meta.volatile` 字段才走 volatile 路径），提交在 `entry.ts:164-197`，事件是 `loader/volatile-update`（`loader/src/index.ts:34`）。比较逻辑在 `config/diff.ts:43-45`，只认 `~standard.vendor === 'schemastery'`。

### 4.6 `!!js` 表达式

YAML 自定义 tag（`include/src/index.ts:9-15`）：

```ts
const JsExpr = new yaml.Type('tag:yaml.org,2002:js', {
  kind: 'scalar',
  resolve: (data) => typeof data === 'string',
  construct: (data) => ({ __jsExpr: data }),
  predicate: isJsExpr,
  represent: (data) => data['__jsExpr'],
})
```

求值（`config/utils.ts:5-9`）用的是 `with (ctx) { return eval(expr) }` —— 表达式里可以直接 `ctx.get('xxx')`，因为作用域就是该 entry 的 ctx。真实用例（`dsh-base/cordis.patch.yml:22`）：

```yaml
    - id: plugin-manager
      name: '@deepseek-ai/dsh-plugin-manager'
      disabled: !!js "!ctx.get('profileContext')"
```

插值时机在 `internal/config` waterfall（`loader/src/index.ts:104-113`），**在注入就绪之后**——所以表达式能用该插件的服务。注意它明确跳过了 tree carrier（`Group`/`Include`）：`if (plugin?.[EntryGroup.key]) return config`。

---

## 5. loader

### 5.1 组件关系

```
Loader (Service, ctx.loader)  ── 持有一个根 EntryTree（内存树，write() 空实现）
  └─ EntryGroup (root)          ── 持有 EntryOptions[]，负责 create/remove/update
       └─ Entry                 ── 一条 '- id: xxx' 行；持有一个 fiber
            ├─ ctx = loader.ctx.extend({ [Entry.key]: this })
            ├─ subgroup?: EntryGroup   （group: true 行）
            └─ subtree?: EntryTree     （cordis:include 行）

Include extends EntryTree       ── 文件支撑的子树（yml/json/js）
Group   extends EntryGroup      ── 嵌套行列表
```

`Loader` 的声明（`cordis-plugin-loader/src/index.ts:77-102`）：

```ts
export class Loader extends EntryTree {
  declare [Service.config]: Loader.Intercept
  ...
  public name = 'loader'
  public internal = ModuleLoader.fromInternal()
  public builtins: Dict<any> = Object.create(null)

  constructor(ctx: Context, public config: Loader.Config = {}) {
    super(ctx)
    if (config.baseUrl) {
      this.ctx.baseUrl = config.baseUrl
    }
    ...
    ctx.reflect.provide('loader', this, this[Service.check])
```

### 5.2 `- id: xxx` 到底怎么变成 npm 包

**`id` 不是包名，`name` 才是。** `id` 只是树内身份（patch 定位、`loader.resolve(id)`、日志），`name` 才是 module specifier。证据：`entry.ts:11-14` 的注释（`Stable id inside the containing entry tree` / `Module specifier imported by the entry tree`）与 `entry.ts:226`：`await this.parent.tree.import(this.options.name, this.getOuterStack)`。

解析规则（`tree.ts:111-129`）：

```ts
  import(name: string, getOuterStack?: () => string[]) {
    if (name.startsWith('cordis:')) {
      return this.ctx.loader.builtins[name.slice(7)]
    }
    return composeError(async (info) => {
      info.offset += 3
      if (this.ctx.loader.internal) {
        return await this.ctx.loader.internal.import(name, this.ctx.baseUrl!, {})
      } else if (name.startsWith('.')) {
        return await import(/* @vite-ignore */new URL(name, this.ctx.baseUrl).href)
      } else {
        return await import(/* @vite-ignore */name)
      }
    }, getOuterStack)
  }
```

三条规则，按序：

1. **`cordis:<x>` → `loader.builtins[x]`**。DSH 在 `mountRootInclude` 注册了两个：`cordis:include` 与 `cordis:group`（`dsh-app-boot/lib/index.js:4126,4137`）。
2. **裸包名 / 子路径** → `loader.internal.import(name, ctx.baseUrl, {})`，即**用 Node 内部 ESM loader 以 `baseUrl`（配置文件所在目录）为父 URL 做标准 ESM 解析**。所以 `name` 走的是 Node 的 `exports` 规则，profile 的 `node_modules` 里能解析到就行。子路径导出也合法，例如 `dsh-base/cordis.patch.yml` 里的 `name: '@deepseek-ai/dsh-plugin-manager/tools'`。
3. **`./` / `../` 相对路径** → 相对 `ctx.baseUrl` 解析成 file URL 再 import。app-boot 在应用 patch 时会把 insert 行里的绝对路径与 patch 相对路径转成 file URL（`dsh-app-boot/README.md:65`）。

`internal` 的来源（`internal.ts:131-143`）：通过 `node-addon-require-builtin` 取 Node 内部 `internal/modules/esm/loader`，按有无 `getOrCreateModuleJob` 分成 v1/v2，**不看 Node 大版本号**。取不到就退回普通 `import()`。

### 5.3 模块 → 插件的归一

`entry.ts:223-238`：

```ts
  private async _init() {
    let moduleNamespace: unknown
    try {
      moduleNamespace = await this.parent.tree.import(this.options.name, this.getOuterStack)
    } catch (error) {
      this.ctx.logger.error(error)
      return
    } finally {
      this._initTask = undefined
    }
    const plugin = this.loader.unwrapExports(moduleNamespace)
    this._patchContext([])
    this.loader.showLog(this, 'apply')
    this.fiber = this.ctx.registry.plugin(plugin, this.options.config, this.getOuterStack).ctx.fiber
    this.moduleNamespace = moduleNamespace
  }
```

`unwrapExports`（`loader/src/index.ts:201-208`）：

```ts
  unwrapExports(exports: any) {
    if (isNullable(exports)) return exports
    exports = exports.default ?? exports
    // https://github.com/evanw/esbuild/issues/2623
    // https://esbuild.github.io/content-types/#default-interop
    if (!exports.__esModule) return exports
    return exports.default ?? exports
  }
```

**这就是「不能混用两种导出形态」的机制原因**：`default ?? namespace` —— 一旦有 `export default`，命名导出（包括 `apply`/`inject`）全部被丢弃。

### 5.4 `disabled` 如何生效

`entry.ts:75-95`：

```ts
  get disabled() {
    // group is always enabled
    if (this.options.group) return false
    let entry: Entry | undefined = this
    do {
      if (this.disabledOf(entry.options)) return true
      entry = entry.parent.ctx.fiber.entry
    } while (entry)
    return false
  }

  private disabledOf(options: EntryOptions): boolean {
    return isJsExpr(options.disabled)
      ? Boolean(this.evaluate(options.disabled.__jsExpr))
      : Boolean(options.disabled)
  }
```

三条语义：
1. **group 行永远算 enabled**，但父级被禁用会连带子级（向上遍历）；
2. `disabled` 可以是 boolean、null、或 `!!js` 表达式（每次判定都重新求值）；
3. 判定点：`refresh()` 不 init（`entry.ts:111-115`）、`update()` 时 `this.fiber?.dispose()`（`entry.ts:136-139`）。

### 5.5 `config:` 如何生效

原样透传（`entry.ts:236`），由插件自己的 `Config` 校验（4.2）。`update()` 里用 `deepEqual` 逐字段比较（`entry.ts:142-150`），只改了 `config` 且仅限 volatile 字段时走 4.5 的快路径，否则 `fiber.update(config, true)` 重启。

### 5.6 从启动到 settle 的全链路

`dsh-app-boot/lib/index.js:4507-4542`：

```js
async function boot(binName, absoluteConfigPath, patches, prepare, bareModuleBaseUrl) {
	const ctx = new Context();
	...
		ctx.baseUrl = pathToFileURL(dirname(absoluteConfigPath)).href + "/";
		ctx.provide("dshHomePath", dshHomePath);
		ctx.on("internal/update", (_config, _noSave, next) => {
			Promise.resolve(next()).catch((error) => {
				ctx.logger.error(error);
			});
		}, { global: true, prepend: true });
		await ctx.plugin(Loader);
		await prepare?.(ctx);
		stage = "plugin tree failed to load";
		await mountRootInclude(ctx, absoluteConfigPath, patches, bareModuleBaseUrl, binName);
		await ctx.get("loader")?.await();
		if (ctx.get("loader") === void 0) return ctx;
		await auditStartupEntries(ctx, binName);
		return ctx;
```

`mountRootInclude`（`dsh-app-boot/lib/index.js:4125-4152`）：

```js
async function mountRootInclude(ctx, absoluteConfigPath, patches = [], bareModuleBaseUrl, binName = "dsh") {
	ctx.loader.builtins.include = bareModuleBaseUrl === void 0 ? Include : class HostResolvedRootInclude extends Include { ... };
	ctx.loader.builtins.group = Group;
	const prepared = prepareProfilePatches(ctx, [...patches], pathToFileURL(dirname(absoluteConfigPath)).href + "/", binName);
	const rootInclude = {
		id: "include",
		name: "cordis:include",
		config: {
			path: pathToFileURL(absoluteConfigPath).href,
			...prepared.length > 0 ? { patches: prepared } : {}
		}
	};
	const includeId = await ctx.loader.create(rootInclude);
```

即：**根 yml 本身也是树里的一行**（`id: include`、`name: cordis:include`），其 `config.path` 指向 `cordis.yml`，`config.patches` 是叠在它上面的 patch 层。

### 5.7 patch 方言（`applyEntryPatches`）

`include/src/index.ts:57-127` 是唯一实现，`dsh --dump-config` 也复用它（注释明说：`so a dump can never drift from what boots`）。核心循环：

```ts
  for (const patch of patches) {
    const { id, insert, name, ...overrides } = patch

    if (insert) {
      if (id) {
        const target = entryMap.get(id)
        if (!target) { warn('patch insert: entry %C not found', id); continue }
        if (!target.group) { warn('patch insert: entry %C is not a group', id); continue }
        if (!Array.isArray(target.config)) target.config = []
        target.config.push(...insert)
      } else {
        data.push(...insert)
      }
      buildMap(insert)
      continue
    }

    if (!id) { warn('patch: id is required for non-insert patches'); continue }
    const target = entryMap.get(id)
    if (!target) { warn('patch: entry %C not found', id); continue }
    if (name && name !== target.name) {
      warn('patch: name mismatch for %C (expected %C, got %C), skipping', id, target.name, name)
      continue
    }
    for (const [key, value] of Object.entries(overrides)) {
      if (key === 'id') continue
      target[key] = value
    }
  }
```

规则总结（`cordis-composition-reference/SKILL.md:14-16` 是权威散文版）：
- `insert: [rows]` 追加；带 `id` 指向已有 `group: true` 行则插进它的 `config` 数组；
- 无 `insert` 的 patch 按 `id` 定位，字段整体替换；**`config` 是整体替换，不做深合并**；
- `name` 存在时是**断言**（不匹配就跳过并 warn），不是改名；
- 空 id、找不到目标 → warn 并跳过；
- 同一 patch 列表里后一条可以定位前一条 insert 进来的行（`buildMap(insert)`）。

---

## 6. API 网关

### 6.1 三个通道，分清用途

| 通道 | 注册 API | 用途 | 证据 |
|---|---|---|---|
| **Remote（Typert RPC）** | 继承 `TypertRemoteService` + `@Remote` 装饰器 | 业务方法（一元调用 / 流），**DSH 的默认业务 API 形态** | `dsh-api-gateway/README.md:27` |
| **原生 HTTP 路由** | `ctx.connection.fetch.register({ path, methods, requestBody, fetch })` | 文件下载、上传这类非 RPC 请求 | `dsh-api-session-controller/lib/index.js:2482` |
| **WebSocket upgrade** | `ctx.webServer.registerUpgrade({ path, handler(req, socket, head) })` | 自定义 WS 端点（Gateway 自己的 `/api/remote.mux` 就这么挂） | `dsh-api-gateway/lib/index.js:820` |

另外 Gateway 还支持**在共享 RPC 通道上加一层拦截**：`connection.rpc.intercept('/api', claims, dispatch)`（`dsh-api-gateway/lib/index.js:773`）。

### 6.2 Remote 业务方法的真实代码形态

`dsh-api-session-controller/lib/index.js:2917-2934` 与 `:2951-2953`：

```js
		static inject = [
			"agentDefaultModel",
			"agents",
			"attachments",
			"fileUploads",
			"fs",
			"llm",
			"remoteAccess",
			"sessions",
			"sessionProjections",
			"sessionQuery",
			"typert",
			"workspaceRegistry"
		];
		static Config = z.object({
			nativeOpen: z.boolean(),
			listWorkSliceMs: z.natural().min(1).default(16)
		});
		...
		constructor(ctx, config, internals = {}) {
			super(ctx, "sessionController", { namespace: "session" });
			ctx.typert.resources.register("session", { field: "sessionId" });
```

方法用**标准 TC39 装饰器**（编译后展开成 `__esDecorate`，`dsh-api-session-controller/lib/index.js:2676-2700`）：

```js
			_list_decorators = [Remote("list")];
			_search_decorators = [Remote("search")];
			_create_decorators = [Remote("create")];
			...
			_page_decorators = [Remote({
				name: "page",
				resources: { session: addressedSession }
			})];
			_follow_decorators = [Remote({
				mode: "stream",
				resources: { session: addressedSession }
			})];
			_control_decorators = [Remote({ mode: "stream" })];
```

生成的签名（`dsh-api-session-controller/lib/typert.host.js:2046,2067`）：

```js
"signature": "@Remote('list') async list(_request: SessionListRequest, signal: AbortSignal): Promise<SessionListValue>",
"signature": "@Remote('create') create(request: SessionCreateRequest): Promise<SessionCreateValue>",
```

导出（`dsh-api-session-controller/lib/index.js:3367`）：

```js
export { ApiSessionNotFound, SessionController, SessionController as default, SessionFileReferences, SessionSkillCatalog, buildModelCatalog };
```

**`Remote` / `TypertRemoteService` 的定义在 `@deepseek-ai/dsh-typert-protocol`，该包未解包到本目录 → 装饰器实现细节未找到。** 但可从调用面确认的契约：
- 构造函数第三个参数是 `{ namespace }`，决定客户端命名空间（`session`）；
- `super(ctx, name, opts)` 仍是 cordis `Service` 的 `(ctx, name)` 加上额外 options，说明它继承 `Service`；
- 方法参数里 `AbortSignal` 必须是**最后一个**（`dsh-api-gateway/README.md:37`）；
- 流方法返回 `Iterable`/`AsyncIterable`，`@Remote({ mode: 'stream' })`（`dsh-api-gateway/README.md:39`）；
- 客户端产物是 `lib/typert.remote-client.js` 里 `createTypertRemoteInfo({ package, methods })` 的返回值（`:1367`），即**代码生成**，不是手写。

### 6.3 原生 HTTP 路由的真实代码形态

`dsh-api-session-controller/lib/index.js:2474-2489`（完整，含注释）：

```js
const SessionMediaReferences = {
	inject: [
		"connection",
		"fs",
		"attachments"
	],
	apply(ctx) {
		const maxBytes = ctx.attachments.imageLimits.maxImageBytes;
		ctx.effect(() => ctx.connection.fetch.register({
			path: "/api/file",
			methods: ["GET", "HEAD"],
			requestBody: "buffered",
			fetch: (request) => serveFile(request, ctx.fs, maxBytes)
		}), "session-controller: /api/file");
	}
};
```

handler 是**标准 Fetch API**（`Request` → `Response`），`request.signal` 是取消信号（`:2430-2469`）。返回 400/403/404/413 全部用 `new Response(...)` 表达。响应头里有安全相关项：

```js
const BASE_HEADERS = {
	"Cache-Control": "private, no-store",
	"X-Content-Type-Options": "nosniff",
	"Content-Security-Policy": "sandbox; default-src 'none'"
};
```

**`connection.fetch.register` 的实现在 `@deepseek-ai/dsh-client-connection`，未解包 → 注册选项的完整定义未找到。** 从调用面只能确认 `path` / `methods` / `requestBody: 'buffered'` / `fetch` 四个字段，以及返回一个 disposer。

### 6.4 WebSocket upgrade 的真实代码形态

`dsh-api-gateway/lib/index.js:772-774`（RPC 拦截）：

```js
		ctx.inject(["connection"], (connectionCtx) => {
			connectionCtx.connection.rpc.intercept("/api", (endpoint) => this.claimsEndpoint(endpoint), (endpoint, payload, signal, peer) => this.dispatchRpc(endpoint, payload, signal, peer));
		});
```

`dsh-api-gateway/lib/index.js:775-835`（WS 注册，节选）：

```js
		ctx.inject(["connection", "webServer"], (webCtx) => {
			const listen = () => {
				const mux = new RemoteStreamMuxServer(...);
				const releases = new Set();
				webCtx.effect(function* () {
					yield async () => {
						await mux.close();
						await Promise.all(releases);
					};
					const route = {
						path: REMOTE_STREAM_MUX_PATH,
						handler: (req, socket, head) => {
							const admission = webCtx.connection.admitConnection(req);
							if ("rejection" in admission) {
								rejectRemoteStreamUpgrade(socket, admission.rejection);
								return;
							}
							...
							mux.handleUpgrade(req, socket, head, admission.peer);
						}
					};
					yield webCtx.webServer.registerUpgrade(route);
				}, "api-gateway: " + REMOTE_STREAM_MUX_PATH + " WebSocket");
			};
			const ready = webCtx.get("appReady");
			if (ready === void 0) listen();
			else webCtx.effect(() => {
				let closed = false;
				const cancel = ready.onReady(() => { if (!closed) listen(); });
				return () => { closed = true; cancel(); };
			}, "api-gateway: application readiness");
		});
```

路径常量：`const REMOTE_STREAM_MUX_PATH = "/api/remote.mux"`（`:133`）。

**`webServer.registerUpgrade` 的实现在 `@deepseek-ai/dsh-host-webserver`，未解包 → 未找到。** 从调用面确认：入参 `{ path, handler(req, socket, head) }`，返回 disposer；`connection.admitConnection(req)` 负责鉴权并返回 `{ peer }` 或 `{ rejection }`。

### 6.5 前端调用形态

**业务侧（Client 插件）** 拿到的就是 `ctx.remote.<namespace>.<method>(...args, signal?)`。真实调用（`dsh-api-session-controller/lib/client.js:3256`）：

```js
						const result = await this.remote.session.list({});
						if (this.listMutations !== mutations) return;
						if (result.ok) {
							const baseline = this.listPhase === "pending" ? [...result.value.items] : mergeOrderedBaseline(established, result.value.items, (summary) => summary.sessionId);
```

**返回值形状**（`dsh-api-gateway/README.md:60`）：`RemoteResult<T> = { ok: true, value } | { ok: false, error }`，**传输层故障不 reject**，只有装配错误（参数个数错、方法未挂载、命名空间冲突）才 throw。

流式（`client.js:389,431`）：

```js
open: (signal) => remote.session.control(signal),
...
for await (const frame of this.remote.session.follow({...})) {
```

事件（`client.js:4266-4280`）：

```js
			ctx.remote.$on("api-session/added", (summary) => {
				sessions.handleSessionAdded(summary);
			});
			ctx.remote.$on("api-session/status", (sessionId, running) => {
				sessions.handleSessionStatus(sessionId, running);
			});
```

**最底层**（生成的客户端代码最终落到这里，`dsh-api-gateway/lib/types/client/index.js:288`）：

```js
        const result = await connection.rpc.call('/api', endpoint, { args: prepared.args }, prepared.signal);
```

即所有一元调用都是 `POST /api` 上的一次带 endpoint 名的 RPC；流走 `/api/remote.mux` 的 WS。

**前端插件形态**（`dsh-api-session-controller/lib/client.js:4249-4262`）：

```js
		const inject = [
			"connection",
			"fileUpload",
			"typert",
			"remote",
			"remote.commands",
			"remote.session",
			"remote.subagents"
		];
		function apply(ctx) {
			const remotes = ctx.remote;
			const connection = ctx.get("connection");
```

浏览器侧入口是 `window.__ModuleLoader__.load({ id, factory(require) { ... return module.exports } })`（`dsh-api-session-controller/lib/client.js:1-4`），最后 `exports.inject = inject; exports.apply = apply`（`:4317-4320`）——**和宿主侧完全同一套 cordis 插件契约**，只是跑在浏览器里。

`ctx.remote.$mount(contribution)` 负责挂载生成产物（`dsh-api-gateway/lib/types/client/index.js:88-96`），但它由谁调用（`@deepseek-ai/dsh-typert-loader`）未解包 → 调用点未找到。

---

## 7. 一个业务插件的最小骨架

综合 `dsh-api-gateway`（Service + Config + `ctx.inject` + WS 注册）、`dsh-api-session-controller`（Service + Config + `static inject` + `connection.fetch.register` + `ctx.effect`）、`dsh-agent`（`extends Service` + `ctx.inject` 可选增强）、`cordis-plugin-timer`（`Service` + `ctx.mixin` + `ctx.effect`）的真实写法，反推如下。

### 7.1 形态 A：类插件（注册 service + HTTP 路由 + Config schema）

`index.js`：

```js
import z from '@deepseek-ai/schemastery'
import { Service } from '@deepseek-ai/cordis'

/** 宿主服务：ctx.hello */
export class HelloService extends Service {
  // 依赖：connection 出现前不启动；消失则整个 fiber 卸载
  static inject = ['connection']

  // 配置 schema：yml 里的 config: 会被校验成这个形状
  static Config = z.object({
    greeting: z.string().default('hello'),
    maxBytes: z.natural().min(1).default(65536),
  })

  constructor(ctx, config) {
    super(ctx, 'hello')                          // 构造即注册 ctx.hello，随 fiber 注销
    this.settings = HelloService.Config(config)  // 再跑一遍以填默认值

    // 资源必须走 effect，否则依赖变化重载时会泄漏
    ctx.effect(() => ctx.connection.fetch.register({
      path: '/api/hello',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: (request) => this.handle(request),
    }), 'hello: /api/hello')

    ctx.on('internal/status', (fiber) => {
      if (fiber.state === 5) ctx.logger('hello').debug('a fiber is unloading')
    })
  }

  /** 业务方法：其它插件通过 ctx.hello.greet() 调用 */
  greet(name) {
    return this.settings.greeting + ', ' + name
  }

  handle(request) {
    const url = new URL(request.url)
    const name = url.searchParams.get('name') ?? 'world'
    const body = JSON.stringify({ message: this.greet(name) })
    if (Buffer.byteLength(body) > this.settings.maxBytes) {
      return new Response('too large', { status: 413 })
    }
    return new Response(request.method === 'HEAD' ? null : body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }
}

export default HelloService   // 类插件 + 服务，二合一
```

### 7.2 形态 B：对象插件（不需要 service 时更轻）

`index.js`（注意：**不能同时有 `export default`**，否则 `unwrapExports` 只取 default）：

```js
import z from '@deepseek-ai/schemastery'

export const inject = ['connection', 'fs']
export const Config = z.object({
  prefix: z.string().default('/api/hello'),
})

export function apply(ctx, config) {
  const resolved = Config(config)
  ctx.effect(() => ctx.connection.fetch.register({
    path: resolved.prefix,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => new Response('ok', { status: 200 }),
  }), 'hello: route')
}
```

### 7.3 打包成 bundle

`package.json`（对照 `host-plugin.md:9-18`）：

```json
{
  "name": "@local/dsh-hello",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./index.js" },
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

`cordis.patch.yml`：

```yaml
- insert:
    - id: hello
      name: '@local/dsh-hello'
      config:
        greeting: 你好
```

### 7.4 安装与验证

- 用 `plugin_manager` 的 `install_bundle`（`target` 为包目录绝对路径）安装，**不要**手写 profile 的 `package.json` / `cordis.patch.yml`（`cordis-plugin-development/SKILL.md:8-10`）。
- 安装结果的 `application` 与 `warnings` 才决定是否生效，不要拿日志或页面 boot payload 当证据（`SKILL.md:25`）。
- 生效后 `GET /api/hello?name=…` 应返回 `{ "message": "你好, …" }`。

### 7.5 骨架里每一条的出处

| 写法 | 出处 |
|---|---|
| `class X extends Service` + `super(ctx, 'name')` | `service.ts:42` / `timer/src/index.ts:12` / `dsh-agent/lib/index.js:332` |
| `export default ServiceClass` | `dsh-api-session-controller/lib/index.js:3367` / `dsh-agent/lib/index.js:702` |
| `static inject = [...]` | `dsh-api-session-controller/lib/index.js:2917` / `dsh-api-gateway/lib/index.js:745` |
| `static Config = z.object({...})` | `dsh-api-session-controller/lib/index.js:2931` / `dsh-api-gateway/lib/index.js:746` |
| `Config(config)` 填默认值 | `dsh-api-session-controller/lib/index.js:2954` |
| `ctx.effect(...)` 包资源 | `fiber.ts:415` / `dsh-api-session-controller/lib/index.js:2482` / `timer/src/index.ts:35` |
| `ctx.on(...)` | `events.ts:288` / `dsh-agent/lib/index.js:349` |
| `ctx.connection.fetch.register({...})` | `dsh-api-session-controller/lib/index.js:2482-2487` |
| `export const inject` + `export function apply` | `host-plugin.md:61` / `registry.ts:130-133` |
| `dsh.bundle.patch` + `insert` 行 | `host-plugin.md:9-27` / `include/src/index.ts:76-102` |

---

## 未找到 / 证据边界

| 想确认的事 | 状态 | 原因 |
|---|---|---|
| `onStart` / `onStop` / `onDispose` 钩子 | **不存在** | `cordis/src/` 全目录 grep 命中 0；cordis 4.0.5 用 `ctx.effect` + disposer 取代 |
| `TypertRemoteService` / `@Remote` 的实现 | 未找到 | `@deepseek-ai/dsh-typert-protocol` 未解包到该目录 |
| `connection.fetch.register` 的完整选项 | 未找到 | `@deepseek-ai/dsh-client-connection` 未解包 |
| `connection.rpc.intercept` / `admitConnection` 的实现 | 未找到 | 同上 |
| `webServer.registerUpgrade` 的服务端实现 | 未找到 | `@deepseek-ai/dsh-host-webserver` 未解包 |
| `ctx.remote.$mount` 的调用点 | 未找到 | `@deepseek-ai/dsh-typert-loader` 未解包 |
| `dsh-hmr` 的 watcher 实现 | 未找到 | 包未解包；只有 `dsh-app-boot/README.md:63` 的散文描述 |
| schemastery 的源码 | 未找到 | 只解包了依赖清单，无 `node_modules`；结论来自调用面 |
| `dsh-base` 的 TS 源码 | 未找到 | `dsh-base/lib/index.js` 内容就是 `export {};`，它是**纯配置包**，全部内容在 `cordis.patch.yml` |
| `cordis/lib/index.js`（构建产物）与 `src/*.ts` 是否一致 | 未逐行比对 | 本报告全部引用 `src/*.ts`（完整 TypeScript 源码），构建产物 `lib/index.js` 60KB 未逐行核对 |



