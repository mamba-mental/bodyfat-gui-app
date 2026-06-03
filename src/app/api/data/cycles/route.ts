import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/server/fetch-with-timeout';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// STANDARDIZED PORTS: Frontend 3010 | Backend/Python API 8313
const PYTHON_API_URL = 'http://127.0.0.1:8313';
const PYTHON_TIMEOUT_MS = 8000;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Thin proxy to the Python canonical store (no Redis layer).
 * Cycles are a new entity with no legacy split-store data to reconcile,
 * so this route is the target-state pattern: frontend -> Next -> Python.
 */
export async function GET() {
  try {
    const response = await fetchWithTimeout(
      `${PYTHON_API_URL}/api/data/cycles`,
      { cache: 'no-store' },
      PYTHON_TIMEOUT_MS,
    );

    if (!response.ok) {
      const headers: Record<string, string> = { ...corsHeaders };
      headers['x-python-warning'] = `Python API returned ${response.status}`;
      console.warn('Python API cycles warning:', headers['x-python-warning']);
      return NextResponse.json([], { headers });
    }

    const cycles = await response.json();
    return NextResponse.json(Array.isArray(cycles) ? cycles : [], {
      headers: corsHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to reach Python API';
    console.warn('Python API cycles warning:', message);
    // Fail soft: the cycle selector degrades to "All Cycles" when the list is empty.
    return NextResponse.json([], {
      headers: { ...corsHeaders, 'x-python-warning': message },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cycle = await request.json();

    const response = await fetchWithTimeout(
      `${PYTHON_API_URL}/api/data/cycles`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cycle),
      },
      PYTHON_TIMEOUT_MS,
    );

    if (!response.ok) {
      const message = `Python API returned ${response.status}`;
      console.error('Error saving cycle in Python API:', message);
      return NextResponse.json(
        { error: message },
        { status: 502, headers: corsHeaders },
      );
    }

    const saved = await response.json();
    return NextResponse.json(saved, { headers: corsHeaders });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save cycle';
    console.error('Error saving cycle:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders },
    );
  }
}
