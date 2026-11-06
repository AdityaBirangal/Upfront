/** Plain text for wallet connection and network-switch errors. */
export function walletErrorMessage(error: Error) {
  switch (error.name) {
    case 'ProviderNotFoundError':
      return 'No wallet found. Install MetaMask to continue.'
    case 'UserRejectedRequestError':
      return 'The request was rejected in the wallet.'
    default:
      return 'The wallet request failed. Try again.'
  }
}
