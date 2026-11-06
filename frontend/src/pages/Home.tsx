import { ArrowRight, ArrowUpRight, EyeOff, ScanFace, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import WhitechainLogo from '@/components/WhitechainLogo.tsx'
import WorldLogo from '@/components/WorldLogo.tsx'
import SiteFooter from '@/components/layout/SiteFooter.tsx'
import Compare from '@/components/landing/Compare.tsx'
import DealCalculator from '@/components/landing/DealCalculator.tsx'
import FlowAnimation from '@/components/landing/FlowAnimation.tsx'
import Guilloche from '@/components/landing/Guilloche.tsx'
import HeroBackdrop from '@/components/landing/HeroBackdrop.tsx'
import HowWeEarn from '@/components/landing/HowWeEarn.tsx'
import LandingHeader, { OpenApp } from '@/components/landing/LandingHeader.tsx'
import PassportCredential from '@/components/landing/PassportCredential.tsx'
import LiveStats from '@/components/landing/LiveStats.tsx'
import ReceivableNote from '@/components/landing/ReceivableNote.tsx'
import Rules from '@/components/landing/Rules.tsx'
import { Eyebrow, LiveDot, SectionHead, WRAP } from '@/components/landing/kit.tsx'
import { explorerTxUrl } from '@/contracts.ts'
import { cn } from '@/lib/utils'

/** The demo run's settlement: one transaction paying both investors. */
const SETTLEMENT_TX = explorerTxUrl('0x54ec787e22d5c058def448bec01c57bfe7ccb9c50362ae54b8a94c6b079ca5b0')

const FACTS: { value: string; label: string }[] = [
  { value: 'Minutes', label: 'to USDT once units sell' },
  { value: '1 tx', label: 'pays every unit holder' },
  { value: '24/7', label: 'no bank hours or cut-offs' },
  { value: '0', label: 'admin access to funds' },
]

const ONBOARDING: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ScanFace,
    title: 'One human, one investor wallet',
    body: 'World ID proves the investor is a real, unique person. The InvestorGate contract checks the proof and grants the role, so one person can’t open many wallets.',
  },
  {
    icon: EyeOff,
    title: 'Nothing else is shared',
    body: 'No name, no documents, no data stored by Upfront. Only the proof reaches the chain.',
  },
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
  { role: 'Seller', title: 'List units', body: 'Units of the repayment go on sale at a discount, say 0.90 USDT each.' },
  {
    role: 'Investors',
    title: 'Buy units',
    body: 'USDT reaches the seller and units reach the investor in one transaction.',
  },
  {
    role: 'Seller',
    title: 'Settle',
    body: 'Before the due date, one transaction pays 1 USDT per unit to every holder.',
  },
]

