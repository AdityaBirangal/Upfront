import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { ThemeContext } from '@/lib/theme.ts'
import type { Theme } from '@/lib/theme.ts'

const STORAGE_KEY = 'upfront-theme'

function storedTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

/** Light, dark, or the system setting. Kept per browser, applied as `.dark` on <html>. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(storedTheme)
  const [prefersDark, setPrefersDark] = useState(systemDark)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setPrefersDark(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  function setTheme(next: Theme) {
    setThemeState(next)
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage can be blocked. The choice still applies for this visit.
    }
  }

  return (
    <ThemeContext value={{ theme, resolved, setTheme }}>{children}</ThemeContext>
  )
}
