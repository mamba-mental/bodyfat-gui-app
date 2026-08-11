import { NextResponse } from 'next/server'

import { getCloudSyncStatus } from '@/lib/cloud-sync'

export async function GET() {
  return NextResponse.json(getCloudSyncStatus())
}
