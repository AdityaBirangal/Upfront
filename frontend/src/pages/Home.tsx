import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import SiteFooter from '@/components/layout/SiteFooter.tsx'
import { Logo } from '@/components/layout/SideNav.tsx'
import ThemeToggle from '@/components/ThemeToggle.tsx'
import Compare from '@/components/landing/Compare.tsx'
import DealCalculator from '@/components/landing/DealCalculator.tsx'
import FlowAnimation from '@/components/landing/FlowAnimation.tsx'
import Guilloche from '@/components/landing/Guilloche.tsx'
import LiveStats from '@/components/landing/LiveStats.tsx'
import ReceivableNote from '@/components/landing/ReceivableNote.tsx'
import Rules from '@/components/landing/Rules.tsx'
import { Eyebrow, LiveDot, SectionHead, WRAP } from '@/components/landing/kit.tsx'
import { explorerTxUrl } from '@/contracts.ts'
import { cn } from '@/lib/utils'

/** The demo run's settlement: one transaction paying both investors. */
const SETTLEMENT_TX = explorerTxUrl('0x54ec787e22d5c058def448bec01c57bfe7ccb9c50362ae54b8a94c6b079ca5b0')

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#returns', label: 'Returns' },
  { href: '#rules', label: 'Guarantees' },
  { href: '#live', label: 'Live data' },
]

const FACTS: { value: string; label: string }[] = [
  { value: 'Minutes', label: 'from listing to USDT' },
  { value: '1 tx', label: 'pays every unit holder' },
  { value: '24/7', label: 'no bank hours or cut-offs' },
  { value: '0', label: 'admin access to funds' },
]

type Role = 'Seller' | 'Client' | 'Investors'
const ROLE_DOT: Record<Role, string> = {
  Seller: 'bg-primary',
  Client: 'bg-state-funded',
  Investors: 'bg-yield',
}

const STEPS: { role: Role; title: string; body: string }[] = [
  { role: 'Seller', title: 'Upload the agreement', body: 'The PDF stays offchain. Its SHA-256 hash goes onchain.' },
  { role: 'Client', title: 'Verify it', body: 'The client checks the agreement and confirms it from its own wallet.' },
  { role: 'Seller', title: 'List units', body: 'Units of the repayment go on sale at a discount, say 0.97 USDT each.' },
  { role: 'Investors', title: 'Buy units', body: 'USDT reaches the seller and units reach the investor in one transaction.' },
  { role: 'Seller', title: 'Settle', body: 'Before the due date, one transaction pays 1 USDT per unit to every holder.' },
]

function OpenApp({ className }: { className?: string }) {
  return (
    <Button size="lg" asChild className={cn('h-11 px-5 text-[0.9375rem]', className)}>
      <Link to="/app">
        Open the app
        <ArrowRight aria-hidden />
      </Link>
    </Button>
  )
}

function Header() {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b border-border/70 backdrop-blur-lg">
      <div className={`${WRAP} flex h-16 items-center gap-8`}>
        <Link to="/" className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-label="Upfront home">
          <Logo />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button size="sm" asChild>
            <Link to="/app">
              Open the app
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

/** Faint drafting grid behind the hero, fading out from the top right. */
function Blueprint() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-50"
      style={{
        backgroundImage:
          'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        maskImage: 'radial-gradient(ellipse 70% 75% at 75% 20%, black 20%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 75% at 75% 20%, black 20%, transparent 70%)',
      }}
      aria-hidden
    />
  )
}

