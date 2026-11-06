import { CircleCheck, CircleX, ExternalLink, Loader2, Wallet } from 'lucide-react'
import { explorerTxUrl } from '@/contracts.ts'
import { cn } from '@/lib/utils'
import type { Tx } from '@/tx.ts'

type Props = {
  tx: Tx
  done?: string
  className?: string
}

const MESSAGES = {
  wallet: 'Confirm in your wallet…',
  pending: 'Waiting for the transaction to confirm…',
}

/** Wallet prompt, pending, confirmed or failed, with the explorer link once there is a hash. */
function TxStatus({ tx, done = 'Confirmed.', className }: Props) {
  if (tx.phase === 'idle') return null

  const { phase } = tx
  const url = tx.hash ? explorerTxUrl(tx.hash) : null
  const failed = phase === 'failed'
  const confirmed = phase === 'confirmed'
  const text =
    phase === 'confirmed' ? done : phase === 'failed' ? tx.error : MESSAGES[phase]
  const Icon = confirmed
    ? CircleCheck
    : failed
      ? CircleX
      : tx.phase === 'wallet'
        ? Wallet
        : Loader2

  return (
    <p
      className={cn(
        'flex items-start gap-2 text-sm',
        confirmed && 'text-state-settled',
        failed && 'text-destructive',
        !confirmed && !failed && 'text-muted-foreground',
        className,
      )}
      role={failed ? 'alert' : 'status'}
    >
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', tx.phase === 'pending' && 'animate-spin')}
        aria-hidden
      />
      <span className="min-w-0">
        {text}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-foreground ml-2 inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            View transaction
            <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
      </span>
    </p>
  )
}

export default TxStatus
