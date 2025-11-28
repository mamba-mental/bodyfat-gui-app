/**
 * T009 [P]: Integration Test - Dashboard Production State
 *
 * End-to-end test for verifying production-ready dashboard
 * Tests for zero debugging messages and Dashboard component enabled
 *
 * Expected Outcome: Test FAILS (debugging message still present) - RED phase of TDD
 *
 * Test Flow:
 * 1. Make HTTP request to root route (/)
 * 2. Verify response status is 200
 * 3. Parse HTML response
 * 4. Verify NO debugging messages present
 * 5. Verify Dashboard component is rendered
 * 6. Call GET /api/dashboard/state to verify mode === 'production'
 *
 * Quickstart Reference: CLAUDE_CODE_MCP_COMMANDS.md
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('Dashboard Production State Flow (T009)', () => {
  const API_URL = 'http://localhost:3000';
  const PAGE_SOURCE_PATH = 'src/app/page.tsx';

  // Debugging text to search for
  const debuggingKeywords = [
    'disabled',
    'debugging',
    'temporarily',
    'alpha',
    'test',
    'beta',
    'mock',
    'development',
    'staging'
  ];

  it('should make HTTP request to root route and verify response', async () => {
    const response = await fetch(API_URL);

    // Verify response status
    expect(response.status).toBe(200);

    // Verify HTML content
    const html = await response.text();

    // Check for absence of debugging keywords
    debuggingKeywords.forEach(keyword => {
      expect(html.toLowerCase()).not.toContain(keyword);
    });

    // Verify Dashboard rendering indicators
    expect(html).toContain('Dashboard');
    expect(html).toContain('bg-gradient-to-r');
  });

  it('should have mode="production" via API check', async () => {
    const response = await fetch(`${API_URL}/api/dashboard/state`);
    const data = await response.json();

    // Production mode verification
    expect(data.mode).toBe('production');
  });

  it('should have dashboard_enabled=true (Dashboard component active)', async () => {
    const response = await fetch(`${API_URL}/api/dashboard/state`);
    const data = await response.json();

    expect(data.dashboard_enabled).toBe(true);
  });

  it('should NOT have Dashboard component commented out in source code', () => {
    const pageSource = fs.readFileSync(PAGE_SOURCE_PATH, 'utf-8');
    const commentedDashboardRegex = /\/\/.*<Dashboard/;

    expect(pageSource).not.toMatch(commentedDashboardRegex);
  });

  it('should have all_enabled=true and empty disabled_features array', async () => {
    const response = await fetch(`${API_URL}/api/dashboard/state`);
    const data = await response.json();

    expect(data.features.all_enabled).toBe(true);
    expect(data.features.disabled_features).toEqual([]);
  });

  it('should NOT include debug_details when in production mode', async () => {
    const response = await fetch(`${API_URL}/api/dashboard/state`);
    const data = await response.json();

    if (data.mode === 'production') {
      expect(data.debug_details).toBeUndefined();
    }
  });

  it('should include last_verified timestamp (production state verification)', async () => {
    const response = await fetch(`${API_URL}/api/dashboard/state`);
    const data = await response.json();

    if (data.mode === 'production') {
      expect(data.last_verified).toBeTruthy();
      // Validate timestamp is recent (within last hour)
      const verifiedTime = new Date(data.last_verified).getTime();
      const now = Date.now();
      const hourInMs = 60 * 60 * 1000;

      expect(now - verifiedTime).toBeLessThan(hourInMs);
    }
  });
});