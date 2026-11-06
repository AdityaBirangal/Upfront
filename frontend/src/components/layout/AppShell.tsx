import { Menu } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import BackendStatus from '../BackendStatus.tsx'
import NetworkBanner from '../NetworkBanner.tsx'
import ThemeToggle from '../ThemeToggle.tsx'
import WalletMenu from '../WalletMenu.tsx'
import SideNav, { Logo, NavLinks, NetworkFooter } from './SideNav.tsx'
import SiteFooter from './SiteFooter.tsx'

function MobileNav() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar w-72 gap-0 p-0">
        <SheetHeader className="h-14 justify-center px-4">
          <SheetTitle>
            <Logo />
          </SheetTitle>
          <SheetDescription className="sr-only">Sections of the app</SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-3 py-2">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
        <div className="border-sidebar-border border-t px-4 py-4">
          <NetworkFooter />
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Sidebar on wide screens, a sheet on narrow ones, and the wallet in the top bar. */
function AppShell() {
  return (
    <div className="flex min-h-svh">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur-sm">
          <div className="flex h-14 items-center gap-2 px-4 md:px-6">
            <MobileNav />
            <NavLink to="/app" className="lg:hidden">
              <Logo />
            </NavLink>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <BackendStatus className="hidden md:inline-flex" />
              <ThemeToggle />
              <WalletMenu />
            </div>
          </div>
          <NetworkBanner />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6 lg:px-8">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}

export default AppShell
