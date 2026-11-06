import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import type { ReactNode } from 'react'

import { ThemeContext } from '@/lib/theme.ts'
import type { Theme } from '@/lib/theme.ts'

const STORAGE_KEY = 'upfront-theme'

/** The saved choice, or light when nothing is saved. */
function storedTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** Light or dark, light by default. Kept per browser, applied as `.dark` on <html>. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(storedTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  function setTheme(next: Theme) {
    const apply = () => {
      // Synchronous, so the transition's "after" snapshot already has the new theme.
      flushSync(() => setThemeState(next))
      document.documentElement.classList.toggle('dark', next === 'dark')
    }
    // A slow crossfade of the whole page, so the hero footage morphs from day to night.
    // Browsers without view transitions, or with reduced motion, switch at once.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (next !== theme && !reduced && document.startViewTransition) document.startViewTransition(apply)
    else apply()
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage can be blocked. The choice still applies for this visit.
    }
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext value={{ theme, resolved: theme, setTheme, toggleTheme }}>{children}</ThemeContext>
  )
}
