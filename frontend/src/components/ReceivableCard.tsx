import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatDate } from '../receivables.ts'
import type { Receivable } from '../receivables.ts'

type Props = {
  receivable: Receivable
  children?: ReactNode
}

function ReceivableCard({ receivable, children }: Props) {
  const units = receivable.totalUnits
  return (
    <li className="receivable">
      <div className="receivable-head">
        <strong>
          #{receivable.id.toString()} · {receivable.ref || 'No reference'}
        </strong>
        <span>{receivable.status}</span>
      </div>
      <p>
        {units.toLocaleString()} USDT · {units.toLocaleString()}{' '}
        {units === 1n ? 'unit' : 'units'} · Due {formatDate(receivable.dueDate)}
      </p>
      <p>
        Seller: <code className="address">{receivable.seller}</code>
      </p>
      <p>
        Buyer: <code className="address">{receivable.buyer}</code>
      </p>
      <p>
        Document: <code className="address">{receivable.docHash}</code>
      </p>
      {children}
      <p>
        <Link to={`/app/receivable/${receivable.id}`}>View details</Link>
      </p>
    </li>
  )
}

export default ReceivableCard
