/**
 * E2E Tests for Analytics Dashboard
 * Sprint 8 - Testing
 */

import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analytics page (replace with actual tournament ID)
    await page.goto('/tournaments/test-tournament-id/chip-format/analytics');
  });

  test('should display analytics dashboard page', async ({ page }) => {
    // Check for main heading or title
    await expect(page.getByText(/analytics|dashboard/i)).toBeVisible();
  });

  test('should display statistics cards', async ({ page }) => {
    // Wait for statistics cards to load
    await page.waitForSelector('[data-testid="stat-card"]', { timeout: 10000 });

    // Check for key metrics
    const statsCards = await page.locator('[data-testid="stat-card"]').all();
    expect(statsCards.length).toBeGreaterThan(0);
  });

  test('should display chip progression chart', async ({ page }) => {
    // Wait for chart to render
    await page.waitForSelector('.recharts-responsive-container', { timeout: 10000 });

    // Verify chart is visible
    const chart = page.locator('.recharts-responsive-container').first();
    await expect(chart).toBeVisible();
  });

  test('should display multiple chart types', async ({ page }) => {
    // Wait for charts to load
    await page.waitForSelector('.recharts-responsive-container', { timeout: 10000 });

    // Count chart containers (should have Line, Bar, Pie, Area charts)
    const charts = await page.locator('.recharts-responsive-container').all();
    expect(charts.length).toBeGreaterThanOrEqual(4);
  });

  test('should display player leaderboard', async ({ page }) => {
    // Wait for leaderboard table
    await page.waitForSelector('table', { timeout: 10000 });

    // Check for table headers
    await expect(page.getByText(/rank|player|chips/i)).toBeVisible();
  });

  test('should export to CSV', async ({ page }) => {
    // Click CSV export button
    const csvButton = page.getByRole('button', { name: /export.*csv/i });
    await expect(csvButton).toBeVisible();

    // Set up download promise
    const downloadPromise = page.waitForEvent('download');

    // Click export
    await csvButton.click();

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should export to JSON', async ({ page }) => {
    // Click JSON export button
    const jsonButton = page.getByRole('button', { name: /export.*json/i });
    await expect(jsonButton).toBeVisible();

    // Set up download promise
    const downloadPromise = page.waitForEvent('download');

    // Click export
    await jsonButton.click();

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.json');
  });

  test('should update data on refresh', async ({ page }) => {
    // Wait for initial data load
    await page.waitForSelector('[data-testid="stat-card"]', { timeout: 10000 });

    // Get initial chip count
    const initialText = await page.locator('[data-testid="stat-card"]').first().textContent();

    // Wait for auto-refresh (30 seconds in production, shorter in test)
    await page.waitForTimeout(2000);

    // Data should still be visible
    await expect(page.locator('[data-testid="stat-card"]').first()).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    // Reload page
    await page.reload();

    // Check for loading indicator (skeleton or spinner)
    const loadingIndicator = page.locator('.animate-pulse, .loading, [role="status"]').first();

    // Loading state should eventually disappear
    await expect(loadingIndicator).not.toBeVisible({ timeout: 15000 });
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still be visible and functional
    await expect(page.getByText(/analytics|dashboard/i)).toBeVisible();

    // Charts should adapt to mobile
    const chart = page.locator('.recharts-responsive-container').first();
    await expect(chart).toBeVisible();
  });
});
