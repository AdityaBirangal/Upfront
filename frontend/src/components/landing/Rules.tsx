import { ArrowLeftRight, Check, KeyRound, Lock, X } from 'lucide-react'
import type { Address } from 'viem'
import Identicon from '@/components/Identicon.tsx'
import { cn } from '@/lib/utils'

const WALLETS: Address[] = [
  '0x00dcb3a97e4f1c62d85a00000000000000000001',
  '0x00aa6e2c91b7d4f30a8e00000000000000000002',
  '0x01185d93c2a7e16f4b0d00000000000000000003',
  '0x01405c2e8b7d1a96f4e300000000000000000006',
]

function Mark({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        'ring-card flex size-4 shrink-0 items-center justify-center rounded-full text-white ring-2',
        ok ? 'bg-state-settled' : 'bg-state-defaulted',
      )}
    >
      {ok ? <Check className="size-2.5" strokeWidth={3.5} aria-hidden /> : <X className="size-2.5" strokeWidth={3.5} aria-hidden />}
    </span>
  )
}

/** Three approved wallets get in, a fourth doesn't. */
function ApprovedVisual() {
  return (
    <div className="flex items-center justify-center gap-3">
      {WALLETS.map((w, i) => {
        const ok = i < 3
        return (
          <span key={w} className="relative">
            <Identicon address={w} className={cn('size-10', !ok && 'opacity-35 grayscale')} />
            <span className="absolute -right-1 -bottom-1">
              <Mark ok={ok} />
            </span>
          </span>
        )
      })}
    </div>
  )
}

/** USDT and units cross in one locked step. */
function AtomicVisual() {
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="bg-card text-foreground tabular rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-xs">USDT</span>
      <span className="flex w-20 flex-col items-center gap-1.5">
        <ArrowLeftRight className="text-muted-foreground size-5" aria-hidden />
        <span className="bg-foreground text-background flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold">
          <Lock className="size-2.5" aria-hidden /> 1 tx
        </span>
      </span>
      <span className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs">Units</span>
    </div>
  )
}

/** Holdings against the cap; the one that would cross it is cut off. */
function CapVisual() {
  const holdings = [55, 80, 100]
  return (
    <div className="relative mx-auto flex h-16 w-44 items-end gap-3">
      <span className="border-state-defaulted absolute inset-x-0 top-0 border-t-2 border-dashed" aria-hidden />
      <span className="text-state-defaulted bg-muted absolute -top-2 left-0 rounded px-1 text-[0.625rem] font-semibold">cap</span>
      {holdings.map((h, i) => (
        <span key={i} className="relative flex-1" style={{ height: '100%' }}>
          <span className="bg-primary absolute inset-x-0 bottom-0 rounded-t-[4px]" style={{ height: `${h}%` }} />
          {i === 2 && (
            <span className="absolute inset-x-0 -top-4 flex justify-center">
              <Mark ok={false} />
            </span>
          )}
        </span>
      ))}
    </div>
  )
}

/** Units move investor to investor before the due date, nowhere else. */
function TransferVisual() {
  const rows = [
    { to: 'Investor', ok: true },
    { to: 'Seller or client', ok: false },
    { to: 'After due date', ok: false },
  ]
  return (
    <ul className="mx-auto w-full max-w-56 space-y-2">
      {rows.map((r) => (
        <li key={r.to} className="flex items-center gap-2 text-xs">
          <span className="bg-primary size-2.5 shrink-0 rounded-[3px]" aria-hidden />
          <span
            className={cn('h-px flex-1', r.ok ? 'bg-state-settled' : 'bg-[repeating-linear-gradient(90deg,var(--state-defaulted)_0_3px,transparent_3px_6px)]')}
            aria-hidden
          />
          <span className={cn('w-24 truncate', r.ok ? 'text-foreground' : 'text-muted-foreground line-through decoration-1')}>{r.to}</span>
          <Mark ok={r.ok} />
        </li>
      ))}
    </ul>
  )
}

/** Sold units are out with investors; the rest sit locked with the seller. */
function LockedVisual() {
  return (
    <div className="mx-auto grid grid-cols-6 gap-1.5" aria-hidden>
      {Array.from({ length: 12 }, (_, i) =>
        i < 7 ? (
          <span key={i} className="bg-primary size-6 rounded-[5px]" />
        ) : (
          <span key={i} className="bg-card text-muted-foreground flex size-6 items-center justify-center rounded-[5px] border">
            <Lock className="size-3" />
          </span>
        ),
      )}
    </div>
  )
}

/** What the admin key can and can't do. */
function AdminVisual() {
  const rows = [
    { what: 'Grant a role', ok: true },
    { what: 'Move USDT', ok: false },
    { what: 'Edit a receivable', ok: false },
  ]
  return (
    <div className="mx-auto flex items-center gap-4">
      <span className="bg-card flex size-11 items-center justify-center rounded-xl border shadow-xs">
        <KeyRound className="text-foreground size-5" aria-hidden />
      </span>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.what} className="flex items-center gap-2 text-xs">
            <Mark ok={r.ok} />
            <span className={r.ok ? 'text-foreground' : 'text-muted-foreground line-through decoration-1'}>{r.what}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const RULES: { title: string; body: string; visual: React.ReactNode }[] = [
  { title: 'Approved wallets only', body: 'Only wallets with the right role can create, verify, list or invest.', visual: <ApprovedVisual /> },
  { title: 'Delivery versus payment', body: 'USDT and units swap in one transaction, or nothing moves.', visual: <AtomicVisual /> },
  { title: 'Cap per investor', body: 'No wallet can hold more units of a deal than its cap.', visual: <CapVisual /> },
  { title: 'Transfer limits', body: 'Units move only between approved investors, and only before the due date.', visual: <TransferVisual /> },
  { title: 'Seller’s units locked', body: 'Unsold units can leave the seller only through a purchase.', visual: <LockedVisual /> },
  { title: 'Admin can’t touch funds', body: 'The admin approves who takes part. It can’t move USDT or change a receivable.', visual: <AdminVisual /> },
]

/** The guarantees the smart contract enforces, one picture each. */
function Rules({ className }: { className?: string }) {
  return (
    <ul className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5', className)}>
      {RULES.map((rule) => (
        <li key={rule.title} className="bg-card flex flex-col gap-5 rounded-2xl border p-2">
          <div className="bg-muted/60 flex h-36 items-center justify-center rounded-xl px-4">{rule.visual}</div>
          <div className="flex flex-col gap-1.5 px-3 pb-3">
            <h3 className="text-[0.9375rem] font-semibold">{rule.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{rule.body}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default Rules
