import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { ROLES } from '../roles.ts'
import type { Assignment, Role } from '../roles.ts'

const WALLET_ADDRESS = /^0x[0-9a-fA-F]{40}$/

type Props = {
  assignments: Assignment[]
  onChange: (assignments: Assignment[]) => void
}

function AdminRoles({ assignments, onChange }: Props) {
  const [address, setAddress] = useState('')
  const [role, setRole] = useState<Role>(ROLES[0])
  const [error, setError] = useState('')

  function assign(event: FormEvent) {
    event.preventDefault()
    const trimmed = address.trim()

    if (!WALLET_ADDRESS.test(trimmed)) {
      setError('Enter a valid wallet address (0x followed by 40 hex characters).')
      return
    }

    const alreadyAssigned = assignments.some(
      (a) =>
        a.role === role && a.address.toLowerCase() === trimmed.toLowerCase(),
    )
    if (alreadyAssigned) {
      setError(`This wallet already has the ${role} role.`)
      return
    }

    onChange([...assignments, { address: trimmed, role }])
    setAddress('')
    setError('')
  }

  function revoke(target: Assignment) {
    onChange(assignments.filter((a) => a !== target))
  }

  return (
    <main className="admin">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>Role assignments</h1>

      <form className="assign-form" onSubmit={assign} noValidate>
        <label className="field">
          Wallet address
          <input
            className="input"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="field">
          Role
          <select
            className="input"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            {ROLES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="button">
          Assign
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <h2>Existing assignments</h2>
      {assignments.length === 0 ? (
        <p>No roles assigned yet.</p>
      ) : (
        <ul className="assignment-list">
          {assignments.map((assignment) => (
            <li
              key={`${assignment.address}:${assignment.role}`}
              className="assignment"
            >
              <code className="address">{assignment.address}</code>
              <span>{assignment.role}</span>
              <button
                type="button"
                className="button"
                onClick={() => revoke(assignment)}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default AdminRoles
