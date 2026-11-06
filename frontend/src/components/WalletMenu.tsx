import { ChevronDown, Copy, ExternalLink, LogOut, Wallet } from 'lucide-react'
import { formatUnits } from 'viem'
import { useBalance, useConnect, useConnection, useConnectors, useDisconnect, useReadContract } from 'wagmi'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRoles } from '@/chain.ts'
import { explorerAddressUrl, usdt } from '@/contracts.ts'
import { formatUsdt, shortAddress } from '@/receivables.ts'
import { ROLES } from '@/roles.ts'
import { targetChain } from '@/wagmi.ts'
import { walletErrorMessage } from '@/lib/wallet.ts'
import Identicon from './Identicon.tsx'


/** Connect, or the connected wallet with its balances, roles and Disconnect. */
export function ConnectButton({ size = 'sm' }: { size?: 'sm' | 'default' | 'lg' }) {
  const { status } = useConnection()
  const connectors = useConnectors()
  const connect = useConnect()

  return (
    <Button
      size={size}
      disabled={status === 'connecting' || status === 'reconnecting' || connect.isPending}
      onClick={() =>
        connect.mutate(
          { connector: connectors[0] },
          { onError: (error) => toast.error(walletErrorMessage(error)) },
        )
      }
    >
      <Wallet />
      {status === 'disconnected' && !connect.isPending ? 'Connect wallet' : 'Connecting…'}
    </Button>
  )
}

function WalletMenu() {
  const { address, status } = useConnection()
  const disconnect = useDisconnect()
  const { roles } = useRoles(address)
  const native = useBalance({ address, chainId: targetChain.id, query: { enabled: Boolean(address) } })
  const stable = useReadContract({
    ...usdt,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  })

  if (status !== 'connected' || !address) return <ConnectButton />

  const explorer = explorerAddressUrl(address)
  const held = ROLES.filter((role) => roles.has(role))

  async function copy() {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      toast.success('Address copied')
    } catch {
      toast.error("Couldn't copy the address.")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 pr-2 pl-1.5">
          <Identicon address={address} className="size-5" />
          {stable.data !== undefined && (
            <span className="tabular hidden md:inline">{formatUsdt(stable.data)} USDT</span>
          )}
          <span className="text-muted-foreground hidden font-mono text-xs sm:inline">
            {shortAddress(address)}
          </span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          <Identicon address={address} className="size-8" />
          <div className="min-w-0">
            <p className="font-mono text-sm">{shortAddress(address)}</p>
            <p className="text-muted-foreground text-xs font-normal">
              {held.length > 0 ? held.join(', ') : 'No roles yet'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <dl className="grid grid-cols-2 gap-y-1.5 px-2 py-1.5 text-sm">
          <dt className="text-muted-foreground">USDT</dt>
          <dd className="tabular text-right font-medium">
            {stable.isError ? 'Unavailable' : stable.data === undefined ? '…' : formatUsdt(stable.data)}
          </dd>
          <dt className="text-muted-foreground">{targetChain.nativeCurrency.symbol}</dt>
          <dd className="tabular text-right font-medium">
            {native.isError
              ? 'Unavailable'
              : native.data === undefined
                ? '…'
                : Number(formatUnits(native.data.value, native.data.decimals)).toLocaleString([], {
                    maximumFractionDigits: 4,
                  })}
          </dd>
        </dl>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={copy}>
          <Copy /> Copy address
        </DropdownMenuItem>
        {explorer && (
          <DropdownMenuItem asChild>
            <a href={explorer} target="_blank" rel="noreferrer">
              <ExternalLink /> View on explorer
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => disconnect.mutate()}>
          <LogOut /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default WalletMenu
