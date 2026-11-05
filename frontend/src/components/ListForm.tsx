import { useState } from 'react'
import type { FormEvent } from 'react'
import { simulateContract, writeContract } from 'wagmi/actions'
import { upfront } from '../contracts.ts'
import {
  WHOLE_NUMBER,
  canList,
  formatUsdt,
  parseDiscount,
  unitPriceFor,
} from '../receivables.ts'
import type { Receivable } from '../receivables.ts'
import { useTx } from '../tx.ts'
import { config } from '../wagmi.ts'
import TxStatus from './TxStatus.tsx'

type Props = {
  receivable: Receivable
}

/**
 * Lists a Created receivable for investors. The status stays after it becomes Listed
 * and the form disappears, so the explorer link isn't lost.
 */
function ListForm({ receivable }: Props) {
  const [discount, setDiscount] = useState('')
  const [cap, setCap] = useState('')
  const [error, setError] = useState('')
  const tx = useTx()

  const listable = canList(receivable)
  if (!listable && tx.phase === 'idle') return null

  const total = receivable.totalUnits
  const discountBps = parseDiscount(discount)
  const unitPrice = discountBps === null ? null : unitPriceFor(discountBps)

  function problem() {
    if (discountBps === null) {
      return 'Enter a discount above 0% and below 100%, with up to 2 decimals.'
    }
    if (!WHOLE_NUMBER.test(cap) || BigInt(cap) > total) {
      return `Enter an investor cap from 1 to ${total.toLocaleString()} units.`
    }
    return null
  }

  async function list(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const reason = problem()
    if (reason || discountBps === null) {
      setError(reason ?? '')
      return
    }
    setError('')
    const ok = await tx.run(async () => {
      const { request } = await simulateContract(config, {
        ...upfront,
        functionName: 'listReceivable',
        args: [receivable.id, discountBps, BigInt(cap)],
      })
      return writeContract(config, request)
    })
    if (ok) {
      setDiscount('')
      setCap('')
    }
  }

  return (
    <>
      {listable && (
        <form className="inline-form" onSubmit={list} noValidate>
          <fieldset className="inline-form" disabled={tx.busy}>
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
                placeholder={total.toString()}
                autoComplete="off"
              />
            </label>
            <button type="submit" className="button">
              List for investors
            </button>
          </fieldset>
          {unitPrice !== null && (
            <p className="field-wide preview">
              Investors pay {formatUsdt(unitPrice)} USDT per unit. You receive{' '}
              {formatUsdt(unitPrice * total)} USDT if all{' '}
              {total.toLocaleString()} units sell, paid as each sale happens.
            </p>
          )}
          {error && (
            <p className="field-wide form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
      <TxStatus tx={tx} done="Listed. Investors can now buy units." />
    </>
  )
}

export default ListForm
