import { cn } from '@/lib/utils'
import { formatUsdt } from '@/receivables.ts'

type Props = {
  /** USDT base units (6 decimals). */
  value: bigint
  /** Prefix with + or −. */
  signed?: boolean
  className?: string
}

/** A USDT amount in tabular figures. Never format amounts by hand. */
function Usdt({ value, signed = false, className }: Props) {
  const negative = value < 0n
  const sign = signed ? (negative ? '−' : '+') : negative ? '−' : ''
  return (
    <span className={cn('tabular whitespace-nowrap', className)}>
      {sign}
      {formatUsdt(negative ? -value : value)}
      <span className="text-muted-foreground ml-1 text-[0.8em] font-normal">
        USDT
      </span>
    </span>
  )
}

export default Usdt
