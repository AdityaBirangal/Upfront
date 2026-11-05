import { Link } from 'react-router'
import { isAddressEqual } from 'viem'
import type { Address } from 'viem'
import ReceivableActions from '../components/ReceivableActions.tsx'
import type { ReceivableAction } from '../components/ReceivableActions.tsx'
import ReceivableList from '../components/ReceivableList.tsx'
import { BACKEND_URL, documentUrl } from '../backend.ts'
import { useReceivables } from '../chain.ts'
import { canReject, canVerify } from '../receivables.ts'
import type { Receivable } from '../receivables.ts'

type Props = {
  wallet: Address
}

function actionsFor(receivable: Receivable): ReceivableAction[] {
  const actions: ReceivableAction[] = []
  if (canVerify(receivable)) {
    actions.push({
      label: 'Verify',
      functionName: 'verifyReceivable',
      done: 'Verified. Investors now see the Verified tag.',
      confirm: `Verify receivable #${receivable.id}? You confirm that you owe this amount by the due date. The tag can't be removed.`,
    })
  }
  if (canReject(receivable)) {
    actions.push({
      label: 'Reject',
      functionName: 'rejectReceivable',
      done: 'Rejected.',
      confirm: `Reject receivable #${receivable.id}? This closes it for good.`,
    })
  }
  return actions
}

function Buyer({ wallet }: Props) {
  const { receivables, isPending, isError } = useReceivables()
  const mine = receivables
    .filter((r) => isAddressEqual(r.buyer, wallet))
    .reverse()

  return (
    <main className="panel">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>Verify receivables</h1>
      <p className="hint">
        Receivables where this wallet is the buyer. Check the agreement, then
        Verify to confirm you owe the amount: investors see a Verified tag.
        Reject closes a receivable you don't recognise, as long as it isn't
        verified and no units are sold.
      </p>

      <ReceivableList
        receivables={mine}
        isPending={isPending}
        isError={isError}
        empty="No receivables name this wallet as the buyer."
        extra={(receivable) => (
          <>
            {BACKEND_URL && (
              <p>
                <a
                  href={documentUrl(receivable.docHash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open agreement PDF
                </a>
              </p>
            )}
            <ReceivableActions
              id={receivable.id}
              actions={actionsFor(receivable)}
            />
          </>
        )}
      />
    </main>
  )
}

export default Buyer
