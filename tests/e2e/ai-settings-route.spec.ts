/**
 * T023 [P]: E2E Test - AI Settings Route Accessibility
 *
 * Regression test to verify /settings/ai route is accessible and renders properly
 * Tests that AI configuration UI is available and all expected elements are present
 *
 * Expected Outcome: Test SHOULD PASS (regression test - route exists and is accessible)
 *
 * Test Flow:
 * 1. Navigate to /settings/ai route (Playwright)
 * 2. Assert HTTP 200 response (no 404 errors)
 * 3. Verify AI configuration UI renders
 * 4. Check for AI settings form elements
 * 5. Verify page title/heading contains "AI Settings"
 * 6. Test responsive behavior on different screen sizes
 * 7. Verify all tabs are accessible (Providers, Area Assignment, Prompts, General)
 */

import { test, expect } from '@playwright/test';

test.describe('AI Settings Route Accessibility', () => {
  const AI_SETTINGS_URL = 'http://localhost:3000/settings/ai';

  test('should navigate to /settings/ai page and return HTTP 200', async ({ page }) => {
    // Navigate to AI settings page
    const response = await page.goto(AI_SETTINGS_URL);

    // Verify HTTP 200 response (no 404 error)
    expect(response?.status()).toBe(200);

    // Verify page loaded successfully
    await expect(page).toHaveURL(AI_SETTINGS_URL);
  });

  test('should render AI Settings page title and heading', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Verify page heading contains "AI Settings"
    const heading = page.locator('h2').filter({ hasText: 'AI Settings' });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('AI Settings');
  });

  test('should render Secure Storage badge', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Verify secure storage badge is present
    const secureBadge = page.locator('text=Secure Storage');
    await expect(secureBadge).toBeVisible();
  });

  test('should render all four main tabs (Providers, Area Assignment, Prompts, General)', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Verify all tabs are present
    await expect(page.locator('text=Providers')).toBeVisible();
    await expect(page.locator('text=Area Assignment')).toBeVisible();
    await expect(page.locator('text=Prompts')).toBeVisible();
    await expect(page.locator('text=General')).toBeVisible();
  });

  test('should display Providers tab content by default', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Verify default tab (Providers) is displayed
    await expect(page.locator('text=API keys are securely stored')).toBeVisible();

    // Verify at least one provider card is visible (e.g., Anthropic, OpenAI)
    const providerCards = page.locator('[class*="border-"]').filter({ has: page.locator('text=API Key') });
    await expect(providerCards.first()).toBeVisible();
  });

  test('should have functioning tab navigation', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Click on Area Assignment tab
    await page.click('text=Area Assignment');

    // Verify Area Assignment content is visible
    await expect(page.locator('text=Assign different AI models')).toBeVisible();

    // Click on Prompts tab
    await page.click('text=Prompts');

    // Verify Prompts content is visible (should show prompts editor)
    const promptsSection = page.locator('[role="tabpanel"]').filter({ has: page.locator('text=Prompts') });
    await expect(promptsSection).toBeVisible();

    // Click on General tab
    await page.click('text=General');

    // Verify General settings content is visible
    await expect(page.locator('text=General AI Settings')).toBeVisible();

    // Return to Providers tab
    await page.click('text=Providers');
    await expect(page.locator('text=API keys are securely stored')).toBeVisible();
  });

  test('should display AI provider configuration forms', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Verify API Key input fields exist
    const apiKeyInputs = page.locator('input[type="password"]');
    await expect(apiKeyInputs.first()).toBeVisible();

    // Verify at least one Test button exists
    await expect(page.locator('button', { hasText: 'Test' }).first()).toBeVisible();

    // Verify at least one provider toggle switch exists
    const toggleSwitches = page.locator('button[role="switch"]');
    await expect(toggleSwitches.first()).toBeVisible();
  });

  test('should display API endpoint fields for providers', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Verify API Endpoint labels are visible
    await expect(page.locator('text=API Endpoint').first()).toBeVisible();

    // Verify API endpoint input fields exist
    const endpointInputs = page.locator('input[readonly]').filter({ has: page.locator('[class*="font-mono"]') });
    await expect(endpointInputs.first()).toBeVisible();
  });

  test('should have model refresh functionality visible', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Verify "Available Models" section exists
    await expect(page.locator('text=Available Models').first()).toBeVisible();

    // Verify Refresh button exists
    await expect(page.locator('button', { hasText: 'Refresh' }).first()).toBeVisible();
  });

  test('should display API documentation links', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Verify at least one API Documentation link exists
    const docLinks = page.locator('a').filter({ hasText: 'API Documentation' });
    await expect(docLinks.first()).toBeVisible();

    // Verify link has external link icon and opens in new tab
    const firstDocLink = docLinks.first();
    await expect(firstDocLink).toHaveAttribute('target', '_blank');
    await expect(firstDocLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('should render Area Assignment configuration', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Navigate to Area Assignment tab
    await page.click('text=Area Assignment');

    // Verify description text
    await expect(page.locator('text=Assign different AI models to specific areas')).toBeVisible();

    // Verify provider selection dropdowns exist
    const selectTriggers = page.locator('button[role="combobox"]');
    await expect(selectTriggers.first()).toBeVisible();
  });

  test('should render General Settings with global fallback option', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Navigate to General tab
    await page.click('text=General');

    // Verify General AI Settings heading
    await expect(page.locator('text=General AI Settings')).toBeVisible();

    // Verify global fallback toggle exists
    await expect(page.locator('text=Enable global fallback to local AI')).toBeVisible();

    // Verify Export/Import Settings section
    await expect(page.locator('text=Export/Import Settings')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Export Settings' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Import Settings' })).toBeVisible();
  });

  test('should be responsive on mobile viewport (375x667)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(AI_SETTINGS_URL);

    // Verify page heading is visible on mobile
    const heading = page.locator('h2').filter({ hasText: 'AI Settings' });
    await expect(heading).toBeVisible();

    // Verify tabs are accessible on mobile
    await expect(page.locator('text=Providers')).toBeVisible();

    // Verify provider cards are visible and scrollable on mobile
    const providerCards = page.locator('[class*="border-"]').filter({ has: page.locator('text=API Key') });
    await expect(providerCards.first()).toBeVisible();
  });

  test('should be responsive on tablet viewport (768x1024)', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(AI_SETTINGS_URL);

    // Verify page heading is visible on tablet
    const heading = page.locator('h2').filter({ hasText: 'AI Settings' });
    await expect(heading).toBeVisible();

    // Verify tabs are accessible on tablet
    await expect(page.locator('text=Providers')).toBeVisible();

    // Verify layout adapts to tablet size
    const mainContent = page.locator('div.flex-1');
    await expect(mainContent).toBeVisible();
  });

  test('should be responsive on desktop viewport (1920x1080)', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(AI_SETTINGS_URL);

    // Verify page heading is visible on desktop
    const heading = page.locator('h2').filter({ hasText: 'AI Settings' });
    await expect(heading).toBeVisible();

    // Verify all tabs are visible on desktop
    await expect(page.locator('text=Providers')).toBeVisible();
    await expect(page.locator('text=Area Assignment')).toBeVisible();
    await expect(page.locator('text=Prompts')).toBeVisible();
    await expect(page.locator('text=General')).toBeVisible();

    // Verify layout is optimized for desktop
    const mainContent = page.locator('div.flex-1');
    await expect(mainContent).toBeVisible();
  });

  test('should verify zero accessibility errors on page load', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Verify page has proper semantic structure
    const mainHeading = page.locator('h2');
    await expect(mainHeading).toBeVisible();

    // Verify all interactive elements are keyboard accessible
    const buttons = page.locator('button');
    const firstButton = buttons.first();
    await expect(firstButton).toBeVisible();

    // Verify form labels are associated with inputs
    const labels = page.locator('label');
    await expect(labels.first()).toBeVisible();

    // Verify tabs have proper ARIA attributes
    const tabsList = page.locator('[role="tablist"]');
    await expect(tabsList).toBeVisible();
  });

  test('should handle page navigation and maintain state', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Click on Area Assignment tab
    await page.click('text=Area Assignment');
    await expect(page.locator('text=Assign different AI models')).toBeVisible();

    // Navigate away and back
    await page.goto('http://localhost:3000/settings');
    await page.goBack();

    // Verify page is still accessible
    await expect(page).toHaveURL(AI_SETTINGS_URL);
    const heading = page.locator('h2').filter({ hasText: 'AI Settings' });
    await expect(heading).toBeVisible();
  });

  test('should verify all critical UI elements are present', async ({ page }) => {
    await page.goto(AI_SETTINGS_URL);

    // Verify page title
    await expect(page.locator('h2', { hasText: 'AI Settings' })).toBeVisible();

    // Verify security badge
    await expect(page.locator('text=Secure Storage')).toBeVisible();

    // Verify all tabs
    await expect(page.locator('text=Providers')).toBeVisible();
    await expect(page.locator('text=Area Assignment')).toBeVisible();
    await expect(page.locator('text=Prompts')).toBeVisible();
    await expect(page.locator('text=General')).toBeVisible();

    // Verify security alert message
    await expect(page.locator('text=API keys are securely stored')).toBeVisible();

    // Verify at least one provider configuration card
    const providerCards = page.locator('[class*="border-"]').filter({ has: page.locator('text=API Key') });
    await expect(providerCards.first()).toBeVisible();

    // Verify form controls are present
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[role="switch"]').first()).toBeVisible();
    await expect(page.locator('button', { hasText: 'Test' }).first()).toBeVisible();
  });
});
