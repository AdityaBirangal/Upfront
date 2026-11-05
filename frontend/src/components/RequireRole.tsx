import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useConnection } from 'wagmi'
import { hasRole } from '../roles.ts'
import type { Assignment, Role } from '../roles.ts'

type Props = {
  role: Role
  assignments: Assignment[]
  children: (wallet: string) => ReactNode
}

function RequireRole({ role, assignments, children }: Props) {
  const { address, status } = useConnection()

  if (status === 'connected' && hasRole(assignments, address, role)) {
    return children(address)
  }

  return (
    <main className="panel">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>{role} access</h1>
      {status === 'connected' ? (
        <p>
          This wallet doesn't have the {role} role. Assign it on the{' '}
          <Link to="/app/admin">admin page</Link>.
        </p>
      ) : status === 'disconnected' ? (
        <p>Connect a wallet with the {role} role to open this page.</p>
      ) : (
        <p>Connecting…</p>
      )}
    </main>
  )
}

export default RequireRole
