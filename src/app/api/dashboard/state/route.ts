/**
 * GET /api/dashboard/state
 *
 * Verifies dashboard production state (no debugging messages)
 *
 * T020: Implement Dashboard State Endpoint
 * OpenAPI Contract: contracts/dashboard-state.openapi.yaml
 * Constitutional Requirement: Article III - Frontend Stability
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Type definitions matching OpenAPI schema
interface DashboardStateResponse {
  mode: 'production' | 'debug';
  debugging_messages_present: boolean;
  dashboard_enabled: boolean;
  last_verified?: string;
  features: FeatureState;
  debug_details?: DebugDetails;
}

interface FeatureState {
  all_enabled: boolean;
  disabled_features: string[];
}

interface DebugDetails {
  message_location: string;
  message_text: string;
  dashboard_commented_out: boolean;
  dashboard_location: string;
}

export async function GET(request: NextRequest) {
  try {
    // Read src/app/page.tsx to check for debugging messages
    const pageFilePath = path.join(process.cwd(), 'src/app/page.tsx');
    const pageSource = fs.readFileSync(pageFilePath, 'utf-8');

    // Check for debugging message
    const debugMessageRegex = /temporarily disabled for debugging/i;
    const hasDebugMessage = debugMessageRegex.test(pageSource);

    // Check if Dashboard is commented out
    const commentedDashboardRegex = /\/\/.*<Dashboard/;
    const isDashboardCommented = commentedDashboardRegex.test(pageSource);

    // Check if Dashboard import is commented out
    const commentedImportRegex = /\/\/\s*import.*Dashboard/;
    const isImportCommented = commentedImportRegex.test(pageSource);

    // Determine mode
    const isDebugMode = hasDebugMessage || isDashboardCommented || isImportCommented;
    const mode: 'production' | 'debug' = isDebugMode ? 'debug' : 'production';

    const response: DashboardStateResponse = {
      mode,
      debugging_messages_present: hasDebugMessage,
      dashboard_enabled: !isDashboardCommented && !isImportCommented,
      last_verified: mode === 'production' ? new Date().toISOString() : undefined,
      features: {
        all_enabled: mode === 'production',
        disabled_features: mode === 'debug' ? ['Dashboard'] : [],
      },
    };

    // Add debug details if in debug mode
    if (mode === 'debug') {
      response.debug_details = {
        message_location: 'src/app/page.tsx:8',
        message_text: 'temporarily disabled for debugging',
        dashboard_commented_out: isDashboardCommented,
        dashboard_location: 'src/app/page.tsx:11',
      };
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Dashboard state check error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Error checking dashboard state',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
