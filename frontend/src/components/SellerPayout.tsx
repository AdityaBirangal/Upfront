import { claimValue, formatUsdt } from '../receivables.ts'
import type { Receivable } from '../receivables.ts'
import DueCountdown from './DueCountdown.tsx'
import ReceivableActions from './ReceivableActions.tsx'

type Props = {
  receivable: Receivable
  /** Units the seller still holds: the unsold ones, until claimed. Undefined while loading. */
  held: bigint | undefined
  /** USDT the seller already claimed for unsold units. */
  claimed: bigint
  now: bigint
  grace: bigint | undefined
}

/** What the seller has received, and Claim for unsold units once the buyer pays. */
function SellerPayout({ receivable, held, claimed, now, grace }: Props) {
  if (receivable.unitPrice === 0n) return null // never listed, so nothing sold or owed

  const fromSales = receivable.unitsSold * receivable.unitPrice
  const total = fromSales + claimed
  const canClaim =
    receivable.status === 'Settled' && held !== undefined && held > 0n

  return (
    <>
      <p>
        Received <strong>{formatUsdt(total)} USDT</strong>
        {claimed > 0n
          ? ` (${formatUsdt(fromSales)} from sales, ${formatUsdt(claimed)} from unsold units)`
          : ' from sales'}
      </p>
      <DueCountdown receivable={receivable} now={now} grace={grace} />
      {receivable.status === 'Defaulted' && held !== undefined && held > 0n && (
        <p className="form-error">
          Defaulted: the {held.toLocaleString()} unsold{' '}
          {held === 1n ? 'unit pays' : 'units pay'} nothing.
        </p>
      )}
      {canClaim && (
        <p>
          The buyer paid. Your {held.toLocaleString()} unsold{' '}
          {held === 1n ? 'unit pays' : 'units pay'} {formatUsdt(claimValue(held))}{' '}
          USDT.
        </p>
      )}
      <ReceivableActions
        id={receivable.id}
        actions={
          canClaim
            ? [
                {
                  label: `Claim ${formatUsdt(claimValue(held))} USDT`,
                  functionName: 'claim',
                  done: 'Claimed the unsold units.',
                },
              ]
            : []
        }
      />
    </>
  )
}

export default SellerPayout
