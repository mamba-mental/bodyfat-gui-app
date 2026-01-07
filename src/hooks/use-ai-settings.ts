"use client"

import { useState, useEffect } from 'react'
import { AISettingsService } from '@/lib/ai-settings-service'
import { AISettings } from '@/types/ai'
import { useMountedRef } from './use-mounted-ref'

export function useAISettings() {
  const [settings, setSettings] = useState<AISettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useMountedRef()

  useEffect(() => {
    const aiSettingsService = AISettingsService.getInstance()

    const loadSettings = async () => {
      try {
        if (mountedRef.current) {
          setLoading(true)
        }

        // Use the async method to properly wait for settings
        const currentSettings = await aiSettingsService.getSettingsAsync()
        if (mountedRef.current) {
          setSettings(currentSettings)
        }
      } catch (err) {
        console.error('Error loading AI settings:', err)
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load AI settings')
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    }

    // Load initially
    loadSettings()

    // Listen for settings updates
    const handleSettingsLoaded = () => {
      if (mountedRef.current) {
        const newSettings = aiSettingsService.getSettings()
        setSettings(newSettings)
      }
    }

    window.addEventListener('ai-settings-loaded', handleSettingsLoaded)

    return () => {
      window.removeEventListener('ai-settings-loaded', handleSettingsLoaded)
    }
  }, [mountedRef])
  
  return { settings, loading, error }
}