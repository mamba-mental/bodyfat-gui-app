import { NextRequest, NextResponse } from 'next/server';
import { saveUserData, getUserData } from '@/lib/redis';
import { fetchWithTimeout } from '@/lib/server/fetch-with-timeout';
import { UserData } from '@/types';
import { mergeUserProfiles } from '@/lib/data-reconciliation';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// STANDARDIZED PORTS: Frontend 3713 | Backend/Python API 8313
const PYTHON_API_URL = 'http://127.0.0.1:8313';
const PYTHON_TIMEOUT_MS = 8000;
const USER_ID = 1;

function isValidUserPayload(data: unknown): data is UserData {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.current_weight === 'number' &&
    typeof candidate.current_bf === 'number' &&
    typeof candidate.goal_weight === 'number' &&
    typeof candidate.goal_bf === 'number'
  );
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  let pythonError: string | null = null;
  let pythonUser: UserData | null = null;
  const localUser = await getUserData(String(USER_ID));

  // Try Python API first so we keep both stores in sync when available
  try {
    const response = await fetchWithTimeout(
      `${PYTHON_API_URL}/api/data/user`,
      {
        cache: 'no-store',
      },
      PYTHON_TIMEOUT_MS,
    );

    if (response.ok) {
      const data = await response.json();
      if (isValidUserPayload(data)) {
        pythonUser = data;
      } else {
        pythonError = 'Python API returned an unexpected payload';
      }
    } else {
      pythonError = `Python API returned ${response.status}`;
    }
  } catch (error) {
    pythonError = error instanceof Error ? error.message : 'Failed to reach Python API';
  }

  const mergedUser = mergeUserProfiles(localUser, pythonUser);

  if (mergedUser) {
    if (pythonUser) {
      try {
        await saveUserData(String(USER_ID), mergedUser);
      } catch (error) {
        console.warn('Failed to persist merged user locally:', error);
      }
    }


    const headers: Record<string, string> = { ...corsHeaders };
    if (pythonError) {
      headers['x-python-warning'] = pythonError;
    }
    return NextResponse.json(mergedUser, { headers });
  }

  const headers: Record<string, string> = { ...corsHeaders };
  if (pythonError) {
    headers['x-python-warning'] = pythonError;
  }
  // Return null so the client can treat this as "no profile yet" rather than an outright failure
  return NextResponse.json(localUser, { headers });
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();
    await saveUserData(String(USER_ID), userData as UserData);

    let pythonError: string | null = null;
    try {
      const response = await fetchWithTimeout(
        `${PYTHON_API_URL}/api/data/user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        },
        PYTHON_TIMEOUT_MS,
      );

      if (!response.ok) {
        pythonError = `Python API returned ${response.status}`;
      } else {
        // Some versions of the Python service echo { success: true }, which is not useful.
        // We ignore that payload so the client always receives the authoritative copy we just saved.
        await response.json().catch(() => null);
      }
    } catch (error) {
      pythonError = error instanceof Error ? error.message : 'Failed to forward to Python API';
    }

    const headers: Record<string, string> = { ...corsHeaders };
    if (pythonError) {
      headers['x-python-warning'] = pythonError;
      console.warn('Python API user sync warning:', pythonError);
    }

    return NextResponse.json(userData, { headers });
  } catch (error) {
    console.error('Error saving user data:', error);
    return NextResponse.json(
      { error: 'Failed to save user data' },
      { status: 502, headers: corsHeaders }
    );
  }
}
