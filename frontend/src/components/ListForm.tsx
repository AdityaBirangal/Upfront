import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  WHOLE_NUMBER,
  formatUsdt,
  parseDiscount,
  unitPriceFor,
} from '../receivables.ts'
import type { Receivable } from '../receivables.ts'
import { useNow } from '../useNow.ts'

type Props = {
  receivable: Receivable
  onList: (discountBps: number, maxUnitsPerInvestor: number) => void
}

function ListForm({ receivable, onList }: Props) {
  const [discount, setDiscount] = useState('')
  const [cap, setCap] = useState('')
  const [error, setError] = useState('')
  const now = useNow()

  const isPastDue = receivable.dueDate * 1000 <= now
  const discountBps = parseDiscount(discount)
  const unitPrice = discountBps === null ? null : unitPriceFor(discountBps)

  function list(event: FormEvent) {
    event.preventDefault()
    if (discountBps === null) {
      setError('Enter a discount above 0% and below 100%, up to 2 decimals.')
      return
    }
    if (!WHOLE_NUMBER.test(cap) || Number(cap) > receivable.faceValue) {
      setError(
        `Enter an investor cap from 1 to ${receivable.faceValue.toLocaleString()} units.`,
      )
      return
    }
    onList(discountBps, Number(cap))
  }

  if (isPastDue) return <p>The due date has passed, so this can't be listed.</p>

  return (
    <form className="inline-form" onSubmit={list} noValidate>
      <label className="field">
        Discount (%)
        <input
          className="input"
          value={discount}
          onChange={(event) => setDiscount(event.target.value)}
          inputMode="decimal"
          placeholder="3"
          autoComplete="off"
        />
      </label>
      <label className="field">
        Investor cap (units)
        <input
          className="input"
          value={cap}
          onChange={(event) => setCap(event.target.value)}
          inputMode="numeric"
          placeholder="6"
          autoComplete="off"
        />
      </label>
      <button type="submit" className="button">
        List
      </button>
      {unitPrice !== null && (
        <p className="field-wide preview">
          {formatUsdt(unitPrice)} USDT per unit · You receive{' '}
          {formatUsdt(unitPrice * receivable.faceValue)} USDT if all units sell
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

export default ListForm
