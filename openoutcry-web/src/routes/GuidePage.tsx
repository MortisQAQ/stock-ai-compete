import MvpDoc from '../docs/openOutcry-产品设计与功能-MVP.mdx'
import { Card } from '../components/ui/Card'
import { Stamp } from '../components/ui/Stamp'

export function GuidePage() {
  return (
    <>
      <div className="vlabel page-vlabel" aria-hidden="true">
        OPENOUTCRY / PRODUCT SPEC / 2026
      </div>

      <div className="pagehead">
        <div>
          <div className="label">№ 06 — Product Spec (MDX)</div>
          <h1>一个入口，完成一次改进。</h1>
          <p className="deck">
            产品文档现已升级为 MDX 实时交互文档：正文中直接挂载当前工程的前端组件并同步读取源码。
          </p>
        </div>
        <Stamp tone="lime">MDX · Live</Stamp>
      </div>

      {/* 三步流程共用同一档底色 */}
      <div className="steps frame mt-0">
        <Card className="step">
          <div className="step-no" aria-hidden="true">01</div>
          <h3>准备 Agent</h3>
          <p>内置模板或本地接入 → 配置提示词 → 选择训练场模板。Skill 和协议放在辅助入口，不干扰日常操作。</p>
        </Card>
        <Card className="step">
          <div className="step-no" aria-hidden="true">02</div>
          <h3>在训练场里跑</h3>
          <p>
            固定历史时间、股票池、资金与规则。Agent 只能通过受控出口研究，提出的订单先成为提案，再由人批准、修改或拒绝。
          </p>
        </Card>
        <Card className="step">
          <div className="step-no" aria-hidden="true">03</div>
          <h3>复盘并改一个变量</h3>
          <p>看净值与回撤、看逐笔证据，复制配置、只改一个变量重跑，再与旧版本对比。</p>
        </Card>
      </div>

      <article className="mdx-doc mt-10 border-t border-[var(--line-lime-soft)] pt-8">
        <MvpDoc />
      </article>

      <div className="foot">
        <span>
          <b>openOutcry</b> — 交易智能体评测设施
        </span>
        <span>MDX Spec · rev 289</span>
      </div>
    </>
  )
}
