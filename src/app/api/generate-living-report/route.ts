import { NextRequest, NextResponse } from 'next/server'
import { fetchWithTimeout } from '@/lib/server/fetch-with-timeout'
import { pythonApiConfig } from '@/lib/config'

const PYTHON_API_URL = pythonApiConfig.url
const REPORT_GENERATION_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS(_request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    // Body shape: { user_data: UserData, actual_entries?: ActualEntry[] }
    // This is DIFFERENT from /generate-report which takes bare UserData.
    const body = await request.json()

    console.log('=== Generate Living Report Request ===')
    console.log('user_data keys:', body?.user_data ? Object.keys(body.user_data) : 'missing')
    console.log('actual_entries count:', body?.actual_entries?.length ?? 0)

    if (!body?.user_data) {
      return NextResponse.json(
        { success: false, error: 'Missing user_data in request body' },
        { status: 422, headers: corsHeaders }
      )
    }

    const response = await fetchWithTimeout(
      `${PYTHON_API_URL}/generate-living-report`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      REPORT_GENERATION_TIMEOUT_MS
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Python API living-report error:', response.status, errorText)
      let errorData: any = {}
      try { errorData = JSON.parse(errorText) } catch (_) {}
      throw new Error(
        errorData?.detail || errorData?.message ||
        `Python API returned status ${response.status}: ${errorText.substring(0, 200)}`
      )
    }

    const result = await response.json()
    console.log('Python API living-report success')
    return NextResponse.json(result, { headers: corsHeaders })
  } catch (error) {
    console.error('Living report generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate living report. Please ensure the Python API is running on port 8313.',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
