import { ShieldCheck, ShieldX } from 'lucide-react'
import { useState } from 'react'
import { isAddressEqual } from 'viem'
import type { Address } from 'viem'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PageHeader from '@/components/PageHeader.tsx'
import ReceivableActions from '@/components/ReceivableActions.tsx'
import type { ReceivableAction } from '@/components/ReceivableActions.tsx'
import ReceivableTable from '@/components/ReceivableTable.tsx'
import { BUYER_COLUMNS, BuyerRow } from '@/components/ReceivableRows.tsx'
import { useReceivables } from '@/chain.ts'
import { canReject, canVerify } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'
import { useNow } from '@/useNow.ts'

type Props = {
  wallet: Address
}

function actionsFor(receivable: Receivable): ReceivableAction[] {
  const actions: ReceivableAction[] = []
  if (canVerify(receivable)) {
    actions.push({
      label: 'Verify',
      icon: ShieldCheck,
      functionName: 'verifyReceivable',
      done: 'Verified. Investors now see the Verified tag.',
      tone: 'primary',
      confirm: {
        title: `Verify receivable #${receivable.id}?`,
        body: 'You confirm that you owe this amount by the due date. The tag can’t be removed.',
      },
    })
  }
  if (canReject(receivable)) {
    actions.push({
      label: 'Reject',
      icon: ShieldX,
      functionName: 'rejectReceivable',
      done: 'Rejected.',
      tone: 'destructive',
      confirm: {
        title: `Reject receivable #${receivable.id}?`,
        body: 'This closes it for good.',
      },
    })
  }
  return actions
}

const needsReview = (r: Receivable) => canVerify(r) || canReject(r)

function Buyer({ wallet }: Props) {
  const { receivables, isPending, isError } = useReceivables()
  const mine = receivables.filter((r) => isAddressEqual(r.buyer, wallet)).reverse()
  const pending = mine.filter(needsReview)
  const [tab, setTab] = useState<'review' | 'all'>('review')
  const shown = tab === 'review' ? pending : mine
  const now = useNow()

  return (
    <>
      <PageHeader
        title="Verify"
        description="Receivables that name this wallet as the buyer. Open the contract, then Verify to confirm it’s genuine and you owe the amount, so investors see a Verified tag. Reject closes one you don’t recognise, as long as it isn’t verified and no units are sold."
      />
      <Tabs value={tab} onValueChange={(value) => setTab(value as 'review' | 'all')} className="mb-4">
        <TabsList>
          <TabsTrigger value="review">
            Needs review <span className="text-muted-foreground tabular ml-1">{pending.length}</span>
          </TabsTrigger>
          <TabsTrigger value="all">
            All <span className="text-muted-foreground tabular ml-1">{mine.length}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <ReceivableTable
        label="Receivables naming this wallet"
        receivables={shown}
        isPending={isPending}
        isError={isError}
        columns={BUYER_COLUMNS}
        defaultSort={{ key: 'Due', dir: 'asc' }}
        empty={
          tab === 'review' && mine.length > 0
            ? { title: 'Nothing to review', body: 'Every receivable naming this wallet has been handled.' }
            : { title: 'No receivables name this wallet', body: 'When a seller names you as the buyer, it appears here for you to verify.' }
        }
        row={(receivable) => (
          <BuyerRow
            key={receivable.id}
            r={receivable}
            now={now}
            review={needsReview(receivable) ? <ReceivableActions id={receivable.id} actions={actionsFor(receivable)} /> : null}
          />
        )}
      />
    </>
  )
}

export default Buyer
