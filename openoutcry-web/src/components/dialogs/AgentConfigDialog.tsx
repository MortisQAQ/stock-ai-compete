import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'

import { agentOf } from '../../data/agents'
import { formatAgent } from '../../i18n/helpers'
import { useDialog } from '../../store/DialogProvider'
import { useToast } from '../../store/ToastProvider'
import { useTraining } from '../../store/TrainingProvider'
import type { AgentId } from '../../types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'

const MODEL_OPTIONS = [
  'deepseek-v4-pro',
  'claude-opus-4.8',
  'kimi-k2.6',
  'qwen3.7-max',
] as const

export function AgentConfigDialog({ open, agentId }: { open: boolean; agentId: AgentId }) {
  const { i18n } = useTranslation()
  return (
    <AgentConfigDialogInner
      key={`${open}:${agentId}:${i18n.language}`}
      open={open}
      agentId={agentId}
    />
  )
}

function AgentConfigDialogInner({ open, agentId }: { open: boolean; agentId: AgentId }) {
  const { close } = useDialog()
  const { notifyKey } = useToast()
  const { addCompareVariant } = useTraining()
  const { t } = useTranslation()
  const rawAgent = agentOf(agentId)
  const agent = formatAgent(agentId, t)

  const [name, setName] = useState(agent.name + ' · v2')
  const [model, setModel] = useState<string>(rawAgent.model === '未上报' ? MODEL_OPTIONS[0] : rawAgent.model)
  const [stopLoss, setStopLoss] = useState('4')
  const [maxPosPct, setMaxPosPct] = useState(String(rawAgent.maxPositionPct))
  const [prompt, setPrompt] = useState(() => t('dialogs.agentConfig.defaultPrompt'))

  const runControlledVariant = () => {
    const stopNum = Number(stopLoss) || 4
    const pctNum = Number(maxPosPct) || 20
    const delta = (5 - stopNum) * 0.28 + (model === 'claude-opus-4.8' ? 0.55 : 0.15)
    const ret = Number((3.76 + delta).toFixed(2))
    const alpha = Number((ret + 0.76).toFixed(2))
    const dd = Number((-Math.max(0.55, 1.18 - (5 - stopNum) * 0.16)).toFixed(2))
    const variantName = name.trim() || agent.name

    addCompareVariant({
      label: `${variantName}（新对照变体）`,
      labelKey: 'compare.customVariantLabel',
      labelParams: { name: variantName },
      variableChanged: `单一改动：模型 ${model} / 止损 -${stopNum}% / 单票上限 ${pctNum}%`,
      variableChangedKey: 'compare.customVariantVariable',
      variableChangedParams: { model, stop: stopNum, cap: pctNum },
      returnPct: ret,
      alphaPct: alpha,
      maxDrawdownPct: dd,
      trades: 6,
      fees: 234,
    })
    notifyKey('toasts.controlledRerunAdded', 'success')
    close()
  }

  return (
    <Modal
      open={open}
      kicker={t('dialogs.agentConfig.kicker')}
      title={t('dialogs.agentConfig.title')}
      onClose={close}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={close}>
            {t('dialogs.cancel')}
          </Button>
          <Button size="sm" variant="solid" onClick={runControlledVariant}>
            {t('dialogs.agentConfig.btnLaunch')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="rounded-lg border border-[var(--line-lime)] bg-[var(--lime-soft)] px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 font-mono text-micro font-semibold text-[var(--lime)]">
            <Lock size={13} aria-hidden />
            {t('dialogs.agentConfig.lockedTitle')}
          </div>
          <p className="mt-1 font-mono text-micro text-[var(--fg-0)]">
            {t('dialogs.agentConfig.lockedSpec')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-name">{t('dialogs.agentConfig.variantLabel')}</Label>
            <Input id="agent-name" type="text" value={name} data-autofocus onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-model">{t('dialogs.agentConfig.varModel')}</Label>
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
            <Label htmlFor="agent-stop">{t('dialogs.agentConfig.varStopLoss')}</Label>
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
            <Label htmlFor="agent-cap">{t('dialogs.agentConfig.varMaxPos')}</Label>
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
          <Label htmlFor="agent-prompt">{t('dialogs.agentConfig.systemPrompt')}</Label>
          <Textarea
            id="agent-prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="text-note"
          />
        </div>

        <div className="note">{t('dialogs.agentConfig.note')}</div>
      </div>
    </Modal>
  )
}
