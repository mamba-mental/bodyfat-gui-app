import { NextRequest, NextResponse } from 'next/server';
import { saveReport, deleteReport, getUserReports } from '@/lib/redis';
import { fetchWithTimeout } from '@/lib/server/fetch-with-timeout';
import { Report } from '@/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// STANDARDIZED PORTS: Frontend 3713 | Backend/Python API 8313
const PYTHON_API_URL = (process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://127.0.0.1:8313').replace('localhost', '127.0.0.1');
const PYTHON_TIMEOUT_MS = 8000;
const USER_ID = 1;

function isReportArray(data: unknown): data is Report[] {
  return Array.isArray(data);
}

function isReport(data: unknown): data is Report {
  return !!data && typeof data === 'object' && typeof (data as Report).id === 'string';
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  let reports: Report[] | null = null;
  let pythonError: string | null = null;

  try {
    const response = await fetchWithTimeout(
      `${PYTHON_API_URL}/api/data/reports`,
      {
        cache: 'no-store',
      },
      PYTHON_TIMEOUT_MS,
    );
    if (response.ok) {
      const data = await response.json();
      if (isReportArray(data)) {
        reports = data;
      } else {
        pythonError = 'Python API returned an unexpected reports payload';
      }
    } else {
      pythonError = `Python API returned ${response.status}`;
    }
  } catch (error) {
    pythonError = error instanceof Error ? error.message : 'Failed to reach Python API';
  }

  if (!reports) {
    reports = (await getUserReports(String(USER_ID))).filter((r) => r !== null) as Report[];
  } else {
    // Persist the remote reports so they are available offline later
    for (const report of reports) {
      try {
        await saveReport(String(USER_ID), report);
      } catch (error) {
        console.warn('Failed to persist Python report locally:', error);
      }
    }
  }

  const headers: Record<string, string> = { ...corsHeaders };
  if (pythonError) {
    headers['x-python-warning'] = pythonError;
    console.warn('Python API reports warning:', pythonError);
  }

  return NextResponse.json(reports ?? [], { headers });
}

export async function POST(request: NextRequest) {
  try {
    const report = await request.json();
    let payload: Report | null = null;
    let pythonError: string | null = null;

    if (PYTHON_API_URL) {
      try {
        const response = await fetchWithTimeout(
          `${PYTHON_API_URL}/api/data/report`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(report),
          },
          PYTHON_TIMEOUT_MS,
        );

        if (response.ok) {
          const maybe = await response.json();
          if (isReport(maybe)) {
            payload = maybe;
          } else {
            pythonError = 'Python API returned unexpected report payload';
            console.warn(pythonError);
          }
        } else {
          pythonError = `Python API returned ${response.status}`;
          console.warn('Error saving report in Python API:', pythonError);
        }
      } catch (error) {
        pythonError =
          error instanceof Error ? error.message : 'Failed to reach Python API';
        console.warn('Python API reports warning:', pythonError);
      }
    }

    const base = payload ?? report;
    if (!isReport(base)) {
      // Minimal validation: require an id field
      console.error('Invalid report payload');
      return NextResponse.json(
        { error: 'Invalid report payload' },
        { status: 400, headers: corsHeaders },
      );
    }

    await saveReport(String(USER_ID), base);

    const headers: Record<string, string> = { ...corsHeaders };
    if (pythonError) {
      headers['x-python-warning'] = pythonError;
    }

    return NextResponse.json(base, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save report';
    console.error('Error saving report:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    await deleteReport(String(USER_ID), id);

    let pythonError: string | null = null;
    try {
      const response = await fetchWithTimeout(
        `${PYTHON_API_URL}/api/data/reports/${id}`,
        {
          method: 'DELETE',
        },
        PYTHON_TIMEOUT_MS,
      );
      if (!response.ok) {
        pythonError = `Python API returned ${response.status}`;
      }
    } catch (error) {
      pythonError = error instanceof Error ? error.message : 'Failed to delete report in Python API';
    }

    const headers: Record<string, string> = { ...corsHeaders };
    if (pythonError) {
      headers['x-python-warning'] = pythonError;
      console.warn('Python API report delete warning:', pythonError);
    }

    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500, headers: corsHeaders }
    );
  }
}
