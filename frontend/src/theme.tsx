import { useEffect, useState } from 'react'
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
    setThemeState(next)
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
