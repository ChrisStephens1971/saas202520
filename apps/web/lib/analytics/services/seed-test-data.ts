/**
 * Test Data Seeder
 * Sprint 10 Week 1 Day 2 - Analytics Infrastructure
 *
 * Generate realistic test data for analytics development and testing.
 * Creates 12 months of historical data including:
 * - User signups and cohorts
 * - Revenue transactions
 * - Tournament events
 * - Realistic growth patterns and seasonality
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths, addMonths, format } from 'date-fns';
import { aggregateAll } from './aggregation-service';

const prisma = new PrismaClient();

/**
 * Seeder configuration
 */
interface SeederConfig {
  tenantId: string;
  months: number;
  baseUsers: number; // Starting cohort size
  baseRevenue: number; // Starting monthly revenue (in dollars)
  baseTournaments: number; // Starting tournaments per month
  growthRate: number; // Monthly growth rate (e.g., 0.05 = 5% growth)
  churnRate: number; // Monthly churn rate (e.g., 0.15 = 15% churn)
  seasonality: boolean; // Add seasonal patterns
}

/**
 * Default seeder configuration
 */
const DEFAULT_CONFIG: SeederConfig = {
  tenantId: '',
  months: 12,
  baseUsers: 100,
  baseRevenue: 5000,
  baseTournaments: 50,
  growthRate: 0.08, // 8% monthly growth
  churnRate: 0.2, // 20% monthly churn
  seasonality: true,
};

/**
 * Seed all analytics data for a tenant
 *
 * @param tenantId - Organization ID
 * @param months - Number of months of historical data to generate
 * @param config - Optional configuration overrides
 */
export async function seedAnalyticsData(
  tenantId: string,
  months: number = 12,
  config?: Partial<SeederConfig>
): Promise<void> {
  const fullConfig: SeederConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    tenantId,
    months,
  };

  console.log(`[Seeder] Starting analytics data generation for tenant: ${tenantId}`);
  console.log(`[Seeder] Configuration:`, fullConfig);

  const now = new Date();
  const startDate = startOfMonth(subMonths(now, months - 1));
  const endDate = endOfMonth(now);

  // Clear existing test data first
  await clearTestData(tenantId);

  // Seed data in chronological order
  await seedUserCohortData(tenantId, startDate, endDate, fullConfig);
  await seedRevenueData(tenantId, startDate, endDate, fullConfig);
  await seedTournamentData(tenantId, startDate, endDate, fullConfig);

  // Run aggregations for all periods
  console.log(`[Seeder] Running aggregations...`);
  for (let i = 0; i < months; i++) {
    const monthStart = startOfMonth(subMonths(now, months - 1 - i));
    const monthEnd = endOfMonth(monthStart);

    await aggregateAll(tenantId, monthStart, monthEnd, 'month');
  }

  console.log(`[Seeder] Analytics data generation complete for tenant: ${tenantId}`);
}

/**
 * Seed user cohort data
 *
 * @param tenantId - Organization ID
 * @param startDate - Start date for data generation
 * @param endDate - End date for data generation
 * @param config - Seeder configuration
 */
