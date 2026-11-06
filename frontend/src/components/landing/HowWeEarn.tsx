import { cn } from '@/lib/utils'

const FEE_RATE = 0.005
const RAISED = 90_000_000

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const POINTS: { title: string; body: string }[] = [
  {
    title: '0.5% of what’s raised',
    body: 'One fee, charged when a receivable is funded. No listing fee and no subscription.',
  },
  {
    title: 'Paid by the seller',
    body: 'The seller pays it out of the money raised. Investors keep the whole discount.',
  },
  {
    title: 'We earn when deals fund',
    body: 'If units don’t sell, nobody pays. Our income depends on sellers actually getting funded.',
  },
]

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-3', className)}>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="tabular font-semibold tracking-[-0.01em]">{value}</dd>
    </div>
  )
}

/** Upfront's business model: a planned 0.5% fee on money raised, with a worked example. */
function HowWeEarn({ className }: { className?: string }) {
  const fee = RAISED * FEE_RATE
  return (
    <div className={cn('grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16', className)}>
      <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-1 lg:gap-y-0">
        {POINTS.map((p, i) => (
          <li key={p.title} className="flex gap-3 border-t pt-5 sm:flex-col sm:gap-2 lg:flex-row lg:gap-3 lg:py-6">
            <span className="text-muted-foreground tabular w-10 shrink-0 font-mono text-xs leading-6">0{i + 1}</span>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold tracking-[-0.01em]">{p.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <figure className="bg-card flex flex-col gap-4 self-start rounded-2xl border p-6 shadow-xs md:p-8">
        <figcaption className="flex items-center justify-between gap-3">
          <span className="font-semibold tracking-[-0.01em]">Example</span>
          <span className="text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium">
            Planned, not in the contracts yet
          </span>
        </figcaption>
        <dl className="divide-y">
          <Row label="Seller raises" value={usd.format(RAISED)} />
          <Row label="Upfront fee (0.5%)" value={usd.format(fee)} className="text-primary" />
          <Row label="Seller receives" value={usd.format(RAISED - fee)} />
        </dl>
      </figure>
    </div>
  )
}

export default HowWeEarn
