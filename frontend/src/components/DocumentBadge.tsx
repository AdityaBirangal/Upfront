import { useQuery } from '@tanstack/react-query'
import type { Hex } from 'viem'
import { BACKEND_URL, documentUrl } from '../backend.ts'
import { hashDocument } from '../receivables.ts'

type Props = {
  docHash: Hex
}

/** Downloads the stored PDF, hashes it in the browser, and compares with the chain. */
function DocumentBadge({ docHash }: Props) {
  const check = useQuery({
    queryKey: ['document-check', docHash],
    enabled: Boolean(BACKEND_URL),
    retry: false,
    queryFn: async () => {
      const response = await fetch(documentUrl(docHash))
      if (response.status === 404) return 'missing'
      if (!response.ok) throw new Error(`Download failed: ${response.status}`)
      const actual = await hashDocument(await response.arrayBuffer())
      return actual === docHash.toLowerCase() ? 'match' : 'mismatch'
    },
  })

  if (!BACKEND_URL) {
    return <p className="badge">The backend address is not set, so the document can't be checked.</p>
  }
  if (check.isPending) return <p className="badge">Checking the document…</p>
  if (check.isError) {
    return <p className="badge warn">Couldn't download the document to check it.</p>
  }
  if (check.data === 'missing') {
    return <p className="badge warn">The backend has no document with this hash.</p>
  }
  if (check.data === 'mismatch') {
    return (
      <p className="badge warn" role="alert">
        Warning: the stored document doesn't match the onchain hash.
      </p>
    )
  }
  return (
    <p className="badge ok">
      ✓ Document matches onchain hash ·{' '}
      <a href={documentUrl(docHash)} target="_blank" rel="noreferrer">
        Open PDF
      </a>
    </p>
  )
}

export default DocumentBadge
