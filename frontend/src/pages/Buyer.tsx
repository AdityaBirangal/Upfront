import { Link } from 'react-router'
import { isAddressEqual } from 'viem'
import type { Address } from 'viem'
import { useReadContracts } from 'wagmi'
import { simulateContract, writeContract } from 'wagmi/actions'
import DueCountdown from '../components/DueCountdown.tsx'
import ReceivableActions from '../components/ReceivableActions.tsx'
import type { ReceivableAction } from '../components/ReceivableActions.tsx'
import ReceivableList from '../components/ReceivableList.tsx'
import TxStatus from '../components/TxStatus.tsx'
import { BACKEND_URL, documentUrl } from '../backend.ts'
import { useGracePeriod, useReceivables } from '../chain.ts'
import { upfront, usdt } from '../contracts.ts'
import {
  canReject,
  canSettle,
  canVerify,
  formatUsdt,
  isAwaitingPayment,
} from '../receivables.ts'
import type { Receivable } from '../receivables.ts'
import { useTx } from '../tx.ts'
import { useNow } from '../useNow.ts'
import { config } from '../wagmi.ts'

type Props = {
  wallet: Address
}

type Money = { balance: bigint; allowance: bigint } | undefined

function actionsFor(
  receivable: Receivable,
  now: bigint,
  wallet: Address,
  money: Money,
): ReceivableAction[] {
  const actions: ReceivableAction[] = []
  const owed = receivable.faceValue
  if (
    canSettle(receivable, now, wallet) &&
    money &&
    money.allowance >= owed &&
    money.balance >= owed
  ) {
    actions.push({
      label: `Settle · pay ${formatUsdt(owed)} USDT`,
      functionName: 'settle',
      done: 'Settled. Holders can now claim 1 USDT per unit.',
      confirm: `Pay ${formatUsdt(owed)} USDT to settle receivable #${receivable.id}?`,
    })
  }
  if (canVerify(receivable)) {
    actions.push({
      label: 'Verify',
      functionName: 'verifyReceivable',
      done: 'Verified. Investors now see the Verified tag.',
      confirm: `Verify receivable #${receivable.id}? You confirm that you owe this amount by the due date. The tag can't be removed.`,
    })
  }
  if (canReject(receivable)) {
    actions.push({
      label: 'Reject',
      functionName: 'rejectReceivable',
      done: 'Rejected.',
      confirm: `Reject receivable #${receivable.id}? This closes it for good.`,
    })
  }
  return actions
}

/** Why Settle isn't shown on a receivable that's waiting for payment, or null. */
function settleNote(
  receivable: Receivable,
  now: bigint,
  money: Money,
): string | null {
  if (!isAwaitingPayment(receivable)) return null
  const owed = receivable.faceValue
  if (now < receivable.dueDate) {
    const approved = money !== undefined && money.allowance >= owed
    return `You owe ${formatUsdt(owed)} USDT. Settle opens at the due date.${approved ? '' : ' Approve USDT before then.'}`
  }
  if (!money) return 'Reading your USDT balance…'
  if (money.balance < owed) {
    return `Settling needs ${formatUsdt(owed)} USDT, but this wallet has ${formatUsdt(money.balance)} USDT.`
  }
  if (money.allowance < owed) {
    return `Approve at least ${formatUsdt(owed)} USDT above to settle.`
  }
  return null
}

function Buyer({ wallet }: Props) {
  const { receivables, isPending, isError } = useReceivables()
  const mine = receivables
    .filter((r) => isAddressEqual(r.buyer, wallet))
    .reverse()
  const now = useNow()
  const grace = useGracePeriod()
  const approveTx = useTx()

  const read = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...usdt, functionName: 'balanceOf', args: [wallet] },
      { ...usdt, functionName: 'allowance', args: [wallet, upfront.address] },
    ],
  })
  const money: Money = read.data
    ? { balance: read.data[0], allowance: read.data[1] }
    : undefined

  // Settle pulls the face value from this wallet, so the approval has to cover every open one.
  const open = mine.filter(isAwaitingPayment)
  const owed = open.reduce((sum, r) => sum + r.faceValue, 0n)

  function approve() {
    return approveTx.run(async () => {
      const { request } = await simulateContract(config, {
        ...usdt,
        functionName: 'approve',
        args: [upfront.address, owed],
      })
      return writeContract(config, request)
    })
  }

  return (
    <main className="panel">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>Buyer</h1>
      <p className="hint">
        Receivables where this wallet is the buyer. Check the agreement, then
        Verify to confirm you owe the amount: investors see a Verified tag.
        Reject closes a receivable you don't recognise, as long as it isn't
        verified and no units are sold. Once one is due, Settle pays its face
        value.
      </p>

      <section className="summary">
        <h2>Payments</h2>
        {read.isPending ? (
          <p>Reading USDT balance…</p>
        ) : read.isError || !money ? (
          <p className="form-error">Couldn't read USDT from the chain.</p>
        ) : (
          <>
            <p>
              Owed on listed receivables: <strong>{formatUsdt(owed)} USDT</strong>{' '}
              ({open.length} {open.length === 1 ? 'receivable' : 'receivables'})
              <br />
              Approved for Upfront: {formatUsdt(money.allowance)} USDT ·
              Wallet balance: {formatUsdt(money.balance)} USDT
            </p>
            {money.balance < owed && (
              <p className="form-error">
                The wallet has less USDT than it owes.
              </p>
            )}
            {owed > 0n && money.allowance < owed ? (
              <button
                type="button"
                className="button"
                disabled={approveTx.busy}
                onClick={approve}
              >
                Approve {formatUsdt(owed)} USDT
              </button>
            ) : owed > 0n ? (
              <p>The approval covers everything owed.</p>
            ) : null}
            <TxStatus
              tx={approveTx}
              done="Approved. Settle each receivable once it's due."
            />
          </>
        )}
      </section>

      <h2>Receivables</h2>

      <ReceivableList
        receivables={mine}
        isPending={isPending}
        isError={isError}
        empty="No receivables name this wallet as the buyer."
        extra={(receivable) => (
          <>
            {BACKEND_URL && (
              <p>
                <a
                  href={documentUrl(receivable.docHash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open agreement PDF
                </a>
              </p>
            )}
            <DueCountdown receivable={receivable} now={now} grace={grace} />
            {settleNote(receivable, now, money) && (
              <p className="hint">{settleNote(receivable, now, money)}</p>
            )}
            <ReceivableActions
              id={receivable.id}
              actions={actionsFor(receivable, now, wallet, money)}
            />
          </>
        )}
      />
    </main>
  )
}

export default Buyer
