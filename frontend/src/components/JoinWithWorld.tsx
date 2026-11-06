import { IDKitRequestWidget, proofOfHuman } from '@worldcoin/idkit'
import type { IDKitErrorCodes, IDKitResult, RpContext } from '@worldcoin/idkit'
import { Loader2, ScanFace } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Address } from 'viem'
import { simulateContract, writeContract } from 'wagmi/actions'
import { Button } from '@/components/ui/button'
import { gate } from '@/contracts.ts'
import { useTx } from '@/tx.ts'
import { config } from '@/wagmi.ts'
import {
  WORLD_ACTION,
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
  const [rpContext, setRpContext] = useState<RpContext>()
  const [open, setOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  // Kept so a rejected wallet prompt can be retried without proving again.
  const voucher = useRef<Voucher>(undefined)

  async function join() {
    const signed = voucher.current
    const contract = gate
    if (!signed || !contract) return
    await tx.run(async () => {
      const { request } = await simulateContract(config, {
        ...contract,
        functionName: 'join',
        args: [signed.nullifierHash, BigInt(signed.expiry), signed.signature],
      })
      return writeContract(config, request)
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
    setStarting(true)
    try {
      setRpContext(await getRpContext())
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
    } catch (caught) {
      setError((caught as Error).message)
      throw caught
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next && !voucher.current) setError((current) => current || CANCELLED)
  }

  function onError(code: IDKitErrorCodes) {
    console.error('World ID error', code)
    setError((current) => current || WORLD_MESSAGES[code] || CANCELLED)
  }

  const busy = starting || tx.busy

  return (
    <div className="mb-6">
      <p className="text-muted-foreground text-sm">
        Verify with World ID to join as an investor. It proves you’re one unique human, and shares
        nothing else about you.
      </p>
      <div className="mt-5">
        <Button onClick={() => void start()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ScanFace aria-hidden />}
          Verify with World ID
        </Button>
      </div>
      {error && <ErrorNote className="mt-3 justify-center">{error}</ErrorNote>}
      <TxStatus tx={tx} done="You’ve joined as an investor." className="mt-3 justify-center" />

      {rpContext && WORLD_APP_ID && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={onOpenChange}
          app_id={WORLD_APP_ID}
          action={WORLD_ACTION}
          rp_context={rpContext}
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
