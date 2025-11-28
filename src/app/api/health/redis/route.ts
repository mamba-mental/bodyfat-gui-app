import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
  try {
    const ping = await redis.ping();
    return NextResponse.json({ ok: true, ping });
  } catch (error) {
    console.error('Redis health check failed:', error);
    return NextResponse.json({ ok: false, error: 'Redis unavailable' }, { status: 503 });
  }
}
