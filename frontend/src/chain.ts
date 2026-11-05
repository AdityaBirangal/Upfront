import { zeroAddress } from 'viem'
import type { Address } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import { ROLE_IDS, access, upfront } from './contracts.ts'
import { toReceivable } from './receivables.ts'
import { ROLES } from './roles.ts'
import type { Assignment, Role } from './roles.ts'

/** Roles the address holds, read from UpfrontAccess. */
export function useRoles(address: Address | undefined) {
  const result = useReadContracts({
    allowFailure: false,
    contracts: ROLES.map((role) => ({
      ...access,
      functionName: 'hasRole' as const,
      args: [ROLE_IDS[role], address ?? zeroAddress],
    })),
    query: { enabled: Boolean(address) },
  })

  const roles = new Set<Role>(
    ROLES.filter((_, index) => result.data?.[index] === true),
  )
  return {
    roles,
    isPending: Boolean(address) && result.isPending,
    isError: result.isError,
  }
}

/** Every role member, read from UpfrontAccess. */
export function useRoleMembers() {
  const result = useReadContracts({
    allowFailure: false,
    contracts: ROLES.map((role) => ({
      ...access,
      functionName: 'getRoleMembers' as const,
      args: [ROLE_IDS[role]],
    })),
  })

  const assignments: Assignment[] = (result.data ?? []).flatMap(
    (members, index) =>
      members.map((address) => ({ address, role: ROLES[index] })),
  )
  return { assignments, isPending: result.isPending, isError: result.isError }
}

/** All receivables: receivableCount, then one getReceivable per id. */
export function useReceivables() {
  const count = useReadContract({ ...upfront, functionName: 'receivableCount' })
  const ids = Array.from({ length: Number(count.data ?? 0n) }, (_, index) =>
    BigInt(index + 1),
  )

  const list = useReadContracts({
    allowFailure: false,
    contracts: ids.map((id) => ({
      ...upfront,
      functionName: 'getReceivable' as const,
      args: [id],
    })),
    query: { enabled: count.isSuccess },
  })

  const receivables = (list.data ?? []).map((data, index) =>
    toReceivable(ids[index], data),
  )
  return {
    receivables,
    isPending: count.isPending || (ids.length > 0 && list.isPending),
    isError: count.isError || list.isError,
  }
}
