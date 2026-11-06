import { formatUnits } from 'viem'
import type { HolderPayment, Investment } from '@/chain.ts'
import { USDT_DECIMALS, annualise, unitValue } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'

/** USDT base units to a plain number, for charts only. Amounts shown as text use `Usdt`. */
export const toNumber = (value: bigint) => Number(formatUnits(value, USDT_DECIMALS))

/** One purchase: units bought at a price, worth 1 USDT each at the due date. */
type Lot = {
  receivable: Receivable
  paid: number
  face: number
  boughtAt: number
  /** When the lot closes: its payout, or its due date if nothing was paid. */
  endsAt: number
  /** Whether settlement paid this wallet. */
  repaid: boolean
}

export type ValuePoint = { t: number; value: number; invested: number }

/** Bought and not yet closed. Money only counts as invested while it's out. */
const isOpen = (lot: Lot, t: number) => t >= lot.boughtAt && t < lot.endsAt

/**
 * An open lot's value at time `t`, in USDT. Like a zero-coupon bond, it grows in a straight line
 * from the price paid to its face value at the due date. Once closed it's out of the portfolio: a
 * payout moves to earnings, and a lot still unpaid at the due date can't be paid any more, because
 * the contract only lets the seller settle before it.
 */
function lotValue(lot: Lot, t: number): number {
  if (!isOpen(lot, t)) return 0
  const due = Number(lot.receivable.dueDate)
  return lot.paid + ((lot.face - lot.paid) * (t - lot.boughtAt)) / (due - lot.boughtAt)
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
    const due = Number(receivable.dueDate)
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
        endsAt: paidAt === undefined ? due : Math.min(Number(paidAt), due),
        repaid: Boolean(payment),
      },
    ]
  })
}

/**
 * Value and money invested in open holdings over time, from the first purchase to `now`. Evenly
 * spaced samples, plus a point either side of each purchase and close, so steps land where they did.
 */
export function valueSeries(lots: Lot[], now: number, samples = 120): ValuePoint[] {
  if (lots.length === 0) return []
  const start = Math.min(...lots.map((l) => l.boughtAt))
  const end = Math.max(now, start + 60)
  const times = new Set<number>()
  for (let i = 0; i <= samples; i++) times.add(Math.round(start + ((end - start) * i) / samples))
  for (const lot of lots) {
    for (const t of [lot.boughtAt, lot.endsAt]) {
      if (t < start || t > end) continue
      times.add(t - 1)
      times.add(t)
    }
  }
  return [...times]
    .filter((t) => t >= start && t <= end)
    .sort((a, b) => a - b)
    .map((t) => ({
      t,
      value: lots.reduce((sum, lot) => sum + lotValue(lot, t), 0),
      invested: lots.reduce((sum, lot) => sum + (isOpen(lot, t) ? lot.paid : 0), 0),
    }))
}

/** The headline numbers at one moment. */
export function portfolioSummary(lots: Lot[], t: number) {
  const open = lots.filter((lot) => isOpen(lot, t))
  const closed = lots.filter((lot) => t >= lot.endsAt)
  return {
    /** What open holdings are worth now. */
    value: open.reduce((sum, lot) => sum + lotValue(lot, t), 0),
    /** Cost of open holdings. */
    invested: open.reduce((sum, lot) => sum + lot.paid, 0),
    /** Cost of everything ever bought. */
    investedToDate: lots.filter((lot) => t >= lot.boughtAt).reduce((sum, lot) => sum + lot.paid, 0),
    /** Profit on closed holdings, less anything lost to a default. */
    earned: closed.reduce((sum, lot) => sum + (lot.repaid ? lot.face : 0) - lot.paid, 0),
  }
}

export type Holding = { receivable: Receivable; units: bigint; repaid: HolderPayment | undefined }

export type HoldingFigures = Holding & {
  /** Units held now, or the units repaid once settlement has burned them. */
  shownUnits: bigint
  /** Cost of those units, or undefined while purchases load. */
  paid: bigint | undefined
  payout: bigint
  profit: bigint | undefined
  /** Unpaid at the due date. The contract only allows settlement before it, so nothing will come. */
  lost: boolean
  /** Simple annual rate on this holding, from purchase to payout or the due date. */
  annual: number | null
}

/**
 * One holding's numbers. Units given away by transfer take their share of the cost with them, so
 * the cost matches the units shown, the same way `buildLots` counts them.
 */
export function holdingFigures(
  holding: Holding,
  buys: Investment[] | undefined,
  times: Map<bigint, bigint> | undefined,
  now: bigint,
): HoldingFigures {
  const { receivable, units, repaid } = holding
  const shownUnits = units > 0n ? units : (repaid?.units ?? 0n)
  const lost = !repaid && (receivable.status === 'Defaulted' || now >= receivable.dueDate)
  const payout = repaid ? repaid.amount : lost ? 0n : unitValue(units)

  let paid: bigint | undefined
  if (buys) {
    const bought = buys.reduce((sum, b) => sum + b.units, 0n)
    const spent = buys.reduce((sum, b) => sum + b.paid, 0n)
    paid = bought === 0n ? 0n : (spent * (shownUnits < bought ? shownUnits : bought)) / bought
  }

  let annual: number | null = null
  if (buys && times && paid && !lost) {
    const dated = buys.flatMap((b) => {
      const t = times.get(b.blockNumber)
      return t === undefined ? [] : [{ weight: toNumber(b.paid), t: Number(t) }]
    })
    const weight = dated.reduce((sum, d) => sum + d.weight, 0)
    const end = repaid ? times.get(repaid.blockNumber) : receivable.dueDate
    if (weight > 0 && end !== undefined) {
      const boughtAt = dated.reduce((sum, d) => sum + d.weight * d.t, 0) / weight
      annual = annualise(toNumber(payout - paid) / toNumber(paid), Number(end) - boughtAt)
    }
  }

  return { ...holding, shownUnits, paid, payout, profit: paid === undefined ? undefined : payout - paid, lost, annual }
}
