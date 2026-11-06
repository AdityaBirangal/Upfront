import { formatUnits, isAddressEqual } from 'viem'
import type { Address, ContractFunctionReturnType, Hex } from 'viem'
import { upfrontAbi } from './generated/abis.ts'

// Matched by position with the contract's Status enum, so the order must stay the same.
export const STATUSES = [
  'None',
  'Created',
  'Listed',
  'Funded',
  'Settled',
  'Defaulted',
  'Rejected',
  'Cancelled',
] as const

export type Status = (typeof STATUSES)[number]

type ChainReceivable = ContractFunctionReturnType<
  typeof upfrontAbi,
  'view',
  'getReceivable'
>

export type Receivable = Omit<ChainReceivable, 'status'> & {
  id: bigint
  status: Status
}

export function toReceivable(id: bigint, data: ChainReceivable): Receivable {
  return { ...data, id, status: STATUSES[data.status] ?? 'None' }
}

const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000))

/** Same rules as verifyReceivable: open, before the due date, and not verified yet. */
export function canVerify(r: Receivable): boolean {
  return (
    (r.status === 'Created' || r.status === 'Listed' || r.status === 'Funded') &&
    !r.verified &&
    nowSeconds() < r.dueDate
  )
}

/** Same rules as listReceivable: Created and before the due date. Verification isn't needed. */
export function canList(r: Receivable): boolean {
  return r.status === 'Created' && nowSeconds() < r.dueDate
}

/** Same status and date rules as invest. */
export function canInvest(r: Receivable): boolean {
  return r.status === 'Listed' && nowSeconds() < r.dueDate
}

export function unitsLeft(r: Receivable): bigint {
  return r.totalUnits - r.unitsSold
}

/** Listed or Funded: waiting for the buyer to pay, or for a default. */
export function isAwaitingPayment(r: Receivable): boolean {
  return r.status === 'Listed' || r.status === 'Funded'
}

/**
 * Same rules as settle: Listed or Funded, and due. Anyone can settle a verified one, but only the
 * buyer an unverified one. `now` is unix seconds, from `useNow`, so buttons appear on time.
 */
export function canSettle(r: Receivable, now: bigint, caller?: Address): boolean {
  const allowed =
    r.verified || (caller !== undefined && isAddressEqual(caller, r.buyer))
  return isAwaitingPayment(r) && now >= r.dueDate && allowed
}

/** Same rules as markDefault: Listed or Funded, and the grace period after the due date is over. */
export function canMarkDefault(r: Receivable, now: bigint, grace: bigint): boolean {
  return isAwaitingPayment(r) && now > r.dueDate + grace
}

/** Units a holder can claim pay 1 USDT each, once Settled. */
export function claimValue(units: bigint): bigint {
  return units * UNIT
}

/** Same rules as cancelReceivable: Created or Listed, with no units sold. */
export function canCancel(r: Receivable): boolean {
  return (r.status === 'Created' || r.status === 'Listed') && r.unitsSold === 0n
}

/** Same rules as rejectReceivable: cancellable, and not verified. */
export function canReject(r: Receivable): boolean {
  return canCancel(r) && !r.verified
}

export const WHOLE_NUMBER = /^[1-9]\d*$/

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
const PDF_HEADER = '%PDF-'

export function documentProblem(bytes: ArrayBuffer): string | null {
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    return 'The PDF must be 5 MB or smaller.'
  }
  const header = new TextDecoder().decode(bytes.slice(0, PDF_HEADER.length))
  return header === PDF_HEADER ? null : 'That file is not a PDF.'
}

export async function hashDocument(bytes: ArrayBuffer): Promise<Hex> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  )
  return `0x${hex.join('')}`
}

export function formatDate(unixSeconds: bigint): string {
  return new Date(Number(unixSeconds) * 1000).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

// USDT on Whitechain Sepolia and the local mock both use 6 decimals.
export const USDT_DECIMALS = 6
/** USDT base units in one unit. Each unit pays exactly 1 USDT at settlement. */
export const UNIT = 10n ** BigInt(USDT_DECIMALS)
export const BPS = 10_000

/** Formats USDT base units. Never format amounts by hand. */
export function formatUsdt(value: bigint): string {
  const [whole, fraction = ''] = formatUnits(value, USDT_DECIMALS).split('.')
  return `${BigInt(whole).toLocaleString()}.${fraction.padEnd(2, '0')}`
}

const DISCOUNT = /^\d{1,2}(\.\d{1,2})?$/

/** Parses a discount like "3" or "2.5" into basis points, or null if it isn't between 0% and 100%. */
export function parseDiscount(text: string): number | null {
  const trimmed = text.trim()
  if (!DISCOUNT.test(trimmed)) return null
  const [whole, fraction = ''] = trimmed.split('.')
  const bps = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return bps > 0 && bps < BPS ? bps : null
}

/** Same rounding as listReceivable. */
export function unitPriceFor(discountBps: number): bigint {
  return (UNIT * BigInt(BPS - discountBps)) / BigInt(BPS)
}

export function formatPercent(bps: number): string {
  return `${(bps / 100).toLocaleString([], { maximumFractionDigits: 2 })}%`
}

/** Profit at settlement as a share of the price paid, e.g. 3.09% for a 3% discount. */
export function returnPercent(unitPrice: bigint): string {
  if (unitPrice === 0n) return '—'
  const bps = Number(((UNIT - unitPrice) * BigInt(BPS * 100)) / unitPrice) / 100
  return formatPercent(bps)
}

/** Whole days left, or a short phrase once it's under a day. */
export function timeToDue(dueDate: bigint): string {
  const seconds = Number(dueDate) - Date.now() / 1000
  if (seconds <= 0) return 'Past due'
  const days = Math.floor(seconds / 86_400)
  if (days >= 1) return `${days} ${days === 1 ? 'day' : 'days'} to due date`
  const hours = Math.floor(seconds / 3600)
  if (hours >= 1) return `${hours} ${hours === 1 ? 'hour' : 'hours'} to due date`
  const minutes = Math.max(1, Math.floor(seconds / 60))
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} to due date`
}

/** A short countdown like "2d 4h", "3h 12m" or "4m 05s". */
export function formatDuration(totalSeconds: bigint): string {
  const seconds = Number(totalSeconds > 0n ? totalSeconds : 0n)
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m ${secs.toString().padStart(2, '0')}s`
}
