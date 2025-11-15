import { NextRequest, NextResponse } from 'next/server';
import { dbSaveEntry, dbDeleteEntry, dbGetEntries } from '@/lib/server-storage';
import { fetchWithTimeout } from '@/lib/server/fetch-with-timeout';
import type { BodyFatEntry } from '@/types';
import { normaliseEntry, reconcileEntries } from '@/lib/data-reconciliation';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://127.0.0.1:8000';
const PYTHON_TIMEOUT_MS = 8000;
const USER_ID = 1;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  let pythonError: string | null = null;
  let remoteEntries: BodyFatEntry[] | null = null;

  try {
    const response = await fetchWithTimeout(
      `${PYTHON_API_URL}/api/data/entries`,
      {
        cache: 'no-store',
      },
      PYTHON_TIMEOUT_MS,
    );

    if (response.ok) {
      const rawEntries = await response.json();
      if (Array.isArray(rawEntries)) {
        remoteEntries = rawEntries
          .map(normaliseEntry)
          .filter((entry): entry is BodyFatEntry => entry !== null)
          .map((entry) => ({ ...entry, user_id: '1' }));
      }
    } else {
      pythonError = `Python API returned ${response.status}`;
    }
  } catch (error) {
    pythonError = error instanceof Error ? error.message : 'Failed to reach Python API';
  }

  const localEntries = await dbGetEntries(USER_ID);
  let entries = localEntries;

  if (remoteEntries && remoteEntries.length > 0) {
    const { merged, toPersist } = reconcileEntries(localEntries, remoteEntries);
    entries = merged;

    for (const entry of toPersist) {
      try {
        await dbSaveEntry(entry, USER_ID);
      } catch (error) {
        console.warn('Failed to persist entry locally:', error);
      }
    }
  }

  const headers = { ...corsHeaders };
  if (pythonError) {
    headers['x-python-warning'] = pythonError;
    console.warn('Python API entries warning:', pythonError);
  }

  return NextResponse.json(entries ?? [], { headers });
}

export async function POST(request: NextRequest) {
  try {
    const entry = await request.json();

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

    if (!response.ok) {
      const message = `Python API returned ${response.status}`;
      console.error('Error saving entry:', message);
      return NextResponse.json(
        { error: message },
        { status: 502, headers: corsHeaders }
      );
    }

    const savedEntry = await response.json();
    const normalised = normaliseEntry(savedEntry);
    const entryToPersist = normalised ? { ...normalised, user_id: '1' } : savedEntry;

    await dbSaveEntry(entryToPersist, USER_ID);

    return NextResponse.json(entryToPersist, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save entry';
    console.error('Error saving entry:', message);
    return NextResponse.json(
      { error: message },
      { status: 502, headers: corsHeaders }
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

    await dbDeleteEntry(id);
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500, headers: corsHeaders }
    );
  }
}
