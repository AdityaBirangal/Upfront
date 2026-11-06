import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router'
import type { Hash } from 'viem'
import { TableCell, TableRow } from '@/components/ui/table'
import { explorerTxUrl } from '@/contracts.ts'
import { cn } from '@/lib/utils'
import { formatDuration, sharePercent, unitValue } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'
import StatusBadge from './StatusBadge.tsx'
import Usdt from './Usdt.tsx'

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

/** One portfolio row: what was paid, and what happened at settlement. */
function HoldingRow({ receivable, units, paid, repaid, now }: Props) {
  const repaidUrl = repaid ? explorerTxUrl(repaid.txHash) : null
  const defaulted = receivable.status === 'Defaulted'
  // Settlement burns the units, so show the units that were repaid instead.
  const shownUnits = units > 0n ? units : (repaid?.units ?? 0n)
  const payout = repaid ? repaid.amount : defaulted ? 0n : unitValue(units)
  const profit = paid === undefined ? undefined : payout - paid
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
        <p className="text-muted-foreground text-xs">
          {repaid ? 'Paid' : defaulted ? 'Not repaid' : 'Expected'}
        </p>
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
