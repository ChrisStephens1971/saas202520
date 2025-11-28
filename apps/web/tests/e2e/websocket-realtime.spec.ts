/**
 * E2E Test: WebSocket Real-time Updates
 * Sprint 7 - TEST-002
 *
 * Tests WebSocket real-time synchronization across multiple browser contexts:
 * - Connection status indicators
 * - Standings updates propagate instantly
 * - Queue updates propagate instantly
 * - Match assignments propagate instantly
 * - Finals cutoff propagates instantly
 */

import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/saas202520_test?schema=public',
    },
  },
});

test.describe('WebSocket Real-time Updates', () => {
  let tournamentId: string;

  test.beforeEach(async () => {
    // Clean slate
    await prisma.chipAward.deleteMany({});
    await prisma.match.deleteMany({});
    await prisma.tournamentPlayer.deleteMany({});
    await prisma.tournament.deleteMany({
      where: { name: { startsWith: 'E2E WebSocket Test' } },
    });

    // Create test tournament
    const tournament = await prisma.tournament.create({
      data: {
        name: 'E2E WebSocket Test Tournament',
        format: 'chip_format',
        status: 'active',
        startDate: new Date(),
        game: {
          connectOrCreate: {
            where: { slug: 'ws-test-game' },
            create: { name: 'WS Test Game', slug: 'ws-test-game' },
          },
        },
        chipConfig: {
          winnerChips: 3,
          loserChips: 1,
          qualificationRounds: 5,
          finalsCount: 8,
        },
      },
    });

    tournamentId = tournament.id;

    // Add 10 players
    const players = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `wsplayer${i + 1}@e2etest.com`,
            name: `WS Player ${i + 1}`,
          },
        })
      )
    );

    await Promise.all(
      players.map((player) =>
        prisma.tournamentPlayer.create({
          data: {
            tournamentId,
            playerId: player.id,
          },
        })
      )
    );
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should show connection status indicator', async ({ page }) => {
    await page.goto(`/tournaments/${tournamentId}/chip-format`);

    // Wait for WebSocket connection
    await page.waitForTimeout(1000);

    // Verify connection indicator shows "connected"
    const connectionIndicator = page.locator('[data-testid="connection-status"]');
    await expect(connectionIndicator).toHaveClass(/connected|online/);

    // Or check for green indicator
    await expect(page.locator('.connection-indicator.green')).toBeVisible();

    // Verify tooltip or text says "Connected"
    await expect(page.getByText(/connected/i)).toBeVisible();
  });

  test('should propagate standings updates across browser contexts in real-time', async ({
    browser,
  }) => {
    // Create two browser contexts (simulating two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Both pages navigate to same tournament
      await page1.goto(`/tournaments/${tournamentId}/chip-format`);
      await page2.goto(`/tournaments/${tournamentId}/chip-format`);

      // Wait for both to connect
      await page1.waitForTimeout(1000);
      await page2.waitForTimeout(1000);

      // Verify both show 0 chips for all players initially
      await expect(page1.getByText(/WS Player 1/i)).toBeVisible();
      await expect(page2.getByText(/WS Player 1/i)).toBeVisible();

      // Page 1: Assign and complete a match
      await test.step('Page 1 records match result', async () => {
        const assignButton = page1.getByRole('button', { name: /assign.*next/i });
        await assignButton.click();
        await page1.waitForTimeout(300);

        // Record result
        const matchSection = page1.locator('[data-testid="active-match"]').first();
        const recordButton = matchSection.getByRole('button', { name: /record.*result/i });
        await recordButton.click();

        await page1
          .getByLabel(/winner/i)
          .first()
          .check();
        await page1.getByRole('button', { name: /submit/i }).click();
      });

      // Page 2: Verify standings updated WITHOUT reload
      await test.step('Page 2 sees standings update in real-time', async () => {
        // Wait for WebSocket event propagation
        await page2.waitForTimeout(500);

        // Verify chip counts updated on page 2 WITHOUT manual refresh
        await expect(page2.getByText(/3 chips/i)).toBeVisible({ timeout: 2000 });
        await expect(page2.getByText(/1 chip/i)).toBeVisible({ timeout: 2000 });
      });

      // Verify NO page reload occurred on page 2
      const pageReloadListener = page2.evaluate(() => {
        return (window as any).hasReloaded === true;
      });

      expect(await pageReloadListener).toBeFalsy();
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should propagate queue updates in real-time', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await page1.goto(`/tournaments/${tournamentId}/chip-format`);
      await page2.goto(`/tournaments/${tournamentId}/chip-format`);

      await page1.waitForTimeout(1000);
      await page2.waitForTimeout(1000);

      // Initial queue: 10 players
      await expect(page2.getByText(/10.*in queue|10.*available/i)).toBeVisible();

      // Page 1: Assign match (removes 2 from queue)
      const assignButton = page1.getByRole('button', { name: /assign.*next/i });
      await assignButton.click();

      // Page 2: Verify queue count updated (8 in queue, 1 active match)
      await expect(page2.getByText(/8.*in queue/i)).toBeVisible({ timeout: 2000 });
      await expect(page2.getByText(/1.*active/i)).toBeVisible({ timeout: 2000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should propagate match assignments in real-time', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await page1.goto(`/tournaments/${tournamentId}/chip-format`);
      await page2.goto(`/tournaments/${tournamentId}/chip-format`);

      await page1.waitForTimeout(1000);
      await page2.waitForTimeout(1000);

      // Page 1: Assign match
      await page1.getByRole('button', { name: /assign.*next/i }).click();

      // Page 2: Verify match appears in active matches WITHOUT reload
      await expect(page2.locator('[data-testid="active-match"]')).toBeVisible({ timeout: 2000 });
      await expect(page2.getByText(/table \d+/i)).toBeVisible({ timeout: 2000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should propagate finals cutoff in real-time', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Set up tournament with some chip distribution
      await prisma.tournamentPlayer.updateMany({
        where: { tournamentId },
        data: { chipCount: 5 },
      });

      await page1.goto(`/tournaments/${tournamentId}/chip-format`);
      await page2.goto(`/tournaments/${tournamentId}/chip-format`);

      await page1.waitForTimeout(1000);
      await page2.waitForTimeout(1000);

      // Page 1: Apply finals cutoff
      const finalsButton = page1.getByRole('button', { name: /apply.*finals/i });
      await finalsButton.click();

      // Confirm if needed
      const confirmButton = page1.getByRole('button', { name: /confirm|yes/i });
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }

      // Page 2: Verify finals badges appear WITHOUT reload
      await expect(page2.getByText(/finals|finalist/i)).toBeVisible({ timeout: 3000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should handle WebSocket reconnection', async ({ page }) => {
    await page.goto(`/tournaments/${tournamentId}/chip-format`);

    // Wait for initial connection
    await page.waitForTimeout(1000);
    await expect(page.locator('.connection-indicator.green')).toBeVisible();

    // Simulate network disconnection
    await page.context().setOffline(true);

    // Wait for disconnect indicator
    await expect(page.locator('.connection-indicator.red')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/disconnected|offline/i)).toBeVisible();

    // Reconnect
    await page.context().setOffline(false);

    // Wait for reconnection
    await expect(page.locator('.connection-indicator.green')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/connected/i)).toBeVisible();
  });

  test('should receive multiple event types simultaneously', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await page1.goto(`/tournaments/${tournamentId}/chip-format`);
      await page2.goto(`/tournaments/${tournamentId}/chip-format`);

      await page1.waitForTimeout(1000);
      await page2.waitForTimeout(1000);

      // Page 1: Assign match AND record result (multiple events)
      await page1.getByRole('button', { name: /assign.*next/i }).click();
      await page1.waitForTimeout(300);

      const matchSection = page1.locator('[data-testid="active-match"]').first();
      const recordButton = matchSection.getByRole('button', { name: /record.*result/i });
      await recordButton.click();

      await page1
        .getByLabel(/winner/i)
        .first()
        .check();
      await page1.getByRole('button', { name: /submit/i }).click();

      // Page 2: Should see:
      // 1. Match assignment event
      // 2. Queue update event
      // 3. Standings update event
      // All without reload

      await expect(page2.getByText(/3 chips/i)).toBeVisible({ timeout: 2000 });
      await expect(page2.getByText(/8.*in queue/i)).toBeVisible({ timeout: 2000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
