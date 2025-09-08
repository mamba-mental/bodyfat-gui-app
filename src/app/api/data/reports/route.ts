import { NextRequest, NextResponse } from 'next/server';
import { dbGetReports, dbSaveReport, dbDeleteReport } from '@/lib/server-storage';

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
    const userId = 1;
    const reports = await dbGetReports(userId);
    return NextResponse.json(reports, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json([], { headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const report = await request.json();
    const userId = 1;
    await dbSaveReport(report, userId);
    return NextResponse.json(report, { headers: corsHeaders });
  } catch (error) {
    console.error('Error saving report:', error);
    return NextResponse.json(
      { error: 'Failed to save report' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    await dbDeleteReport(id);
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500, headers: corsHeaders }
    );
  }
}