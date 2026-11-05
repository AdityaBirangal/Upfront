import type { ReactNode } from 'react'
import { formatUsdt } from '../receivables.ts'
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
      {receivable.maxUnitsPerInvestor > 0 && (
        <p>
          {receivable.discountBps / 100}% discount ·{' '}
          {formatUsdt(receivable.unitPrice)} USDT per unit · Cap{' '}
          {receivable.maxUnitsPerInvestor} per wallet · Sold{' '}
          {receivable.unitsSold} of {receivable.faceValue} · Raised{' '}
          {formatUsdt(receivable.unitsSold * receivable.unitPrice)} USDT
        </p>
      )}
      {children}
    </li>
  )
}

export default ReceivableCard
