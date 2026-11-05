import type { Chain } from 'viem'
import { createConfig, http, injected } from 'wagmi'
import { anvil, whitechainSepolia } from 'wagmi/chains'

const SUPPORTED_CHAINS: Chain[] = [whitechainSepolia, anvil]

const chainId = Number(import.meta.env.VITE_CHAIN_ID ?? whitechainSepolia.id)
const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId)
if (!chain) throw new Error(`Unsupported VITE_CHAIN_ID: ${chainId}`)

const rpcUrl: string | undefined = import.meta.env.VITE_RPC_URL

// The one chain the app runs on. The wallet also adds it from this definition,
// so a custom RPC has to be set here, not only on the transport.
export const targetChain = rpcUrl
  ? { ...chain, rpcUrls: { default: { http: [rpcUrl] } } }
  : chain

export const config = createConfig({
  chains: [targetChain],
  connectors: [injected()],
  // One Connect button, so skip listing every installed wallet separately.
  multiInjectedProviderDiscovery: false,
  transports: { [targetChain.id]: http() },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
