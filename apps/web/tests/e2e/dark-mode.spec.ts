/**
 * E2E Tests for Dark Mode Theme
 * Sprint 8 - Testing
 */

import { test, expect } from '@playwright/test';

test.describe('Dark Mode Theme', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
  });

  test('should display theme switcher', async ({ page }) => {
    // Look for theme switcher button or dropdown
    const themeSwitcher = page.getByRole('button', { name: /theme|light|dark/i }).first();
    await expect(themeSwitcher).toBeVisible();
  });

  test('should toggle to dark mode', async ({ page }) => {
    // Click theme switcher
    const themeSwitcher = page.getByRole('button', { name: /theme|light|dark/i }).first();
    await themeSwitcher.click();

    // Click dark mode option
    const darkOption = page.getByText(/dark/i).first();
    await darkOption.click();

    // Wait for theme to apply
    await page.waitForTimeout(500);

    // Check if dark class is applied to html element
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);
  });

  test('should toggle to light mode', async ({ page }) => {
    // First set to dark mode
    const themeSwitcher = page.getByRole('button', { name: /theme|light|dark/i }).first();
    await themeSwitcher.click();
    await page.getByText(/dark/i).first().click();
    await page.waitForTimeout(500);

    // Now switch to light
    await themeSwitcher.click();
    await page.getByText(/light/i).first().click();
    await page.waitForTimeout(500);

    // Check if dark class is removed
    const htmlElement = page.locator('html');
    await expect(htmlElement).not.toHaveClass(/dark/);
  });

  test('should persist theme preference', async ({ page }) => {
    // Set to dark mode
    const themeSwitcher = page.getByRole('button', { name: /theme|light|dark/i }).first();
    await themeSwitcher.click();
    await page.getByText(/dark/i).first().click();
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Theme should still be dark
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);
  });

  test('should show system preference option', async ({ page }) => {
    // Click theme switcher
    const themeSwitcher = page.getByRole('button', { name: /theme|light|dark/i }).first();
    await themeSwitcher.click();

    // Look for system option
    const systemOption = page.getByText(/system/i);
    await expect(systemOption).toBeVisible();
  });

  test('should change theme colors', async ({ page }) => {
    // Get background color in light mode
    const body = page.locator('body');
    const lightBg = await body.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Switch to dark mode
    const themeSwitcher = page.getByRole('button', { name: /theme|light|dark/i }).first();
    await themeSwitcher.click();
    await page.getByText(/dark/i).first().click();
    await page.waitForTimeout(500);

    // Get background color in dark mode
    const darkBg = await body.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Colors should be different
    expect(lightBg).not.toBe(darkBg);
  });

  test('should have smooth transition', async ({ page }) => {
    // Check for transition property on body or html
    const body = page.locator('body');
    const hasTransition = await body.evaluate(el => {
      const transition = window.getComputedStyle(el).transition;
      return transition.includes('background') || transition.includes('color');
    });

    // Should have smooth transitions
    expect(hasTransition).toBeTruthy();
  });

  test('should work across different pages', async ({ page }) => {
    // Set dark mode on home page
    const themeSwitcher = page.getByRole('button', { name: /theme|light|dark/i }).first();
    await themeSwitcher.click();
    await page.getByText(/dark/i).first().click();
    await page.waitForTimeout(500);

    // Navigate to another page (if exists)
    await page.goto('/tournaments');
    await page.waitForLoadState('domcontentloaded');

    // Should still be in dark mode
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    // Open theme switcher dropdown
    const themeSwitcher = page.getByRole('button', { name: /theme|light|dark/i }).first();
    await themeSwitcher.click();

    // Verify dropdown is open
    const dropdown = page.locator('[role="menu"], .dropdown, [class*="dropdown"]').first();
    await expect(dropdown).toBeVisible();

    // Click outside
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Dropdown should close
    await expect(dropdown).not.toBeVisible();
  });

  test('should update theme icon when mode changes', async ({ page }) => {
    // Get initial icon
    const themeSwitcher = page.getByRole('button', { name: /theme|light|dark/i }).first();
    const initialIcon = await themeSwitcher.textContent();

    // Switch to dark mode
    await themeSwitcher.click();
    await page.getByText(/dark/i).first().click();
    await page.waitForTimeout(500);

    // Icon should change (sun/moon icon)
    const newIcon = await themeSwitcher.textContent();
    expect(newIcon).not.toBe(initialIcon);
  });
});
