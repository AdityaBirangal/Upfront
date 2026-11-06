import { Link, useParams } from 'react-router'
import { useReadContract } from 'wagmi'
import DocumentBadge from '../components/DocumentBadge.tsx'
import Funding from '../components/Funding.tsx'
import Payment from '../components/Payment.tsx'
import StatusBadge from '../components/StatusBadge.tsx'
import VerifiedTag from '../components/VerifiedTag.tsx'
import { useGracePeriod } from '../chain.ts'
import { upfront } from '../contracts.ts'
import {
  formatDate,
  formatPercent,
  formatUsdt,
  returnPercent,
  toReceivable,
} from '../receivables.ts'
import { revertName } from '../tx.ts'

const ID = /^[1-9]\d*$/

function ReceivableDetail() {
  const { id = '' } = useParams()
  const isValidId = ID.test(id)
  const grace = useGracePeriod()
  const read = useReadContract({
    ...upfront,
    functionName: 'getReceivable',
    args: [isValidId ? BigInt(id) : 0n],
    query: {
      enabled: isValidId,
      // A missing id reverts every time, so retrying only delays the message.
      retry: (count, error) =>
        revertName(error) !== 'UnknownReceivable' && count < 3,
    },
  })

  let body
  if (!isValidId || revertName(read.error) === 'UnknownReceivable') {
    body = <p>There's no receivable with ID {id}.</p>
  } else if (read.isPending) {
    body = <p>Loading receivable…</p>
  } else if (read.isError) {
    body = <p className="form-error">Couldn't read this receivable from the chain.</p>
  } else {
    const r = toReceivable(BigInt(id), read.data)
    body = (
      <>
        <dl className="details">
          <dt>Status</dt>
          <dd className="tags">
            <StatusBadge status={r.status} />
            <VerifiedTag verified={r.verified} />
          </dd>
          <dt>Reference</dt>
          <dd>{r.ref || '—'}</dd>
          <dt>Face value</dt>
          <dd>{r.totalUnits.toLocaleString()} USDT</dd>
          <dt>Units</dt>
          <dd>{r.totalUnits.toLocaleString()} (1 unit pays 1 USDT)</dd>
          {r.unitPrice > 0n && (
            <>
              <dt>Discount</dt>
              <dd>
                {formatPercent(r.discountBps)} · {formatUsdt(r.unitPrice)} USDT
                per unit · {returnPercent(r.unitPrice)} return
              </dd>
              <dt>Investor cap</dt>
              <dd>{r.maxUnitsPerInvestor.toLocaleString()} units per wallet</dd>
            </>
          )}
          <dt>Due date</dt>
          <dd>{formatDate(r.dueDate)}</dd>
          <dt>Created</dt>
          <dd>{formatDate(r.createdAt)}</dd>
          <dt>Seller</dt>
          <dd>
            <code className="address">{r.seller}</code>
          </dd>
          <dt>Buyer</dt>
          <dd>
            <code className="address">{r.buyer}</code>
          </dd>
          <dt>Document hash</dt>
          <dd>
            <code className="address">{r.docHash}</code>
          </dd>
        </dl>
        <DocumentBadge docHash={r.docHash} />
        {r.unitPrice > 0n && <Funding receivable={r} />}
        {(r.status === 'Created' ||
          r.status === 'Listed' ||
          r.status === 'Funded' ||
          r.status === 'Settled' ||
          r.status === 'Defaulted') && <Payment receivable={r} grace={grace} />}
      </>
    )
  }

  return (
    <main className="panel">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>Receivable #{id}</h1>
      {body}
    </main>
  )
}

export default ReceivableDetail
