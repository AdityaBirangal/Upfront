import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router'
import { TableCell, TableRow } from '@/components/ui/table'
import { explorerTxUrl } from '@/contracts.ts'
import type { HoldingFigures } from '@/lib/portfolio.ts'
import type { SortDir, SortValue } from '@/lib/sort.ts'
import { cn } from '@/lib/utils'
import { STATUSES, YIELD_HELP, formatDuration, formatYield, sharePercent } from '@/receivables.ts'
import StatusBadge from './StatusBadge.tsx'
import Usdt from './Usdt.tsx'

const HIDE_MD = 'hidden md:table-cell'

export const HOLDING_COLUMNS: {
  label: string
  className?: string
  title?: string
  first?: SortDir
  value: (h: HoldingFigures) => SortValue
}[] = [
  { label: 'Receivable', className: 'pl-4', value: (h) => h.receivable.id },
  { label: 'Status', value: (h) => STATUSES.indexOf(h.receivable.status), first: 'asc' },
  { label: 'Units', className: 'text-right', value: (h) => h.shownUnits },
  { label: 'Invested', className: 'text-right', value: (h) => h.paid },
  { label: 'Payout', className: 'text-right', value: (h) => h.payout },
  { label: 'Profit', className: 'text-right', value: (h) => h.profit },
  {
    label: 'Yield p.a.',
    title: `${YIELD_HELP} Counted from when you bought, to the payout if it has been paid.`,
    className: cn('text-right', HIDE_MD),
    value: (h) => h.annual,
  },
  { label: 'Due', className: 'pr-4 text-right', value: (h) => h.receivable.dueDate, first: 'asc' },
]

/** One portfolio row: what was paid, and what happened at settlement. */
function HoldingRow({ holding, now }: { holding: HoldingFigures; now: bigint }) {
  const { receivable, repaid, shownUnits, paid, payout, profit, lost, annual } = holding
  const repaidUrl = repaid ? explorerTxUrl(repaid.txHash) : null
  const open = receivable.status === 'Listed' || receivable.status === 'Funded'

  return (
    <TableRow>
      <TableCell className="pl-4">
        <Link
          to={`/app/receivable/${receivable.id}`}
          className="hover:text-primary font-medium underline-offset-4 hover:underline"
        >
          {receivable.ref || 'No reference'}
        </Link>
        <p className="text-muted-foreground tabular text-xs">#{receivable.id.toString()}</p>
      </TableCell>
      <TableCell>
        <StatusBadge status={receivable.status} />
      </TableCell>
      <TableCell className="tabular text-right">
        {shownUnits.toLocaleString()}
        <p className="text-muted-foreground text-xs">
          {sharePercent(shownUnits, receivable.totalUnits)} share
        </p>
      </TableCell>
      <TableCell className="text-right">
        {paid === undefined ? <span className="text-muted-foreground">…</span> : <Usdt value={paid} />}
      </TableCell>
      <TableCell className="text-right">
        <Usdt value={payout} />
        <p className="text-muted-foreground text-xs">{repaid ? 'Paid' : lost ? 'Not repaid' : 'Expected'}</p>
      </TableCell>
      <TableCell className="text-right">
        {profit === undefined ? (
          <span className="text-muted-foreground">…</span>
        ) : (
          <Usdt
            value={profit}
            signed
            className={cn(
              'font-medium',
              profit < 0n ? 'text-state-defaulted' : repaid ? 'text-state-settled' : 'text-yield',
            )}
          />
        )}
      </TableCell>
      <TableCell className={cn('tabular text-right', HIDE_MD, annual === null ? 'text-muted-foreground' : 'text-yield font-medium')}>
        {formatYield(annual)}
      </TableCell>
      <TableCell className="pr-4 text-right">
        {repaidUrl ? (
          <a
            href={repaidUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            Payment
            <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : open ? (
          <span
            className={cn(
              'tabular font-mono text-xs',
              now >= receivable.dueDate ? 'text-state-defaulted' : 'text-muted-foreground',
            )}
          >
            {now >= receivable.dueDate ? 'Past due' : `${formatDuration(receivable.dueDate - now)} left`}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}

export default HoldingRow
