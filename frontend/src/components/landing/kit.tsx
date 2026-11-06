import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Page gutter and width, shared by every band. */
export const WRAP = 'mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8'

/** Small mono label above a heading. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-muted-foreground inline-flex items-center gap-2 font-mono text-[0.6875rem] font-medium tracking-[0.14em] uppercase',
        className,
      )}
    >
      {children}
    </p>
  )
}

/** Eyebrow, heading and lede for a landing section. */
export function SectionHead({
  id,
  eyebrow,
  title,
  lede,
  className,
}: {
  id?: string
  eyebrow: ReactNode
  title: ReactNode
  lede?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex max-w-2xl flex-col gap-4', className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="text-3xl leading-[1.08] font-semibold tracking-[-0.035em] text-balance md:text-[2.75rem]">
        {title}
      </h2>
      {lede && <p className="text-muted-foreground text-lg leading-relaxed text-pretty">{lede}</p>}
    </div>
  )
}

/** A pulsing green dot for live data. */
export function LiveDot() {
  return (
    <span className="relative flex size-1.5" aria-hidden>
      <span className="bg-state-settled absolute inline-flex size-full animate-ping rounded-full opacity-60" />
      <span className="bg-state-settled relative inline-flex size-1.5 rounded-full" />
    </span>
  )
}
