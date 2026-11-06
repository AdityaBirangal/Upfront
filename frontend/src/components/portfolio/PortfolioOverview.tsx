import { TrendingDown, TrendingUp } from 'lucide-react'
import { isAddressEqual } from 'viem'
import type { Address } from 'viem'
import { Skeleton } from '@/components/ui/skeleton'
import { useBlockTimes } from '@/chain.ts'
import type { HolderPayment, Investment } from '@/chain.ts'
import { cn } from '@/lib/utils'
import { buildLots, toNumber, valueAt, valueSeries } from '@/lib/portfolio.ts'
import { isAwaitingPayment, unitValue } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'
import ValueChart from './ValueChart.tsx'

type Holding = { receivable: Receivable; units: bigint; repaid: HolderPayment | undefined }

type Props = {
  wallet: Address
  holdings: Holding[]
  receivables: Receivable[]
  investments: Investment[]
  payments: HolderPayment[]
  now: bigint
}

const usdt = (n: number) => n.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Tile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn('mt-1 text-lg font-semibold tracking-tight', tone)}>
        {usdt(value)} <span className="text-muted-foreground text-xs font-normal">USDT</span>
      </dd>
    </div>
  )
}

/**
 * The portfolio at a glance, like an investing app: total value and gain, value over time,
 * and what's still to come.
 */
function PortfolioOverview({ wallet, holdings, receivables, investments, payments, now }: Props) {
  // A seller's own units aren't investments.
  const mine = investments.filter((i) => {
    const r = receivables.find((x) => x.id === i.id)
    return r && !isAddressEqual(r.seller, wallet)
  })
  const times = useBlockTimes([...mine.map((i) => i.blockNumber), ...payments.map((p) => p.blockNumber)])
  // Units still held, or paid out at settlement (which burns them).
  const kept = (id: bigint) => {
    const h = holdings.find((x) => x.receivable.id === id)
    return h ? (h.repaid?.units ?? h.units) : 0n
  }
  const lots = times.data ? buildLots(mine, payments, receivables, times.data, kept) : []
  const t = Number(now)
  const series = valueSeries(lots, t)
  const current = valueAt(lots, t)
  const gain = current.value - current.invested
  const gainPct = current.invested > 0 ? (gain / current.invested) * 100 : 0
  const up = gain >= 0

  // Still able to pay: the seller can only settle before the due date.
  const open = holdings.filter(
    ({ receivable, units }) => units > 0n && isAwaitingPayment(receivable) && now < receivable.dueDate,
  )
  const paidBack = payments.reduce((s, p) => s + toNumber(p.amount), 0)
  const toCome = open.reduce((s, h) => s + toNumber(unitValue(h.units)), 0)

  return (
    <div className="grid gap-4">
      <section className="bg-card rounded-xl border p-5">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div>
            <p className="text-muted-foreground text-sm">Total value</p>
            {times.isPending && mine.length > 0 ? (
              <Skeleton className="mt-2 h-12 w-56" />
            ) : (
              <>
                <p className="mt-1 text-5xl font-semibold tracking-[-0.04em]">
                  {usdt(current.value)}
                  <span className="text-muted-foreground ml-2 text-base font-normal tracking-normal">USDT</span>
                </p>
                <p className={cn('mt-2 inline-flex items-center gap-1.5 text-sm font-medium', up ? 'text-state-settled' : 'text-state-defaulted')}>
                  {up ? <TrendingUp className="size-4" aria-hidden /> : <TrendingDown className="size-4" aria-hidden />}
                  {up ? '+' : '−'}
                  {usdt(Math.abs(gain))} USDT ({up ? '+' : '−'}
                  {Math.abs(gainPct).toLocaleString([], { maximumFractionDigits: 2 })}%)
                  <span className="text-muted-foreground font-normal">all time</span>
                </p>
              </>
            )}
          </div>
          <dl className="grid grid-cols-3 gap-x-8 gap-y-3">
            <Tile label="Invested" value={current.invested} />
            <Tile label="Paid back" value={paidBack} tone="text-state-settled" />
            <Tile label="Still to come" value={toCome} />
          </dl>
        </div>

        <div className="mt-6">
          {times.isPending && mine.length > 0 ? (
            <Skeleton className="h-60 w-full" />
          ) : series.length > 1 ? (
            <ValueChart points={series} />
          ) : (
            <p className="text-muted-foreground py-10 text-center text-sm">The chart starts with your first purchase.</p>
          )}
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          Value grows in a straight line from what you paid to 1 USDT a unit at the due date, then counts the payout once
          it’s paid. Only units you still hold or were paid for are counted.
        </p>
      </section>

    </div>
  )
}

export default PortfolioOverview
