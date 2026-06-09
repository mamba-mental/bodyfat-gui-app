import { NextRequest, NextResponse } from 'next/server'
import { AI_PROVIDERS, AIProvider } from '@/types/ai'

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, baseUrl } = await request.json()

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

    // Test the connection based on the provider
    switch (provider) {
      case 'anthropic':
        return await testAnthropicConnection(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'openai':
        return await testOpenAIConnection(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'openrouter':
        return await testOpenRouterConnection(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'gemini':
        return await testGeminiConnection(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'minimax':
        return await testMinimaxConnection(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'perplexity':
        return await testPerplexityConnection(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'xai':
        return await testXAIConnection(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'mistral':
        return await testMistralConnection(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'groq':
        return await testGroqConnection(apiKey, baseUrl || providerConfig.baseUrl, providerConfig)
      
      case 'fireworks':
        return await testFireworksConnection(apiKey, baseUrl || providerConfig.baseUrl, providerConfig)
      
      case 'chutes':
        return await testChutesConnection(apiKey, baseUrl || providerConfig.baseUrl)
      
      case 'mercury':
        return await testMercuryConnection(apiKey, baseUrl || providerConfig.baseUrl)

      // Feature 1: custom OpenAI-compatible endpoints
      case 'custom1':
      case 'custom2':
      case 'custom3':
        return await testOpenAICompatibleConnection(apiKey, baseUrl || '')

      default:
        return NextResponse.json(
          { success: false, error: 'Provider not yet implemented' },
          { status: 501 }
        )
    }
  } catch (error) {
    console.error('Test connection error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function testAnthropicConnection(apiKey: string, baseUrl: string): Promise<NextResponse> {
  try {
    // Test connection and fetch models
    const modelsResponse = await fetch(`${baseUrl}/models`, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    })

    if (modelsResponse.ok) {
      const data = await modelsResponse.json()
      const models = data.models?.map((model: any) => ({
        id: model.id,
        name: model.display_name || model.id,
        description: `Created: ${new Date(model.created_at).toLocaleDateString()}`,
        contextWindow: 200000 // Claude models typically have 200k context
      })) || []

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Anthropic',
        models: models
      })
    } else if (modelsResponse.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      })
    } else {
      // Fallback to test with messages endpoint
      const testResponse = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10
        })
      })

      if (testResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'Successfully connected to Anthropic (models endpoint not accessible)',
          models: []
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Connection failed'
        })
      }
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Anthropic'
    })
  }
}

async function testOpenAIConnection(apiKey: string, baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      // Feature 2: removed the narrow gpt-only filter for the test path too.
      // Return a representative sample (first 15) so the toast isn't huge.
      const models = data.data
        .filter((model: any) => {
          const id: string = model.id
          return (
            !id.includes('embedding') &&
            !id.startsWith('tts-') &&
            !id.startsWith('dall-e') &&
            !id.startsWith('whisper')
          )
        })
        .slice(0, 15)
        .map((model: any) => ({
          id: model.id,
          name: model.id,
          description: `Created by ${model.owned_by}`
        }))

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to OpenAI',
        models: models
      })
    } else if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Connection failed'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to OpenAI'
    })
  }
}

