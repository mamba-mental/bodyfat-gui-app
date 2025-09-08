"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getFontFamily, getGoogleFontsUrl, FONT_OPTIONS } from '@/lib/fonts'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  font: string
  setFont: (font: string) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [font, setFont] = useState<string>('roboto')
  const [mounted, setMounted] = useState(false)

  // Load theme and font from localStorage and server on mount
  useEffect(() => {
    const loadThemeSettings = async () => {
      // First try localStorage for immediate loading
      const savedSettings = localStorage.getItem('userSettings')
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings)
          if (settings.display?.theme) {
            setTheme(settings.display.theme)
          }
          if (settings.display?.font) {
            setFont(settings.display.font)
          }
        } catch (error) {
          console.error('Failed to load theme from local settings:', error)
        }
      }

      // Then try to load from server storage for synced settings
      try {
        const response = await fetch('/api/data/route?key=user_theme_settings')
        if (response.ok) {
          const data = await response.json()
          if (data && data.theme) {
            setTheme(data.theme)
          }
          if (data && data.font) {
            setFont(data.font)
          }
        }
      } catch (error) {
        console.error('Failed to load theme from server:', error)
      }
      
      setMounted(true)
    }

    loadThemeSettings()
  }, [])

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme, mounted])

  // Apply font changes
  useEffect(() => {
    if (!mounted) return

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
  }, [font, mounted])

  const updateTheme = async (newTheme: Theme) => {
    setTheme(newTheme)
    
    // Update localStorage
    const savedSettings = localStorage.getItem('userSettings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        settings.display = { ...settings.display, theme: newTheme }
        localStorage.setItem('userSettings', JSON.stringify(settings))
      } catch (error) {
        console.error('Failed to save theme to settings:', error)
      }
    } else {
      // Create default settings with theme
      const defaultSettings = {
        display: { theme: newTheme, font: font }
      }
      localStorage.setItem('userSettings', JSON.stringify(defaultSettings))
    }

    // Also save to server storage for better persistence
    try {
      await fetch('/api/data/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key: 'user_theme_settings', 
          data: { theme: newTheme, font: font } 
        })
      })
    } catch (error) {
      console.error('Failed to save theme to server:', error)
    }
  }

  const updateFont = async (newFont: string) => {
    setFont(newFont)
    
    // Update localStorage
    const savedSettings = localStorage.getItem('userSettings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        settings.display = { ...settings.display, font: newFont }
        localStorage.setItem('userSettings', JSON.stringify(settings))
      } catch (error) {
        console.error('Failed to save font to settings:', error)
      }
    } else {
      // Create default settings with font
      const defaultSettings = {
        display: { theme: theme, font: newFont }
      }
      localStorage.setItem('userSettings', JSON.stringify(defaultSettings))
    }

    // Also save to server storage for better persistence
    try {
      await fetch('/api/data/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key: 'user_theme_settings', 
          data: { theme: theme, font: newFont } 
        })
      })
    } catch (error) {
      console.error('Failed to save font to server:', error)
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