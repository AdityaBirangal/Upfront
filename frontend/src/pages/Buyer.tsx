import { Link } from 'react-router'
import { isAddressEqual } from 'viem'
import type { Address } from 'viem'
import ReceivableList from '../components/ReceivableList.tsx'
import { useReceivables } from '../chain.ts'

type Props = {
  wallet: Address
}

function Buyer({ wallet }: Props) {
  const { receivables, isPending, isError } = useReceivables()
  const mine = receivables.filter((r) => isAddressEqual(r.buyer, wallet))

  return (
    <main className="panel">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>Approve receivables</h1>
      <p className="hint">
        Receivables where this wallet is the buyer. Accepting and rejecting
        aren't available on the deployed smart contract yet.
      </p>

      <ReceivableList
        receivables={mine}
        isPending={isPending}
        isError={isError}
        empty="No receivables name this wallet as the buyer."
        extra={(receivable) =>
          receivable.status === 'Created' && (
            <div className="receivable-actions">
              <button type="button" className="button" disabled>
                Accept
              </button>
              <button type="button" className="button" disabled>
                Reject
              </button>
            </div>
          )
        }
      />
    </main>
  )
}

export default Buyer
