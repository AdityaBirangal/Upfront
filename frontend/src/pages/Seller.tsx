import { useState } from 'react'
import { isAddressEqual } from 'viem'
import type { Address } from 'viem'
import { useReadContracts } from 'wagmi'
import { FilePlus2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CreateReceivable from '@/components/CreateReceivable.tsx'
import ListForm from '@/components/ListForm.tsx'
import PageHeader from '@/components/PageHeader.tsx'
import ReceivableActions from '@/components/ReceivableActions.tsx'
import ReceivableTable from '@/components/ReceivableTable.tsx'
import { SELLER_COLUMNS, SellerRow } from '@/components/ReceivableRows.tsx'
import SellerPayout from '@/components/SellerPayout.tsx'
import Usdt from '@/components/Usdt.tsx'
import { useReceivables } from '@/chain.ts'
import { upfront, usdt } from '@/contracts.ts'
import { canCancel, isAwaitingPayment, repayAmount } from '@/receivables.ts'
import { useNow } from '@/useNow.ts'

type Props = {
  wallet: Address
}

function Seller({ wallet }: Props) {
  const [chosenTab, setTab] = useState<'create' | 'existing'>()
  const { receivables, isPending, isError } = useReceivables()
  const mine = receivables.filter((r) => isAddressEqual(r.seller, wallet)).reverse()
  const now = useNow()
  // Open on the list once there is something in it, otherwise on the form.
  const tab = chosenTab ?? (isPending || mine.length > 0 ? 'existing' : 'create')
  // Settle pulls the repayment from this wallet, so it needs the balance and the approval.
  const money = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...usdt, functionName: 'balanceOf', args: [wallet] },
      { ...usdt, functionName: 'allowance', args: [wallet, upfront.address] },
    ],
  })
  const [usdtBalance, allowance] = money.data ?? []

  const outstanding = mine.filter(isAwaitingPayment).reduce((sum, r) => sum + repayAmount(r), 0n)

  return (
    <>
      <PageHeader
        title="Sell"
        description="Turn a signed contract into a receivable, list it for investors at a discount, and repay every holder before the due date."
        actions={
          <dl className="flex gap-6 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">USDT balance</dt>
              <dd className="font-medium">{usdtBalance === undefined ? '…' : <Usdt value={usdtBalance} />}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Owed to investors</dt>
              <dd className="font-medium">
                <Usdt value={outstanding} />
              </dd>
            </div>
          </dl>
        }
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as 'create' | 'existing')}>
        <TabsList className="mb-4">
          <TabsTrigger value="existing">
            Your receivables <span className="text-muted-foreground tabular ml-1">{mine.length}</span>
          </TabsTrigger>
          <TabsTrigger value="create">
            <FilePlus2 aria-hidden />
            Create
          </TabsTrigger>
        </TabsList>

        {/* Kept mounted, so a half-filled form or a running transaction survives a tab switch. */}
        <TabsContent value="create" forceMount className="data-[state=inactive]:hidden">
          <CreateReceivable wallet={wallet} onDone={() => setTab('existing')} />
        </TabsContent>

        <TabsContent value="existing" className="min-w-0">
          <ReceivableTable
            label="Your receivables"
            receivables={mine}
            isPending={isPending}
            isError={isError}
            columns={SELLER_COLUMNS}
            defaultSort={{ key: 'Receivable', dir: 'desc' }}
            empty={{
              title: 'No receivables yet',
              body: 'Create one from a signed contract in the Create tab. It appears here, ready to list for investors.',
            }}
            row={(receivable) => (
              <SellerRow
                key={receivable.id}
                r={receivable}
                now={now}
                wallet={wallet}
                manage={
                  <>
                    <ListForm receivable={receivable} />
                    <SellerPayout
                      receivable={receivable}
                      wallet={wallet}
                      balance={usdtBalance}
                      allowance={allowance}
                      now={now}
                    />
                    <ReceivableActions
                      id={receivable.id}
                      actions={
                        canCancel(receivable)
                          ? [
                              {
                                label: 'Cancel receivable',
                                functionName: 'cancelReceivable',
                                done: 'Cancelled. The document can back a new receivable.',
                                tone: 'destructive',
                                confirm: {
                                  title: `Cancel receivable #${receivable.id}?`,
                                  body: `${receivable.status === 'Listed' ? 'It comes off the marketplace. ' : ''}This can’t be undone, but you can create it again with the same PDF.`,
                                },
                              },
                            ]
                          : []
                      }
                    />
                  </>
                }
              />
            )}
          />
        </TabsContent>
      </Tabs>
    </>
  )
}

export default Seller
