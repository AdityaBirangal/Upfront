import { cn } from '@/lib/utils'
import type { Status } from '@/receivables.ts'

const TONE: Record<Status, string> = {
  None: 'text-state-closed bg-state-closed/10 border-state-closed/20',
  Created: 'text-state-created bg-state-created/10 border-state-created/20',
  Listed: 'text-state-listed bg-state-listed/10 border-state-listed/25',
  Funded: 'text-state-funded bg-state-funded/10 border-state-funded/25',
  Settled: 'text-state-settled bg-state-settled/10 border-state-settled/25',
  Defaulted:
    'text-state-defaulted bg-state-defaulted/10 border-state-defaulted/25',
  Rejected: 'text-state-closed bg-state-closed/10 border-state-closed/20',
  Cancelled: 'text-state-closed bg-state-closed/10 border-state-closed/20',
}

/** One label and colour per status. */
function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap',
        TONE[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  )
}

export default StatusBadge
