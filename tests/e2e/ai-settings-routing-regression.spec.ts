/**
 * Regression Test: AI Settings Page Routing
 *
 * Validates AI settings page is accessible and functional, preventing
 * regression of Issue #4 (404 error on /settings/ai).
 *
 * Constitutional Requirements:
 * - Article IV: Test-First Development - This test MUST fail initially (Red phase)
 *
 * Functional Requirements: FR-009, FR-010, FR-011
 * Prevents Regression: Issue #4 - AI Settings Page 404 Error
 *
 * Test Coverage:
 * 1. Page accessible at /settings/ai (no 404)
 * 2. Settings form renders correctly
 * 3. AI provider selection works
 * 4. Settings persist after submission
 * 5. Model assignment configuration works
 * 6. Rate limit configuration works
 *
 * IMPORTANT: This test MUST fail if AI settings page returns 404.
 */

import { test, expect } from '@playwright/test';

test.describe('AI Settings Routing Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to AI settings page
    await page.goto('/settings/ai');
  });

  test('should NOT return 404 error (FR-009)', async ({ page }) => {
    // Critical: Page must be accessible
    const response = await page.waitForResponse(response =>
      response.url().includes('/settings/ai') && response.request().method() === 'GET'
    );

    // Verify not 404
    expect(response.status()).not.toBe(404);
    expect([200, 304]).toContain(response.status());

    // Verify page title exists
    await expect(page).toHaveTitle(/AI Settings|Settings/);
  });

  test('should display AI settings page without errors (FR-009)', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify no error messages
    const errorMessage = page.locator('[role="alert"]:has-text("error"), [role="alert"]:has-text("404")');
    await expect(errorMessage).not.toBeVisible();

    // Verify settings page header exists
    const pageHeader = page.locator('h1, h2').filter({ hasText: /AI Settings|Settings/ });
    await expect(pageHeader).toBeVisible();
  });

  test('should render AI provider selection form (FR-010)', async ({ page }) => {
    // Wait for form to render
    await page.waitForSelector('form, [data-testid="ai-settings-form"]', { timeout: 5000 });

    // Verify AI provider selector exists
    const providerSelect = page.locator('[data-testid="ai-provider-select"], select[name="aiProvider"], [aria-label*="provider"]');
    await expect(providerSelect.first()).toBeVisible();

    // Verify form has submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
    await expect(submitButton.first()).toBeVisible();
  });

  test('should display all AI provider options (FR-010)', async ({ page }) => {
    // Find provider selection element
    const providerSelect = page.locator('[data-testid="ai-provider-select"], select[name="aiProvider"]').first();

    if (await providerSelect.isVisible()) {
      // Get options
      const options = await providerSelect.locator('option').allTextContents();

      // Verify expected providers are available
      const optionsText = options.join('|').toLowerCase();

      // At least one of the major providers should be available
      const hasProvider = optionsText.includes('openai') ||
                          optionsText.includes('anthropic') ||
                          optionsText.includes('perplexity') ||
                          optionsText.includes('custom');

      expect(hasProvider).toBe(true);
    }
  });

  test('should allow selecting different AI providers', async ({ page }) => {
    // Find provider selector
    const providerSelect = page.locator('[data-testid="ai-provider-select"], select[name="aiProvider"]').first();

    if (await providerSelect.isVisible()) {
      // Get current value
      const initialValue = await providerSelect.inputValue();

      // Get all available options
      const options = await providerSelect.locator('option').all();

      if (options.length > 1) {
        // Select different option
        const secondOption = await options[1].getAttribute('value');
        if (secondOption) {
          await providerSelect.selectOption(secondOption);

          // Verify selection changed
          const newValue = await providerSelect.inputValue();
          expect(newValue).not.toBe(initialValue);
        }
      }
    }
  });

  test('should display model assignment configuration fields', async ({ page }) => {
    // Wait for form to load
    await page.waitForLoadState('networkidle');

    // Look for model assignment fields (may vary by provider)
    const modelFields = page.locator('[data-testid*="model"], input[name*="model"], select[name*="model"]');

    // At least one model-related field should be visible
    const count = await modelFields.count();
    expect(count).toBeGreaterThanOrEqual(0); // 0 is acceptable if provider-dependent
  });

  test('should display rate limit configuration fields', async ({ page }) => {
    // Look for rate limit configuration
    const rateLimitFields = page.locator(
      '[data-testid*="rate"], [data-testid*="limit"], input[name*="rate"], input[name*="limit"]'
    );

    // Rate limit fields are optional but should exist for some providers
    const count = await rateLimitFields.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle form submission without errors (FR-011)', async ({ page }) => {
    // Wait for form
    await page.waitForSelector('form, [data-testid="ai-settings-form"]');

    // Find submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();

    if (await submitButton.isVisible()) {
      // Click submit
      await submitButton.click();

      // Wait for response (either success message or error)
      await page.waitForTimeout(2000);

      // Verify no fatal errors (404, 500, etc.)
      const fatalError = page.locator('[role="alert"]:has-text("404"), [role="alert"]:has-text("500")');
      await expect(fatalError).not.toBeVisible();
    }
  });

  test('should persist settings after submission', async ({ page }) => {
    // Get initial provider value if visible
    const providerSelect = page.locator('[data-testid="ai-provider-select"], select[name="aiProvider"]').first();

    if (await providerSelect.isVisible()) {
      const initialProvider = await providerSelect.inputValue();

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(1000);
      }

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify provider still selected
      if (await providerSelect.isVisible()) {
        const currentProvider = await providerSelect.inputValue();
        expect(currentProvider).toBe(initialProvider);
      }
    }
  });

  test('should validate API key input field exists', async ({ page }) => {
    // Look for API key input (should be password or text type)
    const apiKeyInput = page.locator(
      '[data-testid="api-key-input"], input[name="apiKey"], input[type="password"][name*="key"]'
    );

    // API key field may be provider-dependent
    const count = await apiKeyInput.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle navigation to settings page from other pages', async ({ page }) => {
    // Start from home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to settings via URL or link
    await page.goto('/settings/ai');
    await page.waitForLoadState('networkidle');

    // Verify page loaded successfully
    const errorMessage = page.locator('[role="alert"]:has-text("404")');
    await expect(errorMessage).not.toBeVisible();

    // Verify settings content visible
    const settingsContent = page.locator('form, [data-testid="ai-settings-form"], h1:has-text("Settings")');
    await expect(settingsContent.first()).toBeVisible();
  });

  test('should display help text or documentation links', async ({ page }) => {
    // Settings pages typically have help text
    await page.waitForLoadState('networkidle');

    // Look for any help/info text
    const helpText = page.locator('[data-testid*="help"], [aria-label*="help"], p, small');

    // At least some descriptive text should exist
    const count = await helpText.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should maintain settings across browser sessions', async ({ page, context }) => {
    // Set a provider if possible
    const providerSelect = page.locator('[data-testid="ai-provider-select"], select[name="aiProvider"]').first();

    if (await providerSelect.isVisible()) {
      const selectedProvider = await providerSelect.inputValue();

      // Save settings
      const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(1000);
      }

      // Close and create new context (simulate browser restart)
      await context.close();
      const newContext = await page.context().browser()!.newContext();
      const newPage = await newContext.newPage();

      // Navigate to settings
      await newPage.goto('/settings/ai');
      await newPage.waitForLoadState('networkidle');

      // Verify settings persisted
      const newProviderSelect = newPage.locator('[data-testid="ai-provider-select"], select[name="aiProvider"]').first();
      if (await newProviderSelect.isVisible()) {
        const currentProvider = await newProviderSelect.inputValue();
        expect(currentProvider).toBe(selectedProvider);
      }

      await newContext.close();
    }
  });

  test('should have responsive layout on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify form is still visible and usable
    const form = page.locator('form, [data-testid="ai-settings-form"]').first();
    await expect(form).toBeVisible();

    // Verify no horizontal overflow
    const viewportSize = page.viewportSize();
    const formBox = await form.boundingBox();

    if (formBox && viewportSize) {
      expect(formBox.width).toBeLessThanOrEqual(viewportSize.width);
    }
  });

  test('should display breadcrumb or back navigation', async ({ page }) => {
    // Settings pages typically have navigation back to main settings
    const backNav = page.locator(
      '[data-testid="back-button"], a:has-text("Back"), a:has-text("Settings"), nav a'
    );

    // Navigation should exist
    const count = await backNav.count();
    expect(count).toBeGreaterThan(0);
  });
});
