import { NextRequest, NextResponse } from 'next/server'
import { AI_PROVIDERS, AIProvider, AIModel } from '@/types/ai'

// Force recompilation
export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, baseUrl } = await request.json()
    console.log('Fetch models request:', { provider, hasApiKey: !!apiKey })

    if (!provider || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Provider and API key are required' },
        { status: 400 }
      )
    }

    const providerConfig = AI_PROVIDERS[provider as AIProvider]
    if (!providerConfig) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider' },
        { status: 400 }
      )
    }

    // Fetch models based on the provider
    switch (provider) {
      case 'anthropic':
        return await fetchAnthropicModels(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'openai':
        return await fetchOpenAIModels(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'openrouter':
        return await fetchOpenRouterModels(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'gemini':
        return await fetchGeminiModels(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'minimax':
        return await fetchMinimaxModels(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'perplexity':
        return await fetchPerplexityModels(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'xai':
        return await fetchXAIModels(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'mistral':
        return await fetchMistralModels(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'groq':
        return await fetchGroqModels(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'fireworks':
        return await fetchFireworksModels(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'chutes':
        return await fetchChutesModels(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'mercury':
        return await fetchMercuryModels(apiKey, baseUrl || providerConfig.baseUrl)
      
      default:
        return NextResponse.json(
          { success: false, error: 'Provider not yet implemented' },
          { status: 501 }
        )
    }
  } catch (error) {
    console.error('Fetch models error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function fetchAnthropicModels(apiKey: string, baseUrl: string): Promise<NextResponse> {
  try {
    // Anthropic's /v1/models endpoint requires proper headers
    const modelsUrl = baseUrl.includes('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`
    const response = await fetch(modelsUrl, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('Anthropic models response:', data)
      
      // Handle different response formats
      const modelsList = data.models || data.data || []
      const models: AIModel[] = modelsList.map((model: any) => ({
        id: model.id,
        name: model.display_name || model.name || model.id,
        description: model.description || `Type: ${model.type || 'chat'}, Created: ${model.created_at ? new Date(model.created_at).toLocaleDateString() : 'N/A'}`,
        contextWindow: model.context_window || 200000 // Claude models typically have 200k context
      }))

      return NextResponse.json({
        success: true,
        models: models.length > 0 ? models : [
          // Fallback models if API doesn't return list
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable model for complex tasks', contextWindow: 200000 },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and speed', contextWindow: 200000 },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and efficient', contextWindow: 200000 },
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most intelligent model', contextWindow: 200000 },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and intelligent', contextWindow: 200000 }
        ]
      })
    } else {
      // Return default models even if API fails
      return NextResponse.json({
        success: true,
        models: [
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable model for complex tasks', contextWindow: 200000 },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and speed', contextWindow: 200000 },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and efficient', contextWindow: 200000 },
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most intelligent model', contextWindow: 200000 },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and intelligent', contextWindow: 200000 }
        ]
      })
    }
  } catch (error) {
    console.error('Anthropic fetch error:', error)
    // Return default models on error
    return NextResponse.json({
      success: true,
      models: [
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable model for complex tasks', contextWindow: 200000 },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and speed', contextWindow: 200000 },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and efficient', contextWindow: 200000 },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most intelligent model', contextWindow: 200000 },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and intelligent', contextWindow: 200000 }
      ]
    })
  }
}

async function fetchOpenAIModels(apiKey: string, baseUrl: string): Promise<NextResponse> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models: AIModel[] = data.data
        .filter((model: any) => 
          model.id.includes('gpt') || 
          model.id.includes('text-') ||
          model.id.includes('dall-e') ||
          model.id.includes('whisper')
        )
        .map((model: any) => ({
          id: model.id,
          name: formatModelName(model.id),
          description: `Created by ${model.owned_by}`,
          capabilities: getModelCapabilities(model.id)
        }))
        .sort((a: AIModel, b: AIModel) => {
          // Sort to put GPT-4 models first, then GPT-3.5, then others
          const getOrder = (id: string) => {
            if (id.includes('gpt-4o')) return 0
            if (id.includes('gpt-4')) return 1
            if (id.includes('gpt-3.5')) return 2
            return 3
          }
          return getOrder(a.id) - getOrder(b.id)
        })

      return NextResponse.json({
        success: true,
        models: models
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch models from OpenAI'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Network error while fetching OpenAI models'
    })
  }
}

async function fetchOpenRouterModels(apiKey: string, baseUrl: string): Promise<NextResponse> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://apexfit.ai',
        'X-Title': 'ApexFit AI'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models: AIModel[] = data.data
        .map((model: any) => ({
          id: model.id,
          name: model.name || formatModelName(model.id),
          description: `Context: ${formatNumber(model.context_length)}, Price: $${model.pricing?.prompt || 'N/A'}/1k tokens`,
          contextWindow: model.context_length,
          maxOutput: model.top_provider?.max_completion_tokens,
          costPer1kTokens: model.pricing ? {
            input: parseFloat(model.pricing.prompt) * 1000,
            output: parseFloat(model.pricing.completion) * 1000
          } : undefined
        }))
        .sort((a: AIModel, b: AIModel) => {
          // Sort by context window size (larger first)
          return (b.contextWindow || 0) - (a.contextWindow || 0)
        })
        .slice(0, 50) // Limit to top 50 models

      return NextResponse.json({
        success: true,
        models: models
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch models from OpenRouter'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Network error while fetching OpenRouter models'
    })
  }
}

async function fetchGeminiModels(apiKey: string, baseUrl: string): Promise<NextResponse> {
  try {
    const response = await fetch(
      `${baseUrl}/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      const models: AIModel[] = data.models
        .filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
        .map((model: any) => ({
          id: model.name.replace('models/', ''),
          name: model.displayName || formatModelName(model.name.replace('models/', '')),
          description: model.description || `Input limit: ${formatNumber(model.inputTokenLimit)} tokens`,
          contextWindow: model.inputTokenLimit,
          maxOutput: model.outputTokenLimit,
          capabilities: model.supportedGenerationMethods
        }))
        .sort((a: AIModel, b: AIModel) => {
          // Sort Gemini 2.0 first, then 1.5, then others
          const getOrder = (id: string) => {
            if (id.includes('gemini-2')) return 0
            if (id.includes('gemini-1.5-pro')) return 1
            if (id.includes('gemini-1.5')) return 2
            if (id.includes('gemini-1.0-pro')) return 3
            return 4
          }
          return getOrder(a.id) - getOrder(b.id)
        })

      return NextResponse.json({
        success: true,
        models: models
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch models from Google Gemini'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Network error while fetching Gemini models'
    })
  }
}

// Helper functions
function formatModelName(modelId: string): string {
  // Clean up model IDs to be more readable
  return modelId
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/Gpt/g, 'GPT')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatNumber(num: number | undefined): string {
  if (!num) return 'N/A'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(0)}k`
  return num.toString()
}

function getModelCapabilities(modelId: string): string[] {
  const capabilities: string[] = []
  
  if (modelId.includes('gpt-4o')) {
    capabilities.push('vision', 'function-calling', 'json-mode')
  } else if (modelId.includes('gpt-4')) {
    capabilities.push('function-calling', 'json-mode')
    if (modelId.includes('vision') || modelId.includes('turbo')) {
      capabilities.push('vision')
    }
  } else if (modelId.includes('gpt-3.5')) {
    capabilities.push('function-calling', 'json-mode')
  } else if (modelId.includes('dall-e')) {
    capabilities.push('image-generation')
  } else if (modelId.includes('whisper')) {
    capabilities.push('audio-transcription')
  } else if (modelId.includes('text-embedding')) {
    capabilities.push('embeddings')
  }
  
  return capabilities
}

async function fetchMistralModels(apiKey: string, baseUrl: string): Promise<NextResponse> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models: AIModel[] = data.data
        ?.map((model: any) => ({
          id: model.id,
          name: model.id.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          description: `Capabilities: ${model.capabilities?.join(', ') || 'Chat'}`,
          contextWindow: model.max_tokens || 32000
        })) || []

      return NextResponse.json({
        success: true,
        models: models
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch models from Mistral'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Network error while fetching Mistral models'
    })
  }
}

async function fetchGroqModels(apiKey: string, baseUrl: string): Promise<NextResponse> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models: AIModel[] = data.data
        ?.map((model: any) => ({
          id: model.id,
          name: formatModelName(model.id),
          description: `Active: ${model.active}, Context: ${formatNumber(model.context_window)}`,
          contextWindow: model.context_window
        })) || []

      return NextResponse.json({
        success: true,
        models: models
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch models from Groq'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Network error while fetching Groq models'
    })
  }
}