export async function seedUserCohortData(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  config: SeederConfig
): Promise<void> {
  console.log(`[Seeder] Generating user cohort data...`);

  const now = new Date();
  const monthsDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  // Create user cohorts for each month
  for (let i = 0; i < monthsDiff; i++) {
    const cohortMonth = startOfMonth(addMonths(startDate, i));

    // Apply growth and seasonality
    const seasonalFactor = config.seasonality ? 1 + 0.2 * Math.sin((i / 12) * 2 * Math.PI) : 1;
    const cohortSize = Math.round(
      config.baseUsers * Math.pow(1 + config.growthRate, i) * seasonalFactor
    );

    // Calculate retention for each subsequent month
    const monthsFromCohort = Math.floor(
      (now.getTime() - cohortMonth.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    for (let monthNum = 0; monthNum <= monthsFromCohort; monthNum++) {
      // Exponential retention decay
      const retentionRate = 100 * Math.pow(1 - config.churnRate, monthNum) + Math.random() * 5; // Add some noise
      const retainedUsers = Math.round((cohortSize * retentionRate) / 100);

      // Calculate revenue for this cohort-month
      const avgRevenuePerUser = config.baseRevenue / config.baseUsers;
      const revenue = retainedUsers * avgRevenuePerUser * (0.8 + Math.random() * 0.4);

      // Calculate LTV (cumulative revenue / cohort size)
      const ltv = (revenue * (monthNum + 1)) / cohortSize;

      await prisma.userCohort.create({
        data: {
          tenantId,
          cohortMonth,
          cohortSize,
          monthNumber: monthNum,
          retainedUsers,
          retentionRate: new Prisma.Decimal(retentionRate.toFixed(2)),
          revenue: new Prisma.Decimal(revenue.toFixed(2)),
          ltv: new Prisma.Decimal(ltv.toFixed(2)),
        },
      });
    }

    console.log(
      `[Seeder] Created cohort for ${format(cohortMonth, 'yyyy-MM')}: ${cohortSize} users`
    );
  }

  console.log(`[Seeder] User cohort data generation complete`);
}

/**
 * Seed revenue data
 *
 * @param tenantId - Organization ID
 * @param startDate - Start date for data generation
 * @param endDate - End date for data generation
 * @param config - Seeder configuration
 */
export async function seedRevenueData(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  config: SeederConfig
): Promise<void> {
  console.log(`[Seeder] Generating revenue data...`);

  const monthsDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  // Verify organization exists
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
  });

  if (!org) {
    throw new Error(`Organization not found: ${tenantId}`);
  }

  // Create revenue aggregates for each month
  for (let i = 0; i < monthsDiff; i++) {
    const monthStart = startOfMonth(addMonths(startDate, i));
    const monthEnd = endOfMonth(monthStart);

    // Apply growth and seasonality
    const seasonalFactor = config.seasonality ? 1 + 0.15 * Math.sin((i / 12) * 2 * Math.PI) : 1;
    const monthlyRevenue = config.baseRevenue * Math.pow(1 + config.growthRate, i) * seasonalFactor;

    // Calculate MRR and ARR
    const mrr = monthlyRevenue;
    const arr = mrr * 12;

    // Simulate new/churned/expansion revenue
    const newRevenue = monthlyRevenue * 0.25; // 25% from new customers
    const churnedRevenue = monthlyRevenue * 0.1; // 10% churned
    const expansionRevenue = monthlyRevenue * 0.15; // 15% from upsells
    const totalRevenue = monthlyRevenue;

    // Simulate payments
    const avgPaymentAmount = 50; // $50 average
    const paymentCount = Math.round(totalRevenue / avgPaymentAmount);
    const paymentSuccessRate = 0.95;
    const paymentSuccessCount = Math.round(paymentCount * paymentSuccessRate);

    // Simulate refunds (2% of revenue)
    const refundAmount = totalRevenue * 0.02;
    const refundCount = Math.round(paymentSuccessCount * 0.02);

    await prisma.revenueAggregate.create({
      data: {
        tenantId,
        periodStart: monthStart,
        periodEnd: monthEnd,
        periodType: 'month',
        mrr: new Prisma.Decimal(mrr.toFixed(2)),
        arr: new Prisma.Decimal(arr.toFixed(2)),
        newRevenue: new Prisma.Decimal(newRevenue.toFixed(2)),
        churnedRevenue: new Prisma.Decimal(churnedRevenue.toFixed(2)),
        expansionRevenue: new Prisma.Decimal(expansionRevenue.toFixed(2)),
        totalRevenue: new Prisma.Decimal(totalRevenue.toFixed(2)),
        paymentCount,
        paymentSuccessCount,
        refundCount,
        refundAmount: new Prisma.Decimal(refundAmount.toFixed(2)),
      },
    });

    console.log(
      `[Seeder] Created revenue aggregate for ${format(
        monthStart,
        'yyyy-MM'
      )}: $${totalRevenue.toFixed(2)}`
    );
  }

  console.log(`[Seeder] Revenue data generation complete`);
}

/**
 * Seed tournament data
 *
 * @param tenantId - Organization ID
 * @param startDate - Start date for data generation
 * @param endDate - End date for data generation
 * @param config - Seeder configuration
 */
