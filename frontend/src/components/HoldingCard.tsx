import { Link } from 'react-router'
import { explorerTxUrl } from '../contracts.ts'
import { claimValue, formatUsdt } from '../receivables.ts'
import type { Receivable } from '../receivables.ts'
import DueCountdown from './DueCountdown.tsx'
import ReceivableActions from './ReceivableActions.tsx'
import StatusBadge from './StatusBadge.tsx'
import VerifiedTag from './VerifiedTag.tsx'

type Props = {
  receivable: Receivable
  /** Units held now. Claiming burns them. */
  units: bigint
  /** USDT this wallet paid in `invest`, or undefined while loading or unknown. */
  paid: bigint | undefined
  /** USDT this wallet already claimed, and the transaction. */
  claimed: { amount: bigint; txHash: `0x${string}` } | undefined
  now: bigint
  grace: bigint | undefined
}

function Signed({ value }: { value: bigint }) {
  const sign = value >= 0n ? '+' : '−'
  const size = value >= 0n ? value : -value
  return (
    <strong className={value >= 0n ? 'ok-text' : 'form-error'}>
      {sign}
      {formatUsdt(size)} USDT
    </strong>
  )
}

/** One portfolio row: what was paid, and what happened at the due date. */
function HoldingCard({ receivable, units, paid, claimed, now, grace }: Props) {
  const payout = claimValue(units)
  const claimUrl = claimed ? explorerTxUrl(claimed.txHash) : null

  let outcome
  if (receivable.status === 'Settled' && units > 0n) {
    outcome = (
      <>
        <p>
          The buyer paid. Claim {formatUsdt(payout)} USDT
          {paid !== undefined && (
            <>
              {' '}
              · Profit <Signed value={payout - paid} />
            </>
          )}
        </p>
        <ReceivableActions
          id={receivable.id}
          actions={[
            {
              label: `Claim ${formatUsdt(payout)} USDT`,
              functionName: 'claim',
              done: `Claimed ${formatUsdt(payout)} USDT.`,
            },
          ]}
        />
      </>
    )
  } else if (claimed) {
    outcome = (
      <p>
        Claimed {formatUsdt(claimed.amount)} USDT
        {paid !== undefined && (
          <>
            {' '}
            · Profit <Signed value={claimed.amount - paid} />
          </>
        )}
        {claimUrl && (
          <>
            {' '}
            ·{' '}
            <a href={claimUrl} target="_blank" rel="noreferrer">
              View on explorer
            </a>
          </>
        )}
      </p>
    )
  } else if (receivable.status === 'Defaulted') {
    outcome = (
      <p className="form-error">
        Defaulted: the buyer didn't pay by the end of the grace period.
        {paid !== undefined && (
          <>
            {' '}
            Loss <Signed value={-paid} />.
          </>
        )}
      </p>
    )
  } else {
    outcome = (
      <>
        <p>
          Expected payout {formatUsdt(payout)} USDT
          {paid !== undefined && paid > 0n && (
            <>
              {' '}
              · Profit <Signed value={payout - paid} />
            </>
          )}
        </p>
        <DueCountdown receivable={receivable} now={now} grace={grace} />
      </>
    )
  }

  // Claimed units are burned, so show the units that were claimed instead.
  const shownUnits = units > 0n ? units : (claimed?.amount ?? 0n) / claimValue(1n)

  return (
    <li className="receivable">
      <div className="receivable-head">
        <strong>
          #{receivable.id.toString()} · {receivable.ref}
        </strong>
        <span className="tags">
          <StatusBadge status={receivable.status} />
          <VerifiedTag verified={receivable.verified} />
        </span>
      </div>
      <p>
        {shownUnits.toLocaleString()} {shownUnits === 1n ? 'unit' : 'units'} ·
        Paid {paid === undefined ? '…' : `${formatUsdt(paid)} USDT`}
      </p>
      {outcome}
      <p>
        <Link to={`/app/receivable/${receivable.id}`}>View details</Link>
      </p>
    </li>
  )
}

export default HoldingCard
