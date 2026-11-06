import { Info, UserMinus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { getAddress, isAddressEqual } from 'viem'
import { useConnection } from 'wagmi'
import { simulateContract, writeContract } from 'wagmi/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import Address from '@/components/Address.tsx'
import ConfirmAction from '@/components/ConfirmAction.tsx'
import EmptyState from '@/components/EmptyState.tsx'
import ErrorNote from '@/components/ErrorNote.tsx'
import Identicon from '@/components/Identicon.tsx'
import PageHeader from '@/components/PageHeader.tsx'
import Section from '@/components/Section.tsx'
import TxStatus from '@/components/TxStatus.tsx'
import { useRoleMembers, useRoles } from '@/chain.ts'
import { ROLE_IDS, access, gate } from '@/contracts.ts'
import { shortAddress } from '@/receivables.ts'
import { ROLES, WALLET_ADDRESS } from '@/roles.ts'
import type { Assignment, Role } from '@/roles.ts'
import { useTx } from '@/tx.ts'
import { config } from '@/wagmi.ts'

const ROLE_HELP: Record<Role, string> = {
  Seller: 'Creates, lists and repays receivables.',
  Investor: 'Buys units on the marketplace.',
  Buyer: 'Verifies or rejects receivables that name it.',
  Admin: 'Assigns and revokes roles.',
}

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

  const button = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive"
      disabled={Boolean(disabledReason) || tx.busy}
    >
      <UserMinus />
      {tx.busy ? 'Revoking…' : 'Revoke'}
    </Button>
  )

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Identicon address={assignment.address} />
        <div className="min-w-0 flex-1">
          <Address address={assignment.address} />
          {gate && isAddressEqual(assignment.address, gate.address) && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              InvestorGate contract. Revoking it stops World ID joins.
            </p>
          )}
        </div>
        <span className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
          {assignment.role}
        </span>
        {disabledReason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* A disabled button gets no pointer events, so the wrapper carries the tooltip. */}
              <span tabIndex={0}>{button}</span>
            </TooltipTrigger>
            <TooltipContent>{disabledReason}</TooltipContent>
          </Tooltip>
        ) : (
          <ConfirmAction
            trigger={button}
            title={`Revoke ${assignment.role}?`}
            description={`${shortAddress(assignment.address)} loses the ${assignment.role} role. You can assign it again later.`}
            confirmLabel="Revoke"
            destructive
            onConfirm={revoke}
          />
        )}
      </div>
      <TxStatus tx={tx} done="Role revoked." className="mt-2 pl-9" />
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
  const [filter, setFilter] = useState<Role | 'all'>('all')
  const tx = useTx()

  const isAdmin = myRoles.has('Admin')
  const adminCount = members.assignments.filter((a) => a.role === 'Admin').length
  const shown = members.assignments.filter((a) => filter === 'all' || a.role === filter)

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
      return 'This is the last admin. Add another admin before revoking it.'
    }
    return null
  }

  let accessNote = ''
  if (!address) accessNote = 'Connect an admin wallet to assign or revoke roles. Anyone can view them.'
  else if (rolesPending) accessNote = 'Checking this wallet’s roles…'
  else if (!isAdmin) accessNote = 'This wallet isn’t an admin, so it can view roles but not change them.'

  return (
    <>
      <PageHeader
        title="Roles"
        description="Who can sell, verify, invest and administer. Roles live in the access contract, so every change is a transaction. In this demo, an admin granting a role stands in for real business checks (KYB)."
      />

      {accessNote && (
        <p className="bg-muted text-muted-foreground mb-6 flex items-start gap-2 rounded-lg px-4 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {accessNote}
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Section title="Assign a role">
          <form onSubmit={assign} noValidate>
            <fieldset disabled={!isAdmin || tx.busy} className="grid min-w-0 grid-cols-1 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="wallet">Wallet address</Label>
                <Input
                  id="wallet"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                  className="font-mono text-[0.8125rem]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">{ROLE_HELP[role]}</p>
              </div>
              <Button type="submit" className="w-full">
                <UserPlus />
                {tx.busy ? 'Assigning…' : 'Assign role'}
              </Button>
            </fieldset>
            {error ? (
              <ErrorNote className="mt-4">{error}</ErrorNote>
            ) : (
              <TxStatus tx={tx} done="Role assigned." className="mt-4" />
            )}
          </form>
        </Section>

        <section aria-labelledby="members" className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="members" className="font-semibold tracking-tight">
              Members
            </h2>
            <Tabs
              value={filter}
              onValueChange={(value) => setFilter(value as Role | 'all')}
              className="max-w-full overflow-x-auto"
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                {ROLES.map((option) => (
                  <TabsTrigger key={option} value={option}>
                    {option}
                    <span className="text-muted-foreground tabular ml-1">
                      {members.assignments.filter((a) => a.role === option).length}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          {members.isPending ? (
            <div className="space-y-2 rounded-xl border p-4" aria-busy aria-label="Loading">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
          ) : members.isError ? (
            <ErrorNote>Couldn’t read roles from the chain.</ErrorNote>
          ) : shown.length === 0 ? (
            <EmptyState icon={UserPlus} title={filter === 'all' ? 'No roles assigned yet' : `No ${filter} wallets`}>
              Assign a role with the form, and the wallet appears here.
            </EmptyState>
          ) : (
            <ul className="bg-card divide-y rounded-xl border">
              {shown.map((assignment) => (
                <AssignmentRow
                  key={`${assignment.address}:${assignment.role}`}
                  assignment={assignment}
                  disabledReason={revokeBlocked(assignment)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

export default AdminRoles
