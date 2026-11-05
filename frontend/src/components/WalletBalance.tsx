import { formatUnits } from 'viem'
import { useBalance } from 'wagmi'
import { targetChain } from '../wagmi.ts'

type Props = {
  address: `0x${string}`
}

function WalletBalance({ address }: Props) {
  const balance = useBalance({ address, chainId: targetChain.id })
  const { symbol } = targetChain.nativeCurrency

  if (balance.isPending) return <span>… {symbol}</span>
  if (balance.isError) return <span>Balance unavailable</span>

  const amount = Number(formatUnits(balance.data.value, balance.data.decimals))
  return (
    <span>
      {amount.toLocaleString([], { maximumFractionDigits: 4 })} {symbol}
    </span>
  )
}

export default WalletBalance
