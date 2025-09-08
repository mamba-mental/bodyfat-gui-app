import { NextRequest, NextResponse } from 'next/server';
import { 
  dbGetUser, dbSaveUser, dbGetEntries, dbSaveEntry, dbDeleteEntry,
  dbGetReports, dbSaveReport, dbDeleteReport, dbGetLastCalculation,
  dbSaveCalculation, dbClearAllData
} from '@/lib/server-storage';
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
    
    const userData = await dbGetUser(userId);
    const entries = await dbGetEntries(userId);
    const reports = await dbGetReports(userId);
    const lastCalculation = await dbGetLastCalculation(userId);
    
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
    
    switch (type) {
      case 'user':
        await dbSaveUser(data as UserData, userId);
        break;
        
      case 'entry':
        await dbSaveEntry(data as BodyFatEntry, userId);
        break;
        
      case 'report':
        await dbSaveReport(data as Report, userId);
        break;
        
      case 'calculation':
        await dbSaveCalculation(data as CalculationResult, userId);
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
        await dbDeleteEntry(id);
        break;
        
      case 'report':
        await dbDeleteReport(id);
        break;
        
      case 'all':
        await dbClearAllData(1);
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