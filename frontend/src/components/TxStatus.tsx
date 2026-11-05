import { explorerTxUrl } from '../contracts.ts'
import type { Tx } from '../tx.ts'

type Props = {
  tx: Tx
  done?: string
  className?: string
}

const MESSAGES = {
  wallet: 'Confirm in your wallet…',
  pending: 'Waiting for the transaction to confirm…',
  confirmed: '',
  failed: '',
}

function TxStatus({ tx, done = 'Confirmed.', className = '' }: Props) {
  if (tx.phase === 'idle') return null

  const url = tx.hash ? explorerTxUrl(tx.hash) : null
  const failed = tx.phase === 'failed'
  const text =
    tx.phase === 'confirmed' ? done : failed ? tx.error : MESSAGES[tx.phase]

  return (
    <p
      className={`tx-status ${failed ? 'form-error' : ''} ${className}`}
      role={failed ? 'alert' : 'status'}
    >
      {text}
      {url && (
        <>
          {' '}
          <a href={url} target="_blank" rel="noreferrer">
            View on explorer
          </a>
        </>
      )}
    </p>
  )
}

export default TxStatus