async function testOpenRouterConnection(apiKey: string, baseUrl: string) {
  try {
    const response = await fetch(`https://openrouter.ai/api/v1/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://apexfit.ai',
        'X-Title': 'ApexFit AI'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models = data.data
        .slice(0, 20) // Get first 20 models
        .map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          description: `Context: ${model.context_length || 'N/A'}, Price: $${model.pricing?.prompt || 'N/A'}/1k tokens`,
          contextWindow: model.context_length
        }))

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to OpenRouter',
        models: models
      })
    } else if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Connection failed'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to OpenRouter'
    })
  }
}

async function testGeminiConnection(apiKey: string, baseUrl: string) {
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
      const models = data.models
        .filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
        .map((model: any) => ({
          id: model.name.replace('models/', ''),
          name: model.displayName || model.name,
          description: model.description || 'Gemini model',
          contextWindow: model.inputTokenLimit
        }))

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Google Gemini',
        models: models
      })
    } else if (response.status === 400 || response.status === 403) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Connection failed'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Google Gemini'
    })
  }
}

async function testMistralConnection(apiKey: string, baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models = data.data?.map((model: any) => ({
        id: model.id,
        name: model.id,
        description: `Created: ${new Date(model.created * 1000).toLocaleDateString()}`
      })) || []

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Mistral AI',
        models: models
      })
    } else if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Connection failed'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Mistral AI'
    })
  }
}

async function testGroqConnection(apiKey: string, baseUrl: string, providerConfig: any) {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models = data.data?.map((model: any) => ({
        id: model.id,
        name: model.id.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        description: `Context: ${model.context_window || 'N/A'} tokens`
      })) || []

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Groq',
        models: models
      })
    } else if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Connection failed'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Groq'
    })
  }
}

async function testFireworksConnection(apiKey: string, baseUrl: string, providerConfig: any) {
  try {
    // First try to get account info from a simple model list
    const modelsUrl = `${baseUrl.replace('/inference/v1', '')}/v1/models`
    const response = await fetch(modelsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models = data.data?.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: `Context: ${model.context_length || 'N/A'}, Type: ${model.model_type || 'chat'}`
      })) || []

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Fireworks AI',
        models: models
      })
    } else if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      })
    } else {
      // Fallback test with completion
      const testResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10
        })
      })

      if (testResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'Successfully connected to Fireworks AI (models endpoint not accessible)',
          models: []
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Connection failed'
        })
      }
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Fireworks AI'
    })
  }
}

async function testMinimaxConnection(apiKey: string, baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models = data.models?.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: `Max tokens: ${model.max_tokens || 'N/A'}`
      })) || []

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Minimax',
        models: models
      })
    } else if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Connection failed'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Minimax'
    })
  }
}

async function testPerplexityConnection(apiKey: string, baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models = data.models?.map((model: any) => ({
        id: model.id,
        name: model.id,
        description: `Context: ${model.context_length || 4096} tokens`
      })) || []

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Perplexity',
        models: models
      })
    } else if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      })
    } else {
      // Fallback to test with chat completion
      const testResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-small-chat',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10
        })
      })

      if (testResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'Successfully connected to Perplexity (models endpoint not accessible)',
          models: []
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Connection failed'
        })
      }
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Perplexity'
    })
  }
}

async function testXAIConnection(apiKey: string, baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models = data.data?.map((model: any) => ({
        id: model.id,
        name: model.id,
        description: `Created: ${new Date(model.created * 1000).toLocaleDateString()}`
      })) || []

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to xAI',
        models: models
      })
    } else if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Connection failed'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to xAI'
    })
  }
}

async function testChutesConnection(apiKey: string, baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models = data.data?.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: `Provider: ${model.provider || 'Chutes AI'}`
      })) || []

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Chutes AI',
        models: models
      })
    } else if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Connection failed'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Chutes AI'
    })
  }
}

async function testMercuryConnection(apiKey: string, baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const models = data.models?.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: `Type: ${model.type || 'chat'}`
      })) || []

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Mercury',
        models: models
      })
    } else if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Connection failed'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Mercury'
    })
  }
}

/**
 * Feature 1: Test connection for custom OpenAI-compatible endpoints (custom1/2/3).
 * GETs /models, verifies the response structure, returns a sample of found models.
 */
async function testOpenAICompatibleConnection(apiKey: string, baseUrl: string) {
  if (!baseUrl) {
    return NextResponse.json({ success: false, error: 'Set the Base URL first.' })
  }

  const normalised = baseUrl.replace(/\/$/, '')
  const modelsUrl = normalised.endsWith('/models')
    ? normalised
    : `${normalised}/models`

  try {
    const response = await fetch(modelsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const list: any[] = data.data || data.models || []
      const models = list.slice(0, 15).map((m: any) => ({
        id: m.id,
        name: m.id,
        description: m.owned_by ? `Provided by ${m.owned_by}` : undefined
      }))

      return NextResponse.json({
        success: true,
        message: `Connected — found ${list.length} model${list.length !== 1 ? 's' : ''}`,
        models
      })
    } else if (response.status === 401) {
      return NextResponse.json({ success: false, error: 'Invalid API key' })
    } else {
      const errText = await response.text().catch(() => '')
      return NextResponse.json({
        success: false,
        error: `Endpoint returned ${response.status}${errText ? `: ${errText.slice(0, 200)}` : ''}`
      })
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: `Network error: ${msg}` })
  }
}