async function fetchFireworksModels(apiKey: string, baseUrl: string): Promise<NextResponse> {
  try {
    // Fireworks has models at /v1/models
    const modelsUrl = baseUrl.includes('inference') ? 
      `${baseUrl.replace('/inference/v1', '')}/v1/models` : 
      `${baseUrl}/models`
      
    const response = await fetch(modelsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('Fireworks models response:', data)
      
      const modelsList = data.data || data.models || []
      const models: AIModel[] = modelsList
        .map((model: any) => ({
          id: model.id,
          name: model.name || formatModelName(model.id),
          description: `Context: ${formatNumber(model.context_length || model.context_window)}, Type: ${model.model_type || 'chat'}`,
          contextWindow: model.context_length || model.context_window || 16384
        }))
        .sort((a: AIModel, b: AIModel) => (b.contextWindow || 0) - (a.contextWindow || 0))

      return NextResponse.json({
        success: true,
        models: models.length > 0 ? models : [
          // Fallback Fireworks models
          { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', name: 'Llama 3.3 70B Instruct', description: 'Latest Llama model', contextWindow: 131072 },
          { id: 'accounts/fireworks/models/llama-v3p2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', description: 'Multimodal Llama model', contextWindow: 131072 },
          { id: 'accounts/fireworks/models/qwen2p5-72b-instruct', name: 'Qwen 2.5 72B', description: 'Powerful Qwen model', contextWindow: 32768 },
          { id: 'accounts/fireworks/models/mythomax-l2-13b', name: 'MythoMax L2 13B', description: 'Creative writing model', contextWindow: 4096 }
        ]
      })
    } else {
      return NextResponse.json({
        success: true,
        models: [
          { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', name: 'Llama 3.3 70B Instruct', description: 'Latest Llama model', contextWindow: 131072 },
          { id: 'accounts/fireworks/models/llama-v3p2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', description: 'Multimodal Llama model', contextWindow: 131072 },
          { id: 'accounts/fireworks/models/qwen2p5-72b-instruct', name: 'Qwen 2.5 72B', description: 'Powerful Qwen model', contextWindow: 32768 },
          { id: 'accounts/fireworks/models/mythomax-l2-13b', name: 'MythoMax L2 13B', description: 'Creative writing model', contextWindow: 4096 }
        ]
      })
    }
  } catch (error) {
    console.error('Fireworks fetch error:', error)
    return NextResponse.json({
      success: true,
      models: [
        { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', name: 'Llama 3.3 70B Instruct', description: 'Latest Llama model', contextWindow: 131072 },
        { id: 'accounts/fireworks/models/llama-v3p2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', description: 'Multimodal Llama model', contextWindow: 131072 },
        { id: 'accounts/fireworks/models/qwen2p5-72b-instruct', name: 'Qwen 2.5 72B', description: 'Powerful Qwen model', contextWindow: 32768 },
        { id: 'accounts/fireworks/models/mythomax-l2-13b', name: 'MythoMax L2 13B', description: 'Creative writing model', contextWindow: 4096 }
      ]
    })
  }
}

async function fetchMinimaxModels(apiKey: string, baseUrl: string): Promise<NextResponse> {
  try {
    // Minimax doesn't have a public models endpoint, so return known models
    const models: AIModel[] = [
      {
        id: 'abab7-chat',
        name: 'Abab 7 Chat',
        description: 'Latest chat model with 245k context',
        contextWindow: 245760
      },
      {
        id: 'abab6.5s-chat',
        name: 'Abab 6.5s Chat',
        description: 'Fast chat model',
        contextWindow: 8192
      },
      {
        id: 'abab6.5t-chat',
        name: 'Abab 6.5t Chat',
        description: 'Turbo chat model',
        contextWindow: 8192
      },
      {
        id: 'abab6.5g-chat',
        name: 'Abab 6.5g Chat',
        description: 'General chat model',
        contextWindow: 8192
      },
      {
        id: 'abab5.5-chat',
        name: 'Abab 5.5 Chat',
        description: 'Previous generation chat model',
        contextWindow: 16384
      },
      {
        id: 'abab5.5s-chat',
        name: 'Abab 5.5s Chat',
        description: 'Previous generation fast model',
        contextWindow: 16384
      }
    ]

    return NextResponse.json({
      success: true,
      models: models
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Network error while fetching Minimax models'
    })
  }
}

async function fetchPerplexityModels(apiKey: string, baseUrl: string): Promise<NextResponse> {
  try {
    // Perplexity doesn't have a public models endpoint, return known models
    return NextResponse.json({
      success: true,
      models: [
        { id: 'sonar-small-chat', name: 'Sonar Small Chat', description: 'Fast conversational model', contextWindow: 16384 },
        { id: 'sonar-small-online', name: 'Sonar Small Online', description: 'Fast model with internet access', contextWindow: 12000 },
        { id: 'sonar-medium-chat', name: 'Sonar Medium Chat', description: 'Balanced conversational model', contextWindow: 16384 },
        { id: 'sonar-medium-online', name: 'Sonar Medium Online', description: 'Balanced model with internet access', contextWindow: 12000 },
        { id: 'sonar-large-chat', name: 'Sonar Large Chat', description: 'Advanced conversational model', contextWindow: 16384 },
        { id: 'sonar-large-online', name: 'Sonar Large Online', description: 'Advanced model with internet access', contextWindow: 12000 }
      ]
    })
  } catch (error) {
    console.error('Perplexity fetch error:', error)
    return NextResponse.json({
      success: true,
      models: [
        { id: 'sonar-small-chat', name: 'Sonar Small Chat', description: 'Fast conversational model', contextWindow: 16384 },
        { id: 'sonar-small-online', name: 'Sonar Small Online', description: 'Fast model with internet access', contextWindow: 12000 },
        { id: 'sonar-medium-chat', name: 'Sonar Medium Chat', description: 'Balanced conversational model', contextWindow: 16384 },
        { id: 'sonar-medium-online', name: 'Sonar Medium Online', description: 'Balanced model with internet access', contextWindow: 12000 }
      ]
    })
  }
}

async function fetchXAIModels(apiKey: string, baseUrl: string): Promise<NextResponse> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models: AIModel[] = data.data?.map((model: any) => ({
        id: model.id,
        name: formatModelName(model.id),
        description: `Created: ${new Date(model.created * 1000).toLocaleDateString()}`,
        contextWindow: model.context_window || 8192
      })) || []

      return NextResponse.json({
        success: true,
        models: models
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch models from xAI'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Network error while fetching xAI models'
    })
  }
}

async function fetchChutesModels(apiKey: string, baseUrl: string): Promise<NextResponse> {
  try {
    // Chutes AI free/almost-free chat models in power order
    const chutesModels: AIModel[] = [
      // Tier 1: Very High Power (5/5)
      { id: 'deepseek-v3', name: 'DeepSeek V3', description: '671B MoE, GPT-4-class reasoning & code', contextWindow: 128000 },
      { id: 'deepseek-r1t-chimera', name: 'DeepSeek R1T-Chimera', description: 'Hybrid R1 & V3, 40% fewer tokens', contextWindow: 128000 },
      { id: 'deepseek-r1-70b', name: 'DeepSeek R1 70B', description: 'Flagship reasoning model, open weights', contextWindow: 128000 },
      { id: 'deepseek-r1-0528-qwen3', name: 'DeepSeek R1 0528 Qwen3', description: 'Benchmarks edge out GPT-4 on some tasks', contextWindow: 128000 },
      
      // Tier 2: High Power (4/5)
      { id: 'deepseek-r1-0528', name: 'DeepSeek R1 0528', description: '87% MMLU, 92% GSM-8K', contextWindow: 128000 },
      { id: 'deepseek-r1', name: 'DeepSeek R1', description: 'Transparent chain-of-thought, strong math/code', contextWindow: 128000 },
      { id: 'deepseek-prover-v2', name: 'DeepSeek Prover V2', description: 'Automated theorem proving, 88.9% MiniF2F', contextWindow: 32768 },
      { id: 'glm-4-0414', name: 'GLM-4 (0414)', description: 'Large bilingual model for general chat', contextWindow: 128000 },
      { id: 'qwen-2.5-vl-instruct', name: 'Qwen 2.5 VL Instruct', description: 'Strong vision-language chat', contextWindow: 128000 },
      { id: 'kimi-dev', name: 'Kimi Dev', description: 'Near GPT-4o on MT-Bench', contextWindow: 200000 },
      { id: 'llama-4-maverick-128e', name: 'Llama-4 Maverick 128E', description: '128-expert MoE, FP8 efficient', contextWindow: 128000 },
      { id: 'llama-4-scout-16e', name: 'Llama-4 Scout 16E', description: 'Small-expert MoE, cheaper tokens', contextWindow: 128000 },
      { id: 'deepseek-v3-0324', name: 'DeepSeek V3 0324', description: 'Faster token-efficient V3 checkpoint', contextWindow: 128000 },
      
      // Tier 3: Medium Power (3/5)
      { id: 'deepseek-v3-base', name: 'DeepSeek V3 Base', description: 'Best OSS base for fine-tuning', contextWindow: 128000 },
      { id: 'seed-coder-reasoning-bf16', name: 'Seed Coder Reasoning BF16', description: 'ByteDance model for code reasoning', contextWindow: 128000 },
      { id: 'deepcoder-preview', name: 'DeepCoder Preview', description: '60.6% LiveCodeBench, beats OpenAI o1', contextWindow: 128000 },
      { id: 'shisa-v2-llama-3.3', name: 'Shisa V2 (Llama 3.3)', description: 'Low-cost bilingual chat (JP/EN)', contextWindow: 128000 },
      { id: 'dolphin-3.0-mistral', name: 'Dolphin 3.0 (Mistral)', description: 'Balanced creativity & safety', contextWindow: 32768 },
      { id: 'mistral-small-3.1-instruct', name: 'Mistral Small 3.1 Instruct', description: '8-9B, fast, permissive', contextWindow: 32768 },
      { id: 'llama-3.1-nemotron-ultra-v1', name: 'Llama 3.1 Nemotron Ultra V1', description: 'Nvidia alignment, robust SFT', contextWindow: 128000 },
      { id: 'llama-3.1-fp8', name: 'Llama 3.1 FP8', description: 'FP8 quantized for speed', contextWindow: 128000 },
      { id: 'xgen-small-instruct', name: 'Xgen Small Instruct', description: 'Compact, good multilingual', contextWindow: 8192 },
      { id: 'qwen-3-a22b', name: 'Qwen 3 A22B', description: '22B instruct version', contextWindow: 128000 },
      
      // Tier 4: Entry Level (2/5)
      { id: 'qwen-3-a3b', name: 'Qwen 3 A3B', description: '3B portable, on-device chat', contextWindow: 32768 },
      { id: 'qwen-3', name: 'Qwen 3', description: 'Base chat model', contextWindow: 32768 },
      { id: 'playground', name: 'Playground', description: 'Fast tweakable sandbox', contextWindow: 32768 },
      { id: 'uno', name: 'Uno', description: 'Simple distilled chat', contextWindow: 8192 },
      { id: 'kokoro-82m', name: 'Kokoro 82M', description: 'Tiny 82M param for edge/IoT', contextWindow: 2048 },
      { id: 'kokoro', name: 'Kokoro', description: '1B class Japanese chat', contextWindow: 8192 },
      { id: 'uae-large-v1', name: 'UAE Large V1', description: 'Arabic/EN bilingual', contextWindow: 32768 },
      { id: 'csm-1b', name: 'CSM 1B', description: '1B compact chat', contextWindow: 8192 },
      { id: 'mai-ds-r1-fp8', name: 'MAI DS R1 FP8', description: 'Microsoft FP8 distill of DS-R1', contextWindow: 128000 },
      { id: 'templar-i', name: 'TEMPLAR-I', description: 'RL-aligned defense/security focus', contextWindow: 32768 },
      { id: 'qwq-arliai-rpr-v1', name: 'QwQ ArliAI RpR V1', description: 'Role-play tuned', contextWindow: 32768 },
      
      // Tier 5: Specialized (1/5)
      { id: 'ace-step', name: 'Ace Step', description: 'Music generation LLM', contextWindow: 8192 }
    ]

    // Try to fetch from API first
    const modelsUrl = baseUrl.includes('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`
    try {
      const response = await fetch(modelsUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Chutes models response:', data)
        
        const modelsList = data.models || data.data || []
        if (modelsList.length > 0) {
          const models: AIModel[] = modelsList.map((model: any) => ({
            id: model.id,
            name: model.name || formatModelName(model.id),
            description: `Provider: ${model.provider || 'Chutes AI'}, Context: ${formatNumber(model.context_length)}`,
            contextWindow: model.context_length || model.max_tokens || 8192
          }))
          
          return NextResponse.json({
            success: true,
            models: models
          })
        }
      }
    } catch (apiError) {
      console.log('Using predefined Chutes models list')
    }

    // Return the comprehensive list of free/almost-free models
    return NextResponse.json({
      success: true,
      models: chutesModels
    })
  } catch (error) {
    console.error('Chutes fetch error:', error)
    // Return a subset of the most popular models on error
    return NextResponse.json({
      success: true,
      models: [
        { id: 'deepseek-v3', name: 'DeepSeek V3', description: '671B MoE, GPT-4-class reasoning & code', contextWindow: 128000 },
        { id: 'deepseek-r1', name: 'DeepSeek R1', description: 'Transparent chain-of-thought, strong math/code', contextWindow: 128000 },
        { id: 'qwen-2.5-vl-instruct', name: 'Qwen 2.5 VL Instruct', description: 'Strong vision-language chat', contextWindow: 128000 },
        { id: 'mistral-small-3.1-instruct', name: 'Mistral Small 3.1 Instruct', description: '8-9B, fast, permissive', contextWindow: 32768 },
        { id: 'llama-3.1-nemotron-ultra-v1', name: 'Llama 3.1 Nemotron Ultra V1', description: 'Nvidia alignment, robust SFT', contextWindow: 128000 }
      ]
    })
  }
}

async function fetchMercuryModels(apiKey: string, baseUrl: string): Promise<NextResponse> {
  try {
    // Mercury AI documentation indicates /v1/models endpoint
    const modelsUrl = baseUrl.includes('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`
    const response = await fetch(modelsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('Mercury models response:', data)
      
      const modelsList = data.models || data.data || []
      const models: AIModel[] = modelsList.map((model: any) => ({
        id: model.id || model.model_id,
        name: model.name || model.display_name || formatModelName(model.id || model.model_id),
        description: model.description || `Type: ${model.type || 'chat'}, Context: ${formatNumber(model.context_length || model.max_tokens)}`,
        contextWindow: model.context_length || model.max_tokens || 8192
      }))

      return NextResponse.json({
        success: true,
        models: models.length > 0 ? models : [
          // Default Mercury models if none returned
          { id: 'mercury-7b-v1', name: 'Mercury 7B v1', description: 'Fast 7B parameter model', contextWindow: 8192 },
          { id: 'mercury-13b-v1', name: 'Mercury 13B v1', description: 'Balanced 13B parameter model', contextWindow: 8192 },
          { id: 'mercury-70b-v1', name: 'Mercury 70B v1', description: 'Large 70B parameter model', contextWindow: 8192 }
        ]
      })
    } else {
      return NextResponse.json({
        success: true,
        models: [
          { id: 'mercury-7b-v1', name: 'Mercury 7B v1', description: 'Fast 7B parameter model', contextWindow: 8192 },
          { id: 'mercury-13b-v1', name: 'Mercury 13B v1', description: 'Balanced 13B parameter model', contextWindow: 8192 },
          { id: 'mercury-70b-v1', name: 'Mercury 70B v1', description: 'Large 70B parameter model', contextWindow: 8192 }
        ]
      })
    }
  } catch (error) {
    console.error('Mercury fetch error:', error)
    return NextResponse.json({
      success: true,
      models: [
        { id: 'mercury-7b-v1', name: 'Mercury 7B v1', description: 'Fast 7B parameter model', contextWindow: 8192 },
        { id: 'mercury-13b-v1', name: 'Mercury 13B v1', description: 'Balanced 13B parameter model', contextWindow: 8192 },
        { id: 'mercury-70b-v1', name: 'Mercury 70B v1', description: 'Large 70B parameter model', contextWindow: 8192 }
      ]
    })
  }
}