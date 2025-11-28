/**
 * T008 [P]: Integration Test - Report Calculation + Visual Verification
 *
 * End-to-end test for Issue #1 - PRIME calculation + terminal visual match
 * Tests full report generation and verification flow
 *
 * Expected Outcome: Test FAILS (verification logic not implemented) - RED phase of TDD
 *
 * Test Flow:
 * 1. Generate report via Python API
 * 2. Verify PRIME calculations match terminal reference (numerical)
 * 3. Verify visual presentation matches terminal aesthetic
 * 4. Confirm zero discrepancies
 *
 * Quickstart Reference: quickstart.md Step 1
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('Report Calculation + Visual Verification Flow', () => {
  const PYTHON_API_URL = 'http://localhost:8000';
  const NEXT_API_URL = 'http://localhost:3000';
  const TERMINAL_REFERENCE_PATH = 'Z:/2024.0917 - Bf-estimator-v2/122924_bf-estimator-terminal/results/Master_Journey_Prime_Prime_20250916_164621.pdf';

  let generatedReportId: string;

  beforeAll(async () => {
    // Step 1: Generate test report via Python API
    const generateResponse = await fetch(`${PYTHON_API_URL}/api/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'test-user',
        measurements: {
          weight: 185.2,
          neck: 15.5,
          waist: 34.0,
          hip: 39.0,
          height: 70.0,
          age: 35,
          gender: 'M',
        },
      }),
    });

    const generateData = await generateResponse.json();
    generatedReportId = generateData.report_id;

    expect(generateData.status).toBe('processing');
    expect(generatedReportId).toBeTruthy();

    // Wait for report generation to complete (up to 5s)
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  it('should generate report with PRIME_Report_Generator_v3_Fast module', async () => {
    // Verify report exists and was generated with correct PRIME module
    const reportResponse = await fetch(`${PYTHON_API_URL}/api/reports/${generatedReportId}`);

    expect(reportResponse.status).toBe(200);

    const reportData = await reportResponse.json();
    expect(reportData.generator_version).toContain('PRIME_Report_Generator_v3_Fast');
  });

  it('should verify PRIME calculations match terminal reference numerically (within 0.0001 tolerance)', async () => {
    // Step 2: Verify calculation accuracy
    const verifyResponse = await fetch(`${NEXT_API_URL}/api/reports/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_id: generatedReportId,
        terminal_reference_path: TERMINAL_REFERENCE_PATH,
        verification_options: {
          tolerance: 0.0001,
        },
      }),
    });

    const verifyData = await verifyResponse.json();

    // FR-003, FR-027 criterion #1: 100% numerical accuracy
    expect(verifyData.calculation_match).toBe(true);
    expect(verifyData.calculation_details.prime_version).toContain('PRIME_Report_Generator_v3_Fast');
    expect(verifyData.calculation_details.matched_calculations).toBe(
      verifyData.calculation_details.calculation_count
    );
  });

  it('should verify visual presentation matches terminal aesthetic', async () => {
    // Step 3: Verify visual alignment
    const verifyResponse = await fetch(`${NEXT_API_URL}/api/reports/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_id: generatedReportId,
        terminal_reference_path: TERMINAL_REFERENCE_PATH,
      }),
    });

    const verifyData = await verifyResponse.json();

    // FR-003: Visual presentation alignment
    expect(verifyData.visual_match).toBe(true);
    expect(verifyData.visual_details.layout_match).toBe(true);
    expect(verifyData.visual_details.formatting_match).toBe(true);
    expect(verifyData.visual_details.style_match).toBe(true);
  });

  it('should have zero discrepancies and terminal_match_verified=true', async () => {
    // Step 4: Confirm overall verification
    const verifyResponse = await fetch(`${NEXT_API_URL}/api/reports/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_id: generatedReportId,
        terminal_reference_path: TERMINAL_REFERENCE_PATH,
      }),
    });

    const verifyData = await verifyResponse.json();

    // FR-027 criterion #1: Zero discrepancies
    expect(verifyData.discrepancies).toEqual([]);
    expect(verifyData.terminal_match_verified).toBe(true);
  });

  it('should use PRIME modules from new_prime_python_code/ directory (Constitution Article I)', async () => {
    // Verify no legacy report_generator.py usage
    const reportResponse = await fetch(`${PYTHON_API_URL}/api/reports/${generatedReportId}`);

    const reportData = await reportResponse.json();

    // Constitution Article I: MUST use new_prime_python_code/ modules
    expect(reportData.generator_version).not.toContain('report_generator.py');
    expect(reportData.generator_version).toContain('PRIME');
  });
});
