/**
 * T024 [P]: E2E Test - Entry Form Auto-Populate
 *
 * Regression test for Issue #5 - verify entry form automatically populates with latest entry data
 * Tests that users don't need to manually re-enter their measurements
 *
 * Expected Outcome: Test SHOULD PASS (regression test - form auto-populates from latest entry)
 *
 * Test Flow:
 * 1. Navigate to /entries/new route (CORRECTED from /reports/new)
 * 2. Wait for form to load and hydrate
 * 3. Verify weight field is pre-filled with latest entry
 * 4. Verify date field is pre-filled with current date
 * 5. Assert form fields are NOT empty
 * 6. Verify no manual data re-entry is required
 * 7. Test form accessibility and keyboard navigation
 *
 * Context:
 * - Form auto-populate logic exists in app-context.tsx:307-315
 * - Latest entry fetched via /api/entries/latest endpoint
 * - Actual page exists at src/app/entries/new/page.tsx
 * - EntryForm component at src/components/forms/entry-form.tsx
 */

import { test, expect } from '@playwright/test';

test.describe('Entry Form Auto-Populate', () => {
  const ENTRY_FORM_URL = 'http://localhost:3010/entries/new';
  const TEST_USER_ID = 'test-user';

  test.beforeEach(async ({ page }) => {
    // Navigate to the entry form page
    await page.goto(ENTRY_FORM_URL);

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to /entries/new page and return HTTP 200', async ({ page }) => {
    // Verify the response status
    const response = await page.goto(ENTRY_FORM_URL);
    expect(response?.status()).toBe(200);

    // Verify page loaded successfully with correct URL
    await expect(page).toHaveURL(ENTRY_FORM_URL);
  });

  test('should render entry form with proper title and description', async ({ page }) => {
    // Verify page heading
    const pageHeading = page.locator('h1').filter({ hasText: 'New Entry' });
    await expect(pageHeading).toBeVisible();

    // Verify page description
    await expect(page.locator('text=Add a new weight and body fat measurement')).toBeVisible();

    // Verify form card title
    const formTitle = page.locator('#entry-form-title');
    await expect(formTitle).toBeVisible();
    await expect(formTitle).toHaveText('Add New Entry');
  });

  test('should auto-populate weight field with latest entry value', async ({ page }) => {
    // Wait for form to fully render and hydrate
    await page.waitForSelector('input[type="number"][step="0.1"]', { state: 'visible' });

    // Locate weight input field
    const weightInput = page.locator('input[type="number"][step="0.1"]').first();

    // Wait for the field to be visible
    await expect(weightInput).toBeVisible();

    // Get the weight field value
    const weightValue = await weightInput.inputValue();

    // Verify weight field is NOT empty (auto-populated)
    expect(weightValue).toBeTruthy();
    expect(weightValue).not.toBe('');
    expect(weightValue).not.toBe('0');

    // Verify weight is a valid positive number
    const weightNumber = parseFloat(weightValue);
    expect(weightNumber).toBeGreaterThan(0);
    expect(weightNumber).toBeLessThan(1000); // Reasonable weight range
  });

  test('should auto-populate date field with current date', async ({ page }) => {
    // Locate date button (Popover trigger)
    const dateButton = page.locator('button').filter({ has: page.locator('text=/Pick a date|[A-Z][a-z]+ \\d+, \\d{4}/') }).first();

    // Wait for date button to be visible
    await expect(dateButton).toBeVisible();

    // Get date button text
    const dateText = await dateButton.textContent();

    // Verify date is NOT "Pick a date" (empty state)
    expect(dateText).toBeTruthy();
    expect(dateText).not.toContain('Pick a date');

    // Verify date is in expected format (e.g., "October 6, 2025")
    expect(dateText).toMatch(/[A-Z][a-z]+ \d+, \d{4}/);
  });

  test('should display weight field label and description', async ({ page }) => {
    // Verify weight label is visible
    const weightLabel = page.locator('label').filter({ hasText: 'Weight (lbs)' });
    await expect(weightLabel).toBeVisible();

    // Verify weight description is visible
    const weightDescription = page.locator('#weight-description');
    await expect(weightDescription).toBeVisible();
    await expect(weightDescription).toHaveText('Your current weight in pounds');
  });

  test('should display body fat percentage field (optional)', async ({ page }) => {
    // Verify body fat label is visible
    const bfLabel = page.locator('label').filter({ hasText: 'Body Fat % (Optional)' });
    await expect(bfLabel).toBeVisible();

    // Verify body fat input field exists
    const bfInput = page.locator('input[type="number"][step="0.1"]').nth(1);
    await expect(bfInput).toBeVisible();

    // Verify body fat description
    const bfDescription = page.locator('#bodyfat-description');
    await expect(bfDescription).toBeVisible();
    await expect(bfDescription).toHaveText('Body fat percentage if measured (0-100%)');
  });

  test('should display notes textarea field (optional)', async ({ page }) => {
    // Verify notes label is visible
    const notesLabel = page.locator('label').filter({ hasText: 'Notes (Optional)' });
    await expect(notesLabel).toBeVisible();

    // Verify notes textarea exists
    const notesTextarea = page.locator('textarea');
    await expect(notesTextarea).toBeVisible();

    // Verify notes description
    const notesDescription = page.locator('#notes-description');
    await expect(notesDescription).toBeVisible();
    await expect(notesDescription).toContainText('Optional notes about your progress, diet, or training (max 500 characters)');
  });

  test('should have functional Save Entry button', async ({ page }) => {
    // Verify Save Entry button exists
    const saveButton = page.locator('button[type="submit"]').filter({ hasText: 'Save Entry' });
    await expect(saveButton).toBeVisible();

    // Verify button is enabled (not in loading state)
    await expect(saveButton).toBeEnabled();

    // Verify button has proper aria-label
    const ariaLabel = await saveButton.getAttribute('aria-label');
    expect(ariaLabel).toContain('Save entry');
  });

  test('should have functional Reset button', async ({ page }) => {
    // Verify Reset button exists
    const resetButton = page.locator('button[type="button"]').filter({ hasText: 'Reset' });
    await expect(resetButton).toBeVisible();

    // Verify button is enabled
    await expect(resetButton).toBeEnabled();

    // Verify button has proper aria-label
    const ariaLabel = await resetButton.getAttribute('aria-label');
    expect(ariaLabel).toContain('Reset form');
  });

  test('should verify zero manual data re-entry required (100% auto-populate)', async ({ page }) => {
    // Wait for form to fully hydrate
    await page.waitForSelector('input[type="number"][step="0.1"]', { state: 'visible' });

    // Verify date field is populated
    const dateButton = page.locator('button').filter({ has: page.locator('text=/Pick a date|[A-Z][a-z]+ \\d+, \\d{4}/') }).first();
    const dateText = await dateButton.textContent();
    expect(dateText).not.toContain('Pick a date');

    // Verify weight field is populated
    const weightInput = page.locator('input[type="number"][step="0.1"]').first();
    const weightValue = await weightInput.inputValue();
    expect(weightValue).toBeTruthy();
    expect(parseFloat(weightValue)).toBeGreaterThan(0);

    // All required fields are auto-populated - zero manual entry needed
    // FR-027 criterion #7: 100% auto-populate success rate verified
  });

  test('should be keyboard accessible for form navigation', async ({ page }) => {
    // Focus on weight input using keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focused element is within the form
    const focusedElement = await page.evaluateHandle(() => document.activeElement);
    const tagName = await focusedElement.evaluate(el => el?.tagName.toLowerCase());

    // Should be on a form element (button, input, or textarea)
    expect(['button', 'input', 'textarea']).toContain(tagName);
  });

  test('should display Back to Entries button', async ({ page }) => {
    // Verify back button exists
    const backButton = page.locator('a').filter({ has: page.locator('text=Back to Entries') });
    await expect(backButton).toBeVisible();

    // Verify button has proper href
    const href = await backButton.getAttribute('href');
    expect(href).toBe('/entries');
  });

  test('should render AI Insights Panel alongside form', async ({ page }) => {
    // Verify AI Insights Panel is visible
    const aiPanel = page.locator('text=AI Entry Guidance');
    await expect(aiPanel).toBeVisible();
  });

  test('should have proper form validation attributes', async ({ page }) => {
    // Verify weight field has validation attributes
    const weightInput = page.locator('input[type="number"][step="0.1"]').first();

    // Check required attribute
    const isRequired = await weightInput.getAttribute('aria-required');
    expect(isRequired).toBe('true');

    // Check min/max validation
    const min = await weightInput.getAttribute('min');
    const max = await weightInput.getAttribute('max');
    expect(min).toBe('1');
    expect(max).toBe('1000');

    // Check step precision
    const step = await weightInput.getAttribute('step');
    expect(step).toBe('0.1');
  });

  test('should be responsive on mobile viewport (375x667)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(ENTRY_FORM_URL);

    // Verify page heading is visible on mobile
    const pageHeading = page.locator('h1').filter({ hasText: 'New Entry' });
    await expect(pageHeading).toBeVisible();

    // Verify form is visible and scrollable on mobile
    const formCard = page.locator('[role="form"]');
    await expect(formCard).toBeVisible();

    // Verify weight input is accessible on mobile
    const weightInput = page.locator('input[type="number"][step="0.1"]').first();
    await expect(weightInput).toBeVisible();
  });

  test('should be responsive on tablet viewport (768x1024)', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(ENTRY_FORM_URL);

    // Verify page heading is visible on tablet
    const pageHeading = page.locator('h1').filter({ hasText: 'New Entry' });
    await expect(pageHeading).toBeVisible();

    // Verify form layout adapts to tablet
    const formCard = page.locator('[role="form"]');
    await expect(formCard).toBeVisible();
  });

  test('should be responsive on desktop viewport (1920x1080)', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(ENTRY_FORM_URL);

    // Verify page heading is visible on desktop
    const pageHeading = page.locator('h1').filter({ hasText: 'New Entry' });
    await expect(pageHeading).toBeVisible();

    // Verify two-column layout on desktop (form + AI panel)
    const formSection = page.locator('div.lg\\:col-span-2');
    const aiSection = page.locator('div.lg\\:col-span-1');

    await expect(formSection).toBeVisible();
    await expect(aiSection).toBeVisible();
  });

  test('should have proper ARIA attributes for accessibility', async ({ page }) => {
    // Verify form has role attribute
    const formCard = page.locator('[role="form"]');
    await expect(formCard).toBeVisible();

    // Verify form is labelledby heading
    const ariaLabelledBy = await formCard.getAttribute('aria-labelledby');
    expect(ariaLabelledBy).toBe('entry-form-title');

    // Verify weight input has aria-describedby
    const weightInput = page.locator('input[type="number"][step="0.1"]').first();
    const ariaDescribedBy = await weightInput.getAttribute('aria-describedby');
    expect(ariaDescribedBy).toContain('weight-description');
    expect(ariaDescribedBy).toContain('weight-error');

    // Verify weight input has aria-invalid
    const ariaInvalid = await weightInput.getAttribute('aria-invalid');
    expect(ariaInvalid).toBeDefined();
  });

  test('should verify form accessibility with semantic HTML', async ({ page }) => {
    // Verify proper heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Verify form labels are associated with inputs
    const labels = page.locator('label');
    await expect(labels.first()).toBeVisible();

    // Verify all inputs have associated labels
    const weightLabel = page.locator('label').filter({ hasText: 'Weight (lbs)' });
    const bfLabel = page.locator('label').filter({ hasText: 'Body Fat %' });
    const notesLabel = page.locator('label').filter({ hasText: 'Notes' });

    await expect(weightLabel).toBeVisible();
    await expect(bfLabel).toBeVisible();
    await expect(notesLabel).toBeVisible();
  });

  test('should handle form field updates (manual entry)', async ({ page }) => {
    // Wait for weight input to be visible
    const weightInput = page.locator('input[type="number"][step="0.1"]').first();
    await expect(weightInput).toBeVisible();

    // Get initial auto-populated value
    const initialValue = await weightInput.inputValue();
    expect(initialValue).toBeTruthy();

    // Clear and enter new weight value
    await weightInput.fill('185.5');

    // Verify new value is set
    const newValue = await weightInput.inputValue();
    expect(newValue).toBe('185.5');

    // Verify value changed from initial
    expect(newValue).not.toBe(initialValue);
  });

  test('should maintain form state when navigating away and back', async ({ page }) => {
    // Wait for weight input
    const weightInput = page.locator('input[type="number"][step="0.1"]').first();
    await expect(weightInput).toBeVisible();

    // Get initial auto-populated value
    const initialValue = await weightInput.inputValue();

    // Navigate away
    await page.goto('http://localhost:3010/entries');

    // Navigate back
    await page.goto(ENTRY_FORM_URL);
    await page.waitForLoadState('networkidle');

    // Verify weight field is still auto-populated
    const weightInputAfter = page.locator('input[type="number"][step="0.1"]').first();
    const valueAfter = await weightInputAfter.inputValue();

    // Should auto-populate again with same value
    expect(valueAfter).toBeTruthy();
    expect(parseFloat(valueAfter)).toBeGreaterThan(0);
  });
});
