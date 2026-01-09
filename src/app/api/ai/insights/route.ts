import { NextRequest, NextResponse } from 'next/server'
import { UserData, BodyFatEntry, CalculationResult } from '@/types'
import { pythonApiConfig } from '@/lib/config'

// Use centralized config for Python API settings
const PYTHON_API_URL = pythonApiConfig.url;

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
    const { user, entries, calculation, aiProvider, aiModel, aiApiKey } = await request.json()

    console.log('AI Insights Request:', {
      aiProvider,
      aiModel,
      hasApiKey: !!aiApiKey,
      hasUser: !!user,
      entriesCount: entries?.length || 0
    })

    // Check if AI configuration is provided
    if (aiProvider && aiModel && aiApiKey) {
      // Use configured AI provider
      const aiInsights = await generateAIInsights(
        aiProvider,
        aiModel,
        aiApiKey,
        { user, entries, calculation }
      )

      console.log('AI Insights Response:', {
        success: aiInsights.success,
        insightsCount: aiInsights.insights?.length || 0
      })

      if (aiInsights.success) {
        return NextResponse.json(aiInsights.insights, { headers: corsHeaders })
      }
    }

    // Try to get insights from Python API as fallback
    try {
      const response = await fetch(`${PYTHON_API_URL}/ai/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user, entries, calculation }),
      })

      if (!response.ok) {
        throw new Error(`Python API returned status ${response.status}`)
      }

      const insights = await response.json()
      return NextResponse.json(insights, { headers: corsHeaders })
    } catch (pythonApiError) {
      console.warn('Python API insights failed, using fallback:', pythonApiError)

      // Fallback insights generation
      const fallbackInsights = generateFallbackInsights(user, entries, calculation)
      return NextResponse.json(fallbackInsights, { headers: corsHeaders })
    }
  } catch (error) {
    console.error('AI insights error:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500, headers: corsHeaders }
    )
  }
}

function generateFallbackInsights(
  user: UserData | null,
  entries: BodyFatEntry[],
  calculation: CalculationResult | null
): any[] {
  const insights = []

  if (!user) {
    return [{
      id: '1',
      category: 'welcome',
      priority: 'high',
      title: 'Welcome to Ap³𝘹Fit.ai!',
      content: 'Set up your profile to start receiving personalized AI insights and recommendations.',
      icon: '👋',
      timestamp: new Date().toISOString()
    }]
  }

  // Progress insights
  if (entries.length > 0) {
    const latestEntry = entries[0]
    const weightChange = user.current_weight - latestEntry.weight

    if (weightChange > 0) {
      insights.push({
        id: '2',
        category: 'progress',
        priority: 'high',
        title: 'Great Progress!',
        content: `You've lost ${weightChange.toFixed(1)} lbs since starting. Keep up the excellent work!`,
        icon: '🎉',
        timestamp: new Date().toISOString()
      })
    }

    if (latestEntry.body_fat_percentage && latestEntry.body_fat_percentage < user.current_bf) {
      const bfChange = user.current_bf - latestEntry.body_fat_percentage
      insights.push({
        id: '3',
        category: 'progress',
        priority: 'high',
        title: 'Body Fat Reduction',
        content: `Your body fat has decreased by ${bfChange.toFixed(1)}%. This is excellent progress toward your goal!`,
        icon: '💪',
        timestamp: new Date().toISOString()
      })
    }
  }

  // Nutrition insights
  if (calculation && calculation.progression && Array.isArray(calculation.progression) && calculation.progression.length > 0) {
    // Calculate current week based on timeline instead of entries count
    let currentWeekIndex = 0
    if (user.start_date) {
      const startDate = new Date(user.start_date)
      const today = new Date()
      const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
      currentWeekIndex = Math.min(Math.ceil(daysElapsed / 7), calculation.progression.length - 1)
    }
    const currentCalories = calculation.progression[currentWeekIndex]?.daily_calorie_intake

    if (currentCalories) {
      insights.push({
        id: '4',
        category: 'nutrition',
        priority: 'medium',
        title: 'Calorie Target',
        content: `Your current daily calorie target is ${Math.round(currentCalories)} calories. This is optimized for your goals.`,
        icon: '🍎',
        timestamp: new Date().toISOString()
      })
    }
  }

  // Goal insights - calculate based on timeline
  const timeToGoal = parseInt(user.timeline_weeks?.toString() || '16') || 16
  let weeksRemaining = timeToGoal
  if (user.start_date) {
    const startDate = new Date(user.start_date)
    const today = new Date()
    const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    const currentWeek = Math.ceil(daysElapsed / 7)
    weeksRemaining = Math.max(0, timeToGoal - currentWeek)
  }

  insights.push({
    id: '5',
    category: 'goal',
    priority: 'medium',
    title: 'Timeline Update',
    content: `You have ${weeksRemaining} weeks remaining in your program. Stay consistent!`,
    icon: '📅',
    timestamp: new Date().toISOString()
  })

  // Workout insights
  if (user.workout_days && user.workout_days >= 3) {
    insights.push({
      id: '6',
      category: 'workout',
      priority: 'low',
      title: 'Training Consistency',
      content: `Maintaining your ${user.workout_days} days/week training schedule is crucial for achieving your goals.`,
      icon: '🏋️',
      timestamp: new Date().toISOString()
    })
  }

  // Health insights
  if (user.sleep_quality === 'poor') {
    insights.push({
      id: '7',
      category: 'health',
      priority: 'high',
      title: 'Sleep Quality Alert',
      content: 'Poor sleep can significantly impact fat loss and muscle retention. Consider improving sleep hygiene.',
      icon: '😴',
      timestamp: new Date().toISOString()
    })
  }

  // Motivation
  insights.push({
    id: '8',
    category: 'motivation',
    priority: 'low',
    title: 'Stay Motivated!',
    content: 'Remember, sustainable progress takes time. Focus on consistency over perfection.',
    icon: '⭐',
    timestamp: new Date().toISOString()
  })

  return insights
}

