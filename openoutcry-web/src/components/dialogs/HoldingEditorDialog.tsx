import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatAsset } from '../../i18n/helpers'
import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'

export function HoldingEditorDialog({
  open,
  targetName,
}: {
  open: boolean
  targetName?: string
}) {
  const { state, actions } = useRun()
  const { close } = useDialog()
  const { t } = useTranslation()
  const existing = targetName ? state.holdings.find((h) => h.name === targetName) : undefined

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('100')
  const [sellable, setSellable] = useState('100')
  const [cost, setCost] = useState('10.00')
  const [price, setPrice] = useState('10.00')
  const [cash, setCash] = useState(String(state.cash))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (existing) {
      // eslint-disable-next-line react/set-state-in-effect
      setName(existing.name)
      // eslint-disable-next-line react/set-state-in-effect
      setQuantity(String(existing.quantity))
      // eslint-disable-next-line react/set-state-in-effect
      setSellable(String(existing.sellable))
      // eslint-disable-next-line react/set-state-in-effect
      setCost(String(existing.cost))
      // eslint-disable-next-line react/set-state-in-effect
      setPrice(String(existing.price))
    } else {
      // eslint-disable-next-line react/set-state-in-effect
      setName('')
      // eslint-disable-next-line react/set-state-in-effect
      setQuantity('100')
      // eslint-disable-next-line react/set-state-in-effect
      setSellable('100')
      // eslint-disable-next-line react/set-state-in-effect
      setCost('10.00')
      // eslint-disable-next-line react/set-state-in-effect
      setPrice('10.00')
    }
    // eslint-disable-next-line react/set-state-in-effect
    setCash(String(state.cash))
    // eslint-disable-next-line react/set-state-in-effect
    setError('')
  }, [open, existing, state.cash])

  const submit = () => {
    const trimmed = name.trim()
    const nextCash = Number(cash)
    if (!Number.isFinite(nextCash) || nextCash < 0) {
      setError(t('dialogs.holdingEditor.errCash'))
      return
    }

    const cashChanged = Math.abs(nextCash - state.cash) >= 0.01

    if (!trimmed && !existing) {
      if (!cashChanged) {
        setError(t('dialogs.holdingEditor.errNameOrCash'))
        return
      }
      actions.setCash(nextCash)
      close()
      return
    }

    const q = Math.round(Number(quantity))
    const s = Math.round(Number(sellable))
    const c = Number(cost)
    const p = Number(price)

    if (!(q > 0 && q % 100 === 0)) {
      setError(t('dialogs.holdingEditor.errQty'))
      return
    }
    if (s < 0 || s > q) {
      setError(t('dialogs.holdingEditor.errSellable'))
      return
    }
    if (!Number.isFinite(c) || c <= 0 || !Number.isFinite(p) || p <= 0) {
      setError(t('dialogs.holdingEditor.errPrice'))
      return
    }

    actions.upsertHolding({ name: trimmed, quantity: q, sellable: s, cost: c, price: p })
    if (cashChanged) actions.setCash(nextCash)
    close()
  }

  return (
    <Modal
      open={open}
      kicker={t('dialogs.holdingEditor.kicker')}
      title={
        existing
          ? t('dialogs.holdingEditor.titleEdit', { name: formatAsset(existing.name, t) })
          : t('dialogs.holdingEditor.titleAdd')
      }
      onClose={close}
      footer={
        <>
          {existing ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                actions.removeHolding(existing.name)
                close()
              }}
            >
              {t('dialogs.holdingEditor.btnRemove')}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={close}>
            {t('dialogs.cancel')}
          </Button>
          <Button size="sm" variant="solid" onClick={submit}>
            {t('dialogs.holdingEditor.btnSave')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="holding-name">{t('dialogs.holdingEditor.labelName')}</Label>
          <Input
            id="holding-name"
            type="text"
            placeholder={t('dialogs.holdingEditor.placeholderName')}
            value={existing ? formatAsset(existing.name, t) : name}
            disabled={Boolean(existing)}
            data-autofocus={!existing ? true : undefined}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="holding-qty">{t('dialogs.holdingEditor.labelQty')}</Label>
            <Input
              id="holding-qty"
              className="font-mono tabular-nums"
              type="number"
              min={100}
              step={100}
              value={quantity}
              data-autofocus={existing ? true : undefined}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="holding-sellable">{t('dialogs.holdingEditor.labelSellable')}</Label>
            <Input
              id="holding-sellable"
              className="font-mono tabular-nums"
              type="number"
              min={0}
              step={100}
              value={sellable}
              onChange={(e) => setSellable(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="holding-cost">{t('dialogs.holdingEditor.labelCost')}</Label>
            <Input
              id="holding-cost"
              className="font-mono tabular-nums"
              type="number"
              min={0.01}
              step={0.01}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="holding-price">{t('dialogs.holdingEditor.labelPrice')}</Label>
            <Input
              id="holding-price"
              className="font-mono tabular-nums"
              type="number"
              min={0.01}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-[var(--line-soft)] pt-3">
          <Label htmlFor="holding-cash">{t('dialogs.holdingEditor.labelCash')}</Label>
          <Input
            id="holding-cash"
            className="font-mono tabular-nums"
            type="number"
            min={0}
            step={100}
            value={cash}
            onChange={(e) => setCash(e.target.value)}
          />
        </div>

        <p className="error-text">{error}</p>

        <div className="note">{t('dialogs.holdingEditor.note')}</div>
      </div>
    </Modal>
  )
}
