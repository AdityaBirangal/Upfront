import { TriangleAlert } from 'lucide-react'
import { useConnection, useSwitchChain } from 'wagmi'
import { Button } from '@/components/ui/button'
import { targetChain } from '@/wagmi.ts'
import { walletErrorMessage } from '@/lib/wallet.ts'

/** Shown across the top when the wallet is on another chain. Switching adds the chain if needed. */
function NetworkBanner() {
  const { chainId, status } = useConnection()
  const switchChain = useSwitchChain()
  if (status !== 'connected' || chainId === targetChain.id) return null

  return (
    <div
      role="alert"
      className="border-warning/30 bg-warning/10 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 text-sm md:px-6"
    >
      <p className="flex items-center gap-2">
        <TriangleAlert className="text-warning size-4 shrink-0" aria-hidden />
        <span>
          {switchChain.error
            ? walletErrorMessage(switchChain.error)
            : `Your wallet is on another network. Upfront runs on ${targetChain.name}.`}
        </span>
      </p>
      <Button
        size="sm"
        variant="outline"
        disabled={switchChain.isPending}
        onClick={() => switchChain.mutate({ chainId: targetChain.id })}
      >
        {switchChain.isPending ? 'Switching…' : `Switch to ${targetChain.name}`}
      </Button>
    </div>
  )
}

export default NetworkBanner
