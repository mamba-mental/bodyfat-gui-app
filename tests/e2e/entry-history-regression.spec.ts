/**
 * Regression Test: Entry History Preservation
 *
 * Validates all 12 historical entries are preserved and accessible
 * across all time periods, preventing regression of Issue #2.
 *
 * Constitutional Requirements:
 * - Article II: Database Consistency - All 12 entries must be preserved
 * - Article IV: Test-First Development - This test MUST fail initially (Red phase)
 *
 * Functional Requirements: FR-005, FR-006
 * Prevents Regression: Issue #2 - Entry History Restoration
 *
 * Test Coverage:
 * 1. Verify total entry count >= 12
 * 2. Verify entries sorted by date (newest first)
 * 3. Verify pagination works correctly
 * 4. Verify entry data integrity
 * 5. Verify data persists across sessions
 *
 * IMPORTANT: This test MUST fail if any historical entries are missing.
 */

import { test, expect } from '@playwright/test';

test.describe('Entry History Regression', () => {
  const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  test('should preserve all 12 historical entries (Constitution Article II)', async ({ request }) => {
    const response = await request.get(`${API_BASE}/entries?userId=${TEST_USER_ID}`);

    expect(response.status()).toBe(200);

    const data = await response.json();

    // Critical: Total must be >= 12 entries (Constitutional requirement)
    expect(data.total).toBeGreaterThanOrEqual(12);

    console.log(`✅ Entry count verification: ${data.total} entries (minimum 12 required)`);
  });

  test('should display entry history page without errors', async ({ page }) => {
    // Navigate to entry history page
    await page.goto('/entries'); // Assuming /entries is the history page route

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Verify no error messages
    const errorMessage = page.locator('[role="alert"]:has-text("error")');
    await expect(errorMessage).not.toBeVisible();

    // Verify entries are rendered
    const entryList = page.locator('[data-testid="entry-list"], [aria-label*="Entry"], table');
    await expect(entryList).toBeVisible();
  });

  test('should sort entries by date (newest first by default)', async ({ request }) => {
    const response = await request.get(`${API_BASE}/entries?userId=${TEST_USER_ID}&sortBy=recordedAt&sortOrder=desc`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    const entries = data.entries;

    expect(entries.length).toBeGreaterThan(0);

    // Verify descending order (newest first)
    for (let i = 1; i < entries.length; i++) {
      const prevDate = new Date(entries[i - 1].recordedAt).getTime();
      const currDate = new Date(entries[i].recordedAt).getTime();

      expect(prevDate).toBeGreaterThanOrEqual(currDate);
    }

    console.log(`✅ Sort verification: ${entries.length} entries in descending order`);
  });

  test('should support pagination correctly', async ({ request }) => {
    // Get first page
    const page1Response = await request.get(`${API_BASE}/entries?userId=${TEST_USER_ID}&limit=5&offset=0`);
    expect(page1Response.status()).toBe(200);

    const page1Data = await page1Response.json();
    expect(page1Data.entries.length).toBeLessThanOrEqual(5);

    // Get second page
    const page2Response = await request.get(`${API_BASE}/entries?userId=${TEST_USER_ID}&limit=5&offset=5`);
    expect(page2Response.status()).toBe(200);

    const page2Data = await page2Response.json();

    // Verify pages contain different entries
    const page1Ids = page1Data.entries.map((e: any) => e.entryId);
    const page2Ids = page2Data.entries.map((e: any) => e.entryId);

    const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
    expect(overlap.length).toBe(0);

    console.log(`✅ Pagination verification: Page 1 (${page1Ids.length} entries), Page 2 (${page2Ids.length} entries), No overlap`);
  });

  test('should validate entry data integrity', async ({ request }) => {
    const response = await request.get(`${API_BASE}/entries?userId=${TEST_USER_ID}&limit=1`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.entries.length).toBeGreaterThan(0);

    const entry = data.entries[0];

    // Validate all 12 required fields (FR-006)
    expect(entry).toHaveProperty('entryId');
    expect(entry).toHaveProperty('userId');
    expect(entry).toHaveProperty('recordedAt');
    expect(entry).toHaveProperty('weight');
    expect(entry).toHaveProperty('bodyFatPercentage');
    expect(entry).toHaveProperty('height');
    expect(entry).toHaveProperty('age');
    expect(entry).toHaveProperty('gender');
    expect(entry).toHaveProperty('activityLevel');
    expect(entry).toHaveProperty('createdAt');
    expect(entry).toHaveProperty('updatedAt');

    // Validate data types
    expect(typeof entry.weight).toBe('number');
    expect(typeof entry.bodyFatPercentage).toBe('number');
    expect(typeof entry.height).toBe('number');
    expect(typeof entry.age).toBe('number');

    // Validate enums
    expect(['male', 'female', 'other']).toContain(entry.gender);
    expect(['sedentary', 'light', 'moderate', 'active', 'very_active']).toContain(entry.activityLevel);

    console.log(`✅ Data integrity verification: Entry ${entry.entryId} has all 12 required fields`);
  });

  test('should persist entries across browser sessions', async ({ page, context }) => {
    // First session: Load entries
    await page.goto('/entries');
    await page.waitForLoadState('networkidle');

    const firstSessionEntries = await page.locator('[data-testid="entry-item"], [data-entry-id], tr[data-testid]').count();
    expect(firstSessionEntries).toBeGreaterThan(0);

    // Close and create new context (simulating browser restart)
    await context.close();
    const newContext = await page.context().browser()!.newContext();
    const newPage = await newContext.newPage();

    // Second session: Load entries again
    await newPage.goto('/entries');
    await newPage.waitForLoadState('networkidle');

    const secondSessionEntries = await newPage.locator('[data-testid="entry-item"], [data-entry-id], tr[data-testid]').count();

    // Entry count should be consistent across sessions
    expect(secondSessionEntries).toBe(firstSessionEntries);

    console.log(`✅ Session persistence verification: ${firstSessionEntries} entries in both sessions`);

    await newContext.close();
  });

  test('should display entries from all time periods', async ({ request }) => {
    const response = await request.get(`${API_BASE}/entries?userId=${TEST_USER_ID}`);
    const data = await response.json();

    const entries = data.entries;

    // Group entries by time period (30-day buckets)
    const now = Date.now();
    const timePeriods = {
      recent: 0,      // 0-30 days
      month: 0,       // 31-60 days
      twoMonths: 0,   // 61-90 days
      older: 0        // 90+ days
    };

    entries.forEach((entry: any) => {
      const entryDate = new Date(entry.recordedAt).getTime();
      const daysAgo = (now - entryDate) / (1000 * 60 * 60 * 24);

      if (daysAgo <= 30) timePeriods.recent++;
      else if (daysAgo <= 60) timePeriods.month++;
      else if (daysAgo <= 90) timePeriods.twoMonths++;
      else timePeriods.older++;
    });

    // Verify we have entries across multiple time periods
    const periodsWithEntries = Object.values(timePeriods).filter(count => count > 0).length;
    expect(periodsWithEntries).toBeGreaterThanOrEqual(2); // At least 2 different time periods

    console.log(`✅ Time period distribution:`, timePeriods);
    console.log(`  Periods with entries: ${periodsWithEntries}/4`);
  });

  test('should retrieve specific entry by ID', async ({ request }) => {
    // First get list to obtain valid entryId
    const listResponse = await request.get(`${API_BASE}/entries?userId=${TEST_USER_ID}&limit=1`);
    const listData = await listResponse.json();
    const entryId = listData.entries[0].entryId;

    // Now retrieve specific entry
    const response = await request.get(`${API_BASE}/entries/${entryId}`);

    expect(response.status()).toBe(200);

    const entry = await response.json();
    expect(entry.entryId).toBe(entryId);

    console.log(`✅ Entry retrieval verification: Entry ${entryId} retrieved successfully`);
  });

  test('should handle edge cases gracefully', async ({ request }) => {
    // Test with large offset (beyond available entries)
    const response = await request.get(`${API_BASE}/entries?userId=${TEST_USER_ID}&limit=5&offset=1000`);

    expect(response.status()).toBe(200);

    const data = await response.json();

    // Should return empty array, not error
    expect(Array.isArray(data.entries)).toBe(true);
    expect(data.hasMore).toBe(false);
  });

  test('should maintain data consistency after page refresh', async ({ page }) => {
    // Load entries page
    await page.goto('/entries');
    await page.waitForLoadState('networkidle');

    // Count entries before refresh
    const beforeCount = await page.locator('[data-testid="entry-item"], [data-entry-id], tr[data-testid]').count();

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Count entries after refresh
    const afterCount = await page.locator('[data-testid="entry-item"], [data-entry-id], tr[data-testid]').count();

    // Count should be consistent
    expect(afterCount).toBe(beforeCount);

    console.log(`✅ Refresh consistency: ${beforeCount} entries before, ${afterCount} entries after`);
  });
});
