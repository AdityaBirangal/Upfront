import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Receivable } from '@/receivables.ts'
import EmptyState from './EmptyState.tsx'
import ErrorNote from './ErrorNote.tsx'
import ReceivableCard from './ReceivableCard.tsx'

type Props = {
  receivables: Receivable[]
  isPending: boolean
  isError: boolean
  empty: { title: string; body?: ReactNode; action?: ReactNode }
  party?: 'seller' | 'buyer'
  columns?: 1 | 2
  extra?: (receivable: Receivable) => ReactNode
}

export function CardSkeletons({ count = 2, columns = 1 }: { count?: number; columns?: 1 | 2 }) {
  return (
    <div className={cn('grid gap-4', columns === 2 && 'xl:grid-cols-2')} aria-busy aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-4 rounded-xl border p-5">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-1.5 w-full" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, cell) => (
              <Skeleton key={cell} className="h-9" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Loading, error, and empty states for a list of chain receivables. */
function ReceivableList({ receivables, isPending, isError, empty, party, columns = 1, extra }: Props) {
  if (isPending) return <CardSkeletons columns={columns} />
  if (isError) return <ErrorNote>Couldn’t read receivables from the chain. Check your connection and refresh.</ErrorNote>
  if (receivables.length === 0) {
    return (
      <EmptyState icon={Inbox} title={empty.title} action={empty.action}>
        {empty.body}
      </EmptyState>
    )
  }

  return (
    <ul className={cn('grid gap-4', columns === 2 && 'xl:grid-cols-2')}>
      {receivables.map((receivable) => (
        <ReceivableCard key={receivable.id} receivable={receivable} party={party}>
          {extra?.(receivable)}
        </ReceivableCard>
      ))}
    </ul>
  )
}

export default ReceivableList
