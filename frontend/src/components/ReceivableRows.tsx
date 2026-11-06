import { ShieldAlert, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  canList,
  isAwaitingPayment,
  canSettle,
  formatDuration,
  formatPercent,
  returnPercent,
  shortAddress,
  soldPercent,
  unitValue,
  unitsLeft,
} from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'
import type { Address } from 'viem'
import type { Column } from './ReceivableTable.tsx'
import ReceivableSheet from './ReceivableSheet.tsx'
import StatusBadge from './StatusBadge.tsx'
import Usdt from './Usdt.tsx'

// Columns hide on narrow screens, least important first. Each cell repeats its column's class.
const HIDE_SM = 'hidden sm:table-cell'
const HIDE_MD = 'hidden md:table-cell'
const HIDE_LG = 'hidden lg:table-cell'

/** Reference, id and one party: the "issuer" column. */
function NameCell({ r, party, address, extra }: { r: Receivable; party: string; address: Address; extra?: ReactNode }) {
  return (
    <TableCell className="max-w-[16rem] pl-4">
      <Link
        to={`/app/receivable/${r.id}`}
        className="hover:text-primary block truncate font-medium underline-offset-4 outline-none hover:underline focus-visible:underline"
      >
        {r.ref || 'No reference'}
      </Link>
      <p className="text-muted-foreground tabular truncate text-xs">
        #{r.id.toString()} · {party} <span className="font-mono">{shortAddress(address)}</span>
      </p>
      {extra}
    </TableCell>
  )
}

/** Due date, with a countdown while the receivable is still open. Red once it has passed. */
function DueCell({ r, now, className }: { r: Receivable; now: bigint; className?: string }) {
  const past = now >= r.dueDate
  const open = r.status === 'Created' || isAwaitingPayment(r)
  return (
    <TableCell className={cn('text-right', className)}>
      {open && (
        <span className={cn('tabular font-mono text-xs', past ? 'text-state-defaulted' : 'text-foreground')}>
          {past ? 'Past due' : formatDuration(r.dueDate - now)}
        </span>
      )}
      <p className="text-muted-foreground text-xs">
        {new Date(Number(r.dueDate) * 1000).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </TableCell>
  )
}

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <span className="bg-muted mt-1 ml-auto block h-1 w-16 overflow-hidden rounded-full" role="img" aria-label={label}>
      <span className="bg-primary block h-full rounded-full" style={{ width: `${value}%` }} />
    </span>
  )
}

/* Marketplace ---------------------------------------------------------------------------------- */

export const MARKET_COLUMNS: Column[] = [
  { label: 'Receivable' },
  { label: 'Client', className: HIDE_LG },
  { label: 'Price', className: cn('text-right', HIDE_SM) },
  { label: 'Return', className: 'text-right' },
  { label: 'Due', className: cn('text-right', HIDE_MD) },
  { label: 'Available', className: cn('text-right', HIDE_MD) },
  { label: '', className: 'w-0' },
]

