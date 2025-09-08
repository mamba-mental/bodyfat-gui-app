"use client"

import { useState, useEffect } from 'react'
import { AISettingsService } from '@/lib/ai-settings-service'
import { AISettings } from '@/types/ai'

export function useAISettings() {
  const [settings, setSettings] = useState<AISettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const aiSettingsService = AISettingsService.getInstance()
    
    const loadSettings = async () => {
      try {
        setLoading(true)
        
        // Use the async method to properly wait for settings
        const currentSettings = await aiSettingsService.getSettingsAsync()
        setSettings(currentSettings)
      } catch (err) {
        console.error('Error loading AI settings:', err)
        setError(err instanceof Error ? err.message : 'Failed to load AI settings')
      } finally {
        setLoading(false)
      }
    }
    
    // Load initially
    loadSettings()
    
    // Listen for settings updates
    const handleSettingsLoaded = () => {
      const newSettings = aiSettingsService.getSettings()
      setSettings(newSettings)
    }
    
    window.addEventListener('ai-settings-loaded', handleSettingsLoaded)
    
    return () => {
      window.removeEventListener('ai-settings-loaded', handleSettingsLoaded)
    }
  }, [])
  
  return { settings, loading, error }
}