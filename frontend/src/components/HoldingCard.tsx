import { Link } from 'react-router'
import type { Hash } from 'viem'
import { explorerTxUrl } from '../contracts.ts'
import { formatUsdt, unitValue } from '../receivables.ts'
import type { Receivable } from '../receivables.ts'
import DueCountdown from './DueCountdown.tsx'
import StatusBadge from './StatusBadge.tsx'
import VerifiedTag from './VerifiedTag.tsx'

type Props = {
  receivable: Receivable
  /** Units held now. Settlement burns them. */
  units: bigint
  /** USDT this wallet paid in `invest`, or undefined while loading or unknown. */
  paid: bigint | undefined
  /** What `settle` paid this wallet, read from HolderPaid events. */
  repaid: { units: bigint; amount: bigint; txHash: Hash } | undefined
  now: bigint
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

/** One portfolio row: what was paid, and what happened at settlement. */
function HoldingCard({ receivable, units, paid, repaid, now }: Props) {
  const repaidUrl = repaid ? explorerTxUrl(repaid.txHash) : null

  let outcome
  if (repaid) {
    outcome = (
      <p>
        <span className="tag ok">Paid</span> The seller repaid{' '}
        {formatUsdt(repaid.amount)} USDT to this wallet
        {paid !== undefined && (
          <>
            {' '}
            · Profit <Signed value={repaid.amount - paid} />
          </>
        )}
        {repaidUrl && (
          <>
            {' '}
            ·{' '}
            <a href={repaidUrl} target="_blank" rel="noreferrer">
              View on explorer
            </a>
          </>
        )}
      </p>
    )
  } else if (receivable.status === 'Defaulted') {
    outcome = (
      <p className="form-error">
        Defaulted: the seller didn't repay by the due date.
        {paid !== undefined && (
          <>
            {' '}
            Loss <Signed value={-paid} />.
          </>
        )}
      </p>
    )
  } else {
    const payout = unitValue(units)
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
        <DueCountdown receivable={receivable} now={now} />
      </>
    )
  }

  // Settlement burns the units, so show the units that were repaid instead.
  const shownUnits = units > 0n ? units : (repaid?.units ?? 0n)

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
        Invested {paid === undefined ? '…' : `${formatUsdt(paid)} USDT`}
      </p>
      {outcome}
      <p>
        <Link to={`/app/receivable/${receivable.id}`}>View details</Link>
      </p>
    </li>
  )
}

export default HoldingCard
