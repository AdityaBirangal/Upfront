import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { isAddress } from 'viem'
import type { Address } from 'viem'
import { simulateContract, writeContract } from 'wagmi/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { upfront } from '@/contracts.ts'
import { WHOLE_NUMBER } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'
import { useTx } from '@/tx.ts'
import { config } from '@/wagmi.ts'
import ErrorNote from './ErrorNote.tsx'
import TxStatus from './TxStatus.tsx'

type Props = {
  wallet: Address
  /** Receivables this wallet holds units of now. */
  holdings: { receivable: Receivable; units: bigint }[]
}

/**
 * Sends units to another wallet. The transfer rules are deliberately not checked here: the smart
 * contract enforces them, and its reason is shown if it refuses.
 */
function TransferForm({ wallet, holdings }: Props) {
  const [chosen, setChosen] = useState('')
  const [to, setTo] = useState('')
  const [units, setUnits] = useState('')
  const [error, setError] = useState('')
  const tx = useTx()
  const id = useId()

  const holding =
    holdings.find(({ receivable }) => receivable.id.toString() === chosen) ??
    (holdings.length === 1 ? holdings[0] : undefined)

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    tx.reset()
    const recipient = to.trim()
    const reason = !holding
      ? 'Choose a receivable.'
      : !isAddress(recipient)
        ? 'Enter a wallet address starting with 0x.'
        : !WHOLE_NUMBER.test(units) || BigInt(units) === 0n
          ? 'Enter a whole number of units.'
          : BigInt(units) > holding.units
            ? `This wallet holds ${holding.units.toLocaleString()} units.`
            : ''
    setError(reason)
    if (reason || !holding || !isAddress(recipient)) return

    const ok = await tx.run(async () => {
      const { request } = await simulateContract(config, {
        ...upfront,
        functionName: 'safeTransferFrom',
        args: [wallet, recipient, holding.receivable.id, BigInt(units), '0x'],
      })
      return writeContract(config, request)
    })
    if (ok) setUnits('')
  }

  return (
    <form onSubmit={send} noValidate className="space-y-3">
      <fieldset disabled={tx.busy} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_8rem_auto] sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-receivable`}>Receivable</Label>
          <Select value={holding?.receivable.id.toString() ?? ''} onValueChange={setChosen}>
            <SelectTrigger id={`${id}-receivable`} className="w-full">
              <SelectValue placeholder="Choose" />
            </SelectTrigger>
            <SelectContent>
              {holdings.map(({ receivable, units: held }) => (
                <SelectItem key={receivable.id} value={receivable.id.toString()}>
                  #{receivable.id.toString()} {receivable.ref || 'No reference'} ·{' '}
                  {held.toLocaleString()} units
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-to`}>To wallet</Label>
          <Input
            id={`${id}-to`}
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-xs"
          />
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor={`${id}-units`}>Units</Label>
            {holding && (
              <button
                type="button"
                className="text-primary text-xs font-medium hover:underline"
                onClick={() => setUnits(holding.units.toString())}
              >
                Max
              </button>
            )}
          </div>
          <Input
            id={`${id}-units`}
            value={units}
            onChange={(event) => setUnits(event.target.value)}
            inputMode="numeric"
            placeholder="1"
            autoComplete="off"
            className="tabular"
          />
        </div>
        <Button type="submit" className="min-w-28">
          {tx.busy ? 'Sending…' : 'Transfer'}
        </Button>
      </fieldset>
      <p className="text-muted-foreground text-xs">
        The smart contract only lets units move to another approved investor, while the receivable is
        listed or funded and before its due date, within the per-investor cap.
      </p>
      {error && <ErrorNote>{error}</ErrorNote>}
      <TxStatus tx={tx} done="Transferred. The units are in the other wallet." />
    </form>
  )
}

export default TransferForm
