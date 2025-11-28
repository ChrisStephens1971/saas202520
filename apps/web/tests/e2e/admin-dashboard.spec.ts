/**
 * E2E Test: Admin Dashboard
 * Sprint 9 Phase 2 - Admin Dashboard Tests
 *
 * Tests complete admin dashboard workflows:
 * - Admin login and access
 * - Tournament management (create, edit, delete, bulk operations)
 * - User management (search, view, role change, ban, suspend)
 * - Analytics viewing and export
 * - Audit log viewing, filtering, and export
 * - Settings management
 */

import { test, expect, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/saas202520_test?schema=public',
    },
  },
});

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/auth/signin');
  await page.getByLabel(/email/i).fill('admin@saas202520.com');
  await page.getByLabel(/password/i).fill('admin123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/admin/dashboard');
}

// Helper function to login as organizer
async function loginAsOrganizer(page: Page) {
  await page.goto('/auth/signin');
  await page.getByLabel(/email/i).fill('organizer@saas202520.com');
  await page.getByLabel(/password/i).fill('organizer123');
  await page.getByRole('button', { name: /sign in/i }).click();
}

// Helper function to login as player
async function loginAsPlayer(page: Page) {
  await page.goto('/auth/signin');
  await page.getByLabel(/email/i).fill('player@saas202520.com');
  await page.getByLabel(/password/i).fill('player123');
  await page.getByRole('button', { name: /sign in/i }).click();
}

