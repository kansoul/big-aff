import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ColorSchemeProvider, MantineProvider, type MantineThemeOverride } from '@mantine/core'

import { ThemeContext, type Theme } from '@/app/providers/theme-context'

// Mantine v6 dark color palette — mapped to shadcn's neutral B&W scale
// Index: [0]=lightest (foreground text) … [9]=darkest (deepest bg)
const mantineTheme: MantineThemeOverride = {
  fontFamily: 'Inter Variable, sans-serif',
  primaryColor: 'red',
  colors: {
    dark: [
      '#f5f5f5', // [0] --foreground dark   (oklch 0.985)
      '#e8e8e8', // [1] --border light       (oklch 0.922)
      '#a8a8a8', // [2] --muted-foreground dark (oklch 0.708)
      '#7a7a7a', // [3] --muted-foreground light (oklch 0.556)
      '#3a3a3a', // [4] hover / active bg
      '#2e2e2e', // [5] --muted dark         (oklch 0.269)
      '#252525', // [6] --card dark          (oklch 0.205) → Paper bg
      '#1a1a1a', // [7] --background dark    (oklch 0.145) → body bg
      '#111111', // [8]
      '#080808', // [9]
    ],
  },
}
const THEME_STORAGE_KEY = 'app-theme'

const getPreferredTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyThemeClass = (theme: Theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getPreferredTheme)

  useEffect(() => {
    applyThemeClass(theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'))
  }, [])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  )

  return (
    <ThemeContext.Provider value={value}>
      <ColorSchemeProvider colorScheme={theme} toggleColorScheme={toggleTheme}>
        <MantineProvider theme={{ ...mantineTheme, colorScheme: theme }}>
          {children}
        </MantineProvider>
      </ColorSchemeProvider>
    </ThemeContext.Provider>
  )
}