export async function seedTournamentData(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  config: SeederConfig
): Promise<void> {
  console.log(`[Seeder] Generating tournament data...`);

  const monthsDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  const formats = ['single-elimination', 'double-elimination', 'round-robin', 'swiss'];

  // Create tournament aggregates for each month
  for (let i = 0; i < monthsDiff; i++) {
    const monthStart = startOfMonth(addMonths(startDate, i));
    const monthEnd = endOfMonth(monthStart);

    // Apply growth and seasonality
    const seasonalFactor = config.seasonality
      ? 1 + 0.3 * Math.sin((i / 12) * 2 * Math.PI + Math.PI / 2)
      : 1;
    const tournamentCount = Math.round(
      config.baseTournaments * Math.pow(1 + config.growthRate, i) * seasonalFactor
    );

    // Completion rate improves over time (learning curve)
    const baseCompletionRate = 65;
    const completionRate = Math.min(95, baseCompletionRate + i * 2 + Math.random() * 5);
    const completedCount = Math.round((tournamentCount * completionRate) / 100);

    // Player statistics
    const avgPlayersPerTournament = 16 + Math.random() * 16; // 16-32 players
    const totalPlayers = Math.round(tournamentCount * avgPlayersPerTournament);

    // Duration statistics
    const avgDurationMinutes = 90 + Math.random() * 60; // 90-150 minutes

    // Most popular format (varies by season)
    const mostPopularFormat = formats[i % formats.length];

    // Revenue from tournaments
    const avgEntryFee = 25; // $25 average entry fee
    const revenue = totalPlayers * avgEntryFee * 0.7; // 70% collection rate

    await prisma.tournamentAggregate.create({
      data: {
        tenantId,
        periodStart: monthStart,
        periodEnd: monthEnd,
        periodType: 'month',
        tournamentCount,
        completedCount,
        completionRate: new Prisma.Decimal(completionRate.toFixed(2)),
        totalPlayers,
        avgPlayers: new Prisma.Decimal(avgPlayersPerTournament.toFixed(2)),
        avgDurationMinutes: new Prisma.Decimal(avgDurationMinutes.toFixed(2)),
        mostPopularFormat,
        revenue: new Prisma.Decimal(revenue.toFixed(2)),
      },
    });

    console.log(
      `[Seeder] Created tournament aggregate for ${format(
        monthStart,
        'yyyy-MM'
      )}: ${tournamentCount} tournaments`
    );
  }

  console.log(`[Seeder] Tournament data generation complete`);
}

/**
 * Clear all test data for a tenant
 *
 * @param tenantId - Organization ID
 */
export async function clearTestData(tenantId: string): Promise<void> {
  console.log(`[Seeder] Clearing existing test data for tenant: ${tenantId}`);

  await prisma.$transaction([
    prisma.userCohort.deleteMany({ where: { tenantId } }),
    prisma.revenueAggregate.deleteMany({ where: { tenantId } }),
    prisma.tournamentAggregate.deleteMany({ where: { tenantId } }),
  ]);

  console.log(`[Seeder] Test data cleared for tenant: ${tenantId}`);
}

/**
 * Seed data for multiple tenants
 *
 * @param tenantIds - Array of organization IDs
 * @param months - Number of months to generate
 */
export async function seedMultipleTenants(tenantIds: string[], months: number = 12): Promise<void> {
  console.log(`[Seeder] Seeding data for ${tenantIds.length} tenants...`);

  for (const tenantId of tenantIds) {
    try {
      await seedAnalyticsData(tenantId, months);
    } catch (error) {
      console.error(`[Seeder] Error seeding tenant ${tenantId}:`, error);
    }
  }

  console.log(`[Seeder] Multi-tenant seeding complete`);
}

/**
 * CLI entry point for running the seeder
 *
 * Usage:
 *   tsx apps/web/lib/analytics/services/seed-test-data.ts <tenantId> [months]
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: tsx seed-test-data.ts <tenantId> [months]');
    console.error('Example: tsx seed-test-data.ts org_123 12');
    process.exit(1);
  }

  const tenantId = args[0];
  const months = args[1] ? parseInt(args[1]) : 12;

  console.log(`[Seeder] Starting seeder for tenant: ${tenantId}`);
  console.log(`[Seeder] Generating ${months} months of data`);

  try {
    await seedAnalyticsData(tenantId, months);
    console.log('[Seeder] Success! Analytics data generated.');
  } catch (error) {
    console.error('[Seeder] Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
