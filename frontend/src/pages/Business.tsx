import { ArrowUpRight } from 'lucide-react'
import { useLayoutEffect, useState } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/layout/SideNav.tsx'
import Guilloche from '@/components/landing/Guilloche.tsx'
import { Eyebrow } from '@/components/landing/kit.tsx'
import { cn } from '@/lib/utils'

/*
 * The business model as one 16:9 slide, for the demo video. The slide is drawn at a fixed 1600×900 and
 * scaled to fit the window, so it looks the same at any screen size. Below 768px wide it becomes a
 * normal stacked page instead, because a scaled slide would be too small to read on a phone.
 */
const W = 1600
const H = 900
const SLIDE_MIN_WIDTH = 768

/** The pitch deal: a $100M contract, sold at a 10% discount, with a 0.5% fee on the money raised. */
const FACE = 100_000_000
const DISCOUNT = 0.1
const FEE = 0.005
const RAISED = FACE * (1 - DISCOUNT)

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
})

/** Illustrative targets, not forecasts. Revenue is the fee on the money raised. */
const STAGES: { year: string; name: string; deals: number; avg: number }[] = [
  { year: 'Year 1', name: 'Pilot', deals: 10, avg: 5_000_000 },
  { year: 'Year 2', name: 'Growth', deals: 50, avg: 10_000_000 },
  { year: 'Year 3', name: 'Scale', deals: 150, avg: 20_000_000 },
]

const GROWTH: { title: string; body: React.ReactNode }[] = [
  { title: 'Win the client', body: 'One client brings all its contractors' },
  { title: 'Start with data centres', body: 'Big contracts, blue-chip clients' },
  {
    title: 'A proven market',
    body: (
      <>
        <a href="https://bcrpub.com/?p=152600" target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
          €4T+
        </a>{' '}
        of receivables sold in 2025
      </>
    ),
  },
]

const CARD = 'bg-card flex flex-col rounded-2xl border shadow-xs'
const CARD_HEAD = 'text-[0.6875rem] md:text-[15px]'

