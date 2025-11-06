/**
 * E2E Test: Tournament Setup Wizard
 * Sprint 7 - TEST-002
 *
 * Tests the 4-step Tournament Setup Wizard for chip format tournaments:
 * 1. Basic Information
 * 2. Chip Configuration
 * 3. Advanced Settings
 * 4. Review & Confirm
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

test.describe('Tournament Setup Wizard', () => {
  test.afterEach(async () => {
    // Clean up created tournaments after each test
    await prisma.tournament.deleteMany({
      where: {
        name: {
          startsWith: 'E2E Test',
        },
      },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should complete 4-step wizard and create chip format tournament', async ({ page }) => {
    // Navigate to tournaments page
    await page.goto('/tournaments');

    // Wait for page to load
    await expect(page).toHaveTitle(/Tournaments/i);

    // Click button to open Tournament Setup Wizard
    // Note: This assumes there's a "Create Tournament" or similar button
    const createButton = page.getByRole('button', { name: /create.*tournament/i });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Verify wizard modal is visible
    await expect(page.getByText('Tournament Setup')).toBeVisible();
    await expect(page.getByText('Step 1 of 4')).toBeVisible();

    // Step 1: Basic Information
    await test.step('Fill Step 1: Basic Information', async () => {
      // Fill tournament name
      await page.getByLabel(/tournament name/i).fill('E2E Test Tournament');

      // Fill start date (today + 7 days)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateString = futureDate.toISOString().split('T')[0];
      await page.getByLabel(/start date/i).fill(dateString);

      // Fill game
      await page.getByLabel(/game/i).fill('Chess');

      // Fill description (optional)
      await page.getByLabel(/description/i).fill('E2E test tournament for chip format system');

      // Fill max players (optional)
      await page.getByLabel(/max players/i).fill('32');

      // Click Next
      await page.getByRole('button', { name: /next/i }).click();

      // Verify we're on Step 2
      await expect(page.getByText('Step 2 of 4')).toBeVisible();
    });

    // Step 2: Chip Configuration
    await test.step('Fill Step 2: Chip Configuration', async () => {
      // Winner chips (default: 3)
      await page.getByLabel(/winner chips/i).fill('3');

      // Loser chips (default: 1)
      await page.getByLabel(/loser chips/i).fill('1');

      // Qualification rounds (default: 5)
      await page.getByLabel(/qualification rounds/i).fill('5');

      // Finals count (default: 8)
      await page.getByLabel(/finals count/i).fill('8');

      // Verify live preview shows configuration
      await expect(page.getByText(/winner.*3.*chips/i)).toBeVisible();
      await expect(page.getByText(/loser.*1.*chip/i)).toBeVisible();

      // Click Next
      await page.getByRole('button', { name: /next/i }).click();

      // Verify we're on Step 3
      await expect(page.getByText('Step 3 of 4')).toBeVisible();
    });

    // Step 3: Advanced Settings
    await test.step('Fill Step 3: Advanced Settings', async () => {
      // Select pairing strategy: random
      await page.getByLabel(/pairing strategy/i).selectOption('random');

      // Select tiebreaker: head_to_head
      await page.getByLabel(/tiebreaker/i).selectOption('head_to_head');

      // Allow duplicate pairings checkbox
      const duplicateCheckbox = page.getByLabel(/allow duplicate pairings/i);
      await duplicateCheckbox.check();
      await expect(duplicateCheckbox).toBeChecked();

      // Click Next
      await page.getByRole('button', { name: /next/i }).click();

      // Verify we're on Step 4 (Review)
      await expect(page.getByText('Step 4 of 4')).toBeVisible();
      await expect(page.getByText(/review.*confirm/i)).toBeVisible();
    });

    // Step 4: Review & Confirm
    await test.step('Review and create tournament', async () => {
      // Verify all information is displayed
      await expect(page.getByText('E2E Test Tournament')).toBeVisible();
      await expect(page.getByText('Chess')).toBeVisible();
      await expect(page.getByText(/3.*winner chips/i)).toBeVisible();
      await expect(page.getByText(/1.*loser chip/i)).toBeVisible();
      await expect(page.getByText(/5.*qualification rounds/i)).toBeVisible();
      await expect(page.getByText(/8.*finalists/i)).toBeVisible();

      // Click Create Tournament button
      await page.getByRole('button', { name: /create tournament/i }).click();

      // Wait for navigation to tournament page
      await page.waitForURL(/\/tournaments\/[a-z0-9-]+\/chip-format/);

      // Verify we're on the chip format page
      await expect(page.getByRole('heading', { name: 'E2E Test Tournament' })).toBeVisible();
    });

    // Verify tournament was created in database
    await test.step('Verify database record', async () => {
      const tournament = await prisma.tournament.findFirst({
        where: { name: 'E2E Test Tournament' },
        include: { game: true },
      });

      expect(tournament).not.toBeNull();
      expect(tournament?.format).toBe('chip_format');
      expect(tournament?.game.name).toBe('Chess');

      // Verify chip config
      const chipConfig = tournament?.chipConfig as any;
      expect(chipConfig.winnerChips).toBe(3);
      expect(chipConfig.loserChips).toBe(1);
      expect(chipConfig.qualificationRounds).toBe(5);
      expect(chipConfig.finalsCount).toBe(8);
      expect(chipConfig.pairingStrategy).toBe('random');
      expect(chipConfig.tiebreaker).toBe('head_to_head');
      expect(chipConfig.allowDuplicatePairings).toBe(true);
    });
  });

  test('should validate required fields in Step 1', async ({ page }) => {
    await page.goto('/tournaments');

    // Open wizard
    await page.getByRole('button', { name: /create.*tournament/i }).click();

    // Try to proceed without filling required fields
    await page.getByRole('button', { name: /next/i }).click();

    // Verify validation errors are shown
    await expect(page.getByText(/tournament name.*required/i)).toBeVisible();
    await expect(page.getByText(/game.*required/i)).toBeVisible();

    // Verify we're still on Step 1
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
  });

  test('should allow navigation between steps using Previous button', async ({ page }) => {
    await page.goto('/tournaments');

    // Open wizard
    await page.getByRole('button', { name: /create.*tournament/i }).click();

    // Fill Step 1
    await page.getByLabel(/tournament name/i).fill('E2E Nav Test');
    await page.getByLabel(/game/i).fill('Go');

    // Go to Step 2
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText('Step 2 of 4')).toBeVisible();

    // Go to Step 3
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText('Step 3 of 4')).toBeVisible();

    // Go back to Step 2
    await page.getByRole('button', { name: /previous/i }).click();
    await expect(page.getByText('Step 2 of 4')).toBeVisible();

    // Go back to Step 1
    await page.getByRole('button', { name: /previous/i }).click();
    await expect(page.getByText('Step 1 of 4')).toBeVisible();

    // Verify form data is preserved
    await expect(page.getByLabel(/tournament name/i)).toHaveValue('E2E Nav Test');
    await expect(page.getByLabel(/game/i)).toHaveValue('Go');
  });

  test('should show progress indicator for current step', async ({ page }) => {
    await page.goto('/tournaments');

    // Open wizard
    await page.getByRole('button', { name: /create.*tournament/i }).click();

    // Check Step 1 indicator is active
    const step1Indicator = page.locator('[data-step="1"]').first();
    await expect(step1Indicator).toHaveClass(/active|current/i);

    // Fill Step 1 and proceed
    await page.getByLabel(/tournament name/i).fill('Progress Test');
    await page.getByLabel(/game/i).fill('Checkers');
    await page.getByRole('button', { name: /next/i }).click();

    // Check Step 2 indicator is active
    const step2Indicator = page.locator('[data-step="2"]').first();
    await expect(step2Indicator).toHaveClass(/active|current/i);
  });

  test('should close wizard when clicking Cancel or close button', async ({ page }) => {
    await page.goto('/tournaments');

    // Open wizard
    await page.getByRole('button', { name: /create.*tournament/i }).click();
    await expect(page.getByText('Tournament Setup')).toBeVisible();

    // Click Cancel button
    await page.getByRole('button', { name: /cancel/i }).click();

    // Verify wizard is closed
    await expect(page.getByText('Tournament Setup')).not.toBeVisible();
  });
});
