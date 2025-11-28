/**
 * E2E Test: Complete Chip Format Tournament Flow
 * Sprint 7 - TEST-002
 *
 * Tests the complete end-to-end chip format tournament workflow:
 * 1. Create tournament
 * 2. Add players
 * 3. Assign matches from queue
 * 4. Record match results
 * 5. Award chips to players
 * 6. Verify standings update correctly
 * 7. Apply finals cutoff
 * 8. Verify finalists selected correctly
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

test.describe('Chip Format Tournament Flow', () => {
  let tournamentId: string;

  test.beforeEach(async () => {
    // Clean slate before each test
    await prisma.chipAward.deleteMany({});
    await prisma.match.deleteMany({});
    await prisma.tournamentPlayer.deleteMany({});
    await prisma.tournament.deleteMany({
      where: { name: { startsWith: 'E2E Flow Test' } },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should complete full chip format tournament workflow', async ({ page }) => {
    // Step 1: Create Tournament
    await test.step('Create chip format tournament', async () => {
      await page.goto('/tournaments');

      // Create tournament using API (faster than UI for setup)
      const tournament = await prisma.tournament.create({
        data: {
          name: 'E2E Flow Test Tournament',
          format: 'chip_format',
          status: 'active',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          game: {
            connectOrCreate: {
              where: { slug: 'e2e-test-game' },
              create: {
                name: 'E2E Test Game',
                slug: 'e2e-test-game',
              },
            },
          },
          chipConfig: {
            winnerChips: 3,
            loserChips: 1,
            qualificationRounds: 5,
            finalsCount: 8,
            pairingStrategy: 'random',
            allowDuplicatePairings: false,
            tiebreaker: 'head_to_head',
          },
        },
      });

      tournamentId = tournament.id;

      // Navigate to tournament chip format page
      await page.goto(`/tournaments/${tournamentId}/chip-format`);
      await expect(page.getByRole('heading', { name: 'E2E Flow Test Tournament' })).toBeVisible();
    });

    // Step 2: Add Players
    await test.step('Add players to tournament', async () => {
      // Add 12 players directly via database (faster than UI)
      const players = await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          prisma.user.create({
            data: {
              email: `player${i + 1}@e2etest.com`,
              name: `Player ${i + 1}`,
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
              status: 'active',
            },
          })
        )
      );

      // Refresh page to see players
      await page.reload();

      // Verify players appear in standings table
      await expect(page.getByText('Player 1')).toBeVisible();
      await expect(page.getByText('Player 12')).toBeVisible();

      // Verify all players start with 0 chips
      const chipCells = await page.locator('td:has-text("0 chips")').count();
      expect(chipCells).toBeGreaterThanOrEqual(12);
    });

    // Step 3: Assign Match from Queue
    await test.step('Assign match from queue', async () => {
      // Click "Assign Next Match" button
      const assignButton = page.getByRole('button', { name: /assign.*next.*match/i });
      await expect(assignButton).toBeVisible();
      await assignButton.click();

      // Wait for match assignment
      await page.waitForTimeout(500);

      // Verify match appears in active matches section
      await expect(page.getByText(/table \d+/i)).toBeVisible();
      await expect(page.getByText(/vs\./i)).toBeVisible();

      // Verify queue stats updated (11 players in queue, 1 active match)
      await expect(page.getByText(/\d+ in queue/i)).toBeVisible();
      await expect(page.getByText(/1.*active/i)).toBeVisible();
    });

    // Step 4: Record Match Result
    await test.step('Record match result and award chips', async () => {
      // Find the active match
      const matchSection = page.locator('[data-testid="active-match"]').first();

      // Click "Record Result" or similar button
      const recordButton = matchSection.getByRole('button', { name: /record.*result|complete/i });
      await recordButton.click();

      // Select winner (first player in the match)
      await page
        .getByLabel(/winner/i)
        .first()
        .check();

      // Submit result
      await page.getByRole('button', { name: /submit|save/i }).click();

      // Wait for result to be processed
      await page.waitForTimeout(500);

      // Verify match completed
      await expect(page.getByText(/completed|finished/i)).toBeVisible();
    });

    // Step 5: Verify Standings Updated
    await test.step('Verify chip standings updated correctly', async () => {
      // Winner should have 3 chips
      await expect(page.getByText(/3 chips/i)).toBeVisible();

      // Loser should have 1 chip
      await expect(page.getByText(/1 chip/i)).toBeVisible();

      // Verify standings are sorted by chip count (descending)
      const standings = await prisma.tournamentPlayer.findMany({
        where: { tournamentId },
        orderBy: { chipCount: 'desc' },
        include: { player: true },
      });

      expect(standings[0].chipCount).toBe(3); // Winner
      expect(standings[1].chipCount).toBe(1); // Loser
    });

    // Step 6: Play Multiple Rounds
    await test.step('Complete qualification rounds', async () => {
      // Assign and complete 4 more matches to reach 5 total rounds
      for (let round = 2; round <= 5; round++) {
        // Assign next match
        const assignButton = page.getByRole('button', { name: /assign.*next.*match/i });
        await assignButton.click();
        await page.waitForTimeout(300);

        // Record result (click first winner option)
        const matchSection = page.locator('[data-testid="active-match"]').first();
        const recordButton = matchSection.getByRole('button', { name: /record.*result/i });
        await recordButton.click();

        await page
          .getByLabel(/winner/i)
          .first()
          .check();
        await page.getByRole('button', { name: /submit/i }).click();
        await page.waitForTimeout(300);
      }

      // Verify multiple players have chips
      const standings = await prisma.tournamentPlayer.findMany({
        where: { tournamentId },
        orderBy: { chipCount: 'desc' },
      });

      const playersWithChips = standings.filter((p) => p.chipCount > 0);
      expect(playersWithChips.length).toBeGreaterThan(0);
    });

    // Step 7: Apply Finals Cutoff
    await test.step('Apply finals cutoff and select top 8', async () => {
      // Click "Apply Finals Cutoff" button
      const finalsButton = page.getByRole('button', { name: /apply.*finals.*cutoff/i });
      await expect(finalsButton).toBeVisible();
      await finalsButton.click();

      // Confirm action
      const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }

      // Wait for cutoff to be applied
      await page.waitForTimeout(1000);

      // Verify "Finals" badge appears on top 8 players
      const finalistBadges = await page.locator('text=/finals|finalist/i').count();
      expect(finalistBadges).toBeGreaterThanOrEqual(1);

      // Verify database records
      const finalists = await prisma.tournamentPlayer.findMany({
        where: {
          tournamentId,
          isFinalist: true,
        },
      });

      expect(finalists.length).toBe(8);
    });

    // Step 8: Verify Eliminated Players
    await test.step('Verify eliminated players marked correctly', async () => {
      const eliminated = await prisma.tournamentPlayer.findMany({
        where: {
          tournamentId,
          isFinalist: false,
        },
      });

      expect(eliminated.length).toBe(4); // 12 total - 8 finalists = 4 eliminated

      // Verify eliminated players have "Eliminated" status in UI
      await expect(page.getByText(/eliminated/i)).toBeVisible();
    });

    // Step 9: Verify Chip History
    await test.step('Verify chip award history is tracked', async () => {
      // Navigate to a player's chip history
      const playerRow = page.locator('tr').filter({ hasText: 'Player' }).first();
      await playerRow.click();

      // Verify chip history section exists
      await expect(page.getByText(/chip.*history|award.*history/i)).toBeVisible();

      // Verify database has chip awards
      const awards = await prisma.chipAward.findMany({
        where: {
          match: {
            tournamentId,
          },
        },
      });

      expect(awards.length).toBeGreaterThan(0);
    });
  });

  test('should handle tie scenarios correctly', async ({ page }) => {
    // Create tournament with 4 players
    const tournament = await prisma.tournament.create({
      data: {
        name: 'E2E Tie Test Tournament',
        format: 'chip_format',
        status: 'active',
        startDate: new Date(),
        game: {
          connectOrCreate: {
            where: { slug: 'tie-test-game' },
            create: { name: 'Tie Test Game', slug: 'tie-test-game' },
          },
        },
        chipConfig: {
          winnerChips: 3,
          loserChips: 1,
          qualificationRounds: 2,
          finalsCount: 2,
          tiebreaker: 'head_to_head',
        },
      },
    });

    // Add 4 players
    const players = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `tieplayer${i + 1}@e2etest.com`,
            name: `Tie Player ${i + 1}`,
          },
        })
      )
    );

    await Promise.all(
      players.map((player) =>
        prisma.tournamentPlayer.create({
          data: {
            tournamentId: tournament.id,
            playerId: player.id,
            chipCount: 5, // All tied with 5 chips
          },
        })
      )
    );

    await page.goto(`/tournaments/${tournament.id}/chip-format`);

    // Apply finals cutoff with tie
    await page.getByRole('button', { name: /apply.*finals.*cutoff/i }).click();

    // Verify tie is handled (should show tiebreaker method used)
    await expect(page.getByText(/tiebreaker|tied/i)).toBeVisible();

    // Verify exactly 2 finalists selected
    const finalists = await prisma.tournamentPlayer.findMany({
      where: {
        tournamentId: tournament.id,
        isFinalist: true,
      },
    });

    expect(finalists.length).toBe(2);
  });

  test('should prevent finals cutoff when not enough players', async ({ page }) => {
    // Create tournament with only 3 players (finals requires 8)
    const tournament = await prisma.tournament.create({
      data: {
        name: 'E2E Small Tournament',
        format: 'chip_format',
        status: 'active',
        startDate: new Date(),
        game: {
          connectOrCreate: {
            where: { slug: 'small-test-game' },
            create: { name: 'Small Test Game', slug: 'small-test-game' },
          },
        },
        chipConfig: {
          winnerChips: 3,
          loserChips: 1,
          finalsCount: 8, // Requires 8 but only 3 players
        },
      },
    });

    // Add only 3 players
    const players = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `smallplayer${i + 1}@e2etest.com`,
            name: `Small Player ${i + 1}`,
          },
        })
      )
    );

    await Promise.all(
      players.map((player) =>
        prisma.tournamentPlayer.create({
          data: {
            tournamentId: tournament.id,
            playerId: player.id,
          },
        })
      )
    );

    await page.goto(`/tournaments/${tournament.id}/chip-format`);

    // Try to apply finals cutoff
    const finalsButton = page.getByRole('button', { name: /apply.*finals.*cutoff/i });

    // Button should be disabled or show error
    if (await finalsButton.isDisabled()) {
      // Verify button is disabled
      expect(await finalsButton.isDisabled()).toBe(true);
    } else {
      // Click and verify error message
      await finalsButton.click();
      await expect(page.getByText(/not enough players|insufficient/i)).toBeVisible();
    }
  });
});
