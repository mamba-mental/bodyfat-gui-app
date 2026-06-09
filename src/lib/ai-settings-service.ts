import { AISettings, AIProvider, AIAreaConfig } from '@/types/ai'

export class AISettingsService {
  private static instance: AISettingsService
  
  private constructor() {}
  
  static getInstance(): AISettingsService {
    if (!AISettingsService.instance) {
      AISettingsService.instance = new AISettingsService()
      // Immediately try to load settings from server
      if (typeof window !== 'undefined') {
        AISettingsService.instance.loadSettingsFromServer()
      }
    }
    return AISettingsService.instance
  }
  
  private cachedSettings: AISettings | null = null
  private loadingPromise: Promise<AISettings | null> | null = null
  
  /**
   * Get AI settings from server only (no localStorage)
   * API keys are stored securely on the server only
   */
  getSettings(): AISettings | null {
    if (typeof window === 'undefined') return null
    
    // Return cached settings if available
    if (this.cachedSettings) {
      return this.cachedSettings
    }
    
    // If we're already loading, return null (the promise will update the UI when done)
    if (this.loadingPromise) {
      return null
    }
    
    // Start loading from server
    this.loadSettingsFromServer()
    return null
  }
  
  /**
   * Get AI settings asynchronously - use this for initial loads
   */
  async getSettingsAsync(): Promise<AISettings | null> {
    if (typeof window === 'undefined') return null
    
    // Return cached settings if available
    if (this.cachedSettings) {
      return this.cachedSettings
    }
    
    // If already loading, wait for it
    if (this.loadingPromise) {
      return await this.loadingPromise
    }
    
    // Start loading
    return await this.loadSettingsFromServer()
  }
  
  /**
   * Load settings from server asynchronously
   */
  private async loadSettingsFromServer(): Promise<AISettings | null> {
    // If already loading, return the existing promise
    if (this.loadingPromise) {
      return await this.loadingPromise
    }
    
    // Create loading promise
    this.loadingPromise = (async () => {
      try {
        const response = await fetch('/api/ai/settings')
        if (response.ok) {
          const settings = await response.json()
          if (settings) {
            this.cachedSettings = settings
            // Trigger a re-render by dispatching a custom event
            window.dispatchEvent(new CustomEvent('ai-settings-loaded'))
            return settings
          }
        }
        return null
      } catch (error) {
        console.error('Failed to load settings from server:', error)
        return null
      } finally {
        this.loadingPromise = null
      }
    })()
    
    return await this.loadingPromise
  }
  
  /**
   * Save AI settings to server only (no localStorage)
   */
  saveSettings(settings: AISettings): boolean {
    if (typeof window === 'undefined') return false
    
    // Update cached settings
    this.cachedSettings = settings
    
    // Settings are saved to server via the AI settings page component
    // This method just updates the cache for immediate UI updates
    return true
  }
  
  /**
   * Get the configured provider and model for a specific area.
   *
   * Always returns a `status` so callers can distinguish WHY a provider is
   * unavailable (settings not yet loaded vs. no provider assigned vs. provider
   * disabled/missing key) instead of silently treating every case as "empty".
   * `baseUrl` is included for OpenAI-compatible custom endpoints.
   */
  getAreaConfig(areaId: string): {
    provider: AIProvider | null
    model: string | null
    apiKey: string | null
    baseUrl: string | null
    status: 'ok' | 'settings_unavailable' | 'no_provider' | 'provider_unavailable'
  } {
    const settings = this.getSettings()
    if (!settings || !settings.areas || !settings.providers) {
      // Settings haven't loaded yet (async fetch in flight) OR the file is empty.
      // This is distinct from "user never configured a provider".
      console.warn('AI settings not loaded or invalid structure')
      return { provider: null, model: null, apiKey: null, baseUrl: null, status: 'settings_unavailable' }
    }

    const area = settings.areas.find(a => a.id === areaId)
    if (!area || !area.currentProvider || !area.currentModel) {
      console.warn(`No configuration found for area: ${areaId}`)
      return { provider: null, model: null, apiKey: null, baseUrl: null, status: 'no_provider' }
    }

    const providerConfig = settings.providers[area.currentProvider]
    if (!providerConfig || !providerConfig.enabled || !providerConfig.apiKey) {
      console.warn(`Provider ${area.currentProvider} not enabled or missing API key`)
      return { provider: null, model: null, apiKey: null, baseUrl: null, status: 'provider_unavailable' }
    }

    return {
      provider: area.currentProvider,
      model: area.currentModel,
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl || null,
      status: 'ok'
    }
  }
  
  /**
   * Get the first available provider with an API key
   */
  getAvailableProvider(): {
    provider: AIProvider | null
    apiKey: string | null
    model: string | null
  } {
    const settings = this.getSettings()
    if (!settings) {
      return { provider: null, apiKey: null, model: null }
    }
    
    // Check providers in order of preference
    const preferredOrder: AIProvider[] = ['anthropic', 'openai', 'gemini', 'groq', 'perplexity', 'mistral', 'xai', 'fireworks', 'openrouter', 'chutes', 'minimax', 'mercury']
    
    for (const provider of preferredOrder) {
      const config = settings.providers[provider]
      if (config && config.enabled && config.apiKey && config.models && config.models.length > 0) {
        return {
          provider,
          apiKey: config.apiKey,
          model: config.models[0].id
        }
      }
    }
    
    return { provider: null, apiKey: null, model: null }
  }
  
  /**
   * Check if fallback is enabled for an area
   */
  isFallbackEnabled(areaId: string): boolean {
    const settings = this.getSettings()
    if (!settings) return true // Default to true if no settings
    
    const area = settings.areas.find(a => a.id === areaId)
    return area ? area.fallbackEnabled : true
  }
  
  /**
   * Check if global fallback is enabled
   */
  isGlobalFallbackEnabled(): boolean {
    const settings = this.getSettings()
    return settings ? settings.globalFallbackEnabled : true
  }
  
  /**
   * Clear all AI settings (clears cache only, server storage managed separately)
   */
  clearSettings(): void {
    this.cachedSettings = null
  }
  
  /**
   * Force clear the cache (useful when settings are updated externally)
   */
  clearCache(): void {
    this.cachedSettings = null
  }
  
  /**
   * Export settings (without API keys for safety)
   */
  exportSettings(): object {
    const settings = this.getSettings()
    if (!settings) return {}
    
    // Create a copy without API keys
    const sanitized = JSON.parse(JSON.stringify(settings))
    
    Object.keys(sanitized.providers).forEach(provider => {
      if (sanitized.providers[provider].apiKey) {
        sanitized.providers[provider].apiKey = '[REDACTED]'
      }
    })
    
    return sanitized
  }
  
  /**
   * Import settings (preserving existing API keys)
   */
  importSettings(imported: AISettings): boolean {
    const current = this.getSettings()
    if (!current) {
      // If no current settings, can't import (no API keys to preserve)
      return false
    }
    
    // Merge imported settings with current API keys
    const merged: AISettings = {
      ...imported,
      providers: { ...imported.providers }
    }
    
    // Preserve API keys from current settings
    Object.keys(current.providers).forEach((provider) => {
      const key = provider as AIProvider
      if (current.providers[key].apiKey && merged.providers[key]) {
        merged.providers[key].apiKey = current.providers[key].apiKey
      }
    })
    
    return this.saveSettings(merged)
  }
}