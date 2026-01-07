"use client"

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getFontFamily, getGoogleFontsUrl, FONT_OPTIONS } from '@/lib/fonts'
import { useMountedRef } from '@/hooks/use-mounted-ref'
import { withBasePath } from '@/lib/api-path'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  font: string
  setFont: (font: string) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'userSettings'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [font, setFont] = useState<string>('roboto')
  const [mounted, setMounted] = useState(false)
  const mountedRef = useMountedRef()
  const userIdRef = useRef<string>('default')

  const resolveUserId = () => {
    try {
      const profile = localStorage.getItem('profileData')
      if (profile) {
        const parsed = JSON.parse(profile)
        return parsed?.email || parsed?.name || 'default'
      }
    } catch (error) {
      console.error('Failed to parse stored profile data:', error)
    }
    return 'default'
  }

  // Load theme and font from localStorage and server on mount
  useEffect(() => {
    const loadThemeSettings = async () => {
      // Resolve user identifier for server persistence
      userIdRef.current = resolveUserId()

      // First try localStorage for immediate loading
      const savedSettings = localStorage.getItem(THEME_STORAGE_KEY)
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings)
          if (mountedRef.current && settings.display?.theme) {
            setTheme(settings.display.theme)
          }
          if (mountedRef.current && settings.display?.font) {
            setFont(settings.display.font)
          }
        } catch (error) {
          console.error('Failed to load theme from local settings:', error)
        }
      }

      // Then try to load from theme API for cross-session persistence
      try {
        const query = userIdRef.current ? `?user_id=${encodeURIComponent(userIdRef.current)}` : ''
        const response = await fetch(withBasePath(`/api/theme${query}`))
        if (response.ok) {
          const data = await response.json()
          if (mountedRef.current && data?.theme) {
            setTheme(data.theme)
            // Also mirror into localStorage for instant reloads
            const existing = localStorage.getItem(THEME_STORAGE_KEY)
            if (existing) {
              try {
                const parsed = JSON.parse(existing)
                parsed.display = { ...parsed.display, theme: data.theme }
                localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(parsed))
              } catch {
                // ignore malformed local storage
              }
            }
          }
          if (mountedRef.current && data?.font) {
            setFont(data.font)
          }
        }
      } catch (error) {
        console.error('Failed to load theme from server:', error)
      }

      if (mountedRef.current) {
        setMounted(true)
      }
    }

    loadThemeSettings()
    // We intentionally exclude resolveUserId to keep dependencies stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountedRef])

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement

    // Use requestAnimationFrame to avoid conflicts with browser extensions
    const frameId = requestAnimationFrame(() => {
      root.classList.remove('light', 'dark')

      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        root.classList.add(systemTheme)
      } else {
        root.classList.add(theme)
      }
    })

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [theme, mounted])

  // Apply font changes
  useEffect(() => {
    if (!mounted) return

    // Use requestAnimationFrame to avoid conflicts with browser extensions
    const frameId = requestAnimationFrame(() => {
      // Load Google Fonts
      const fontLink = document.getElementById('google-fonts-link') as HTMLLinkElement
      if (fontLink) {
        fontLink.href = getGoogleFontsUrl([font])
      } else {
        const link = document.createElement('link')
        link.id = 'google-fonts-link'
        link.rel = 'stylesheet'
        link.href = getGoogleFontsUrl([font])
        document.head.appendChild(link)
      }

      // Apply font to root element
      const root = window.document.documentElement
      root.style.fontFamily = getFontFamily(font)
    })

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [font, mounted])

  const updateTheme = async (newTheme: Theme) => {
    setTheme(newTheme)
    if (userIdRef.current === 'default') {
      userIdRef.current = resolveUserId()
    }
    
    // Update localStorage
    const savedSettings = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        settings.display = { ...settings.display, theme: newTheme }
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings))
      } catch (error) {
        console.error('Failed to save theme to settings:', error)
      }
    } else {
      // Create default settings with theme
      const defaultSettings = {
        display: { theme: newTheme, font: font }
      }
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(defaultSettings))
    }

    // Persist to theme API for cross-session storage
    try {
      await fetch(withBasePath('/api/theme'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: newTheme,
          user_id: userIdRef.current
        })
      })
    } catch (error) {
      console.error('Failed to save theme to server:', error)
    }
  }

  const updateFont = async (newFont: string) => {
    setFont(newFont)
    if (userIdRef.current === 'default') {
      userIdRef.current = resolveUserId()
    }
    
    // Update localStorage
    const savedSettings = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        settings.display = { ...settings.display, font: newFont }
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings))
      } catch (error) {
        console.error('Failed to save font to settings:', error)
      }
    } else {
      // Create default settings with font
      const defaultSettings = {
        display: { theme: theme, font: newFont }
      }
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(defaultSettings))
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme, font, setFont: updateFont }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
