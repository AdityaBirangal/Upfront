import { ArrowUpRight } from 'lucide-react'
import type { Address } from 'viem'
import GitHubIcon from '@/components/GitHubIcon.tsx'
import { REPO_URL, repoFileUrl } from '@/repo.ts'
import WhitechainLogo from '@/components/WhitechainLogo.tsx'
import SiteFooter from '@/components/layout/SiteFooter.tsx'
import Guilloche from '@/components/landing/Guilloche.tsx'
import LandingHeader from '@/components/landing/LandingHeader.tsx'
import { Eyebrow, WRAP } from '@/components/landing/kit.tsx'
import { Button } from '@/components/ui/button'
import { access, explorerAddressUrl, gate, upfront, usdt } from '@/contracts.ts'
import { targetChain } from '@/wagmi.ts'

type ContractRow = {
  name: string
  address: Address
  description: string
  /** Path in the repo. Missing for contracts Upfront didn't write. */
  source?: string
}

const CONTRACTS: ContractRow[] = [
  {
    name: 'Upfront',
    address: upfront.address,
    description:
      'ERC-1155 where each receivable is one token ID. Sellers raise USDT by selling units at a discount, and repay 1 USDT per unit to whoever holds them when it settles.',
    source: 'contracts/src/Upfront.sol',
  },
  {
    name: 'UpfrontAccess',
    address: access.address,
    description: 'Records which wallets may act as Seller, Buyer, or Investor. Roles are enumerable, so the app lists members straight from the chain.',
    source: 'contracts/src/UpfrontAccess.sol',
  },
  ...(gate
    ? [
        {
          name: 'InvestorGate',
          address: gate.address,
          description: 'Lets an investor who proved with World ID that they’re one unique human give their own wallet the Investor role.',
          source: 'contracts/src/InvestorGate.sol',
        },
      ]
    : []),
  {
    name: 'USDT',
    address: usdt.address,
    description: `Test USDT on ${targetChain.name}. Every raise and repayment settles in it. Not an Upfront contract.`,
  },
]

const LINK =
  'text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline'

function Contracts() {
  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b">
          <Guilloche className="pointer-events-none absolute -top-48 -right-48 size-[44rem] opacity-[0.12]" />
          <div className={`${WRAP} relative flex flex-col items-start gap-6 py-20 md:py-28`}>
            <Eyebrow>
              <WhitechainLogo className="size-4" />
              {targetChain.name}
            </Eyebrow>
            <h1 className="max-w-3xl text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">
              Smart contracts <span className="text-muted-foreground">and their source.</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed text-pretty">
              Every address the app talks to, with its code on GitHub and its page on the explorer.
            </p>
            <Button size="lg" variant="outline" asChild className="h-11 px-5 text-[0.9375rem]">
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                <GitHubIcon />
                Full source code
                <ArrowUpRight aria-hidden />
              </a>
            </Button>
          </div>
        </section>

        <section aria-label="Contracts" className={`${WRAP} py-16 md:py-24`}>
          <ul className="grid gap-4 md:grid-cols-2">
            {CONTRACTS.map(({ name, address, description, source }) => {
              const explorer = explorerAddressUrl(address)
              return (
                <li key={name} className="bg-card flex flex-col gap-4 rounded-2xl border p-6 shadow-xs md:p-8">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-semibold tracking-[-0.02em]">{name}</h2>
                    <p className="font-mono text-xs break-all">{address}</p>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed text-pretty">{description}</p>
                  <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-2">
                    {source && (
                      <a href={repoFileUrl(source)} target="_blank" rel="noreferrer" className={LINK}>
                        <GitHubIcon className="size-3.5" />
                        {source.split('/').pop()}
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      </a>
                    )}
                    {explorer && (
                      <a href={explorer} target="_blank" rel="noreferrer" className={LINK}>
                        View on explorer
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

export default Contracts
