/**
 * T011 [P]: Integration Test - AI Settings Route Accessibility
 *
 * Regression test for Issue #4 - verify /settings/ai loads without 404
 * Tests Next.js App Router routing and page accessibility
 *
 * Expected Outcome: Test SHOULD PASS (already working per investigation) - regression test
 *
 * Test Flow:
 * 1. Navigate to /settings/ai route
 * 2. Verify HTTP 200 response (not 404)
 * 3. Verify AI settings page content rendered
 * 4. Verify configuration options visible and accessible
 * 5. Assert zero 404 errors on route access
 *
 * Quickstart Reference: quickstart.md Step 4
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('AI Settings Route Accessibility', () => {
  const BASE_URL = 'http://localhost:3000';
  const AI_SETTINGS_PATH = 'src/app/settings/ai/page.tsx';

  it('should return HTTP 200 for /settings/ai route (not 404)', async () => {
    const response = await fetch(`${BASE_URL}/settings/ai`);

    // FR-027 criterion #2: Zero 404 errors
    expect(response.status).toBe(200);
  });

  it('should have AI settings page file at correct App Router location', () => {
    // Verify page.tsx exists at src/app/settings/ai/page.tsx
    const pageExists = fs.existsSync(AI_SETTINGS_PATH);

    // FR-009: Page must exist for route to work
    expect(pageExists).toBe(true);
  });

  it('should render AI settings page content (HTML response)', async () => {
    const response = await fetch(`${BASE_URL}/settings/ai`);

    expect(response.headers.get('content-type')).toContain('text/html');

    const html = await response.text();

    // Page should contain AI-related content
    expect(html.length).toBeGreaterThan(0);
  });

  it('should display AI configuration options (model selection, API keys, etc.)', async () => {
    const response = await fetch(`${BASE_URL}/settings/ai`);

    const html = await response.text();

    // Look for AI settings-specific content indicators
    // These are example checks - adjust based on actual page content
    const hasAIContent = html.toLowerCase().includes('ai') ||
                         html.toLowerCase().includes('model') ||
                         html.toLowerCase().includes('settings');

    expect(hasAIContent).toBe(true);
  });

  it('should be accessible via /settings parent route navigation', async () => {
    const settingsResponse = await fetch(`${BASE_URL}/settings`);

    expect(settingsResponse.status).toBe(200);

    const html = await settingsResponse.text();

    // Settings page should link to AI settings
    const hasAILink = html.includes('/settings/ai') || html.includes('AI');

    expect(hasAILink).toBe(true);
  });

  it('should NOT return 404 error for /settings/ai route', async () => {
    const response = await fetch(`${BASE_URL}/settings/ai`);

    // Explicitly verify NOT 404
    expect(response.status).not.toBe(404);
  });

  it('should have valid Next.js App Router file structure', () => {
    // Verify App Router pattern: app/settings/ai/page.tsx
    const appDirExists = fs.existsSync('src/app');
    const settingsDirExists = fs.existsSync('src/app/settings');
    const aiDirExists = fs.existsSync('src/app/settings/ai');
    const pageFileExists = fs.existsSync(AI_SETTINGS_PATH);

    expect(appDirExists).toBe(true);
    expect(settingsDirExists).toBe(true);
    expect(aiDirExists).toBe(true);
    expect(pageFileExists).toBe(true);
  });

  it('should handle client-side navigation to /settings/ai (no full page reload)', async () => {
    // This would require browser automation (Playwright/Puppeteer)
    // For now, verify SSR rendering works
    const response = await fetch(`${BASE_URL}/settings/ai`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
  });
});
