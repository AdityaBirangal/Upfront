import type { Status } from '../receivables.ts'

const TONE: Partial<Record<Status, string>> = {
  Settled: 'ok',
  Defaulted: 'warn',
  Rejected: 'warn',
  Cancelled: 'muted',
}

/** One label and colour per status. */
function StatusBadge({ status }: { status: Status }) {
  return <span className={`tag ${TONE[status] ?? ''}`}>{status}</span>
}

export default StatusBadge
