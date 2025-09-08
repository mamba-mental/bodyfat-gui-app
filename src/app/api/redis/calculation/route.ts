import { NextRequest, NextResponse } from 'next/server';
import { 
  saveLastCalculation, 
  getLastCalculation 
} from '@/lib/redis';

// GET - Retrieve last calculation
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const calculation = await getLastCalculation(userId);
    
    if (!calculation) {
      return NextResponse.json({ error: 'No calculation found' }, { status: 404 });
    }
    
    return NextResponse.json(calculation);
  } catch (error) {
    console.error('Error fetching calculation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calculation' },
      { status: 500 }
    );
  }
}

// POST - Save last calculation
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const calculation = await request.json();
    
    const success = await saveLastCalculation(userId, calculation);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save calculation' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving calculation:', error);
    return NextResponse.json(
      { error: 'Failed to save calculation' },
      { status: 500 }
    );
  }
}