import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router'
import { getAddress, isAddressEqual } from 'viem'
import type { Address, Hex } from 'viem'
import { useReadContract } from 'wagmi'
import { readContract, simulateContract, writeContract } from 'wagmi/actions'
import ReceivableActions from '../components/ReceivableActions.tsx'
import ReceivableList from '../components/ReceivableList.tsx'
import TxStatus from '../components/TxStatus.tsx'
import { BACKEND_URL, uploadDocument } from '../backend.ts'
import { useReceivables } from '../chain.ts'
import { ROLE_IDS, access, upfront } from '../contracts.ts'
import {
  WHOLE_NUMBER,
  canCancel,
  documentProblem,
  hashDocument,
} from '../receivables.ts'
import { WALLET_ADDRESS } from '../roles.ts'
import { useTx } from '../tx.ts'
import { config } from '../wagmi.ts'

const SAMPLE_PDF = 'sample-agreement.pdf'

type Step = 'idle' | 'active' | 'done' | 'failed'

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
  const busy = checking || upload === 'active' || tx.busy

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

  return (
    <main className="panel">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>Create receivable</h1>

      <form className="create-form" onSubmit={create} noValidate>
        <fieldset className="create-form field-wide" disabled={busy}>
          <label className="field">
            Reference
            <input
              className="input"
              value={ref}
              onChange={(event) => setRef(event.target.value)}
              placeholder="RCV-1001"
              autoComplete="off"
            />
          </label>
          <label className="field">
            Buyer address
            <input
              className="input"
              value={buyer}
              onChange={(event) => setBuyer(event.target.value)}
              placeholder="0x…"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <label className="field">
            Amount (USDT)
            <input
              className="input"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="numeric"
              placeholder="10"
              autoComplete="off"
            />
          </label>
          <label className="field">
            Due date and time
            <input
              className="input"
              type="datetime-local"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          <div className="field-wide file-row">
            <label className="field">
              Agreement PDF
              <input
                ref={fileInput}
                className="input"
                type="file"
                accept="application/pdf"
                onChange={selectDocument}
              />
            </label>
            <button
              type="button"
              className="button"
              onClick={attachSampleDocument}
            >
              Use sample PDF
            </button>
          </div>
          {docHash && (
            <p className="field-wide doc-hash">
              Document hash: <code className="address">{docHash}</code>
            </p>
          )}
          <button type="submit" className="button field-wide">
            {checking ? 'Checking…' : 'Create receivable'}
          </button>
        </fieldset>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {upload !== 'idle' && (
        <ol className="steps">
          <li>
            Upload document:{' '}
            {upload === 'active' ? (
              'uploading…'
            ) : upload === 'done' ? (
              'done.'
            ) : (
              <span className="form-error" role="alert">
                {uploadError}
              </span>
            )}
          </li>
          <li>
            Create receivable:{' '}
            {tx.phase === 'idle' ? (
              'waiting for the upload.'
            ) : (
              <TxStatus tx={tx} done="created." className="inline" />
            )}
          </li>
        </ol>
      )}

      <h2>My receivables</h2>
      <ReceivableList
        receivables={mine}
        isPending={isPending}
        isError={isError}
        empty="This wallet hasn't created any receivables yet."
        extra={(receivable) => (
          <ReceivableActions
            id={receivable.id}
            actions={
              canCancel(receivable)
                ? [
                    {
                      label: 'Cancel',
                      functionName: 'cancelReceivable',
                      done: 'Cancelled. The document can back a new receivable.',
                      confirm: `Cancel receivable #${receivable.id}? This can't be undone, but you can create it again with the same PDF.`,
                    },
                  ]
                : []
            }
          />
        )}
      />
    </main>
  )
}

export default Seller
