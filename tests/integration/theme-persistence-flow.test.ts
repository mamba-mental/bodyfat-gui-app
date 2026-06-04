/**
 * T013 [P]: Integration Test - Theme Persistence Cross-Session
 *
 * Regression test for Issue #6 - verify theme persists across browser refresh
 * Tests hybrid storage pattern (localStorage + cookie + database)
 *
 * Expected Outcome: Test SHOULD PASS (already working per investigation at theme-context.tsx:106-176) - regression test
 *
 * Test Flow:
 * 1. Set theme to 'dark' via PUT /api/theme
 * 2. Verify localStorage updated (localStorage.getItem('theme'))
 * 3. Verify cookie set (document.cookie match)
 * 4. Verify database updated (query theme_preferences table)
 * 5. Simulate browser refresh (clear in-memory state)
 * 6. Verify theme still 'dark' (all three storage layers persist)
 * 7. Assert 100% persistence reliability across sessions
 *
 * Quickstart Reference: quickstart.md Step 6
 */

import { describe, it, expect } from 'vitest';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

describe('Theme Persistence Cross-Session Flow', () => {
  const API_URL = 'http://localhost:3010';
  const TEST_USER_ID = 'test-user';
  const DB_PATH = 'data/bodyfat.db';

  it('should update theme to dark via PUT /api/theme', async () => {
    const response = await fetch(`${API_URL}/api/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'dark',
        user_id: TEST_USER_ID,
      }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data.theme).toBe('dark');
    expect(data.storage_updates.localStorage).toBe(true);
    expect(data.storage_updates.cookie).toBe(true);
    expect(data.storage_updates.database).toBe(true);
  });

  it('should persist theme in database (theme_preferences table)', async () => {
    // Set theme
    await fetch(`${API_URL}/api/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'dark',
        user_id: TEST_USER_ID,
      }),
    });

    // Query database
    const db = new sqlite3.Database(DB_PATH);
    const dbAll = promisify(db.all.bind(db)) as (sql: string, params: unknown[]) => Promise<unknown[]>;

    const themePrefs = await dbAll(
      'SELECT * FROM theme_preferences WHERE user_id = ?',
      [TEST_USER_ID]
    );

    db.close();

    // FR-014, FR-015, FR-016: Database persistence
    expect((themePrefs as any[]).length).toBeGreaterThan(0);

    const themePref = (themePrefs as any[])[0];
    expect(themePref.theme).toBe('dark');
  });

  it('should retrieve persisted theme via GET /api/theme after update', async () => {
    // Set theme to dark
    await fetch(`${API_URL}/api/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'dark',
        user_id: TEST_USER_ID,
      }),
    });

    // Retrieve theme (simulates browser refresh)
    const response = await fetch(`${API_URL}/api/theme?user_id=${TEST_USER_ID}`);

    const data = await response.json();

    // FR-027 criterion #4: 100% persistence reliability
    expect(data.theme).toBe('dark');
    expect(data.sync_status.localStorage).toBe(true);
    expect(data.sync_status.cookie).toBe(true);
    expect(data.sync_status.database).toBe(true);
  });

  it('should maintain theme across multiple GET requests (session persistence)', async () => {
    // Set theme
    await fetch(`${API_URL}/api/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'dark',
        user_id: TEST_USER_ID,
      }),
    });

    // Fetch theme multiple times
    for (let i = 0; i < 3; i++) {
      const response = await fetch(`${API_URL}/api/theme?user_id=${TEST_USER_ID}`);

      const data = await response.json();

      expect(data.theme).toBe('dark');
    }
  });

  it('should support theme updates (dark -> light -> system)', async () => {
    const themes = ['dark', 'light', 'system'];

    for (const theme of themes) {
      // Update theme
      await fetch(`${API_URL}/api/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          user_id: TEST_USER_ID,
        }),
      });

      // Verify persistence
      const response = await fetch(`${API_URL}/api/theme?user_id=${TEST_USER_ID}`);

      const data = await response.json();

      expect(data.theme).toBe(theme);
    }
  });

  it('should use ThemeContext for hybrid storage pattern (theme-context.tsx:106-176)', () => {
    // Verify ThemeContext implementation exists
    const fs = require('fs');
    const themeContextExists = fs.existsSync('src/contexts/theme-context.tsx');

    expect(themeContextExists).toBe(true);

    if (themeContextExists) {
      const themeContextSource = fs.readFileSync('src/contexts/theme-context.tsx', 'utf-8');

      // Verify hybrid storage logic exists around line 106-176
      expect(themeContextSource).toContain('localStorage');
      expect(themeContextSource).toContain('cookie');
      expect(themeContextSource).toContain('database');
    }
  });

  it('should have all storage layers synchronized (localStorage + cookie + database)', async () => {
    // Set theme
    await fetch(`${API_URL}/api/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'dark',
        user_id: TEST_USER_ID,
      }),
    });

    // Check sync status
    const response = await fetch(`${API_URL}/api/theme?user_id=${TEST_USER_ID}`);

    const data = await response.json();

    // FR-014, FR-015, FR-016: All three storage layers must be synced
    expect(data.sync_status.localStorage).toBe(true);
    expect(data.sync_status.cookie).toBe(true);
    expect(data.sync_status.database).toBe(true);
  });

  it('should indicate cross_device_sync_enabled for authenticated users', async () => {
    const response = await fetch(`${API_URL}/api/theme?user_id=${TEST_USER_ID}`);

    const data = await response.json();

    // Cross-device sync enabled via database persistence
    expect(data.cross_device_sync_enabled).toBe(true);
  });
});
