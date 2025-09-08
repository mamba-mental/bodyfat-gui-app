/**
 * AI Provider Types and Interfaces
 */

export type AIProvider = 'anthropic' | 'chutes' | 'openai' | 'openrouter' | 'gemini' | 'minimax' | 'mercury' | 'perplexity' | 'mistral' | 'xai' | 'groq' | 'fireworks'

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

// Provider configurations
export const AI_PROVIDERS = {
  anthropic: {
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    headers: (apiKey: string) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    }),
    models: [] // Will be populated from API or manually
  },
  chutes: {
    name: 'Chutes AI',
    baseUrl: 'https://api.chutes.ai/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: [] // Will be fetched dynamically
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: [] // Will be fetched from OpenAI API
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
    models: [] // Will be fetched from their models endpoint
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    headers: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    }),
    models: [] // Will be fetched from Google API
  },
  minimax: {
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: [] // MiniMax doesn't provide models endpoint
  },
  mercury: {
    name: 'Mercury AI',
    baseUrl: 'https://api.mercury.ai/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: [] // Mercury API endpoint unknown
  },
  perplexity: {
    name: 'Perplexity AI',
    baseUrl: 'https://api.perplexity.ai',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: [] // Perplexity doesn't provide models endpoint
  },
  mistral: {
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: [] // Will be fetched from Mistral API
  },
  xai: {
    name: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: [] // xAI doesn't provide models endpoint
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: [] // Will be fetched from Groq API
  },
  fireworks: {
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: [] // Will be fetched from Fireworks API
  }
} as const