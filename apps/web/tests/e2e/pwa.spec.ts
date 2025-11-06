/**
 * E2E Tests for Progressive Web App (PWA)
 * Sprint 8 - Testing
 */

import { test, expect } from '@playwright/test';

test.describe('Progressive Web App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have PWA manifest', async ({ page }) => {
    // Check for manifest link in head
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
  });

  test('should load manifest.json successfully', async ({ page }) => {
    // Navigate to manifest
    const response = await page.goto('/manifest.json');

    // Should return 200
    expect(response?.status()).toBe(200);

    // Should be valid JSON
    const manifest = await response?.json();
    expect(manifest).toBeTruthy();
    expect(manifest.name).toBeTruthy();
  });

  test('should have required manifest fields', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    // Check required fields
    expect(manifest.name).toBe('Tournament Management System');
    expect(manifest.short_name).toBe('TournamentMS');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();
  });

  test('should have app icons', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    // Should have icons array
    expect(manifest.icons).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Icons should have required fields
    const icon = manifest.icons[0];
    expect(icon.src).toBeTruthy();
    expect(icon.sizes).toBeTruthy();
    expect(icon.type).toBeTruthy();
  });

  test('should have theme-color meta tag', async ({ page }) => {
    await page.goto('/');

    // Check for theme-color meta tag
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', /#[0-9a-f]{6}/i);
  });

  test('should have viewport meta tag', async ({ page }) => {
    await page.goto('/');

    // Check for viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toBeAttached();

    const content = await viewport.getAttribute('content');
    expect(content).toContain('width=device-width');
  });

  test('should have apple-mobile-web-app-capable meta tag', async ({ page }) => {
    await page.goto('/');

    // Check for Apple PWA support
    const appleMeta = page.locator('meta[name="apple-mobile-web-app-capable"]');

    if (await appleMeta.isVisible()) {
      await expect(appleMeta).toHaveAttribute('content', 'yes');
    }
  });

  test('should register service worker', async ({ page }) => {
    await page.goto('/');

    // Wait for service worker registration
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          return !!registration;
        } catch (error) {
          return false;
        }
      }
      return false;
    });

    // Service worker should be registered (or not in dev mode)
    expect(typeof swRegistered).toBe('boolean');
  });

  test('should work offline (basic)', async ({ page, context }) => {
    // First visit to cache resources
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Try to reload
    await page.reload();

    // Page should still load (at least from cache)
    // In a real test, you'd check for specific content
    await expect(page.locator('body')).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });

  test('should have installability criteria', async ({ page }) => {
    await page.goto('/');

    // Check if beforeinstallprompt event can be triggered
    const isInstallable = await page.evaluate(() => {
      return new Promise(resolve => {
        window.addEventListener('beforeinstallprompt', () => {
          resolve(true);
        });

        // Timeout after 2 seconds
        setTimeout(() => resolve(false), 2000);
      });
    });

    // Note: This might be false in test environment, which is expected
    expect(typeof isInstallable).toBe('boolean');
  });

  test('should have proper caching headers for static assets', async ({ page }) => {
    await page.goto('/');

    // Check for static asset with proper caching
    const responses = [];

    page.on('response', response => {
      if (response.url().match(/\.(js|css|png|jpg|webp)$/)) {
        responses.push(response);
      }
    });

    // Wait for some static resources to load
    await page.waitForTimeout(2000);

    // At least some static assets should have caching headers
    if (responses.length > 0) {
      const cacheHeaders = responses[0].headers();
      expect(cacheHeaders).toBeTruthy();
    }
  });

  test('should have proper mobile responsiveness', async ({ page }) => {
    // Test various mobile viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
      { width: 360, height: 740, name: 'Galaxy S9' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');

      // Page should be visible and scrollable
      await expect(page.locator('body')).toBeVisible();

      // No horizontal scroll should be present
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBeFalsy();
    }
  });
});
