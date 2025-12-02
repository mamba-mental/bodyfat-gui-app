import { NextRequest, NextResponse } from 'next/server'
import { UserData } from '@/types'
import { fetchWithTimeout } from '@/lib/server/fetch-with-timeout'

// Hardcoded to avoid environment variable caching issues - Python API runs on port 8001
const PYTHON_API_URL = 'http://127.0.0.1:8001';
const REPORT_GENERATION_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes to match PRIME workload expectations

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

    // Log incoming request data
    console.log('=== Generate Report Request ===')
    console.log('Raw user data:', JSON.stringify(userData, null, 2))

    // Calculate timeline weeks from dates
    const startDate = new Date(userData.start_date || Date.now())
    const endDate = new Date(userData.end_date || Date.now() + 16 * 7 * 24 * 60 * 60 * 1000)
    const timelineWeeks = Math.round((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))

    // Calculate age and dob defaults (required by Python API)
    const defaultAge = userData.age || 30
    const defaultDob = userData.dob || (() => {
      const today = new Date()
      const birthYear = today.getFullYear() - defaultAge
      return `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${birthYear.toString().slice(-2)}`
    })()

    // Ensure all required fields are present for Python API
    const apiData = {
      ...userData,
      // Age and DOB (required by Python API)
      age: defaultAge,
      dob: defaultDob,
      // Ensure dates are in the correct format (MM/DD/YY)
      start_date: userData.start_date || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
      end_date: userData.end_date || new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
      // Add timeline_weeks
      timeline_weeks: timelineWeeks || 16,
      // Ensure all numeric fields have defaults
      height_cm: userData.height_cm || ((userData.height_feet || 5) * 30.48 + (userData.height_inches || 10) * 2.54),
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
      sleep_quality: userData.sleep_quality || "good",
      // Additional required fields for Python API
      activity_level: userData.activity_level || 3,  // 1-5 scale (1=sedentary, 5=very active)
      resistance_training: userData.resistance_training ?? true,
      is_athlete: userData.is_athlete ?? false,
      is_bodybuilder: userData.is_bodybuilder ?? false,
      ped_use: userData.ped_use ?? false
    }

    console.log('Processed API data:', JSON.stringify(apiData, null, 2))
    console.log('Python API URL:', PYTHON_API_URL)

    // First check if Python API is accessible - skip health check and go directly to report
    // The health check endpoint doesn't exist in the Python API
    let pythonApiAvailable = true

    // Call the Python API to generate the report
    try {
      console.log('Calling Python API at:', `${PYTHON_API_URL}/generate-report`)
      console.log('Request body:', JSON.stringify(apiData, null, 2))

      const response = await fetchWithTimeout(
        `${PYTHON_API_URL}/generate-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
        },
        REPORT_GENERATION_TIMEOUT_MS,
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Python API error response:', {
          status: response.status,
          statusText: response.statusText,
          responseBody: errorText
        })

        let errorData = {}
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          console.error('Failed to parse error response as JSON:', errorText)
        }

        throw new Error((errorData as any)?.detail || (errorData as any)?.message || `Python API returned status ${response.status}: ${errorText.substring(0, 200)}`)
      }

      const result = await response.json()
      console.log('Python API success response:', result)

      return NextResponse.json(result, { headers: corsHeaders })
    } catch (pythonApiError) {
      console.error('Python API report generation failed:', pythonApiError)
      console.error('Error details:', {
        name: pythonApiError instanceof Error ? pythonApiError.name : 'Unknown',
        message: pythonApiError instanceof Error ? pythonApiError.message : String(pythonApiError),
        stack: pythonApiError instanceof Error ? pythonApiError.stack : 'No stack trace'
      })

      throw pythonApiError
    }
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate report. Please ensure the Python API is running on port 8001.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

function getActivityLevelText(level: number): string {
  const levels = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extremely Active']
  return levels[level] || 'Unknown'
}

function calculateProgress(current: number, goal: number, start: number): number {
  if (start === goal) return 100
  const progress = ((start - current) / (start - goal)) * 100
  return Math.max(0, Math.min(100, progress))
}
