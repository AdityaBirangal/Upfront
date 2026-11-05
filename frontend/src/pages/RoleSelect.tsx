import { Link } from 'react-router'
import { ROLES } from '../roles.ts'
import type { Role } from '../roles.ts'

const ROLE_PAGES: Partial<Record<Role, string>> = {
  Admin: '/app/admin',
  Buyer: '/app/buyer',
  Seller: '/app/seller',
}

function RoleSelect() {
  return (
    <main className="page">
      <div className="role-grid">
        {ROLES.map((role) => {
          const page = ROLE_PAGES[role]
          return page ? (
            <Link key={role} to={page} className="button">
              {role}
            </Link>
          ) : (
            <button key={role} type="button" className="button">
              {role}
            </button>
          )
        })}
      </div>
    </main>
  )
}

export default RoleSelect
