import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Check, Copy, ShieldCheck, Terminal } from 'lucide-react'

import { AGENT_ORDER, AGENTS, isAgentId } from '../../data/agents'
import { formatAgent } from '../../i18n/helpers'
import { useDialog } from '../../store/DialogProvider'
import { useToast } from '../../store/ToastProvider'
import { useTraining } from '../../store/TrainingProvider'
import type { AgentId, TranslationKey } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { cn } from '../../lib/utils'

const PROBE_STEPS: ReadonlyArray<{ id: string; labelKey: TranslationKey }> = [
  { id: 'spawn', labelKey: 'onboard.steps.spawn' },
  { id: 'init', labelKey: 'onboard.steps.init' },
  { id: 'session', labelKey: 'onboard.steps.session' },
  { id: 'ping', labelKey: 'onboard.steps.ping' },
]

export function OnboardAgentDialog({ open }: { open: boolean }) {
  const { close } = useDialog()
  const { notifyKey } = useToast()
  const { setDraftAgent } = useTraining()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [tab, setTab] = useState<'prompt' | 'cli'>('prompt')
  const [source, setSource] = useState<AgentId>('codex')
  const [connected, setConnected] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleClose = () => {
    setConnected(false)
    setCopied(false)
    close()
  }

  const promptSnippet = t('onboard.promptSnippet')
  const cliSnippet = `npx @openoutcry/runner start --agent ${source} --acp-port 7420 --sandbox pit-strict`
  const snippet = tab === 'prompt' ? promptSnippet : cliSnippet

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      notifyKey('toasts.copiedClipboard', 'success')
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      notifyKey('toasts.clipboardUnavailable', 'warn')
    }
  }

  const runHandshake = () => {
    setConnected(true)
    notifyKey('toasts.preflightSimulated', 'success')
  }

  const proceedToDesk = () => {
    setDraftAgent(source)
    close()
    navigate('/studio')
  }

  return (
    <Modal
      open={open}
      kicker={t('onboard.kicker')}
      title={t('onboard.title')}
      onClose={handleClose}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={handleClose}>
            {t('onboard.btnClose')}
          </Button>
          {connected ? (
            <Button size="sm" variant="solid" onClick={proceedToDesk}>
              {t('onboard.btnGoToDesk')}
            </Button>
          ) : (
            <Button size="sm" variant="solid" onClick={runHandshake}>
              {t('onboard.btnSimulate')}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--bg-2)] px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-note text-[var(--fg-1)]">
            <ShieldCheck size={16} aria-hidden className="text-[var(--lime)]" />
            {t('onboard.keySafetyNote')}
          </span>
          <Badge variant="outline">{t('onboard.localRunnerBadge')}</Badge>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-micro font-semibold text-[var(--fg-1)]">
              {t('onboard.step1Title')}
            </span>
            <div className="flex items-center gap-1 rounded-md bg-[var(--bg-2)] p-0.5">
              <button
                type="button"
                onClick={() => setTab('prompt')}
                className={cn(
                  'rounded px-2.5 py-1 font-mono text-micro transition-colors',
                  tab === 'prompt' ? 'bg-[var(--lime-soft)] font-semibold text-[var(--fg-0)]' : 'text-[var(--fg-2)]',
                )}
              >
                {t('onboard.tabPrompt')}
              </button>
              <button
                type="button"
                onClick={() => setTab('cli')}
                className={cn(
                  'rounded px-2.5 py-1 font-mono text-micro transition-colors',
                  tab === 'cli' ? 'bg-[var(--lime-soft)] font-semibold text-[var(--fg-0)]' : 'text-[var(--fg-2)]',
                )}
              >
                {t('onboard.tabCli')}
              </button>
            </div>
          </div>

          <Select
            aria-label={t('onboard.selectAgentAria')}
            value={source}
            onChange={(e) => {
              const v = e.target.value
              if (isAgentId(v)) setSource(v)
              setConnected(false)
            }}
          >
            {AGENT_ORDER.filter((id) => !AGENTS[id].builtin).map((id) => {
              const meta = formatAgent(id, t)
              return (
                <option key={id} value={id}>
                  {meta.name} ({meta.tag})
                </option>
              )
            })}
          </Select>

          <div className="relative rounded-lg border border-[var(--line)] bg-[var(--well)] p-3">
            <pre className="m-0 overflow-x-auto whitespace-pre-wrap font-mono text-micro leading-relaxed text-[var(--fg-0)]">
              {snippet}
            </pre>
            <div className="mt-2.5 flex items-center justify-between border-t border-[var(--line-soft)] pt-2">
              <span className="flex items-center gap-1.5 font-mono text-micro text-[var(--fg-2)]">
                <Terminal size={13} aria-hidden />
                {tab === 'prompt' ? t('onboard.hintPrompt') : t('onboard.hintCli')}
              </span>
              <Button type="button" size="sm" variant="ghost" onClick={copySnippet}>
                {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                {copied ? t('onboard.btnCopied') : t('onboard.btnCopy')}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-micro font-semibold text-[var(--fg-1)]">
            {t('onboard.step2Title')}
          </span>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {PROBE_STEPS.map((st, idx) => (
              <div
                key={st.id}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-micro',
                  connected
                    ? 'border-[var(--line-lime)] bg-[var(--lime-soft)] text-[var(--fg-0)]'
                    : 'border-[var(--line-soft)] bg-[var(--bg-2)] text-[var(--fg-2)]',
                )}
              >
                <span className={connected ? 'text-[var(--lime)]' : 'text-[var(--fg-2)]'}>
                  {connected ? '✓' : `0${idx + 1}`}
                </span>
                <span className="truncate">{t(st.labelKey)}</span>
              </div>
            ))}
          </div>
          {connected ? (
            <p className="text-note text-[var(--lime)]">{t('onboard.passedNote')}</p>
          ) : (
            <p className="note">{t('onboard.exploratoryNote')}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
