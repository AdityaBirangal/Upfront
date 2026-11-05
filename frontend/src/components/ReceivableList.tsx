import type { ReactNode } from 'react'
import type { Receivable } from '../receivables.ts'
import ReceivableCard from './ReceivableCard.tsx'

type Props = {
  receivables: Receivable[]
  isPending: boolean
  isError: boolean
  empty: string
  extra?: (receivable: Receivable) => ReactNode
}

/** Loading, error, and empty states for a list of chain receivables. */
function ReceivableList({ receivables, isPending, isError, empty, extra }: Props) {
  if (isPending) return <p>Loading receivables…</p>
  if (isError) {
    return <p className="form-error">Couldn't read receivables from the chain.</p>
  }
  if (receivables.length === 0) return <p>{empty}</p>

  return (
    <ul className="receivable-list">
      {receivables.map((receivable) => (
        <ReceivableCard key={receivable.id} receivable={receivable}>
          {extra?.(receivable)}
        </ReceivableCard>
      ))}
    </ul>
  )
}

export default ReceivableList
