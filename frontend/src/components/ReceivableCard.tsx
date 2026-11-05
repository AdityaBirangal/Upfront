import type { ReactNode } from 'react'
import type { Receivable } from '../receivables.ts'

type Props = {
  receivable: Receivable
  children?: ReactNode
}

function ReceivableCard({ receivable, children }: Props) {
  return (
    <li className="receivable">
      <div className="receivable-head">
        <strong>{receivable.ref}</strong>
        <span>{receivable.status}</span>
      </div>
      <p>
        {receivable.faceValue.toLocaleString()} USDT ·{' '}
        {receivable.faceValue.toLocaleString()}{' '}
        {receivable.faceValue === 1 ? 'unit' : 'units'} · Due{' '}
        {new Date(receivable.dueDate * 1000).toLocaleString([], {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </p>
      <p>
        Buyer: <code className="address">{receivable.buyer}</code>
      </p>
      <p>
        Document: <code className="address">{receivable.docHash}</code>
      </p>
      {children}
    </li>
  )
}

export default ReceivableCard
