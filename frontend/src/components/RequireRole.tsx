import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Address } from 'viem'
import { useConnection } from 'wagmi'
import { useRoles } from '../chain.ts'
import type { Role } from '../roles.ts'

type Props = {
  role: Role
  children: (wallet: Address) => ReactNode
}

function RequireRole({ role, children }: Props) {
  const { address, status } = useConnection()
  const { roles, isPending, isError } = useRoles(address)

  if (status === 'connected' && roles.has(role)) {
    return children(address)
  }

  let message = <p>Connecting…</p>
  if (status === 'disconnected') {
    message = <p>Connect a wallet with the {role} role to open this page.</p>
  } else if (status === 'connected' && isPending) {
    message = <p>Checking this wallet's roles…</p>
  } else if (status === 'connected' && isError) {
    message = <p className="form-error">Couldn't read roles from the chain.</p>
  } else if (status === 'connected') {
    message = (
      <p>
        This wallet doesn't have the {role} role. An admin can assign it on the{' '}
        <Link to="/app/admin">admin page</Link>.
      </p>
    )
  }

  return (
    <main className="panel">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>{role} access</h1>
      {message}
    </main>
  )
}

export default RequireRole
