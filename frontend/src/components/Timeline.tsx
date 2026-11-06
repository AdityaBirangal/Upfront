import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Address } from 'viem'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimeline } from '@/chain.ts'
import type { TimelineEvent } from '@/chain.ts'
import { explorerTxUrl } from '@/contracts.ts'
import { cn } from '@/lib/utils'
import { formatDate, formatPercent, formatUsdt, shortAddress } from '@/receivables.ts'
import ErrorNote from './ErrorNote.tsx'
import Section from './Section.tsx'

const who = (address: unknown) => (
  <span className="font-mono text-xs">{shortAddress(address as Address)}</span>
)
const usdt = (value: unknown) => <span className="tabular">{formatUsdt(value as bigint)} USDT</span>
const units = (value: unknown) => {
  const count = value as bigint
  return <span className="tabular">{`${count.toLocaleString()} ${count === 1n ? 'unit' : 'units'}`}</span>
}

/** What each event says, in plain words. Unknown events are skipped. */
function describe({ name, args }: TimelineEvent): { title: string; detail?: ReactNode; tone?: string } | null {
  switch (name) {
    case 'ReceivableCreated':
      return {
        title: 'Created',
        detail: (
          <>
            By seller {who(args.seller)} for {usdt(args.faceValue)}, buyer {who(args.buyer)}
          </>
        ),
      }
    case 'ReceivableVerified':
      return { title: 'Verified by the buyer', detail: <>Buyer {who(args.buyer)}</>, tone: 'text-state-settled' }
    case 'ReceivableRejected':
      return { title: 'Rejected by the buyer', tone: 'text-state-defaulted' }
    case 'ReceivableCancelled':
      return { title: 'Cancelled by the seller' }
    case 'ReceivableListed':
      return {
        title: 'Listed',
        detail: (
          <>
            {formatPercent(Number(args.discountBps))} discount, {usdt(args.unitPrice)} per unit, cap{' '}
            {units(args.maxUnitsPerInvestor)} per wallet
          </>
        ),
      }
    case 'Invested':
      return {
        title: 'Units bought',
        detail: (
          <>
            {who(args.investor)} bought {units(args.units)} for {usdt(args.paid)}
          </>
        ),
      }
    case 'ReceivableFunded':
      return { title: 'Fully funded', detail: 'Every unit is sold.' }
    case 'TransferSingle':
      return {
        title: 'Units transferred',
        detail: (
          <>
            {who(args.from)} sent {units(args.value)} to {who(args.to)}
          </>
        ),
      }
    case 'Settled':
      return {
        title: 'Settled by the seller',
        detail: (
          <>
            {who(args.payer)} repaid {usdt(args.amount)}
          </>
        ),
        tone: 'text-state-settled',
      }
    case 'HolderPaid':
      return {
        title: 'Holder paid',
        detail: (
          <>
            {who(args.holder)} received {usdt(args.amount)} for {units(args.units)}
          </>
        ),
      }
    case 'ReceivableDefaulted':
      return {
        title: 'Marked defaulted',
        detail: 'Not settled by the due date, so holders weren’t repaid.',
        tone: 'text-state-defaulted',
      }
    default:
      return null
  }
}

/** Everything that happened to one receivable, read from chain events, with explorer links. */
function Timeline({ id }: { id: bigint }) {
  const timeline = useTimeline(id)
  const items = (timeline.data ?? []).flatMap((event) => {
    const text = describe(event)
    return text ? [{ event, ...text }] : []
  })

  return (
    <Section title="Timeline" description="Every step, read from the smart contract’s events.">
      {timeline.isPending ? (
        <div className="space-y-3" aria-busy aria-label="Loading">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : timeline.isError ? (
        <ErrorNote>Couldn’t read the events from the chain. Refresh to try again.</ErrorNote>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No events yet.</p>
      ) : (
        <ol className="relative space-y-5 border-l pl-5">
          {items.map(({ event, title, detail, tone }) => {
            const url = explorerTxUrl(event.txHash)
            return (
              <li key={`${event.txHash}-${event.logIndex}`} className="relative">
                <span
                  className="bg-background border-primary absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full border-2"
                  aria-hidden
                />
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <p className={cn('text-sm font-medium', tone)}>{title}</p>
                  <p className="text-muted-foreground flex items-center gap-3 text-xs">
                    {event.timestamp !== undefined && <span>{formatDate(event.timestamp)}</span>}
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
                      >
                        Transaction
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    )}
                  </p>
                </div>
                {detail && <p className="text-muted-foreground mt-0.5 text-sm">{detail}</p>}
              </li>
            )
          })}
        </ol>
      )}
    </Section>
  )
}

export default Timeline
