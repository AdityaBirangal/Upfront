import WhitechainLogo from '@/components/WhitechainLogo.tsx'
import { NavLink } from 'react-router'
import { useConnection } from 'wagmi'
import { useRoles } from '@/chain.ts'
import { upfront } from '@/contracts.ts'
import { cn } from '@/lib/utils'
import { shortAddress } from '@/receivables.ts'
import { targetChain } from '@/wagmi.ts'
import { NAV } from './nav.ts'

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 24 24" className="text-primary size-7" aria-hidden>
        <rect width="24" height="24" rx="6" fill="currentColor" />
        <path
          d="M7 6.5v6.25a5 5 0 0 0 10 0V6.5"
          fill="none"
          stroke="var(--primary-foreground)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path d="M12 6.5v6.5" stroke="var(--primary-foreground)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className="text-[0.9375rem] font-semibold tracking-tight">Upfront</span>
    </span>
  )
}

/** The app's sections, with a marker on the ones this wallet holds the role for. */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { address } = useConnection()
  const { roles } = useRoles(address)

  return (
    <nav aria-label="Main" className="grid gap-0.5">
      {NAV.map((item) => {
        const held = item.role ? roles.has(item.role) : false
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group text-sidebar-foreground flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors outline-none',
                'hover:bg-sidebar-active/70 hover:text-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                isActive && 'bg-sidebar-active text-foreground font-medium shadow-[0_1px_2px_oklch(0_0_0/0.06)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn('size-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}
                  aria-hidden
                />
                <span className="flex-1">{item.label}</span>
                {held && (
                  <span className="text-muted-foreground text-[0.6875rem]">
                    {item.role}
                  </span>
                )}
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function NetworkFooter() {
  return (
    <div className="text-muted-foreground space-y-1 text-xs">
      <p className="flex items-center gap-2">
        <span className="bg-state-settled size-1.5 rounded-full" aria-hidden />
        <WhitechainLogo className="size-3.5" />
        {targetChain.name}
      </p>
      <p>
        Contract <span className="font-mono">{shortAddress(upfront.address)}</span>
      </p>
    </div>
  )
}

function SideNav() {
  return (
    <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r lg:flex">
      <div className="flex h-14 items-center px-4">
        <NavLink to="/app" className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <Logo />
        </NavLink>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <NavLinks />
      </div>
      <div className="border-sidebar-border border-t px-4 py-4">
        <NetworkFooter />
      </div>
    </aside>
  )
}

export default SideNav
