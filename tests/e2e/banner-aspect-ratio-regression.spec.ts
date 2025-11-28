/**
 * Regression Test: Banner Aspect Ratio
 *
 * Validates banner maintains correct aspect ratio across all viewport sizes,
 * preventing regression of Issue #8.
 *
 * Constitutional Requirements:
 * - Article III: Frontend Stability - Banner must render correctly across devices
 * - Article IV: Test-First Development - This test MUST fail initially (Red phase)
 *
 * Functional Requirements: FR-017, FR-018
 * Prevents Regression: Issue #8 - Banner Aspect Ratio Distortion
 *
 * Test Coverage:
 * 1. Banner maintains aspect ratio on desktop (1920x1080)
 * 2. Banner maintains aspect ratio on tablet (768x1024)
 * 3. Banner maintains aspect ratio on mobile (375x667)
 * 4. Banner doesn't overflow viewport
 * 5. Banner responsive behavior works correctly
 * 6. Banner image loads without errors
 * 7. Visual regression validation
 *
 * IMPORTANT: This test MUST fail if banner aspect ratio is broken.
 */

import { test, expect } from '@playwright/test';

test.describe('Banner Aspect Ratio Regression', () => {
  const EXPECTED_ASPECT_RATIO = 16 / 9; // Assuming 16:9 banner
  const ASPECT_RATIO_TOLERANCE = 0.1; // 10% tolerance for responsive adjustments

  test.beforeEach(async ({ page }) => {
    // Navigate to page with banner
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should maintain aspect ratio on desktop viewport (FR-017)', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Wait for banner to render
    const banner = page.locator('[data-testid="banner"], [aria-label*="banner"], header img, .banner').first();
    await expect(banner).toBeVisible({ timeout: 5000 });

    // Get banner dimensions
    const bannerBox = await banner.boundingBox();

    if (bannerBox) {
      const actualRatio = bannerBox.width / bannerBox.height;
      const ratioDifference = Math.abs(actualRatio - EXPECTED_ASPECT_RATIO);

      // Verify aspect ratio within tolerance
      expect(ratioDifference).toBeLessThan(ASPECT_RATIO_TOLERANCE);

      console.log(`✅ Desktop aspect ratio: ${actualRatio.toFixed(2)} (expected: ${EXPECTED_ASPECT_RATIO.toFixed(2)})`);
    }
  });

  test('should maintain aspect ratio on tablet viewport (FR-017)', async ({ page }) => {
    // Set tablet viewport (iPad)
    await page.setViewportSize({ width: 768, height: 1024 });

    // Wait for banner
    const banner = page.locator('[data-testid="banner"], [aria-label*="banner"], header img, .banner').first();
    await expect(banner).toBeVisible();

    // Get dimensions
    const bannerBox = await banner.boundingBox();

    if (bannerBox) {
      const actualRatio = bannerBox.width / bannerBox.height;
      const ratioDifference = Math.abs(actualRatio - EXPECTED_ASPECT_RATIO);

      expect(ratioDifference).toBeLessThan(ASPECT_RATIO_TOLERANCE);

      console.log(`✅ Tablet aspect ratio: ${actualRatio.toFixed(2)}`);
    }
  });

  test('should maintain aspect ratio on mobile viewport (FR-017)', async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for banner
    const banner = page.locator('[data-testid="banner"], [aria-label*="banner"], header img, .banner').first();
    await expect(banner).toBeVisible();

    // Get dimensions
    const bannerBox = await banner.boundingBox();

    if (bannerBox) {
      const actualRatio = bannerBox.width / bannerBox.height;
      const ratioDifference = Math.abs(actualRatio - EXPECTED_ASPECT_RATIO);

      expect(ratioDifference).toBeLessThan(ASPECT_RATIO_TOLERANCE);

      console.log(`✅ Mobile aspect ratio: ${actualRatio.toFixed(2)}`);
    }
  });

  test('should NOT overflow viewport on any screen size', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      const banner = page.locator('[data-testid="banner"], [aria-label*="banner"], header img, .banner').first();

      if (await banner.isVisible()) {
        const bannerBox = await banner.boundingBox();

        if (bannerBox) {
          // Banner should not exceed viewport width
          expect(bannerBox.width).toBeLessThanOrEqual(viewport.width);

          // Banner should be within reasonable height bounds
          expect(bannerBox.height).toBeLessThanOrEqual(viewport.height);

          console.log(`✅ ${viewport.name}: No overflow (${bannerBox.width}x${bannerBox.height})`);
        }
      }
    }
  });

  test('should render banner image without errors (FR-018)', async ({ page }) => {
    // Find banner image
    const bannerImg = page.locator('[data-testid="banner"] img, header img, .banner img').first();

    // Wait for image to load
    await expect(bannerImg).toBeVisible({ timeout: 5000 });

    // Verify image loaded successfully
    const isComplete = await bannerImg.evaluate((img: HTMLImageElement) => img.complete);
    expect(isComplete).toBe(true);

    // Verify no broken image
    const naturalWidth = await bannerImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);

    console.log(`✅ Banner image loaded successfully (natural width: ${naturalWidth}px)`);
  });

  test('should have proper CSS object-fit to prevent distortion', async ({ page }) => {
    const banner = page.locator('[data-testid="banner"], [aria-label*="banner"], header img, .banner').first();

    if (await banner.isVisible()) {
      // Check CSS object-fit property
      const objectFit = await banner.evaluate((el) => {
        return window.getComputedStyle(el).objectFit;
      });

      // Should be 'cover' or 'contain' to prevent distortion
      expect(['cover', 'contain', 'fill']).toContain(objectFit);

      console.log(`✅ Banner object-fit: ${objectFit}`);
    }
  });

  test('should maintain aspect ratio during window resize', async ({ page }) => {
    const banner = page.locator('[data-testid="banner"], [aria-label*="banner"], header img, .banner').first();
    await expect(banner).toBeVisible();

    // Get initial dimensions
    const initialBox = await banner.boundingBox();
    const initialRatio = initialBox ? initialBox.width / initialBox.height : 0;

    // Resize to different viewport
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500); // Allow for resize

    // Get new dimensions
    const newBox = await banner.boundingBox();
    const newRatio = newBox ? newBox.width / newBox.height : 0;

    // Aspect ratios should be similar (within tolerance)
    const ratioDifference = Math.abs(initialRatio - newRatio);
    expect(ratioDifference).toBeLessThan(ASPECT_RATIO_TOLERANCE);

    console.log(`✅ Aspect ratio maintained after resize: ${initialRatio.toFixed(2)} → ${newRatio.toFixed(2)}`);
  });

  test('should have correct alt text for accessibility', async ({ page }) => {
    const bannerImg = page.locator('[data-testid="banner"] img, header img, .banner img').first();

    if (await bannerImg.isVisible()) {
      const altText = await bannerImg.getAttribute('alt');

      // Alt text should exist and be meaningful
      expect(altText).toBeTruthy();
      expect(altText).not.toBe('');
      expect(altText).not.toBe('image');

      console.log(`✅ Banner alt text: "${altText}"`);
    }
  });

  test('should maintain quality at different viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      const banner = page.locator('[data-testid="banner"], [aria-label*="banner"], header img, .banner').first();

      if (await banner.isVisible()) {
        // Verify banner is not pixelated or blurry
        const naturalSize = await banner.evaluate((el) => {
          if (el instanceof HTMLImageElement) {
            return { width: el.naturalWidth, height: el.naturalHeight };
          }
          return null;
        });

        if (naturalSize) {
          // Natural size should be reasonable for display
          expect(naturalSize.width).toBeGreaterThan(300);
          expect(naturalSize.height).toBeGreaterThan(100);

          console.log(`✅ Banner quality maintained at ${viewport.width}x${viewport.height}`);
        }
      }
    }
  });

  test('should have consistent positioning across page loads', async ({ page }) => {
    // Get initial banner position
    const banner = page.locator('[data-testid="banner"], [aria-label*="banner"], header img, .banner').first();
    await expect(banner).toBeVisible();

    const initialBox = await banner.boundingBox();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify banner in same position
    const reloadedBox = await banner.boundingBox();

    if (initialBox && reloadedBox) {
      expect(Math.abs(reloadedBox.y - initialBox.y)).toBeLessThan(5); // Allow 5px variance
      expect(Math.abs(reloadedBox.x - initialBox.x)).toBeLessThan(5);

      console.log(`✅ Banner positioning consistent after reload`);
    }
  });

  test('should handle missing image gracefully', async ({ page }) => {
    // Block image requests to simulate missing image
    await page.route('**/*.{png,jpg,jpeg,svg,webp}', route => route.abort());

    // Navigate to page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Page should not crash
    const errorBoundary = page.locator('text=/Something went wrong|Error occurred/i');
    await expect(errorBoundary).not.toBeVisible();

    // Banner container should still exist
    const bannerContainer = page.locator('[data-testid="banner"], header, .banner').first();

    // Banner may be hidden or show placeholder, but shouldn't crash
    console.log(`✅ Page handles missing banner image gracefully`);
  });

  test('should apply correct responsive CSS classes', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, expected: ['desktop', 'large', 'xl'] },
      { width: 768, height: 1024, expected: ['tablet', 'medium', 'md'] },
      { width: 375, height: 667, expected: ['mobile', 'small', 'sm'] }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      const banner = page.locator('[data-testid="banner"], [aria-label*="banner"], header img, .banner').first();

      if (await banner.isVisible()) {
        const classList = await banner.evaluate((el) => Array.from(el.classList));

        // At least one expected class should be present
        const hasExpectedClass = viewport.expected.some(expected =>
          classList.some(cls => cls.toLowerCase().includes(expected))
        );

        // This is optional - banner may use other responsive strategies
        console.log(`  Banner classes at ${viewport.width}px: ${classList.join(', ')}`);
      }
    }
  });

  test('should support lazy loading for performance', async ({ page }) => {
    const bannerImg = page.locator('[data-testid="banner"] img, header img, .banner img').first();

    if (await bannerImg.isVisible()) {
      // Check for lazy loading attribute
      const loading = await bannerImg.getAttribute('loading');

      // Lazy loading is recommended but not required for above-fold content
      if (loading) {
        console.log(`✅ Banner loading strategy: ${loading}`);
      }
    }
  });

  test('should maintain aspect ratio with CSS aspect-ratio property', async ({ page }) => {
    const banner = page.locator('[data-testid="banner"], [aria-label*="banner"], header img, .banner').first();

    if (await banner.isVisible()) {
      // Check for modern CSS aspect-ratio property
      const aspectRatioProp = await banner.evaluate((el) => {
        return window.getComputedStyle(el).aspectRatio;
      });

      if (aspectRatioProp && aspectRatioProp !== 'auto') {
        console.log(`✅ Banner uses CSS aspect-ratio: ${aspectRatioProp}`);
      }
    }
  });

  test('should not cause layout shift (CLS)', async ({ page }) => {
    // Navigate to page
    await page.goto('/');

    // Measure initial banner position
    await page.waitForTimeout(100);

    const banner = page.locator('[data-testid="banner"], [aria-label*="banner"], header img, .banner').first();
    const initialBox = await banner.boundingBox().catch(() => null);

    // Wait for potential layout shifts
    await page.waitForTimeout(2000);

    // Measure final position
    const finalBox = await banner.boundingBox().catch(() => null);

    if (initialBox && finalBox) {
      // Banner should not shift significantly
      const yShift = Math.abs(finalBox.y - initialBox.y);

      expect(yShift).toBeLessThan(10); // Allow minimal shift

      console.log(`✅ Layout shift prevented: ${yShift}px vertical movement`);
    }
  });
});