test.describe('Admin Dashboard E2E Tests', () => {
  test.beforeAll(async () => {
    // Set up test database with admin user
    // This would be done in beforeAll hook
  });

  test.afterEach(async () => {
    // Clean up created test data
    await prisma.tournament.deleteMany({
      where: {
        name: {
          startsWith: 'E2E Admin Test',
        },
      },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  // ============================================================================
  // ADMIN LOGIN FLOW
  // ============================================================================

  test.describe('Admin Login Flow', () => {
    test('should login as admin and access dashboard', async ({ page }) => {
      await loginAsAdmin(page);

      // Verify on admin dashboard
      await expect(page).toHaveURL(/\/admin\/dashboard/);
      await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();

      // Verify overview metrics are visible
      await expect(page.getByTestId('metric-total-users')).toBeVisible();
      await expect(page.getByTestId('metric-active-tournaments')).toBeVisible();
      await expect(page.getByTestId('metric-total-revenue')).toBeVisible();
    });

    test('should deny non-admin access to admin dashboard', async ({ page }) => {
      await loginAsPlayer(page);

      // Try to access admin dashboard
      await page.goto('/admin/dashboard');

      // Should be redirected or see access denied
      await expect(page.getByText(/access denied|not authorized/i)).toBeVisible();
    });

    test('should allow organizer limited access', async ({ page }) => {
      await loginAsOrganizer(page);

      // Navigate to admin area
      await page.goto('/admin/tournaments');

      // Organizer should see tournaments but not all admin features
      await expect(page.getByRole('heading', { name: /tournaments/i })).toBeVisible();

      // Try to access user management (should be denied)
      await page.goto('/admin/users');
      await expect(page.getByText(/access denied|not authorized/i)).toBeVisible();
    });
  });

  // ============================================================================
  // TOURNAMENT MANAGEMENT FLOW
  // ============================================================================

  test.describe('Tournament Management Flow', () => {
    test('should create new tournament via wizard', async ({ page }) => {
      await loginAsAdmin(page);

      // Navigate to tournaments page
      await page.goto('/admin/tournaments');

      // Click create tournament button
      await page.getByRole('button', { name: /create tournament/i }).click();

      // Fill tournament wizard
      await page.getByLabel(/tournament name/i).fill('E2E Admin Test Tournament');
      await page.getByLabel(/game/i).fill('Pool 8-Ball');
      await page.getByRole('button', { name: /next/i }).click();

      // Complete wizard
      await page.getByRole('button', { name: /create/i }).click();

      // Verify tournament created
      await expect(page.getByText('E2E Admin Test Tournament')).toBeVisible();

      // Verify in database
      const tournament = await prisma.tournament.findFirst({
        where: { name: 'E2E Admin Test Tournament' },
      });
      expect(tournament).not.toBeNull();
    });

    test('should edit tournament details', async ({ page }) => {
      // Create tournament first
      const tournament = await prisma.tournament.create({
        data: {
          name: 'E2E Admin Test Edit',
          orgId: 'org_test_123',
          status: 'draft',
          format: 'single_elimination',
          sportConfigId: 'pool_8ball',
          sportConfigVersion: '1.0.0',
          createdBy: 'admin_user_123',
        },
      });

      await loginAsAdmin(page);
      await page.goto('/admin/tournaments');

      // Find and click edit button
      await page.getByTestId(`tournament-${tournament.id}-edit`).click();

      // Edit tournament name
      await page.getByLabel(/tournament name/i).fill('E2E Admin Test Edited');
      await page.getByRole('button', { name: /save/i }).click();

      // Verify updated
      await expect(page.getByText('E2E Admin Test Edited')).toBeVisible();

      // Verify in database
      const updated = await prisma.tournament.findUnique({
        where: { id: tournament.id },
      });
      expect(updated?.name).toBe('E2E Admin Test Edited');
    });

    test('should change tournament status', async ({ page }) => {
      const tournament = await prisma.tournament.create({
        data: {
          name: 'E2E Admin Test Status',
          orgId: 'org_test_123',
          status: 'draft',
          format: 'single_elimination',
          sportConfigId: 'pool_8ball',
          sportConfigVersion: '1.0.0',
          createdBy: 'admin_user_123',
        },
      });

      await loginAsAdmin(page);
      await page.goto('/admin/tournaments');

      // Change status dropdown
      await page.getByTestId(`tournament-${tournament.id}-status`).selectOption('active');

      // Verify status changed
      await expect(page.getByTestId(`tournament-${tournament.id}-status`)).toHaveValue('active');

      // Verify in database
      const updated = await prisma.tournament.findUnique({
        where: { id: tournament.id },
      });
      expect(updated?.status).toBe('active');
    });

    test('should delete tournament (soft delete)', async ({ page }) => {
      const tournament = await prisma.tournament.create({
        data: {
          name: 'E2E Admin Test Delete',
          orgId: 'org_test_123',
          status: 'draft',
          format: 'single_elimination',
          sportConfigId: 'pool_8ball',
          sportConfigVersion: '1.0.0',
          createdBy: 'admin_user_123',
        },
      });

      await loginAsAdmin(page);
      await page.goto('/admin/tournaments');

      // Click delete button
      await page.getByTestId(`tournament-${tournament.id}-delete`).click();

      // Confirm deletion
      await page.getByRole('button', { name: 'Delete' }).click();

      // Verify removed from list
      await expect(page.getByTestId(`tournament-${tournament.id}`)).not.toBeVisible();

      // Verify soft deleted in database (status = cancelled)
      const deleted = await prisma.tournament.findUnique({
        where: { id: tournament.id },
      });
      expect(deleted?.status).toBe('cancelled');
    });

    test('should bulk archive tournaments', async ({ page }) => {
      // Create multiple completed tournaments
      await prisma.tournament.createMany({
        data: [
          {
            name: 'E2E Admin Test Bulk 1',
            orgId: 'org_test_123',
            status: 'completed',
            format: 'single_elimination',
            sportConfigId: 'pool_8ball',
            sportConfigVersion: '1.0.0',
            createdBy: 'admin_user_123',
          },
          {
            name: 'E2E Admin Test Bulk 2',
            orgId: 'org_test_123',
            status: 'completed',
            format: 'single_elimination',
            sportConfigId: 'pool_8ball',
            sportConfigVersion: '1.0.0',
            createdBy: 'admin_user_123',
          },
        ],
      });

      await loginAsAdmin(page);
      await page.goto('/admin/tournaments');

      // Filter to completed tournaments
      await page.getByTestId('tournament-filter').selectOption('completed');

      // Select all
      await page.getByTestId('select-all-tournaments').check();

      // Click bulk delete
      await page.getByRole('button', { name: /delete selected/i }).click();
      await page.getByRole('button', { name: 'Delete Selected' }).click();

      // Verify archived
      const archived = await prisma.tournament.findMany({
        where: {
          name: { startsWith: 'E2E Admin Test Bulk' },
        },
      });

      archived.forEach((t) => {
        expect(t.status).toBe('cancelled');
      });
    });
  });

  // ============================================================================
  // USER MANAGEMENT FLOW
  // ============================================================================

  test.describe('User Management Flow', () => {
    test('should search for user', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/users');

      // Search for user
      await page.getByTestId('user-search').fill('admin@saas202520.com');

      // Verify search results
      await expect(page.getByText('admin@saas202520.com')).toBeVisible();
    });

    test('should view user details and history', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/users');

      // Click on user to view details
      await page.getByText('admin@saas202520.com').click();

      // Verify user details modal/page
      await expect(page.getByRole('heading', { name: /user details/i })).toBeVisible();
      await expect(page.getByText(/email.*admin@saas202520.com/i)).toBeVisible();
      await expect(page.getByText(/member since/i)).toBeVisible();
    });

    test('should change user role', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/users');

      // Find organizer user
      await page.getByTestId('user-search').fill('organizer@saas202520.com');
      await page.getByText('organizer@saas202520.com').click();

      // Change role
      await page.getByTestId('user-role-select').selectOption('admin');
      await page.getByRole('button', { name: /save|update/i }).click();

      // Verify role changed
      await expect(page.getByText(/role updated successfully/i)).toBeVisible();
    });

    test('should ban user with reason', async ({ page }) => {
      // Create test user to ban
      const user = await prisma.user.create({
        data: {
          email: 'toban@example.com',
          name: 'User To Ban',
        },
      });

      await loginAsAdmin(page);
      await page.goto('/admin/users');

      // Search for user
      await page.getByTestId('user-search').fill('toban@example.com');
      await page.getByText('toban@example.com').click();

      // Click ban button
      await page.getByRole('button', { name: /ban user/i }).click();

      // Fill ban reason
      await page.getByLabel(/reason/i).fill('Violation of terms of service');
      await page.getByRole('button', { name: /confirm ban/i }).click();

      // Verify banned
      await expect(page.getByText(/user banned successfully/i)).toBeVisible();
      await expect(page.getByText(/status.*banned/i)).toBeVisible();
    });

    test('should suspend user with duration', async ({ page }) => {
      const user = await prisma.user.create({
        data: {
          email: 'tosuspend@example.com',
          name: 'User To Suspend',
        },
      });

      await loginAsAdmin(page);
      await page.goto('/admin/users');

      // Search for user
      await page.getByTestId('user-search').fill('tosuspend@example.com');
      await page.getByText('tosuspend@example.com').click();

      // Click suspend button
      await page.getByRole('button', { name: /suspend user/i }).click();

      // Fill suspension details
      await page.getByLabel(/duration.*days/i).fill('7');
      await page.getByLabel(/reason/i).fill('Temporary suspension');
      await page.getByRole('button', { name: /confirm suspend/i }).click();

      // Verify suspended
      await expect(page.getByText(/user suspended successfully/i)).toBeVisible();
      await expect(page.getByText(/suspended until/i)).toBeVisible();
    });
  });

  // ============================================================================
  // ANALYTICS FLOW
  // ============================================================================

  test.describe('Analytics Flow', () => {
    test('should view system analytics', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/analytics');

      // Verify analytics page loaded
      await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible();

      // Verify charts visible
      await expect(page.getByTestId('chart-user-growth')).toBeVisible();
      await expect(page.getByTestId('chart-tournament-activity')).toBeVisible();
      await expect(page.getByTestId('chart-revenue')).toBeVisible();
    });

    test('should change date range', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/analytics');

      // Change date range
      await page.getByTestId('date-range-start').fill('2025-01-01');
      await page.getByTestId('date-range-end').fill('2025-01-31');
      await page.getByRole('button', { name: /apply|update/i }).click();

      // Verify charts updated (check for loading then loaded state)
      await expect(page.getByTestId('chart-loading')).toBeVisible();
      await expect(page.getByTestId('chart-loading')).not.toBeVisible();
      await expect(page.getByTestId('chart-user-growth')).toBeVisible();
    });

    test('should export chart data', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/analytics');

      // Set up download listener
      const downloadPromise = page.waitForEvent('download');

      // Click export button
      await page.getByRole('button', { name: /export.*data/i }).click();

      // Wait for download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/analytics.*\.(csv|json)/);
    });

    test('should navigate between analytics views', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/analytics');

      // Navigate to revenue view
      await page.getByRole('tab', { name: /revenue/i }).click();
      await expect(page.getByTestId('chart-revenue')).toBeVisible();

      // Navigate to users view
      await page.getByRole('tab', { name: /users/i }).click();
      await expect(page.getByTestId('chart-user-growth')).toBeVisible();

      // Navigate to tournaments view
      await page.getByRole('tab', { name: /tournaments/i }).click();
      await expect(page.getByTestId('chart-tournament-activity')).toBeVisible();
    });
  });

  // ============================================================================
  // AUDIT LOG FLOW
  // ============================================================================

  test.describe('Audit Log Flow', () => {
    test('should view audit logs', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/audit');

      // Verify audit log page
      await expect(page.getByRole('heading', { name: /audit.*logs/i })).toBeVisible();

      // Verify logs table visible
      await expect(page.getByTestId('audit-log-table')).toBeVisible();
    });

    test('should filter by user and action', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/audit');

      // Filter by user
      await page.getByTestId('filter-user').selectOption('admin@saas202520.com');

      // Verify filtered results
      const rows = page.getByTestId('audit-log-table').locator('tbody tr');
      await expect(rows.first()).toBeVisible();

      // Filter by action
      await page.getByTestId('filter-action').selectOption('tournament.created');

      // Verify filtered by action
      await expect(rows.first()).toContainText('tournament.created');
    });

    test('should search logs', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/audit');

      // Search logs
      await page.getByTestId('audit-search').fill('tournament');

      // Verify search results
      const rows = page.getByTestId('audit-log-table').locator('tbody tr');
      await expect(rows.first()).toContainText('tournament');
    });

    test('should export logs to CSV', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/audit');

      // Set up download listener
      const downloadPromise = page.waitForEvent('download');

      // Click export button
      await page.getByRole('button', { name: /export.*csv/i }).click();

      // Wait for download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/audit.*logs.*\.csv/);
    });
  });

  // ============================================================================
  // SETTINGS MANAGEMENT FLOW
  // ============================================================================

  test.describe('Settings Management Flow', () => {
    test('should update general settings', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/settings');

      // Update site name
      await page.getByTestId('setting-site-name').fill('Updated Tournament Platform');
      await page.getByRole('button', { name: /save/i }).click();

      // Verify saved
      await expect(page.getByText(/settings saved successfully/i)).toBeVisible();
    });

    test('should toggle feature flags', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/settings');

      // Navigate to feature flags tab
      await page.getByRole('tab', { name: /feature flags/i }).click();

      // Toggle a feature flag
      const chipFormatToggle = page.getByTestId('flag-chip-format');
      const initialState = await chipFormatToggle.isChecked();

      await chipFormatToggle.click();

      // Verify toggled
      const newState = await chipFormatToggle.isChecked();
      expect(newState).toBe(!initialState);
    });

    test('should change notification settings', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/settings');

      // Navigate to notifications tab
      await page.getByRole('tab', { name: /notifications/i }).click();

      // Update Twilio settings
      await page.getByTestId('setting-twilio-phone').fill('+15551234567');
      await page.getByRole('button', { name: /save/i }).click();

      // Verify saved
      await expect(page.getByText(/settings saved successfully/i)).toBeVisible();
    });

    test('should verify audit log entry created', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/settings');

      // Update a setting
      await page.getByTestId('setting-site-name').fill('Test Platform');
      await page.getByRole('button', { name: /save/i }).click();

      // Navigate to audit logs
      await page.goto('/admin/audit');

      // Search for settings change
      await page.getByTestId('audit-search').fill('settings.updated');

      // Verify audit entry exists
      const rows = page.getByTestId('audit-log-table').locator('tbody tr');
      await expect(rows.first()).toContainText('settings.updated');
    });
  });
});
