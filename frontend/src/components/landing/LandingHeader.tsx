import { ArrowRight } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/layout/SideNav.tsx'
import ThemeToggle from '@/components/ThemeToggle.tsx'
import { WRAP } from '@/components/landing/kit.tsx'
import { cn } from '@/lib/utils'

/** Landing sections. Absolute, so they work from other public pages too. */
const SECTIONS = [
  { href: '/#how', label: 'How it works' },
  { href: '/#returns', label: 'Returns' },
  { href: '/#earn', label: 'How we earn' },
  { href: '/#rules', label: 'Rules' },
  { href: '/#live', label: 'Live data' },
]

const LINK =
  'text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

export function OpenApp({ className }: { className?: string }) {
  return (
    <Button size="lg" asChild className={cn('h-11 px-5 text-[0.9375rem]', className)}>
      <Link to="/app">
        Open the app
        <ArrowRight aria-hidden />
      </Link>
    </Button>
  )
}

/** Sticky header shared by the public pages. */
function LandingHeader() {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b border-border/70 backdrop-blur-lg">
      <div className={`${WRAP} flex h-16 items-center gap-8`}>
        <Link to="/" className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-label="Upfront home">
          <Logo />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-1 lg:flex">
          {SECTIONS.map((n) => (
            <a key={n.href} href={n.href} className={LINK}>
              {n.label}
            </a>
          ))}
          <NavLink to="/future" className={({ isActive }) => cn(LINK, isActive && 'text-foreground')}>
            Future scope
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button size="sm" asChild>
            <Link to="/app">
              Open the app
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

export default LandingHeader
