import { formatDuration, isAwaitingPayment } from '../receivables.ts'
import type { Receivable } from '../receivables.ts'

type Props = {
  receivable: Receivable
  /** Unix seconds from `useNow`. */
  now: bigint
}

/** Time left for the seller to repay. After the due date, an unpaid one can be marked defaulted. */
function DueCountdown({ receivable, now }: Props) {
  if (!isAwaitingPayment(receivable)) return null
  const { dueDate } = receivable

  if (now < dueDate) {
    return (
      <p className="countdown">
        Seller repays within <strong>{formatDuration(dueDate - now)}</strong>
      </p>
    )
  }
  return (
    <p className="countdown warn">
      <strong>Past due and not repaid.</strong> Anyone can mark it as
      defaulted.
    </p>
  )
}

export default DueCountdown
