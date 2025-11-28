import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/saas202520_test?schema=public',
    },
  },
});

test.describe('Tournament Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth/signin');
    await page.getByLabel(/email/i).fill('admin@saas202520.com');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/admin/dashboard');
  });

  test.afterEach(async () => {
    await prisma.tournament.deleteMany({
      where: {
        name: {
          startsWith: 'E2E Flow Test',
        },
      },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should create, view, and delete a tournament', async ({ page }) => {
    // 1. Create Tournament
    await page.goto('/admin/tournaments');
    await page.getByRole('button', { name: /create tournament/i }).click();

    await page.getByLabel(/tournament name/i).fill('E2E Flow Test Tournament');
    await page.getByLabel(/game/i).fill('Pool');
    await page.getByRole('button', { name: /next/i }).click();

    // Step 2
    await page.getByRole('button', { name: /next/i }).click();
    // Step 3
    await page.getByRole('button', { name: /next/i }).click();
    // Step 4
    await page.getByRole('button', { name: /create tournament/i }).click();

    // 2. Verify List
    await page.goto('/admin/tournaments');
    await expect(page.getByText('E2E Flow Test Tournament')).toBeVisible();

    // 3. Delete Tournament
    // Find the row with the tournament name
    const row = page.getByRole('row', { name: 'E2E Flow Test Tournament' });
    await row.getByRole('button', { name: 'Delete' }).click();

    // Confirm dialog
    await expect(page.getByRole('heading', { name: 'Delete Tournament' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();

    // Verify removed
    await expect(page.getByText('E2E Flow Test Tournament')).not.toBeVisible();
  });
});
