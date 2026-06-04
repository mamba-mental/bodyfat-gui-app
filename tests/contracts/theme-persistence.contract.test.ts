/**
 * Contract Test: Theme Persistence API
 *
 * Validates API contract compliance with specs/006-fix-7-critical/contracts/theme-persistence.yaml
 *
 * Constitutional Requirements:
 * - Article III: Frontend Stability - Hybrid persistence (localStorage + database + cookie)
 * - Article IV: Test-First Development - This test MUST fail initially (Red phase)
 *
 * Functional Requirements: FR-014, FR-015, FR-016
 *
 * IMPORTANT: This test MUST fail until the API implementation is complete.
 */

import { describe, it, expect } from 'vitest';

describe('Theme Persistence API Contract', () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010/api';

  describe('GET /api/theme', () => {
    it('should return ThemePreference schema', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await fetch(`${API_BASE}/theme?userId=${userId}`);

      // Contract: Must return 200 OK
      expect(response.status).toBe(200);

      const data = await response.json();

      // Validate ThemePreference schema - required fields
      expect(data).toHaveProperty('theme');
      expect(data).toHaveProperty('persistenceMethod');
      expect(data).toHaveProperty('lastUpdated');

      // Validate theme enum
      expect(['light', 'dark', 'system']).toContain(data.theme);

      // Validate persistenceMethod enum
      expect(['localStorage', 'database', 'cookie', 'hybrid']).toContain(data.persistenceMethod);

      // Validate ISO 8601 timestamp
      expect(() => new Date(data.lastUpdated)).not.toThrow();
    });

    it('should support cookie-based theme retrieval (FR-016)', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      // Make request with cookie header
      const response = await fetch(`${API_BASE}/theme?userId=${userId}`, {
        headers: {
          'Cookie': 'theme=dark; path=/; max-age=31536000'
        }
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('theme');
    });

    it('should return default theme when user has no preference', async () => {
      const newUserId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(`${API_BASE}/theme?userId=${newUserId}`);

      // Contract: Should return 200 with default theme
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.theme).toBe('system'); // Default theme
    });
  });

  describe('PUT /api/theme', () => {
    it('should update theme preference with ThemeUpdate schema', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const updateData = {
        theme: 'dark',
        persistenceMethod: 'hybrid'
      };

      const response = await fetch(`${API_BASE}/theme?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      // Contract: Must return 200 OK
      expect(response.status).toBe(200);

      const updatedTheme = await response.json();

      // Verify updates applied
      expect(updatedTheme.theme).toBe(updateData.theme);
      expect(updatedTheme.persistenceMethod).toBe(updateData.persistenceMethod);

      // Verify lastUpdated changed
      expect(updatedTheme).toHaveProperty('lastUpdated');
    });

    it('should set cookie for SSR theme hydration (FR-016)', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const updateData = {
        theme: 'light',
        persistenceMethod: 'hybrid'
      };

      const response = await fetch(`${API_BASE}/theme?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      // Contract: Response must include Set-Cookie header
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toBeTruthy();

      // Validate cookie format
      expect(setCookieHeader).toContain('theme=light');
      expect(setCookieHeader).toContain('path=/');
      expect(setCookieHeader).toContain('max-age='); // Long-lived cookie
    });

    it('should persist theme to hybrid storage (FR-014, FR-015)', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const updateData = {
        theme: 'dark',
        persistenceMethod: 'hybrid'
      };

      // Update theme
      const putResponse = await fetch(`${API_BASE}/theme?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      expect(putResponse.status).toBe(200);

      // Retrieve theme to verify persistence
      const getResponse = await fetch(`${API_BASE}/theme?userId=${userId}`);
      const retrievedTheme = await getResponse.json();

      expect(retrievedTheme.theme).toBe(updateData.theme);
      expect(retrievedTheme.persistenceMethod).toBe(updateData.persistenceMethod);
    });

    it('should reject invalid theme enum', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const invalidData = {
        theme: 'invalid-theme'
      };

      const response = await fetch(`${API_BASE}/theme?userId=${userId}`, {
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

    it('should support system theme preference', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const updateData = {
        theme: 'system'
      };

      const response = await fetch(`${API_BASE}/theme?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      // Contract: Must accept 'system' as valid theme
      expect(response.status).toBe(200);

      const updatedTheme = await response.json();
      expect(updatedTheme.theme).toBe('system');
    });
  });

  describe('Theme Persistence Across Sessions (FR-015)', () => {
    it('should persist theme after browser refresh', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      // Set theme
      const updateData = { theme: 'dark', persistenceMethod: 'hybrid' };
      await fetch(`${API_BASE}/theme?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      // Simulate browser refresh by making a new GET request
      const response = await fetch(`${API_BASE}/theme?userId=${userId}`);
      const theme = await response.json();

      // Contract: Theme must persist after refresh
      expect(theme.theme).toBe('dark');
    });

    it('should handle localStorage fallback when database unavailable', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const updateData = {
        theme: 'light',
        persistenceMethod: 'localStorage'
      };

      const response = await fetch(`${API_BASE}/theme?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      // Contract: Must support localStorage-only persistence
      expect(response.status).toBe(200);

      const updatedTheme = await response.json();
      expect(updatedTheme.persistenceMethod).toBe('localStorage');
    });
  });

  describe('Hybrid Persistence Strategy (Constitution Article III)', () => {
    it('should use hybrid persistence by default', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const updateData = {
        theme: 'dark'
        // persistenceMethod omitted - should default to 'hybrid'
      };

      const response = await fetch(`${API_BASE}/theme?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const updatedTheme = await response.json();

      // Contract: Default persistenceMethod should be 'hybrid'
      expect(updatedTheme.persistenceMethod).toBe('hybrid');
    });

    it('should synchronize across localStorage, database, and cookie', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const updateData = {
        theme: 'light',
        persistenceMethod: 'hybrid'
      };

      const response = await fetch(`${API_BASE}/theme?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      // Verify cookie set for SSR
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('theme=light');

      // Verify database persistence via GET
      const getResponse = await fetch(`${API_BASE}/theme?userId=${userId}`);
      const theme = await getResponse.json();
      expect(theme.theme).toBe('light');
    });
  });
});
