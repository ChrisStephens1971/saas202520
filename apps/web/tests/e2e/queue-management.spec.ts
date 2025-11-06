/**
 * E2E Test: Queue Management
 * Sprint 7 - TEST-002
 *
 * Tests the queue management system for chip format tournaments:
 * - Queue statistics display correctly
 * - Players can be added/removed from queue
 * - Match assignment from queue works correctly
 * - Queue filters and sorting work
 * - Batch match assignment works
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

test.describe('Queue Management', () => {
  let tournamentId: string;

  test.beforeEach(async () => {
    // Clean slate
    await prisma.chipAward.deleteMany({});
    await prisma.match.deleteMany({});
    await prisma.tournamentPlayer.deleteMany({});
    await prisma.tournament.deleteMany({
      where: { name: { startsWith: 'E2E Queue Test' } },
    });

    // Create test tournament
    const tournament = await prisma.tournament.create({
      data: {
        name: 'E2E Queue Test Tournament',
        format: 'chip_format',
        status: 'active',
        startDate: new Date(),
        game: {
          connectOrCreate: {
            where: { slug: 'queue-test-game' },
            create: { name: 'Queue Test Game', slug: 'queue-test-game' },
          },
        },
        chipConfig: {
          winnerChips: 3,
          loserChips: 1,
          qualificationRounds: 5,
          finalsCount: 8,
          pairingStrategy: 'random',
        },
      },
    });

    tournamentId = tournament.id;
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should display queue statistics correctly', async ({ page }) => {
    // Add 15 players
    const players = await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `qplayer${i + 1}@e2etest.com`,
            name: `Queue Player ${i + 1}`,
          },
        })
      )
    );

    await Promise.all(
      players.map(player =>
        prisma.tournamentPlayer.create({
          data: {
            tournamentId,
            playerId: player.id,
          },
        })
      )
    );

    await page.goto(`/tournaments/${tournamentId}/chip-format`);

    // Verify queue stats
    await expect(page.getByText(/15.*in queue|15.*available/i)).toBeVisible();
    await expect(page.getByText(/0.*active.*matches/i)).toBeVisible();
    await expect(page.getByText(/15.*total.*players/i)).toBeVisible();
  });

  test('should assign single match from queue correctly', async ({ page }) => {
    // Add 10 players
    const players = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `single${i + 1}@e2etest.com`,
            name: `Single Player ${i + 1}`,
          },
        })
      )
    );

    await Promise.all(
      players.map(player =>
        prisma.tournamentPlayer.create({
          data: {
            tournamentId,
            playerId: player.id,
          },
        })
      )
    );

    await page.goto(`/tournaments/${tournamentId}/chip-format`);

    // Initial state: 10 in queue, 0 active
    await expect(page.getByText(/10.*in queue/i)).toBeVisible();

    // Click "Assign Next Match"
    await page.getByRole('button', { name: /assign.*next.*match/i }).click();

    // Wait for assignment
    await page.waitForTimeout(500);

    // Verify:
    // - 8 in queue (10 - 2 assigned)
    // - 1 active match
    await expect(page.getByText(/8.*in queue/i)).toBeVisible();
    await expect(page.getByText(/1.*active.*match/i)).toBeVisible();

    // Verify match details displayed
    await expect(page.getByText(/table \d+/i)).toBeVisible();
    await expect(page.getByText(/vs\./i)).toBeVisible();

    // Verify database
    const matches = await prisma.match.findMany({
      where: { tournamentId },
    });

    expect(matches.length).toBe(1);
    expect(matches[0].status).toBe('active');
  });

  test('should assign multiple matches in batch', async ({ page }) => {
    // Add 20 players
    const players = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `batch${i + 1}@e2etest.com`,
            name: `Batch Player ${i + 1}`,
          },
        })
      )
    );

    await Promise.all(
      players.map(player =>
        prisma.tournamentPlayer.create({
          data: {
            tournamentId,
            playerId: player.id,
          },
        })
      )
    );

    await page.goto(`/tournaments/${tournamentId}/chip-format`);

    // Find "Assign Multiple" or batch assignment control
    const batchInput = page.getByLabel(/number.*matches|how many/i);
    if (await batchInput.isVisible()) {
      await batchInput.fill('5');
    }

    // Click assign button
    const assignButton = page.getByRole('button', { name: /assign.*5|batch/i });
    if (await assignButton.isVisible()) {
      await assignButton.click();
    } else {
      // Fallback: click assign button 5 times
      for (let i = 0; i < 5; i++) {
        await page.getByRole('button', { name: /assign.*next/i }).click();
        await page.waitForTimeout(300);
      }
    }

    // Wait for all assignments
    await page.waitForTimeout(1000);

    // Verify:
    // - 10 in queue (20 - 10 assigned)
    // - 5 active matches
    await expect(page.getByText(/10.*in queue/i)).toBeVisible();
    await expect(page.getByText(/5.*active.*match/i)).toBeVisible();

    // Verify database
    const matches = await prisma.match.findMany({
      where: { tournamentId, status: 'active' },
    });

    expect(matches.length).toBe(5);
  });

  test('should handle insufficient queue size gracefully', async ({ page }) => {
    // Add only 1 player (need 2 for a match)
    const player = await prisma.user.create({
      data: {
        email: 'insufficient@e2etest.com',
        name: 'Only Player',
      },
    });

    await prisma.tournamentPlayer.create({
      data: {
        tournamentId,
        playerId: player.id,
      },
    });

    await page.goto(`/tournaments/${tournamentId}/chip-format`);

    // Try to assign match
    const assignButton = page.getByRole('button', { name: /assign.*next/i });

    // Button should be disabled
    if (await assignButton.isDisabled()) {
      expect(await assignButton.isDisabled()).toBe(true);
    } else {
      // Or clicking shows error
      await assignButton.click();
      await expect(page.getByText(/not enough players|insufficient/i)).toBeVisible();
    }
  });

  test('should show queue priority based on chip differential', async ({ page }) => {
    // Add 10 players with varying chip counts
    const players = await Promise.all(
      Array.from({ length: 10 }, async (_, i) => {
        const player = await prisma.user.create({
          data: {
            email: `priority${i + 1}@e2etest.com`,
            name: `Priority Player ${i + 1}`,
          },
        });

        await prisma.tournamentPlayer.create({
          data: {
            tournamentId,
            playerId: player.id,
            chipCount: i * 2, // 0, 2, 4, 6, 8, 10, 12, 14, 16, 18 chips
          },
        });

        return player;
      })
    );

    // Change pairing strategy to chip_diff
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        chipConfig: {
          winnerChips: 3,
          loserChips: 1,
          pairingStrategy: 'chip_diff', // Pair players with different chip counts
        },
      },
    });

    await page.goto(`/tournaments/${tournamentId}/chip-format`);

    // Assign match
    await page.getByRole('button', { name: /assign.*next/i }).click();
    await page.waitForTimeout(500);

    // Verify match pairs players with different chip counts
    // (highest with lowest for maximum differential)
    const match = await prisma.match.findFirst({
      where: { tournamentId },
      include: {
        player1: { include: { player: true } },
        player2: { include: { player: true } },
      },
    });

    expect(match).not.toBeNull();

    // One player should have high chips, other should have low chips
    const chip1 = match!.player1.chipCount;
    const chip2 = match!.player2.chipCount;
    const differential = Math.abs(chip1 - chip2);

    // Expect significant differential (at least 10 chips)
    expect(differential).toBeGreaterThanOrEqual(10);
  });

  test('should filter queue by player status', async ({ page }) => {
    // Add players with different statuses
    const activePlayers = await Promise.all(
      Array.from({ length: 5 }, async (_, i) => {
        const player = await prisma.user.create({
          data: {
            email: `active${i + 1}@e2etest.com`,
            name: `Active Player ${i + 1}`,
          },
        });

        await prisma.tournamentPlayer.create({
          data: {
            tournamentId,
            playerId: player.id,
            status: 'active',
          },
        });

        return player;
      })
    );

    const inactivePlayers = await Promise.all(
      Array.from({ length: 3 }, async (_, i) => {
        const player = await prisma.user.create({
          data: {
            email: `inactive${i + 1}@e2etest.com`,
            name: `Inactive Player ${i + 1}`,
          },
        });

        await prisma.tournamentPlayer.create({
          data: {
            tournamentId,
            playerId: player.id,
            status: 'inactive',
          },
        });

        return player;
      })
    );

    await page.goto(`/tournaments/${tournamentId}/chip-format`);

    // Queue should only show active players (5)
    await expect(page.getByText(/5.*in queue|5.*available/i)).toBeVisible();

    // Inactive players should not be in queue
    await expect(page.getByText(/3.*inactive/i)).toBeVisible();
  });

  test('should return players to queue after match completion', async ({ page }) => {
    // Add 4 players
    const players = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `return${i + 1}@e2etest.com`,
            name: `Return Player ${i + 1}`,
          },
        })
      )
    );

    await Promise.all(
      players.map(player =>
        prisma.tournamentPlayer.create({
          data: {
            tournamentId,
            playerId: player.id,
          },
        })
      )
    );

    await page.goto(`/tournaments/${tournamentId}/chip-format`);

    // Initial: 4 in queue
    await expect(page.getByText(/4.*in queue/i)).toBeVisible();

    // Assign match: 2 in queue, 1 active
    await page.getByRole('button', { name: /assign.*next/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/2.*in queue/i)).toBeVisible();

    // Complete match
    const matchSection = page.locator('[data-testid="active-match"]').first();
    const recordButton = matchSection.getByRole('button', { name: /record.*result/i });
    await recordButton.click();

    await page.getByLabel(/winner/i).first().check();
    await page.getByRole('button', { name: /submit/i }).click();
    await page.waitForTimeout(500);

    // After completion: 4 in queue again (players returned)
    await expect(page.getByText(/4.*in queue/i)).toBeVisible();
  });
});
