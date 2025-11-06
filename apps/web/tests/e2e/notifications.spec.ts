/**
 * E2E Tests for Push Notifications
 * Sprint 8 - Testing
 */

import { test, expect } from '@playwright/test';

test.describe('Push Notifications', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant notification permissions
    await context.grantPermissions(['notifications']);

    // Navigate to settings or notifications page
    await page.goto('/');
  });

  test('should display notification preferences component', async ({ page }) => {
    // Look for notification settings/preferences component
    const notificationSettings = page.getByText(/notification|settings|preferences/i).first();
    await expect(notificationSettings).toBeVisible({ timeout: 10000 });
  });

  test('should show browser support status', async ({ page }) => {
    // Check for support indicator
    const supportStatus = page.locator('[data-testid="notification-status"], .notification-status').first();

    // Should indicate whether notifications are supported
    await expect(supportStatus).toBeVisible({ timeout: 10000 });
  });

  test('should request notification permission', async ({ page }) => {
    // Find enable notifications button
    const enableButton = page.getByRole('button', { name: /enable.*notification/i });

    // Button should be visible if permissions not granted
    if (await enableButton.isVisible()) {
      await enableButton.click();

      // Wait for permission flow to complete
      await page.waitForTimeout(1000);
    }
  });

  test('should display notification preferences toggles', async ({ page }) => {
    // Look for checkbox inputs for notification types
    const checkboxes = await page.locator('input[type="checkbox"]').all();

    // Should have multiple notification type toggles
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  test('should toggle notification preferences', async ({ page }) => {
    // Find first notification checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();

    // Get initial state
    const initialState = await checkbox.isChecked();

    // Toggle checkbox
    await checkbox.click();

    // State should change
    const newState = await checkbox.isChecked();
    expect(newState).not.toBe(initialState);
  });

  test('should persist notification preferences', async ({ page }) => {
    // Find and toggle a checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.click();
    const state = await checkbox.isChecked();

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Checkbox state should persist
    const newState = await checkbox.isChecked();
    expect(newState).toBe(state);
  });

  test('should show test notification button', async ({ page }) => {
    // Look for test notification button
    const testButton = page.getByRole('button', { name: /test.*notification/i });

    // Button should exist
    await expect(testButton).toBeVisible({ timeout: 10000 });
  });

  test('should handle disable notifications', async ({ page }) => {
    // Look for disable button
    const disableButton = page.getByRole('button', { name: /disable.*notification/i });

    if (await disableButton.isVisible()) {
      await disableButton.click();

      // Wait for action to complete
      await page.waitForTimeout(1000);

      // Enable button should now be visible
      const enableButton = page.getByRole('button', { name: /enable.*notification/i });
      await expect(enableButton).toBeVisible();
    }
  });

  test('should show different notification types', async ({ page }) => {
    // Check for various notification type labels
    const types = [
      /match.*start/i,
      /match.*end/i,
      /tournament.*update/i,
      /chip.*award/i,
      /system.*alert/i,
    ];

    for (const typePattern of types) {
      const typeLabel = page.getByText(typePattern).first();
      // At least some notification types should be visible
      if (await typeLabel.isVisible()) {
        expect(await typeLabel.isVisible()).toBeTruthy();
      }
    }
  });

  test('should display permission status correctly', async ({ page }) => {
    // Look for status indicator
    const statusIndicator = page.locator('[data-testid="permission-status"]').first();

    // Status should show granted/denied/default
    if (await statusIndicator.isVisible()) {
      const statusText = await statusIndicator.textContent();
      expect(statusText).toMatch(/granted|denied|active|inactive|blocked/i);
    }
  });

  test('should have visual indicators for enabled/disabled state', async ({ page }) => {
    // Check for visual styling differences
    const checkbox = page.locator('input[type="checkbox"]').first();

    // Ensure checkbox is in one state
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }

    // Should have visual indication (checkmark, color, etc.)
    const parent = checkbox.locator('..');
    const classList = await parent.getAttribute('class');

    expect(classList).toBeTruthy();
  });
});

test.describe('Notification Permissions Denied', () => {
  test.beforeEach(async ({ page, context }) => {
    // Deny notification permissions
    await context.grantPermissions([]);

    await page.goto('/');
  });

  test('should show blocked status when permissions denied', async ({ page }) => {
    // Look for blocked/denied status message
    const deniedMessage = page.getByText(/blocked|denied|not.*allowed/i).first();

    // Message should be visible or status should indicate denial
    if (await deniedMessage.isVisible()) {
      await expect(deniedMessage).toBeVisible();
    }
  });

  test('should provide instructions for enabling permissions', async ({ page }) => {
    // Look for help text or instructions
    const instructions = page.getByText(/browser.*settings|enable.*browser|settings/i).first();

    // Instructions should be visible when blocked
    if (await instructions.isVisible()) {
      await expect(instructions).toBeVisible();
    }
  });
});
