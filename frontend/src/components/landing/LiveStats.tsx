import { useEffect, useRef } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { formatUnits } from 'viem'
import { Skeleton } from '@/components/ui/skeleton'
import StatusBadge from '@/components/StatusBadge.tsx'
import { useInvestments, useReceivables } from '@/chain.ts'
import { explorerAddressUrl, upfront } from '@/contracts.ts'
import { LiveDot, SectionHead } from '@/components/landing/kit.tsx'
import { cn } from '@/lib/utils'
import { UNIT, USDT_DECIMALS } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'

const toNumber = (v: bigint) => Number(formatUnits(v, USDT_DECIMALS))

/** Totals across every receivable on the live contract. */
function totals(list: Receivable[]) {
  let invested = 0n
  let repaid = 0n
  let returns = 0n
  let settledPrincipal = 0n
  for (const r of list) {
    const paid = r.unitsSold * r.unitPrice
    invested += paid
    if (r.status === 'Settled') {
      repaid += r.unitsSold * UNIT
      returns += r.unitsSold * (UNIT - r.unitPrice)
      settledPrincipal += paid
    }
  }
  const returnPct = settledPrincipal > 0n ? (toNumber(returns) / toNumber(settledPrincipal)) * 100 : 0
  return { invested, repaid, returns, returnPct }
}

/** Counts up to `value` once it arrives, writing straight to the DOM. */
function CountUp({ value, decimals = 2, prefix = '', suffix = '' }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const el = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const node = el.current
    if (!node) return
    const write = (n: number) => (node.textContent = `${prefix}${n.toFixed(decimals)}${suffix}`)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return void write(value)
    const start = performance.now()
    const anim = { frame: 0 }
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1200, 1)
      write(value * (1 - Math.pow(1 - t, 3)))
      if (t < 1) anim.frame = requestAnimationFrame(tick)
    }
    anim.frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(anim.frame)
  }, [value, decimals, prefix, suffix])
  return (
    <span ref={el} className="tabular">
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  )
}

function Figure({
  label,
  value,
  prefix,
  tone,
  loading,
  note,
}: {
  label: string
  value: number
  prefix?: string
  tone?: string
  loading: boolean
  note?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 p-5 sm:p-6 md:p-8">
      <span className="text-muted-foreground text-sm">{label}</span>
      {loading ? (
        <Skeleton className="h-12 w-40" />
      ) : (
        <span className={cn('flex items-baseline gap-2 leading-none', tone)}>
          <span className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            <CountUp value={value} prefix={prefix} />
          </span>
          <span className="text-muted-foreground text-sm font-medium">USDT</span>
        </span>
      )}
      <span className="text-muted-foreground min-h-5 text-sm">{note}</span>
    </div>
  )
}

const COLS = 'sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_5.5rem_6.5rem]'

/** One deal as a strip of its units: filled by what sold, coloured by how it ended. */
function DealRow({ r }: { r: Receivable }) {
  const units = Math.min(Number(r.totalUnits), 20)
  const sold = Math.min(Number(r.unitsSold), units)
  const fill = r.status === 'Settled' ? 'bg-state-settled' : r.status === 'Defaulted' ? 'bg-state-defaulted' : 'bg-primary'
  return (
    <li className="border-t">
      <Link
        to={`/app/receivable/${r.id}`}
        className={cn(
          'group hover:bg-muted/50 grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2.5 px-6 py-4 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset md:px-8',
          COLS,
        )}
      >
        <span className="group-hover:text-primary truncate font-mono text-xs font-medium transition-colors">{r.ref}</span>
        <span
          className="order-last col-span-2 flex gap-[3px] sm:order-none sm:col-span-1"
          aria-label={`${r.unitsSold} of ${r.totalUnits} units sold`}
        >
          {Array.from({ length: units }, (_, i) => (
            <span key={i} className={cn('h-2 flex-1 rounded-full', i < sold ? fill : 'bg-muted')} />
          ))}
        </span>
        <span className="tabular hidden text-right text-sm sm:block">{toNumber(r.unitsSold * r.unitPrice).toFixed(2)}</span>
        <span className="flex justify-end">
          <StatusBadge status={r.status} />
        </span>
      </Link>
    </li>
  )
}

/** Real totals read from the live contract: what's been invested, repaid and earned, and each deal. */
function LiveStats() {
  const { receivables, isPending, isError } = useReceivables()
  const investments = useInvestments({})
  const t = totals(receivables)
  const investors = new Set((investments.data ?? []).map((i) => i.investor.toLowerCase())).size
  const settled = receivables.filter((r) => r.status === 'Settled').length
  const defaulted = receivables.filter((r) => r.status === 'Defaulted').length
  const verified = receivables.filter((r) => r.verified).length
  const contractUrl = explorerAddressUrl(upfront.address)

  const counts: { k: string; v: string }[] = [
    { k: 'deals', v: String(receivables.length) },
    { k: 'settled', v: String(settled) },
    { k: 'defaulted', v: String(defaulted) },
    { k: 'investors', v: investments.isPending ? '…' : String(investors) },
    { k: 'client-verified', v: receivables.length ? `${Math.round((verified / receivables.length) * 100)}%` : '—' },
  ]

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHead
          id="money"
          eyebrow={
            <>
              <LiveDot /> Live · Whitechain Sepolia
            </>
          }
          title="The money so far"
          lede="Read from the Upfront contract when this page loads. Nothing here is typed in by hand."
        />
        {contractUrl && (
          <Button variant="outline" asChild>
            <a href={contractUrl} target="_blank" rel="noreferrer">
              View the contract <ArrowUpRight aria-hidden />
            </a>
          </Button>
        )}
      </div>

      {isError ? (
        <p className="text-muted-foreground bg-card rounded-2xl border p-8 text-sm">
          Couldn’t reach Whitechain right now. Refresh the page to try again.
        </p>
      ) : (
        <div className="bg-card overflow-hidden rounded-2xl border">
          <div className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
            <Figure label="Invested" value={toNumber(t.invested)} tone="text-primary" loading={isPending} />
            <Figure label="Repaid to holders" value={toNumber(t.repaid)} loading={isPending} />
            <Figure
              label="Returns earned"
              value={toNumber(t.returns)}
              prefix="+"
              tone="text-yield"
              loading={isPending}
              note={
                !isPending && (
                  <span className="text-yield font-medium">
                    <CountUp value={t.returnPct} prefix="+" suffix="%" /> on settled deals
                  </span>
                )
              }
            />
          </div>

          <dl className="bg-muted/40 text-muted-foreground flex flex-wrap gap-x-8 gap-y-3 border-t px-6 py-4 text-sm md:px-8">
            {counts.map((c) => (
              <div key={c.k} className="flex items-baseline gap-1.5">
                <dt className="order-last">{c.k}</dt>
                <dd className="text-foreground tabular text-base font-semibold">{isPending ? '–' : c.v}</dd>
              </div>
            ))}
          </dl>

          {!isPending && receivables.length > 0 && (
            <div className="border-t">
              <div
                className={cn(
                  'text-muted-foreground hidden gap-x-6 px-6 py-3 font-mono text-[0.6875rem] tracking-[0.12em] uppercase sm:grid md:px-8',
                  COLS,
                )}
              >
                <span>Deal</span>
                <span>Units sold</span>
                <span className="text-right">USDT in</span>
                <span className="text-right">Status</span>
              </div>
              <ul>
                {[...receivables].reverse().map((r) => (
                  <DealRow key={r.id.toString()} r={r} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LiveStats
