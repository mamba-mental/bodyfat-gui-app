/**
 * POST /api/reports/verify
 *
 * Verifies report calculations and visual presentation match terminal reference
 *
 * T016: Implement Report Verification Endpoint
 * OpenAPI Contract: contracts/report-verification.openapi.yaml
 * Constitutional Requirement: Article V - Report System Integrity
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyReport } from '@/lib/report-verification';
import { dbGetReportById } from '@/lib/server-storage';

// Type definitions matching OpenAPI schema
interface VerificationRequest {
  report_id: string;
  terminal_reference_path: string;
  verification_options?: {
    tolerance?: number;
    visual_strict_mode?: boolean;
  };
  generated_report_data?: any;
  generated_html?: string;
  reference_html?: string;
}

interface VerificationResponse {
  calculation_match: boolean;
  visual_match: boolean;
  discrepancies: Discrepancy[];
  terminal_match_verified: boolean;
  calculation_details?: CalculationDetails;
  visual_details?: VisualDetails;
}

interface Discrepancy {
  field: string;
  expected: number | string;
  actual: number | string;
  delta?: number;
  discrepancy_type?: 'calculation' | 'visual' | 'formatting';
}

interface CalculationDetails {
  prime_version: string;
  calculation_count: number;
  matched_calculations: number;
}

interface VisualDetails {
  layout_match: boolean;
  formatting_match: boolean;
  style_match: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerificationRequest = await request.json();

    // Validate required fields
    if (!body.report_id || !body.terminal_reference_path) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Missing required fields: report_id and terminal_reference_path are required',
        },
        { status: 400 }
      );
    }

    // Fetch report data if not provided
    let generatedReportData = body.generated_report_data;

    if (!generatedReportData) {
      // Try to fetch from database using report_id
      try {
        const report = await dbGetReportById(body.report_id);
        if (!report) {
          return NextResponse.json(
            {
              error: 'NotFound',
              message: `Report with id '${body.report_id}' not found`
            },
            { status: 404 }
          );
        }
        // Use calculation_result as the report data
        generatedReportData = report.calculation_result;
      } catch (fetchError) {
        console.error('Failed to fetch report:', fetchError);
        return NextResponse.json(
          {
            error: 'InternalServerError',
            message: 'Failed to fetch report from database',
            details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

    // T017: Use actual verification logic
    const verificationResult = await verifyReport(
      body.report_id,
      body.terminal_reference_path,
      generatedReportData,
      {
        tolerance: body.verification_options?.tolerance,
        visual_strict_mode: body.verification_options?.visual_strict_mode,
        generatedHtml: body.generated_html,
        referenceHtml: body.reference_html,
      }
    );

    const response: VerificationResponse = {
      calculation_match: verificationResult.calculation_match,
      visual_match: verificationResult.visual_match,
      discrepancies: verificationResult.discrepancies,
      terminal_match_verified: verificationResult.terminal_match_verified,
      calculation_details: verificationResult.calculation_details,
      visual_details: verificationResult.visual_details,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Report verification error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Report verification failed due to internal error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
