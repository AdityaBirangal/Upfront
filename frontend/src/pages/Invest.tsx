import { useState } from 'react'
import { Link } from 'react-router'
import BuyForm from '../components/BuyForm.tsx'
import ReceivableCard from '../components/ReceivableCard.tsx'
import { USDT, formatUsdt } from '../receivables.ts'
import type { Holding, Receivable } from '../receivables.ts'
import type { Assignment } from '../roles.ts'
import { useNow } from '../useNow.ts'

const DAY_MS = 24 * 60 * 60 * 1000

type Props = {
  assignments: Assignment[]
  receivables: Receivable[]
  holdings: Holding[]
  onReceivablesChange: (receivables: Receivable[]) => void
  onHoldingsChange: (holdings: Holding[]) => void
}

function Invest({
  assignments,
  receivables,
  holdings,
  onReceivablesChange,
  onHoldingsChange,
}: Props) {
  const [selected, setSelected] = useState('')
  const now = useNow()

  const wallets = assignments
    .filter((a) => a.role === 'Investor')
    .map((a) => a.address)
  // Stands in for the connected wallet until wallets are integrated.
  const wallet = wallets.includes(selected) ? selected : wallets[0]

  const listed = receivables.filter((r) => r.status === 'Listed')
  const portfolio = holdings.filter((h) => h.investor === wallet)

  function heldUnits(receivable: Receivable) {
    const holding = portfolio.find((h) => h.receivableId === receivable.id)
    return holding ? holding.units : 0
  }

  function buy(receivable: Receivable, units: number) {
    const unitsSold = receivable.unitsSold + units
    const status = unitsSold === receivable.faceValue ? 'Funded' : 'Listed'
    onReceivablesChange(
      receivables.map((r) =>
        r.id === receivable.id ? { ...r, unitsSold, status } : r,
      ),
    )

    const paid = units * receivable.unitPrice
    const isExisting = heldUnits(receivable) > 0
    onHoldingsChange(
      isExisting
        ? holdings.map((h) =>
            h.investor === wallet && h.receivableId === receivable.id
              ? { ...h, units: h.units + units, paid: h.paid + paid }
              : h,
          )
        : [
            ...holdings,
            { receivableId: receivable.id, investor: wallet, units, paid },
          ],
    )
  }

  return (
    <main className="panel">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>Invest</h1>

      {wallets.length === 0 ? (
        <p>
          No wallet has the Investor role yet. Assign one on the{' '}
          <Link to="/app/admin">admin page</Link>.
        </p>
      ) : (
        <>
          <label className="field">
            Investing as
            <select
              className="input"
              value={wallet}
              onChange={(event) => setSelected(event.target.value)}
            >
              {wallets.map((address) => (
                <option key={address}>{address}</option>
              ))}
            </select>
          </label>

          <h2>Marketplace</h2>
          {listed.length === 0 ? (
            <p>No receivables are listed right now.</p>
          ) : (
            <ul className="receivable-list">
              {listed.map((receivable) => {
                const msLeft = receivable.dueDate * 1000 - now
                const daysLeft = Math.ceil(msLeft / DAY_MS)
                const returnPercent =
                  (receivable.discountBps / (10000 - receivable.discountBps)) *
                  100
                return (
                  <ReceivableCard key={receivable.id} receivable={receivable}>
                    <p>
                      {returnPercent.toFixed(2)}% return ·{' '}
                      {receivable.faceValue - receivable.unitsSold} units left
                      {msLeft > 0 &&
                        ` · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} to due date`}
                    </p>
                    {msLeft > 0 ? (
                      <BuyForm
                        key={wallet}
                        receivable={receivable}
                        wallet={wallet}
                        heldUnits={heldUnits(receivable)}
                        onBuy={(units) => buy(receivable, units)}
                      />
                    ) : (
                      <p>The due date has passed, so this can't be bought.</p>
                    )}
                  </ReceivableCard>
                )
              })}
            </ul>
          )}

          <h2>Portfolio</h2>
          {portfolio.length === 0 ? (
            <p>This wallet holds no units yet.</p>
          ) : (
            <ul className="receivable-list">
              {portfolio.map((holding) => {
                const receivable = receivables.find(
                  (r) => r.id === holding.receivableId,
                )
                const payout = holding.units * USDT
                return (
                  <li key={holding.receivableId} className="receivable">
                    <div className="receivable-head">
                      <strong>{receivable?.ref}</strong>
                      <span>{receivable?.status}</span>
                    </div>
                    <p>
                      {holding.units} {holding.units === 1 ? 'unit' : 'units'} ·
                      Paid {formatUsdt(holding.paid)} USDT · Expected payout{' '}
                      {formatUsdt(payout)} USDT · Profit{' '}
                      {formatUsdt(payout - holding.paid)} USDT
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </main>
  )
}

export default Invest
