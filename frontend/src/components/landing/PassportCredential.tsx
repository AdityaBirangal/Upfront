import { Check, EyeOff, Globe, PersonStanding } from 'lucide-react'
import WorldLogo from '@/components/WorldLogo.tsx'
import { cn } from '@/lib/utils'

/**
 * World ID credentials as a stack of cards: Human behind, Passport in front with the one
 * fact Upfront asks for. Decorative; the copy beside it says the same thing.
 */
function PassportCredential({ className }: { className?: string }) {
  return (
    <div className={cn('relative mx-auto w-full max-w-sm', className)} aria-hidden>
      {/* Human: the credential that's live today, peeking out from behind. */}
      <div className="absolute inset-x-3 top-0 h-28 rounded-2xl border border-white/60 bg-[linear-gradient(110deg,#d9d6d1_0%,#efedea_45%,#d6d3cd_100%)] px-5 pt-4 shadow-lg">
        <div className="flex items-start justify-between">
          <span className="text-lg font-semibold tracking-[-0.01em] text-[#9a6b1f]">Human</span>
          <span className="flex size-9 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#f6deA0,#b8862f_70%)] text-white shadow-md">
            <PersonStanding className="size-5" strokeWidth={2.5} />
          </span>
        </div>
      </div>

      {/* Passport: the credential the OFAC check reads. */}
      <div className="relative mt-16 flex flex-col gap-5 rounded-2xl border border-white/10 bg-[linear-gradient(120deg,#2b3650_0%,#0f1830_45%,#1c2742_100%)] p-5 text-[#fbe7b2] shadow-2xl">
        <div className="flex items-start justify-between">
          <span className="text-xl font-semibold tracking-[-0.01em]">Passport</span>
          <Globe className="size-9" strokeWidth={1.75} />
        </div>

        <ul className="flex flex-col gap-2.5 text-sm">
          <li className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.06] px-3.5 py-2.5">
            <span className="text-white/75">OFAC-sanctioned country</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
              <Check className="size-3" strokeWidth={3} />
              No
            </span>
          </li>
          <li className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.06] px-3.5 py-2.5">
            <span className="text-white/75">Name, number, nationality</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-white/55">
              <EyeOff className="size-3.5" />
              Not shared
            </span>
          </li>
        </ul>

        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs">
          <span className="font-medium tracking-[0.08em] text-white/60 uppercase">Selective disclosure</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85">
            <WorldLogo className="size-4" />
            World ID
          </span>
        </div>
      </div>
    </div>
  )
}

export default PassportCredential
