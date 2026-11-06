import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { sortRows, useSort } from '@/lib/sort.ts'
import type { SortDir, SortState, SortValue } from '@/lib/sort.ts'
import type { Receivable } from '@/receivables.ts'
import { useNow } from '@/useNow.ts'
import EmptyState from './EmptyState.tsx'
import ErrorNote from './ErrorNote.tsx'
import SortHead from './SortHead.tsx'

export type Column = {
  label: string
  className?: string
  /** Explains the column on hover. */
  title?: string
  /** Makes the column sortable, by this value. */
  value?: (receivable: Receivable, now: bigint) => SortValue
  /** The direction a first click sorts in. */
  first?: SortDir
}

type Props = {
  receivables: Receivable[]
  isPending: boolean
  isError: boolean
  empty: { title: string; body?: ReactNode; action?: ReactNode }
  columns: Column[]
  /** The sort shown first: a column's label and direction. */
  defaultSort: SortState
  /** One <tr> per receivable, with a cell for each column. */
  row: (receivable: Receivable) => ReactNode
  label: string
}

function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-card divide-y rounded-xl border" aria-busy aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-6 px-4 py-4">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-4 w-16 md:block" />
          <Skeleton className="hidden h-4 w-16 md:block" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      ))}
    </div>
  )
}

/**
 * Receivables as a dense, scannable list, like a bond screener: one row each, only the numbers
 * you compare, and the row's action at the end. Detail and forms live behind the action.
 */
function ReceivableTable({ receivables, isPending, isError, empty, columns, defaultSort, row, label }: Props) {
  const { sort, toggle } = useSort(defaultSort)
  const now = useNow()

  if (isPending) return <TableSkeleton />
  if (isError) return <ErrorNote>Couldn’t read receivables from the chain. Check your connection and refresh.</ErrorNote>
  if (receivables.length === 0) {
    return (
      <EmptyState icon={Inbox} title={empty.title} action={empty.action}>
        {empty.body}
      </EmptyState>
    )
  }

  const value = columns.find((c) => c.label === sort.key)?.value
  const rows = value ? sortRows(receivables, (r) => value(r, now), sort.dir) : receivables

  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <Table aria-label={label}>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            {columns.map((c, i) => {
              const className = cn(
                'text-muted-foreground h-9 text-xs font-medium',
                i === 0 && 'pl-4',
                i === columns.length - 1 && 'pr-4',
                c.className,
              )
              return c.value ? (
                <SortHead key={c.label} label={c.label} title={c.title} first={c.first} sort={sort} onSort={toggle} className={className} />
              ) : (
                <TableHead key={c.label || i} className={className}>
                  {c.label}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>{rows.map(row)}</TableBody>
      </Table>
    </div>
  )
}

export default ReceivableTable
