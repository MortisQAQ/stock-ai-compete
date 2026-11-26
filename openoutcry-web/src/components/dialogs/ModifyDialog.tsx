import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatProposal } from '../../i18n/helpers'
import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'

export function ModifyDialog({ open }: { open: boolean }) {
  const { state, actions } = useRun()
  const { close } = useDialog()
  const { t } = useTranslation()
  const isLive = state.kind === 'live'
  const rawAsset = state.proposal.asset ?? '公司-017'
  const rawSide = state.proposal.side ?? '卖出'
  const proposalView = formatProposal(state.proposal, t)
  const matchedHolding = state.holdings.find((h) => h.name === rawAsset)
  const maxQty =
    rawSide === '卖出'
      ? Math.max(100, matchedHolding?.sellable || matchedHolding?.quantity || state.proposal.original || 600)
      : Math.max(1000, state.proposal.original * 3)

  const [qty, setQty] = useState(state.proposal.quantity)
  const [execPrice, setExecPrice] = useState(String(state.proposal.price))
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react/set-state-in-effect
      setQty(state.proposal.quantity)
      // eslint-disable-next-line react/set-state-in-effect
      setExecPrice(String(state.proposal.price))
      // eslint-disable-next-line react/set-state-in-effect
      setError('')
    }
  }, [open, state.proposal.quantity, state.proposal.price])

  const submit = () => {
    if (!(qty >= 100 && qty <= maxQty && qty % 100 === 0)) {
      setError(t('dialogs.modify.errQty', { maxQty }))
      return
    }
    if (isLive) {
      const parsedPrice = Number(execPrice)
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        setError(t('dialogs.modify.errPrice'))
        return
      }
      actions.recordLiveFill(qty, parsedPrice, '按实际修改记录')
      close()
      return
    }
    actions.approve(qty, '人工修改后批准')
    close()
  }

  return (
    <Modal
      open={open}
      kicker={isLive ? t('dialogs.modify.kickerLive') : t('dialogs.modify.kickerSim')}
      title={
        isLive
          ? t('dialogs.modify.titleLive', { side: proposalView.side, asset: proposalView.asset })
          : t('dialogs.modify.titleSim', { side: proposalView.side })
      }
      onClose={close}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={close}>
            {t('dialogs.cancel')}
          </Button>
          <Button size="sm" variant="ver" onClick={submit}>
            {isLive ? t('dialogs.modify.btnLive') : t('dialogs.modify.btnSim')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="modify-qty">
            {isLive ? t('dialogs.modify.labelQtyLive') : t('dialogs.modify.labelQtySim')}
          </Label>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setQty((q) => Math.max(100, q - 100))}>
              −100
            </Button>
            <Input
              id="modify-qty"
              className="text-center font-mono tabular-nums"
              type="number"
              min={100}
              max={maxQty}
              step={100}
              value={qty}
              data-autofocus
              onChange={(e) => setQty(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <Button size="sm" variant="ghost" onClick={() => setQty((q) => Math.min(maxQty, q + 100))}>
              +100
            </Button>
          </div>
        </div>

        {isLive ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="modify-price">{t('dialogs.modify.labelPriceLive')}</Label>
            <Input
              id="modify-price"
              className="font-mono tabular-nums"
              type="number"
              min={0.01}
              step={0.01}
              value={execPrice}
              onChange={(e) => setExecPrice(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      <p className="error-text">{error}</p>
      <div className="note">
        {isLive
          ? t('dialogs.modify.noteLive', {
              original: state.proposal.original,
              price: state.proposal.price.toFixed(2),
            })
          : t('dialogs.modify.noteSim', { original: state.proposal.original })}
      </div>
    </Modal>
  )
}
