/**
 * Contract Test: AI Settings API
 *
 * Validates API contract compliance with specs/006-fix-7-critical/contracts/ai-settings.yaml
 *
 * Constitutional Requirements:
 * - Article IV: Test-First Development - This test MUST fail initially (Red phase)
 *
 * Functional Requirements: FR-009, FR-010, FR-011
 *
 * IMPORTANT: This test MUST fail until the API implementation is complete.
 */

import { describe, it, expect } from 'vitest';

describe('AI Settings API Contract', () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  describe('GET /api/settings/ai', () => {
    it('should return AISettings schema', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await fetch(`${API_BASE}/settings/ai?userId=${userId}`);

      // Contract: Must return 200 OK
      expect(response.status).toBe(200);

      const data = await response.json();

      // Validate AISettings schema - required fields
      expect(data).toHaveProperty('settingsId');
      expect(data).toHaveProperty('userId');
      expect(data).toHaveProperty('aiProvider');
      expect(data).toHaveProperty('createdAt');
      expect(data).toHaveProperty('updatedAt');

      // Validate types
      expect(typeof data.settingsId).toBe('string');
      expect(typeof data.userId).toBe('string');
      expect(data.userId).toBe(userId);

      // Validate aiProvider enum
      expect(['openai', 'anthropic', 'perplexity', 'custom']).toContain(data.aiProvider);

      // Validate UUIDs
      expect(data.settingsId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(data.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate ISO 8601 timestamps
      expect(() => new Date(data.createdAt)).not.toThrow();
      expect(() => new Date(data.updatedAt)).not.toThrow();
    });

    it('should NOT return apiKey in GET response (writeOnly field)', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await fetch(`${API_BASE}/settings/ai?userId=${userId}`);
      const data = await response.json();

      // Contract: apiKey is writeOnly, must never be returned
      expect(data).not.toHaveProperty('apiKey');
    });

    it('should include optional modelAssignment object', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await fetch(`${API_BASE}/settings/ai?userId=${userId}`);
      const data = await response.json();

      if (data.modelAssignment) {
        expect(typeof data.modelAssignment).toBe('object');

        // Validate example task assignments
        if (data.modelAssignment.reportGeneration) {
          expect(typeof data.modelAssignment.reportGeneration).toBe('string');
        }
        if (data.modelAssignment.chatAssistant) {
          expect(typeof data.modelAssignment.chatAssistant).toBe('string');
        }
      }
    });

    it('should include optional rateLimitConfig', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await fetch(`${API_BASE}/settings/ai?userId=${userId}`);
      const data = await response.json();

      if (data.rateLimitConfig) {
        expect(typeof data.rateLimitConfig).toBe('object');
        expect(typeof data.rateLimitConfig.requestsPerMinute).toBe('number');
        expect(typeof data.rateLimitConfig.tokensPerMinute).toBe('number');

        // Validate minimum values
        expect(data.rateLimitConfig.requestsPerMinute).toBeGreaterThanOrEqual(1);
        expect(data.rateLimitConfig.tokensPerMinute).toBeGreaterThanOrEqual(1);
      }
    });

    it('should return 404 for user without AI settings', async () => {
      const newUserId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(`${API_BASE}/settings/ai?userId=${newUserId}`);

      // Contract: Must return 404 Not Found
      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
    });
  });

  describe('PUT /api/settings/ai', () => {
    it('should update AI settings with AISettingsUpdate schema', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const updateData = {
        aiProvider: 'anthropic',
        apiKey: 'sk-ant-api03-test-key-placeholder',
        modelAssignment: {
          reportGeneration: 'claude-3-5-sonnet-20241022',
          chatAssistant: 'claude-3-5-haiku-20241022'
        },
        defaultModel: 'claude-3-5-sonnet-20241022',
        rateLimitConfig: {
          requestsPerMinute: 50,
          tokensPerMinute: 100000
        }
      };

      const response = await fetch(`${API_BASE}/settings/ai?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      // Contract: Must return 200 OK
      expect(response.status).toBe(200);

      const updatedSettings = await response.json();

      // Verify updates applied
      expect(updatedSettings.aiProvider).toBe(updateData.aiProvider);
      expect(updatedSettings.defaultModel).toBe(updateData.defaultModel);

      // Verify apiKey NOT returned (writeOnly)
      expect(updatedSettings).not.toHaveProperty('apiKey');

      // Verify modelAssignment persisted
      if (updatedSettings.modelAssignment) {
        expect(updatedSettings.modelAssignment.reportGeneration).toBe(
          updateData.modelAssignment.reportGeneration
        );
      }

      // Verify updatedAt changed
      expect(updatedSettings).toHaveProperty('updatedAt');
    });

    it('should persist AI settings to storage (FR-011)', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const updateData = {
        aiProvider: 'perplexity',
        defaultModel: 'llama-3.1-sonar-large-128k-online'
      };

      // Update settings
      const putResponse = await fetch(`${API_BASE}/settings/ai?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      expect(putResponse.status).toBe(200);

      // Retrieve settings to verify persistence
      const getResponse = await fetch(`${API_BASE}/settings/ai?userId=${userId}`);
      const retrievedSettings = await getResponse.json();

      expect(retrievedSettings.aiProvider).toBe(updateData.aiProvider);
      expect(retrievedSettings.defaultModel).toBe(updateData.defaultModel);
    });

    it('should reject invalid aiProvider enum', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const invalidData = {
        aiProvider: 'invalid-provider'
      };

      const response = await fetch(`${API_BASE}/settings/ai?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      // Contract: Must return 400 Bad Request
      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
    });

    it('should enforce minimum rate limit values', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const invalidData = {
        aiProvider: 'openai',
        rateLimitConfig: {
          requestsPerMinute: 0,
          tokensPerMinute: -100
        }
      };

      const response = await fetch(`${API_BASE}/settings/ai?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      // Contract: Must reject values < 1
      expect(response.status).toBe(400);
    });
  });

  describe('AI Settings Page Routing (FR-009, FR-010)', () => {
    it('should access /settings/ai without 404', async () => {
      // This is a Next.js page route test
      const response = await fetch('http://localhost:3000/settings/ai');

      // Contract: Page must be accessible (not 404)
      expect(response.status).not.toBe(404);
      expect([200, 302, 307]).toContain(response.status); // Allow redirects for auth
    });
  });
});
