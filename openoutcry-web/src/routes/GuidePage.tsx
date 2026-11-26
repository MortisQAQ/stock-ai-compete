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
          <div className="label">Reference — Product Brief</div>
          <h1>训战一体，先练后用。</h1>
          <p className="deck">
            openOutcry 产品说明：完整覆盖从 Agent 接入、历史训练考场、同口径对照复盘到实战镜像工作台的五步闭环与工程边界。
          </p>
        </div>
        <Stamp tone="lime">v2.0 · Brief</Stamp>
      </div>

      {/* 三步流程共用同一档底色 */}
      <div className="steps frame mt-0">
        <Card className="step">
          <div className="step-no" aria-hidden="true">01</div>
          <h3>接入并验证 Agent</h3>
          <p>用 Agent 卡与 ACP + MCP 接入外部或内置 Agent，在历史训练场锁定窗口、标的池与规则，把提案审批与证据追溯跑通。</p>
        </Card>
        <Card className="step">
          <div className="step-no" aria-hidden="true">02</div>
          <h3>带进实战工作台</h3>
          <p>
            复用同一套会话与镜像台账界面。Agent 围绕当前持仓与实时行情输出调仓建议单，由你自主在券商端决策并回填记录。
          </p>
        </Card>
        <Card className="step">
          <div className="step-no" aria-hidden="true">03</div>
          <h3>复盘对比并回炉</h3>
          <p>对照模拟净值或 AI 原始建议与实际执行偏差，复制配置、只改一个变量重回历史训练场验证迭代。</p>
        </Card>
      </div>

      <article className="mdx-doc mt-10 border-t border-[var(--line-lime-soft)] pt-8">
        <MvpDoc />
      </article>

      <div className="foot">
        <span>
          <b>openOutcry</b> — 训战一体投资 Agent 工作台
        </span>
        <span>MDX Spec · 训战一体修订版</span>
      </div>
    </>
  )
}
