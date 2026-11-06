import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from 'react'
import { getAddress, isAddressEqual } from 'viem'
import type { Address, Hex } from 'viem'
import { useReadContract } from 'wagmi'
import { readContract, simulateContract, writeContract } from 'wagmi/actions'
import { Clock, FileCheck2, FilePlus2, FileUp, Sparkles, Store, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BACKEND_URL, uploadDocument } from '@/backend.ts'
import { ROLE_IDS, access, upfront } from '@/contracts.ts'
import { cn } from '@/lib/utils'
import { stepState } from '@/lib/steps.ts'
import {
  UNIT,
  WHOLE_NUMBER,
  annualise,
  documentProblem,
  formatUsdt,
  formatYield,
  hashDocument,
  parseDiscount,
  returnPercent,
  shortAddress,
  unitPriceFor,
} from '@/receivables.ts'
import { WALLET_ADDRESS } from '@/roles.ts'
import { useTx } from '@/tx.ts'
import { useNow } from '@/useNow.ts'
import { config } from '@/wagmi.ts'
import ErrorNote from './ErrorNote.tsx'
import Steps from './Steps.tsx'
import TxStatus from './TxStatus.tsx'

const SAMPLE_PDF = 'sample-agreement.pdf'

type Step = 'idle' | 'active' | 'done' | 'failed'

// datetime-local wants local time as YYYY-MM-DDTHH:mm:ss (seconds, because of step={1}).
function localInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 19)
}

/** 2 minutes from now, to the second, so a demo reaches the due date quickly. */
function twoMinutesFromNow() {
  const date = new Date(Date.now() + 120_000)
  date.setMilliseconds(0)
  return localInputValue(date)
}

// PDF readers ignore a comment after the end, so this gives the sample a new hash.
function demoCopyLine() {
  return `\n% Demo copy ${new Date().toISOString()}\n`
}

function Group({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="grid min-w-0 gap-4 border-t px-5 py-5 first:border-t-0">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden>
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
      </div>
      {children}
    </fieldset>
  )
}

function Line({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className={cn('tabular text-right text-sm', strong && 'font-semibold')}>{children}</dd>
    </div>
  )
}

const dash = <span className="text-muted-foreground">—</span>

type Props = {
  wallet: Address
  /** Called from the success state, to jump to the list. */
  onDone: () => void
}

/**
 * New receivable: agreement, terms and signed PDF, with an option to list it straight away. A live
 * summary sits beside the form. Listing is a second transaction, sent as soon as the first confirms.
 */
