import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { simulateContract, writeContract } from 'wagmi/actions'
import { Button } from '@/components/ui/button'
import { upfront } from '@/contracts.ts'
import { useTx } from '@/tx.ts'
import { config } from '@/wagmi.ts'
import ConfirmAction from './ConfirmAction.tsx'
import TxStatus from './TxStatus.tsx'

export type ReceivableAction = {
  label: string
  icon?: LucideIcon
  functionName:
    | 'verifyReceivable'
    | 'rejectReceivable'
    | 'cancelReceivable'
    | 'markDefault'
  /** Done message, shown after the transaction confirms. */
  done: string
  /** Asks before sending, for actions that can't be undone. */
  confirm?: { title: string; body: string }
  /** Primary for the expected action, destructive for one that closes the receivable. */
  tone?: 'primary' | 'destructive' | 'outline'
}

type Props = {
  id: bigint
  actions: ReceivableAction[]
}

/**
 * Buttons for one receivable, sharing one transaction status. The status stays after
 * the receivable changes and its buttons disappear, so the explorer link isn't lost.
 */
function ReceivableActions({ id, actions }: Props) {
  const tx = useTx()
  const [done, setDone] = useState('')

  if (actions.length === 0 && tx.phase === 'idle') return null

  function send(action: ReceivableAction) {
    setDone(action.done)
    return tx.run(async () => {
      const { request } = await simulateContract(config, {
        ...upfront,
        functionName: action.functionName,
        args: [id],
      })
      return writeContract(config, request)
    })
  }

  return (
    <div className="space-y-3">
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = action.icon
            const button = (
              <Button
                key={action.functionName}
                type="button"
                size="sm"
                variant={action.tone === 'primary' ? 'default' : 'outline'}
                className={
                  action.tone === 'destructive'
                    ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
                    : undefined
                }
                disabled={tx.busy}
                onClick={action.confirm ? undefined : () => void send(action)}
              >
                {Icon && <Icon />}
                {action.label}
              </Button>
            )
            return action.confirm ? (
              <ConfirmAction
                key={action.functionName}
                trigger={button}
                title={action.confirm.title}
                description={action.confirm.body}
                confirmLabel={action.label}
                destructive={action.tone === 'destructive'}
                onConfirm={() => void send(action)}
              />
            ) : (
              button
            )
          })}
        </div>
      )}
      <TxStatus tx={tx} done={done} />
    </div>
  )
}

export default ReceivableActions
