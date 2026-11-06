import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'

export type ThemeState = {
  /** The theme in use. Same as `theme`; kept so components can read it either way. */
  resolved: Theme
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeState | null>(null)

export function useTheme(): ThemeState {
  const state = useContext(ThemeContext)
  if (!state) throw new Error('useTheme must be used inside ThemeProvider')
  return state
}
