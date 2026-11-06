import { FilePlus2, LayoutGrid, ShieldCheck, TrendingUp, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '@/roles.ts'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** The role the page needs. Overview needs none. */
  role?: Role
  description: string
}

export const NAV: NavItem[] = [
  {
    to: '/app',
    label: 'Overview',
    icon: LayoutGrid,
    description: 'Your roles and every receivable onchain.',
  },
  {
    to: '/app/invest',
    label: 'Invest',
    icon: TrendingUp,
    role: 'Investor',
    description: 'Buy units of listed receivables at a discount, and track your portfolio.',
  },
  {
    to: '/app/seller',
    label: 'Sell',
    icon: FilePlus2,
    role: 'Seller',
    description: 'Create receivables, list them for investors, and repay them before the due date.',
  },
  {
    to: '/app/buyer',
    label: 'Verify',
    icon: ShieldCheck,
    role: 'Buyer',
    description: 'Confirm the receivables that name you as the buyer, or reject ones you don’t recognise.',
  },
  {
    to: '/app/admin',
    label: 'Roles',
    icon: UsersRound,
    role: 'Admin',
    description: 'Assign and revoke the Seller, Buyer, Investor and Admin roles.',
  },
]
