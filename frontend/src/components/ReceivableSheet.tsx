import { FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BACKEND_URL, documentUrl } from '@/backend.ts'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { formatDate, formatPercent, returnPercent, unitValue } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'
import Stat from './Stat.tsx'
import StatusBadge from './StatusBadge.tsx'
import Usdt from './Usdt.tsx'
import VerifiedTag from './VerifiedTag.tsx'

type Props = {
  receivable: Receivable
  /** The row's button, which opens the panel. */
  trigger: ReactNode
  /** The forms for this action. */
  children: ReactNode
}

/** Side panel opened from a list row: the receivable's terms, then the forms to act on it. */
function ReceivableSheet({ receivable: r, trigger, children }: Props) {
  const listed = r.unitPrice > 0n
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b p-5 pr-12">
          <SheetTitle className="truncate text-lg tracking-tight">{r.ref || 'No reference'}</SheetTitle>
          <SheetDescription className="tabular">Receivable #{r.id.toString()}</SheetDescription>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
            <StatusBadge status={r.status} />
            <VerifiedTag verified={r.verified} />
          </div>
        </SheetHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-b p-5">
          <Stat label="Face value">
            <Usdt value={unitValue(r.totalUnits)} />
          </Stat>
          <Stat label="Due">{formatDate(r.dueDate)}</Stat>
          {listed && (
            <>
              <Stat label="Unit price">
                <Usdt value={r.unitPrice} />
                <span className="text-muted-foreground ml-1 text-xs font-normal">{formatPercent(r.discountBps)} off</span>
              </Stat>
              <Stat label="Return at settlement">
                <span className="text-yield tabular">{returnPercent(r.unitPrice)}</span>
              </Stat>
            </>
          )}
        </dl>

        <div className="space-y-5 p-5">{children}</div>

        <div className="bg-muted/40 mt-auto flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-sm">
          <Link to={`/app/receivable/${r.id}`} className="text-primary font-medium underline-offset-4 hover:underline">
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
      </SheetContent>
    </Sheet>
  )
}

export default ReceivableSheet
