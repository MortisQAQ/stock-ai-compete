import { Card } from '../components/ui/Card'
import { Stamp } from '../components/ui/Stamp'

export function GuidePage() {
  return (
    <>
      <div className="pagehead">
        <div>
          <div className="label">№ 06 — Product Brief</div>
          <h1>一个入口，完成一次改进。</h1>
          <p className="deck">本文件合并「新建训练」与模拟交易场原型；详细产品规划仍保留在 Markdown 文档中。</p>
        </div>
        <Stamp tone="pine">Prototype</Stamp>
      </div>

      <div className="steps mt-0">
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

      <div className="cols mt-6">
        <h3>为什么不是一个聊天框</h3>
        <p>
          聊天框能把一段分析讲得像模像样，但它无法回答三个问题：这个判断在当时的信息条件下是否成立？订单是否真的按 A
          股规则成交？下一次修改到底改对了哪个变量？所以这里的主界面不是对话框，而是「观察—提案—审批—撮合—复盘」的账本。
        </p>
        <h3>为什么要有审批</h3>
        <p>
          把资金完全交给自主 Agent，在真实场景里没有人敢这么做。平台把「提出意图」和「实际成交」拆成两步，分别留档，于是报告里可以区分自主决策、人工确认和人机混合三种协作程度。
        </p>
        <h3>为什么强调样本门槛</h3>
        <p>
          二十个交易日的收益曲线看起来再漂亮，也不足以支撑排名。平台在样本不足时明确拒绝给出结论，而不是把一条漂亮的曲线当成绩效证明。
        </p>
        <h3>本原型的边界</h3>
        <p>
          所有数字、公司名与事件均为虚构样例，用于演示交互与信息结构。协议、撮合与审计能力以产品文档为准，本文件不代表已实现的服务。
        </p>
      </div>

      <div className="foot">
        <span>
          <b>openOutcry</b> — 交易智能体评测设施
        </span>
        <span>Prototype v2 · 2026-10</span>
      </div>
    </>
  )
}
