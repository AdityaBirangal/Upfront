import { useState } from 'react'
import { simulateContract, writeContract } from 'wagmi/actions'
import { upfront } from '../contracts.ts'
import { useTx } from '../tx.ts'
import { config } from '../wagmi.ts'
import TxStatus from './TxStatus.tsx'

export type ReceivableAction = {
  label: string
  functionName:
    | 'verifyReceivable'
    | 'rejectReceivable'
    | 'cancelReceivable'
    | 'settle'
    | 'claim'
    | 'markDefault'
  /** Done message, shown after the transaction confirms. */
  done: string
  /** Asks before sending, for actions that can't be undone. */
  confirm?: string
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
    if (action.confirm && !window.confirm(action.confirm)) return
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
    <>
      {actions.length > 0 && (
        <div className="receivable-actions">
          {actions.map((action) => (
            <button
              key={action.functionName}
              type="button"
              className="button"
              disabled={tx.busy}
              onClick={() => send(action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      <TxStatus tx={tx} done={done} />
    </>
  )
}

export default ReceivableActions
