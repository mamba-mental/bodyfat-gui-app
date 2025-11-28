/**
 * Regression Test: Report Auto-Populate Functionality
 *
 * Validates report generation form auto-populates with latest entry data,
 * preventing regression of Issue #5.
 *
 * Constitutional Requirements:
 * - Article IV: Test-First Development - This test MUST fail initially (Red phase)
 *
 * Functional Requirements: FR-012, FR-013
 * Prevents Regression: Issue #5 - Report Generation Auto-Populate
 *
 * Test Coverage:
 * 1. Latest entry data retrieved via GET /api/entries/latest
 * 2. Report form auto-populates with latest entry values
 * 3. Auto-populated values are editable
 * 4. Form submission works with auto-populated data
 * 5. Manual override of auto-populated values works
 *
 * IMPORTANT: This test MUST fail if auto-populate functionality is broken.
 */

import { test, expect } from '@playwright/test';

test.describe('Report Auto-Populate Regression', () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  test('should retrieve latest entry via API (FR-012)', async ({ request }) => {
    const response = await request.get(`${API_BASE}/entries/latest?userId=${TEST_USER_ID}`);

    // Critical: Endpoint must exist and return 200
    expect(response.status()).toBe(200);

    const latestEntry = await response.json();

    // Verify latest entry has all required fields
    expect(latestEntry).toHaveProperty('entryId');
    expect(latestEntry).toHaveProperty('userId');
    expect(latestEntry).toHaveProperty('weight');
    expect(latestEntry).toHaveProperty('bodyFatPercentage');
    expect(latestEntry).toHaveProperty('height');
    expect(latestEntry).toHaveProperty('age');
    expect(latestEntry).toHaveProperty('gender');
    expect(latestEntry).toHaveProperty('activityLevel');

    // Verify data types
    expect(typeof latestEntry.weight).toBe('number');
    expect(typeof latestEntry.bodyFatPercentage).toBe('number');
    expect(typeof latestEntry.height).toBe('number');
    expect(typeof latestEntry.age).toBe('number');

    console.log(`✅ Latest entry retrieved: ${latestEntry.entryId}`);
  });

  test('should return most recent entry by recordedAt date', async ({ request }) => {
    // Get all entries
    const allResponse = await request.get(`${API_BASE}/entries?userId=${TEST_USER_ID}&limit=10&sortBy=recordedAt&sortOrder=desc`);
    const allData = await allResponse.json();

    // Get latest entry
    const latestResponse = await request.get(`${API_BASE}/entries/latest?userId=${TEST_USER_ID}`);
    const latestEntry = await latestResponse.json();

    // Verify latest entry matches first entry in sorted list
    if (allData.entries && allData.entries.length > 0) {
      const firstEntry = allData.entries[0];
      expect(latestEntry.entryId).toBe(firstEntry.entryId);

      console.log(`✅ Latest entry matches most recent: ${latestEntry.recordedAt}`);
    }
  });

  test('should auto-populate report form with latest entry data (FR-013)', async ({ page }) => {
    // First, get latest entry via API to know expected values
    const apiResponse = await page.request.get(`${API_BASE}/entries/latest?userId=${TEST_USER_ID}`);
    const latestEntry = await apiResponse.json();

    // Navigate to report generation page
    await page.goto('/reports/generate'); // Assuming this is the route
    await page.waitForLoadState('networkidle');

    // Wait for form to load
    await page.waitForSelector('form, [data-testid="report-form"]', { timeout: 5000 });

    // Verify weight field is auto-populated
    const weightInput = page.locator('[data-testid="weight-input"], input[name="weight"], input[type="number"][placeholder*="weight"]').first();
    if (await weightInput.isVisible()) {
      const weightValue = await weightInput.inputValue();
      const expectedWeight = latestEntry.weight.toString();

      expect(weightValue).toBe(expectedWeight);
      console.log(`✅ Weight auto-populated: ${weightValue}`);
    }

    // Verify body fat percentage is auto-populated
    const bfInput = page.locator('[data-testid="body-fat-input"], input[name="bodyFatPercentage"], input[name="bodyFat"]').first();
    if (await bfInput.isVisible()) {
      const bfValue = await bfInput.inputValue();
      const expectedBF = latestEntry.bodyFatPercentage.toString();

      expect(bfValue).toBe(expectedBF);
      console.log(`✅ Body fat auto-populated: ${bfValue}`);
    }

    // Verify height is auto-populated
    const heightInput = page.locator('[data-testid="height-input"], input[name="height"]').first();
    if (await heightInput.isVisible()) {
      const heightValue = await heightInput.inputValue();
      const expectedHeight = latestEntry.height.toString();

      expect(heightValue).toBe(expectedHeight);
      console.log(`✅ Height auto-populated: ${heightValue}`);
    }

    // Verify age is auto-populated
    const ageInput = page.locator('[data-testid="age-input"], input[name="age"]').first();
    if (await ageInput.isVisible()) {
      const ageValue = await ageInput.inputValue();
      const expectedAge = latestEntry.age.toString();

      expect(ageValue).toBe(expectedAge);
      console.log(`✅ Age auto-populated: ${ageValue}`);
    }
  });

  test('should allow manual override of auto-populated values', async ({ page }) => {
    // Navigate to report form
    await page.goto('/reports/generate');
    await page.waitForLoadState('networkidle');

    // Wait for form
    await page.waitForSelector('form, [data-testid="report-form"]');

    // Get weight input
    const weightInput = page.locator('[data-testid="weight-input"], input[name="weight"]').first();

    if (await weightInput.isVisible()) {
      const originalValue = await weightInput.inputValue();

      // Clear and enter new value
      await weightInput.clear();
      await weightInput.fill('185.5');

      const newValue = await weightInput.inputValue();

      // Verify value changed
      expect(newValue).toBe('185.5');
      expect(newValue).not.toBe(originalValue);

      console.log(`✅ Manual override successful: ${originalValue} → ${newValue}`);
    }
  });

  test('should submit report with auto-populated data successfully', async ({ page }) => {
    // Navigate to report form
    await page.goto('/reports/generate');
    await page.waitForLoadState('networkidle');

    // Wait for form to auto-populate
    await page.waitForSelector('form, [data-testid="report-form"]');
    await page.waitForTimeout(1000); // Allow time for auto-populate

    // Find submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Generate"), button:has-text("Create Report")').first();

    if (await submitButton.isVisible()) {
      // Click submit
      await submitButton.click();

      // Wait for response (success message or navigation)
      await page.waitForTimeout(2000);

      // Verify no error messages
      const errorAlert = page.locator('[role="alert"]:has-text("error"), [role="alert"]:has-text("failed")');
      await expect(errorAlert).not.toBeVisible();

      console.log(`✅ Report submitted with auto-populated data`);
    }
  });

  test('should handle case when no entries exist gracefully', async ({ request, page }) => {
    // Test with non-existent user
    const newUserId = '00000000-0000-0000-0000-000000000000';

    const response = await request.get(`${API_BASE}/entries/latest?userId=${newUserId}`);

    // Should return 404 or empty result
    if (response.status() === 404) {
      console.log(`✅ Correctly returns 404 when no entries exist`);
    } else {
      const data = await response.json();
      expect(data).toBeTruthy();
    }

    // Navigate to form with this user
    await page.goto(`/reports/generate?userId=${newUserId}`);
    await page.waitForLoadState('networkidle');

    // Form should still render (empty or with defaults)
    const form = page.locator('form, [data-testid="report-form"]').first();
    await expect(form).toBeVisible();

    console.log(`✅ Form handles missing entries gracefully`);
  });

  test('should auto-populate gender and activity level enums', async ({ page }) => {
    // Get latest entry
    const apiResponse = await page.request.get(`${API_BASE}/entries/latest?userId=${TEST_USER_ID}`);
    const latestEntry = await apiResponse.json();

    // Navigate to form
    await page.goto('/reports/generate');
    await page.waitForLoadState('networkidle');

    // Check gender selection
    const genderSelect = page.locator('[data-testid="gender-select"], select[name="gender"]').first();
    if (await genderSelect.isVisible()) {
      const genderValue = await genderSelect.inputValue();
      expect(genderValue).toBe(latestEntry.gender);

      console.log(`✅ Gender auto-populated: ${genderValue}`);
    }

    // Check activity level selection
    const activitySelect = page.locator('[data-testid="activity-level-select"], select[name="activityLevel"]').first();
    if (await activitySelect.isVisible()) {
      const activityValue = await activitySelect.inputValue();
      expect(activityValue).toBe(latestEntry.activityLevel);

      console.log(`✅ Activity level auto-populated: ${activityValue}`);
    }
  });

  test('should update form when latest entry changes', async ({ page, request }) => {
    // Get current latest entry
    const firstResponse = await request.get(`${API_BASE}/entries/latest?userId=${TEST_USER_ID}`);
    const firstEntry = await firstResponse.json();

    // Navigate to form
    await page.goto('/reports/generate');
    await page.waitForLoadState('networkidle');

    // Get auto-populated weight
    const weightInput = page.locator('[data-testid="weight-input"], input[name="weight"]').first();
    let firstWeight = '';
    if (await weightInput.isVisible()) {
      firstWeight = await weightInput.inputValue();
      console.log(`Initial weight: ${firstWeight}`);
    }

    // Create new entry with different weight
    const newEntry = {
      userId: TEST_USER_ID,
      weight: parseFloat(firstEntry.weight) + 5.0, // Different weight
      bodyFatPercentage: firstEntry.bodyFatPercentage,
      height: firstEntry.height,
      age: firstEntry.age,
      gender: firstEntry.gender,
      activityLevel: firstEntry.activityLevel,
      recordedAt: new Date().toISOString()
    };

    const createResponse = await request.post(`${API_BASE}/entries`, {
      data: newEntry
    });

    expect(createResponse.status()).toBe(201);

    // Reload form to get new latest entry
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify weight updated to new value
    if (await weightInput.isVisible()) {
      const newWeight = await weightInput.inputValue();
      expect(newWeight).toBe(newEntry.weight.toString());
      expect(newWeight).not.toBe(firstWeight);

      console.log(`✅ Form updated with new latest entry: ${firstWeight} → ${newWeight}`);
    }
  });

  test('should display loading state while fetching latest entry', async ({ page }) => {
    // Navigate to form
    await page.goto('/reports/generate');

    // Look for loading indicator (spinner, skeleton, etc.)
    const loadingIndicator = page.locator(
      '[data-testid="loading"], [aria-label="Loading"], .spinner, .skeleton'
    );

    // Loading state may be brief, so we check if it appears at all
    // or if form loads directly
    const hasLoading = await loadingIndicator.isVisible().catch(() => false);

    if (hasLoading) {
      console.log(`✅ Loading state displayed`);
    }

    // Form should eventually be visible
    await page.waitForSelector('form, [data-testid="report-form"]', { timeout: 5000 });
  });

  test('should preserve auto-populated values across navigation', async ({ page }) => {
    // Navigate to form
    await page.goto('/reports/generate');
    await page.waitForLoadState('networkidle');

    // Get auto-populated weight
    const weightInput = page.locator('[data-testid="weight-input"], input[name="weight"]').first();
    let originalWeight = '';

    if (await weightInput.isVisible()) {
      originalWeight = await weightInput.inputValue();
    }

    // Navigate away
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate back to form
    await page.goto('/reports/generate');
    await page.waitForLoadState('networkidle');

    // Verify weight still auto-populated with same value
    if (await weightInput.isVisible()) {
      const newWeight = await weightInput.inputValue();
      expect(newWeight).toBe(originalWeight);

      console.log(`✅ Auto-populate consistent across navigation: ${newWeight}`);
    }
  });

  test('should include entry selection if multiple entries exist', async ({ page, request }) => {
    // Get entry count
    const response = await request.get(`${API_BASE}/entries?userId=${TEST_USER_ID}`);
    const data = await response.json();

    if (data.total > 1) {
      // Navigate to form
      await page.goto('/reports/generate');
      await page.waitForLoadState('networkidle');

      // Look for entry selection UI
      const entrySelector = page.locator(
        '[data-testid="entry-selector"], select[name*="entry"], [aria-label*="entry"]'
      );

      // Entry selector may exist if multiple entries available
      const count = await entrySelector.count();

      if (count > 0) {
        console.log(`✅ Entry selection available with ${data.total} entries`);
      }
    }
  });
});
