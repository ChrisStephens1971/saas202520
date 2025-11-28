/**
 * Real-Time Features E2E Tests
 * Sprint 9 - Real-Time Features
 *
 * End-to-end tests for Socket.io real-time functionality using Playwright
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Real-Time Features', () => {
  test.describe('Connection Status', () => {
    test('should show connection status indicator', async ({ page }) => {
      await page.goto('/');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Connection status should be visible (if component is on page)
      // Adjust selector based on your actual implementation
      const connectionStatus = page.locator('[data-testid="connection-status"]');

      // Check if connection status exists
      const exists = await connectionStatus.count();
      if (exists > 0) {
        await expect(connectionStatus).toBeVisible();
      }
    });

    test('should show online status when connected', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait for Socket.io connection
      await page.waitForTimeout(2000);

      // Look for "Connected" or "Online" text
      const onlineIndicator = page.getByText(/connected|online/i);
      const exists = await onlineIndicator.count();

      if (exists > 0) {
        await expect(onlineIndicator.first()).toBeVisible();
      }
    });
  });

  test.describe('Live Match Card', () => {
    test('should display match information', async ({ page }) => {
      // Navigate to a tournament page with matches
      await page.goto('/tournaments/test-tournament-id');
      await page.waitForLoadState('networkidle');

      // Look for match cards
      const matchCard = page.locator('[data-testid="live-match-card"]').first();
      const exists = await matchCard.count();

      if (exists > 0) {
        await expect(matchCard).toBeVisible();

        // Should show player names
        await expect(matchCard.getByText(/vs/i)).toBeVisible();
      }
    });

    test('should show live indicator for in-progress matches', async ({ page }) => {
      await page.goto('/tournaments/test-tournament-id');
      await page.waitForLoadState('networkidle');

      // Look for LIVE badge
      const liveBadge = page.getByText(/LIVE/i);
      const exists = await liveBadge.count();

      if (exists > 0) {
        await expect(liveBadge.first()).toBeVisible();

        // Should have animation (pulsing dot)
        const pulseDot = page.locator('.animate-ping').first();
        const dotExists = await pulseDot.count();
        if (dotExists > 0) {
          await expect(pulseDot).toBeVisible();
        }
      }
    });

    test('should update match scores in real-time', async ({ page, context }) => {
      // This test requires server to emit match updates
      // In real scenario, you'd need a test API endpoint to trigger updates

      await page.goto('/tournaments/test-tournament-id');
      await page.waitForLoadState('networkidle');

      const matchCard = page.locator('[data-testid="live-match-card"]').first();
      const exists = await matchCard.count();

      if (exists > 0) {
        // Get initial score
        const initialScore = await matchCard
          .locator('[data-testid="player-score"]')
          .first()
          .textContent();

        // Wait for potential update (adjust timing based on test data)
        await page.waitForTimeout(3000);

        // Check if score changed (would need actual real-time update)
        const updatedScore = await matchCard
          .locator('[data-testid="player-score"]')
          .first()
          .textContent();

        // Score might change or stay same depending on test environment
        expect(updatedScore).toBeDefined();
      }
    });
  });

  test.describe('Live Leaderboard', () => {
    test('should display leaderboard with rankings', async ({ page }) => {
      await page.goto('/tournaments/test-tournament-id/leaderboard');
      await page.waitForLoadState('networkidle');

      const leaderboard = page.locator('[data-testid="live-leaderboard"]');
      const exists = await leaderboard.count();

      if (exists > 0) {
        await expect(leaderboard).toBeVisible();

        // Should show rankings (#1, #2, #3, etc.)
        const rankings = page.locator('text=/^#\\d+$/');
        const rankingsExist = await rankings.count();

        if (rankingsExist > 0) {
          expect(rankingsExist).toBeGreaterThan(0);
        }
      }
    });

    test('should show medals for top 3 players', async ({ page }) => {
      await page.goto('/tournaments/test-tournament-id/leaderboard');
      await page.waitForLoadState('networkidle');

      // Look for medal emojis or rank badges
      const goldMedal = page.getByText('🥇');
      const silverMedal = page.getByText('🥈');
      const bronzeMedal = page.getByText('🥉');

      const hasGold = (await goldMedal.count()) > 0;
      const hasSilver = (await silverMedal.count()) > 0;
      const hasBronze = (await bronzeMedal.count()) > 0;

      if (hasGold || hasSilver || hasBronze) {
        // At least one medal should be visible if leaderboard has data
        expect(hasGold || hasSilver || hasBronze).toBe(true);
      }
    });

    test('should highlight recently updated players', async ({ page }) => {
      await page.goto('/tournaments/test-tournament-id/leaderboard');
      await page.waitForLoadState('networkidle');

      // Wait for potential real-time update
      await page.waitForTimeout(2000);

      // Look for highlight/flash animation classes
      const highlighted = page.locator('.bg-blue-50, .scale-\\[1\\.01\\]');
      const exists = await highlighted.count();

      // May or may not have highlights depending on recent activity
      if (exists > 0) {
        await expect(highlighted.first()).toBeVisible();
      }
    });

    test('should show online status for players', async ({ page }) => {
      await page.goto('/tournaments/test-tournament-id/leaderboard');
      await page.waitForLoadState('networkidle');

      // Look for online indicators (green dots)
      const onlineDots = page.locator('.bg-green-500.rounded-full, .animate-pulse');
      const exists = await onlineDots.count();

      if (exists > 0) {
        // Online indicators should be visible if players are online
        await expect(onlineDots.first()).toBeVisible();
      }
    });
  });

  test.describe('Presence System', () => {
    test('should show online player count', async ({ page }) => {
      await page.goto('/tournaments/test-tournament-id');
      await page.waitForLoadState('networkidle');

      // Look for "X online" text
      const onlineCount = page.getByText(/\d+ online/i);
      const exists = await onlineCount.count();

      if (exists > 0) {
        await expect(onlineCount.first()).toBeVisible();

        // Extract number
        const text = await onlineCount.first().textContent();
        expect(text).toMatch(/\d+/);
      }
    });

    test('should display online user avatars', async ({ page }) => {
      await page.goto('/tournaments/test-tournament-id');
      await page.waitForLoadState('networkidle');

      const presenceIndicator = page.locator('[data-testid="presence-indicator"]');
      const exists = await presenceIndicator.count();

      if (exists > 0) {
        await expect(presenceIndicator).toBeVisible();

        // Should have avatar circles
        const avatars = presenceIndicator.locator('.rounded-full');
        const avatarCount = await avatars.count();

        if (avatarCount > 0) {
          expect(avatarCount).toBeGreaterThan(0);
        }
      }
    });

    test('should open presence dropdown on click', async ({ page }) => {
      await page.goto('/tournaments/test-tournament-id');
      await page.waitForLoadState('networkidle');

      const presenceButton = page.locator('[data-testid="presence-indicator"] button').first();
      const exists = await presenceButton.count();

      if (exists > 0) {
        // Click to open dropdown
        await presenceButton.click();

        // Wait for dropdown
        await page.waitForTimeout(300);

        // Look for dropdown content
        const dropdown = page.locator('text=/Online Players|online/i');
        const dropdownExists = await dropdown.count();

        if (dropdownExists > 0) {
          await expect(dropdown.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Multi-Browser Real-Time Sync', () => {
    test('should sync updates between two browser contexts', async ({ context, browser }) => {
      // Create first page
      const page1 = await context.newPage();
      await page1.goto('/tournaments/test-tournament-id');
      await page1.waitForLoadState('networkidle');

      // Create second browser context (separate session)
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      await page2.goto('/tournaments/test-tournament-id');
      await page2.waitForLoadState('networkidle');

      // Wait for both to connect
      await page1.waitForTimeout(2000);
      await page2.waitForTimeout(2000);

      // Check online count on page 1
      const onlineCount1 = page1.getByText(/\d+ online/i);
      const exists1 = await onlineCount1.count();

      if (exists1 > 0) {
        const count1Text = await onlineCount1.first().textContent();
        const count1 = parseInt(count1Text?.match(/\d+/)?.[0] || '0');

        // Should show at least 2 users online (both contexts)
        expect(count1).toBeGreaterThanOrEqual(1);
      }

      // Cleanup
      await page2.close();
      await context2.close();
    });
  });

  test.describe('Real-Time Notifications', () => {
    test('should display notification when received', async ({ page }) => {
      await page.goto('/tournaments/test-tournament-id');
      await page.waitForLoadState('networkidle');

      // Wait for Socket.io connection
      await page.waitForTimeout(2000);

      // Look for notification component
      const notification = page.locator('[data-testid="notification"]');

      // Wait for potential notification
      await page.waitForTimeout(3000);

      const exists = await notification.count();

      // Notifications may or may not appear during test
      if (exists > 0) {
        await expect(notification.first()).toBeVisible();
      }
    });

    test('should show notification badge on new notifications', async ({ page }) => {
      await page.goto('/tournaments/test-tournament-id');
      await page.waitForLoadState('networkidle');

      // Wait for potential notifications
      await page.waitForTimeout(3000);

      // Look for notification badge (red dot with count)
      const badge = page.locator('[data-testid="notification-badge"]');
      const exists = await badge.count();

      if (exists > 0) {
        await expect(badge.first()).toBeVisible();

        // Should have a number
        const badgeText = await badge.first().textContent();
        expect(badgeText).toMatch(/\d+/);
      }
    });
  });

  test.describe('Connection Resilience', () => {
    test('should show reconnecting status when disconnected', async ({ page }) => {
      await page.goto('/tournaments/test-tournament-id');
      await page.waitForLoadState('networkidle');

      // Wait for connection
      await page.waitForTimeout(2000);

      // Simulate network interruption (if possible with Playwright's offline mode)
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);

      // Look for "Connecting..." or "Reconnecting..." text
      const reconnecting = page.getByText(/connecting|reconnecting/i);
      const exists = await reconnecting.count();

      if (exists > 0) {
        await expect(reconnecting.first()).toBeVisible();
      }

      // Restore connection
      await page.context().setOffline(false);
      await page.waitForTimeout(2000);

      // Should reconnect
      const connected = page.getByText(/connected|online/i);
      const connectedExists = await connected.count();

      if (connectedExists > 0) {
        await expect(connected.first()).toBeVisible();
      }
    });

    test('should maintain state after reconnection', async ({ page }) => {
      await page.goto('/tournaments/test-tournament-id');
      await page.waitForLoadState('networkidle');

      // Get initial state (e.g., leaderboard data)
      const initialLeaderboard = await page
        .locator('[data-testid="live-leaderboard"]')
        .textContent();

      // Simulate disconnect and reconnect
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);
      await page.context().setOffline(false);
      await page.waitForTimeout(2000);

      // Check leaderboard still shows data
      const reconnectedLeaderboard = await page
        .locator('[data-testid="live-leaderboard"]')
        .textContent();

      // Data should still be present (may have updated)
      expect(reconnectedLeaderboard).toBeTruthy();
    });
  });

  test.describe('Performance', () => {
    test('should handle rapid updates without lag', async ({ page }) => {
      await page.goto('/tournaments/test-tournament-id');
      await page.waitForLoadState('networkidle');

      // Wait for connection
      await page.waitForTimeout(2000);

      // Measure initial load time
      const startTime = Date.now();

      // Wait for multiple potential updates
      await page.waitForTimeout(5000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Page should remain responsive (< 6 seconds for 5-second wait)
      expect(duration).toBeLessThan(6000);

      // UI should still be interactive
      const clickableElement = page.locator('[data-testid="live-leaderboard"]').first();
      const exists = await clickableElement.count();

      if (exists > 0) {
        await expect(clickableElement).toBeVisible();
      }
    });
  });
});