function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero: the thesis on the left, the instrument on the right. */}
        <section className="relative overflow-hidden">
          <Blueprint />
          <div
            className={`${WRAP} relative grid items-center gap-14 pt-14 pb-20 md:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] lg:gap-16 lg:pt-24 lg:pb-32`}
          >
            <div className="flex flex-col items-start gap-7">
              <a
                href="#live"
                className="bg-card text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-2.5 text-xs font-medium shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <LiveDot />
                Live on Whitechain Sepolia
                <span className="bg-border h-3 w-px" aria-hidden />
                <span className="text-foreground">See the numbers</span>
                <ArrowRight className="size-3" aria-hidden />
              </a>
              <h1 className="text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-[4.25rem]">
                Big contracts shouldn’t wait <span className="text-muted-foreground">for big banks.</span>
              </h1>
              <p className="text-muted-foreground max-w-xl text-lg leading-relaxed text-pretty">
                Upfront turns a signed project agreement into funding. Sell units of the repayment to approved
                investors at a discount, and get USDT today. When the client pays, one transaction pays every
                holder.
              </p>
              <div className="flex flex-wrap gap-3">
                <OpenApp />
                <Button size="lg" variant="outline" asChild className="h-11 px-5 text-[0.9375rem]">
                  <a href="#how">See how it works</a>
                </Button>
              </div>
            </div>
            <ReceivableNote className="lg:mr-0" />
          </div>
        </section>

        {/* At a glance. */}
        <section aria-label="At a glance" className="bg-card/60 border-y">
          <dl className={`${WRAP} grid grid-cols-2 gap-x-6 md:grid-cols-4 md:gap-x-0`}>
            {FACTS.map((f) => (
              <div key={f.value} className="flex flex-col gap-1.5 py-7 md:border-l md:px-8 md:py-10 md:first:border-l-0 md:first:pl-0">
                <dt className="text-muted-foreground order-last text-sm">{f.label}</dt>
                <dd className="tabular text-3xl font-semibold tracking-[-0.035em] md:text-4xl">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* The problem. */}
        <section aria-labelledby="why" className={`${WRAP} py-24 md:py-32`}>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
            <SectionHead
              id="why"
              eyebrow="The problem"
              title="Winning the contract is the easy part. Paying for it isn’t."
              lede="A builder wins a $100M data centre project. Before the client pays, it needs land, materials, machinery and thousands of workers. Banks are slow and want collateral, and ordinary investors can’t take part at all."
              className="lg:sticky lg:top-28"
            />
            <Compare />
          </div>
        </section>

        {/* How it works. */}
        <section id="how" aria-labelledby="how-title" className="bg-muted/40 scroll-mt-16 border-y">
          <div className={`${WRAP} py-24 md:py-32`}>
            <SectionHead
              id="how-title"
              eyebrow="How it works"
              title="From signed agreement to USDT, in five steps"
              lede="Each step is a transaction on Whitechain, signed from the wallet of the party it belongs to."
            />
            <div className="bg-card mt-12 rounded-2xl border p-4 shadow-xs md:p-8">
              <FlowAnimation />
            </div>
            <ol className="mt-12 grid gap-x-6 gap-y-8 lg:grid-cols-5">
              {STEPS.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 border-t pt-5 lg:flex lg:flex-col lg:gap-3">
                  <span className="text-muted-foreground tabular font-mono text-xs leading-6">0{i + 1}</span>
                  <div className="flex flex-col gap-2">
                    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
                      <span className={cn('size-1.5 rounded-full', ROLE_DOT[s.role])} aria-hidden />
                      {s.role}
                    </span>
                    <h3 className="font-semibold tracking-[-0.01em]">{s.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The economics. */}
        <section id="returns" aria-labelledby="returns-title" className={`${WRAP} scroll-mt-16 py-24 md:py-32`}>
          <SectionHead
            id="returns-title"
            eyebrow="The economics"
            title="Investors buy at a discount. The business gets paid today."
            lede="Every unit repays exactly 1 USDT at the due date. The discount is the investor’s return, fixed the moment they buy."
          />
          <DealCalculator className="mt-12" />
        </section>

        {/* Guarantees. */}
        <section id="rules" aria-labelledby="rules-title" className="bg-muted/40 scroll-mt-16 border-y">
          <div className={`${WRAP} py-24 md:py-32`}>
            <SectionHead
              id="rules-title"
              eyebrow="Enforced by the smart contract"
              title="Rules nobody can switch off"
              lede="These checks run inside the Upfront contract on every transaction, so no one, including the admin, can skip them."
            />
            <Rules className="mt-12" />
          </div>
        </section>

        {/* Live numbers. */}
        <section id="live" aria-labelledby="money" className={`${WRAP} scroll-mt-16 py-24 md:py-32`}>
          <LiveStats />
        </section>

        {/* Close. */}
        <section className={`${WRAP} pb-24 md:pb-32`}>
          <div className="bg-band text-band-foreground relative overflow-hidden rounded-3xl px-6 py-14 md:px-14 md:py-20">
            <Guilloche className="pointer-events-none absolute -right-40 -bottom-56 size-[40rem] opacity-[0.18] md:-right-24" />
            <div className="relative flex max-w-2xl flex-col items-start gap-6">
              <Eyebrow className="text-band-foreground/70">Testnet demo</Eyebrow>
              <h2 className="text-3xl leading-[1.05] font-semibold tracking-[-0.035em] text-balance md:text-5xl">
                Run a deal end to end on Whitechain Sepolia.
              </h2>
              <p className="text-band-foreground/80 max-w-lg text-lg leading-relaxed">
                Connect a wallet and take a receivable from upload to settlement with test USDT. Every transaction
                links to the explorer.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <OpenApp className="bg-band-foreground text-band hover:bg-band-foreground/90" />
                {SETTLEMENT_TX && (
                  <Button
                    size="lg"
                    variant="ghost"
                    asChild
                    className="text-band-foreground hover:bg-band-foreground/10 hover:text-band-foreground h-11 px-5 text-[0.9375rem]"
                  >
                    <a href={SETTLEMENT_TX} target="_blank" rel="noreferrer">
                      See a real settlement
                      <ArrowUpRight aria-hidden />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

export default Home
