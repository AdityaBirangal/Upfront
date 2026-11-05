import { Link } from 'react-router'
import { ROLES } from '../roles.ts'
import type { Role } from '../roles.ts'

const ROLE_PAGES: Record<Role, string> = {
  Admin: '/app/admin',
  Buyer: '/app/buyer',
  Investor: '/app/invest',
  Seller: '/app/seller',
}

function RoleSelect() {
  return (
    <main className="page">
      <div className="role-grid">
        {ROLES.map((role) => (
          <Link key={role} to={ROLE_PAGES[role]} className="button">
            {role}
          </Link>
        ))}
      </div>
    </main>
  )
}

export default RoleSelect
