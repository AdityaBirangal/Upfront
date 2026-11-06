import { cn } from '@/lib/utils'
import { formatDate, formatDuration, soldPercent } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'

type StageState = 'done' | 'current' | 'partial' | 'upcoming' | 'skipped' | 'failed' | 'closed'
/** `fill` is the percent of the bar filled, for a partly funded stage. */
type Stage = { label: string; state: StageState; fill?: number }

/** The Funded stage: full when every unit sold, part-filled when some did, else `none`. */
function fundedStage(r: Receivable, none: StageState): Stage {
  const percent = soldPercent(r)
  if (r.totalUnits > 0n && r.unitsSold === r.totalUnits) return { label: 'Funded', state: 'done' }
  if (r.unitsSold > 0n) return { label: `${percent}% funded`, state: 'partial', fill: percent }
  return { label: 'Funded', state: none }
}

/**
 * Where a receivable is in its life: Created, Listed, Funded, then Settled. Funded fills by the
 * share of units sold, because a receivable can settle partly funded. It can also end early as
 * Defaulted, Rejected or Cancelled.
 */
function stagesFor(r: Receivable): Stage[] {
  const wasListed = r.unitPrice > 0n
  switch (r.status) {
    case 'Created':
      return [
        { label: 'Created', state: 'current' },
        { label: 'Listed', state: 'upcoming' },
        { label: 'Funded', state: 'upcoming' },
        { label: 'Settled', state: 'upcoming' },
      ]
    case 'Listed':
      return [
        { label: 'Created', state: 'done' },
        { label: 'Listed', state: 'current' },
        fundedStage(r, 'upcoming'),
        { label: 'Settled', state: 'upcoming' },
      ]
    case 'Funded':
      return [
        { label: 'Created', state: 'done' },
        { label: 'Listed', state: 'done' },
        { label: 'Funded', state: 'current' },
        { label: 'Settled', state: 'upcoming' },
      ]
    case 'Settled':
    case 'Defaulted':
      return [
        { label: 'Created', state: 'done' },
        { label: 'Listed', state: 'done' },
        fundedStage(r, 'skipped'),
        r.status === 'Settled'
          ? { label: 'Settled', state: 'done' }
          : { label: 'Defaulted', state: 'failed' },
      ]
    case 'Rejected':
    case 'Cancelled':
      return [
        { label: 'Created', state: 'done' },
        { label: 'Listed', state: wasListed ? 'done' : 'skipped' },
        { label: 'Funded', state: 'skipped' },
        { label: r.status, state: 'closed' },
      ]
    default:
      return []
  }
}

const BAR: Record<StageState, string> = {
  done: 'bg-primary',
  current: 'bg-primary',
  partial: 'bg-border',
  upcoming: 'bg-border',
  skipped: 'bg-[repeating-linear-gradient(90deg,var(--border)_0_4px,transparent_4px_7px)]',
  failed: 'bg-state-defaulted',
  closed: 'bg-state-closed',
}

const LABEL: Record<StageState, string> = {
  done: 'text-foreground',
  current: 'text-primary font-medium',
  partial: 'text-foreground',
  upcoming: 'text-muted-foreground',
  skipped: 'text-muted-foreground/70 line-through decoration-1',
  failed: 'text-state-defaulted font-medium',
  closed: 'text-state-closed font-medium',
}

/** The lifecycle as four segments, filled up to the current stage. */
export function LifecycleTrack({ receivable, className }: { receivable: Receivable; className?: string }) {
  const stages = stagesFor(receivable)
  const settled = receivable.status === 'Settled'
  return (
    <ol
      className={cn('grid grid-cols-4 gap-1.5', className)}
      aria-label={`Lifecycle: ${receivable.status}`}
    >
      {stages.map((stage) => (
        <li key={stage.label} className="min-w-0">
          <span
            className={cn(
              'block h-1.5 overflow-hidden rounded-full',
              BAR[stage.state],
              settled && stage.state === 'done' && 'bg-state-settled',
            )}
            aria-hidden
          >
            {stage.fill !== undefined && (
              <span
                className={cn('block h-full rounded-full', settled ? 'bg-state-settled' : 'bg-primary')}
                style={{ width: `${stage.fill}%` }}
              />
            )}
          </span>
          <span
            className={cn(
              'mt-1.5 block truncate text-[0.6875rem] leading-none',
              LABEL[stage.state],
              settled && stage.label === 'Settled' && 'text-state-settled font-medium',
            )}
          >
            {stage.label}
            {stage.state === 'current' && <span className="sr-only"> (current)</span>}
            {stage.state === 'skipped' && <span className="sr-only"> (skipped)</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Time from creation to the due date, with how much is left. Only while it's still open. */
export function MaturityBar({
  receivable,
  now,
  className,
}: {
  receivable: Receivable
  /** Unix seconds from `useNow`. */
  now: bigint
  className?: string
}) {
  const { createdAt, dueDate, status } = receivable
  if (status !== 'Created' && status !== 'Listed' && status !== 'Funded') return null

  const span = dueDate > createdAt ? Number(dueDate - createdAt) : 1
  const elapsed = Math.min(Math.max(Number(now - createdAt), 0), span)
  const percent = (elapsed / span) * 100
  const due = now >= dueDate
  const soon = !due && dueDate - now < 3600n

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">Due {formatDate(dueDate)}</span>
        <span
          className={cn(
            'tabular font-mono font-medium',
            due ? 'text-state-defaulted' : soon ? 'text-warning' : 'text-foreground',
          )}
        >
          {due ? 'Past due' : `${formatDuration(dueDate - now)} left`}
        </span>
      </div>
      <div
        className="bg-muted relative h-1 overflow-hidden rounded-full"
        role="progressbar"
        aria-label="Time to due date"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-linear',
            due ? 'bg-state-defaulted' : soon ? 'bg-warning' : 'bg-foreground/40',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
