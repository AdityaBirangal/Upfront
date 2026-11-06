import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Store } from 'lucide-react'
import { simulateContract, writeContract } from 'wagmi/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { upfront } from '@/contracts.ts'
import {
  WHOLE_NUMBER,
  canList,
  formatUsdt,
  parseDiscount,
  returnPercent,
  unitPriceFor,
} from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'
import { useTx } from '@/tx.ts'
import { config } from '@/wagmi.ts'
import ErrorNote from './ErrorNote.tsx'
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
  const id = useId()

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
    <div className="space-y-3">
      {listable && (
        <form onSubmit={list} noValidate className="space-y-3">
          <p className="text-sm font-medium">List for investors</p>
          <fieldset disabled={tx.busy} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-discount`}>Discount (%)</Label>
              <Input
                id={`${id}-discount`}
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                inputMode="decimal"
                placeholder="3"
                autoComplete="off"
                aria-invalid={Boolean(error) && discountBps === null}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-cap`}>Investor cap (units)</Label>
              <Input
                id={`${id}-cap`}
                value={cap}
                onChange={(event) => setCap(event.target.value)}
                inputMode="numeric"
                placeholder={total.toString()}
                autoComplete="off"
              />
            </div>
            <Button type="submit">
              <Store />
              {tx.busy ? 'Listing…' : 'List'}
            </Button>
          </fieldset>
          {unitPrice !== null && (
            <p className="text-muted-foreground text-sm">
              Investors pay <span className="text-foreground tabular font-medium">{formatUsdt(unitPrice)} USDT</span>{' '}
              per unit for a <span className="text-yield font-medium">{returnPercent(unitPrice)}</span> return. You
              receive <span className="text-foreground tabular font-medium">{formatUsdt(unitPrice * total)} USDT</span>{' '}
              if all {total.toLocaleString()} units sell, paid as each sale happens.
            </p>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
        </form>
      )}
      <TxStatus tx={tx} done="Listed. Investors can now buy units." />
    </div>
  )
}

export default ListForm
