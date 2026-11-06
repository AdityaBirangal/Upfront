import { BadgeCheck } from 'lucide-react'
import type { Address } from 'viem'
import Identicon from '@/components/Identicon.tsx'
import Guilloche from '@/components/landing/Guilloche.tsx'
import { cn } from '@/lib/utils'

/* An illustrative raise, matching the pitch: a $100M contract, sold at 0.90 USDT a unit, so 90M to raise. */
const SELLER: Address = '0x00dcb3a97e4f1c62d85a000000000000000000c1'
const INVESTORS: Address[] = [
  '0x01185d93c2a7e16f4b0d00000000000000000003',
  '0x00aa6e2c91b7d4f30a8e00000000000000000002',
  '0x03c95e2f8b7d1a96f4e300000000000000000006',
]
const SOLD = 72

/**
 * The hero object: one raise, seen from the business raising it. Who's raising, how much is in
 * already, and the contract that backs it. Kept to what a first-time visitor needs.
 */
function ReceivableNote({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        'bg-card text-foreground relative mx-auto w-full max-w-[24rem] overflow-hidden rounded-2xl border p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_24px_60px_-28px_rgb(15_23_42/0.35)] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.02),0_30px_70px_-30px_rgb(0_0_0/0.8)]',
        className,
      )}
      aria-label={`Example raise: ABC Builder has raised 65.2M of 90M USDT against a 100M contract with a verified client, ${SOLD}% sold.`}
    >
      <Guilloche className="text-primary pointer-events-none absolute -top-32 -right-32 size-[18rem] opacity-[0.14] dark:opacity-[0.2]" />

      {/* Who's raising, and for what. */}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Identicon address={SELLER} className="size-9" />
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-[-0.01em]">ABC Builder</p>
            <p className="text-muted-foreground truncate text-sm">Data centre build</p>
          </div>
        </div>
        <span className="bg-primary/10 text-primary inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
          <span className="bg-primary size-1.5 animate-pulse rounded-full" aria-hidden />
          Raising
        </span>
      </div>

      {/* How much is in. */}
      <div className="relative mt-5">
        <p className="text-muted-foreground text-xs">Raised so far</p>
        <p className="tabular mt-1 flex items-baseline gap-1.5">
          <span className="text-3xl leading-none font-semibold tracking-[-0.035em]">65.2M</span>
          <span className="text-muted-foreground text-sm">of 90M USDT</span>
        </p>
        <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full" role="img" aria-label={`${SOLD}% raised`}>
          <div
            className="bg-primary h-full origin-left rounded-full"
            style={{ width: `${SOLD}%`, animation: 'bar-in 900ms cubic-bezier(.2,.7,.2,1) 150ms both' }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-2">
            <span className="flex -space-x-1.5">
              {INVESTORS.map((a) => (
                <Identicon key={a} address={a} className="ring-card size-5 ring-2" />
              ))}
            </span>
            <span className="text-muted-foreground">184 investors</span>
          </span>
          <span className="tabular font-semibold">{SOLD}%</span>
        </div>
      </div>

      {/* What backs it. */}
      <div className="bg-muted/50 relative mt-5 flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Backed by a contract with</p>
          <p className="flex items-center gap-1 truncate text-sm font-medium">
            Global tech company
            <BadgeCheck className="text-state-settled size-4 shrink-0" aria-label="verified" />
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-muted-foreground text-xs">Pays</p>
          <p className="tabular text-sm font-semibold">100M USDT</p>
        </div>
      </div>
    </figure>
  )
}

export default ReceivableNote
