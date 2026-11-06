import { Check, Loader2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

import type { StepState } from '@/lib/steps.ts'

type Step = {
  label: string
  state: StepState
  detail?: ReactNode
}

/** A flow that takes more than one wallet prompt, in order. */
function Steps({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cn('space-y-3', className)}>
      {steps.map((step, index) => (
        <li key={step.label} className="flex gap-3">
          <span
            className={cn(
              'tabular flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
              step.state === 'waiting' && 'text-muted-foreground',
              step.state === 'active' && 'border-primary text-primary',
              step.state === 'done' && 'border-state-settled bg-state-settled text-background',
              step.state === 'failed' && 'border-destructive bg-destructive text-background',
            )}
            aria-hidden
          >
            {step.state === 'done' ? (
              <Check className="size-3.5" />
            ) : step.state === 'failed' ? (
              <X className="size-3.5" />
            ) : step.state === 'active' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              index + 1
            )}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-medium">{step.label}</p>
            {step.detail && <div className="mt-1">{step.detail}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default Steps
