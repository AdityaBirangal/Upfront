import type { Address } from 'viem'
import { cn } from '@/lib/utils'

/** A 5×5 mirrored pattern from the address, so wallets are easy to tell apart at a glance. */
function Identicon({ address, className }: { address: Address; className?: string }) {
  const hex = address.slice(2).toLowerCase()
  const hue = parseInt(hex.slice(0, 4), 16) % 360
  const cells: boolean[] = []
  for (let i = 0; i < 15; i++) cells.push(parseInt(hex[i + 4], 16) % 2 === 0)

  const rects = []
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (!cells[row * 3 + col]) continue
      rects.push(<rect key={`${row}-${col}`} x={col} y={row} width={1} height={1} />)
      if (col < 2) rects.push(<rect key={`${row}-${4 - col}`} x={4 - col} y={row} width={1} height={1} />)
    }
  }

  return (
    <svg
      viewBox="-0.5 -0.5 6 6"
      className={cn('size-6 shrink-0 rounded-full', className)}
      style={{ background: `oklch(0.93 0.04 ${hue})`, fill: `oklch(0.52 0.15 ${hue})` }}
      aria-hidden
    >
      {rects}
    </svg>
  )
}

export default Identicon
