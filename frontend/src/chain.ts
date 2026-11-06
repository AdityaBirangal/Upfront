import { useQuery } from '@tanstack/react-query'
import { zeroAddress } from 'viem'
import type { Address, Hash } from 'viem'
import { usePublicClient, useReadContract, useReadContracts } from 'wagmi'
import { DEPLOY_BLOCK, ROLE_IDS, access, upfront } from './contracts.ts'
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

// Whitechain's public RPC rejects log queries over 10,000 blocks.
const LOG_BLOCK_RANGE = 10_000n

export type Investment = {
  id: bigint
  investor: Address
  units: bigint
  paid: bigint
  txHash: Hash
  blockNumber: bigint
}

/** Splits deploy block → latest into ranges the RPC accepts, and reads each in parallel. */
async function readInChunks<T>(
  client: NonNullable<ReturnType<typeof usePublicClient>>,
  read: (fromBlock: bigint, toBlock: bigint) => Promise<T[]>,
): Promise<T[]> {
  const latest = await client.getBlockNumber()
  const ranges: [bigint, bigint][] = []
  for (let from = DEPLOY_BLOCK; from <= latest; from += LOG_BLOCK_RANGE) {
    const to = from + LOG_BLOCK_RANGE - 1n
    ranges.push([from, to < latest ? to : latest])
  }
  const chunks = await Promise.all(ranges.map(([from, to]) => read(from, to)))
  return chunks.flat()
}

/** Every `invest` since deployment, optionally for one receivable or one investor. Oldest first. */
export function useInvestments(filter: { id?: bigint; investor?: Address }) {
  const client = usePublicClient({ chainId: upfront.chainId })
  const { id, investor } = filter

  return useQuery({
    queryKey: ['investments', upfront.address, id?.toString(), investor],
    enabled: Boolean(client),
    queryFn: async (): Promise<Investment[]> => {
      if (!client) return []
      const logs = await readInChunks(client, (fromBlock, toBlock) =>
        client.getContractEvents({
          address: upfront.address,
          abi: upfront.abi,
          eventName: 'Invested',
          args: { id, investor },
          fromBlock,
          toBlock,
        }),
      )
      return logs.map((log) => ({
        id: log.args.id ?? 0n,
        investor: log.args.investor ?? zeroAddress,
        units: log.args.units ?? 0n,
        paid: log.args.paid ?? 0n,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      }))
    },
  })
}

export type HolderPayment = {
  id: bigint
  holder: Address
  units: bigint
  amount: bigint
  txHash: Hash
  blockNumber: bigint
}

/** Every payment `settle` made to a holder, optionally for one receivable or one holder. */
export function useHolderPayments(filter: { id?: bigint; holder?: Address }) {
  const client = usePublicClient({ chainId: upfront.chainId })
  const { id, holder } = filter

  return useQuery({
    queryKey: ['holderPayments', upfront.address, id?.toString(), holder],
    enabled: Boolean(client),
    queryFn: async (): Promise<HolderPayment[]> => {
      if (!client) return []
      const logs = await readInChunks(client, (fromBlock, toBlock) =>
        client.getContractEvents({
          address: upfront.address,
          abi: upfront.abi,
          eventName: 'HolderPaid',
          args: { id, holder },
          fromBlock,
          toBlock,
        }),
      )
      return logs.map((log) => ({
        id: log.args.id ?? 0n,
        holder: log.args.holder ?? zeroAddress,
        units: log.args.units ?? 0n,
        amount: log.args.amount ?? 0n,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      }))
    },
  })
}

export type TimelineEvent = {
  /** The event's name in the Upfront ABI. */
  name: string
  args: Record<string, unknown>
  txHash: Hash
  blockNumber: bigint
  logIndex: number
  /** Block time in Unix seconds, if the block could be read. */
  timestamp: bigint | undefined
}

/**
 * Every event for one receivable, oldest first, with block times. Includes transfers between
 * holders, but not the token moves behind create, invest and settle.
 */
export function useTimeline(id: bigint) {
  const client = usePublicClient({ chainId: upfront.chainId })

  return useQuery({
    queryKey: ['timeline', upfront.address, id.toString()],
    enabled: Boolean(client),
    queryFn: async (): Promise<TimelineEvent[]> => {
      if (!client) return []
      const logs = await readInChunks(client, (fromBlock, toBlock) =>
        client.getContractEvents({ address: upfront.address, abi: upfront.abi, fromBlock, toBlock }),
      )
      const ofId = logs.filter((log) => (log.args as Record<string, unknown>).id === id)
      const created = ofId.find((log) => log.eventName === 'ReceivableCreated')
      const seller = (created?.args as Record<string, unknown> | undefined)?.seller
      // Mints and burns have a zero side, and moves out of the seller are `invest`, which has its
      // own event. What's left are transfers between holders.
      const mine = ofId.filter((log) => {
        if (log.eventName !== 'TransferSingle') return true
        const { from, to } = log.args as Record<string, unknown>
        return from !== zeroAddress && to !== zeroAddress && from !== seller
      })

      const blocks = [...new Set(mine.map((log) => log.blockNumber))]
      const times = new Map<bigint, bigint>()
      await Promise.all(
        blocks.map(async (blockNumber) => {
          try {
            times.set(blockNumber, (await client.getBlock({ blockNumber })).timestamp)
          } catch {
            // Times are a nicety. The event still shows without one.
          }
        }),
      )

      return mine
        .map((log) => ({
          name: log.eventName,
          args: log.args as Record<string, unknown>,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          timestamp: times.get(log.blockNumber),
        }))
        .sort((a, b) =>
          a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1,
        )
    },
  })
}

/** Block times in Unix seconds, keyed by block number. Blocks that can't be read are left out. */
export function useBlockTimes(blockNumbers: bigint[]) {
  const client = usePublicClient({ chainId: upfront.chainId })
  const unique = [...new Set(blockNumbers)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

  return useQuery({
    queryKey: ['blockTimes', upfront.chainId, unique.map(String)],
    enabled: Boolean(client) && unique.length > 0,
    staleTime: Infinity,
    queryFn: async (): Promise<Map<bigint, bigint>> => {
      const times = new Map<bigint, bigint>()
      if (!client) return times
      await Promise.all(
        unique.map(async (blockNumber) => {
          try {
            times.set(blockNumber, (await client.getBlock({ blockNumber })).timestamp)
          } catch {
            // A missing time drops that point from the chart; the holding still shows in the table.
          }
        }),
      )
      return times
    },
  })
}
