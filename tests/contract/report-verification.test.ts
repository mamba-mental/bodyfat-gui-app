/**
 * T003 [P]: Contract Test - Report Verification API
 *
 * Tests the shape and behavior of the report verification endpoint
 * Focuses on request/response contract validation
 *
 * Expected Outcome: Test FAILS (endpoint not implemented) - TDD RED phase
 */

import { describe, it, expect } from 'vitest';

// TypeScript interfaces for request and response
interface VerificationRequest {
  report_id: string;
  terminal_reference_path: string;
}

interface Discrepancy {
  field: string;
  expected: number | string;
  actual: number | string;
  delta?: number;
  discrepancy_type?: 'calculation' | 'visual' | 'formatting';
}

interface VerificationResponse {
  calculation_match: boolean;
  visual_match: boolean;
  terminal_match_verified: boolean;
  discrepancies: Discrepancy[];
}

describe('POST /api/reports/verify - Contract Test', () => {
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
  const MOCK_TERMINAL_REFERENCE_PATH = 'Z:/2025/reports/sample_reference.pdf';
  const MOCK_REPORT_ID = '550e8400-e29b-41d4-a716-446655440000';

  it('validates request/response contract shape', async () => {
    const requestBody: VerificationRequest = {
      report_id: MOCK_REPORT_ID,
      terminal_reference_path: MOCK_TERMINAL_REFERENCE_PATH
    };

    const response = await fetch(`${BASE_URL}/api/reports/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    // Verify HTTP status
    expect(response.status).toBe(200);

    // Parse response
    const data: VerificationResponse = await response.json();

    // Validate required fields
    expect(data).toHaveProperty('calculation_match');
    expect(data).toHaveProperty('visual_match');
    expect(data).toHaveProperty('terminal_match_verified');
    expect(data).toHaveProperty('discrepancies');

    // Validate field types
    expect(typeof data.calculation_match).toBe('boolean');
    expect(typeof data.visual_match).toBe('boolean');
    expect(typeof data.terminal_match_verified).toBe('boolean');
    expect(Array.isArray(data.discrepancies)).toBe(true);
  });

  it('ensures discrepancies are only non-empty when match is false', async () => {
    const requestBody: VerificationRequest = {
      report_id: MOCK_REPORT_ID,
      terminal_reference_path: MOCK_TERMINAL_REFERENCE_PATH
    };

    const response = await fetch(`${BASE_URL}/api/reports/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data: VerificationResponse = await response.json();

    // If matches are true, discrepancies should be an empty array
    if (data.calculation_match && data.visual_match && data.terminal_match_verified) {
      expect(data.discrepancies).toEqual([]);
    }
  });

  it('rejects request with missing required fields', async () => {
    const invalidRequest = {
      // Intentionally missing required fields
    };

    const response = await fetch(`${BASE_URL}/api/reports/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidRequest)
    });

    // Expect a 400 Bad Request for invalid input
    expect(response.status).toBe(400);
  });
});