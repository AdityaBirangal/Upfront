import { Link } from 'react-router'
import { useConnection } from 'wagmi'
import { useRoles } from '../chain.ts'
import { ROLES } from '../roles.ts'
import type { Role } from '../roles.ts'

const ROLE_PAGES: Record<Role, string> = {
  Admin: '/app/admin',
  Buyer: '/app/buyer',
  Investor: '/app/invest',
  Seller: '/app/seller',
}

function RoleSelect() {
  const { address } = useConnection()
  const { roles } = useRoles(address)

  return (
    <main className="page">
      <div className="role-select">
        <div className="role-grid">
          {ROLES.map((role) => (
            <Link
              key={role}
              to={ROLE_PAGES[role]}
              className={`button ${roles.has(role) ? 'held' : ''}`}
            >
              {role}
              {roles.has(role) && <span className="sr-only"> (your role)</span>}
            </Link>
          ))}
        </div>
        <p className="hint">
          {address
            ? roles.size > 0
              ? 'Highlighted roles belong to this wallet.'
              : "This wallet doesn't hold any role yet."
            : 'Connect a wallet to see your roles.'}
        </p>
      </div>
    </main>
  )
}

export default RoleSelect
