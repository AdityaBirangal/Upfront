import { CircleCheck, CircleX, ExternalLink, Flag } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useHolderPayments } from '@/chain.ts'
import { explorerTxUrl } from '@/contracts.ts'
import { canMarkDefault, formatDate, formatUsdt, repayAmount } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'
import { useNow } from '@/useNow.ts'
import Address from './Address.tsx'
import { MaturityBar } from './Lifecycle.tsx'
import ReceivableActions from './ReceivableActions.tsx'
import Section from './Section.tsx'
import Usdt from './Usdt.tsx'

type Props = {
  receivable: Receivable
}

/** Repayment state on the detail page: countdown, Mark default, and what each holder was paid. */
function Payment({ receivable: r }: Props) {
  const now = useNow()
  const payments = useHolderPayments({ id: r.id })
  const paid = payments.data ?? []
  const pastDue = (r.status === 'Listed' || r.status === 'Funded') && now >= r.dueDate

  return (
    <Section
      title="Repayment"
      description={
        r.status === 'Created'
          ? 'Repayment opens once the seller lists it for investors.'
          : `The seller repays 1 USDT per unit sold by ${formatDate(r.dueDate)}, paying every holder in one transaction. If it isn’t repaid by then, anyone can mark it as defaulted.`
      }
    >
      <div className="space-y-4">
        {r.status !== 'Created' && <MaturityBar receivable={r} now={now} />}

        {pastDue && (
          <p className="text-state-defaulted text-sm font-medium">
            Past due and not repaid. Anyone can mark it as defaulted.
          </p>
        )}

        <ReceivableActions
          id={r.id}
          actions={
            canMarkDefault(r, now)
              ? [
                  {
                    label: 'Mark default',
                    icon: Flag,
                    functionName: 'markDefault',
                    done: 'Marked as defaulted.',
                    tone: 'destructive',
                    confirm: {
                      title: `Mark receivable #${r.id} as defaulted?`,
                      body: 'This is final and public. Holders are not repaid.',
                    },
                  },
                ]
              : []
          }
        />

        {r.status === 'Settled' && (
          <p className="border-state-settled/30 bg-state-settled/5 text-state-settled flex items-center gap-2 rounded-lg border p-3 text-sm font-medium">
            <CircleCheck className="size-4 shrink-0" aria-hidden />
            Settled. The seller repaid {formatUsdt(repayAmount(r))} USDT to {paid.length}{' '}
            {paid.length === 1 ? 'holder' : 'holders'}.
          </p>
        )}
        {r.status === 'Defaulted' && (
          <p className="border-state-defaulted/30 bg-state-defaulted/5 text-state-defaulted flex items-center gap-2 rounded-lg border p-3 text-sm font-medium">
            <CircleX className="size-4 shrink-0" aria-hidden />
            Defaulted. The seller didn’t repay by the due date.
          </p>
        )}

        {paid.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Holders paid</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holder</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Transaction</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paid.map((payment) => {
                  const url = explorerTxUrl(payment.txHash)
                  return (
                    <TableRow key={`${payment.txHash}-${payment.holder}`}>
                      <TableCell>
                        <Address address={payment.holder} />
                      </TableCell>
                      <TableCell className="tabular text-right">{payment.units.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Usdt value={payment.amount} />
                      </TableCell>
                      <TableCell className="text-right">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground inline-flex"
                            aria-label="View payment on explorer"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Section>
  )
}

export default Payment
