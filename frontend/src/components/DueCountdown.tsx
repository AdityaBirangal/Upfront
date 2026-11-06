import { formatDuration, isAwaitingPayment } from '../receivables.ts'
import type { Receivable } from '../receivables.ts'

type Props = {
  receivable: Receivable
  /** Unix seconds from `useNow`. */
  now: bigint
  /** Undefined while the grace period loads. */
  grace: bigint | undefined
}

/** Time to the due date, then time to the end of the grace period, while payment is open. */
function DueCountdown({ receivable, now, grace }: Props) {
  if (!isAwaitingPayment(receivable)) return null
  const { dueDate } = receivable

  if (now < dueDate) {
    return (
      <p className="countdown">
        Due in <strong>{formatDuration(dueDate - now)}</strong>
      </p>
    )
  }
  if (grace === undefined) return <p className="countdown warn">Due now</p>
  const graceEnd = dueDate + grace
  if (now <= graceEnd) {
    return (
      <p className="countdown warn">
        <strong>Due now.</strong> If it isn't paid, anyone can mark it as
        defaulted in {formatDuration(graceEnd - now + 1n)}.
      </p>
    )
  }
  return (
    <p className="countdown warn">
      <strong>Overdue.</strong> The grace period is over, so anyone can mark it
      as defaulted until it's paid.
    </p>
  )
}

export default DueCountdown
