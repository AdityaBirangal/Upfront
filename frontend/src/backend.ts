import type { Hex } from 'viem'

export const BACKEND_URL: string | undefined = import.meta.env.VITE_BACKEND_URL

const UPLOAD_ERRORS: Record<string, string> = {
  hash_mismatch: "The document doesn't match its hash. Choose the file again.",
  not_pdf: 'The backend says that file is not a PDF.',
  too_large: 'The PDF is too large for the backend.',
  invalid_hash: 'The document hash is not valid.',
  missing_file: 'The document was not sent. Choose the file again.',
  rate_limited: 'Too many uploads from this network. Wait a few minutes, then try again.',
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

  try {
    // The body is the raw PDF. The backend runs on Cloud Functions, where
    // multipart uploads don't work.
    const response = await fetch(documentUrl(hash), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: file,
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
