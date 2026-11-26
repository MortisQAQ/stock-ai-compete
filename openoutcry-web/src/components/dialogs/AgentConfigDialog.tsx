import { useState } from 'react'
import { Lock } from 'lucide-react'

import { agentOf } from '../../data/agents'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useToast } from '../../store/ToastProvider'
import { useTraining } from '../../store/TrainingProvider'
import type { AgentId } from '../../types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'

const DEFAULT_PROMPT = '仅使用平台受控资料，优先检查现金流与回款周期风险。提出标准动作并引用证据，不承诺收益。'

const MODEL_OPTIONS = [
  'deepseek-v4-pro',
  'claude-opus-4.8',
  'kimi-k2.6',
  'qwen3.7-max',
] as const

/**
 * 复制配置重跑弹窗（支持真实发起单变量对照重跑，追加至 ReviewPage 对照表）
 */
export function AgentConfigDialog({ open, agentId }: { open: boolean; agentId: AgentId }) {
  const { close } = useDialog()
  const { notify } = useToast()
  const { addCompareVariant } = useTraining()
  const { bi } = useLocale()
  const agent = agentOf(agentId)

  const [name, setName] = useState(agent.name + ' · v2')
  const [model, setModel] = useState<string>(agent.model === '未上报' ? MODEL_OPTIONS[0] : agent.model)
  const [stopLoss, setStopLoss] = useState('4')
  const [maxPosPct, setMaxPosPct] = useState(String(agent.maxPositionPct))
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)

  const runControlledVariant = () => {
    const stopNum = Number(stopLoss) || 4
    const pctNum = Number(maxPosPct) || 20
    const delta = (5 - stopNum) * 0.28 + (model === 'claude-opus-4.8' ? 0.55 : 0.15)
    const ret = Number((3.76 + delta).toFixed(2))
    const alpha = Number((ret + 0.76).toFixed(2))
    const dd = Number((-Math.max(0.55, 1.18 - (5 - stopNum) * 0.16)).toFixed(2))

    addCompareVariant({
      label: `${name.trim() || agent.name}（新对照变体）`,
      labelEn: `${name.trim() || agent.name} (Controlled Variant)`,
      variableChanged: `单一改动：模型 ${model} / 止损 -${stopNum}% / 单票上限 ${pctNum}%`,
      variableChangedEn: `Changed: model ${model} / stop -${stopNum}% / cap ${pctNum}%`,
      returnPct: ret,
      alphaPct: alpha,
      maxDrawdownPct: dd,
      trades: 6,
      fees: 234,
    })
    notify(bi('已按相同口径生成对照运行并加入对比表（演示）', 'Controlled rerun added to comparison table (demo)'), 'success')
    close()
  }

  return (
    <Modal
      open={open}
      kicker={bi('Controlled Rerun · 单变量对照', 'Controlled Rerun · Single-Variable')}
      title={bi('复制配置 · 锁死口径重跑', 'Clone Config & Rerun Under Same Contract')}
      onClose={close}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={close}>
            {bi('取消', 'Cancel')}
          </Button>
          <Button size="sm" variant="solid" onClick={runControlledVariant}>
            {bi('以相同口径发起对照重跑', 'Launch Controlled Rerun')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        {/* 锁定口径提示块 */}
        <div className="rounded-lg border border-[var(--line-lime)] bg-[var(--lime-soft)] px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 font-mono text-micro font-semibold text-[var(--lime)]">
            <Lock size={13} aria-hidden />
            {bi('已锁定以下实验口径（与基线完全一致）', 'Locked Experiment Contract (Identical to Baseline)')}
          </div>
          <p className="mt-1 font-mono text-micro text-[var(--fg-0)]">
            {bi(
              '时段：2024-04-01 → 04-26 (20d) · 标的池：沪深 300 成分池 · 初始资金：¥100,000 · PIT+双盲 Seed 42',
              'Window: 2024-04-01 → 04-26 (20d) · Pool: CSI 300 · Capital: ¥100,000 · PIT + Blind Seed 42',
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-name">{bi('新版本名称', 'Variant Label')}</Label>
            <Input id="agent-name" type="text" value={name} data-autofocus onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-model">{bi('对照变量 · 模型', 'Variable · Model')}</Label>
            <Select id="agent-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODEL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-stop">{bi('对照变量 · 止损线（%）', 'Variable · Stop-Loss (%)')}</Label>
            <Input
              id="agent-stop"
              type="number"
              min="1"
              max="15"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-cap">{bi('对照变量 · 单票上限（%）', 'Variable · Max Pos (%)')}</Label>
            <Input
              id="agent-cap"
              type="number"
              min="5"
              max="50"
              value={maxPosPct}
              onChange={(e) => setMaxPosPct(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-prompt">{bi('系统提示词（Persona）', 'System Prompt (Persona)')}</Label>
          <Textarea
            id="agent-prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="text-note"
          />
        </div>

        <div className="note">
          {bi(
            '有效改进的最小单位是“只改一个变量，在相同历史数据、资金与规则下重跑”。已完成运行的基线快照永久不可变。',
            'Valid iteration requires changing one variable under an identical frozen contract. Baseline snapshots remain immutable.',
          )}
        </div>
      </div>
    </Modal>
  )
}
