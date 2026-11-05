import { useState } from 'react'
import type { FormEvent } from 'react'
import { USDT, WHOLE_NUMBER, formatUsdt } from '../receivables.ts'
import type { Receivable } from '../receivables.ts'

type Props = {
  receivable: Receivable
  wallet: string
  heldUnits: number
  onBuy: (units: number) => void
}

function BuyForm({ receivable, wallet, heldUnits, onBuy }: Props) {
  const [units, setUnits] = useState('')
  const [error, setError] = useState('')

  const unitsLeft = receivable.faceValue - receivable.unitsSold
  const capLeft = receivable.maxUnitsPerInvestor - heldUnits
  const wanted = WHOLE_NUMBER.test(units) ? Number(units) : null

  function problem() {
    if (wallet.toLowerCase() === receivable.buyer.toLowerCase()) {
      return "The buyer can't invest in their own receivable."
    }
    if (wanted === null) return 'Enter a whole number of units.'
    if (wanted > unitsLeft) return `Only ${unitsLeft} units are left.`
    if (capLeft === 0) {
      return `This wallet has reached the cap of ${receivable.maxUnitsPerInvestor} units.`
    }
    if (wanted > capLeft) {
      return `This wallet can buy ${capLeft} more units (cap ${receivable.maxUnitsPerInvestor}).`
    }
    return null
  }

  function buy(event: FormEvent) {
    event.preventDefault()
    const reason = problem()
    if (reason || wanted === null) {
      setError(reason ?? '')
      return
    }
    onBuy(wanted)
    setUnits('')
    setError('')
  }

  return (
    <form className="inline-form buy-form" onSubmit={buy} noValidate>
      <label className="field">
        Units to buy
        <input
          className="input"
          value={units}
          onChange={(event) => setUnits(event.target.value)}
          inputMode="numeric"
          placeholder="1"
          autoComplete="off"
        />
      </label>
      <button type="submit" className="button">
        Buy
      </button>
      {wanted !== null && (
        <p className="field-wide preview">
          Pay {formatUsdt(wanted * receivable.unitPrice)} USDT · Receive{' '}
          {formatUsdt(wanted * USDT)} USDT after settlement
        </p>
      )}
      {error && (
        <p className="field-wide form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

export default BuyForm
