import { Briefcase, Store } from 'lucide-react'
import { useState } from 'react'
import { isAddressEqual } from 'viem'
import type { Address } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BuyForm from '@/components/BuyForm.tsx'
import EmptyState from '@/components/EmptyState.tsx'
import ErrorNote from '@/components/ErrorNote.tsx'
import HoldingRow, { HOLDING_COLUMNS } from '@/components/HoldingRow.tsx'
import PageHeader from '@/components/PageHeader.tsx'
import SortHead from '@/components/SortHead.tsx'
import PortfolioOverview from '@/components/portfolio/PortfolioOverview.tsx'
import ReceivableTable from '@/components/ReceivableTable.tsx'
import { MARKET_COLUMNS, MarketRow } from '@/components/ReceivableRows.tsx'
import Usdt from '@/components/Usdt.tsx'
import { useBlockTimes, useHolderPayments, useInvestments, useReceivables } from '@/chain.ts'
import { upfront, usdt } from '@/contracts.ts'
import { holdingFigures } from '@/lib/portfolio.ts'
import { sortRows, useSort } from '@/lib/sort.ts'
import { cn } from '@/lib/utils'
import { useNow } from '@/useNow.ts'

type Props = {
  wallet: Address
}

function Invest({ wallet }: Props) {
  const [tab, setTab] = useState<'market' | 'portfolio'>('market')
  const { receivables, isPending, isError } = useReceivables()
  const now = useNow()
  // Past the due date, units can't be bought, so those stay off the marketplace.
  const listed = receivables.filter((r) => r.status === 'Listed' && now < r.dueDate)

  const balances = useReadContract({
    ...upfront,
    functionName: 'balanceOfBatch',
    args: [receivables.map(() => wallet), receivables.map((r) => r.id)],
    query: { enabled: receivables.length > 0 },
  })
  const held = (id: bigint) => {
    const index = receivables.findIndex((r) => r.id === id)
    return balances.data?.[index] ?? 0n
  }

  const money = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...usdt, functionName: 'balanceOf', args: [wallet] },
      { ...usdt, functionName: 'allowance', args: [wallet, upfront.address] },
    ],
  })
  const [usdtBalance, allowance] = money.data ?? []

  const investments = useInvestments({ investor: wallet })
  const payments = useHolderPayments({ holder: wallet })
  const repaidFor = (id: bigint) => (payments.data ?? []).find((payment) => payment.id === id)

  // Sellers hold their own units until they sell, so those aren't investments. Settlement burns
  // units, so repaid holdings come from HolderPaid events.
  const holdings = receivables
    .flatMap((receivable, index) => {
      const units = balances.data?.[index] ?? 0n
      const repaid = repaidFor(receivable.id)
      return (units > 0n || repaid) && !isAddressEqual(receivable.seller, wallet)
        ? [{ receivable, units, repaid }]
        : []
    })
    .reverse()

  const times = useBlockTimes([
    ...(investments.data ?? []).map((i) => i.blockNumber),
    ...(payments.data ?? []).map((p) => p.blockNumber),
  ])
  const figures = holdings.map((holding) =>
    holdingFigures(
      holding,
      investments.data?.filter((i) => i.id === holding.receivable.id),
      times.data,
      now,
    ),
  )
  const { sort: holdingSort, toggle: sortHoldings } = useSort({ key: 'Receivable', dir: 'desc' })
  const holdingValue = HOLDING_COLUMNS.find((c) => c.label === holdingSort.key)?.value
  const sortedFigures = holdingValue ? sortRows(figures, holdingValue, holdingSort.dir) : figures

  const holdingsPending = isPending || (receivables.length > 0 && balances.isPending)

  return (
    <>
      <PageHeader
        title="Invest"
        description="Buy units of listed receivables below face value. Each unit pays 1 USDT when the seller repays, before the due date, so the difference is your return."
        actions={
          <dl className="text-sm">
            <dt className="text-muted-foreground text-xs">USDT balance</dt>
            <dd className="font-medium">
              {money.isPending ? (
                '…'
              ) : money.isError || usdtBalance === undefined ? (
                <span className="text-destructive">Unavailable</span>
              ) : (
                <Usdt value={usdtBalance} />
              )}
            </dd>
          </dl>
        }
      />

      {usdtBalance === 0n && (
        <ErrorNote className="mb-4">This wallet has no USDT, so it can’t buy units yet.</ErrorNote>
      )}

      <Tabs value={tab} onValueChange={(value) => setTab(value as 'market' | 'portfolio')}>
        <TabsList className="mb-4">
          <TabsTrigger value="market">
            Marketplace <span className="text-muted-foreground tabular ml-1">{listed.length}</span>
          </TabsTrigger>
          <TabsTrigger value="portfolio">
            Portfolio <span className="text-muted-foreground tabular ml-1">{holdings.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="market" className="space-y-3">
          <ReceivableTable
            label="Listed receivables"
            receivables={listed}
            isPending={isPending}
            isError={isError}
            columns={MARKET_COLUMNS}
            defaultSort={{ key: 'Receivable', dir: 'desc' }}
            empty={{
              title: 'Nothing is listed right now',
              body: 'Listed receivables appear here as soon as a seller lists one.',
            }}
            row={(receivable) => (
              <MarketRow
                key={receivable.id}
                r={receivable}
                now={now}
                buy={
                  <BuyForm
                    receivable={receivable}
                    wallet={wallet}
                    held={held(receivable.id)}
                    balance={usdtBalance}
                    allowance={allowance}
                  />
                }
              />
            )}
          />
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          {holdingsPending ? (
            <div className="space-y-2 rounded-xl border p-4" aria-busy aria-label="Loading">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
          ) : balances.isError ? (
            <ErrorNote>Couldn’t read balances from the chain.</ErrorNote>
          ) : holdings.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No holdings yet"
              action={
                <button
                  type="button"
                  className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                  onClick={() => setTab('market')}
                >
                  <Store className="size-4" aria-hidden />
                  Browse the marketplace
                </button>
              }
            >
              Units you buy appear here with their expected payout and countdown.
            </EmptyState>
          ) : (
            <>
              <PortfolioOverview
                wallet={wallet}
                holdings={holdings}
                receivables={receivables}
                investments={investments.data ?? []}
                payments={payments.data ?? []}
                now={now}
              />
              <h3 className="mt-2 font-semibold tracking-tight">Holdings</h3>
              <div className="bg-card overflow-hidden rounded-xl border">
                <Table aria-label="Holdings">
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      {HOLDING_COLUMNS.map((c) => (
                        <SortHead
                          key={c.label}
                          label={c.label}
                          title={c.title}
                          first={c.first}
                          sort={holdingSort}
                          onSort={sortHoldings}
                          className={cn('text-muted-foreground h-9 text-xs', c.className)}
                        />
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedFigures.map((holding) => (
                      <HoldingRow key={holding.receivable.id} holding={holding} now={now} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}

export default Invest
