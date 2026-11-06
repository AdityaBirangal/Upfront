import { BadgeCheck, Coins, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import SiteFooter from '@/components/layout/SiteFooter.tsx'
import Guilloche from '@/components/landing/Guilloche.tsx'
import LandingHeader from '@/components/landing/LandingHeader.tsx'
import { Eyebrow, SectionHead, WRAP } from '@/components/landing/kit.tsx'
import { cn } from '@/lib/utils'

const PLANS: { id: string; icon: LucideIcon; eyebrow: string; title: string; lede: string; stat: string; statLabel: string }[] = [
  {
    id: 'fee',
    icon: Coins,
    eyebrow: '01 · Fee collection',
    title: 'Upfront earns when a deal funds',
    lede: 'A 0.5% fee on the money raised, paid by the seller when a receivable is funded. Investors pay only the unit price.',
    stat: '0.5%',
    statLabel: 'of every raise',
  },
  {
    id: 'insurance',
    icon: ShieldCheck,
    eyebrow: '02 · Insurance',
    title: 'If a seller defaults, investors still get paid',
    lede: 'Every raise adds another 0.5% to an insurance pool held by the contract. If a seller misses the due date, the pool repays that receivable’s investors.',
    stat: '0.5%',
    statLabel: 'into the pool, per raise',
  },
  {
    id: 'kyc',
    icon: BadgeCheck,
    eyebrow: '03 · KYC / KYB',
    title: 'Full sanctions screening with World ID',
    lede: 'Investors already onboard themselves by proving with World ID that they’re one unique human. Next, the same flow checks a passport credential through World ID’s selective disclosure, now in preview: if it isn’t from an OFAC-sanctioned country, the wallet gets the Investor role, and Upfront never sees the passport. Anyone who can’t pass can still be approved by an admin, and sellers and clients stay with business checks run by the admin.',
    stat: 'OFAC check',
    statLabel: 'added to World ID self-onboarding, admin approval as the fallback',
  },
]

function FutureScope() {
  const { hash } = useLocation()

  // Arriving with a section hash, such as /future#kyc: scroll once the section has rendered.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b">
          <Guilloche className="pointer-events-none absolute -top-48 -right-48 size-[44rem] opacity-[0.12]" />
          <div className={`${WRAP} relative flex flex-col items-start gap-6 py-20 md:py-28`}>
            <Eyebrow>Future scope</Eyebrow>
            <h1 className="max-w-3xl text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">
              What’s coming <span className="text-muted-foreground">next.</span>
            </h1>
          </div>
        </section>

        {PLANS.map(({ id, icon: Icon, eyebrow, title, lede, stat, statLabel }, i) => (
          <section key={id} aria-labelledby={id} className={cn('border-b', i % 2 === 1 && 'bg-muted/40')}>
            <div className={`${WRAP} grid gap-10 py-20 md:py-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:items-center lg:gap-16`}>
              <SectionHead id={id} eyebrow={eyebrow} title={title} lede={lede} />
              <div className="bg-card flex flex-col gap-3 rounded-2xl border p-6 shadow-xs md:p-8">
                <Icon className="text-primary size-6" aria-hidden />
                <p className="tabular text-4xl font-semibold tracking-[-0.035em]">{stat}</p>
                <p className="text-muted-foreground text-sm">{statLabel}</p>
              </div>
            </div>
          </section>
        ))}
      </main>

      <SiteFooter className="border-t-0" />
    </div>
  )
}

export default FutureScope