async function generateAIInsights(
  provider: string,
  model: string,
  apiKey: string,
  context: { user: any, entries: any[], calculation: any }
): Promise<{ success: boolean; insights: any[] }> {
  try {
    const systemPrompt = `You are an AI fitness coach analyzing user data to provide actionable insights.

User Profile:
${context.user ? `- Name: ${context.user.name}
- Age: ${context.user.age}
- Current Weight: ${context.user.current_weight} lbs
- Goal Weight: ${context.user.goal_weight} lbs
- Body Fat: ${context.user.current_bf}%
- Goal Body Fat: ${context.user.goal_bf}%
- Workout Type: ${context.user.workout_type}` : 'No user data'}

Progress: ${context.entries?.length || 0} entries logged

Generate 3-5 specific, actionable insights in JSON format. Each insight should have:
- id: unique identifier
- category: one of (progress, nutrition, workout, goal, health, motivation)
- priority: one of (high, medium, low)
- title: short title
- content: detailed message with specific advice
- icon: emoji representing the insight
- timestamp: current ISO timestamp

Focus on:
1. Current progress analysis
2. Specific recommendations based on their data
3. Potential issues or warnings
4. Motivational support
5. Next steps

Return ONLY a JSON array of insights.`

    let response: any

    switch (provider) {
      case 'anthropic':
        response = await callAnthropicForInsights(apiKey, model, systemPrompt, context)
        break
      case 'openai':
        response = await callOpenAIForInsights(apiKey, model, systemPrompt, context)
        break
      case 'gemini':
        response = await callGeminiForInsights(apiKey, model, systemPrompt, context)
        break
      case 'groq':
        response = await callGroqForInsights(apiKey, model, systemPrompt, context)
        break
      case 'perplexity':
        response = await callPerplexityForInsights(apiKey, model, systemPrompt, context)
        break
      case 'chutes':
        response = await callChutesForInsights(apiKey, model, systemPrompt, context)
        break
      case 'fireworks':
        response = await callFireworksForInsights(apiKey, model, systemPrompt, context)
        break
      default:
        return { success: false, insights: [] }
    }

    if (response.success) {
      try {
        // Parse the AI response as JSON
        let parsedData = response.data

        // If it's a string, try to extract JSON from it
        if (typeof response.data === 'string') {
          // Try to find JSON array in the response
          const jsonMatch = response.data.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0])
          } else {
            // Try to parse the whole string as JSON
            parsedData = JSON.parse(response.data)
          }
        }

        // Ensure we have an array of insights
        const insights = Array.isArray(parsedData) ? parsedData : [parsedData]

        // Validate and transform insights to ensure they have required fields
        const validInsights = insights.map((insight, index) => ({
          id: insight.id || `ai-${Date.now()}-${index}`,
          category: insight.category || 'general',
          priority: insight.priority || 'medium',
          title: insight.title || 'AI Insight',
          content: insight.content || insight.message || 'No content available',
          icon: insight.icon || '💡',
          timestamp: insight.timestamp || new Date().toISOString()
        }))

        return { success: true, insights: validInsights }
      } catch (e) {
        console.error('Failed to parse AI insights:', e)
        console.error('Raw data:', response.data)
        return { success: false, insights: [] }
      }
    }

    return { success: false, insights: [] }
  } catch (error) {
    console.error('Error generating AI insights:', error)
    return { success: false, insights: [] }
  }
}

