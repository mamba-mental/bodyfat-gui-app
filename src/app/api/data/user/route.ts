import { NextRequest, NextResponse } from 'next/server';
import { dbGetUser, dbSaveUser } from '@/lib/server-storage';

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
    const userData = await dbGetUser(userId);
    return NextResponse.json(userData, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(null, { headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();
    const userId = 1;
    await dbSaveUser(userData, userId);
    return NextResponse.json(userData, { headers: corsHeaders });
  } catch (error) {
    console.error('Error saving user data:', error);
    return NextResponse.json(
      { error: 'Failed to save user data' },
      { status: 500, headers: corsHeaders }
    );
  }
}