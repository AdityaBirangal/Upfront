import { ExternalLink } from 'lucide-react'
import type { Address as AddressType } from 'viem'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useInvestments } from '@/chain.ts'
import { explorerTxUrl } from '@/contracts.ts'
import { soldPercent } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'
import Address from './Address.tsx'
import ErrorNote from './ErrorNote.tsx'
import Section from './Section.tsx'
import Usdt from './Usdt.tsx'

type Props = {
  receivable: Receivable
}

/** Funding progress, holders, and every purchase, read from Invested events. */
function Funding({ receivable }: Props) {
  const investments = useInvestments({ id: receivable.id })
  const { unitsSold, totalUnits } = receivable
  const percent = soldPercent(receivable)

  const holders = new Map<AddressType, { units: bigint; paid: bigint }>()
  for (const investment of investments.data ?? []) {
    const holder = holders.get(investment.investor) ?? { units: 0n, paid: 0n }
    holder.units += investment.units
    holder.paid += investment.paid
    holders.set(investment.investor, holder)
  }

  return (
    <Section
      title="Funding"
      description="Every purchase, read from the chain."
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span>
            <span className="tabular font-semibold">{unitsSold.toLocaleString()}</span>
            <span className="text-muted-foreground">
              {' '}
              of {totalUnits.toLocaleString()} units sold ({percent}%)
            </span>
          </span>
          <span className="text-muted-foreground">
            Seller received <Usdt value={unitsSold * receivable.unitPrice} className="text-foreground font-medium" />
          </span>
        </div>
        <Progress value={percent} aria-label="Units sold" />
      </div>

      <div className="mt-6">
        {investments.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : investments.isError ? (
          <ErrorNote>Couldn’t read purchases from the chain.</ErrorNote>
        ) : investments.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">No units sold yet.</p>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium">Holders</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Invested</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...holders].map(([investor, { units, paid }]) => (
                    <TableRow key={investor}>
                      <TableCell>
                        <Address address={investor} />
                      </TableCell>
                      <TableCell className="tabular text-right">{units.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Usdt value={paid} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">Purchases</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Transaction</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments.data.map((investment) => {
                    const url = explorerTxUrl(investment.txHash)
                    return (
                      <TableRow key={`${investment.txHash}-${investment.investor}`}>
                        <TableCell>
                          <Address address={investment.investor} />
                        </TableCell>
                        <TableCell className="tabular text-right">{investment.units.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Usdt value={investment.paid} />
                        </TableCell>
                        <TableCell className="text-right">
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-foreground inline-flex"
                              aria-label="View purchase on explorer"
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
          </div>
        )}
      </div>
    </Section>
  )
}

export default Funding
