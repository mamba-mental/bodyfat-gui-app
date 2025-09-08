import { NextRequest, NextResponse } from 'next/server'
import { UserData, CalculationResult } from '@/types'

const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://127.0.0.1:8001'

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
    const { userData, newEntry } = await request.json()
    
    console.log('Recalculate Request - User:', userData.name)
    console.log('New Entry:', newEntry)
    
    // Update user data with new entry values
    const updatedUserData = {
      ...userData,
      current_weight: newEntry.weight,
      current_bf: newEntry.body_fat_percentage || userData.current_bf
    }
    
    // Call the Python API to recalculate
    try {
      const response = await fetch(`${PYTHON_API_URL}/recalculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_data: userData,
          entry: newEntry
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Python API returned status ${response.status}`)
      }

      const result: CalculationResult = await response.json()
      
      return NextResponse.json(result, { headers: corsHeaders })
    } catch (pythonApiError) {
      console.warn('Python API recalculation failed, using fallback:', pythonApiError)
      
      // Fallback: Return updated user data without recalculation
      // This allows the app to continue functioning
      const fallbackResult: CalculationResult = {
        user_data: updatedUserData,
        progression: [], // Empty progression as we can't calculate without Python API
        summary: {
          total_weight_loss: userData.current_weight - userData.goal_weight,
          body_fat_reduction: userData.current_bf - userData.goal_bf,
          muscle_gain: 0,
          timeline_weeks: Math.ceil((new Date(userData.end_date).getTime() - new Date(userData.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000))
        },
        confidence_score: 0,
        ai_analysis: 'Python API unavailable for detailed calculations'
      }
      
      return NextResponse.json(fallbackResult, { headers: corsHeaders })
    }
  } catch (error) {
    console.error('Recalculation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to recalculate progression',
      },
      { status: 500, headers: corsHeaders }
    )
  }
}