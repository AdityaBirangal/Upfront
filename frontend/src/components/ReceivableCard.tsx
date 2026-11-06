import { FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BACKEND_URL, documentUrl } from '@/backend.ts'
import { Progress } from '@/components/ui/progress'
import { formatDate, formatPercent, returnPercent, soldPercent, unitValue } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'
import { useNow } from '@/useNow.ts'
import Address from './Address.tsx'
import { LifecycleTrack, MaturityBar } from './Lifecycle.tsx'
import Stat from './Stat.tsx'
import StatusBadge from './StatusBadge.tsx'
import Usdt from './Usdt.tsx'
import VerifiedTag from './VerifiedTag.tsx'

type Props = {
  receivable: Receivable
  /** Which party to show next to the reference. */
  party?: 'seller' | 'buyer'
  children?: ReactNode
}

/** One receivable: reference, status, lifecycle, terms, and the page's own actions below. */
function ReceivableCard({ receivable: r, party = 'buyer', children }: Props) {
  const now = useNow()
  const listed = r.unitPrice > 0n
  return (
    <li className="bg-card overflow-hidden rounded-xl border">
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <Link
              to={`/app/receivable/${r.id}`}
              className="hover:text-primary block truncate font-semibold tracking-tight outline-none focus-visible:underline"
            >
              {r.ref || 'No reference'}
            </Link>
            <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
              <span className="tabular">#{r.id.toString()}</span>
              <span aria-hidden>/</span>
              <span>{party === 'buyer' ? 'Buyer' : 'Seller'}</span>
              <Address address={party === 'buyer' ? r.buyer : r.seller} className="text-foreground" />
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <VerifiedTag verified={r.verified} />
            <StatusBadge status={r.status} />
          </div>
        </div>

        <LifecycleTrack receivable={r} />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="Face value">
            <Usdt value={unitValue(r.totalUnits)} />
          </Stat>
          {listed ? (
            <>
              <Stat label="Unit price">
                <Usdt value={r.unitPrice} />
              </Stat>
              <Stat label="Investor return">
                <span className="text-yield tabular">{returnPercent(r.unitPrice)}</span>
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  {formatPercent(r.discountBps)} off
                </span>
              </Stat>
              <Stat label="Sold">
                <span className="tabular">{soldPercent(r)}%</span>
                <span className="text-muted-foreground tabular ml-1 text-xs font-normal">
                  {r.unitsSold.toLocaleString()} / {r.totalUnits.toLocaleString()} units
                </span>
                <Progress value={soldPercent(r)} aria-label="Share of units sold" className="mt-1.5 h-1" />
              </Stat>
            </>
          ) : (
            <>
              <Stat label="Units">
                <span className="tabular">{r.totalUnits.toLocaleString()}</span>
              </Stat>
              <Stat label="Due date" className="col-span-2">
                {formatDate(r.dueDate)}
              </Stat>
            </>
          )}
        </dl>

        <MaturityBar receivable={r} now={now} />
      </div>

      {children && <div className="space-y-4 border-t px-5 py-4 empty:hidden">{children}</div>}

      <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 border-t px-5 py-2.5 text-sm">
        <Link
          to={`/app/receivable/${r.id}`}
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          View details
        </Link>
        {BACKEND_URL && (
          <a
            href={documentUrl(r.docHash)}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <FileText className="size-3.5" aria-hidden />
            Contract PDF
          </a>
        )}
      </div>
    </li>
  )
}

export default ReceivableCard
