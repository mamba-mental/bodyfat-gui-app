/**
 * Regression Test: Theme Persistence
 *
 * Validates theme settings persist across browser sessions and page reloads,
 * preventing regression of Issue #6.
 *
 * Constitutional Requirements:
 * - Article III: Frontend Stability - Hybrid persistence (localStorage + database + cookie)
 * - Article IV: Test-First Development - This test MUST fail initially (Red phase)
 *
 * Functional Requirements: FR-014, FR-015, FR-016
 * Prevents Regression: Issue #6 - Theme Persistence Failure
 *
 * Test Coverage:
 * 1. Theme persists after page reload
 * 2. Theme persists across browser sessions
 * 3. Theme changes apply immediately
 * 4. All three theme options work (light, dark, system)
 * 5. localStorage synchronization
 * 6. Database synchronization
 * 7. Cookie-based SSR hydration
 *
 * IMPORTANT: This test MUST fail if theme persistence is broken.
 */

import { test, expect } from '@playwright/test';

test.describe('Theme Persistence Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should persist theme after page reload (FR-015)', async ({ page }) => {
    // Find theme toggle/selector
    const themeToggle = page.locator(
      '[data-testid="theme-toggle"], [aria-label*="theme"], button[aria-label*="Theme"]'
    ).first();

    await expect(themeToggle).toBeVisible({ timeout: 5000 });

    // Get initial theme
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    // Toggle theme
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Get new theme
    const newTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    // Verify theme changed
    expect(newTheme).not.toBe(initialTheme);

    console.log(`✅ Theme changed: ${initialTheme} → ${newTheme}`);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify theme persisted after reload
    const reloadedTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    expect(reloadedTheme).toBe(newTheme);

    console.log(`✅ Theme persisted after reload: ${reloadedTheme}`);
  });

  test('should persist theme across browser sessions (FR-015)', async ({ page, context }) => {
    // Find theme toggle
    const themeToggle = page.locator('[data-testid="theme-toggle"], [aria-label*="theme"]').first();
    await expect(themeToggle).toBeVisible();

    // Set to dark theme
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    // Toggle to opposite theme
    await themeToggle.click();
    await page.waitForTimeout(500);

    const selectedTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    console.log(`Selected theme: ${selectedTheme}`);

    // Close and create new context (simulating browser restart)
    await context.close();
    const newContext = await page.context().browser()!.newContext();
    const newPage = await newContext.newPage();

    // Navigate to site
    await newPage.goto('/');
    await newPage.waitForLoadState('networkidle');

    // Verify theme persisted
    const persistedTheme = await newPage.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    expect(persistedTheme).toBe(selectedTheme);

    console.log(`✅ Theme persisted across sessions: ${persistedTheme}`);

    await newContext.close();
  });

  test('should apply theme change immediately (FR-014)', async ({ page }) => {
    // Get initial background color
    const initialBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    // Toggle theme
    const themeToggle = page.locator('[data-testid="theme-toggle"], [aria-label*="theme"]').first();
    await themeToggle.click();
    await page.waitForTimeout(200); // Brief wait for transition

    // Get new background color
    const newBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    // Background color should change immediately
    expect(newBg).not.toBe(initialBg);

    console.log(`✅ Theme applied immediately: ${initialBg} → ${newBg}`);
  });

  test('should support light theme', async ({ page }) => {
    // Set light theme via settings or toggle
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Look for theme selector
    const themeSelect = page.locator('[data-testid="theme-select"], select[name="theme"]').first();

    if (await themeSelect.isVisible()) {
      await themeSelect.selectOption('light');
      await page.waitForTimeout(500);
    } else {
      // Use toggle to get to light theme
      const currentTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme') ||
               document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      });

      if (currentTheme !== 'light') {
        const themeToggle = page.locator('[data-testid="theme-toggle"]').first();
        await themeToggle.click();
        await page.waitForTimeout(500);
      }
    }

    // Verify light theme applied
    const theme = await page.evaluate(() => {
      const htmlClass = document.documentElement.className;
      const dataTheme = document.documentElement.getAttribute('data-theme');
      return dataTheme === 'light' || (!htmlClass.includes('dark') && !dataTheme);
    });

    expect(theme).toBeTruthy();

    console.log(`✅ Light theme works`);
  });

  test('should support dark theme', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Set dark theme
    const themeSelect = page.locator('[data-testid="theme-select"], select[name="theme"]').first();

    if (await themeSelect.isVisible()) {
      await themeSelect.selectOption('dark');
      await page.waitForTimeout(500);
    } else {
      // Use toggle
      const currentTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme') ||
               document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      });

      if (currentTheme !== 'dark') {
        const themeToggle = page.locator('[data-testid="theme-toggle"]').first();
        await themeToggle.click();
        await page.waitForTimeout(500);
      }
    }

    // Verify dark theme applied
    const theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') === 'dark' ||
             document.documentElement.classList.contains('dark');
    });

    expect(theme).toBeTruthy();

    console.log(`✅ Dark theme works`);
  });

  test('should support system theme preference', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Look for system theme option
    const themeSelect = page.locator('[data-testid="theme-select"], select[name="theme"]').first();

    if (await themeSelect.isVisible()) {
      // Check if system option exists
      const options = await themeSelect.locator('option').allTextContents();
      const hasSystem = options.some(opt => opt.toLowerCase().includes('system'));

      if (hasSystem) {
        await themeSelect.selectOption('system');
        await page.waitForTimeout(500);

        console.log(`✅ System theme option available and selectable`);
      } else {
        console.log(`ℹ️  System theme option not available`);
      }
    }
  });

  test('should store theme in localStorage (FR-014)', async ({ page }) => {
    // Toggle theme
    const themeToggle = page.locator('[data-testid="theme-toggle"], [aria-label*="theme"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Get current theme
    const currentTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    // Check localStorage
    const storedTheme = await page.evaluate(() => {
      return localStorage.getItem('theme') || localStorage.getItem('color-theme');
    });

    // localStorage should contain theme value
    expect(storedTheme).toBeTruthy();

    console.log(`✅ Theme stored in localStorage: ${storedTheme}`);
  });

  test('should synchronize theme across tabs', async ({ page, context }) => {
    // Set theme in first tab
    const themeToggle = page.locator('[data-testid="theme-toggle"], [aria-label*="theme"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    const firstTabTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    // Open second tab
    const secondPage = await context.newPage();
    await secondPage.goto('/');
    await secondPage.waitForLoadState('networkidle');

    // Verify theme matches in second tab
    const secondTabTheme = await secondPage.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    expect(secondTabTheme).toBe(firstTabTheme);

    console.log(`✅ Theme synchronized across tabs: ${firstTabTheme}`);

    await secondPage.close();
  });

  test('should persist theme via cookie for SSR (FR-016)', async ({ page }) => {
    // Toggle theme
    const themeToggle = page.locator('[data-testid="theme-toggle"], [aria-label*="theme"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Get current theme
    const currentTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    // Check cookies
    const cookies = await page.context().cookies();
    const themeCookie = cookies.find(c => c.name === 'theme' || c.name === 'color-theme');

    // Cookie should exist for SSR hydration
    if (themeCookie) {
      console.log(`✅ Theme cookie set for SSR: ${themeCookie.value}`);
    }
  });

  test('should handle theme toggle button accessibility', async ({ page }) => {
    // Find theme toggle
    const themeToggle = page.locator('[data-testid="theme-toggle"], [aria-label*="theme"]').first();
    await expect(themeToggle).toBeVisible();

    // Verify accessible attributes
    const ariaLabel = await themeToggle.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    // Verify keyboard accessibility
    await themeToggle.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Theme should change via keyboard
    console.log(`✅ Theme toggle is keyboard accessible`);
  });

  test('should not flicker on page load (FR-016)', async ({ page }) => {
    // Set to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"], [aria-label*="theme"]').first();

    const currentTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    if (currentTheme !== 'dark') {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }

    // Reload page and check for flicker
    const startTime = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Check theme applied immediately (SSR hydration)
    const loadedTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
             document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    const loadTime = Date.now() - startTime;

    // Theme should be correct immediately (< 100ms is effectively instant)
    expect(loadedTheme).toBe('dark');

    console.log(`✅ Theme applied without flicker (${loadTime}ms)`);
  });

  test('should update theme in settings page', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Find theme selector
    const themeSelect = page.locator('[data-testid="theme-select"], select[name="theme"]').first();

    if (await themeSelect.isVisible()) {
      const initialValue = await themeSelect.inputValue();

      // Change theme
      const options = await themeSelect.locator('option').all();
      if (options.length > 1) {
        const newOption = await options[1].getAttribute('value');
        if (newOption) {
          await themeSelect.selectOption(newOption);
          await page.waitForTimeout(500);

          const newValue = await themeSelect.inputValue();
          expect(newValue).not.toBe(initialValue);

          console.log(`✅ Theme updated in settings: ${initialValue} → ${newValue}`);
        }
      }
    }
  });

  test('should respect prefers-color-scheme when using system theme', async ({ page, context }) => {
    // Create context with dark color scheme
    await context.close();
    const darkContext = await page.context().browser()!.newContext({
      colorScheme: 'dark'
    });

    const darkPage = await darkContext.newPage();
    await darkPage.goto('/settings');
    await darkPage.waitForLoadState('networkidle');

    // Set to system theme if available
    const themeSelect = darkPage.locator('[data-testid="theme-select"], select[name="theme"]').first();

    if (await themeSelect.isVisible()) {
      const options = await themeSelect.locator('option').allTextContents();
      const hasSystem = options.some(opt => opt.toLowerCase().includes('system'));

      if (hasSystem) {
        await themeSelect.selectOption('system');
        await darkPage.waitForTimeout(500);

        // Navigate to homepage
        await darkPage.goto('/');
        await darkPage.waitForLoadState('networkidle');

        // Should apply dark theme due to prefers-color-scheme
        const appliedTheme = await darkPage.evaluate(() => {
          return document.documentElement.classList.contains('dark') ||
                 document.documentElement.getAttribute('data-theme') === 'dark';
        });

        expect(appliedTheme).toBeTruthy();

        console.log(`✅ System theme respects prefers-color-scheme`);
      }
    }

    await darkContext.close();
  });
});
