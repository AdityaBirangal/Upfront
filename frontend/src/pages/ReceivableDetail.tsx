import { Link, useParams } from 'react-router'
import { useReadContract } from 'wagmi'
import DocumentBadge from '../components/DocumentBadge.tsx'
import { upfront } from '../contracts.ts'
import { formatDate, toReceivable } from '../receivables.ts'
import { revertName } from '../tx.ts'

const ID = /^[1-9]\d*$/

function ReceivableDetail() {
  const { id = '' } = useParams()
  const isValidId = ID.test(id)
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
          <dd>{r.status}</dd>
          <dt>Reference</dt>
          <dd>{r.ref || '—'}</dd>
          <dt>Face value</dt>
          <dd>{r.totalUnits.toLocaleString()} USDT</dd>
          <dt>Units</dt>
          <dd>{r.totalUnits.toLocaleString()} (1 unit pays 1 USDT)</dd>
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
