import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { getAddress, isAddressEqual } from 'viem'
import { useConnection } from 'wagmi'
import { simulateContract, writeContract } from 'wagmi/actions'
import TxStatus from '../components/TxStatus.tsx'
import { useRoleMembers, useRoles } from '../chain.ts'
import { ROLE_IDS, access } from '../contracts.ts'
import { ROLES, WALLET_ADDRESS } from '../roles.ts'
import type { Assignment, Role } from '../roles.ts'
import { useTx } from '../tx.ts'
import { config } from '../wagmi.ts'

type RowProps = {
  assignment: Assignment
  disabledReason: string | null
}

function AssignmentRow({ assignment, disabledReason }: RowProps) {
  const tx = useTx()

  function revoke() {
    void tx.run(async () => {
      const { request } = await simulateContract(config, {
        ...access,
        functionName: 'revokeRole',
        args: [ROLE_IDS[assignment.role], assignment.address],
      })
      return writeContract(config, request)
    })
  }

  return (
    <li className="assignment">
      <code className="address">{assignment.address}</code>
      <span>{assignment.role}</span>
      <button
        type="button"
        className="button"
        disabled={Boolean(disabledReason) || tx.busy}
        title={disabledReason ?? undefined}
        onClick={revoke}
      >
        {tx.busy ? 'Revoking…' : 'Revoke'}
      </button>
      <TxStatus tx={tx} done="Role revoked." className="field-wide" />
    </li>
  )
}

function AdminRoles() {
  const { address } = useConnection()
  const members = useRoleMembers()
  const { roles: myRoles, isPending: rolesPending } = useRoles(address)
  const [input, setInput] = useState('')
  const [role, setRole] = useState<Role>(ROLES[0])
  const [error, setError] = useState('')
  const tx = useTx()

  const isAdmin = myRoles.has('Admin')
  const adminCount = members.assignments.filter((a) => a.role === 'Admin').length

  async function assign(event: FormEvent) {
    event.preventDefault()
    const trimmed = input.trim()

    if (!WALLET_ADDRESS.test(trimmed)) {
      setError('Enter a valid wallet address (0x followed by 40 hex characters).')
      return
    }
    const target = getAddress(trimmed.toLowerCase())
    const alreadyAssigned = members.assignments.some(
      (a) => a.role === role && isAddressEqual(a.address, target),
    )
    if (alreadyAssigned) {
      setError(`This wallet already has the ${role} role.`)
      return
    }

    setError('')
    const ok = await tx.run(async () => {
      const { request } = await simulateContract(config, {
        ...access,
        functionName: 'grantRole',
        args: [ROLE_IDS[role], target],
      })
      return writeContract(config, request)
    })
    if (ok) setInput('')
  }

  function revokeBlocked(assignment: Assignment) {
    if (!address) return 'Connect an admin wallet to revoke roles.'
    if (!isAdmin) return 'Only an admin wallet can revoke roles.'
    if (assignment.role === 'Admin' && adminCount <= 1) {
      return "This is the last admin. Add another admin before revoking it."
    }
    return null
  }

  let accessNote = ''
  if (!address) accessNote = 'Connect an admin wallet to assign or revoke roles.'
  else if (rolesPending) accessNote = "Checking this wallet's roles…"
  else if (!isAdmin) {
    accessNote = "This wallet isn't an admin, so it can view roles but not change them."
  }

  return (
    <main className="panel">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>Role assignments</h1>
      {accessNote && <p className="hint">{accessNote}</p>}

      <form className="assign-form" onSubmit={assign} noValidate>
        <label className="field">
          Wallet address
          <input
            className="input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
            disabled={!isAdmin || tx.busy}
          />
        </label>
        <label className="field">
          Role
          <select
            className="input"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            disabled={!isAdmin || tx.busy}
          >
            {ROLES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="button" disabled={!isAdmin || tx.busy}>
          {tx.busy ? 'Assigning…' : 'Assign'}
        </button>
      </form>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : (
        <TxStatus tx={tx} done="Role assigned." />
      )}

      <h2>Existing assignments</h2>
      {members.isPending ? (
        <p>Loading roles…</p>
      ) : members.isError ? (
        <p className="form-error">Couldn't read roles from the chain.</p>
      ) : members.assignments.length === 0 ? (
        <p>No roles assigned yet.</p>
      ) : (
        <ul className="assignment-list">
          {members.assignments.map((assignment) => (
            <AssignmentRow
              key={`${assignment.address}:${assignment.role}`}
              assignment={assignment}
              disabledReason={revokeBlocked(assignment)}
            />
          ))}
        </ul>
      )}
    </main>
  )
}

export default AdminRoles
