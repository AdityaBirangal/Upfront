import { KeyRound, Loader2, ScanFace } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Address } from 'viem'
import { useConnection } from 'wagmi'
import { Button } from '@/components/ui/button'
import { useRoles } from '@/chain.ts'
import type { Role } from '@/roles.ts'
import { worldEnabled } from '@/world.ts'
import ErrorNote from './ErrorNote.tsx'
import JoinWithWorld from './JoinWithWorld.tsx'
import { ConnectButton } from './WalletMenu.tsx'

type Props = {
  role: Role
  children: (wallet: Address) => ReactNode
}

/** Opens the page only for a wallet that holds the role onchain. */
function RequireRole({ role, children }: Props) {
  const { address, status } = useConnection()
  const { roles, isPending, isError } = useRoles(address)

  if (status === 'connected' && roles.has(role)) {
    return children(address)
  }

  const canJoinWithWorld =
    role === 'Investor' && worldEnabled && status === 'connected' && !!address
  const checking =
    status === 'connecting' || status === 'reconnecting' || (status === 'connected' && isPending)

  let body: ReactNode
  let joining = false
  if (status === 'disconnected') {
    body = (
      <>
        <p className="text-muted-foreground text-sm">
          Connect a wallet with the {role} role to open this page.
        </p>
        <div className="mt-5">
          <ConnectButton size="default" />
        </div>
      </>
    )
  } else if (checking) {
    body = (
      <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Checking this wallet’s roles…
      </p>
    )
  } else if (isError) {
    body = <ErrorNote className="justify-center">Couldn’t read roles from the chain.</ErrorNote>
  } else if (canJoinWithWorld && address) {
    joining = true
    body = (
      <>
        <p className="text-muted-foreground mb-6 text-sm">
          Verify with World ID to start buying receivables with this wallet.
        </p>
        <JoinWithWorld key={address} wallet={address} />
        <div className="text-muted-foreground my-6 flex items-center gap-3 text-xs uppercase">
          <span className="bg-border h-px flex-1" />
          or
          <span className="bg-border h-px flex-1" />
        </div>
        <p className="text-muted-foreground text-sm">
          Ask an admin to assign the Investor role on the{' '}
          <Link
            to="/app/admin"
            className="text-foreground font-medium underline underline-offset-4 hover:no-underline"
          >
            Roles page
          </Link>
          .
        </p>
      </>
    )
  } else {
    body = (
      <>
        <p className="text-muted-foreground text-sm">
          This wallet doesn’t have the {role} role. An admin can assign it on the Roles page.
        </p>
        <div className="mt-5">
          <Button variant="outline" asChild>
            <Link to="/app/admin">Open Roles</Link>
          </Button>
        </div>
      </>
    )
  }

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="bg-primary/10 text-primary mx-auto mb-5 flex size-12 items-center justify-center rounded-full">
        {joining ? (
          <ScanFace className="size-5" aria-hidden />
        ) : (
          <KeyRound className="size-5" aria-hidden />
        )}
      </div>
      <h1 className="mb-2 text-xl font-semibold tracking-tight">
        {joining ? 'Join as an investor' : `${role} access`}
      </h1>
      {body}
    </div>
  )
}

export default RequireRole
