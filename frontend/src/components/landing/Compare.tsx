import { Check, Minus } from 'lucide-react'
import { Logo } from '@/components/layout/SideNav.tsx'
import { cn } from '@/lib/utils'

const ROWS: { label: string; bank: string; upfront: string }[] = [
  { label: 'Time to cash', bank: 'Weeks of credit review', upfront: 'Minutes after listing' },
  { label: 'Collateral', bank: 'Usually required', upfront: 'The client-verified agreement' },
  { label: 'Who can fund', bank: 'A handful of lenders', upfront: 'Any approved investor, unit by unit' },
  { label: 'Repayment', bank: 'Each lender paid separately', upfront: 'One transaction pays every holder' },
  { label: 'Hours', bank: 'Bank hours and cut-offs', upfront: '24/7 on Whitechain' },
  { label: 'Record', bank: 'Paper files', upfront: 'Agreement hash onchain' },
]

const ROW = 'grid grid-cols-2 sm:grid-cols-[8.5rem_1fr_1fr]'

/** Bank financing against Upfront, row by row. */
function Compare({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card overflow-hidden rounded-2xl border', className)} role="table" aria-label="Bank financing compared with Upfront">
      <div className={cn(ROW, 'border-b')} role="row">
        <span className="hidden sm:block" role="columnheader" />
        <span className="text-muted-foreground px-4 py-4 text-sm font-medium sm:px-5" role="columnheader">
          Bank financing
        </span>
        <span className="bg-primary/[0.06] flex items-center px-4 py-4 sm:px-5" role="columnheader">
          <Logo />
        </span>
      </div>
      {ROWS.map((r) => (
        <div key={r.label} className={cn(ROW, 'border-b last:border-b-0')} role="row">
          <span
            className="text-muted-foreground col-span-2 px-4 pt-4 font-mono text-[0.6875rem] tracking-[0.12em] uppercase sm:col-span-1 sm:px-5 sm:py-4 sm:text-sm sm:text-foreground sm:font-medium sm:tracking-normal sm:normal-case sm:font-sans"
            role="rowheader"
          >
            {r.label}
          </span>
          <span className="text-muted-foreground flex items-start gap-2 px-4 py-3 text-sm sm:px-5 sm:py-4" role="cell">
            <Minus className="mt-0.5 size-4 shrink-0 opacity-60" aria-hidden />
            {r.bank}
          </span>
          <span className="bg-primary/[0.06] flex items-start gap-2 px-4 py-3 text-sm font-medium sm:px-5 sm:py-4" role="cell">
            <Check className="text-primary mt-0.5 size-4 shrink-0" strokeWidth={2.5} aria-hidden />
            {r.upfront}
          </span>
        </div>
      ))}
    </div>
  )
}

export default Compare
