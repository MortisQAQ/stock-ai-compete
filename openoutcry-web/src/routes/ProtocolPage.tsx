import { useState } from 'react'

import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs'
import { Stamp } from '../components/ui/Stamp'
import { PROTOCOL_SAMPLES } from '../data/protocol'
import type { ProtocolKey } from '../data/protocol'

const TABS: Array<{ id: ProtocolKey; label: string }> = [
  { id: 'message', label: '会话消息' },
  { id: 'event', label: '平台事件' },
  { id: 'action', label: '训练动作' },
]

export function ProtocolPage() {
  const [tab, setTab] = useState<ProtocolKey>('message')
  const sample = PROTOCOL_SAMPLES[tab]

  return (
    <>
      <div className="vlabel page-vlabel" aria-hidden="true">
        OPENOUTCRY / PROTOCOL SPEC / 2026
      </div>

      <div className="pagehead">
        <div>
          <div className="label">№ 05 — Protocol &amp; Skill</div>
          <h1>协议与 Skill</h1>
          <p className="deck">会话消息、平台事件与训练动作分开记录。以下均为语义示例，不是已上线接口。</p>
        </div>
        <Stamp tone="slate">语义示例</Stamp>
      </div>

      {/* 本页主区块 */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line-soft)] pl-1 pr-4">
          <Tabs value={tab} onValueChange={(value) => setTab(value as ProtocolKey)}>
            <TabsList className="w-auto border-b-0">
              {TABS.map((item) => (
                <TabsTrigger key={item.id} value={item.id}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Badge variant="outline" className="hidden sm:inline-flex">
            {sample.type}
          </Badge>
        </div>
        <pre className="code code-block">{JSON.stringify(sample.payload, null, 2)}</pre>
      </Card>

      <div className="steps mt-4">
        <Card className="step" key="obs">
          <div className="label">01 — Observation</div>
          <h3>环境只给观察</h3>
          <p>模拟时钟、账户、持仓与受控资料。所有资料带截止时间与证据编号，晚于截止时间的资料物理不可见。</p>
        </Card>
        <Card className="step" key="act">
          <div className="label">02 — Action</div>
          <h3>动作必须结构化</h3>
          <p>Agent 只能提交标准动作：下单、止损、请求资料。解析失败即暂停，不做猜测式补全。</p>
        </Card>
        <Card className="step" key="evt">
          <div className="label">03 — Event</div>
          <h3>事件不可改写</h3>
          <p>每一次提案、审批、拒单与撮合都追加为事件，带序号与时间戳，可离线回放。</p>
        </Card>
      </div>

      <div className="foot">
        <span>
          <b>Protocol</b> — observation / action / event
        </span>
        <span>v0.1 语义草案</span>
      </div>
    </>
  )
}
