import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import ReceivableCard from '../components/ReceivableCard.tsx'
import type { Receivable } from '../receivables.ts'

type Props = {
  receivables: Receivable[]
  onChange: (receivables: Receivable[]) => void
}

function Buyer({ receivables, onChange }: Props) {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  function setStatus(target: Receivable, status: Receivable['status']) {
    onChange(
      receivables.map((r) => (r.id === target.id ? { ...r, status } : r)),
    )
  }

  function reject(receivable: Receivable) {
    if (window.confirm(`Reject ${receivable.ref}? This can't be undone.`)) {
      setStatus(receivable, 'Rejected')
    }
  }

  return (
    <main className="panel">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>Approve receivables</h1>

      {receivables.length === 0 ? (
        <p>No receivables yet.</p>
      ) : (
        <ul className="receivable-list">
          {receivables.map((receivable) => {
            const isPastDue = receivable.dueDate * 1000 <= now
            return (
              <ReceivableCard key={receivable.id} receivable={receivable}>
                {receivable.status === 'Created' && (
                  <>
                    {isPastDue && (
                      <p>The due date has passed, so this can't be accepted.</p>
                    )}
                    <div className="receivable-actions">
                      <button
                        type="button"
                        className="button"
                        disabled={isPastDue}
                        onClick={() => setStatus(receivable, 'Accepted')}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="button"
                        onClick={() => reject(receivable)}
                      >
                        Reject
                      </button>
                    </div>
                  </>
                )}
              </ReceivableCard>
            )
          })}
        </ul>
      )}
    </main>
  )
}

export default Buyer
