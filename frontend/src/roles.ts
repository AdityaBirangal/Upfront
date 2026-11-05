export const ROLES = ['Business', 'Investor', 'Customer', 'Admin'] as const

export type Role = (typeof ROLES)[number]

export type Assignment = {
  address: string
  role: Role
}
