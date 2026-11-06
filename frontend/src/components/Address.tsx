import { Check, Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import type { Address as AddressType } from 'viem'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { explorerAddressUrl } from '@/contracts.ts'
import { cn } from '@/lib/utils'
import { shortAddress } from '@/receivables.ts'

type Props = {
  address: AddressType
  /** Show the whole address instead of 0x1234…abcd. */
  full?: boolean
  className?: string
}

/** A wallet address: short form, full address on hover, copy, and explorer link. */
function Address({ address, full = false, className }: Props) {
  const [copied, setCopied] = useState(false)
  const explorer = explorerAddressUrl(address)

  async function copy() {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked. The full address is still in the tooltip.
    }
  }

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <code className="truncate font-mono text-[0.8125rem]">
            {full ? address : shortAddress(address)}
          </code>
        </TooltipTrigger>
        <TooltipContent className="font-mono">{address}</TooltipContent>
      </Tooltip>
      <button
        type="button"
        onClick={copy}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-[3px]"
        aria-label={copied ? 'Address copied' : 'Copy address'}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      {explorer && (
        <a
          href={explorer}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-[3px]"
          aria-label="View address on explorer"
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </span>
  )
}

export default Address
