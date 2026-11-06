import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { isAddressEqual } from 'viem'
import type { Address } from 'viem'
import { simulateContract, writeContract } from 'wagmi/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { upfront, usdt } from '@/contracts.ts'
import { UNIT, WHOLE_NUMBER, canInvest, formatUsdt, unitsLeft } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'
import { useTx } from '@/tx.ts'
import { config } from '@/wagmi.ts'
import ErrorNote from './ErrorNote.tsx'
import Steps from './Steps.tsx'
import { stepState } from '@/lib/steps.ts'
import TxStatus from './TxStatus.tsx'

type Props = {
  receivable: Receivable
  wallet: Address
  /** Units this wallet already holds, for the cap. */
  held: bigint
  /** USDT balance and allowance for Upfront, in base units. Undefined while loading. */
  balance: bigint | undefined
  allowance: bigint | undefined
}

/** Buys units: approves USDT only if the allowance is short, then calls invest. */
function BuyForm({ receivable, wallet, held, balance, allowance }: Props) {
  const [units, setUnits] = useState('')
  const [error, setError] = useState('')
  const [needsApprove, setNeedsApprove] = useState(false)
  const approveTx = useTx()
  const investTx = useTx()
  const id = useId()
  const busy = approveTx.busy || investTx.busy
  const started = approveTx.phase !== 'idle' || investTx.phase !== 'idle'

  const isSeller = isAddressEqual(receivable.seller, wallet)
  const isBuyer = isAddressEqual(receivable.buyer, wallet)
  const open = canInvest(receivable)
  if (!open && !started) {
    return receivable.status === 'Listed' ? (
      <p className="text-muted-foreground text-sm">The due date has passed, so units can’t be bought.</p>
    ) : null
  }
  if ((isSeller || isBuyer) && !started) {
    return (
      <p className="text-muted-foreground text-sm">
        You’re the {isSeller ? 'seller' : 'buyer'} of this receivable, so you can’t buy its units.
      </p>
    )
  }

  const left = unitsLeft(receivable)
  const capLeft =
    receivable.maxUnitsPerInvestor > held ? receivable.maxUnitsPerInvestor - held : 0n
  const most = capLeft < left ? capLeft : left
  const wanted = WHOLE_NUMBER.test(units) ? BigInt(units) : null
  const cost = wanted === null ? null : wanted * receivable.unitPrice

  function problem() {
    if (capLeft === 0n) {
      return `This wallet already holds the cap of ${receivable.maxUnitsPerInvestor.toLocaleString()} units.`
    }
    if (wanted === null || cost === null) return 'Enter a whole number of units.'
    if (wanted > left) {
      return `Only ${left.toLocaleString()} ${left === 1n ? 'unit is' : 'units are'} left.`
    }
    if (wanted > capLeft) {
      return `This wallet can buy ${capLeft.toLocaleString()} more (cap ${receivable.maxUnitsPerInvestor.toLocaleString()} per investor).`
    }
    if (balance === undefined || allowance === undefined) {
      return 'Couldn’t read the USDT balance yet. Try again.'
    }
    if (balance < cost) {
      return `This costs ${formatUsdt(cost)} USDT, but the wallet has ${formatUsdt(balance)} USDT.`
    }
    return null
  }

  async function buy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const reason = problem()
    if (reason || wanted === null || cost === null || allowance === undefined) {
      setError(reason ?? '')
      return
    }
    setError('')
    approveTx.reset()
    investTx.reset()

    // Real USDT allows changing one non-zero allowance to another, so no reset to 0.
    const approve = allowance < cost
    setNeedsApprove(approve)
    if (approve) {
      const approved = await approveTx.run(async () => {
        const { request } = await simulateContract(config, {
          ...usdt,
          functionName: 'approve',
          args: [upfront.address, cost],
        })
        return writeContract(config, request)
      })
      if (!approved) return
    }

    const ok = await investTx.run(async () => {
      const { request } = await simulateContract(config, {
        ...upfront,
        functionName: 'invest',
        args: [receivable.id, wanted],
      })
      return writeContract(config, request)
    })
    if (ok) setUnits('')
  }

  return (
    <div className="space-y-4">
      {open && (
        <form onSubmit={buy} noValidate className="space-y-3">
          <fieldset disabled={busy} className="flex min-w-0 flex-wrap items-end gap-3">
            <div className="grid min-w-32 flex-1 gap-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor={`${id}-units`}>Units to buy</Label>
                {most > 0n && (
                  <button
                    type="button"
                    className="text-primary text-xs font-medium hover:underline"
                    onClick={() => setUnits(most.toString())}
                  >
                    Max {most.toLocaleString()}
                  </button>
                )}
              </div>
              <Input
                id={`${id}-units`}
                value={units}
                onChange={(event) => setUnits(event.target.value)}
                inputMode="numeric"
                placeholder="1"
                autoComplete="off"
                className="tabular"
              />
            </div>
            <Button type="submit" className="min-w-28">
              {busy ? 'Buying…' : 'Buy units'}
            </Button>
          </fieldset>
          {wanted !== null && cost !== null ? (
            <dl className="bg-muted/50 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg px-3 py-2.5 text-sm">
              <dt className="text-muted-foreground">You pay now</dt>
              <dd className="tabular text-right font-medium">{formatUsdt(cost)} USDT</dd>
              <dt className="text-muted-foreground">You receive at settlement</dt>
              <dd className="tabular text-right font-medium">{formatUsdt(wanted * UNIT)} USDT</dd>
              <dt className="text-muted-foreground">Profit</dt>
              <dd className="text-yield tabular text-right font-medium">
                +{formatUsdt(wanted * UNIT - cost)} USDT
              </dd>
              {allowance !== undefined && allowance < cost && (
                <dd className="text-muted-foreground col-span-2 pt-1 text-xs">
                  Your wallet asks you to approve USDT first, then to buy.
                </dd>
              )}
            </dl>
          ) : (
            <p className="text-muted-foreground text-xs">
              {capLeft === 0n
                ? 'This wallet holds the most units allowed per investor.'
                : `You can buy up to ${most.toLocaleString()} units.`}
            </p>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
        </form>
      )}
      {started &&
        (needsApprove ? (
          <Steps
            steps={[
              {
                label: 'Approve USDT',
                state: stepState(approveTx),
                detail: <TxStatus tx={approveTx} done="Approved." />,
              },
              {
                label: 'Buy units',
                state: stepState(investTx),
                detail:
                  investTx.phase === 'idle' ? (
                    <p className="text-muted-foreground text-sm">
                      {approveTx.phase === 'failed' ? 'Not sent.' : 'Waiting for the approval.'}
                    </p>
                  ) : (
                    <TxStatus tx={investTx} done="Bought. The units are in your portfolio." />
                  ),
              },
            ]}
          />
        ) : (
          <TxStatus tx={investTx} done="Bought. The units are in your portfolio." />
        ))}
    </div>
  )
}

export default BuyForm