async function callAnthropicForInsights(apiKey: string, model: string, systemPrompt: string, context: any) {
  try {
    console.log('Calling Anthropic for insights with model:', model)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: 'Generate fitness insights based on the user data provided in the system prompt.'
        }],
        max_tokens: 1500,
        temperature: 0.7
      })
    })

    console.log('Anthropic insights response status:', response.status)

    if (response.ok) {
      const data = await response.json()
      console.log('Anthropic insights received successfully')
      return { success: true, data: data.content[0].text }
    } else {
      const errorData = await response.text()
      console.error('Anthropic insights API error:', response.status, errorData)
    }
  } catch (error) {
    console.error('Anthropic API error:', error)
  }
  return { success: false, data: null }
}

async function callOpenAIForInsights(apiKey: string, model: string, systemPrompt: string, context: any) {
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
          { role: 'user', content: 'Generate fitness insights based on the user data.' }
        ],
        max_tokens: 1500,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    })

    if (response.ok) {
      const data = await response.json()
      return { success: true, data: data.choices[0].message.content }
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
  }
  return { success: false, data: null }
}

async function callGeminiForInsights(apiKey: string, model: string, systemPrompt: string, context: any) {
  try {
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
              text: `${systemPrompt}\n\nGenerate fitness insights based on the user data.`
            }]
          }],
          generationConfig: {
            maxOutputTokens: 1500,
            temperature: 0.7
          }
        })
      }
    )

    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        data: data.candidates[0].content.parts[0].text
      }
    }
  } catch (error) {
    console.error('Gemini API error:', error)
  }
  return { success: false, data: null }
}

async function callGroqForInsights(apiKey: string, model: string, systemPrompt: string, context: any) {
  try {
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
          { role: 'user', content: 'Generate fitness insights based on the user data.' }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    })

    if (response.ok) {
      const data = await response.json()
      return { success: true, data: data.choices[0].message.content }
    }
  } catch (error) {
    console.error('Groq API error:', error)
  }
  return { success: false, data: null }
}

async function callPerplexityForInsights(apiKey: string, model: string, systemPrompt: string, context: any) {
  try {
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
          { role: 'user', content: 'Generate fitness insights based on the user data.' }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    })

    if (response.ok) {
      const data = await response.json()
      return { success: true, data: data.choices[0].message.content }
    }
  } catch (error) {
    console.error('Perplexity API error:', error)
  }
  return { success: false, data: null }
}

async function callChutesForInsights(apiKey: string, model: string, systemPrompt: string, context: any) {
  try {
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
          { role: 'user', content: 'Generate fitness insights based on the user data.' }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    })

    if (response.ok) {
      const data = await response.json()
      return { success: true, data: data.choices[0].message.content }
    }
  } catch (error) {
    console.error('Chutes API error:', error)
  }
  return { success: false, data: null }
}

async function callFireworksForInsights(apiKey: string, model: string, systemPrompt: string, context: any) {
  try {
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
          { role: 'user', content: 'Generate fitness insights based on the user data.' }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    })

    if (response.ok) {
      const data = await response.json()
      return { success: true, data: data.choices[0].message.content }
    }
  } catch (error) {
    console.error('Fireworks API error:', error)
  }
  return { success: false, data: null }
}