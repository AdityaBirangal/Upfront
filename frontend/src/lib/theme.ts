import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export type ThemeState = {
  theme: Theme
  resolved: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeState | null>(null)

export function useTheme(): ThemeState {
  const state = useContext(ThemeContext)
  if (!state) throw new Error('useTheme must be used inside ThemeProvider')
  return state
}
