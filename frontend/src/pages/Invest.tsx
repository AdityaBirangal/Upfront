import { Link } from 'react-router'
import { isAddressEqual } from 'viem'
import type { Address } from 'viem'
import { useReadContract } from 'wagmi'
import ReceivableList from '../components/ReceivableList.tsx'
import StatusBadge from '../components/StatusBadge.tsx'
import VerifiedTag from '../components/VerifiedTag.tsx'
import { useReceivables } from '../chain.ts'
import { upfront } from '../contracts.ts'

type Props = {
  wallet: Address
}

function Invest({ wallet }: Props) {
  const { receivables, isPending, isError } = useReceivables()
  const listed = receivables.filter((r) => r.status === 'Listed')

  const balances = useReadContract({
    ...upfront,
    functionName: 'balanceOfBatch',
    args: [receivables.map(() => wallet), receivables.map((r) => r.id)],
    query: { enabled: receivables.length > 0 },
  })
  // Sellers hold their own units until they sell, so those aren't investments.
  const holdings = receivables.flatMap((receivable, index) => {
    const units = balances.data?.[index] ?? 0n
    return units > 0n && !isAddressEqual(receivable.seller, wallet)
      ? [{ receivable, units }]
      : []
  })

  return (
    <main className="panel">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>Invest</h1>

      <h2>Marketplace</h2>
      <p className="hint">
        Listing and buying units aren't available on the deployed smart
        contract yet.
      </p>
      <ReceivableList
        receivables={listed}
        isPending={isPending}
        isError={isError}
        empty="No receivables are listed right now."
      />

      <h2>Portfolio</h2>
      {isPending || (receivables.length > 0 && balances.isPending) ? (
        <p>Loading holdings…</p>
      ) : balances.isError ? (
        <p className="form-error">Couldn't read balances from the chain.</p>
      ) : holdings.length === 0 ? (
        <p>This wallet holds no units yet.</p>
      ) : (
        <ul className="receivable-list">
          {holdings.map(({ receivable, units }) => (
            <li key={receivable.id} className="receivable">
              <div className="receivable-head">
                <strong>
                  #{receivable.id.toString()} · {receivable.ref}
                </strong>
                <span className="tags">
                  <StatusBadge status={receivable.status} />
                  <VerifiedTag verified={receivable.verified} />
                </span>
              </div>
              <p>
                {units.toLocaleString()} {units === 1n ? 'unit' : 'units'} ·
                Pays {units.toLocaleString()} USDT after settlement
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default Invest
