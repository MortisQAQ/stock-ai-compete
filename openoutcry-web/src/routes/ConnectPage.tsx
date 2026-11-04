import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useRun } from '../store/RunProvider'
import { useToast } from '../store/ToastProvider'
import { AGENTS, AGENT_ORDER, agentOf, cardJsonOf, cardPathOf, isAgentId } from '../data/agents'
import { TRAINING_SEED } from '../data/trainings'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { Stamp } from '../components/ui/Stamp'
import type { AgentId, AgentMeta } from '../types'
import { money } from '../lib/format'

/** 卡内键值行：左侧字段名，右侧值。最后一行去底线。 */
function KV({ k, v, last = false }: { k: string; v: string; last?: boolean }) {
  return (
    <div
      className={
        'flex items-baseline justify-between gap-4 py-1.5' +
        (last ? '' : ' border-b border-border')
      }
    >
      <span className="text-note text-muted-foreground">{k}</span>
      <b className="text-right font-mono text-note font-semibold text-foreground">
        {v}
      </b>
    </div>
  )
}

/** 注册表里的一张 Agent 卡 */
function AgentTile({
  meta,
  quotes,
  active,
  inUse,
  onSelect,
}: {
  meta: AgentMeta
  quotes: string[]
  active: boolean
  inUse: boolean
  onSelect: () => void
}) {
  return (
    <Card
      interactive
      onClick={onSelect}
      aria-pressed={active}
      className={active ? 'border-ink/60 shadow-raise' : ''}
    >
      <CardHeader className="flex-wrap">
        <span>{meta.id}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          {inUse && <Badge variant="outline">当前使用</Badge>}
          <Badge variant={meta.cardOrigin === 'builtin' ? 'pine' : 'brass'}>{meta.tag}</Badge>
        </span>
      </CardHeader>
      <CardContent className="py-3">
        <div className="font-serif text-body font-bold leading-snug tracking-[-0.01em]">
          {meta.name}
        </div>
        <p className="mt-1 mb-2.5 text-note leading-relaxed text-muted-foreground">
          {meta.description}
        </p>
        <KV k="模型" v={meta.model} />
        <KV k="工具" v={meta.tools === 0 ? '未声明' : meta.tools + ' 个受控工具'} />
        <KV k="风险档" v={meta.riskProfile + ' · ' + meta.holdingPeriod} />
        <KV k="预算" v={meta.budgetUsed + ' / ' + meta.budgetTotal + ' 次'} />
        <KV k="最近会话" v={meta.lastSession} />
        <KV
          k="被引用"
          v={quotes.length === 0 ? '未被任何训练引用' : quotes.join(' · ')}
          last
        />
        <div className="mt-2.5 flex items-center gap-2">
          <Stamp tone={meta.qualification.startsWith('受控') ? 'pine' : 'brass'} size="sm">
            {meta.qualification}
          </Stamp>
          <span className="text-micro tracking-[0.06em] text-muted-foreground">
            {meta.cardOrigin === 'builtin' ? '内置卡 · 只读' : '本地卡 · 可覆盖'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function ConnectPage() {
  const { state, actions } = useRun()
  const { notify } = useToast()
  const navigate = useNavigate()
  const intakeRef = useRef<HTMLDivElement>(null)

  const [selected, setSelected] = useState<AgentId>(state.agent)
  const [source, setSource] = useState<AgentId>('codex')
  const [connected, setConnected] = useState(false)
  const [message, setMessage] = useState('')

  const card = AGENTS[selected]

  const connect = () => {
    setConnected(true)
    setMessage('模拟连接完成。未启动进程，未执行真实授权，严格评测资格仍未验证。')
    notify('握手完成（演示）', 'success')
  }

  const copySkill = async () => {
    try {
      await navigator.clipboard.writeText('/install openoutcry-skill')
      notify('已复制安装示例', 'success')
    } catch {
      notify('剪贴板不可用：/install openoutcry-skill', 'warn')
    }
  }

  const enter = () => {
    if (state.agent !== source) actions.switchAgent(source)
    navigate('/training')
  }

  const toIntake = () => intakeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="label">№ 04 — Connect</span>
            <Stamp tone="brass">设计稿 · 未执行真实授权</Stamp>
          </div>
          <h1>把熟悉的 Agent 带进来。</h1>
          <p className="deck">
            平台只认一张 Agent 卡：人格、模型、资金上限与工具白名单都写在卡里。下面是已有的卡，
            以及把新卡接进来的三步。
          </p>
        </div>
      </div>

      <div className="section-hd">
        <h2>我的 Agent</h2>
        <div className="section-hd-side">
          <span className="count">
            {AGENT_ORDER.length} 张已接入 · 内置 {AGENT_ORDER.filter((id) => AGENTS[id].cardOrigin === 'builtin').length}
          </span>
          <Button variant="ghost" size="sm" onClick={toIntake}>
            接入新 Agent
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 [&>*]:min-w-0 md:grid-cols-2">
        {AGENT_ORDER.map((id) => (
          <AgentTile
            key={id}
            meta={AGENTS[id]}
            quotes={TRAINING_SEED.filter((t) => t.team.includes(id)).map((t) => t.no)}
            active={selected === id}
            inUse={state.agent === id}
            onSelect={() => setSelected(id)}
          />
        ))}

        <Card variant="dashed" interactive className="agent-add" onClick={toIntake}>
          <CardHeader>
            <span>new card</span>
            <Badge variant="outline">+</Badge>
          </CardHeader>
          <CardContent className="py-3">
            <div className="font-serif text-body font-bold leading-snug tracking-[-0.01em]">
              接入新 Agent
            </div>
            <p className="mt-1 text-note leading-relaxed text-muted-foreground">
              三步：安装 Skill → 启动本地 Runner → 握手与预检。凭据留在你本机，卡进入
              {' '}
              <span className="mono">~/.openoutcry/agents/</span>。
            </p>
            <KV k="接入方式" v="Skill · MCP · 本地 Runner" />
            <KV k="预检项" v="协议版本 · 动作格式 · 工具白名单" />
            <KV k="资格" v="通过预检前一律为探索组" last />
          </CardContent>
        </Card>
      </div>

      <p className="note mt-3">
        内置卡随平台发布且只读；本地卡与内置卡同名时，本地卡覆盖内置卡（与 TraderHarness 的
        {' '}
        <span className="mono">agents/&lt;id&gt;.json</span> 规则一致）。卡里没有的字段不会被猜出来——
        模型未上报的 Agent 一律进探索组。
      </p>

      <div className="section-hd">
        <h2>Agent 卡 · {card.name}</h2>
        <div className="section-hd-side">
          <span className="count mono">{cardPathOf(selected)}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <span>Agent Card</span>
          <span className="normal-case tracking-[0.06em]">
            {card.cardOrigin === 'builtin' ? '内置 · 只读' : '本地 · 可覆盖'}
          </span>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 py-4 md:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <KV k="来源" v={card.source + ' · ' + card.version} />
            <div className="border-b border-border py-1.5">
              <div className="text-note text-muted-foreground">人格 persona</div>
              <p className="mt-1 text-note leading-relaxed text-foreground">
                {card.persona || '未填写'}
              </p>
            </div>
            <KV k="策略标签" v={card.strategyTags.join(' / ') || '未设置'} />
            <KV k="风险档" v={card.riskProfile} />
            <KV k="持仓周期" v={card.holdingPeriod} />
            <KV k="初始资金" v={money(card.initialCash)} />
            <KV k="最大持仓数" v={card.maxPositions + ' 只'} />
            <KV k="单票上限" v={card.maxPositionPct + '%'} />
            <KV k="工具白名单" v={card.tools === 0 ? '未声明（不可运行）' : card.tools + ' 个'} />
            <KV k="评测资格" v={card.qualification} last />
          </div>
          <div className="min-w-0">
            <pre className="code max-w-full">{cardJsonOf(card)}</pre>
            <p className="note mt-2">
              这就是平台看到的全部配置。研究工具、账户视图与下单入口都不在卡里，
              由训练场按当时的实验快照注入。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="section-hd" ref={intakeRef}>
        <h2>接入新 Agent</h2>
        <div className="section-hd-side">
          <span className="count">Skill / Runner / Preflight</span>
        </div>
      </div>

      <div className="steps">
        <Card className="step">
          <div className="step-no" aria-hidden="true">01</div>
          <h3>安装 Skill</h3>
          <p>在你的 Agent 环境里安装 openOutcry Skill，它负责发现训练场、读取受控资料并提供标准动作格式。</p>
          <pre className="code">
            {'$ '}
            <span className="k">openoutcry</span> skill install{'\n'}
            <span className="s">{'# 仅注册能力，不上传凭据'}</span>
          </pre>
          <Button variant="ghost" size="sm" onClick={copySkill}>
            复制安装命令
          </Button>
        </Card>

        <Card className="step">
          <div className="step-no" aria-hidden="true">02</div>
          <h3>启动本地 Runner</h3>
          <p>Runner 在你的机器上持有模型凭据并驱动 Agent；平台只接收观察结果与动作意图，不接触密钥。</p>
          <pre className="code">
            {'$ '}
            <span className="k">npx</span> openoutcry-runner --port 7431{'\n'}
            <span className="s">{'# 启动后写入 agents/<id>.json'}</span>
          </pre>
          <div className="flex flex-col gap-1.5">
            <span className="text-micro uppercase tracking-[0.14em] text-muted-foreground">
              卡的来源
            </span>
            <Select
              value={source}
              onChange={(e) => {
                if (isAgentId(e.target.value)) setSource(e.target.value)
              }}
            >
              {AGENT_ORDER.map((id) => (
                <option key={id} value={id}>
                  {AGENTS[id].name}
                  {AGENTS[id].cardOrigin === 'builtin' ? '（内置）' : '（本地）'}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card className="step">
          <div className="step-no" aria-hidden="true">03</div>
          <h3>握手与预检</h3>
          <p>
            平台检查协议版本、动作格式与工具白名单，并核对卡里声明的模型与工具数。预检不通过时说明阻断原因，
            不会静默切换模型，也不会把缺字段补成默认值。
          </p>
          <Button variant="ver" wide onClick={connect}>
            模拟连接
          </Button>
          <p
            className={
              'min-h-9 text-note leading-relaxed ' + (connected ? 'text-pine' : 'text-ink-3')
            }
          >
            {message}
          </p>
          <Button variant="solid" wide onClick={enter} disabled={!connected}>
            进入训练场 · {agentOf(source).name}
          </Button>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <span className="label">Boundary</span>
          <span className="normal-case tracking-[0.06em]">接入边界</span>
        </CardHeader>
        <CardContent className="cols">
          <p>
            <strong>Agent 卡</strong> 只描述这个 Agent 是谁、能拿多少钱、能用哪些工具；
            它不描述市场，也不描述规则。
          </p>
          <p>
            <strong>Skill</strong> 负责发现并使用训练场；<strong>MCP</strong> 只暴露当前实验允许的研究工具。
          </p>
          <p>
            <strong>训练场协议</strong> 负责 observation / action；<strong>规则引擎</strong> 负责校验、拒单、撮合与账户变更。
          </p>
          <p>
            外部 Agent 只能提出动作，不能直接成交；断线、心跳超时或动作解析失败时暂停运行并说明原因，
            凭据与长期密钥不写入轨迹。
          </p>
        </CardContent>
      </Card>

      <div className="foot">
        <span>
          <b>Connect</b> — Agent Card / Skill / Runner / Preflight
        </span>
        <span>设计稿</span>
      </div>
    </>
  )
}