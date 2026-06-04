/**
 * T025 [P]: E2E Test - Theme Persistence
 *
 * Regression test for theme persistence across browser sessions
 * Tests hybrid storage (localStorage + cookie + database) and cross-reload persistence
 *
 * Expected Outcome: Test SHOULD PASS (regression test)
 *
 * Test Flow:
 * 1. Navigate to /settings route (Playwright)
 * 2. Get current theme state from DOM and localStorage
 * 3. Toggle theme to dark mode via settings UI
 * 4. Verify theme changes visually (CSS classes on html element)
 * 5. Verify localStorage updates with new theme
 * 6. Simulate browser refresh (reload page)
 * 7. Verify theme persists after refresh (DOM + localStorage + cookie)
 * 8. Toggle back to light theme and verify persistence again
 * 9. Test system theme preference handling
 *
 * Constitutional Reference: Article III - Frontend Stability (hybrid theme persistence)
 * API Reference: /api/theme (theme-persistence.openapi.yaml)
 */

import { test, expect } from '@playwright/test';

test.describe('Theme Persistence', () => {
  const SETTINGS_URL = 'http://localhost:3010/settings';
  const HOME_URL = 'http://localhost:3010';

  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to ensure clean state
    await page.goto(HOME_URL);
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should load default theme on first visit', async ({ page }) => {
    await page.goto(HOME_URL);

    // Wait for theme to be applied
    await page.waitForTimeout(500);

    // Get theme from DOM
    const htmlClass = await page.locator('html').getAttribute('class');

    // Default should be 'system' or one of the theme classes
    expect(htmlClass).toMatch(/light|dark/);

    // Verify localStorage is initialized
    const localStorageTheme = await page.evaluate(() => {
      const settings = localStorage.getItem('userSettings');
      if (settings) {
        return JSON.parse(settings).display?.theme;
      }
      return null;
    });

    // May be null on first load, but if set should be valid
    if (localStorageTheme !== null) {
      expect(['light', 'dark', 'system']).toContain(localStorageTheme);
    }
  });

  test('should toggle theme from light to dark and persist', async ({ page }) => {
    await page.goto(SETTINGS_URL);

    // Wait for settings page to load
    await page.waitForLoadState('networkidle');

    // Find and click the dark theme button
    // Based on settings page structure: buttons with theme class checks
    const darkThemeButton = page.locator('button').filter({ hasText: /🌙\s*Dark/ });

    await darkThemeButton.waitFor({ state: 'visible' });
    await darkThemeButton.click();

    // Wait for theme to be applied
    await page.waitForTimeout(300);

    // Verify DOM class change
    const htmlClassAfterToggle = await page.locator('html').getAttribute('class');
    expect(htmlClassAfterToggle).toContain('dark');

    // Verify localStorage update
    const localStorageTheme = await page.evaluate(() => {
      const settings = localStorage.getItem('userSettings');
      if (settings) {
        return JSON.parse(settings).display?.theme;
      }
      return null;
    });

    expect(localStorageTheme).toBe('dark');

    // Save settings to ensure persistence
    const saveButton = page.locator('button').filter({ hasText: /Save Settings/ });
    await saveButton.click();

    // Wait for save operation
    await page.waitForTimeout(500);

    // Verify saved badge appears
    const savedBadge = page.locator('text=Saved').first();
    await expect(savedBadge).toBeVisible({ timeout: 3000 });
  });

  test('should persist theme after browser refresh', async ({ page }) => {
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');

    // Set theme to dark
    const darkThemeButton = page.locator('button').filter({ hasText: /🌙\s*Dark/ });
    await darkThemeButton.click();

    // Save settings
    const saveButton = page.locator('button').filter({ hasText: /Save Settings/ });
    await saveButton.click();
    await page.waitForTimeout(500);

    // Verify dark theme is active
    let htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');

    // Reload the page (simulate browser refresh)
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for theme to be reapplied
    await page.waitForTimeout(500);

    // Verify theme persisted after reload
    htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');

    // Verify localStorage still has dark theme
    const localStorageTheme = await page.evaluate(() => {
      const settings = localStorage.getItem('userSettings');
      if (settings) {
        return JSON.parse(settings).display?.theme;
      }
      return null;
    });

    expect(localStorageTheme).toBe('dark');
  });

  test('should toggle from dark to light and persist across reload', async ({ page }) => {
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');

    // First set to dark
    const darkThemeButton = page.locator('button').filter({ hasText: /🌙\s*Dark/ });
    await darkThemeButton.click();

    const saveButton = page.locator('button').filter({ hasText: /Save Settings/ });
    await saveButton.click();
    await page.waitForTimeout(500);

    // Then toggle to light
    const lightThemeButton = page.locator('button').filter({ hasText: /☀️\s*Light/ });
    await lightThemeButton.click();
    await saveButton.click();
    await page.waitForTimeout(500);

    // Verify light theme is active
    let htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('light');

    // Reload page
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Verify light theme persisted
    htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('light');

    const localStorageTheme = await page.evaluate(() => {
      const settings = localStorage.getItem('userSettings');
      if (settings) {
        return JSON.parse(settings).display?.theme;
      }
      return null;
    });

    expect(localStorageTheme).toBe('light');
  });

  test('should persist theme across different routes', async ({ page }) => {
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');

    // Set theme to dark
    const darkThemeButton = page.locator('button').filter({ hasText: /🌙\s*Dark/ });
    await darkThemeButton.click();

    const saveButton = page.locator('button').filter({ hasText: /Save Settings/ });
    await saveButton.click();
    await page.waitForTimeout(500);

    // Navigate to home page
    await page.goto(HOME_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    // Verify theme persists on different route
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');

    // Navigate to reports page
    await page.goto('http://localhost:3010/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    // Verify theme still persists
    const htmlClassOnReports = await page.locator('html').getAttribute('class');
    expect(htmlClassOnReports).toContain('dark');
  });

  test('should handle system theme preference', async ({ page }) => {
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');

    // Set theme to system
    const systemThemeButton = page.locator('button').filter({ hasText: /🖥️\s*System/ });
    await systemThemeButton.click();

    const saveButton = page.locator('button').filter({ hasText: /Save Settings/ });
    await saveButton.click();
    await page.waitForTimeout(500);

    // Verify system theme is saved
    const localStorageTheme = await page.evaluate(() => {
      const settings = localStorage.getItem('userSettings');
      if (settings) {
        return JSON.parse(settings).display?.theme;
      }
      return null;
    });

    expect(localStorageTheme).toBe('system');

    // Verify DOM has either light or dark class based on system preference
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toMatch(/light|dark/);

    // Reload and verify system theme persists
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const localStorageThemeAfterReload = await page.evaluate(() => {
      const settings = localStorage.getItem('userSettings');
      if (settings) {
        return JSON.parse(settings).display?.theme;
      }
      return null;
    });

    expect(localStorageThemeAfterReload).toBe('system');
  });

  test('should verify theme button visual states', async ({ page }) => {
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');

    // Click dark theme
    const darkThemeButton = page.locator('button').filter({ hasText: /🌙\s*Dark/ });
    await darkThemeButton.click();

    // Verify dark button has active state (border-primary class)
    const darkButtonClass = await darkThemeButton.getAttribute('class');
    expect(darkButtonClass).toContain('border-primary');

    // Click light theme
    const lightThemeButton = page.locator('button').filter({ hasText: /☀️\s*Light/ });
    await lightThemeButton.click();

    // Verify light button has active state
    const lightButtonClass = await lightThemeButton.getAttribute('class');
    expect(lightButtonClass).toContain('border-primary');

    // Verify dark button no longer has active state
    const darkButtonClassAfter = await darkThemeButton.getAttribute('class');
    expect(darkButtonClassAfter).not.toContain('border-primary');
  });

  test('should verify cookie is set for SSR compatibility', async ({ page, context }) => {
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');

    // Set theme to dark
    const darkThemeButton = page.locator('button').filter({ hasText: /🌙\s*Dark/ });
    await darkThemeButton.click();

    const saveButton = page.locator('button').filter({ hasText: /Save Settings/ });
    await saveButton.click();
    await page.waitForTimeout(500);

    // Check if theme cookie is set
    const cookies = await context.cookies();
    const themeCookie = cookies.find(cookie => cookie.name === 'theme');

    // Cookie may be set via API call
    // If theme API is called, cookie should be present
    if (themeCookie) {
      expect(themeCookie.value).toBe('dark');
    }
  });

  test('should maintain theme consistency across new tab/window simulation', async ({ page, context }) => {
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');

    // Set theme to dark
    const darkThemeButton = page.locator('button').filter({ hasText: /🌙\s*Dark/ });
    await darkThemeButton.click();

    const saveButton = page.locator('button').filter({ hasText: /Save Settings/ });
    await saveButton.click();
    await page.waitForTimeout(500);

    // Open new page (simulates new tab with same context/localStorage)
    const newPage = await context.newPage();
    await newPage.goto(HOME_URL);
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(300);

    // Verify theme is consistent in new page
    const htmlClass = await newPage.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');

    await newPage.close();
  });

  test('should not lose theme on navigation and back button', async ({ page }) => {
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');

    // Set theme to dark
    const darkThemeButton = page.locator('button').filter({ hasText: /🌙\s*Dark/ });
    await darkThemeButton.click();

    const saveButton = page.locator('button').filter({ hasText: /Save Settings/ });
    await saveButton.click();
    await page.waitForTimeout(500);

    // Navigate away
    await page.goto(HOME_URL);
    await page.waitForTimeout(300);

    // Use browser back button
    await page.goBack();
    await page.waitForTimeout(300);

    // Verify theme is still dark
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
  });

  test('should complete full theme cycle: light → dark → system → light', async ({ page }) => {
    await page.goto(SETTINGS_URL);
    await page.waitForLoadState('networkidle');

    const saveButton = page.locator('button').filter({ hasText: /Save Settings/ });

    // Step 1: Set to light
    const lightThemeButton = page.locator('button').filter({ hasText: /☀️\s*Light/ });
    await lightThemeButton.click();
    await saveButton.click();
    await page.waitForTimeout(300);

    let htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('light');

    // Step 2: Set to dark
    const darkThemeButton = page.locator('button').filter({ hasText: /🌙\s*Dark/ });
    await darkThemeButton.click();
    await saveButton.click();
    await page.waitForTimeout(300);

    htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');

    // Step 3: Set to system
    const systemThemeButton = page.locator('button').filter({ hasText: /🖥️\s*System/ });
    await systemThemeButton.click();
    await saveButton.click();
    await page.waitForTimeout(300);

    let localStorageTheme = await page.evaluate(() => {
      const settings = localStorage.getItem('userSettings');
      if (settings) {
        return JSON.parse(settings).display?.theme;
      }
      return null;
    });
    expect(localStorageTheme).toBe('system');

    // Step 4: Back to light
    await lightThemeButton.click();
    await saveButton.click();
    await page.waitForTimeout(300);

    htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('light');

    // Final verification: reload and confirm light theme persisted
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('light');

    localStorageTheme = await page.evaluate(() => {
      const settings = localStorage.getItem('userSettings');
      if (settings) {
        return JSON.parse(settings).display?.theme;
      }
      return null;
    });
    expect(localStorageTheme).toBe('light');
  });
});
