export type Receivable = {
  id: number
  ref: string
  buyer: string
  faceValue: number // whole USDT; 1 unit = 1 USDT
  dueDate: number // unix seconds
  docHash: string
  status: 'Created' | 'Accepted' | 'Rejected' | 'Listed' | 'Funded'
  // Set when listed. Prices are USDT base units, as in the smart contract.
  discountBps: number
  unitPrice: number
  maxUnitsPerInvestor: number
  unitsSold: number
}

export type Holding = {
  receivableId: number
  investor: string
  units: number
  paid: number // USDT base units
}

export const USDT = 1_000_000 // base units per USDT
export const WHOLE_NUMBER = /^[1-9]\d*$/

const DISCOUNT = /^\d+(\.\d{1,2})?$/

export function parseDiscount(percent: string): number | null {
  if (!DISCOUNT.test(percent)) return null
  const bps = Math.round(Number(percent) * 100)
  return bps > 0 && bps < 10000 ? bps : null
}

export function unitPriceFor(discountBps: number): number {
  return (USDT * (10000 - discountBps)) / 10000
}

export function formatUsdt(baseUnits: number): string {
  return (baseUnits / USDT).toLocaleString([], { maximumFractionDigits: 6 })
}

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
const PDF_HEADER = '%PDF-'

export function documentProblem(bytes: ArrayBuffer): string | null {
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    return 'The PDF must be 5 MB or smaller.'
  }
  const header = new TextDecoder().decode(bytes.slice(0, PDF_HEADER.length))
  return header === PDF_HEADER ? null : 'That file is not a PDF.'
}

export async function hashDocument(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  )
  return `0x${hex.join('')}`
}
