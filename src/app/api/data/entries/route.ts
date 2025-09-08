import { NextRequest, NextResponse } from 'next/server';
import { dbGetEntries, dbSaveEntry, dbDeleteEntry } from '@/lib/server-storage';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    // Proxy to Python API
    const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://127.0.0.1:8001';
    const response = await fetch(`${pythonApiUrl}/api/data/entries`);
    
    if (!response.ok) {
      throw new Error(`Python API returned ${response.status}`);
    }
    
    const entries = await response.json();
    return NextResponse.json(entries, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching entries from Python API:', error);
    // Fallback to local storage if Python API fails
    try {
      const userId = 1;
      const entries = await dbGetEntries(userId);
      return NextResponse.json(entries, { headers: corsHeaders });
    } catch (fallbackError) {
      console.error('Error fetching from local storage:', fallbackError);
      return NextResponse.json([], { headers: corsHeaders });
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const entry = await request.json();
    
    // Try to save to Python API first
    try {
      const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://127.0.0.1:8001';
      const response = await fetch(`${pythonApiUrl}/api/data/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
      
      if (!response.ok) {
        throw new Error(`Python API returned ${response.status}`);
      }
      
      const savedEntry = await response.json();
      
      // Also save to local storage for backup
      const userId = 1;
      await dbSaveEntry(entry, userId);
      
      return NextResponse.json(savedEntry, { headers: corsHeaders });
    } catch (apiError) {
      console.error('Error saving to Python API:', apiError);
      // Fallback to local storage only
      const userId = 1;
      await dbSaveEntry(entry, userId);
      return NextResponse.json(entry, { headers: corsHeaders });
    }
  } catch (error) {
    console.error('Error saving entry:', error);
    return NextResponse.json(
      { error: 'Failed to save entry' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
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