import { NextRequest, NextResponse } from 'next/server';
import { dbGetLastCalculation, dbSaveCalculation } from '@/lib/server-storage';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const userId = 1;
    const calculation = await dbGetLastCalculation(userId);
    return NextResponse.json(calculation, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching calculation:', error);
    return NextResponse.json(null, { headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const calculation = await request.json();
    const userId = 1;
    await dbSaveCalculation(calculation, userId);
    return NextResponse.json(calculation, { headers: corsHeaders });
  } catch (error) {
    console.error('Error saving calculation:', error);
    return NextResponse.json(
      { error: 'Failed to save calculation' },
      { status: 500, headers: corsHeaders }
    );
  }
}