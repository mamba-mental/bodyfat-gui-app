import { NextRequest, NextResponse } from 'next/server';
import { 
  exportUserData,
  importUserData 
} from '@/lib/redis';

// GET - Export all user data
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const data = await exportUserData(userId);
    
    if (!data) {
      return NextResponse.json(
        { error: 'Failed to export data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

// POST - Import user data
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const data = await request.json();
    
    const success = await importUserData(userId, data);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to import data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    );
  }
}