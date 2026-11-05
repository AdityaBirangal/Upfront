import { useState } from 'react'
import type { FormEvent } from 'react'
import { isAddressEqual } from 'viem'
import type { Address } from 'viem'
import { simulateContract, writeContract } from 'wagmi/actions'
import { upfront, usdt } from '../contracts.ts'
import {
  UNIT,
  WHOLE_NUMBER,
  canInvest,
  formatUsdt,
  unitsLeft,
} from '../receivables.ts'
import type { Receivable } from '../receivables.ts'
import { useTx } from '../tx.ts'
import { config } from '../wagmi.ts'
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
  const busy = approveTx.busy || investTx.busy
  const started = approveTx.phase !== 'idle' || investTx.phase !== 'idle'

  const isSeller = isAddressEqual(receivable.seller, wallet)
  const isBuyer = isAddressEqual(receivable.buyer, wallet)
  const open = canInvest(receivable)
  if (!open && !started) {
    return receivable.status === 'Listed' ? (
      <p>The due date has passed, so units can't be bought.</p>
    ) : null
  }
  if ((isSeller || isBuyer) && !started) {
    return (
      <p className="hint">
        You're the {isSeller ? 'seller' : 'buyer'} of this receivable, so you
        can't buy its units.
      </p>
    )
  }

  const left = unitsLeft(receivable)
  const capLeft =
    receivable.maxUnitsPerInvestor > held
      ? receivable.maxUnitsPerInvestor - held
      : 0n
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
      return "Couldn't read the USDT balance yet. Try again."
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
    <>
      {open && (
        <form className="inline-form" onSubmit={buy} noValidate>
          <fieldset className="inline-form" disabled={busy}>
            <label className="field">
              Units to buy
              <input
                className="input"
                value={units}
                onChange={(event) => setUnits(event.target.value)}
                inputMode="numeric"
                placeholder="1"
                autoComplete="off"
              />
            </label>
            <button type="submit" className="button">
              Buy units
            </button>
          </fieldset>
          <p className="field-wide preview">
            {wanted !== null && cost !== null ? (
              <>
                Pay {formatUsdt(cost)} USDT now · Receive{' '}
                {formatUsdt(wanted * UNIT)} USDT after settlement
                {allowance !== undefined && allowance < cost
                  ? ' · Needs a USDT approval first'
                  : ''}
              </>
            ) : (
              <>
                You can buy up to{' '}
                {(capLeft < left ? capLeft : left).toLocaleString()} units.
              </>
            )}
          </p>
          {error && (
            <p className="field-wide form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
      {started && (
        <ol className="steps">
          {needsApprove && (
            <li>
              Approve USDT:{' '}
              <TxStatus tx={approveTx} done="approved." className="inline" />
            </li>
          )}
          <li>
            Buy units:{' '}
            {investTx.phase === 'idle' ? (
              approveTx.phase === 'failed' ? (
                'not sent.'
              ) : (
                'waiting for the approval.'
              )
            ) : (
              <TxStatus
                tx={investTx}
                done="bought. The units are in your portfolio."
                className="inline"
              />
            )}
          </li>
        </ol>
      )}
    </>
  )
}

export default BuyForm
