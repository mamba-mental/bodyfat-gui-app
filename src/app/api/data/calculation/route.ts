import { NextRequest, NextResponse } from 'next/server';
import { dbGetLastCalculation, dbSaveCalculation } from '@/lib/server-storage';
import { fetchWithTimeout } from '@/lib/server/fetch-with-timeout';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const FALLBACK_RESPONSE = {
  progression: [],
  summary: {
    total_weight_loss: 0,
    body_fat_reduction: 0,
    muscle_gain: 0,
    timeline_weeks: 0,
  },
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL;

  if (pythonApiUrl) {
    try {
      const response = await fetchWithTimeout(
        `${pythonApiUrl}/api/data/calculation`,
        {
          cache: 'no-store',
        },
        8000,
      );

      if (response.ok) {
        const calculation = await response.json();
        // Persist the latest calculation for offline fallback
        try {
          await dbSaveCalculation(calculation, 1);
        } catch (error) {
          console.warn('Failed to persist calculation locally:', error);
        }
        return NextResponse.json(calculation, { headers: corsHeaders });
      }

      console.warn(
        'Python API responded with non-OK status:',
        response.status,
        response.statusText
      );
    } catch (error) {
      console.warn('Unable to reach Python API, using cached calculation if available.', error);
    }
  }

  // Fallback to the last stored calculation, if any
  try {
    const cached = await dbGetLastCalculation(1);
    if (cached) {
      return NextResponse.json(
        { ...cached, fallback: true },
        { headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Failed to read cached calculation:', error);
  }

  return NextResponse.json(
    { ...FALLBACK_RESPONSE, fallback: true, error: 'Calculation data unavailable' },
    { headers: corsHeaders, status: 200 }
  );
}

export async function POST(request: NextRequest) {
  const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL;

  let calculation;
  try {
    calculation = await request.json();
  } catch (error) {
    console.error('Invalid calculation payload:', error);
    return NextResponse.json(
      { error: 'Invalid calculation payload' },
      { status: 400, headers: corsHeaders }
    );
  }

  let upstreamResponse: any = null;
  let upstreamError: Error | null = null;

  if (pythonApiUrl) {
    try {
      const response = await fetchWithTimeout(
        `${pythonApiUrl}/api/data/calculation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(calculation),
        },
        8000,
      );

      if (response.ok) {
        upstreamResponse = await response.json();
      } else {
        upstreamError = new Error(`Python API returned ${response.status}`);
      }
    } catch (error) {
      upstreamError = error as Error;
    }
  } else {
    upstreamError = new Error('Python API URL not configured');
  }

  const persisted = upstreamResponse ?? calculation;

  try {
    await dbSaveCalculation(persisted, 1);
  } catch (error) {
    console.warn('Failed to persist calculation locally:', error);
  }

  if (upstreamError) {
    console.warn('Serving calculation from local storage due to upstream error:', upstreamError);
    return NextResponse.json(
      { ...persisted, fallback: true, warning: upstreamError.message },
      { headers: corsHeaders, status: 200 }
    );
  }

  return NextResponse.json(persisted, { headers: corsHeaders });
}
