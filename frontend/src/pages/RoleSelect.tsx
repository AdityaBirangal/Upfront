import { Link } from 'react-router'
import { ROLES } from '../roles.ts'

function RoleSelect() {
  return (
    <main className="page">
      <div className="role-grid">
        {ROLES.map((role) =>
          role === 'Admin' ? (
            <Link key={role} to="/app/admin" className="button">
              {role}
            </Link>
          ) : (
            <button key={role} type="button" className="button">
              {role}
            </button>
          ),
        )}
      </div>
    </main>
  )
}

export default RoleSelect
