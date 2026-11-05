export type Receivable = {
  id: number
  ref: string
  buyer: string
  faceValue: number // whole USDT; 1 unit = 1 USDT
  dueDate: number // unix seconds
  docHash: string
  status: 'Created' | 'Accepted' | 'Rejected'
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
