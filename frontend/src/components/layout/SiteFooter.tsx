import { ExternalLink } from 'lucide-react'
import type { Address } from 'viem'
import { access, explorerAddressUrl, upfront, usdt } from '@/contracts.ts'
import { cn } from '@/lib/utils'
import { shortAddress } from '@/receivables.ts'
import { targetChain } from '@/wagmi.ts'

const CONTRACTS: { label: string; address: Address }[] = [
  { label: 'Upfront', address: upfront.address },
  { label: 'UpfrontAccess', address: access.address },
  { label: 'USDT', address: usdt.address },
]

/** Verified contract links, and what in the demo is simulated. Shown on every page. */
function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('text-muted-foreground border-t text-xs', className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 md:flex-row md:items-start md:justify-between md:px-6 lg:px-8">
        <div className="space-y-1">
          <p>
            Testnet demo on {targetChain.name}, with test USDT.
          </p>
          <p>
            Simulated: an admin granting a role stands in for real business checks (KYB), and the
            client’s payment to the seller happens outside Upfront.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 md:justify-end" aria-label="Verified smart contracts">
          {CONTRACTS.map(({ label, address }) => {
            const url = explorerAddressUrl(address)
            return (
              <li key={label}>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    {label} <span className="font-mono">{shortAddress(address)}</span>
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : (
                  <span>
                    {label} <span className="font-mono">{shortAddress(address)}</span>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </footer>
  )
}

export default SiteFooter
