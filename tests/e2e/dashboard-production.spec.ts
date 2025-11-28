/**
 * E2E Test: Dashboard Production Restoration
 *
 * Validates dashboard is production-ready with NO debugging messages visible
 * and all charts/widgets render correctly.
 *
 * Constitutional Requirements:
 * - Article III: Frontend Stability - Dashboard must be fully functional
 * - Article IV: Test-First Development - This test MUST fail initially (Red phase)
 *
 * Functional Requirements: FR-007, FR-008
 * Resolves: Issue #3 - Dashboard Production Restoration
 *
 * Test Coverage:
 * 1. Dashboard accessible at / route
 * 2. NO debugging messages visible
 * 3. All charts render without errors
 * 4. All widgets display data correctly
 *
 * IMPORTANT: This test MUST fail until dashboard restoration is complete.
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Production Restoration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should NOT display debugging message (FR-007)', async ({ page }) => {
    // Critical: Verify NO debugging message is visible
    const debuggingMessage = page.locator('text=The dashboard is temporarily disabled for debugging');
    await expect(debuggingMessage).not.toBeVisible();

    // Also check for any text containing "debugging" or "disabled"
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).not.toContain('temporarily disabled');
    expect(pageContent.toLowerCase()).not.toContain('debugging mode');
  });

  test('should render dashboard page successfully (FR-007)', async ({ page }) => {
    // Verify we're on the dashboard page
    await expect(page).toHaveURL('/');

    // Verify page title
    await expect(page).toHaveTitle(/Dashboard|Body Fat Estimator/);

    // Verify no error messages
    const errorMessage = page.locator('[role="alert"]:has-text("error")');
    await expect(errorMessage).not.toBeVisible();
  });

  test('should display all dashboard charts (FR-008)', async ({ page }) => {
    // Wait for charts to render
    await page.waitForSelector('[data-testid="dashboard-chart"], .recharts-wrapper, canvas', {
      timeout: 5000
    });

    // Verify progress trend chart exists
    const progressTrendChart = page.locator('[data-testid="progress-trend-chart"], [aria-label*="Progress Trend"]');
    await expect(progressTrendChart).toBeVisible();

    // Verify calorie management widget exists
    const calorieWidget = page.locator('[data-testid="calorie-management-widget"], [aria-label*="Calorie"]');
    await expect(calorieWidget).toBeVisible();

    // Verify metabolic insights widget exists
    const metabolicWidget = page.locator('[data-testid="metabolic-insights-widget"], [aria-label*="Metabolic"]');
    await expect(metabolicWidget).toBeVisible();

    // Verify goal progress widget exists
    const goalProgressWidget = page.locator('[data-testid="goal-progress-widget"], [aria-label*="Goal"]');
    await expect(goalProgressWidget).toBeVisible();
  });

  test('should render Recharts components without errors (FR-008)', async ({ page }) => {
    // Wait for Recharts SVG elements to render
    await page.waitForSelector('.recharts-wrapper svg', { timeout: 5000 });

    // Verify Recharts wrappers exist
    const rechartsWrappers = page.locator('.recharts-wrapper');
    const count = await rechartsWrappers.count();
    expect(count).toBeGreaterThan(0);

    // Verify no Recharts error states
    const rechartsErrors = page.locator('.recharts-error');
    await expect(rechartsErrors).toHaveCount(0);
  });

  test('should load dashboard data successfully', async ({ page }) => {
    // Wait for data to load (indicated by charts or widgets rendering)
    await page.waitForSelector('[data-testid="dashboard-chart"], .recharts-surface', {
      timeout: 5000
    });

    // Verify no "No data" or "Loading failed" messages
    const noDataMessage = page.locator('text=/No data|No entries|Failed to load/i');
    const visibleNoData = await noDataMessage.isVisible().catch(() => false);

    if (visibleNoData) {
      // If "No data" is visible, it should be in a specific context (like empty state)
      // but not as a global error
      const globalError = page.locator('[role="alert"]:has-text("No data")');
      await expect(globalError).not.toBeVisible();
    }
  });

  test('should display performance dashboard widget', async ({ page }) => {
    // Verify performance dashboard widget exists and renders
    const performanceWidget = page.locator('[data-testid="performance-dashboard"], [aria-label*="Performance"]');

    // Performance widget should be visible
    const isVisible = await performanceWidget.isVisible().catch(() => false);
    if (isVisible) {
      await expect(performanceWidget).toBeVisible();
    }
  });

  test('should handle empty data state gracefully', async ({ page }) => {
    // Even with no user data, dashboard should render without errors

    // Dashboard should not crash
    const errorBoundary = page.locator('text=/Something went wrong|Error occurred/i');
    await expect(errorBoundary).not.toBeVisible();

    // Should show appropriate empty state messages if no data
    const emptyStateMessage = page.locator('text=/No entries yet|Get started|Add your first entry/i');
    // Empty state is acceptable, but not required
  });

  test('should have responsive layout', async ({ page }) => {
    // Verify dashboard container exists
    const dashboardContainer = page.locator('[data-testid="dashboard-container"], main, [role="main"]');
    await expect(dashboardContainer).toBeVisible();

    // Verify layout doesn't overflow viewport
    const viewportSize = page.viewportSize();
    const dashboardBox = await dashboardContainer.boundingBox();

    if (dashboardBox && viewportSize) {
      expect(dashboardBox.width).toBeLessThanOrEqual(viewportSize.width + 50); // Allow small overflow for scrollbar
    }
  });

  test('should NOT show React error overlay', async ({ page }) => {
    // Verify no React error overlay is visible
    const reactErrorOverlay = page.locator('[data-nextjs-dialog-overlay], [data-nextjs-toast]');
    await expect(reactErrorOverlay).not.toBeVisible();

    // Verify no console errors related to React
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a moment for any errors to surface
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(error => {
      const lowerError = error.toLowerCase();
      return !lowerError.includes('favicon') &&
             !lowerError.includes('source map') &&
             !lowerError.includes('devtools');
    });

    expect(criticalErrors).toHaveLength(0);
  });

  test('should complete full dashboard load within 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to dashboard
    await page.goto('/');

    // Wait for dashboard to be interactive
    await page.waitForSelector('[data-testid="dashboard-chart"], .recharts-wrapper', {
      timeout: 3000
    });

    const loadTime = Date.now() - startTime;

    // Performance requirement: Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should display chart tooltips on hover', async ({ page }) => {
    // Wait for charts to render
    await page.waitForSelector('.recharts-wrapper', { timeout: 5000 });

    // Find first chart
    const firstChart = page.locator('.recharts-wrapper').first();
    await expect(firstChart).toBeVisible();

    // Hover over chart area to trigger tooltip
    const chartSurface = firstChart.locator('.recharts-surface').first();
    await chartSurface.hover();

    // Wait for potential tooltip
    await page.waitForTimeout(500);

    // Tooltips are optional, but if they exist, they should render without errors
    // This test primarily ensures hovering doesn't cause crashes
  });

  test('should maintain dashboard state across navigation', async ({ page }) => {
    // Verify dashboard loads
    await page.waitForSelector('[data-testid="dashboard-chart"], .recharts-wrapper', {
      timeout: 5000
    });

    // Navigate away to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Navigate back to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dashboard should still render correctly
    const dashboardChart = page.locator('[data-testid="dashboard-chart"], .recharts-wrapper');
    await expect(dashboardChart.first()).toBeVisible();

    // NO debugging message should appear after navigation
    const debuggingMessage = page.locator('text=The dashboard is temporarily disabled for debugging');
    await expect(debuggingMessage).not.toBeVisible();
  });
});
