const ROLES = ['Business', 'Investor', 'Customer', 'Admin']

function RoleSelect() {
  return (
    <main className="page">
      <div className="role-grid">
        {ROLES.map((role) => (
          <button key={role} type="button" className="button">
            {role}
          </button>
        ))}
      </div>
    </main>
  )
}

export default RoleSelect
