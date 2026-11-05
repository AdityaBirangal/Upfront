import type { Address } from 'viem'
import { useInvestments } from '../chain.ts'
import { explorerTxUrl } from '../contracts.ts'
import { formatUsdt, shortAddress } from '../receivables.ts'
import type { Receivable } from '../receivables.ts'

type Props = {
  receivable: Receivable
}

/** Funding progress, holders, and every purchase, read from Invested events. */
function Funding({ receivable }: Props) {
  const investments = useInvestments({ id: receivable.id })
  const { unitsSold, totalUnits } = receivable
  const percent = totalUnits > 0n ? Number((unitsSold * 100n) / totalUnits) : 0

  const holders = new Map<Address, { units: bigint; paid: bigint }>()
  for (const investment of investments.data ?? []) {
    const holder = holders.get(investment.investor) ?? { units: 0n, paid: 0n }
    holder.units += investment.units
    holder.paid += investment.paid
    holders.set(investment.investor, holder)
  }

  return (
    <section>
      <h2>Funding</h2>
      <label className="field">
        {unitsSold.toLocaleString()} of {totalUnits.toLocaleString()} units
        sold ({percent}%) · Seller received{' '}
        {formatUsdt(unitsSold * receivable.unitPrice)} USDT
        <progress
          className="progress"
          value={Number(unitsSold)}
          max={Number(totalUnits)}
        />
      </label>

      {investments.isPending ? (
        <p>Loading purchases…</p>
      ) : investments.isError ? (
        <p className="form-error">Couldn't read purchases from the chain.</p>
      ) : investments.data.length === 0 ? (
        <p>No units sold yet.</p>
      ) : (
        <>
          <h3>Holders</h3>
          <ul className="plain-list">
            {[...holders].map(([investor, { units, paid }]) => (
              <li key={investor}>
                <code className="address" title={investor}>
                  {shortAddress(investor)}
                </code>{' '}
                · {units.toLocaleString()} {units === 1n ? 'unit' : 'units'} ·
                Paid {formatUsdt(paid)} USDT
              </li>
            ))}
          </ul>

          <h3>Purchases</h3>
          <ul className="plain-list">
            {investments.data.map((investment) => {
              const url = explorerTxUrl(investment.txHash)
              return (
                <li key={`${investment.txHash}-${investment.investor}`}>
                  <code className="address" title={investment.investor}>
                    {shortAddress(investment.investor)}
                  </code>{' '}
                  bought {investment.units.toLocaleString()} for{' '}
                  {formatUsdt(investment.paid)} USDT
                  {url && (
                    <>
                      {' '}
                      ·{' '}
                      <a href={url} target="_blank" rel="noreferrer">
                        View on explorer
                      </a>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

export default Funding
