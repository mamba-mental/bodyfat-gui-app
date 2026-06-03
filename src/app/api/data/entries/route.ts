import { NextRequest, NextResponse } from 'next/server';
import { saveEntry, deleteEntry } from '@/lib/redis';
import { fetchWithTimeout } from '@/lib/server/fetch-with-timeout';
import type { BodyFatEntry } from '@/types';
import { normaliseEntry } from '@/lib/data-reconciliation';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// STANDARDIZED PORTS: Frontend 3713 | Backend/Python API 8313
const PYTHON_API_URL = 'http://127.0.0.1:8313';
const PYTHON_TIMEOUT_MS = 8000;
const USER_ID = 1;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET is a thin proxy to the Python canonical store (ReComp Cycle plan, P2).
// Reading Redis-first and reconciling with "local wins" silently dropped
// `cycle_id` (and any field normaliseEntry didn't whitelist) and let stale
// Redis copies overwrite Python's correct rows. Python is the single source of
// truth, so we return its rows verbatim — every field, including cycle_id,
// survives. The 3 Redis-only weigh-ins were already merged into SQLite (P0),
// so dropping the Redis merge on read loses nothing.
export async function GET() {
  try {
    const response = await fetchWithTimeout(
      `${PYTHON_API_URL}/api/data/entries`,
      { cache: 'no-store' },
      PYTHON_TIMEOUT_MS,
    );

    if (!response.ok) {
      const headers: Record<string, string> = { ...corsHeaders };
      headers['x-python-warning'] = `Python API returned ${response.status}`;
      console.warn('Python API entries warning:', headers['x-python-warning']);
      return NextResponse.json([], { headers });
    }

    const rawEntries = await response.json();
    return NextResponse.json(Array.isArray(rawEntries) ? rawEntries : [], {
      headers: corsHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to reach Python API';
    console.warn('Python API entries warning:', message);
    return NextResponse.json([], {
      headers: { ...corsHeaders, 'x-python-warning': message },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const entry = await request.json();
    let savedFromPython: BodyFatEntry | null = null;
    let pythonError: string | null = null;

    if (PYTHON_API_URL) {
      try {
        const response = await fetchWithTimeout(
          `${PYTHON_API_URL}/api/data/entries`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(entry),
          },
          PYTHON_TIMEOUT_MS,
        );

        if (response.ok) {
          savedFromPython = await response.json();
        } else {
          pythonError = `Python API returned ${response.status}`;
          console.warn('Error saving entry in Python API:', pythonError);
        }
      } catch (error) {
        pythonError =
          error instanceof Error ? error.message : 'Failed to reach Python API';
        console.warn('Python API entries warning:', pythonError);
      }
    }

    const base = savedFromPython ?? entry;
    const normalised = normaliseEntry(base);
    const entryToPersist = normalised ? { ...normalised, user_id: '1' } : base;

    await saveEntry(String(USER_ID), entryToPersist);

    const headers: Record<string, string> = { ...corsHeaders };
    if (pythonError) {
      headers['x-python-warning'] = pythonError;
    }

    return NextResponse.json(entryToPersist, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save entry';
    console.error('Error saving entry:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    try {
      await fetchWithTimeout(
        `${PYTHON_API_URL}/api/data/entries/${id}`,
        {
          method: 'DELETE',
        },
        PYTHON_TIMEOUT_MS,
      );
    } catch (error) {
      console.warn('Failed to delete entry in Python API:', error);
    }

    await deleteEntry(String(USER_ID), id);
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500, headers: corsHeaders }
    );
  }
}
