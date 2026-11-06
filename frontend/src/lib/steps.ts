import type { Tx } from '@/tx.ts'

export type StepState = 'waiting' | 'active' | 'done' | 'failed'

export function stepState(tx: Tx): StepState {
  if (tx.phase === 'confirmed') return 'done'
  if (tx.phase === 'failed') return 'failed'
  if (tx.phase === 'wallet' || tx.phase === 'pending') return 'active'
  return 'waiting'
}
