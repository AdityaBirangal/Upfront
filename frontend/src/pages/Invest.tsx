import { Link } from 'react-router'
import { isAddressEqual } from 'viem'
import type { Address } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import BuyForm from '../components/BuyForm.tsx'
import ReceivableList from '../components/ReceivableList.tsx'
import HoldingCard from '../components/HoldingCard.tsx'
import { BACKEND_URL, documentUrl } from '../backend.ts'
import { useNow } from '../useNow.ts'
import {
  useHolderPayments,
  useInvestments,
  useReceivables,
} from '../chain.ts'
import { upfront, usdt } from '../contracts.ts'
import {
  formatUsdt,
  returnPercent,
  timeToDue,
  unitsLeft,
} from '../receivables.ts'

type Props = {
  wallet: Address
}

function Invest({ wallet }: Props) {
  const { receivables, isPending, isError } = useReceivables()
  const listed = receivables.filter((r) => r.status === 'Listed').reverse()

  const balances = useReadContract({
    ...upfront,
    functionName: 'balanceOfBatch',
    args: [receivables.map(() => wallet), receivables.map((r) => r.id)],
    query: { enabled: receivables.length > 0 },
  })
  const held = (id: bigint) => {
    const index = receivables.findIndex((r) => r.id === id)
    return balances.data?.[index] ?? 0n
  }

  const money = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...usdt, functionName: 'balanceOf', args: [wallet] },
      { ...usdt, functionName: 'allowance', args: [wallet, upfront.address] },
    ],
  })
  const [usdtBalance, allowance] = money.data ?? []

  const investments = useInvestments({ investor: wallet })
  const paidFor = (id: bigint) =>
    (investments.data ?? [])
      .filter((investment) => investment.id === id)
      .reduce((sum, investment) => sum + investment.paid, 0n)

  const payments = useHolderPayments({ holder: wallet })
  const repaidFor = (id: bigint) =>
    (payments.data ?? []).find((payment) => payment.id === id)
  const now = useNow()

  // Sellers hold their own units until they sell, so those aren't investments. Settlement burns
  // units, so repaid holdings come from HolderPaid events.
  const holdings = receivables
    .flatMap((receivable, index) => {
      const units = balances.data?.[index] ?? 0n
      const repaid = repaidFor(receivable.id)
      return (units > 0n || repaid) &&
        !isAddressEqual(receivable.seller, wallet)
        ? [{ receivable, units, repaid }]
        : []
    })
    .reverse()

  return (
    <main className="panel">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>Invest</h1>
      <p>
        USDT balance:{' '}
        {money.isPending ? (
          '…'
        ) : money.isError || usdtBalance === undefined ? (
          <span className="form-error">couldn't read it from the chain.</span>
        ) : (
          <>
            <strong>{formatUsdt(usdtBalance)} USDT</strong>
            {usdtBalance === 0n && (
              <span className="form-error">
                {' '}
                · This wallet has no USDT, so it can't buy units yet.
              </span>
            )}
          </>
        )}
      </p>

      <h2>Marketplace</h2>
      <p className="hint">
        Each unit pays 1 USDT when the seller repays, before the due date. You
        pay less now, so the difference is your return.
      </p>
      <ReceivableList
        receivables={listed}
        isPending={isPending}
        isError={isError}
        empty="No receivables are listed right now."
        extra={(receivable) => (
          <>
            <p>
              <strong>{returnPercent(receivable.unitPrice)} return</strong> ·{' '}
              {timeToDue(receivable.dueDate)} ·{' '}
              {unitsLeft(receivable).toLocaleString()} units left · You hold{' '}
              {held(receivable.id).toLocaleString()}
            </p>
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
            <BuyForm
              receivable={receivable}
              wallet={wallet}
              held={held(receivable.id)}
              balance={usdtBalance}
              allowance={allowance}
            />
          </>
        )}
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
          {holdings.map(({ receivable, units, repaid }) => (
            <HoldingCard
              key={receivable.id}
              receivable={receivable}
              units={units}
              paid={investments.isSuccess ? paidFor(receivable.id) : undefined}
              repaid={repaid}
              now={now}
            />
          ))}
        </ul>
      )}
    </main>
  )
}

export default Invest
