/**
 * E2E Tests: Multi-Tenant Flow
 * Validates subdomain-based tenant isolation in the application
 */

import { test, expect } from '@playwright/test';

test.describe('Multi-Tenant Isolation', () => {
  test('Tenant A cannot access Tenant B data', async ({ page }) => {
    // Login as Tenant A
    await page.goto('https://tenant-a.tournament.local');
    await page.fill('[data-testid="email"]', 'admin@tenant-a.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login"]');

    // Create a tournament
    await page.click('[data-testid="new-tournament"]');
    await page.fill('[data-testid="tournament-name"]', 'Tenant A Tournament');
    await page.click('[data-testid="save"]');

    // Store tournament ID
    const tournamentId = await page.getAttribute('[data-testid="tournament-id"]', 'value');

    // Logout
    await page.click('[data-testid="logout"]');

    // Login as Tenant B
    await page.goto('https://tenant-b.tournament.local');
    await page.fill('[data-testid="email"]', 'admin@tenant-b.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login"]');

    // Try to access Tenant A's tournament
    await page.goto(`https://tenant-b.tournament.local/tournaments/${tournamentId}`);

    // Should get 404 or access denied
    const errorMessage = await page.textContent('[data-testid="error-message"]');
    expect(errorMessage).toContain('not found');
  });

  test('Subdomain routing works correctly', async ({ page }) => {
    // Access via tenant subdomain
    await page.goto('https://tenant-a.tournament.local');

    // Verify tenant context is set
    const tenantName = await page.textContent('[data-testid="tenant-name"]');
    expect(tenantName).toBe('Tenant A');

    // Check different subdomain
    await page.goto('https://tenant-b.tournament.local');
    const tenantNameB = await page.textContent('[data-testid="tenant-name"]');
    expect(tenantNameB).toBe('Tenant B');
  });

  test('API requests include tenant header', async ({ page }) => {
    let requestHeaders: any = null;

    // Intercept API request
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        requestHeaders = request.headers();
      }
    });

    await page.goto('https://tenant-a.tournament.local');
    await page.click('[data-testid="tournaments"]');

    // Wait for API call
    await page.waitForResponse((response) => response.url().includes('/api/tournaments'));

    // Verify X-Tenant-ID header is present
    expect(requestHeaders).toHaveProperty('x-tenant-id');
    expect(requestHeaders['x-tenant-id']).toBeTruthy();
  });
});
