import { NextRequest, NextResponse } from 'next/server'
import { UserData, CalculationResult } from '@/types'
import { fetchWithTimeout } from '@/lib/server/fetch-with-timeout'

// Hardcoded to avoid environment variable caching issues - Python API runs on port 8001
const PYTHON_API_URL = 'http://127.0.0.1:8001';
const PYTHON_TIMEOUT_MS = 60000

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
      current_bf: newEntry.body_fat_percentage || userData.current_bf,
      eating_pattern: userData.eating_pattern || 'standard',
      eating_window_hours: userData.eating_window_hours ?? (userData.eating_pattern === 'intermittent_fasting' ? 8 : userData.eating_pattern === 'omad' ? 1 : 12),
    }
 
    // Call the Python API to recalculate
    try {

      const response = await fetchWithTimeout(
        `${PYTHON_API_URL}/recalculate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_data: updatedUserData,
            entry: newEntry
          }),

        },
        PYTHON_TIMEOUT_MS,
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Python API returned status ${response.status}`)
      }

      const result: CalculationResult = await response.json()

      return NextResponse.json(result, { headers: corsHeaders })
    } catch (pythonApiError) {
      throw pythonApiError
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
