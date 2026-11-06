import { ChevronLeft, FileSearch } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useReadContract } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Address from '@/components/Address.tsx'
import DocumentBadge from '@/components/DocumentBadge.tsx'
import EmptyState from '@/components/EmptyState.tsx'
import ErrorNote from '@/components/ErrorNote.tsx'
import Funding from '@/components/Funding.tsx'
import { LifecycleTrack } from '@/components/Lifecycle.tsx'
import Payment from '@/components/Payment.tsx'
import Section from '@/components/Section.tsx'
import StatusBadge from '@/components/StatusBadge.tsx'
import Timeline from '@/components/Timeline.tsx'
import Usdt from '@/components/Usdt.tsx'
import VerifiedTag from '@/components/VerifiedTag.tsx'
import { upfront } from '@/contracts.ts'
import {
  formatDate,
  formatPercent,
  returnPercent,
  toReceivable,
  unitValue,
  YIELD_HELP,
  formatYield,
  yieldNow,
} from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'
import { useNow } from '@/useNow.ts'
import { revertName } from '@/tx.ts'

const ID = /^[1-9]\d*$/

function Term({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 sm:block sm:py-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-right text-sm font-medium sm:mt-1 sm:text-left">{children}</dd>
    </div>
  )
}

/** Only while units can still be bought: the rate depends on the time left. */
function YieldTerm({ r }: { r: Receivable }) {
  const annual = yieldNow(r, useNow())
  if (annual === null) return null
  return (
    <Term label="Yield p.a.">
      <span className="text-yield tabular" title={YIELD_HELP}>
        {formatYield(annual)}
      </span>
    </Term>
  )
}

function Detail({ r }: { r: Receivable }) {
  const listed = r.unitPrice > 0n
  return (
    <>
      <div className="mb-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-muted-foreground tabular text-sm">Receivable #{r.id.toString()}</p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{r.ref || 'No reference'}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <VerifiedTag verified={r.verified} />
            <StatusBadge status={r.status} />
          </div>
        </div>
        <LifecycleTrack receivable={r} className="max-w-2xl" />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Section title="Terms">
            <dl className="divide-y sm:grid sm:grid-cols-3 sm:gap-x-6 sm:gap-y-5 sm:divide-y-0">
              <Term label="Face value">
                <Usdt value={unitValue(r.totalUnits)} />
              </Term>
              <Term label="Units">
                <span className="tabular">{r.totalUnits.toLocaleString()}</span>
                <span className="text-muted-foreground font-normal"> at 1 USDT each</span>
              </Term>
              <Term label="Due date">{formatDate(r.dueDate)}</Term>
              {listed && (
                <>
                  <Term label="Unit price">
                    <Usdt value={r.unitPrice} />
                  </Term>
                  <Term label="Discount">
                    <span className="tabular">{formatPercent(r.discountBps)}</span>
                  </Term>
                  <Term label="Investor return">
                    <span className="text-yield tabular">{returnPercent(r.unitPrice)}</span>
                  </Term>
                  <YieldTerm r={r} />
                  <Term label="Investor cap">
                    <span className="tabular">{r.maxUnitsPerInvestor.toLocaleString()}</span>
                    <span className="text-muted-foreground font-normal"> units per wallet</span>
                  </Term>
                </>
              )}
              <Term label="Created">{formatDate(r.createdAt)}</Term>
            </dl>
          </Section>
          {listed && <Funding receivable={r} />}
          {r.status !== 'Rejected' && r.status !== 'Cancelled' && r.status !== 'None' && <Payment receivable={r} />}
          <Timeline id={r.id} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20">
          <Section title="Parties">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Seller</dt>
                <dd className="mt-0.5">
                  <Address address={r.seller} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Buyer</dt>
                <dd className="mt-0.5">
                  <Address address={r.buyer} />
                </dd>
              </div>
            </dl>
          </Section>
          <Section title="Contract">
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-xs">Document hash (SHA-256)</p>
                <p className="mt-0.5 font-mono text-xs break-all">{r.docHash}</p>
              </div>
              <DocumentBadge docHash={r.docHash} />
            </div>
          </Section>
        </aside>
      </div>
    </>
  )
}

function ReceivableDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const isValidId = ID.test(id)
  const read = useReadContract({
    ...upfront,
    functionName: 'getReceivable',
    args: [isValidId ? BigInt(id) : 0n],
    query: {
      enabled: isValidId,
      // A missing id reverts every time, so retrying only delays the message.
      retry: (count, error) => revertName(error) !== 'UnknownReceivable' && count < 3,
    },
  })

  let body
  if (!isValidId || revertName(read.error) === 'UnknownReceivable') {
    body = (
      <EmptyState
        icon={FileSearch}
        title="Receivable not found"
        action={
          <Button variant="outline" asChild>
            <Link to="/app">Go to Overview</Link>
          </Button>
        }
      >
        There’s no receivable with ID {id} on this deployment.
      </EmptyState>
    )
  } else if (read.isPending) {
    body = (
      <div className="space-y-6" aria-busy aria-label="Loading">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-1.5 max-w-2xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    )
  } else if (read.isError) {
    body = <ErrorNote>Couldn’t read this receivable from the chain. Check your connection and refresh.</ErrorNote>
  } else {
    body = <Detail r={toReceivable(BigInt(id), read.data)} />
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground -ml-2 mb-4"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/app'))}
      >
        <ChevronLeft />
        Back
      </Button>
      {body}
    </>
  )
}

export default ReceivableDetail
