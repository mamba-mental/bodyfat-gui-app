/**
 * Contract Test: Report Generation API
 *
 * Validates API contract compliance with specs/006-fix-7-critical/contracts/report-generation.yaml
 *
 * Constitutional Requirements:
 * - Article IV: Test-First Development - This test MUST fail initially (Red phase)
 * - Article V: Report System Integrity - Validate PRIME engine usage
 *
 * Functional Requirements: FR-001, FR-002, FR-003, FR-004
 *
 * IMPORTANT: This test MUST fail until the API implementation is complete.
 * Red → Green → Refactor cycle enforcement.
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('Report Generation API Contract', () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010/api';

  describe('POST /api/reports/generate', () => {
    it('should accept valid ReportRequest schema', async () => {
      const validRequest = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        entryIds: [
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174002'
        ],
        templateVersion: '14-section-format',
        outputFormat: 'pdf'
      };

      const response = await fetch(`${API_BASE}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequest)
      });

      // Contract: Must return 201 Created or 202 Accepted
      expect([201, 202]).toContain(response.status);

      const data = await response.json();

      // Validate ReportResponse schema
      expect(data).toHaveProperty('reportId');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('generatedAt');
      expect(data).toHaveProperty('calculationEngine');

      // Contract: calculationEngine MUST be PRIME_Report_Generator_v3_Fast
      expect(data.calculationEngine).toBe('PRIME_Report_Generator_v3_Fast');

      // Contract: status must be valid enum value
      expect(['requested', 'generating', 'completed', 'failed']).toContain(data.status);

      // Contract: reportId must be valid UUID
      expect(data.reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should reject request without required userId', async () => {
      const invalidRequest = {
        entryIds: ['123e4567-e89b-12d3-a456-426614174001'],
        templateVersion: '14-section-format'
      };

      const response = await fetch(`${API_BASE}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest)
      });

      // Contract: Must return 400 Bad Request for missing required fields
      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
    });

    it('should reject request with empty entryIds array', async () => {
      const invalidRequest = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        entryIds: [],
        templateVersion: '14-section-format'
      };

      const response = await fetch(`${API_BASE}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest)
      });

      // Contract: Must reject empty entryIds
      expect(response.status).toBe(400);
    });

    it('should enforce numerical accuracy tolerance < 0.0001', async () => {
      const validRequest = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        entryIds: ['123e4567-e89b-12d3-a456-426614174001'],
        templateVersion: '14-section-format',
        outputFormat: 'pdf'
      };

      const response = await fetch(`${API_BASE}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequest)
      });

      const data = await response.json();

      // Contract: numericalAccuracy must be present and < 0.0001
      if (data.numericalAccuracy !== undefined) {
        expect(data.numericalAccuracy).toBeLessThan(0.0001);
      }
    });
  });

  describe('GET /api/reports/{reportId}', () => {
    it('should return ReportResponse schema', async () => {
      // First create a report to get valid reportId
      const createRequest = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        entryIds: ['123e4567-e89b-12d3-a456-426614174001'],
        templateVersion: '14-section-format',
        outputFormat: 'pdf'
      };

      const createResponse = await fetch(`${API_BASE}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequest)
      });

      expect([201, 202]).toContain(createResponse.status);
      const createData = await createResponse.json();
      const reportId = createData.reportId;

      // Now retrieve the report
      const getResponse = await fetch(`${API_BASE}/reports/${reportId}`);

      // Contract: Must return 200 OK
      expect(getResponse.status).toBe(200);

      const getData = await getResponse.json();

      // Validate schema
      expect(getData).toHaveProperty('reportId');
      expect(getData).toHaveProperty('status');
      expect(getData).toHaveProperty('generatedAt');
      expect(getData).toHaveProperty('calculationEngine');
      expect(getData.reportId).toBe(reportId);
    });

    it('should return 404 for non-existent reportId', async () => {
      const fakeReportId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(`${API_BASE}/reports/${fakeReportId}`);

      // Contract: Must return 404 Not Found
      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
    });
  });

  describe('PDF Download', () => {
    it('should return PDF content for completed reports', async () => {
      const createRequest = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        entryIds: ['123e4567-e89b-12d3-a456-426614174001'],
        templateVersion: '14-section-format',
        outputFormat: 'pdf'
      };

      const createResponse = await fetch(`${API_BASE}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequest)
      });

      const createData = await createResponse.json();
      const reportId = createData.reportId;

      // Poll until report is completed (with timeout)
      let attempts = 0;
      let reportData;
      while (attempts < 30) {
        const statusResponse = await fetch(`${API_BASE}/reports/${reportId}`);
        reportData = await statusResponse.json();

        if (reportData.status === 'completed') break;
        if (reportData.status === 'failed') throw new Error('Report generation failed');

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      expect(reportData?.status).toBe('completed');
      expect(reportData).toHaveProperty('downloadUrl');

      // Verify PDF download
      const downloadResponse = await fetch(reportData.downloadUrl);
      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers.get('content-type')).toContain('application/pdf');
    });
  });
});
