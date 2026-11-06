import { useState } from 'react'
import { CircleCheck, CircleX, HandCoins } from 'lucide-react'
import type { Address } from 'viem'
import { simulateContract, writeContract } from 'wagmi/actions'
import { Button } from '@/components/ui/button'
import { upfront, usdt } from '@/contracts.ts'
import { canSettle, formatUsdt, repayAmount } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'
import { useTx } from '@/tx.ts'
import { config } from '@/wagmi.ts'
import ConfirmAction from './ConfirmAction.tsx'
import ErrorNote from './ErrorNote.tsx'
import Steps from './Steps.tsx'
import { stepState } from '@/lib/steps.ts'
import TxStatus from './TxStatus.tsx'
import Usdt from './Usdt.tsx'

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
  const short = balance !== undefined && balance < owed

  async function settle() {
    if (allowance === undefined) return
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
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground text-xs">Received from investors</dt>
          <dd className="font-medium">
            <Usdt value={received} />
          </dd>
        </div>
        {(settleable || started) && (
          <>
            <div>
              <dt className="text-muted-foreground text-xs">To repay</dt>
              <dd className="font-medium">
                <Usdt value={owed} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Investors’ profit</dt>
              <dd className="text-yield font-medium">
                <Usdt value={profit} />
              </dd>
            </div>
          </>
        )}
      </dl>

      {settleable && (
        <>
          {receivable.unitsSold < receivable.totalUnits && (
            <p className="text-muted-foreground text-xs">
              {(receivable.totalUnits - receivable.unitsSold).toLocaleString()} unsold units are burned at
              settlement.
            </p>
          )}
          {short && (
            <ErrorNote>
              This wallet has {formatUsdt(balance)} USDT, so it can’t repay {formatUsdt(owed)} USDT yet.
            </ErrorNote>
          )}
          <ConfirmAction
            trigger={
              <Button size="sm" disabled={busy || balance === undefined || allowance === undefined || short}>
                <HandCoins />
                Settle and repay {formatUsdt(owed)} USDT
              </Button>
            }
            title={`Repay receivable #${receivable.id}?`}
            description={`You pay ${formatUsdt(owed)} USDT, and every holder is paid 1 USDT per unit in one transaction. If your approval is too low, your wallet asks you to approve USDT first.`}
            confirmLabel="Settle"
            onConfirm={() => void settle()}
          />
        </>
      )}

      {started &&
        (needsApprove ? (
          <Steps
            steps={[
              {
                label: 'Approve USDT',
                state: stepState(approveTx),
                detail: <TxStatus tx={approveTx} done="Approved." />,
              },
              {
                label: 'Settle',
                state: stepState(settleTx),
                detail:
                  settleTx.phase === 'idle' ? (
                    <p className="text-muted-foreground text-sm">
                      {approveTx.phase === 'failed' ? 'Not sent.' : 'Waiting for the approval.'}
                    </p>
                  ) : (
                    <TxStatus tx={settleTx} done="Settled. Every holder has been paid." />
                  ),
              },
            ]}
          />
        ) : (
          <TxStatus tx={settleTx} done="Settled. Every holder has been paid." />
        ))}

      {receivable.status === 'Settled' && !started && (
        <p className="text-state-settled flex items-center gap-2 text-sm">
          <CircleCheck className="size-4" aria-hidden />
          Settled. You repaid {formatUsdt(owed)} USDT to investors.
        </p>
      )}
      {receivable.status === 'Defaulted' && (
        <p className="text-state-defaulted flex items-center gap-2 text-sm">
          <CircleX className="size-4" aria-hidden />
          Defaulted. It wasn’t repaid by the due date.
        </p>
      )}
    </div>
  )
}

export default SellerPayout
