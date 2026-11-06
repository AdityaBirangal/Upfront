import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useConnection } from 'wagmi'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PageHeader from '@/components/PageHeader.tsx'
import ReceivableTable from '@/components/ReceivableTable.tsx'
import { OVERVIEW_COLUMNS, OverviewRow } from '@/components/ReceivableRows.tsx'
import { NAV } from '@/components/layout/nav.ts'
import { useReceivables, useRoles } from '@/chain.ts'
import { cn } from '@/lib/utils'
import type { Receivable } from '@/receivables.ts'
import { useNow } from '@/useNow.ts'

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
  const now = useNow()
  const shown = receivables.filter((r) =>
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
          <p className="text-muted-foreground text-sm">Every receivable on this deployment.</p>
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

      <ReceivableTable
        label="Receivables onchain"
        receivables={shown}
        isPending={isPending}
        isError={isError}
        columns={OVERVIEW_COLUMNS}
        defaultSort={{ key: 'Receivable', dir: 'desc' }}
        empty={
          receivables.length === 0
            ? { title: 'No receivables yet', body: 'Receivables appear here once a seller creates one.' }
            : { title: 'Nothing here', body: 'No receivables match this filter.' }
        }
        row={(r) => <OverviewRow key={r.id} r={r} now={now} />}
      />
    </section>
  )
}

function Overview() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Sellers turn signed contracts into receivables, buyers confirm them, and investors buy units at a discount. Each unit repays 1 USDT."
      />
      <div className="space-y-10">
        <Workspaces />
        <ReceivablesTable />
      </div>
    </>
  )
}

export default Overview
