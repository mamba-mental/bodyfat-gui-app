import { NextRequest, NextResponse } from 'next/server';
import { 
  saveReport, 
  getUserReports 
} from '@/lib/redis';

// GET - Retrieve all user reports
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const reports = await getUserReports(userId);
    
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

// POST - Save a new report
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const report = await request.json();
    
    // Generate ID if not provided
    if (!report.id) {
      report.id = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Set generated_at if not provided
    if (!report.generated_at) {
      report.generated_at = new Date().toISOString();
    }
    
    const success = await saveReport(userId, report);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save report' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Error saving report:', error);
    return NextResponse.json(
      { error: 'Failed to save report' },
      { status: 500 }
    );
  }
}