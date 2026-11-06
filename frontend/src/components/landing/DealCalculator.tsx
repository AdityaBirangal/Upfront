import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

const VALUES = [
  { v: 1_000_000, label: '$1M' },
  { v: 10_000_000, label: '$10M' },
  { v: 100_000_000, label: '$100M' },
]
const TERMS = [3, 6, 12]

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const pct = (n: number) => `${n.toFixed(2)}%`

function Segmented<T extends number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { v: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2.5">
      <span id={id} className="text-sm font-medium">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="bg-muted grid auto-cols-fr grid-flow-col gap-1 rounded-lg p-1">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={o.v === value}
            onClick={() => onChange(o.v)}
            className={cn(
              'tabular h-8 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              o.v === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Line({ label, value, tone, strong }: { label: string; value: string; tone?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t py-3.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className={cn('tabular text-right font-semibold tracking-[-0.01em]', strong ? 'text-lg' : 'text-base', tone)}>{value}</dd>
    </div>
  )
}

/**
 * Model a deal: contract value, discount and term in; what the business gets today and what
 * investors earn out. Every unit repays 1 USDT, so the discount is the whole return.
 */
function DealCalculator({ className }: { className?: string }) {
  const [value, setValue] = useState(100_000_000)
  const [discount, setDiscount] = useState(10)
  const [term, setTerm] = useState(12)

  const today = value * (1 - discount / 100)
  const profit = value - today
  const ret = (discount / (100 - discount)) * 100
  const yearly = (ret * 12) / term
  const unitPrice = 1 - discount / 100

  return (
    <div className={cn('bg-card grid overflow-hidden rounded-2xl border lg:grid-cols-[22rem_minmax(0,1fr)]', className)}>
      {/* Inputs. */}
      <div className="bg-muted/40 flex flex-col gap-7 border-b p-6 md:p-8 lg:border-r lg:border-b-0">
        <p className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.14em] uppercase">Model a deal</p>
        <Segmented label="Contract value" options={VALUES} value={value} onChange={setValue} />
        <div className="flex flex-col gap-3">
          <label htmlFor="deal-discount" className="flex items-baseline justify-between text-sm font-medium">
            Discount to investors
            <span className="tabular text-primary text-base font-semibold">{discount.toFixed(1)}%</span>
          </label>
          <input
            id="deal-discount"
            type="range"
            min={1}
            max={15}
            step={0.5}
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className="accent-primary h-2 w-full cursor-pointer"
          />
          <div className="text-muted-foreground tabular flex justify-between text-xs">
            <span>1%</span>
            <span>15%</span>
          </div>
        </div>
        <Segmented label="Time to due date" options={TERMS.map((t) => ({ v: t, label: `${t} mo` }))} value={term} onChange={setTerm} />
      </div>

      {/* Outputs. */}
      <div className="flex min-w-0 flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-sm">The business receives today</span>
          <span className="tabular text-primary text-4xl leading-none font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl" aria-live="polite">
            {usd.format(today)}
          </span>
          <span className="text-muted-foreground text-sm">
            in USDT, as investors buy units at <span className="text-foreground tabular font-medium">{unitPrice.toFixed(3)}</span>{' '}
            each
          </span>
        </div>

        {/* The split of the repayment, not the investor's return. */}
        <div className="flex flex-col gap-2.5">
          <span className="text-muted-foreground text-xs">Split of the {usd.format(value)} repayment</span>
          <div
            className="flex h-3 gap-1 overflow-hidden rounded-full"
            role="img"
            aria-label={`Of the ${usd.format(value)} repayment, ${100 - discount}% goes to the business today and ${discount}% is the investors' profit at the due date`}
          >
            <span className="bg-primary rounded-full transition-[flex-grow] duration-300" style={{ flexGrow: 100 - discount }} />
            <span className="bg-yield min-w-1.5 rounded-full transition-[flex-grow] duration-300" style={{ flexGrow: discount }} />
          </div>
          <div className="text-muted-foreground flex justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-primary size-2 rounded-full" aria-hidden />
              Business today, {pct(100 - discount)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-yield size-2 rounded-full" aria-hidden />
              Investor profit, {pct(discount)}
            </span>
          </div>
        </div>

        <dl className="border-b">
          <Line label={`Repaid to holders in ${term} months`} value={usd.format(value)} strong />
          <Line label="Investors earn" value={`+${usd.format(profit)}`} tone="text-yield" strong />
          <Line label="Return on what they paid" value={pct(ret)} tone="text-yield" />
          <Line label="Simple yearly rate" value={`≈ ${pct(yearly)}`} />        </dl>
        <p className="text-muted-foreground -mt-4 text-xs">Investors carry the risk that the seller doesn’t repay.</p>
      </div>
    </div>
  )
}

export default DealCalculator
