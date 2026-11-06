import { BadgeCheck, CheckCheck, FileCheck2 } from 'lucide-react'
import type { Address } from 'viem'
import Identicon from '@/components/Identicon.tsx'
import StatusBadge from '@/components/StatusBadge.tsx'
import Guilloche from '@/components/landing/Guilloche.tsx'
import { cn } from '@/lib/utils'

/* An illustrative deal, matching the pitch: $100M repaid at the due date, sold at a 3% discount. */
const SELLER: Address = '0x00dcb3a97e4f1c62d85a000000000000000000c1'
const CLIENT: Address = '0x02a87e19c4d63b0f5e12000000000000000000d7'
const INVESTORS: Address[] = [
  '0x01185d93c2a7e16f4b0d00000000000000000003',
  '0x00aa6e2c91b7d4f30a8e00000000000000000002',
  '0x03c95e2f8b7d1a96f4e300000000000000000006',
  '0x02f05c2e8b7d1a96f4e300000000000000000009',
]
const HASH = '0x9f2c4e81d07a3b6c…a3b4c5d6a41e'
const SEGMENTS = 30
const SOLD = 0.724

function Party({ address, name, role, tag }: { address: Address; name: string; role: string; tag: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Identicon address={address} className="size-8" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-muted-foreground text-xs">{role}</p>
      </div>
      {tag}
    </div>
  )
}

function Figure({ label, value, unit, className }: { label: string; value: string; unit?: string; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-3 py-3.5 sm:px-4">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={cn('tabular text-base leading-none font-semibold tracking-[-0.02em] whitespace-nowrap sm:text-lg', className)}>
        {value}
        {unit && <span className="text-muted-foreground ml-0.5 text-[0.625rem] font-medium tracking-normal sm:ml-1 sm:text-xs">{unit}</span>}
      </span>
    </div>
  )
}

/**
 * The hero object: one receivable, drawn like the instrument it is. Parties, terms, funding and the
 * agreement hash that ties the PDF to the chain.
 */
function ReceivableNote({ className }: { className?: string }) {
  const filled = Math.round(SEGMENTS * SOLD)
  return (
    <div className={cn('text-foreground relative mx-auto w-full max-w-[29rem]', className)}>
      {/* A second note behind, so it reads as one deal among many. */}
      <div
        className="bg-card/70 absolute inset-x-6 -top-4 h-40 rounded-2xl border shadow-sm md:-top-5 md:inset-x-8"
        aria-hidden
      />

      <figure
        className="bg-card relative overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgb(15_23_42/0.04),0_24px_60px_-28px_rgb(15_23_42/0.35)] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.02),0_30px_70px_-30px_rgb(0_0_0/0.8)]"
        aria-label="Example receivable: a $100M data centre contract, 72% sold to 184 investors at 0.97 USDT a unit"
      >
        <Guilloche className="text-primary pointer-events-none absolute -top-36 -right-36 size-[22rem] opacity-[0.16] dark:opacity-[0.22]" />

        {/* Header. */}
        <div className="relative flex items-start justify-between gap-4 px-5 pt-5 pb-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-muted-foreground flex items-center gap-2 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
              Receivable note
              <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 tracking-[0.08em]">Example</span>
            </p>
            <p className="text-lg leading-tight font-semibold tracking-[-0.02em]">Data centre build, phase 1</p>
            <p className="text-muted-foreground font-mono text-xs">
              RCV-0142 · <span className="hidden sm:inline">ERC-1155 · </span>due 6 Nov 2027
            </p>
          </div>
          <StatusBadge status="Listed" className="bg-card" />
        </div>

        {/* Parties. */}
        <div className="bg-card/80 relative mx-5 divide-y rounded-xl border backdrop-blur-[2px]">
          <Party
            address={SELLER}
            name="ABC Builder"
            role="Seller"
            tag={<span className="text-muted-foreground font-mono text-xs">0x00dc…00c1</span>}
          />
          <Party
            address={CLIENT}
            name="Global tech company"
            role="Client, pays on completion"
            tag={
              <span className="text-state-settled bg-state-settled/10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                <BadgeCheck className="size-3.5" aria-hidden /> Verified
              </span>
            }
          />
        </div>

        {/* Terms. */}
        <div className="mx-5 mt-4 grid grid-cols-3 divide-x rounded-xl border">
          <Figure label="Face value" value="100M" unit="USDT" />
          <Figure label="Unit price" value="0.97" unit="USDT" />
          <Figure label="Return" value="+3.09%" className="text-yield" />
        </div>

        {/* Funding. */}
        <div className="px-5 pt-5 pb-5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Units sold</span>
            <span className="tabular font-semibold">72.4M of 100M</span>
          </div>
          <div className="mt-2.5 flex h-7 gap-[3px]" role="img" aria-label="72% of units sold">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span
                key={i}
                className={cn('flex-1 origin-bottom rounded-[3px]', i < filled ? 'bg-primary' : 'bg-muted')}
                style={i < filled ? { animation: `seg-in 520ms cubic-bezier(.2,.7,.2,1) ${120 + i * 28}ms both` } : undefined}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex -space-x-1.5">
                {INVESTORS.map((a) => (
                  <Identicon key={a} address={a} className="ring-card size-5 ring-2" />
                ))}
              </span>
              <span className="text-muted-foreground text-xs">184 approved investors</span>
            </div>
            <span className="text-muted-foreground tabular text-xs">72%</span>
          </div>
        </div>

        {/* Proof. */}
        <div className="bg-muted/50 flex items-center gap-3 border-t px-5 py-3">
          <FileCheck2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-[0.625rem] tracking-[0.12em] uppercase">Agreement SHA-256</p>
            <p className="truncate font-mono text-xs">{HASH}</p>
          </div>
          <span className="text-state-settled shrink-0 text-xs font-medium">Matches onchain</span>
        </div>
      </figure>

      {/* What happens at the end. */}
      <div className="bg-card relative mt-4 flex items-center gap-3 rounded-xl border p-3 pr-4 shadow-[0_16px_40px_-20px_rgb(15_23_42/0.35)] md:absolute md:-bottom-12 md:-left-10 md:mt-0 dark:shadow-[0_16px_40px_-16px_rgb(0_0_0/0.7)]">
        <span className="bg-state-settled/15 text-state-settled flex size-9 shrink-0 items-center justify-center rounded-lg">
          <CheckCheck className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-[0.6875rem]">At the due date</p>
          <p className="text-sm font-medium">1 transaction pays all 184 holders</p>
        </div>
      </div>
    </div>
  )
}

export default ReceivableNote