/** Scale that fits the 1600×900 slide in the window, or null when the window is too narrow for a slide. */
function useSlideScale() {
  const [scale, setScale] = useState<number | null>(null)
  useLayoutEffect(() => {
    const fit = () =>
      setScale(window.innerWidth >= SLIDE_MIN_WIDTH ? Math.min(window.innerWidth / W, window.innerHeight / H) : null)
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

function DealRow({ label, value, tone, big }: { label: string; value: string; tone?: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t py-3 md:py-[12px]">
      <dt className={cn('text-muted-foreground text-sm md:text-[20px]', big && 'text-foreground font-medium')}>{label}</dt>
      <dd
        className={cn(
          'tabular font-semibold tracking-[-0.02em]',
          big ? 'text-2xl md:text-[38px]' : 'text-lg md:text-[24px]',
          tone,
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/*
 * The potential, in data centres alone. McKinsey: $6.7T of data centre investment needed worldwide by 2030,
 * and 15% of the $5.2T for AI data centres ($0.8T) goes to builders for land, materials and site work.
 */
const MCKINSEY =
  'https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights/the-cost-of-compute-a-7-trillion-dollar-race-to-scale-data-centers'
const BUILDERS_SPEND = 800_000_000_000
const SHARE = 0.01
const POTENTIAL: { value: string; label: string }[] = [
  { value: '$6.7T', label: 'data centre build-out by 2030' },
  { value: money.format(BUILDERS_SPEND), label: 'of it goes to builders, our customers' },
  {
    value: money.format(BUILDERS_SPEND * SHARE * (1 - DISCOUNT) * FEE),
    label: `our revenue funding just ${SHARE * 100}% of that`,
  },
]

function Business() {
  const scale = useSlideScale()
  const fee = RAISED * FEE

  return (
    <div className="bg-background text-foreground relative min-h-svh md:h-svh md:overflow-hidden">
      <div
        className="relative mx-auto flex w-full flex-col gap-6 px-4 py-6 md:absolute md:top-1/2 md:left-1/2 md:gap-[30px] md:px-[64px] md:py-[40px]"
        style={scale ? { width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` } : undefined}
      >
        <Guilloche className="text-primary pointer-events-none absolute -top-[260px] -right-[220px] hidden size-[720px] opacity-[0.08] md:block" />

        {/* Slide header. */}
        <header className="relative flex items-center justify-between gap-4">
          <Link to="/" aria-label="Upfront home" className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:scale-125 md:origin-left">
            <Logo />
          </Link>
          <Eyebrow className="md:text-[14px]">Business model</Eyebrow>
        </header>

        {/* The model in one sentence. */}
        <div className="relative flex flex-col gap-3 md:gap-[14px]">
          <h1 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.045em] text-balance md:text-[64px]">
            We earn 0.5% when a business <span className="text-muted-foreground">gets funded.</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed text-pretty md:text-[24px] md:leading-snug">
            The seller pays it from the money raised. Investors pay nothing extra. No funding, no fee.
          </p>
        </div>

        <div className="relative grid flex-1 gap-4 md:min-h-0 md:grid-cols-[1.05fr_1fr_1fr] md:gap-[24px]">
          {/* Per deal. */}
          <section aria-labelledby="per-deal" className={cn(CARD, 'p-5 md:p-[28px]')}>
            <div className="flex items-baseline justify-between gap-3 pb-3 md:pb-[14px]">
              <Eyebrow className={CARD_HEAD}>
                <span id="per-deal">One $100M contract</span>
              </Eyebrow>
              <span className="text-muted-foreground text-xs md:text-[15px]">10% discount</span>
            </div>
            <dl>
              <DealRow label="Investors pay today" value={money.format(RAISED)} />
              <DealRow label="Upfront earns (0.5%)" value={money.format(fee)} tone="text-primary" big />
              <DealRow label="Builder gets today" value={money.format(RAISED - fee)} />
              <DealRow label="Builder repays at due date" value={money.format(FACE)} />
              <DealRow label="Investors earn" value={money.format(FACE - RAISED)} tone="text-yield" />
            </dl>
          </section>

          {/* Path to scale. */}
          <section aria-labelledby="scale" className={cn(CARD, 'p-5 md:p-[28px]')}>
            <div className="flex items-baseline justify-between gap-3 pb-3 md:pb-[14px]">
              <Eyebrow className={CARD_HEAD}>
                <span id="scale">Revenue as deals grow</span>
              </Eyebrow>
              <span className="text-muted-foreground text-xs md:text-[15px]">Illustrative</span>
            </div>
            <dl className="flex flex-1 flex-col">
              {STAGES.map((s, i) => {
                const revenue = s.deals * s.avg * (1 - DISCOUNT) * FEE
                return (
                  <div
                    key={s.year}
                    className={cn(
                      'flex flex-1 items-center justify-between gap-4 border-t py-3 md:py-0',
                      i === STAGES.length - 1 && 'md:pb-0',
                    )}
                  >
                    <dt className="flex flex-col gap-1">
                      <span className="text-sm font-medium md:text-[20px]">
                        {s.year} <span className="text-muted-foreground font-normal">· {s.name}</span>
                      </span>
                      <span className="text-muted-foreground tabular text-xs md:text-[17px]">
                        {s.deals} deals × {money.format(s.avg)}
                      </span>
                    </dt>
                    <dd className="tabular text-2xl font-semibold tracking-[-0.03em] md:text-[40px]">
                      {money.format(revenue)}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>

          {/* Why it grows. */}
          <section aria-labelledby="growth" className={cn(CARD, 'p-5 md:p-[28px]')}>
            <div className="pb-3 md:pb-[14px]">
              <Eyebrow className={CARD_HEAD}>
                <span id="growth">How we grow</span>
              </Eyebrow>
            </div>
            <ol className="flex flex-1 flex-col">
              {GROWTH.map((g) => (
                <li key={g.title} className="flex flex-1 flex-col justify-center gap-1 border-t py-3 md:gap-[6px] md:py-0">
                  <span className="text-base font-semibold tracking-[-0.01em] md:text-[24px]">{g.title}</span>
                  <span className="text-muted-foreground text-sm md:text-[18px]">{g.body}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* The potential, in data centres alone. */}
        <section
          aria-labelledby="potential"
          className="bg-band text-band-foreground relative flex flex-col gap-5 overflow-hidden rounded-2xl px-5 py-5 md:flex-row md:items-center md:gap-0 md:px-[32px] md:py-[22px]"
        >
          <div className="flex flex-col gap-1.5 md:w-[300px] md:shrink-0 md:pr-[32px]">
            <span id="potential" className="text-sm font-semibold md:text-[24px] md:leading-tight">
              The potential
            </span>
            <a
              href={MCKINSEY}
              target="_blank"
              rel="noreferrer"
              className="text-band-foreground/80 hover:text-band-foreground inline-flex w-fit items-center gap-1 text-xs underline-offset-4 hover:underline md:text-[15px]"
            >
              Data centres alone · McKinsey
              <ArrowUpRight className="size-3 md:size-[15px]" aria-hidden />
            </a>
          </div>
          <dl className="border-band-foreground/20 grid flex-1 gap-4 sm:grid-cols-3 md:gap-0 md:border-l">
            {POTENTIAL.map((p, i) => (
              <div
                key={p.label}
                className={cn(
                  'flex flex-col gap-1.5 md:px-[32px]',
                  i > 0 && 'md:border-band-foreground/20 md:border-l',
                )}
              >
                <dd className="tabular text-3xl leading-none font-semibold tracking-[-0.04em] md:text-[48px]">{p.value}</dd>
                <dt className="text-band-foreground/80 text-xs leading-snug md:text-[16px]">{p.label}</dt>
              </div>
            ))}
          </dl>
        </section>

        <p className="text-muted-foreground relative -mt-2 text-xs md:-mt-[14px] md:text-[14px]">
          The fee is planned and isn’t in the testnet smart contracts yet. Revenue targets are illustrative, not
          forecasts.
        </p>
      </div>
    </div>
  )
}

export default Business
