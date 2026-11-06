import { useState } from 'react'
import type { Address } from 'viem'
import { simulateContract, writeContract } from 'wagmi/actions'
import { upfront, usdt } from '../contracts.ts'
import {
  canSettle,
  formatUsdt,
  repayAmount,
} from '../receivables.ts'
import type { Receivable } from '../receivables.ts'
import { useTx } from '../tx.ts'
import { config } from '../wagmi.ts'
import DueCountdown from './DueCountdown.tsx'
import TxStatus from './TxStatus.tsx'

type Props = {
  receivable: Receivable
  wallet: Address
  /** The seller's USDT balance and approval for Upfront. Undefined while loading. */
  balance: bigint | undefined
  allowance: bigint | undefined
  now: bigint
}

/**
 * What the seller received from investors, and Settle: repay every holder 1 USDT per unit in one
 * transaction, approving USDT first if needed.
 */
function SellerPayout({ receivable, wallet, balance, allowance, now }: Props) {
  const [needsApprove, setNeedsApprove] = useState(false)
  const approveTx = useTx()
  const settleTx = useTx()
  const busy = approveTx.busy || settleTx.busy
  const started = approveTx.phase !== 'idle' || settleTx.phase !== 'idle'

  if (receivable.unitPrice === 0n) return null // never listed, so nothing sold or owed

  const received = receivable.unitsSold * receivable.unitPrice
  const owed = repayAmount(receivable)
  const profit = owed - received
  const settleable = canSettle(receivable, now, wallet)

  async function settle() {
    if (allowance === undefined) return
    const confirmed = window.confirm(
      `Repay ${formatUsdt(owed)} USDT to the holders of receivable #${receivable.id}? Every holder is paid in one transaction.`,
    )
    if (!confirmed) return
    approveTx.reset()
    settleTx.reset()

    const approve = allowance < owed
    setNeedsApprove(approve)
    if (approve) {
      const approved = await approveTx.run(async () => {
        const { request } = await simulateContract(config, {
          ...usdt,
          functionName: 'approve',
          args: [upfront.address, owed],
        })
        return writeContract(config, request)
      })
      if (!approved) return
    }

    await settleTx.run(async () => {
      const { request } = await simulateContract(config, {
        ...upfront,
        functionName: 'settle',
        args: [receivable.id],
      })
      return writeContract(config, request)
    })
  }

  return (
    <>
      <p>
        Received <strong>{formatUsdt(received)} USDT</strong> from investors
        for {receivable.unitsSold.toLocaleString()}{' '}
        {receivable.unitsSold === 1n ? 'unit' : 'units'}
      </p>
      <DueCountdown receivable={receivable} now={now} />

      {settleable && (
        <>
          <p>
            Repay <strong>{formatUsdt(owed)} USDT</strong> to settle:{' '}
            {formatUsdt(received)} back plus {formatUsdt(profit)} USDT profit
            for investors.
            {receivable.unitsSold < receivable.totalUnits &&
              ' Unsold units are burned.'}
          </p>
          {balance !== undefined && balance < owed && (
            <p className="form-error">
              This wallet has {formatUsdt(balance)} USDT, so it can't repay{' '}
              {formatUsdt(owed)} USDT yet.
            </p>
          )}
          <div className="receivable-actions">
            <button
              type="button"
              className="button"
              disabled={
                busy ||
                balance === undefined ||
                allowance === undefined ||
                balance < owed
              }
              onClick={settle}
            >
              Settle · repay {formatUsdt(owed)} USDT
            </button>
          </div>
        </>
      )}

      {started && (
        <ol className="steps">
          {needsApprove && (
            <li>
              Approve USDT:{' '}
              <TxStatus tx={approveTx} done="approved." className="inline" />
            </li>
          )}
          <li>
            Settle:{' '}
            {settleTx.phase === 'idle' ? (
              approveTx.phase === 'failed' ? (
                'not sent.'
              ) : (
                'waiting for the approval.'
              )
            ) : (
              <TxStatus
                tx={settleTx}
                done="settled. Every holder has been paid."
                className="inline"
              />
            )}
          </li>
        </ol>
      )}

      {receivable.status === 'Settled' && !started && (
        <p className="ok-text">
          Settled: you repaid {formatUsdt(owed)} USDT to investors.
        </p>
      )}
      {receivable.status === 'Defaulted' && (
        <p className="form-error">
          Defaulted: it wasn't repaid by the due date.
        </p>
      )}
    </>
  )
}

export default SellerPayout
