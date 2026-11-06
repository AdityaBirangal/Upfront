import { useHolderPayments } from '../chain.ts'
import { explorerTxUrl } from '../contracts.ts'
import {
  canMarkDefault,
  formatDate,
  formatUsdt,
  repayAmount,
  shortAddress,
} from '../receivables.ts'
import type { Receivable } from '../receivables.ts'
import { useNow } from '../useNow.ts'
import DueCountdown from './DueCountdown.tsx'
import ReceivableActions from './ReceivableActions.tsx'

type Props = {
  receivable: Receivable
}

/** Repayment state on the detail page: countdown, Mark default, and what each holder was paid. */
function Payment({ receivable: r }: Props) {
  const now = useNow()
  const payments = useHolderPayments({ id: r.id })
  const paid = payments.data ?? []

  return (
    <section>
      <h2>Repayment</h2>
      {r.status === 'Created' ? (
        <p className="hint">
          Repayment opens once the seller lists it for investors.
        </p>
      ) : (
        <p>
          The seller repays 1 USDT per unit sold by{' '}
          {formatDate(r.dueDate)}, paying every holder in one transaction. If
          it isn't repaid by then, anyone can mark it as defaulted.
        </p>
      )}
      <DueCountdown receivable={r} now={now} />
      <ReceivableActions
        id={r.id}
        actions={
          canMarkDefault(r, now)
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
          Settled: the seller repaid {formatUsdt(repayAmount(r))} USDT to{' '}
          {paid.length} {paid.length === 1 ? 'holder' : 'holders'}.
        </p>
      )}
      {r.status === 'Defaulted' && (
        <p className="badge warn">
          Defaulted: the seller didn't repay by the due date.
        </p>
      )}

      {paid.length > 0 && (
        <>
          <h3>Holders paid</h3>
          <ul className="plain-list">
            {paid.map((payment) => {
              const url = explorerTxUrl(payment.txHash)
              return (
                <li key={`${payment.txHash}-${payment.holder}`}>
                  <code className="address" title={payment.holder}>
                    {shortAddress(payment.holder)}
                  </code>{' '}
                  received {formatUsdt(payment.amount)} USDT for{' '}
                  {payment.units.toLocaleString()}{' '}
                  {payment.units === 1n ? 'unit' : 'units'}
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
