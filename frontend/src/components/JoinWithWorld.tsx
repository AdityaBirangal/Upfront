import { IDKitRequestWidget, proofOfHuman } from '@worldcoin/idkit'
import type { IDKitErrorCodes, IDKitResult, RpContext } from '@worldcoin/idkit'
import { EyeOff, Loader2, ScanFace, UserCheck } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Address } from 'viem'
import { simulateContract, writeContract } from 'wagmi/actions'
import { Button } from '@/components/ui/button'
import { gate } from '@/contracts.ts'
import { revertName, useTx } from '@/tx.ts'
import { config } from '@/wagmi.ts'
import {
  WORLD_APP_ID,
  WORLD_ENVIRONMENT,
  getRpContext,
  verifyProof,
} from '@/world.ts'
import type { Voucher } from '@/world.ts'
import ErrorNote from './ErrorNote.tsx'
import TxStatus from './TxStatus.tsx'

const CANCELLED = "Verification didn't finish, so this wallet still can't invest."
const WORLD_MESSAGES: Partial<Record<IDKitErrorCodes, string>> = {
  max_verifications_reached: 'This person already has an investor wallet.',
  nullifier_replayed: 'This person already has an investor wallet.',
  credential_unavailable: 'Proof of Human is needed to join. This World ID doesn’t have it yet.',
}

type Props = { wallet: Address }

/** Lets a wallet join as an investor by proving it belongs to a unique human. */
function JoinWithWorld({ wallet }: Props) {
  const tx = useTx()
  const [request, setRequest] = useState<{ action: string; context: RpContext }>()
  const [open, setOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  // Kept so a rejected wallet prompt can be retried without proving again.
  const voucher = useRef<Voucher>(undefined)
  const proved = useRef(false)

  async function join() {
    const signed = voucher.current
    const contract = gate
    if (!signed || !contract) return
    await tx.run(async () => {
      try {
        const { request } = await simulateContract(config, {
          ...contract,
          functionName: 'join',
          args: [signed.nullifierHash, BigInt(signed.expiry), signed.signature],
        })
        return await writeContract(config, request)
      } catch (caught) {
        // The contract refused this voucher, so retrying needs a new proof, not the same voucher.
        if (revertName(caught)) voucher.current = undefined
        throw caught
      }
    })
  }

  async function start() {
    setError('')
    tx.reset()
    if (voucher.current && voucher.current.expiry > Date.now() / 1000 + 30) {
      await join()
      return
    }

    voucher.current = undefined
    proved.current = false
    setStarting(true)
    try {
      const { action, ...context } = await getRpContext()
      setRequest({ action, context })
      setOpen(true)
    } catch (caught) {
      setError((caught as Error).message)
    } finally {
      setStarting(false)
    }
  }

  async function handleVerify(proof: IDKitResult) {
    try {
      voucher.current = await verifyProof(proof, wallet)
      proved.current = true
    } catch (caught) {
      setError((caught as Error).message)
      throw caught
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next && !proved.current) setError((current) => current || CANCELLED)
  }

  function onError(code: IDKitErrorCodes) {
    console.error('World ID error', code)
    setError((current) => current || WORLD_MESSAGES[code] || CANCELLED)
  }

  const busy = starting || tx.busy

  return (
    <div className="bg-card rounded-xl border p-5 text-left shadow-sm">
      <ul className="text-muted-foreground space-y-2.5 text-sm">
        <li className="flex items-start gap-2.5">
          <UserCheck className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          Proves you’re one unique human. One investor wallet per person.
        </li>
        <li className="flex items-start gap-2.5">
          <EyeOff className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          Shares nothing else about you: no name, no documents.
        </li>
      </ul>
      <Button size="lg" className="mt-5 w-full" onClick={() => void start()} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ScanFace aria-hidden />}
        Verify with World ID
      </Button>
      {error && <ErrorNote className="mt-3">{error}</ErrorNote>}
      <TxStatus tx={tx} done="You’ve joined as an investor." className="mt-3" />

      {request && WORLD_APP_ID && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={onOpenChange}
          app_id={WORLD_APP_ID}
          action={request.action}
          rp_context={request.context}
          allow_legacy_proofs={false}
          preset={proofOfHuman({ signal: wallet.toLowerCase() })}
          environment={WORLD_ENVIRONMENT}
          handleVerify={handleVerify}
          onSuccess={join}
          onError={onError}
        />
      )}
    </div>
  )
}

export default JoinWithWorld
