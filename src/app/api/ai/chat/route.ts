import { NextRequest, NextResponse } from 'next/server'
import { AI_PROVIDERS, AIProvider } from '@/types/ai'

// Hardcoded to avoid environment variable caching issues - Python API runs on port 8001
const PYTHON_API_URL = 'http://127.0.0.1:8001'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      message,
      messages, // For backward compatibility
      history,
      user,
      entries,
      calculation,
      aiProvider,
      aiModel,
      aiApiKey
    } = body

    console.log('AI Chat Request:', {
      hasMessage: !!message,
      hasMessages: !!messages,
      aiProvider,
      aiModel,
      hasApiKey: !!aiApiKey,
      apiKeyPrefix: aiApiKey ? aiApiKey.substring(0, 10) + '...' : 'none'
    })

    // Handle both new format (with AI config) and old format (messages array)
    if (aiProvider && aiModel && aiApiKey) {
      // New format with AI configuration
      const response = await callAIProvider(
        aiProvider,
        aiModel,
        aiApiKey,
        message || messages?.[messages.length - 1]?.content,
        { history, user, entries, calculation }
      )

      if (response.success) {
        console.log(`AI provider ${aiProvider} responded successfully`)
        return NextResponse.json({
          response: response.message,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      } else {
        // If AI call failed, try fallback
        console.warn(`AI provider ${aiProvider} failed, using fallback`)
        const localResponse = generateLocalResponse(
          message || messages?.[messages.length - 1]?.content || '',
          { user, entries, calculation }
        )
        return NextResponse.json({
          response: localResponse,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      }
    } else if (messages && Array.isArray(messages)) {
      // Old format - try Python API first
      try {
        const response = await fetch(`${PYTHON_API_URL}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages }),
        })

        if (!response.ok) {
          throw new Error(`Python API returned status ${response.status}`)
        }

        const result = await response.json()
        return NextResponse.json({ response: result }, { headers: corsHeaders })
      } catch (pythonApiError) {
        console.warn('Python API chat failed, using fallback:', pythonApiError)

        // Fallback chat response
        const fallbackResponse = generateFallbackChatResponse(messages)
        return NextResponse.json({ response: fallbackResponse }, { headers: corsHeaders })
      }
    }

    // Fallback to local response
    const localResponse = generateLocalResponse(
      message || messages?.[messages.length - 1]?.content || '',
      { user, entries, calculation }
    )

    return NextResponse.json({
      response: localResponse,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500, headers: corsHeaders }
    )
  }
}

async function callAIProvider(
  provider: AIProvider,
  model: string,
  apiKey: string,
  message: string,
  context: any
): Promise<{ success: boolean; message: string }> {
  console.log(`Calling AI Provider: ${provider} with model: ${model}`)

  const providerConfig = AI_PROVIDERS[provider]
  if (!providerConfig) {
    console.error(`Invalid provider: ${provider}`)
    return { success: false, message: 'Invalid provider' }
  }

  try {
    // Build context message
    // Check if a custom prompt was provided
    const customPrompt = context.systemPrompt

    const systemPrompt = customPrompt || `You are an AI fitness coach helping users track their body fat and achieve their fitness goals. 
User details: ${context.user ? `${context.user.name}, ${context.user.age} years old, goal: ${context.user.goal_weight} lbs at ${context.user.goal_bf}% body fat` : 'Not provided'}
Current progress: ${context.entries?.length || 0} entries logged
Be supportive, knowledgeable, and provide actionable advice.`

    console.log(`System prompt length: ${systemPrompt.length}, User message: "${message.substring(0, 50)}..."`)

    switch (provider) {
      case 'anthropic':
        return await callAnthropic(apiKey, model, systemPrompt, message)

      case 'openai':
        return await callOpenAI(apiKey, model, systemPrompt, message)

      case 'gemini':
        return await callGemini(apiKey, model, systemPrompt, message)

      case 'openrouter':
        return await callOpenRouter(apiKey, model, systemPrompt, message)

      case 'chutes':
        return await callChutesAI(apiKey, model, systemPrompt, message)

      case 'groq':
        return await callGroq(apiKey, model, systemPrompt, message)

      case 'fireworks':
        return await callFireworks(apiKey, model, systemPrompt, message)

      case 'perplexity':
        return await callPerplexity(apiKey, model, systemPrompt, message)

      case 'mistral':
        return await callMistral(apiKey, model, systemPrompt, message)

      case 'xai':
        return await callXAI(apiKey, model, systemPrompt, message)

      case 'minimax':
        return await callMinimax(apiKey, model, systemPrompt, message)

      case 'mercury':
        return await callMercury(apiKey, model, systemPrompt, message)

      default:
        return { success: false, message: 'Provider not yet implemented' }
    }
  } catch (error) {
    console.error(`Error calling ${provider}:`, error)
    return { success: false, message: 'Failed to get AI response' }
  }
}

async function callAnthropic(apiKey: string, model: string, systemPrompt: string, message: string) {
  console.log(`Calling Anthropic API with model: ${model}`)

  const requestBody = {
    model,
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
    max_tokens: 1000
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log(`Anthropic response status: ${response.status}`)

    if (response.ok) {
      const data = await response.json()
      console.log('Anthropic response received successfully')
      return { success: true, message: data.content[0].text }
    } else {
      const errorData = await response.text()
      console.error('Anthropic API error:', response.status, errorData)
      return { success: false, message: `Anthropic API error: ${response.status}` }
    }
  } catch (error) {
    console.error('Error calling Anthropic:', error)
    return { success: false, message: 'Failed to get response from Claude' }
  }
}

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, message: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    })

    console.log(`OpenAI response status: ${response.status}`)

    if (response.ok) {
      const data = await response.json()
      console.log('OpenAI response received successfully')
      return { success: true, message: data.choices[0].message.content }
    } else {
      const errorData = await response.text()
      console.error('OpenAI API error:', response.status, errorData)
      return { success: false, message: `OpenAI API error: ${response.status}` }
    }
  } catch (error) {
    console.error('Error calling OpenAI:', error)
    return { success: false, message: 'Failed to get response from OpenAI' }
  }
}

async function callGemini(apiKey: string, model: string, systemPrompt: string, message: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser: ${message}`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7
        }
      })
    }
  )

  if (response.ok) {
    const data = await response.json()
    return {
      success: true,
      message: data.candidates[0].content.parts[0].text
    }
  }

  return { success: false, message: 'Failed to get response from Gemini' }
}

async function callOpenRouter(apiKey: string, model: string, systemPrompt: string, message: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://apexfit.ai',
      'X-Title': 'ApexFit AI'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (response.ok) {
    const data = await response.json()
    return { success: true, message: data.choices[0].message.content }
  }

  return { success: false, message: 'Failed to get response from OpenRouter' }
}

function generateLocalResponse(message: string, context: any): string {
  const input = message.toLowerCase()
  const { user, entries, calculation } = context

  // Provide more detailed local responses based on context
  if (input.includes('progress') || input.includes('how am i doing')) {
    if (entries && entries.length >= 2) {
      const latestEntry = entries[0]
      const previousEntry = entries[1]
      const weightChange = latestEntry.weight - previousEntry.weight

      if (weightChange < 0) {
        return `Great job! You've lost ${Math.abs(weightChange).toFixed(1)} lbs since your last entry. Keep up the excellent work!`
      } else if (weightChange > 0) {
        return `Your weight increased by ${weightChange.toFixed(1)} lbs. This could be normal fluctuation. Focus on consistency and the long-term trend.`
      } else {
        return `Your weight has remained stable. This could mean you're building muscle while losing fat. Keep tracking!`
      }
    }
    return `Start by logging a few entries so I can track your progress. Consistency is key!`
  }

  if (input.includes('calorie') || input.includes('diet') || input.includes('eat')) {
    if (calculation?.progression?.[0]) {
      const calories = Math.round(calculation.progression[0].daily_calorie_intake)
      return `Based on your plan, aim for ${calories} calories per day. This will create a sustainable deficit for fat loss while preserving muscle.`
    }
    return `To get personalized calorie recommendations, make sure you've completed your profile setup and generated a calculation.`
  }

  if (input.includes('workout') || input.includes('exercise')) {
    return `For best results, combine resistance training 3-4x per week with moderate cardio. This helps preserve muscle while losing fat.`
  }

  if (input.includes('help') || input.includes('what can')) {
    return `I can help you with:
• Progress tracking and analysis
• Calorie and nutrition guidance
• Workout recommendations
• Motivation and support
• Understanding your body composition changes

What would you like to know more about?`
  }

  // Default response
  return `I'm here to help with your fitness journey! You can ask me about your progress, nutrition, workouts, or any fitness-related questions. What would you like to know?`
}

function generateFallbackChatResponse(messages: { role: string; content: string }[]): string {
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.role !== 'user') {
    return "I'm here to help! What would you like to know about your fitness journey?"
  }

  const userMessage = lastMessage.content.toLowerCase()

  // Simple rule-based responses
  if (userMessage.includes('weight') || userMessage.includes('lose')) {
    return "Based on your profile, you're targeting a weight loss of " +
      "about 1-2 lbs per week, which is a healthy and sustainable rate. " +
      "Stay consistent with your calorie targets and training program!"
  }

  if (userMessage.includes('calorie') || userMessage.includes('diet')) {
    return "Your calorie targets are calculated using the PRIME methodology, " +
      "which accounts for your metabolism, activity level, and goals. " +
      "Make sure to track your intake accurately and adjust based on weekly progress."
  }

  if (userMessage.includes('exercise') || userMessage.includes('workout')) {
    return "Resistance training is crucial for preserving muscle mass during weight loss. " +
      "Aim for progressive overload and focus on compound movements for best results."
  }

  if (userMessage.includes('progress') || userMessage.includes('track')) {
    return "Track your weight and body measurements weekly, preferably at the same time of day. " +
      "Remember that progress isn't always linear - focus on the overall trend."
  }

  if (userMessage.includes('muscle') || userMessage.includes('lean mass')) {
    return "Preserving lean muscle mass during weight loss requires adequate protein intake " +
      "(aim for 0.8-1g per pound of body weight) and consistent resistance training."
  }

  if (userMessage.includes('plateau') || userMessage.includes('stuck')) {
    return "Weight loss plateaus are normal. If you've been stuck for 2+ weeks, consider: " +
      "1) Reassessing your calorie intake, 2) Increasing activity, 3) Taking a diet break, " +
      "or 4) Getting your measurements checked as you might be losing fat while gaining muscle."
  }

  if (userMessage.includes('supplement') || userMessage.includes('protein')) {
    return "Whole foods should be your primary nutrition source. Supplements like protein powder " +
      "can help meet your targets, but focus on lean meats, fish, eggs, and plant proteins first."
  }

  if (userMessage.includes('sleep') || userMessage.includes('recovery')) {
    return "Sleep is crucial for fat loss and muscle recovery. Aim for 7-9 hours per night. " +
      "Poor sleep can affect hormones that regulate hunger and metabolism."
  }

  // Default response
  return "I'm here to help with your fitness journey! Feel free to ask about weight loss, " +
    "nutrition, exercise, or any aspect of your program. For full AI-powered responses, " +
    "ensure the Python API server is running."
}

