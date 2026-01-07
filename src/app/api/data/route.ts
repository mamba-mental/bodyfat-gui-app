import { NextRequest, NextResponse } from 'next/server';
import {
  getUserData,
  saveUserData,
  getUserEntries,
  saveEntry,
  deleteEntry,
  getUserReports,
  saveReport,
  deleteReport,
  getLastCalculation,
  saveLastCalculation,
  clearAllUserData,
} from '@/lib/redis';
import { UserData, BodyFatEntry, Report, CalculationResult } from '@/types';

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

// GET - Fetch all data
export async function GET(request: NextRequest) {
  try {
    const userId = 1; // For MVP, using single user. Add auth later.
    const userKey = String(userId);

    const userData = await getUserData(userKey);
    const entries = await getUserEntries(userKey);
    const reports = await getUserReports(userKey);
    const lastCalculation = await getLastCalculation(userKey);
    
    return NextResponse.json({
      userData,
      entries,
      reports,
      lastCalculation
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST - Save data
export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();
    const userId = 1; // For MVP
    const userKey = String(userId);

    switch (type) {
      case 'user':
        await saveUserData(userKey, data as UserData);
        break;

      case 'entry':
        await saveEntry(userKey, data as BodyFatEntry);
        break;

      case 'report':
        await saveReport(userKey, data as Report);
        break;

      case 'calculation':
        await saveLastCalculation(userKey, data as CalculationResult);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid data type' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE - Delete data
export async function DELETE(request: NextRequest) {
  try {
    const { type, id } = await request.json();
    
    switch (type) {
      case 'entry':
        await deleteEntry('1', id);
        break;

      case 'report':
        await deleteReport('1', id);
        break;

      case 'all':
        await clearAllUserData('1');
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid delete type' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete data' },
      { status: 500, headers: corsHeaders }
    );
  }
}