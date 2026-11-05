import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router'
import ListForm from '../components/ListForm.tsx'
import ReceivableCard from '../components/ReceivableCard.tsx'
import {
  WHOLE_NUMBER,
  documentProblem,
  hashDocument,
  unitPriceFor,
} from '../receivables.ts'
import type { Receivable } from '../receivables.ts'
import { WALLET_ADDRESS } from '../roles.ts'
import type { Assignment } from '../roles.ts'

const SAMPLE_PDF = 'sample-agreement.pdf'

type Props = {
  assignments: Assignment[]
  receivables: Receivable[]
  onChange: (receivables: Receivable[]) => void
}

function Seller({ assignments, receivables, onChange }: Props) {
  const [ref, setRef] = useState('')
  const [buyer, setBuyer] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [docHash, setDocHash] = useState('')
  const [error, setError] = useState('')
  const latestFile = useRef<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function selectDocument(event: ChangeEvent<HTMLInputElement>) {
    return attachDocument(event.target.files?.[0] ?? null)
  }

  async function attachSampleDocument() {
    try {
      const response = await fetch(`/${SAMPLE_PDF}`)
      if (!response.ok) throw new Error('Sample PDF not found')
      const file = new File([await response.blob()], SAMPLE_PDF, {
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
    setDocHash('')
    setError('')
    if (!file) return

    try {
      const bytes = await file.arrayBuffer()
      const problem = documentProblem(bytes)
      const hash = problem ? '' : await hashDocument(bytes)
      if (latestFile.current !== file) return
      setDocHash(hash)
      setError(problem ?? '')
    } catch {
      if (latestFile.current === file) setError('Could not read that file.')
    }
  }

  function validate(buyerAddress: string, due: number) {
    if (!ref.trim()) return 'Enter a reference.'
    if (!WALLET_ADDRESS.test(buyerAddress)) {
      return 'Enter a valid buyer address (0x followed by 40 hex characters).'
    }
    const buyerHasRole = assignments.some(
      (a) =>
        a.role === 'Buyer' &&
        a.address.toLowerCase() === buyerAddress.toLowerCase(),
    )
    if (!buyerHasRole) return 'This wallet does not have the Buyer role.'
    if (!WHOLE_NUMBER.test(amount) || !Number.isSafeInteger(Number(amount))) {
      return 'Enter the amount as a whole number of USDT.'
    }
    if (!(due > Date.now())) return 'Choose a due date in the future.'
    if (!docHash) return 'Choose the agreement PDF.'
    const documentInUse = receivables.some(
      (r) => r.docHash === docHash && r.status !== 'Rejected',
    )
    if (documentInUse) {
      return 'This document is already used by another receivable.'
    }
    return null
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const buyerAddress = buyer.trim()
    const due = new Date(dueDate).getTime()

    const problem = validate(buyerAddress, due)
    if (problem) {
      setError(problem)
      return
    }

    onChange([
      ...receivables,
      {
        id: receivables.length + 1,
        ref: ref.trim(),
        buyer: buyerAddress,
        faceValue: Number(amount),
        dueDate: Math.floor(due / 1000),
        docHash,
        status: 'Created',
        discountBps: 0,
        unitPrice: 0,
        maxUnitsPerInvestor: 0,
        unitsSold: 0,
      },
    ])
    event.currentTarget.reset()
    latestFile.current = null
    setRef('')
    setBuyer('')
    setAmount('')
    setDueDate('')
    setDocHash('')
    setError('')
  }

  function list(
    target: Receivable,
    discountBps: number,
    maxUnitsPerInvestor: number,
  ) {
    onChange(
      receivables.map((r) =>
        r.id === target.id
          ? {
              ...r,
              status: 'Listed',
              discountBps,
              unitPrice: unitPriceFor(discountBps),
              maxUnitsPerInvestor,
            }
          : r,
      ),
    )
  }

  return (
    <main className="panel">
      <Link to="/app" className="back-link">
        ← Back
      </Link>
      <h1>Create receivable</h1>

      <form className="create-form" onSubmit={create} noValidate>
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
          Create receivable
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <h2>My receivables</h2>
      {receivables.length === 0 ? (
        <p>No receivables yet.</p>
      ) : (
        <ul className="receivable-list">
          {receivables.map((receivable) => (
            <ReceivableCard key={receivable.id} receivable={receivable}>
              {receivable.status === 'Accepted' && (
                <ListForm
                  receivable={receivable}
                  onList={(discountBps, maxUnitsPerInvestor) =>
                    list(receivable, discountBps, maxUnitsPerInvestor)
                  }
                />
              )}
            </ReceivableCard>
          ))}
        </ul>
      )}
    </main>
  )
}

export default Seller
