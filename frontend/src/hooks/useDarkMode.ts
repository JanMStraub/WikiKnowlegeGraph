/**
 * Dark mode hook with system preference detection and localStorage persistence
 */

import { useState, useEffect } from 'react'
import type { Theme } from '../types'

const STORAGE_KEY = 'wikigraph-theme'

function getInitialTheme(): Theme {
  // Check localStorage first
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch (e) {
    console.warn('Failed to read theme from localStorage:', e)
  }

  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function useDarkMode() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e)
    }
  }, [theme])

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't set a preference
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) {
          setThemeState(e.matches ? 'dark' : 'light')
        }
      } catch (err) {
        console.warn('Failed to check theme preference:', err)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  }
}
