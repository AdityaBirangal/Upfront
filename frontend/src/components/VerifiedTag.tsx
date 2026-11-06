import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Whether the buyer confirmed the receivable onchain. Shown beside the status everywhere. */
function VerifiedTag({ verified, className }: { verified: boolean; className?: string }) {
  return verified ? (
    <span
      className={cn(
        'text-state-settled inline-flex h-6 items-center gap-1 text-xs font-medium whitespace-nowrap',
        className,
      )}
    >
      <ShieldCheck className="size-3.5" aria-hidden />
      Verified by buyer
    </span>
  ) : (
    <span
      className={cn(
        'text-warning inline-flex h-6 items-center gap-1 text-xs font-medium whitespace-nowrap',
        className,
      )}
    >
      <ShieldAlert className="size-3.5" aria-hidden />
      Not verified by buyer
    </span>
  )
}

export default VerifiedTag
