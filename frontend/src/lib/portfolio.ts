import { formatUnits } from 'viem'
import type { HolderPayment, Investment } from '@/chain.ts'
import { USDT_DECIMALS, unitValue } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'

/** USDT base units to a plain number, for charts only. Amounts shown as text use `Usdt`. */
export const toNumber = (value: bigint) => Number(formatUnits(value, USDT_DECIMALS))

/** One purchase: units bought at a price, worth 1 USDT each at the due date. */
type Lot = {
  receivable: Receivable
  paid: number
  face: number
  boughtAt: number
  /** When settlement paid this wallet, if it has. */
  paidAt: number | undefined
}

export type ValuePoint = { t: number; value: number; invested: number }

/**
 * A lot's value at time `t`, in USDT. Like a zero-coupon bond, it grows in a straight line from the
 * price paid to its face value at the due date. Once settled it's the cash paid out. The contract
 * only lets the seller settle before the due date, so a lot still unpaid at the due date is worth
 * nothing from then on, whether or not anyone has marked the default yet.
 */
function lotValue(lot: Lot, t: number): number {
  if (t < lot.boughtAt) return 0
  if (lot.paidAt !== undefined && t >= lot.paidAt) return lot.face
  const due = Number(lot.receivable.dueDate)
  if (t >= due) return 0
  const progress = Math.min(1, (t - lot.boughtAt) / (due - lot.boughtAt))
  return lot.paid + (lot.face - lot.paid) * progress
}

/**
 * This wallet's purchases with their block times. Purchases whose block time is unknown are left
 * out. Units given away by transfer are taken out of every purchase in that receivable evenly, so
 * the chart only counts units still held, or paid out at settlement: `kept` gives that count.
 */
export function buildLots(
  investments: Investment[],
  payments: HolderPayment[],
  receivables: Receivable[],
  times: Map<bigint, bigint>,
  kept: (id: bigint) => bigint,
): Lot[] {
  const bought = new Map<bigint, bigint>()
  for (const i of investments) bought.set(i.id, (bought.get(i.id) ?? 0n) + i.units)

  return investments.flatMap((investment) => {
    const receivable = receivables.find((r) => r.id === investment.id)
    const boughtAt = times.get(investment.blockNumber)
    if (!receivable || boughtAt === undefined) return []
    const payment = payments.find((p) => p.id === investment.id)
    const paidAt = payment ? times.get(payment.blockNumber) : undefined
    const total = bought.get(investment.id) ?? 0n
    const share = total > 0n ? Math.min(1, Number(kept(investment.id)) / Number(total)) : 0
    if (share === 0) return []
    return [
      {
        receivable,
        paid: toNumber(investment.paid) * share,
        face: toNumber(unitValue(investment.units)) * share,
        boughtAt: Number(boughtAt),
        paidAt: paidAt === undefined ? undefined : Number(paidAt),
      },
    ]
  })
}

/**
 * Portfolio value and money invested over time, from the first purchase to `now`. Evenly spaced
 * samples, plus a point either side of each purchase and payout, so steps land where they happened.
 */
export function valueSeries(lots: Lot[], now: number, samples = 120): ValuePoint[] {
  if (lots.length === 0) return []
  const start = Math.min(...lots.map((l) => l.boughtAt))
  const end = Math.max(now, start + 60)
  const times = new Set<number>()
  for (let i = 0; i <= samples; i++) times.add(Math.round(start + ((end - start) * i) / samples))
  for (const lot of lots) {
    for (const t of [lot.boughtAt, lot.paidAt, Number(lot.receivable.dueDate)]) {
      if (t === undefined || t < start || t > end) continue
      times.add(t - 1)
      times.add(t)
    }
  }
  return [...times]
    .filter((t) => t >= start - 1 && t <= end)
    .sort((a, b) => a - b)
    .map((t) => ({
      t,
      value: lots.reduce((sum, lot) => sum + lotValue(lot, t), 0),
      invested: lots.reduce((sum, lot) => sum + (t >= lot.boughtAt ? lot.paid : 0), 0),
    }))
}

/** The value series at one moment. */
export function valueAt(lots: Lot[], t: number) {
  return {
    value: lots.reduce((sum, lot) => sum + lotValue(lot, t), 0),
    invested: lots.reduce((sum, lot) => sum + (t >= lot.boughtAt ? lot.paid : 0), 0),
  }
}
