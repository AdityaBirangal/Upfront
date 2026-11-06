import whitechainMark from '@/assets/whitechain-logo.png'
import { cn } from '@/lib/utils'

/** Whitechain's mark (no wordmark). Decorative by default (it sits next to the name); pass alt when it stands alone. */
function WhitechainLogo({ className, alt = '' }: { className?: string; alt?: string }) {
  return <img src={whitechainMark} alt={alt} className={cn('shrink-0', className)} />
}

export default WhitechainLogo