/** One listed receivable, read like a bond quote: issuer, price, yield, maturity, size left. */
export function MarketRow({ r, now, buy }: { r: Receivable; now: bigint; buy: ReactNode }) {
  const left = unitsLeft(r)
  const open = left > 0n && now < r.dueDate
  return (
    <TableRow key={r.id}>
      <NameCell r={r} party="Seller" address={r.seller} />
      <TableCell className={HIDE_LG}>
        {r.verified ? (
          <span className="text-state-settled inline-flex items-center gap-1 text-xs font-medium">
            <ShieldCheck className="size-3.5" aria-hidden /> Verified
          </span>
        ) : (
          <span className="text-warning inline-flex items-center gap-1 text-xs font-medium">
            <ShieldAlert className="size-3.5" aria-hidden /> Unverified
          </span>
        )}
      </TableCell>
      <TableCell className={cn('text-right', HIDE_SM)}>
        <Usdt value={r.unitPrice} />
        <p className="text-muted-foreground text-xs">{formatPercent(r.discountBps)} off</p>
      </TableCell>
      <TableCell className="text-yield tabular text-right font-semibold">{returnPercent(r.unitPrice)}</TableCell>
      <DueCell r={r} now={now} className={HIDE_MD} />
      <TableCell className={cn('text-right', HIDE_MD)}>
        <span className="tabular">{left.toLocaleString()}</span>
        <span className="text-muted-foreground tabular text-xs"> / {r.totalUnits.toLocaleString()}</span>
        <Meter value={100 - soldPercent(r)} label={`${left.toLocaleString()} units left`} />
      </TableCell>
      <TableCell className="pr-4 text-right">
        <ReceivableSheet
          receivable={r}
          trigger={
            <Button size="sm" disabled={!open}>
              {left === 0n ? 'Sold out' : 'Buy'}
            </Button>
          }
        >
          {buy}
        </ReceivableSheet>
      </TableCell>
    </TableRow>
  )
}

/* Seller --------------------------------------------------------------------------------------- */

export const SELLER_COLUMNS: Column[] = [
  { label: 'Receivable' },
  { label: 'Status', className: HIDE_SM },
  { label: 'Face value', className: cn('text-right', HIDE_LG) },
  { label: 'Price', className: cn('text-right', HIDE_MD) },
  { label: 'Sold', className: cn('text-right', HIDE_MD) },
  { label: 'Due', className: 'text-right' },
  { label: '', className: 'w-0' },
]

/** The seller's next step for a receivable, which names the row's button. */
function nextStep(r: Receivable, now: bigint, wallet: Address): { label: string; primary: boolean } | null {
  if (canList(r)) return { label: 'List', primary: true }
  if (canSettle(r, now, wallet) && r.unitsSold > 0n) return { label: 'Repay', primary: true }
  // Still open: cancel, or see what was raised. Closed receivables just link to their page.
  if (r.status === 'Created' || isAwaitingPayment(r)) return { label: 'Manage', primary: false }
  return null
}

/** One of the seller's receivables: where it stands, and the one thing to do next. */
export function SellerRow({ r, now, wallet, manage }: { r: Receivable; now: bigint; wallet: Address; manage: ReactNode }) {
  const listed = r.unitPrice > 0n
  const step = nextStep(r, now, wallet)
  return (
    <TableRow key={r.id}>
      <NameCell
        r={r}
        party="Client"
        address={r.buyer}
        extra={<StatusBadge status={r.status} className="mt-1.5 sm:hidden" />}
      />
      <TableCell className={HIDE_SM}>
        <StatusBadge status={r.status} />
      </TableCell>
      <TableCell className={cn('text-right', HIDE_LG)}>
        <Usdt value={unitValue(r.totalUnits)} />
      </TableCell>
      <TableCell className={cn('text-right', HIDE_MD)}>
        {listed ? (
          <>
            <Usdt value={r.unitPrice} />
            <p className="text-muted-foreground text-xs">{formatPercent(r.discountBps)} off</p>
          </>
        ) : (
          <span className="text-muted-foreground text-xs">Not listed</span>
        )}
      </TableCell>
      <TableCell className={cn('text-right', HIDE_MD)}>
        {listed ? (
          <>
            <span className="tabular">{soldPercent(r)}%</span>
            <Meter value={soldPercent(r)} label={`${soldPercent(r)}% sold`} />
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <DueCell r={r} now={now} />
      <TableCell className="pr-4 text-right">
        {step ? (
          <ReceivableSheet
            receivable={r}
            trigger={
              <Button size="sm" variant={step.primary ? 'default' : 'outline'}>
                {step.label}
              </Button>
            }
          >
            {manage}
          </ReceivableSheet>
        ) : (
          <Button size="sm" variant="ghost" asChild>
            <Link to={`/app/receivable/${r.id}`}>View</Link>
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
