import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ContractFunctionRevertedError } from 'viem'
import type { Address, Hash, Hex } from 'viem'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { roleName } from './contracts.ts'
import { shortAddress } from './receivables.ts'
import { config, targetChain } from './wagmi.ts'

/** `TransferNotAllowed(reason)`, by the position of `TransferBlock` in the smart contract. */
const TRANSFER_BLOCKS = [
  'The receiving wallet is not an approved investor.',
  "The seller and buyer of a receivable can't hold its units.",
  'Units can only move while the receivable is listed or funded.',
  'The due date has passed, so units can no longer move.',
  "That would take the receiving wallet over the receivable's per-investor cap.",
]

const CONTRACT_ERRORS: Record<string, string> = {
  SellerIsBuyer: "The seller and buyer can't be the same wallet.",
  InvalidFaceValue: 'The amount must be a whole number of USDT above 0.',
  DueDateNotInFuture: 'The due date must be in the future.',
  EmptyDocHash: 'The document hash is missing.',
  DocHashInUse: 'This document is already used by another receivable.',
  UnknownReceivable: 'This receivable does not exist.',
  NotBuyer: 'Only the buyer named on this receivable can do that.',
  NotSeller: 'Only the seller of this receivable can do that.',
  InvalidStatus: "This receivable's status doesn't allow that any more.",
  DueDatePassed: "The due date has passed, so that's no longer allowed.",
  AlreadyVerified: 'The buyer has already verified this receivable.',
  UnitsAlreadySold: 'Units have already been sold, so it can no longer be withdrawn.',
  UnitsLocked: "A seller's own units can't be transferred.",
  InvalidDiscount: 'The discount must be above 0% and below 100%.',
  InvalidCap:
    "The investor cap must be from 1 unit up to the receivable's total units.",
  InvalidUnits: 'Buy at least 1 unit.',
  ExceedsAvailable: 'Not enough units are left. Someone may have just bought some.',
  ExceedsCap: 'That would take this wallet over the per-investor cap.',
  PartyCannotInvest: "The seller and buyer of a receivable can't invest in it.",
  ERC20InsufficientBalance: "This wallet doesn't have enough USDT.",
  ERC20InsufficientAllowance: 'Approve enough USDT first.',
  NotDue: "It isn't due yet, so it can't be marked as defaulted.",
  ERC1155InsufficientBalance: "This wallet doesn't hold that many units.",
  ERC1155InvalidReceiver: "That wallet can't receive units.",
  ZeroAddress: 'An address is missing.',
  NullifierAlreadyUsed: 'This person already has an investor wallet.',
  VoucherExpired: 'This verification has expired. Verify again.',
  BadSignature: "This verification isn't valid for this wallet. Verify again.",
  AccessControlUnauthorizedAccount: 'Only an admin wallet can change roles.',
  AccessControlBadConfirmation: 'Only the wallet itself can renounce its role.',
}

function causes(error: unknown): unknown[] {
  const chain: unknown[] = []
  let current = error
  while (current && chain.length < 20) {
    chain.push(current)
    current = (current as { cause?: unknown }).cause
  }
  return chain
}

function hasErrorNamed(error: unknown, names: string[]) {
  return causes(error).some(
    (cause) => cause instanceof Error && names.includes(cause.name),
  )
}

function revertOf(error: unknown) {
  return causes(error).find(
    (cause) => cause instanceof ContractFunctionRevertedError,
  ) as ContractFunctionRevertedError | undefined
}

/** The custom error name a smart contract reverted with, if any. */
export function revertName(error: unknown): string | undefined {
  return revertOf(error)?.data?.errorName
}

/** Turns wallet and contract errors into plain sentences. Never shows raw hex. */
export function txErrorMessage(error: unknown): string {
  const revert = revertOf(error)
  if (revert) {
    const name = revert.data?.errorName
    if (name === 'NotAllowed' && revert.data?.args) {
      const [account, role] = revert.data.args as [Address, Hex]
      return `${shortAddress(account)} doesn't have the ${roleName(role)} role.`
    }
    if (name === 'TransferNotAllowed' && revert.data?.args) {
      const [reason] = revert.data.args as [number]
      return `The smart contract refused the transfer. ${
        TRANSFER_BLOCKS[Number(reason)] ?? 'It breaks a transfer rule.'
      }`
    }
    return (
      (name && CONTRACT_ERRORS[name]) ??
      'The smart contract refused this transaction.'
    )
  }
  if (hasErrorNamed(error, ['UserRejectedRequestError'])) {
    return 'You rejected the request in the wallet.'
  }
  if (
    hasErrorNamed(error, ['ConnectorChainMismatchError', 'ChainMismatchError'])
  ) {
    return `Switch the wallet to ${targetChain.name} first.`
  }
  if (hasErrorNamed(error, ['ConnectorNotConnectedError'])) {
    return 'Connect a wallet first.'
  }
  return 'The transaction failed. Try again.'
}

export type TxPhase = 'idle' | 'wallet' | 'pending' | 'confirmed' | 'failed'

/**
 * Runs one transaction: wallet prompt, then waits for the receipt, then refreshes
 * every chain read. `send` should simulate first, so reverts show before the wallet opens.
 */
export function useTx() {
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<TxPhase>('idle')
  const [hash, setHash] = useState<Hash>()
  const [error, setError] = useState('')

  async function run(send: () => Promise<Hash>): Promise<boolean> {
    setPhase('wallet')
    setHash(undefined)
    setError('')
    try {
      const sent = await send()
      setHash(sent)
      setPhase('pending')
      const receipt = await waitForTransactionReceipt(config, {
        hash: sent,
        chainId: targetChain.id,
      })
      if (receipt.status !== 'success') {
        throw new Error('The transaction reverted.')
      }
      await queryClient.invalidateQueries()
      setPhase('confirmed')
      return true
    } catch (caught) {
      console.error(caught)
      setError(txErrorMessage(caught))
      setPhase('failed')
      return false
    }
  }

  function reset() {
    setPhase('idle')
    setHash(undefined)
    setError('')
  }

  return {
    phase,
    hash,
    error,
    run,
    reset,
    busy: phase === 'wallet' || phase === 'pending',
  }
}

export type Tx = ReturnType<typeof useTx>
