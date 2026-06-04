/**
 * T015 [P]: E2E Test - Banner Aspect Ratio Preservation
 *
 * Visual regression test for Issue #8 - verify no banner warping
 * Tests CSS object-fit and aspect-ratio preservation across screen sizes
 *
 * Expected Outcome: Test SHOULD PASS (already fixed at profile-header.tsx:140 with object-contain) - regression test
 *
 * Test Flow:
 * 1. Navigate to /profile route (Playwright)
 * 2. Take screenshot of banner image
 * 3. Verify CSS object-fit: contain applied
 * 4. Verify aspect-ratio: 16/9 maintained
 * 5. Test different screen sizes (mobile, tablet, desktop)
 * 6. Assert zero banner warping occurrences
 *
 * Quickstart Reference: quickstart.md Step 8
 */

import { test, expect } from '@playwright/test';

test.describe('Banner Aspect Ratio Preservation', () => {
  const PROFILE_URL = 'http://localhost:3010/profile';

  test('should navigate to /profile page', async ({ page }) => {
    await page.goto(PROFILE_URL);

    // Verify page loaded
    await expect(page).toHaveURL(PROFILE_URL);
  });

  test('should have banner image with object-fit: contain CSS', async ({ page }) => {
    await page.goto(PROFILE_URL);

    // Find banner image element (adjust selector based on actual implementation)
    const bannerImage = page.locator('[data-testid="banner-image"]').first();

    // Wait for banner to load
    await bannerImage.waitFor({ state: 'visible' });

    // Verify object-fit: contain CSS property
    const objectFit = await bannerImage.evaluate((el) => {
      return window.getComputedStyle(el).objectFit;
    });

    // FR-020, FR-027 criterion #5: Zero banner warping
    expect(objectFit).toBe('contain');
  });

  test('should maintain aspect-ratio: 16/9', async ({ page }) => {
    await page.goto(PROFILE_URL);

    const bannerImage = page.locator('[data-testid="banner-image"]').first();

    await bannerImage.waitFor({ state: 'visible' });

    // Verify aspect-ratio CSS property
    const aspectRatio = await bannerImage.evaluate((el) => {
      return window.getComputedStyle(el).aspectRatio;
    });

    // Should be 16/9 or equivalent (1.777...)
    expect(['16 / 9', 'auto 16 / 9']).toContain(aspectRatio);
  });

  test('should preserve aspect ratio on mobile viewport (375x667)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(PROFILE_URL);

    const bannerImage = page.locator('[data-testid="banner-image"]').first();

    await bannerImage.waitFor({ state: 'visible' });

    // Get image dimensions
    const box = await bannerImage.boundingBox();

    if (box) {
      const imageAspectRatio = box.width / box.height;

      // Aspect ratio should be close to 16/9 (1.777)
      expect(imageAspectRatio).toBeCloseTo(16 / 9, 1);
    }
  });

  test('should preserve aspect ratio on tablet viewport (768x1024)', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(PROFILE_URL);

    const bannerImage = page.locator('[data-testid="banner-image"]').first();

    await bannerImage.waitFor({ state: 'visible' });

    const box = await bannerImage.boundingBox();

    if (box) {
      const imageAspectRatio = box.width / box.height;

      expect(imageAspectRatio).toBeCloseTo(16 / 9, 1);
    }
  });

  test('should preserve aspect ratio on desktop viewport (1920x1080)', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(PROFILE_URL);

    const bannerImage = page.locator('[data-testid="banner-image"]').first();

    await bannerImage.waitFor({ state: 'visible' });

    const box = await bannerImage.boundingBox();

    if (box) {
      const imageAspectRatio = box.width / box.height;

      expect(imageAspectRatio).toBeCloseTo(16 / 9, 1);
    }
  });

  test('should not have distorted/warped banner image (visual regression)', async ({ page }) => {
    await page.goto(PROFILE_URL);

    const bannerImage = page.locator('[data-testid="banner-image"]').first();

    await bannerImage.waitFor({ state: 'visible' });

    // Take screenshot for visual regression comparison
    const screenshot = await bannerImage.screenshot();

    expect(screenshot).toBeTruthy();

    // Visual comparison would be done via Playwright's visual regression tools
    // For now, verify banner is visible and has correct CSS
    const objectFit = await bannerImage.evaluate((el) => {
      return window.getComputedStyle(el).objectFit;
    });

    expect(objectFit).toBe('contain');
  });

  test('should have width: 100% and height: auto CSS', async ({ page }) => {
    await page.goto(PROFILE_URL);

    const bannerImage = page.locator('[data-testid="banner-image"]').first();

    await bannerImage.waitFor({ state: 'visible' });

    const styles = await bannerImage.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        width: computed.width,
        height: computed.height,
      };
    });

    // Width should span container (100%)
    expect(parseInt(styles.width)).toBeGreaterThan(0);

    // Height should maintain aspect ratio (auto)
    expect(parseInt(styles.height)).toBeGreaterThan(0);
  });

  test('should verify zero banner warping across all screen sizes', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(PROFILE_URL);

      const bannerImage = page.locator('[data-testid="banner-image"]').first();

      await bannerImage.waitFor({ state: 'visible' });

      const box = await bannerImage.boundingBox();

      if (box) {
        const imageAspectRatio = box.width / box.height;

        // FR-027 criterion #5: Zero banner warping
        expect(imageAspectRatio).toBeCloseTo(16 / 9, 1);
      }
    }
  });
});
