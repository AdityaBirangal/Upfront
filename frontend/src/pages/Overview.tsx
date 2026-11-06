import { ChevronRight, Inbox, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useConnection } from 'wagmi'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EmptyState from '@/components/EmptyState.tsx'
import ErrorNote from '@/components/ErrorNote.tsx'
import PageHeader from '@/components/PageHeader.tsx'
import StatusBadge from '@/components/StatusBadge.tsx'
import Usdt from '@/components/Usdt.tsx'
import { NAV } from '@/components/layout/nav.ts'
import { useReceivables, useRoles } from '@/chain.ts'
import { cn } from '@/lib/utils'
import { formatDate, returnPercent, unitValue } from '@/receivables.ts'
import type { Receivable } from '@/receivables.ts'

type Filter = 'all' | 'open' | 'closed'

const isOpen = (r: Receivable) =>
  r.status === 'Created' || r.status === 'Listed' || r.status === 'Funded'

function Workspaces() {
  const { address, status } = useConnection()
  const { roles, isPending } = useRoles(address)
  const pages = NAV.filter((item) => item.role)

  return (
    <section aria-labelledby="workspaces" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="workspaces" className="font-semibold tracking-tight">
          Workspaces
        </h2>
        <p className="text-muted-foreground text-sm">
          {status !== 'connected'
            ? 'Connect a wallet to see which roles it holds.'
            : isPending
              ? 'Checking this wallet’s roles…'
              : roles.size > 0
                ? 'Highlighted ones are open to this wallet.'
                : 'This wallet doesn’t hold a role yet. An admin can assign one.'}
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {pages.map((item) => {
          const held = item.role ? roles.has(item.role) : false
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  'group bg-card flex h-full items-start gap-4 rounded-xl border p-4 transition-colors outline-none',
                  'hover:border-foreground/20 focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                  held && 'border-primary/40 bg-primary/[0.03]',
                )}
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    held ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <item.icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {held ? 'Your role' : `${item.role} role`}
                    </span>
                  </span>
                  <span className="text-muted-foreground mt-1 block text-sm text-pretty">
                    {item.description}
                  </span>
                </span>
                <ChevronRight
                  className="text-muted-foreground group-hover:text-foreground mt-2 size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ReceivablesTable() {
  const { receivables, isPending, isError } = useReceivables()
  const [filter, setFilter] = useState<Filter>('all')
  const navigate = useNavigate()
  const newest = [...receivables].reverse()
  const shown = newest.filter((r) =>
    filter === 'all' ? true : filter === 'open' ? isOpen(r) : !isOpen(r),
  )
  const openCount = receivables.filter(isOpen).length

  return (
    <section aria-labelledby="receivables" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="receivables" className="font-semibold tracking-tight">
            Receivables onchain
          </h2>
          <p className="text-muted-foreground text-sm">Every receivable on this deployment, newest first.</p>
        </div>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            <TabsTrigger value="all">
              All <span className="text-muted-foreground tabular ml-1">{receivables.length}</span>
            </TabsTrigger>
            <TabsTrigger value="open">
              Open <span className="text-muted-foreground tabular ml-1">{openCount}</span>
            </TabsTrigger>
            <TabsTrigger value="closed">
              Closed{' '}
              <span className="text-muted-foreground tabular ml-1">{receivables.length - openCount}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isPending ? (
        <div className="space-y-2 rounded-xl border p-4" aria-busy aria-label="Loading">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-9" />
          ))}
        </div>
      ) : isError ? (
        <ErrorNote>Couldn’t read receivables from the chain. Check your connection and refresh.</ErrorNote>
      ) : shown.length === 0 ? (
        <EmptyState icon={Inbox} title={receivables.length === 0 ? 'No receivables yet' : 'Nothing here'}>
          {receivables.length === 0
            ? 'Receivables appear here once a seller creates one.'
            : 'No receivables match this filter.'}
        </EmptyState>
      ) : (
        <div className="bg-card rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Receivable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Face value</TableHead>
                <TableHead className="text-right">Return</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="pr-4 text-right">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/app/receivable/${r.id}`)}
                >
                  <TableCell className="pl-4">
                    <Link
                      to={`/app/receivable/${r.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {r.ref || 'No reference'}
                    </Link>
                    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <span className="tabular">#{r.id.toString()}</span>
                      {r.verified ? (
                        <ShieldCheck className="text-state-settled size-3.5" aria-label="Verified by buyer" />
                      ) : (
                        <ShieldAlert className="text-warning size-3.5" aria-label="Not verified by buyer" />
                      )}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Usdt value={unitValue(r.totalUnits)} />
                  </TableCell>
                  <TableCell className="text-right">
                    {r.unitPrice > 0n ? (
                      <span className="text-yield tabular font-medium">{returnPercent(r.unitPrice)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {r.unitsSold.toLocaleString()}
                    <span className="text-muted-foreground"> / {r.totalUnits.toLocaleString()}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground pr-4 text-right">{formatDate(r.dueDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}

function Overview() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Sellers turn invoices into receivables, buyers confirm them, and investors buy units at a discount. Each unit repays 1 USDT."
      />
      <div className="space-y-10">
        <Workspaces />
        <ReceivablesTable />
      </div>
    </>
  )
}

export default Overview
