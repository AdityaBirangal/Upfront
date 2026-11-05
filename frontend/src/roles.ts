export const ROLES = ['Seller', 'Investor', 'Buyer', 'Admin'] as const

export type Role = (typeof ROLES)[number]

export type Assignment = {
  address: string
  role: Role
}

export const WALLET_ADDRESS = /^0x[0-9a-fA-F]{40}$/