function CreateReceivable({ wallet, onDone }: Props) {
  const [ref, setRef] = useState('')
  const [buyer, setBuyer] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docHash, setDocHash] = useState<Hex | null>(null)
  const [listNow, setListNow] = useState(false)
  const [discount, setDiscount] = useState('')
  const [cap, setCap] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [upload, setUpload] = useState<Step>('idle')
  const [uploadError, setUploadError] = useState('')
  const [dragging, setDragging] = useState(false)
  const latestFile = useRef<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const createTx = useTx()
  const listTx = useTx()
  // Whether the running submission includes listing, fixed when it starts.
  const [queuedList, setQueuedList] = useState(false)

  const unit = useReadContract({ ...upfront, functionName: 'UNIT' })
  const busy = checking || upload === 'active' || createTx.busy || listTx.busy
  const started = upload !== 'idle'
  const finished = createTx.phase === 'confirmed' && (!queuedList || listTx.phase === 'confirmed')

  const units = WHOLE_NUMBER.test(amount) && Number.isSafeInteger(Number(amount)) ? BigInt(amount) : null
  const discountBps = parseDiscount(discount)
  const unitPrice = discountBps === null ? null : unitPriceFor(discountBps)
  const capUnits = cap.trim() === '' ? units : WHOLE_NUMBER.test(cap) ? BigInt(cap) : null
  const due = dueDate ? new Date(dueDate) : null
  const buyerValid = WALLET_ADDRESS.test(buyer.trim())
  const now = useNow()
  const annual =
    unitPrice !== null && unitPrice > 0n && due && !Number.isNaN(due.getTime())
      ? annualise(Number(UNIT - unitPrice) / Number(unitPrice), due.getTime() / 1000 - Number(now))
      : null

  function clearDocument() {
    if (fileInput.current) fileInput.current.value = ''
    void attachDocument(null)
  }

  function selectDocument(event: ChangeEvent<HTMLInputElement>) {
    return attachDocument(event.target.files?.[0] ?? null)
  }

  function dropDocument(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void attachDocument(file)
  }

  // Each click makes a distinct copy, because a document can back only one receivable.
  async function attachSampleDocument() {
    try {
      const response = await fetch(`/${SAMPLE_PDF}`)
      if (!response.ok) throw new Error('Sample PDF not found')
      const file = new File([await response.blob(), demoCopyLine()], SAMPLE_PDF, { type: 'application/pdf' })
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

  function formProblem(buyerAddress: string, dueMs: number, nowMs: number) {
    if (!ref.trim()) return 'Enter a contract reference.'
    if (!WALLET_ADDRESS.test(buyerAddress)) return 'Enter a valid client address (0x followed by 40 hex characters).'
    if (isAddressEqual(getAddress(buyerAddress.toLowerCase()), wallet)) return "The seller and client can't be the same wallet."
    if (units === null) return 'Enter the amount as a whole number of USDT.'
    if (!(dueMs > nowMs)) return 'Choose a due date in the future.'
    if (!docFile || !docHash) return 'Choose the signed contract PDF.'
    if (listNow) {
      if (discountBps === null) return 'Enter a discount above 0% and below 100%, with up to 2 decimals.'
      if (capUnits === null || capUnits < 1n || capUnits > units) {
        return `Enter an investor cap from 1 to ${units.toLocaleString()} units, or leave it empty for no cap.`
      }
    }
    if (unit.data === undefined) return "Couldn't read the unit size from the chain. Try again."
    if (!BACKEND_URL) return 'The backend address is not set (VITE_BACKEND_URL).'
    return null
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dueMs = due ? due.getTime() : NaN
    const problem = formProblem(buyer.trim(), dueMs, Date.now())
    if (problem || !docFile || !docHash || unit.data === undefined || units === null) {
      setError(problem ?? '')
      return
    }
    const buyerAddress = getAddress(buyer.trim().toLowerCase())
    const faceValue = units * unit.data
    const hash = docHash
    const listing = listNow && discountBps !== null && capUnits !== null ? { discountBps, cap: capUnits } : null

    setError('')
    setUpload('idle')
    setUploadError('')
    createTx.reset()
    listTx.reset()
    setQueuedList(Boolean(listing))

    // Same checks as the smart contract, so the user gets a clear message before signing.
    setChecking(true)
    try {
      const [buyerHasRole, existingId] = await Promise.all([
        readContract(config, { ...access, functionName: 'hasRole', args: [ROLE_IDS.Buyer, buyerAddress] }),
        readContract(config, { ...upfront, functionName: 'receivableIdByDocHash', args: [hash] }),
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

    // Upload first: a failed transaction leaves a harmless orphan file, never a receivable with no document.
    setUpload('active')
    const uploadProblem = await uploadDocument(docFile, hash)
    if (uploadProblem) {
      setUpload('failed')
      setUploadError(uploadProblem)
      return
    }
    setUpload('done')

    const created = await createTx.run(async () => {
      const { request } = await simulateContract(config, {
        ...upfront,
        functionName: 'createReceivable',
        args: [buyerAddress, faceValue, BigInt(Math.floor(dueMs / 1000)), hash, ref.trim()],
      })
      return writeContract(config, request)
    })
    if (!created) return

    if (listing) {
      // The document hash maps to exactly one receivable, so it gives the new id.
      await listTx.run(async () => {
        const id = await readContract(config, { ...upfront, functionName: 'receivableIdByDocHash', args: [hash] })
        const { request } = await simulateContract(config, {
          ...upfront,
          functionName: 'listReceivable',
          args: [id, listing.discountBps, listing.cap],
        })
        return writeContract(config, request)
      })
    }
  }

  function startOver() {
    latestFile.current = null
    if (fileInput.current) fileInput.current.value = ''
    setRef('')
    setBuyer('')
    setAmount('')
    setDueDate('')
    setDocFile(null)
    setDocHash(null)
    setDiscount('')
    setCap('')
    setListNow(false)
    setUpload('idle')
    createTx.reset()
    listTx.reset()
  }

  const submitLabel = checking
    ? 'Checking…'
    : busy
      ? queuedList
        ? 'Creating and listing…'
        : 'Creating…'
      : listNow
        ? 'Create and list'
        : 'Create receivable'

  return (
    <form onSubmit={create} noValidate className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="bg-card min-w-0 rounded-xl border">
        <fieldset disabled={busy || finished} className="min-w-0">
          <Group title="Agreement" description="Who the contract is with. The client must have the Buyer role.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="ref">Contract reference</Label>
                <Input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="RCV-1001" autoComplete="off" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="buyer">Client wallet</Label>
                <Input
                  id="buyer"
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                  className="font-mono text-[0.8125rem]"
                />
              </div>
            </div>
          </Group>

          <Group title="Terms" description="Each USDT of the amount becomes one unit investors can buy.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="numeric"
                    placeholder="10"
                    autoComplete="off"
                    className="tabular pr-14"
                  />
                  <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">USDT</span>
                </div>
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="due">Due date and time</Label>
                  <button
                    type="button"
                    className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
                    onClick={() => setDueDate(twoMinutesFromNow())}
                  >
                    <Clock className="size-3" aria-hidden />
                    In 2 minutes (demo)
                  </button>
                </div>
                <Input id="due" type="datetime-local" step={1} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="tabular" />
              </div>
            </div>
          </Group>

          <Group title="Signed contract" description="Stored offchain. Only its SHA-256 hash goes onchain.">
            <input ref={fileInput} id="doc" type="file" accept="application/pdf" onChange={selectDocument} className="sr-only" aria-label="Signed contract PDF" />
            {docFile && docHash ? (
              <div className="border-state-settled/30 bg-state-settled/5 flex min-w-0 items-start gap-3 rounded-lg border p-3">
                <FileCheck2 className="text-state-settled mt-0.5 size-4 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{docFile.name}</p>
                  <p className="text-muted-foreground truncate font-mono text-xs" title={docHash}>
                    SHA-256 {docHash}
                  </p>
                </div>
                <button type="button" onClick={clearDocument} className="text-muted-foreground hover:text-foreground rounded-md p-0.5" aria-label="Remove document">
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={dropDocument}
                className={cn(
                  'flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-7 text-center transition-colors',
                  dragging ? 'border-primary bg-primary/5' : 'bg-muted/30',
                )}
              >
                <FileUp className="text-muted-foreground size-5" aria-hidden />
                <p className="text-muted-foreground text-sm">Drop the PDF here, up to 5 MB</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                    Choose PDF
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={attachSampleDocument}>
                    <Sparkles />
                    Use sample
                  </Button>
                </div>
              </div>
            )}
          </Group>

          <div className="border-t px-5 py-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={listNow}
                onChange={(e) => setListNow(e.target.checked)}
                className="accent-primary mt-0.5 size-4 shrink-0"
              />
              <span>
                <span className="text-sm font-semibold">List immediately</span>
                <span className="text-muted-foreground block text-xs">
                  Put the units on the marketplace as soon as the receivable is created. Your wallet asks twice.
                </span>
              </span>
            </label>
            {listNow && (
              <div className="mt-4 grid items-start gap-4 pl-7 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="discount">Discount</Label>
                  <div className="relative">
                    <Input
                      id="discount"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      inputMode="decimal"
                      placeholder="3"
                      autoComplete="off"
                      className="tabular pr-8"
                    />
                    <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">%</span>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cap">Investor cap</Label>
                  <div className="relative">
                    <Input
                      id="cap"
                      value={cap}
                      onChange={(e) => setCap(e.target.value)}
                      inputMode="numeric"
                      placeholder={units ? units.toString() : 'All units'}
                      autoComplete="off"
                      className="tabular pr-14"
                    />
                    <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">units</span>
                  </div>
                  <p className="text-muted-foreground text-xs">Most units one investor can hold. Empty means no cap.</p>
                </div>
              </div>
            )}
          </div>
        </fieldset>
      </div>

      {/* Summary and submit. */}
      <aside className="bg-card rounded-xl border lg:sticky lg:top-20">
        <div className="border-b px-5 py-4">
          <p className="font-semibold tracking-tight">{ref.trim() || 'New receivable'}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Client {buyerValid ? <span className="font-mono">{shortAddress(buyer.trim())}</span> : 'not set'}
          </p>
        </div>
        <dl className="divide-y px-5 py-2">
          <Line label="Face value">{units ? `${units.toLocaleString()} USDT` : dash}</Line>
          <Line label="Units">{units ? units.toLocaleString() : dash}</Line>
          <Line label="Due">
            {due && !Number.isNaN(due.getTime()) ? due.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : dash}
          </Line>
          {listNow && (
            <>
              <Line label="Unit price">{unitPrice !== null ? `${formatUsdt(unitPrice)} USDT` : dash}</Line>
              <Line label="Investor return">
                {unitPrice !== null ? <span className="text-yield font-medium">{returnPercent(unitPrice)}</span> : dash}
              </Line>
              <Line label="Yield p.a.">
                {annual !== null ? <span className="text-yield font-medium">{formatYield(annual)}</span> : dash}
              </Line>
              <Line label="You receive if all sell" strong>
                {unitPrice !== null && units ? `${formatUsdt(unitPrice * units)} USDT` : dash}
              </Line>
            </>
          )}
        </dl>

        <div className="space-y-4 border-t p-5">
          {finished ? (
            <>
              <p className="text-state-settled text-sm font-medium">
                {queuedList ? 'Created and listed. Investors can buy units now.' : 'Created. List it from Your receivables.'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={startOver}>
                  New receivable
                </Button>
                <Button type="button" onClick={onDone}>
                  View list
                </Button>
              </div>
            </>
          ) : (
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {listNow ? <Store /> : <FilePlus2 />}
              {submitLabel}
            </Button>
          )}

          {error && <ErrorNote>{error}</ErrorNote>}

          {started && (
            <Steps
              steps={[
                {
                  label: 'Upload document',
                  state: upload === 'active' ? 'active' : upload === 'done' ? 'done' : 'failed',
                  detail: upload === 'failed' ? <ErrorNote>{uploadError}</ErrorNote> : undefined,
                },
                {
                  label: 'Create receivable',
                  state: stepState(createTx),
                  detail: createTx.phase === 'idle' ? undefined : <TxStatus tx={createTx} done="Created." />,
                },
                ...(queuedList
                  ? [
                      {
                        label: 'List for investors',
                        state: stepState(listTx),
                        detail:
                          listTx.phase === 'idle' ? (
                            createTx.phase === 'failed' ? (
                              <p className="text-muted-foreground text-sm">Not sent.</p>
                            ) : undefined
                          ) : (
                            <TxStatus tx={listTx} done="Listed." />
                          ),
                      },
                    ]
                  : []),
              ]}
            />
          )}
          {listTx.phase === 'failed' && (
            <p className="text-muted-foreground text-xs">
              The receivable was created. You can list it from Your receivables.
            </p>
          )}
        </div>
      </aside>
    </form>
  )
}

export default CreateReceivable
