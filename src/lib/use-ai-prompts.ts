/**
 * Hook to use AI prompts from configuration
 * Provides access to configured prompts with variable interpolation
 */

import { useState, useEffect } from 'react'
import {
  AIPromptConfig,
  AIPromptsSettings,
  DEFAULT_AI_PROMPTS,
  DEFAULT_GLOBAL_AI_SETTINGS,
  interpolatePrompt,
  getPromptById
} from './ai-prompts-config'

export function useAIPrompts() {
  const [prompts, setPrompts] = useState<AIPromptConfig[]>(DEFAULT_AI_PROMPTS)
  const [globalSettings, setGlobalSettings] = useState(DEFAULT_GLOBAL_AI_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  // Load prompts from localStorage on mount
  useEffect(() => {
    const savedPrompts = localStorage.getItem('ai-prompts-config')
    if (savedPrompts) {
      try {
        const parsed = JSON.parse(savedPrompts)
        setPrompts(parsed.prompts || DEFAULT_AI_PROMPTS)
        setGlobalSettings(parsed.globalSettings || DEFAULT_GLOBAL_AI_SETTINGS)
      } catch (error) {
        console.error('Failed to load saved prompts:', error)
      }
    }
    setLoaded(true)
  }, [])

  /**
   * Get a prompt by ID with variables interpolated
   */
  const getPrompt = (promptId: string, variables: Record<string, any> = {}): string | null => {
    const promptConfig = getPromptById(prompts, promptId)
    if (!promptConfig) {
      console.warn(`Prompt with ID "${promptId}" not found`)
      return null
    }
    
    return interpolatePrompt(promptConfig.prompt, variables)
  }

  /**
   * Get prompt configuration by ID
   */
  const getPromptConfig = (promptId: string): AIPromptConfig | undefined => {
    return getPromptById(prompts, promptId)
  }

  /**
   * Get model configuration for a prompt
   */
  const getModelConfig = (promptId: string) => {
    const promptConfig = getPromptById(prompts, promptId)
    if (!promptConfig) {
      return {
        model: globalSettings.defaultModel,
        temperature: globalSettings.defaultTemperature,
        maxTokens: globalSettings.defaultMaxTokens
      }
    }

    return {
      model: promptConfig.model || globalSettings.defaultModel,
      temperature: promptConfig.temperature || globalSettings.defaultTemperature,
      maxTokens: promptConfig.maxTokens || globalSettings.defaultMaxTokens
    }
  }

  /**
   * Reload prompts from localStorage
   */
  const reloadPrompts = () => {
    const savedPrompts = localStorage.getItem('ai-prompts-config')
    if (savedPrompts) {
      try {
        const parsed = JSON.parse(savedPrompts)
        setPrompts(parsed.prompts || DEFAULT_AI_PROMPTS)
        setGlobalSettings(parsed.globalSettings || DEFAULT_GLOBAL_AI_SETTINGS)
      } catch (error) {
        console.error('Failed to reload prompts:', error)
      }
    }
  }

  return {
    prompts,
    globalSettings,
    loaded,
    getPrompt,
    getPromptConfig,
    getModelConfig,
    reloadPrompts
  }
}