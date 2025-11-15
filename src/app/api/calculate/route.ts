import { NextRequest, NextResponse } from 'next/server'
import { UserData, CalculationResult } from '@/types'
import { fetchWithTimeout } from '@/lib/server/fetch-with-timeout'

const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://127.0.0.1:8001'
const PYTHON_TIMEOUT_MS = 12000

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
    const userData: UserData = await request.json()
    
    // Calculate timeline weeks from dates
    const startDate = new Date(userData.start_date || Date.now())
    const endDate = new Date(userData.end_date || Date.now() + 16 * 7 * 24 * 60 * 60 * 1000)
    const timelineWeeks = Math.round((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
    
    // Ensure all required fields are present for Python API
    const apiData = {
      ...userData,
      // Ensure dates are in the correct format (MM/DD/YY)
      start_date: userData.start_date || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
      end_date: userData.end_date || new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
      // Add timeline_weeks
      timeline_weeks: timelineWeeks || 16,
      // Ensure all numeric fields have defaults
      height_cm: userData.height_cm || (userData.height_feet * 30.48 + userData.height_inches * 2.54),
      volume_score: userData.volume_score || 7.0,
      intensity_score: userData.intensity_score || 7.0,
      frequency_score: userData.frequency_score || 7.0,
      protein_intake: userData.protein_intake || (userData.current_weight * 1.0),
      workout_days: userData.workout_days || 3,
      job_activity: userData.job_activity || 2,
      leisure_activity: userData.leisure_activity || 2,
      // Body measurements defaults
      waist: userData.waist || 40,
      hip: userData.hip || 44,
      neck: userData.neck || 17,
      // Ensure string fields have defaults
      experience_level: userData.experience_level || "Intermediate",
      workout_type: userData.workout_type || "General Fitness",
      diet_type: userData.diet_type || "balanced",
      exercise_type: userData.exercise_type || "resistance",
      sleep_quality: userData.sleep_quality || "good"
    }
    
    console.log('Sending to Python API:', JSON.stringify(apiData, null, 2))
    
    // Call the Python PRIME calculation engine
    try {
      const response = await fetchWithTimeout(
        `${PYTHON_API_URL}/calculate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
        },
        PYTHON_TIMEOUT_MS,
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Python API returned status ${response.status}`)
      }

      const result: CalculationResult = await response.json()
      
      return NextResponse.json({
        success: true,
        data: result,
      }, { headers: corsHeaders })
    } catch (pythonApiError) {
      throw pythonApiError
    }
  } catch (error) {
    console.error('Calculation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate progression',
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
