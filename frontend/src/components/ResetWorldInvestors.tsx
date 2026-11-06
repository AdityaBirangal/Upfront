import { RotateCcw } from 'lucide-react'
import { useReadContract } from 'wagmi'
import { simulateContract, writeContract } from 'wagmi/actions'
import { Button } from '@/components/ui/button'
import type { gate } from '@/contracts.ts'
import { useTx } from '@/tx.ts'
import { config } from '@/wagmi.ts'
import ConfirmAction from './ConfirmAction.tsx'
import TxStatus from './TxStatus.tsx'

type Props = { contract: NonNullable<typeof gate> }

/** Lets an Admin run the World ID demo again, in one transaction. */
function ResetWorldInvestors({ contract }: Props) {
  const tx = useTx()
  const joined = useReadContract({ ...contract, functionName: 'joinedCount' })
  const count = Number(joined.data ?? 0n)

  function reset() {
    void tx.run(async () => {
      const { request } = await simulateContract(config, { ...contract, functionName: 'reset' })
      return writeContract(config, request)
    })
  }

  return (
    <div className="bg-card mb-6 rounded-xl border p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">World ID investors: {count}</p>
          <p className="text-muted-foreground text-xs">
            Reset removes these wallets, so the same human can join again.
          </p>
        </div>
        <ConfirmAction
          title="Reset World ID investors?"
          description={`This revokes the Investor role from ${count} wallet${count === 1 ? '' : 's'} that joined with World ID, and lets the same humans join again. Investors added by an admin aren't affected, and units stay with their holders.`}
          confirmLabel="Reset"
          destructive
          onConfirm={reset}
          trigger={
            <Button variant="outline" size="sm" disabled={count === 0 || tx.busy}>
              <RotateCcw aria-hidden />
              {tx.busy ? 'Resetting…' : 'Reset'}
            </Button>
          }
        />
      </div>
      <TxStatus tx={tx} done="World ID investors reset." className="mt-2" />
    </div>
  )
}

export default ResetWorldInvestors
