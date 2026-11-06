import { useQuery } from '@tanstack/react-query'
import { FileCheck2, FileWarning, Loader2 } from 'lucide-react'
import type { Hex } from 'viem'
import { Button } from '@/components/ui/button'
import { BACKEND_URL, documentUrl } from '@/backend.ts'
import { cn } from '@/lib/utils'
import { hashDocument } from '@/receivables.ts'

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

  let tone: 'ok' | 'warn' | 'muted' = 'muted'
  let title = 'Checking the document…'
  let detail = 'Downloading the PDF and hashing it in your browser.'
  if (!BACKEND_URL) {
    title = 'Document can’t be checked'
    detail = 'The backend address is not set.'
  } else if (check.isError) {
    tone = 'warn'
    title = 'Couldn’t download the document'
    detail = 'The document service may be offline. Try again later.'
  } else if (check.data === 'missing') {
    tone = 'warn'
    title = 'Document not found'
    detail = 'The backend has no document with this hash.'
  } else if (check.data === 'mismatch') {
    tone = 'warn'
    title = 'Document doesn’t match'
    detail = 'The stored PDF has a different hash from the one onchain. Don’t rely on it.'
  } else if (check.data === 'match') {
    tone = 'ok'
    title = 'Document matches the onchain hash'
    detail = 'The PDF was hashed in your browser and compared with the chain.'
  }

  const Icon = check.isPending && BACKEND_URL ? Loader2 : tone === 'ok' ? FileCheck2 : FileWarning

  return (
    <div
      role={check.data === 'mismatch' ? 'alert' : undefined}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        tone === 'ok' && 'border-state-settled/30 bg-state-settled/5',
        tone === 'warn' && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-5 shrink-0',
          tone === 'ok' && 'text-state-settled',
          tone === 'warn' && 'text-destructive',
          tone === 'muted' && 'text-muted-foreground',
          check.isPending && BACKEND_URL && 'animate-spin',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{detail}</p>
        {check.data === 'match' && (
          <Button variant="link" size="sm" className="mt-1 h-auto p-0" asChild>
            <a href={documentUrl(docHash)} target="_blank" rel="noreferrer">
              Open agreement PDF
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

export default DocumentBadge
