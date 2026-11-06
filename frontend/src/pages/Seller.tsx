import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { getAddress, isAddressEqual } from 'viem'
import type { Address, Hex } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import { readContract, simulateContract, writeContract } from 'wagmi/actions'
import { Clock, FileCheck2, FilePlus2, FileUp, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ErrorNote from '@/components/ErrorNote.tsx'
import ListForm from '@/components/ListForm.tsx'
import PageHeader from '@/components/PageHeader.tsx'
import ReceivableActions from '@/components/ReceivableActions.tsx'
import ReceivableList from '@/components/ReceivableList.tsx'
import SellerPayout from '@/components/SellerPayout.tsx'
import Steps from '@/components/Steps.tsx'
import { stepState } from '@/lib/steps.ts'
import TxStatus from '@/components/TxStatus.tsx'
import Usdt from '@/components/Usdt.tsx'
import { BACKEND_URL, uploadDocument } from '@/backend.ts'
import { useReceivables } from '@/chain.ts'
import { ROLE_IDS, access, upfront, usdt } from '@/contracts.ts'
import {
  WHOLE_NUMBER,
  canCancel,
  documentProblem,
  hashDocument,
  isAwaitingPayment,
  repayAmount,
} from '@/receivables.ts'
import { WALLET_ADDRESS } from '@/roles.ts'
import { useTx } from '@/tx.ts'
import { useNow } from '@/useNow.ts'
import { config } from '@/wagmi.ts'

const SAMPLE_PDF = 'sample-agreement.pdf'

type Step = 'idle' | 'active' | 'done' | 'failed'

// datetime-local wants local time as YYYY-MM-DDTHH:mm.
function localInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

/** Ten whole minutes from now, rounded up to the minute the input can show. */
function tenMinutesFromNow() {
  const date = new Date(Date.now() + 10 * 60_000)
  date.setSeconds(60, 0)
  return localInputValue(date)
}

// PDF readers ignore a comment after the end, so this gives the sample a new hash.
function demoCopyLine() {
  return `\n% Demo copy ${new Date().toISOString()}\n`
}

type Props = {
  wallet: Address
}

function Seller({ wallet }: Props) {
  const [ref, setRef] = useState('')
  const [buyer, setBuyer] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docHash, setDocHash] = useState<Hex | null>(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [upload, setUpload] = useState<Step>('idle')
  const [uploadError, setUploadError] = useState('')
  const latestFile = useRef<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const tx = useTx()

  const unit = useReadContract({ ...upfront, functionName: 'UNIT' })
  const { receivables, isPending, isError } = useReceivables()
  const mine = receivables
    .filter((r) => isAddressEqual(r.seller, wallet))
    .reverse()
  const now = useNow()
  // Settle pulls the repayment from this wallet, so it needs the balance and the approval.
  const money = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...usdt, functionName: 'balanceOf', args: [wallet] },
      { ...usdt, functionName: 'allowance', args: [wallet, upfront.address] },
    ],
  })
  const [usdtBalance, allowance] = money.data ?? []
  const busy = checking || upload === 'active' || tx.busy

  function clearDocument() {
    if (fileInput.current) fileInput.current.value = ''
    void attachDocument(null)
  }

  function selectDocument(event: ChangeEvent<HTMLInputElement>) {
    return attachDocument(event.target.files?.[0] ?? null)
  }

  // Each click makes a distinct copy, because a document can back only one receivable.
  async function attachSampleDocument() {
    try {
      const response = await fetch(`/${SAMPLE_PDF}`)
      if (!response.ok) throw new Error('Sample PDF not found')
      const file = new File([await response.blob(), demoCopyLine()], SAMPLE_PDF, {
        type: 'application/pdf',
      })
      const files = new DataTransfer()
      files.items.add(file)
      if (fileInput.current) fileInput.current.files = files.files
      await attachDocument(file)
    } catch {
      setError('Could not load the sample PDF.')
    }
  }

  async function attachDocument(file: File | null) {
    latestFile.current = file
    setDocFile(null)
    setDocHash(null)
    setError('')
    if (!file) return

    try {
      const bytes = await file.arrayBuffer()
      const problem = documentProblem(bytes)
      const hash = problem ? null : await hashDocument(bytes)
      if (latestFile.current !== file) return
      setDocFile(hash ? file : null)
      setDocHash(hash)
      setError(problem ?? '')
    } catch {
      if (latestFile.current === file) setError('Could not read that file.')
    }
  }

  function formProblem(buyerAddress: string, due: number) {
    if (!ref.trim()) return 'Enter a reference.'
    if (!WALLET_ADDRESS.test(buyerAddress)) {
      return 'Enter a valid buyer address (0x followed by 40 hex characters).'
    }
    if (isAddressEqual(getAddress(buyerAddress.toLowerCase()), wallet)) {
      return "The seller and buyer can't be the same wallet."
    }
    if (!WHOLE_NUMBER.test(amount) || !Number.isSafeInteger(Number(amount))) {
      return 'Enter the amount as a whole number of USDT.'
    }
    if (!(due > Date.now())) return 'Choose a due date in the future.'
    if (!docFile || !docHash) return 'Choose the agreement PDF.'
    if (unit.data === undefined) {
      return "Couldn't read the unit size from the chain. Try again."
    }
    if (!BACKEND_URL) return 'The backend address is not set (VITE_BACKEND_URL).'
    return null
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const due = new Date(dueDate).getTime()

    const problem = formProblem(buyer.trim(), due)
    if (problem || !docFile || !docHash || unit.data === undefined) {
      setError(problem ?? '')
      return
    }
    const buyerAddress = getAddress(buyer.trim().toLowerCase())
    const faceValue = BigInt(amount) * unit.data

    setError('')
    setUpload('idle')
    setUploadError('')
    tx.reset()

    // Same checks as the smart contract, so the user gets a clear message before signing.
    setChecking(true)
    try {
      const [buyerHasRole, existingId] = await Promise.all([
        readContract(config, {
          ...access,
          functionName: 'hasRole',
          args: [ROLE_IDS.Buyer, buyerAddress],
        }),
        readContract(config, {
          ...upfront,
          functionName: 'receivableIdByDocHash',
          args: [docHash],
        }),
      ])
      if (!buyerHasRole) {
        setError('This wallet does not have the Buyer role.')
        return
      }
      if (existingId !== 0n) {
        setError(`This document is already used by receivable #${existingId}.`)
        return
      }
    } catch {
      setError("Couldn't check the chain. Try again.")
      return
    } finally {
      setChecking(false)
    }

    // Upload first: a failed transaction leaves a harmless orphan file, never a
    // receivable with no document.
    setUpload('active')
    const uploadProblem = await uploadDocument(docFile, docHash)
    if (uploadProblem) {
      setUpload('failed')
      setUploadError(uploadProblem)
      return
    }
    setUpload('done')

    const ok = await tx.run(async () => {
      const { request } = await simulateContract(config, {
        ...upfront,
        functionName: 'createReceivable',
        args: [
          buyerAddress,
          faceValue,
          BigInt(Math.floor(due / 1000)),
          docHash,
          ref.trim(),
        ],
      })
      return writeContract(config, request)
    })
    if (!ok) return

    form.reset()
    latestFile.current = null
    setRef('')
    setBuyer('')
    setAmount('')
    setDueDate('')
    setDocFile(null)
    setDocHash(null)
  }

  const outstanding = mine
    .filter(isAwaitingPayment)
    .reduce((sum, r) => sum + repayAmount(r), 0n)

  return (
    <>
      <PageHeader
        title="Sell"
        description="Turn an invoice into a receivable, list it for investors at a discount, and repay every holder before the due date."
        actions={
          <dl className="flex gap-6 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">USDT balance</dt>
              <dd className="font-medium">
                {usdtBalance === undefined ? '…' : <Usdt value={usdtBalance} />}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Owed to investors</dt>
              <dd className="font-medium">
                <Usdt value={outstanding} />
              </dd>
            </div>
          </dl>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section aria-labelledby="new-receivable" className="bg-card rounded-xl border lg:sticky lg:top-20">
          <div className="border-b px-5 py-4">
            <h2 id="new-receivable" className="font-semibold tracking-tight">
              New receivable
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              The agreement is stored off-chain. Its hash goes onchain.
            </p>
          </div>
          <form onSubmit={create} noValidate className="p-5">
            <fieldset disabled={busy} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="ref">Reference</Label>
                <Input
                  id="ref"
                  value={ref}
                  onChange={(event) => setRef(event.target.value)}
                  placeholder="INV-1001"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="buyer">Buyer wallet</Label>
                <Input
                  id="buyer"
                  value={buyer}
                  onChange={(event) => setBuyer(event.target.value)}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                  className="font-mono text-[0.8125rem]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    inputMode="numeric"
                    placeholder="10"
                    autoComplete="off"
                    className="tabular pr-14"
                    aria-describedby="amount-help"
                  />
                  <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">
                    USDT
                  </span>
                </div>
                <p id="amount-help" className="text-muted-foreground text-xs">
                  Whole USDT. Each USDT becomes one unit investors can buy.
                </p>
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="due">Due date and time</Label>
                  <button
                    type="button"
                    className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
                    onClick={() => setDueDate(tenMinutesFromNow())}
                  >
                    <Clock className="size-3" aria-hidden />
                    In 10 minutes (demo)
                  </button>
                </div>
                <Input
                  id="due"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="tabular"
                />
              </div>

              <div className="grid gap-1.5">
                <span className="text-sm leading-none font-medium select-none" id="doc-label">
                  Agreement PDF
                </span>
                <input
                  ref={fileInput}
                  id="doc"
                  type="file"
                  accept="application/pdf"
                  onChange={selectDocument}
                  className="sr-only"
                  aria-labelledby="doc-label"
                />
                {docFile && docHash ? (
                  <div className="border-state-settled/30 bg-state-settled/5 flex items-start gap-3 rounded-lg border p-3">
                    <FileCheck2 className="text-state-settled mt-0.5 size-4 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{docFile.name}</p>
                      <p className="text-muted-foreground truncate font-mono text-xs" title={docHash}>
                        SHA-256 {docHash}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearDocument}
                      className="text-muted-foreground hover:text-foreground rounded-md p-0.5"
                      aria-label="Remove document"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
                      <FileUp />
                      Choose PDF
                    </Button>
                    <Button type="button" variant="outline" onClick={attachSampleDocument}>
                      <Sparkles />
                      Sample PDF
                    </Button>
                  </div>
                )}
              </div>

              <Button type="submit" size="lg" className="mt-1 w-full">
                <FilePlus2 />
                {checking ? 'Checking…' : busy ? 'Creating…' : 'Create receivable'}
              </Button>
            </fieldset>

            {error && <ErrorNote className="mt-4">{error}</ErrorNote>}

            {upload !== 'idle' && (
              <Steps
                className="mt-5 border-t pt-5"
                steps={[
                  {
                    label: 'Upload document',
                    state:
                      upload === 'active'
                        ? 'active'
                        : upload === 'done'
                          ? 'done'
                          : 'failed',
                    detail:
                      upload === 'failed' ? (
                        <ErrorNote>{uploadError}</ErrorNote>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          {upload === 'active' ? 'Uploading…' : 'Stored.'}
                        </p>
                      ),
                  },
                  {
                    label: 'Create receivable',
                    state: stepState(tx),
                    detail:
                      tx.phase === 'idle' ? (
                        <p className="text-muted-foreground text-sm">
                          {upload === 'failed' ? 'Not sent.' : 'Waiting for the upload.'}
                        </p>
                      ) : (
                        <TxStatus tx={tx} done="Created. List it below when you’re ready." />
                      ),
                  },
                ]}
              />
            )}
          </form>
        </section>

        <section aria-labelledby="my-receivables" className="min-w-0 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="my-receivables" className="font-semibold tracking-tight">
              Your receivables
            </h2>
            {mine.length > 0 && (
              <span className="text-muted-foreground tabular text-sm">{mine.length}</span>
            )}
          </div>
          <ReceivableList
            receivables={mine}
            isPending={isPending}
            isError={isError}
            empty={{
              title: 'No receivables yet',
              body: 'Create one with the form. It appears here, ready to list for investors.',
            }}
            extra={(receivable) => (
              <>
                <ListForm receivable={receivable} />
                <SellerPayout
                  receivable={receivable}
                  wallet={wallet}
                  balance={usdtBalance}
                  allowance={allowance}
                  now={now}
                />
                <ReceivableActions
                  id={receivable.id}
                  actions={
                    canCancel(receivable)
                      ? [
                          {
                            label: 'Cancel receivable',
                            functionName: 'cancelReceivable',
                            done: 'Cancelled. The document can back a new receivable.',
                            tone: 'destructive',
                            confirm: {
                              title: `Cancel receivable #${receivable.id}?`,
                              body: `${receivable.status === 'Listed' ? 'It comes off the marketplace. ' : ''}This can’t be undone, but you can create it again with the same PDF.`,
                            },
                          },
                        ]
                      : []
                  }
                />
              </>
            )}
          />
        </section>
      </div>
    </>
  )
}

export default Seller
