import { NextRequest, NextResponse } from 'next/server';
import { 
  saveUserData, 
  getUserData, 
  clearUserData,
  exportUserData,
  importUserData 
} from '@/lib/redis';

// GET - Retrieve user data
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const userData = await getUserData(userId);
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}

// POST - Save user data
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const userData = await request.json();
    
    const success = await saveUserData(userId, userData);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save user data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving user data:', error);
    return NextResponse.json(
      { error: 'Failed to save user data' },
      { status: 500 }
    );
  }
}

// DELETE - Clear user data
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const success = await clearUserData(userId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to clear user data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing user data:', error);
    return NextResponse.json(
      { error: 'Failed to clear user data' },
      { status: 500 }
    );
  }
}