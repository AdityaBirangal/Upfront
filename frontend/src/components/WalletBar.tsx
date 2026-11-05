import {
  useConnect,
  useConnection,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from 'wagmi'
import { shortAddress } from '../receivables.ts'
import { targetChain } from '../wagmi.ts'
import BackendStatus from './BackendStatus.tsx'
import WalletBalance from './WalletBalance.tsx'

function walletErrorMessage(error: Error) {
  switch (error.name) {
    case 'ProviderNotFoundError':
      return 'No wallet found. Install MetaMask to continue.'
    case 'UserRejectedRequestError':
      return 'The request was rejected in the wallet.'
    default:
      return 'The wallet request failed. Try again.'
  }
}

function WalletBar() {
  const { address, chainId, status } = useConnection()
  const connectors = useConnectors()
  const connect = useConnect()
  const disconnect = useDisconnect()
  const switchChain = useSwitchChain()

  if (status !== 'connected') {
    return (
      <header className="wallet-bar">
        <BackendStatus />
        {connect.error && (
          <p className="form-error wallet-message" role="alert">
            {walletErrorMessage(connect.error)}
          </p>
        )}
        <button
          type="button"
          className="button"
          disabled={status !== 'disconnected'}
          onClick={() => connect.mutate({ connector: connectors[0] })}
        >
          {status === 'disconnected' ? 'Connect wallet' : 'Connecting…'}
        </button>
      </header>
    )
  }

  return (
    <header className="wallet-bar">
      <BackendStatus />
      {chainId !== targetChain.id && (
        <>
          <p className="form-error wallet-message" role="alert">
            {switchChain.error
              ? walletErrorMessage(switchChain.error)
              : 'Wrong network.'}
          </p>
          <button
            type="button"
            className="button"
            disabled={switchChain.isPending}
            onClick={() => switchChain.mutate({ chainId: targetChain.id })}
          >
            Switch to {targetChain.name}
          </button>
        </>
      )}
      <WalletBalance address={address} />
      <code title={address}>{shortAddress(address)}</code>
      <button
        type="button"
        className="button"
        onClick={() => disconnect.mutate()}
      >
        Disconnect
      </button>
    </header>
  )
}

export default WalletBar
