import { erc20Abi, keccak256, toBytes, zeroHash } from 'viem'
import type { Address, Hex } from 'viem'
import { upfrontAbi, upfrontAccessAbi } from './generated/abis.ts'
import { deployments } from './generated/deployments.ts'
import type { Role } from './roles.ts'
import { targetChain } from './wagmi.ts'

type DeploymentVersion = {
  upfront?: Address
  access?: Address
  deployBlock?: number
}
type ChainDeployments = {
  explorer: string | null
  usdt?: Address
  versions: Record<string, DeploymentVersion>
}

const chains: Record<string, ChainDeployments | undefined> = deployments
const chainDeployments = chains[targetChain.id]

// The newest version on this chain that has both smart contracts.
const latest = Object.entries(chainDeployments?.versions ?? {})
  .sort(([a], [b]) => Number(b) - Number(a))
  .map(([, deployment]) => deployment)
  .find((deployment) => deployment.upfront && deployment.access)

if (!latest?.upfront || !latest.access) {
  throw new Error(`No Upfront deployment for chain ${targetChain.id}`)
}
if (!chainDeployments?.usdt) {
  throw new Error(`No USDT address for chain ${targetChain.id}`)
}

/** First block to read events from. */
export const DEPLOY_BLOCK = BigInt(latest.deployBlock ?? 0)

export const upfront = {
  address: latest.upfront,
  abi: upfrontAbi,
  chainId: targetChain.id,
} as const

export const access = {
  address: latest.access,
  abi: upfrontAccessAbi,
  chainId: targetChain.id,
} as const

export const usdt = {
  address: chainDeployments.usdt,
  abi: erc20Abi,
  chainId: targetChain.id,
} as const

export const ROLE_IDS: Record<Role, Hex> = {
  Admin: zeroHash, // DEFAULT_ADMIN_ROLE
  Seller: keccak256(toBytes('SELLER_ROLE')),
  Buyer: keccak256(toBytes('BUYER_ROLE')),
  Investor: keccak256(toBytes('INVESTOR_ROLE')),
}

export function roleName(roleId: Hex): string {
  const entry = Object.entries(ROLE_IDS).find(([, id]) => id === roleId)
  return entry ? entry[0] : 'required'
}

export function explorerTxUrl(hash: Hex): string | null {
  return chainDeployments?.explorer
    ? `${chainDeployments.explorer}/tx/${hash}`
    : null
}

export function explorerAddressUrl(address: Address): string | null {
  return chainDeployments?.explorer
    ? `${chainDeployments.explorer}/address/${address}`
    : null
}
