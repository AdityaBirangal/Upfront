import { useClaims } from '../chain.ts'
import { explorerTxUrl } from '../contracts.ts'
import {
  canMarkDefault,
  claimValue,
  formatDate,
  formatDuration,
  formatUsdt,
  isAwaitingPayment,
  shortAddress,
} from '../receivables.ts'
import type { Receivable } from '../receivables.ts'
import { useNow } from '../useNow.ts'
import DueCountdown from './DueCountdown.tsx'
import ReceivableActions from './ReceivableActions.tsx'

type Props = {
  receivable: Receivable
  grace: bigint | undefined
}

/** Settlement state on the detail page: countdown, Mark default, and claims. */
function Payment({ receivable, grace }: Props) {
  const now = useNow()
  const claims = useClaims({ id: receivable.id })
  const r = receivable
  const graceEnd = grace === undefined ? undefined : r.dueDate + grace
  const defaultable = grace !== undefined && canMarkDefault(r, now, grace)

  const claimedUnits = (claims.data ?? []).reduce((sum, c) => sum + c.units, 0n)

  return (
    <section>
      <h2>Payment</h2>
      <p>
        The buyer owes {formatUsdt(r.faceValue)} USDT on {formatDate(r.dueDate)}.
        {graceEnd !== undefined && (
          <>
            {' '}
            If it's unpaid, anyone can mark it as defaulted after{' '}
            {formatDate(graceEnd)} (a {formatDuration(grace ?? 0n)} grace period).
          </>
        )}
      </p>

      {r.status === 'Created' && (
        <p className="hint">
          Payment opens once the seller lists it for investors.
        </p>
      )}
      <DueCountdown receivable={r} now={now} grace={grace} />
      {isAwaitingPayment(r) && now >= r.dueDate && !r.verified && (
        <p className="hint">
          It isn't verified, so only the buyer can settle it.
        </p>
      )}
      <ReceivableActions
        id={r.id}
        actions={
          defaultable
            ? [
                {
                  label: 'Mark default',
                  functionName: 'markDefault',
                  done: 'Marked as defaulted.',
                  confirm: `Mark receivable #${r.id} as defaulted? This is final and public.`,
                },
              ]
            : []
        }
      />

      {r.status === 'Settled' && (
        <p className="badge ok">
          Settled: the buyer paid {formatUsdt(r.faceValue)} USDT. Each unit
          claims 1 USDT. {claimedUnits.toLocaleString()} of{' '}
          {r.totalUnits.toLocaleString()} units claimed so far.
        </p>
      )}
      {r.status === 'Defaulted' && (
        <p className="badge warn">
          Defaulted: the buyer didn't pay by the end of the grace period. Units
          pay nothing.
        </p>
      )}

      {(claims.data ?? []).length > 0 && (
        <>
          <h3>Claims</h3>
          <ul className="plain-list">
            {(claims.data ?? []).map((claim) => {
              const url = explorerTxUrl(claim.txHash)
              return (
                <li key={`${claim.txHash}-${claim.holder}`}>
                  <code className="address" title={claim.holder}>
                    {shortAddress(claim.holder)}
                  </code>{' '}
                  {claim.holder.toLowerCase() === r.seller.toLowerCase()
                    ? '(seller) '
                    : ''}
                  claimed {formatUsdt(claimValue(claim.units))} USDT
                  {url && (
                    <>
                      {' '}
                      ·{' '}
                      <a href={url} target="_blank" rel="noreferrer">
                        View on explorer
                      </a>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

export default Payment
