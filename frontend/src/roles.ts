export const ROLES = ['Seller', 'Investor', 'Buyer', 'Admin'] as const

export type Role = (typeof ROLES)[number]

export type Assignment = {
  address: string
  role: Role
}

export const WALLET_ADDRESS = /^0x[0-9a-fA-F]{40}$/

// Case-insensitive: wallets report checksummed addresses, admins may type any case.
export function hasRole(
  assignments: Assignment[],
  address: string,
  role: Role,
): boolean {
  return assignments.some(
    (a) =>
      a.role === role && a.address.toLowerCase() === address.toLowerCase(),
  )
}
