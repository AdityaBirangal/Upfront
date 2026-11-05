import type { ContractFunctionReturnType, Hex } from 'viem'
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
