import type { IDKitResult, RpContext } from '@worldcoin/idkit'
import type { Address, Hex } from 'viem'
import { BACKEND_URL } from './backend.ts'
import { gate } from './contracts.ts'

export const WORLD_APP_ID = import.meta.env.VITE_WORLD_APP_ID as
  | `app_${string}`
  | undefined
export const WORLD_ENVIRONMENT = (import.meta.env.VITE_WORLD_ENVIRONMENT ??
  'production') as 'production' | 'staging'
export const WORLD_ACTION = 'join-investors'

/** World ID is optional. Without these, the app works as it always has: an Admin assigns investors. */
export const worldEnabled = Boolean(WORLD_APP_ID && BACKEND_URL && gate)

export type Voucher = { nullifierHash: Hex; expiry: number; signature: Hex }

const WORLD_ERRORS: Record<string, string> = {
  invalid_proof: "World ID couldn't confirm this proof. Try again.",
  invalid_wallet: 'This wallet address is not valid.',
  wallet_mismatch: 'This proof was made for a different wallet. Verify again.',
  nullifier_used: 'This person already has an investor wallet.',
  world_unavailable: "World ID can't be reached right now. Try again, or ask an admin.",
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BACKEND_URL}/world/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new Error(WORLD_ERRORS.world_unavailable)
  }
  if (response.ok) return (await response.json()) as T

  const { error } = (await response.json().catch(() => ({}))) as { error?: string }
  throw new Error((error && WORLD_ERRORS[error]) ?? 'World ID verification failed. Try again.')
}

export function getRpContext() {
  return post<RpContext>('rp-signature')
}

export function verifyProof(proof: IDKitResult, wallet: Address) {
  return post<Voucher>('verify', { proof, wallet })
}