function Home() {
  const { hash } = useLocation()

  // Arriving from another page with a section hash: scroll once the section has rendered.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />

      <main className="flex-1">
        {/*
          Hero: the site the money builds, by day in light mode and at blue hour in dark mode.
          The thesis on the left and the receivable on the right, with the footage behind both.
        */}
        <section className="bg-background text-foreground relative">
          <HeroBackdrop />
          <div
            className={`${WRAP} relative grid items-center gap-14 pt-14 pb-20 md:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] lg:gap-16 lg:pt-24 lg:pb-32`}
          >
            <div className="flex flex-col items-start gap-7">
              <a
                href="#live"
                className="bg-card/70 text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-2.5 text-xs font-medium shadow-xs backdrop-blur-md transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <LiveDot />
                <WhitechainLogo className="size-4" />
                Live on Whitechain Sepolia
                <span className="bg-border h-3 w-px" aria-hidden />
                <span className="text-foreground">See the numbers</span>
                <ArrowRight className="size-3" aria-hidden />
              </a>
              <h1 className="text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance [text-shadow:0_0_24px_var(--background),0_0_8px_var(--background)] sm:text-6xl lg:text-[4.25rem]">
                Big contracts shouldn’t wait <span className="text-muted-foreground">for big banks.</span>
              </h1>
              <p className="text-foreground/80 max-w-xl text-lg leading-relaxed text-pretty [text-shadow:0_0_14px_var(--background),0_0_6px_var(--background),0_0_2px_var(--background)]">
                Upfront turns a signed project agreement into funding. Sell units of the repayment to approved investors
                at a discount, and get USDT today. When the seller settles, one transaction pays every holder.
              </p>
              <div className="flex flex-wrap gap-3">
                <OpenApp />
                <Button size="lg" variant="outline" asChild className="h-11 px-5 text-[0.9375rem]">
                  <a href="#how">See how it works</a>
                </Button>
              </div>
            </div>
            <ReceivableNote />
          </div>
        </section>

        {/* At a glance. */}
        <section aria-label="At a glance" className="bg-card/60 border-b">
          <dl className={`${WRAP} grid grid-cols-2 gap-x-6 md:grid-cols-4 md:gap-x-0`}>
            {FACTS.map((f) => (
              <div
                key={f.value}
                className="flex flex-col gap-1.5 py-7 md:border-l md:px-8 md:py-10 md:first:border-l-0 md:first:pl-0"
              >
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

        {/* How we fix it: the answer to the problem above. */}
        <section id="how" aria-labelledby="how-title" className="bg-muted/40 scroll-mt-16 border-y">
          <div className={`${WRAP} py-24 md:py-32`}>
            <SectionHead
              id="how-title"
              eyebrow="How we fix it"
              title="The signed contract raises the money. No bank, no collateral."
              lede="The builder sells units of what the client will pay, gets USDT within minutes of a sale, and anyone approved can invest. Five steps, each a transaction on Whitechain signed from the wallet of the party it belongs to."
            />
            <div className="bg-card mt-12 rounded-2xl border p-4 shadow-xs md:p-8">
              <FlowAnimation />
            </div>
            <ol className="mt-12 grid gap-x-6 gap-y-8 lg:grid-cols-5">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 border-t pt-5 lg:flex lg:flex-col lg:gap-3"
                >
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

        {/* Investor onboarding. */}
        <section id="onboard" aria-labelledby="onboard-title" className={`${WRAP} scroll-mt-16 py-24 md:py-32`}>
          <SectionHead
            id="onboard-title"
            eyebrow={
              <span className="inline-flex items-center gap-2">
                <WorldLogo className="size-4" />
                Investor onboarding with World ID
              </span>
            }
            title="Investors onboard themselves with World ID"
            lede="No forms, no documents, no waiting on an admin. An investor proves with World ID that they’re one unique human, and the contract gives their wallet the Investor role on the spot."
          />

          {/* OFAC screening: the headline. */}
          <div className="bg-band text-band-foreground relative mt-12 overflow-hidden rounded-3xl px-6 py-10 md:px-12 md:py-14">
            <Guilloche className="pointer-events-none absolute -top-40 -right-40 size-[32rem] opacity-[0.12]" />
            <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-14">
              <div className="flex flex-col items-start gap-5">
                <div className="flex flex-wrap items-center gap-3">
                  <WorldLogo wordmark className="h-7 w-auto" />
                  <span className="bg-band-foreground/15 rounded-full px-2.5 py-1 text-xs font-medium">Upcoming</span>
                </div>
                <h3 className="flex items-start gap-3 text-3xl leading-[1.08] font-semibold tracking-[-0.035em] text-balance md:text-5xl">
                  <ShieldCheck className="mt-1 size-8 shrink-0 md:size-11" aria-hidden />
                  OFAC sanctions screening
                </h3>
                <p className="text-band-foreground/80 text-lg leading-relaxed text-pretty md:text-xl">
                  An investor presents a passport credential through World ID. If it isn’t from an OFAC-sanctioned
                  country, their wallet joins as an investor, and Upfront never sees the passport.
                </p>
                <p className="border-band-foreground/30 text-band-foreground/70 border-l-2 pl-4 text-sm leading-relaxed text-pretty md:text-base">
                  For regulated deals, we intend to add World ID’s nationality check as one input to sanctions screening.
                  It’s in preview today, so we didn’t build it.
                </p>
                <Link
                  to="/future#kyc"
                  className="text-band-foreground inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                >
                  See the plan
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
              <PassportCredential />
            </div>
          </div>

          {/* Live today. */}
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {ONBOARDING.map(({ icon: Icon, title, body }) => (
              <li key={title} className="bg-card flex gap-4 rounded-2xl border p-5 shadow-xs md:p-6">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="flex flex-wrap items-center gap-2 font-semibold tracking-[-0.01em]">
                    {title}
                    <span className="bg-state-settled/15 text-state-settled rounded-full px-2 py-0.5 text-[0.6875rem] font-medium">
                      Live
                    </span>
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ul>
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

        {/* Business model. */}
        <section id="earn" aria-labelledby="earn-title" className="scroll-mt-16 border-t">
          <div className={`${WRAP} py-24 md:py-32`}>
            <SectionHead
              id="earn-title"
              eyebrow="Business model"
              title="How Upfront earns"
              lede="A small fee on the money a seller raises. Investors don’t pay anything on top of the price of a unit."
            />
            <HowWeEarn className="mt-12" />
            <Button variant="outline" asChild className="mt-10">
              <Link to="/business">
                See the full business model
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
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
              <div className="flex items-center gap-3">
                <WhitechainLogo className="size-7" />
                <Eyebrow className="text-band-foreground/70">Testnet demo</Eyebrow>
              </div>
              <h2 className="text-3xl leading-[1.05] font-semibold tracking-[-0.035em] text-balance md:text-5xl">
                Run a deal end to end on Whitechain Sepolia.
              </h2>
              <p className="text-band-foreground/80 max-w-lg text-lg leading-relaxed">
                Connect a wallet and take a receivable from upload to settlement with test USDT. Every transaction links
                to the explorer.
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
