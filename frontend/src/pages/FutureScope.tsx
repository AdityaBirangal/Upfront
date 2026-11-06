import { Coins, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import SiteFooter from '@/components/layout/SiteFooter.tsx'
import Guilloche from '@/components/landing/Guilloche.tsx'
import LandingHeader from '@/components/landing/LandingHeader.tsx'
import { Eyebrow, WRAP } from '@/components/landing/kit.tsx'

const PLANS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Coins,
    title: 'Fee collection',
    body: 'Upfront takes 0.5% of the money raised, paid by the seller when a receivable is funded.',
  },
  {
    icon: ShieldCheck,
    title: 'Protection pool',
    body: 'Every raise adds another 0.5% to a pool. If a seller defaults, the pool repays that receivable’s investors.',
  },
]

function FutureScope() {
  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <Guilloche className="pointer-events-none absolute -top-48 -right-48 size-[44rem] opacity-[0.12]" />
          <div className={`${WRAP} relative flex flex-col items-start gap-7 py-20 md:py-28`}>
            <Eyebrow>Future scope</Eyebrow>
            <h1 className="max-w-3xl text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">
              If a seller doesn’t pay, <span className="text-muted-foreground">investors still get paid.</span>
            </h1>
            <ul className="mt-4 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
              {PLANS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="bg-card flex flex-col gap-3 rounded-2xl border p-6 shadow-xs">
                  <Icon className="text-primary size-5" aria-hidden />
                  <h2 className="font-semibold tracking-[-0.01em]">{title}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

export default FutureScope
