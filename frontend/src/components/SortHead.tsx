import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { SortDir, SortState } from '@/lib/sort.ts'

type Props = {
  label: string
  /** Explains the column on hover. */
  title?: string
  className?: string
  sort: SortState
  /** The direction a first click uses: high to low for returns, soonest first for dates. */
  first?: SortDir
  onSort: (key: string, first?: SortDir) => void
}

/** A column header that sorts its table. Clicking again reverses the order. */
function SortHead({ label, title, className, sort, first, onSort }: Props) {
  const active = sort.key === label
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={className}>
      <button
        type="button"
        title={title}
        onClick={() => onSort(label, first)}
        className={cn(
          'hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-sm font-medium whitespace-nowrap outline-none focus-visible:ring-[3px]',
          active && 'text-foreground',
        )}
      >
        {label}
        <Icon className={cn('size-3', !active && 'opacity-40')} aria-hidden />
      </button>
    </TableHead>
  )
}

export default SortHead
