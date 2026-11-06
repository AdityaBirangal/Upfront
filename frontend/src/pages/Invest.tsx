import { Briefcase, Store } from 'lucide-react'
import { useState } from 'react'
import { isAddressEqual } from 'viem'
import type { Address } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BuyForm from '@/components/BuyForm.tsx'
import EmptyState from '@/components/EmptyState.tsx'
import ErrorNote from '@/components/ErrorNote.tsx'
import HoldingRow from '@/components/HoldingRow.tsx'
import PageHeader from '@/components/PageHeader.tsx'
import ReceivableList from '@/components/ReceivableList.tsx'
import Usdt from '@/components/Usdt.tsx'
import { useHolderPayments, useInvestments, useReceivables } from '@/chain.ts'
import { upfront, usdt } from '@/contracts.ts'
import { unitValue } from '@/receivables.ts'
import { useNow } from '@/useNow.ts'

type Props = {
  wallet: Address
}

function Invest({ wallet }: Props) {
  const [tab, setTab] = useState<'market' | 'portfolio'>('market')
  const { receivables, isPending, isError } = useReceivables()
  const listed = receivables.filter((r) => r.status === 'Listed').reverse()

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
  const paidFor = (id: bigint) =>
    (investments.data ?? [])
      .filter((investment) => investment.id === id)
      .reduce((sum, investment) => sum + investment.paid, 0n)

  const payments = useHolderPayments({ holder: wallet })
  const repaidFor = (id: bigint) => (payments.data ?? []).find((payment) => payment.id === id)
  const now = useNow()

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

  const totals = holdings.reduce(
    (sum, { receivable, units, repaid }) => {
      const paid = paidFor(receivable.id)
      sum.invested += paid
      if (repaid) sum.realised += repaid.amount - paid
      else if (receivable.status !== 'Defaulted') sum.expected += unitValue(units)
      return sum
    },
    { invested: 0n, expected: 0n, realised: 0n },
  )

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

        <TabsContent value="market">
          <ReceivableList
            receivables={listed}
            isPending={isPending}
            isError={isError}
            party="seller"
            columns={2}
            empty={{
              title: 'Nothing is listed right now',
              body: 'Listed receivables appear here as soon as a seller lists one.',
            }}
            extra={(receivable) => (
              <BuyForm
                receivable={receivable}
                wallet={wallet}
                held={held(receivable.id)}
                balance={usdtBalance}
                allowance={allowance}
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
              <dl className="bg-card grid grid-cols-1 divide-y rounded-xl border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="px-5 py-4">
                  <dt className="text-muted-foreground text-xs">Invested</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {investments.isSuccess ? <Usdt value={totals.invested} /> : '…'}
                  </dd>
                </div>
                <div className="px-5 py-4">
                  <dt className="text-muted-foreground text-xs">Expected payout</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    <Usdt value={totals.expected} />
                  </dd>
                </div>
                <div className="px-5 py-4">
                  <dt className="text-muted-foreground text-xs">Profit realised</dt>
                  <dd className="text-state-settled mt-1 text-lg font-semibold">
                    {investments.isSuccess ? <Usdt value={totals.realised} signed /> : '…'}
                  </dd>
                </div>
              </dl>
              <div className="bg-card rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Receivable</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Invested</TableHead>
                      <TableHead className="text-right">Payout</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="pr-4 text-right">Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holdings.map(({ receivable, units, repaid }) => (
                      <HoldingRow
                        key={receivable.id}
                        receivable={receivable}
                        units={units}
                        paid={investments.isSuccess ? paidFor(receivable.id) : undefined}
                        repaid={repaid}
                        now={now}
                      />
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
