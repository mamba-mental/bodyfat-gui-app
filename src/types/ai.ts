/**
 * AI Provider Types and Interfaces
 */

export type AIProvider =
  | 'anthropic'
  | 'chutes'
  | 'openai'
  | 'openrouter'
  | 'gemini'
  | 'minimax'
  | 'mercury'
  | 'perplexity'
  | 'mistral'
  | 'xai'
  | 'groq'
  | 'fireworks'
  | 'custom1'
  | 'custom2'
  | 'custom3'

export interface AIModel {
  id: string
  name: string
  description?: string
  contextWindow?: number
  maxOutput?: number
  capabilities?: string[]
  costPer1kTokens?: {
    input: number
    output: number
  }
}

export interface AIProviderConfig {
  provider: AIProvider
  apiKey: string
  baseUrl?: string
  enabled: boolean
  models?: AIModel[]
  connectionStatus?: 'success' | 'failed'
  connectionError?: string
  /** User-editable label for custom OpenAI-compatible slots */
  displayName?: string
}

export interface AIAreaConfig {
  id: string
  name: string
  description: string
  currentProvider?: AIProvider
  currentModel?: string
  fallbackEnabled: boolean
}

export interface AISettings {
  providers: Record<AIProvider, AIProviderConfig>
  areas: AIAreaConfig[]
  globalFallbackEnabled: boolean
}

// Define the areas of the app that use AI
export const AI_AREAS = [
  {
    id: 'confidence_analysis',
    name: 'Confidence Analysis',
    description: 'Analyzes calculation confidence and feasibility'
  },
  {
    id: 'progress_insights',
    name: 'Progress Insights',
    description: 'Generates personalized progress insights'
  },
  {
    id: 'chat_assistant',
    name: 'Chat Assistant',
    description: 'Interactive AI coach for Q&A'
  },
  {
    id: 'report_generation',
    name: 'Report Generation',
    description: 'AI-enhanced report content and analysis'
  },
  {
    id: 'meal_suggestions',
    name: 'Meal Suggestions',
    description: 'Personalized nutrition recommendations'
  },
  {
    id: 'workout_planning',
    name: 'Workout Planning',
    description: 'AI-powered exercise recommendations'
  }
] as const

// Provider configuration shape (not `as const` so string fields remain mutable)
export interface AIProviderStaticConfig {
  name: string
  baseUrl: string
  headers: (apiKey: string) => Record<string, string>
  models: AIModel[]
}

// Provider configurations
export const AI_PROVIDERS: Record<AIProvider, AIProviderStaticConfig> = {
  anthropic: {
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    headers: (apiKey: string) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    }),
    models: []
  },
  chutes: {
    name: 'Chutes AI',
    baseUrl: 'https://api.chutes.ai/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: []
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: []
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://apexfit.ai',
      'X-Title': 'ApexFit AI'
    }),
    models: []
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    headers: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    }),
    models: []
  },
  minimax: {
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: []
  },
  mercury: {
    name: 'Mercury AI',
    baseUrl: 'https://api.mercury.ai/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: []
  },
  perplexity: {
    name: 'Perplexity AI',
    baseUrl: 'https://api.perplexity.ai',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: []
  },
  mistral: {
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: []
  },
  xai: {
    name: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: []
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: []
  },
  fireworks: {
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: []
  },
  custom1: {
    name: 'Custom Endpoint 1',
    baseUrl: '',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: []
  },
  custom2: {
    name: 'Custom Endpoint 2',
    baseUrl: '',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: []
  },
  custom3: {
    name: 'Custom Endpoint 3',
    baseUrl: '',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: []
  }
}
