import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A labelled value inside a card or summary row. */
function Stat({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium">{children}</dd>
    </div>
  )
}

export default Stat
