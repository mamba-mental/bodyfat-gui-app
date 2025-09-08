import { NextRequest, NextResponse } from 'next/server';
import { 
  saveEntry, 
  getUserEntries, 
  deleteEntry 
} from '@/lib/redis';

// GET - Retrieve all user entries
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const entries = await getUserEntries(userId);
    
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}

// POST - Save a new entry
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const entry = await request.json();
    
    // Generate ID if not provided
    if (!entry.id) {
      entry.id = `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    const success = await saveEntry(userId, entry);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save entry' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Error saving entry:', error);
    return NextResponse.json(
      { error: 'Failed to save entry' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an entry
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');
    
    if (!entryId) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      );
    }
    
    const success = await deleteEntry(userId, entryId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete entry' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    );
  }
}