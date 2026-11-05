import type { Hex } from 'viem'

export const BACKEND_URL: string | undefined = import.meta.env.VITE_BACKEND_URL

const UPLOAD_ERRORS: Record<string, string> = {
  hash_mismatch: "The document doesn't match its hash. Choose the file again.",
  not_pdf: 'The backend says that file is not a PDF.',
  too_large: 'The PDF is too large for the backend.',
  invalid_hash: 'The document hash is not valid.',
  missing_file: 'The document was not sent. Choose the file again.',
}

export function documentUrl(hash: Hex): string {
  return `${BACKEND_URL}/documents/${hash}`
}

/** Stores the PDF on the backend. Returns a message on failure, or null. */
export async function uploadDocument(
  file: File,
  hash: Hex,
): Promise<string | null> {
  if (!BACKEND_URL) return 'The backend address is not set (VITE_BACKEND_URL).'

  const body = new FormData()
  body.append('hash', hash)
  body.append('file', file)
  try {
    const response = await fetch(`${BACKEND_URL}/documents`, {
      method: 'POST',
      body,
    })
    if (response.ok) return null
    const { error } = (await response.json().catch(() => ({}))) as {
      error?: string
    }
    return (
      (error && UPLOAD_ERRORS[error]) ??
      `The upload failed (status ${response.status}).`
    )
  } catch {
    return "Couldn't reach the backend to upload the document."
  }
}
