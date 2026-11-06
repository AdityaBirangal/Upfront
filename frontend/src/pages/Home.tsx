import { ArrowRight, BadgeCheck, Coins, FileCheck2, HandCoins, Lock, ShieldCheck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import SiteFooter from '@/components/layout/SiteFooter.tsx'
import { Logo } from '@/components/layout/SideNav.tsx'
import ThemeToggle from '@/components/ThemeToggle.tsx'

const STEPS: { icon: LucideIcon; who: string; text: string }[] = [
  {
    icon: FileCheck2,
    who: 'Seller',
    text: 'The builder registers the signed contract. The PDF stays offchain, and only its hash goes onchain.',
  },
  {
    icon: BadgeCheck,
    who: 'Buyer',
    text: 'The client checks the contract and verifies it from its own wallet. Investors see a Verified tag.',
  },
  {
    icon: Coins,
    who: 'Seller',
    text: 'The builder lists units of the repayment at a discount, with a cap on how many one investor can hold.',
  },
  {
    icon: Users,
    who: 'Investors',
    text: 'Investors buy units. Their USDT reaches the builder and the units reach them in the same transaction.',
  },
  {
    icon: HandCoins,
    who: 'Seller',
    text: 'Once the client pays, the builder settles before the due date. One transaction pays 1 USDT per unit to every holder.',
  },
]

const RULES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ShieldCheck, title: 'Approved participants', text: 'Only wallets with a role can create, verify, list, or invest.' },
  { icon: Coins, title: 'Atomic swap', text: 'USDT and units change hands together, or nothing moves.' },
  { icon: Users, title: 'Investor cap', text: 'No wallet can hold more units than the cap.' },
  {
    icon: Lock,
    title: 'Transfer rules',
    text: 'Units move only to approved investors, never to the seller or buyer, and only before the due date.',
  },
]

const EXAMPLE = [
  { label: 'Builder repays investors by the due date', pitch: '$100,000,000', demo: '10.00 USDT' },
  { label: 'Investors pay the builder today (3% discount)', pitch: '$97,000,000', demo: '9.70 USDT' },
  { label: 'Investors’ profit', pitch: '$3,000,000', demo: '0.30 USDT', yield: true },
]

function OpenApp({ size = 'default' }: { size?: 'default' | 'lg' }) {
  return (
    <Button size={size} asChild>
      <Link to="/app">
        Open the app
        <ArrowRight aria-hidden />
      </Link>
    </Button>
  )
}

function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 md:px-6 lg:px-8">
          <Link to="/" className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <OpenApp />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-20 px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <section className="max-w-3xl space-y-6">
          <p className="text-primary text-sm font-medium">Receivables financing on Whitechain</p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Big contracts shouldn’t wait for big banks.
          </h1>
          <p className="text-muted-foreground text-lg text-pretty">
            Upfront turns a signed project contract into funding. A company wins a large contract,
            sells units of its future repayment to investors at a discount, and gets USDT today.
          </p>
          <OpenApp size="lg" />
        </section>

        <section aria-labelledby="story" className="grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <h2 id="story" className="text-2xl font-semibold tracking-tight">
              The problem
            </h2>
            <p className="text-muted-foreground text-pretty">
              ABC Builder wins a $100M data centre project from a global tech company. Before it gets
              paid, it needs money for land, materials, machinery, and thousands of workers.
            </p>
            <p className="text-muted-foreground text-pretty">
              Banks are slow, want collateral, and depend on a few lenders. The client’s promise to
              pay is valuable, yet hard to turn into cash, and ordinary investors can’t take part.
            </p>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight">The fix</h2>
            <p className="text-muted-foreground text-pretty">
              The builder borrows against the contract itself. The client verifies it onchain, the
              repayment becomes units, and many investors buy those units below face value.
            </p>
            <p className="text-muted-foreground text-pretty">
              The builder gets USDT in minutes. When it settles, whoever holds the units is paid,
              even if they were resold.
            </p>
          </div>
        </section>

        <section aria-labelledby="how" className="space-y-6">
          <h2 id="how" className="text-2xl font-semibold tracking-tight">
            How it works
          </h2>
          <ol className="grid gap-3 md:grid-cols-5">
            {STEPS.map((step, index) => (
              <li key={index} className="bg-card space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                    <step.icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-muted-foreground tabular text-xs">{index + 1}</span>
                </div>
                <p className="text-sm font-medium">{step.who}</p>
                <p className="text-muted-foreground text-sm text-pretty">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground text-sm">
            An admin approves who can take part, but can’t move funds or change a receivable.
          </p>
        </section>

        <section aria-labelledby="money" className="space-y-6">
          <div className="space-y-2">
            <h2 id="money" className="text-2xl font-semibold tracking-tight">
              The money
            </h2>
            <p className="text-muted-foreground text-sm text-pretty">
              Illustrative numbers. The demo runs the same deal at testnet scale, because test USDT is
              limited. The smart contracts work the same at any size.
            </p>
          </div>
          <div className="bg-card overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-5 py-3 text-left font-medium" />
                  <th className="px-5 py-3 text-right font-medium">The pitch</th>
                  <th className="px-5 py-3 text-right font-medium">Testnet demo</th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE.map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="text-muted-foreground px-5 py-3">{row.label}</td>
                    <td className={`tabular px-5 py-3 text-right font-medium ${row.yield ? 'text-yield' : ''}`}>
                      {row.pitch}
                    </td>
                    <td className={`tabular px-5 py-3 text-right font-medium ${row.yield ? 'text-yield' : ''}`}>
                      {row.demo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground text-sm text-pretty">
            The main risk is that the builder doesn’t repay. If it doesn’t settle by the due date, the
            deal ends as Defaulted, publicly onchain. The discount is what pays investors for that risk.
          </p>
        </section>

        <section aria-labelledby="rules" className="space-y-6">
          <h2 id="rules" className="text-2xl font-semibold tracking-tight">
            Rules in the smart contract, not in the app
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {RULES.map((rule) => (
              <li key={rule.title} className="bg-card flex gap-4 rounded-xl border p-4">
                <rule.icon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{rule.title}</p>
                  <p className="text-muted-foreground text-sm">{rule.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card flex flex-col items-start gap-4 rounded-xl border p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="font-semibold tracking-tight">Try the whole flow on Whitechain Sepolia</p>
            <p className="text-muted-foreground text-sm">
              Connect a wallet. An admin assigns your role, then you can sell, verify, or invest.
            </p>
          </div>
          <OpenApp />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

export default Home