async function callChutesAI(apiKey: string, model: string, systemPrompt: string, message: string) {
  const response = await fetch('https://api.chutes.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (response.ok) {
    const data = await response.json()
    return { success: true, message: data.choices[0].message.content }
  }

  return { success: false, message: 'Failed to get response from Chutes AI' }
}

async function callGroq(apiKey: string, model: string, systemPrompt: string, message: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (response.ok) {
    const data = await response.json()
    return { success: true, message: data.choices[0].message.content }
  }

  return { success: false, message: 'Failed to get response from Groq' }
}

async function callFireworks(apiKey: string, model: string, systemPrompt: string, message: string) {
  const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (response.ok) {
    const data = await response.json()
    return { success: true, message: data.choices[0].message.content }
  }

  return { success: false, message: 'Failed to get response from Fireworks' }
}

async function callPerplexity(apiKey: string, model: string, systemPrompt: string, message: string) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (response.ok) {
    const data = await response.json()
    return { success: true, message: data.choices[0].message.content }
  }

  return { success: false, message: 'Failed to get response from Perplexity' }
}

async function callMistral(apiKey: string, model: string, systemPrompt: string, message: string) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (response.ok) {
    const data = await response.json()
    return { success: true, message: data.choices[0].message.content }
  }

  return { success: false, message: 'Failed to get response from Mistral' }
}

async function callXAI(apiKey: string, model: string, systemPrompt: string, message: string) {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (response.ok) {
    const data = await response.json()
    return { success: true, message: data.choices[0].message.content }
  }

  return { success: false, message: 'Failed to get response from xAI' }
}

async function callMinimax(apiKey: string, model: string, systemPrompt: string, message: string) {
  const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (response.ok) {
    const data = await response.json()
    return { success: true, message: data.choices[0].message.content }
  }

  return { success: false, message: 'Failed to get response from Minimax' }
}

async function callMercury(apiKey: string, model: string, systemPrompt: string, message: string) {
  const response = await fetch('https://api.mercury.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (response.ok) {
    const data = await response.json()
    return { success: true, message: data.choices[0].message.content }
  }

  return { success: false, message: 'Failed to get response from Mercury' }
}