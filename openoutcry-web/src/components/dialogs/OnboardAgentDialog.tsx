import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Copy, ShieldCheck, Terminal } from 'lucide-react'

import { AGENT_ORDER, AGENTS, isAgentId } from '../../data/agents'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useToast } from '../../store/ToastProvider'
import { useTraining } from '../../store/TrainingProvider'
import type { AgentId } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { cn } from '../../lib/utils'

const PROBE_STEPS = [
  { id: 'spawn', zh: 'spawn 本地进程', en: 'spawn local process' },
  { id: 'init', zh: 'initialize ACP 协议握手', en: 'initialize ACP handshake' },
  { id: 'session', zh: 'session/new 创建受控会话', en: 'session/new sandboxed session' },
  { id: 'ping', zh: 'ping MCP 工具白名单校验', en: 'ping MCP tool whitelist' },
] as const

export function OnboardAgentDialog({ open }: { open: boolean }) {
  const { close } = useDialog()
  const { notify } = useToast()
  const { setDraftAgent } = useTraining()
  const { isEn, bi } = useLocale()
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

  const promptSnippet = isEn
    ? `Connect to my local openOutcry Runner (ws://127.0.0.1:7420/acp).\nRules: read market/evidence ONLY via openOutcry MCP tools; never access live broker APIs; submit orders strictly via trade.submit_order JSON schema.`
    : `连接到我本机的 openOutcry Runner（ws://127.0.0.1:7420/acp）。\n规则：仅通过 openOutcry MCP 受控工具读取行情与证据；禁止直接触碰券商接口；所有下单意图必须通过 trade.submit_order 结构化提交。`

  const cliSnippet = `npx @openoutcry/runner start --agent ${source} --acp-port 7420 --sandbox pit-strict`
  const snippet = tab === 'prompt' ? promptSnippet : cliSnippet

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      notify(bi('已复制到剪贴板', 'Copied to clipboard'), 'success')
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      notify(bi('剪贴板不可用，请手动复制', 'Clipboard unavailable, copy manually'), 'warn')
    }
  }

  const runHandshake = () => {
    setConnected(true)
    notify(bi('模拟预检完成（未启动真实本地进程）', 'Simulated preflight passed (no local process spawned)'), 'success')
  }

  const proceedToDesk = () => {
    setDraftAgent(source)
    close()
    navigate('/studio')
  }

  return (
    <Modal
      open={open}
      kicker={bi('Agent Onboarding · ACP + MCP', 'Agent Onboarding · ACP + MCP')}
      title={bi('接入新外部 Agent', 'Connect External Agent')}
      onClose={handleClose}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={handleClose}>
            {bi('关闭', 'Close')}
          </Button>
          {connected ? (
            <Button size="sm" variant="solid" onClick={proceedToDesk}>
              {bi('前往训练委托 →', 'Go to Training Desk →')}
            </Button>
          ) : (
            <Button size="sm" variant="solid" onClick={runHandshake}>
              {bi('模拟握手与预检', 'Simulate Handshake & Preflight')}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--bg-2)] px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-note text-[var(--fg-1)]">
            <ShieldCheck size={16} aria-hidden className="text-[var(--lime)]" />
            {bi('模型 API Key 与凭据全程留在你的本机，平台不碰密钥。', 'Model API keys stay strictly on your local machine.')}
          </span>
          <Badge variant="outline">{bi('本地 Runner', 'Local Runner')}</Badge>
        </div>

        {/* Step 1: Select local agent & copy Prompt/CLI */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-micro font-semibold text-[var(--fg-1)]">
              {bi('01 · 选择目标 Agent 与接入方式', '01 · Pick Target Agent & Install Method')}
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
                {bi('Agent Prompt', 'Agent Prompt')}
              </button>
              <button
                type="button"
                onClick={() => setTab('cli')}
                className={cn(
                  'rounded px-2.5 py-1 font-mono text-micro transition-colors',
                  tab === 'cli' ? 'bg-[var(--lime-soft)] font-semibold text-[var(--fg-0)]' : 'text-[var(--fg-2)]',
                )}
              >
                {bi('CLI 命令', 'CLI Command')}
              </button>
            </div>
          </div>

          <Select
            aria-label={bi('选择外部 Agent', 'Select External Agent')}
            value={source}
            onChange={(e) => {
              const v = e.target.value
              if (isAgentId(v)) setSource(v)
              setConnected(false)
            }}
          >
            {AGENT_ORDER.filter((id) => !AGENTS[id].builtin).map((id) => (
              <option key={id} value={id}>
                {AGENTS[id].name} ({AGENTS[id].tag})
              </option>
            ))}
          </Select>

          <div className="relative rounded-lg border border-[var(--line)] bg-[var(--well)] p-3">
            <pre className="m-0 overflow-x-auto whitespace-pre-wrap font-mono text-micro leading-relaxed text-[var(--fg-0)]">
              {snippet}
            </pre>
            <div className="mt-2.5 flex items-center justify-between border-t border-[var(--line-soft)] pt-2">
              <span className="flex items-center gap-1.5 font-mono text-micro text-[var(--fg-2)]">
                <Terminal size={13} aria-hidden />
                {tab === 'prompt'
                  ? bi('粘贴到 Claude Code / Codex / Cursor 即可接入', 'Paste into Claude Code / Codex / Cursor')
                  : bi('在本机终端启动受控 ACP 适配器', 'Run local sandboxed ACP adapter')}
              </span>
              <Button type="button" size="sm" variant="ghost" onClick={copySnippet}>
                {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                {copied ? bi('已复制', 'Copied') : bi('复制', 'Copy')}
              </Button>
            </div>
          </div>
        </div>

        {/* Step 2: Handshake & Preflight status */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-micro font-semibold text-[var(--fg-1)]">
            {bi('02 · 四步握手与评测资格预检', '02 · 4-Step Handshake & Preflight')}
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
                <span className="truncate">{isEn ? st.en : st.zh}</span>
              </div>
            ))}
          </div>
          {connected ? (
            <p className="text-note text-[var(--lime)]">
              {bi(
                '演示预检通过：未启动真实本地进程；因未验证环境隔离，该外部 Agent 将标记为「探索组」，现可直接前往训练委托台编排实验。',
                'Demo preflight passed (no real process launched). Marked as Exploratory until sandbox isolation is verified; ready to configure a mandate.',
              )}
            </p>
          ) : (
            <p className="note">
              {bi(
                '未上报模型标识或未验证网络隔离的外部 Agent 一律归入探索组，不混入严格评测排名。',
                'External agents with unreported models or unverified isolation are placed in the Exploratory group.',
              )}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
