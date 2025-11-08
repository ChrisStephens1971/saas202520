/**
 * Analytics Aggregation Service
 * Sprint 10 Week 1 - Pre-computed Analytics
 *
 * Computes and stores aggregated analytics data for fast dashboard queries.
 * Processes raw events and transactions to create time-based summaries.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  endOfDay,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  differenceInMonths,
  addMonths,
  format,
} from 'date-fns';

const prisma = new PrismaClient();

/**
 * Period type for aggregations
 */
export type PeriodType = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Calculate period boundaries based on type
 *
 * @param date - Reference date
 * @param periodType - Type of period
 * @returns Start and end dates for the period
 */
function getPeriodBoundaries(
  date: Date,
  periodType: PeriodType
): { start: Date; end: Date } {
  switch (periodType) {
    case 'day':
      return { start: startOfDay(date), end: endOfDay(date) };
    case 'week':
      return { start: startOfWeek(date), end: endOfWeek(date) };
    case 'month':
      return { start: startOfMonth(date), end: endOfMonth(date) };
    case 'quarter':
      return { start: startOfQuarter(date), end: endOfQuarter(date) };
    case 'year':
      return { start: startOfYear(date), end: endOfYear(date) };
  }
}

/**
 * Aggregate revenue metrics for a tenant and time period
 *
 * Computes:
 * - Total revenue
 * - New revenue (from new customers)
 * - Churned revenue (from cancelled subscriptions)
 * - Expansion revenue (from upsells/upgrades)
 * - MRR and ARR estimates
 * - Payment counts and success rates
 * - Refund amounts
 *
 * @param tenantId - Organization/tenant ID
 * @param periodStart - Start of the aggregation period
 * @param periodEnd - End of the aggregation period
 * @param periodType - Type of period (day, week, month, etc.)
 */
export async function aggregateRevenue(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date,
  periodType: PeriodType
): Promise<void> {
  console.log(
    `[Aggregation] Computing revenue for tenant ${tenantId}, period ${format(
      periodStart,
      'yyyy-MM-dd'
    )} to ${format(periodEnd, 'yyyy-MM-dd')}, type: ${periodType}`
  );

  try {
    // Get all tournaments for this organization in the period
    const tournaments = await prisma.tournament.findMany({
      where: {
        orgId: tenantId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: { id: true },
    });

    const tournamentIds = tournaments.map((t) => t.id);

    if (tournamentIds.length === 0) {
      console.log(`[Aggregation] No tournaments found for tenant ${tenantId} in period`);
      // Still create/update aggregate with zero values
    }

    // Get payment statistics
    const paymentStats = await prisma.payment.groupBy({
      by: ['status'],
      where: {
        tournamentId: tournamentIds.length > 0 ? { in: tournamentIds } : undefined,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    // Get refund statistics
    const refundStats = await prisma.refund.aggregate({
      where: {
        payment: {
          tournamentId: tournamentIds.length > 0 ? { in: tournamentIds } : undefined,
        },
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: 'succeeded',
      },
      _count: { id: true },
      _sum: { amount: true },
    });

    // Calculate totals
    const totalPayments = paymentStats.reduce((sum, stat) => sum + stat._count.id, 0);
    const successfulPayments = paymentStats
      .filter((stat) => stat.status === 'succeeded')
      .reduce((sum, stat) => sum + stat._count.id, 0);
    const totalRevenue = paymentStats
      .filter((stat) => stat.status === 'succeeded')
      .reduce((sum, stat) => sum + (stat._sum.amount || 0), 0);
    const refundCount = refundStats._count.id || 0;
    const refundAmount = refundStats._sum.amount || 0;

    // Calculate net revenue (revenue minus refunds)
    const netRevenue = totalRevenue - refundAmount;

    // Estimate MRR and ARR based on period type
    let mrr: number | null = null;
    let arr: number | null = null;

    if (periodType === 'month') {
      mrr = netRevenue / 100; // Convert cents to dollars
      arr = mrr * 12;
    } else if (periodType === 'year') {
      arr = netRevenue / 100; // Convert cents to dollars
      mrr = arr / 12;
    }

    // For new/churned/expansion revenue, we need more sophisticated tracking
    // For now, we'll set them to null (future enhancement)
    const newRevenue = null;
    const churnedRevenue = null;
    const expansionRevenue = null;

    // Upsert the aggregate record
    await prisma.revenueAggregate.upsert({
      where: {
        tenantId_periodType_periodStart: {
          tenantId,
          periodType,
          periodStart,
        },
      },
      create: {
        tenantId,
        periodStart,
        periodEnd,
        periodType,
        mrr,
        arr,
        newRevenue,
        churnedRevenue,
        expansionRevenue,
        totalRevenue: new Prisma.Decimal(netRevenue / 100), // Convert cents to dollars
        paymentCount: totalPayments,
        paymentSuccessCount: successfulPayments,
        refundCount,
        refundAmount: new Prisma.Decimal(refundAmount / 100), // Convert cents to dollars
      },
      update: {
        periodEnd,
        mrr,
        arr,
        newRevenue,
        churnedRevenue,
        expansionRevenue,
        totalRevenue: new Prisma.Decimal(netRevenue / 100),
        paymentCount: totalPayments,
        paymentSuccessCount: successfulPayments,
        refundCount,
        refundAmount: new Prisma.Decimal(refundAmount / 100),
      },
    });

    console.log(
      `[Aggregation] Revenue aggregation complete for tenant ${tenantId}: $${
        netRevenue / 100
      }`
    );
  } catch (error) {
    console.error(`[Aggregation] Error aggregating revenue for tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Aggregate user cohort retention metrics
 *
 * Computes retention rates for user cohorts based on signup month.
 * Tracks how many users from each cohort are still active over time.
 *
 * @param tenantId - Organization/tenant ID
 * @param cohortMonth - First day of the cohort month (YYYY-MM-01)
 */
export async function aggregateCohorts(
  tenantId: string,
  cohortMonth: Date
): Promise<void> {
  console.log(
    `[Aggregation] Computing cohorts for tenant ${tenantId}, month ${format(
      cohortMonth,
      'yyyy-MM'
    )}`
  );

  try {
    // Normalize to first day of month
    const cohortStart = startOfMonth(cohortMonth);
    const cohortEnd = endOfMonth(cohortMonth);

    // Get users who signed up in this cohort month
    // Note: In our schema, users don't have an orgId directly
    // We need to join through organization_members
    const cohortUsers = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: cohortStart,
          lte: cohortEnd,
        },
        organizationMembers: {
          some: {
            orgId: tenantId,
          },
        },
      },
      select: {
        id: true,
        lastLoginAt: true,
      },
    });

    const cohortSize = cohortUsers.length;

    if (cohortSize === 0) {
      console.log(`[Aggregation] No users found for cohort ${format(cohortMonth, 'yyyy-MM')}`);
      return;
    }

    // Calculate retention for each month since cohort creation
    const currentDate = new Date();
    const monthsSinceCohort = differenceInMonths(currentDate, cohortStart);

    for (let monthNumber = 0; monthNumber <= monthsSinceCohort; monthNumber++) {
      const retentionCheckDate = addMonths(cohortStart, monthNumber);
      const retentionPeriodEnd = endOfMonth(retentionCheckDate);

      // Count users who have logged in during or after this month
      // (indicating they're still active)
      const retainedUsers = cohortUsers.filter((user) => {
        if (!user.lastLoginAt) return monthNumber === 0; // Count as retained in month 0 if no login
        return user.lastLoginAt >= cohortStart && user.lastLoginAt <= retentionPeriodEnd;
      }).length;

      const retentionRate = (retainedUsers / cohortSize) * 100;

      // Calculate revenue for this cohort in this month (optional enhancement)
      const revenue = null;
      const ltv = null;

      // Upsert cohort data
      await prisma.userCohort.upsert({
        where: {
          tenantId_cohortMonth_monthNumber: {
            tenantId,
            cohortMonth: cohortStart,
            monthNumber,
          },
        },
        create: {
          tenantId,
          cohortMonth: cohortStart,
          cohortSize,
          monthNumber,
          retainedUsers,
          retentionRate: new Prisma.Decimal(retentionRate.toFixed(2)),
          revenue,
          ltv,
        },
        update: {
          cohortSize, // Update in case more users were added retroactively
          retainedUsers,
          retentionRate: new Prisma.Decimal(retentionRate.toFixed(2)),
          revenue,
          ltv,
        },
      });
    }

    console.log(
      `[Aggregation] Cohort aggregation complete for tenant ${tenantId}, cohort ${format(
        cohortMonth,
        'yyyy-MM'
      )}: ${cohortSize} users`
    );
  } catch (error) {
    console.error(`[Aggregation] Error aggregating cohorts for tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Aggregate tournament performance metrics
 *
 * Computes:
 * - Tournament counts (total, completed, cancelled)
 * - Completion rates
 * - Player statistics (total, average per tournament)
 * - Average tournament duration
 * - Most popular format
 * - Revenue per tournament
 *
 * @param tenantId - Organization/tenant ID
 * @param periodStart - Start of the aggregation period
 * @param periodEnd - End of the aggregation period
 * @param periodType - Type of period (day, week, month, etc.)
 */
export async function aggregateTournaments(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date,
  periodType: PeriodType
): Promise<void> {
  console.log(
    `[Aggregation] Computing tournaments for tenant ${tenantId}, period ${format(
      periodStart,
      'yyyy-MM-dd'
    )} to ${format(periodEnd, 'yyyy-MM-dd')}, type: ${periodType}`
  );

  try {
    // Get all tournaments in the period
    const tournaments = await prisma.tournament.findMany({
      where: {
        orgId: tenantId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        players: {
          select: { id: true },
        },
      },
    });

    const tournamentCount = tournaments.length;

    if (tournamentCount === 0) {
      console.log(`[Aggregation] No tournaments found for tenant ${tenantId} in period`);
      // Create aggregate with zero values
      await prisma.tournamentAggregate.upsert({
        where: {
          tenantId_periodType_periodStart: {
            tenantId,
            periodType,
            periodStart,
          },
        },
        create: {
          tenantId,
          periodStart,
          periodEnd,
          periodType,
          tournamentCount: 0,
          completedCount: 0,
          completionRate: new Prisma.Decimal(0),
          totalPlayers: 0,
          avgPlayers: new Prisma.Decimal(0),
          avgDurationMinutes: new Prisma.Decimal(0),
          mostPopularFormat: null,
          revenue: new Prisma.Decimal(0),
        },
        update: {
          periodEnd,
          tournamentCount: 0,
          completedCount: 0,
          completionRate: new Prisma.Decimal(0),
          totalPlayers: 0,
          avgPlayers: new Prisma.Decimal(0),
          avgDurationMinutes: new Prisma.Decimal(0),
          mostPopularFormat: null,
          revenue: new Prisma.Decimal(0),
        },
      });
      return;
    }

    // Calculate statistics
    const completedTournaments = tournaments.filter((t) => t.status === 'completed');
    const completedCount = completedTournaments.length;
    const completionRate = (completedCount / tournamentCount) * 100;

    // Player statistics
    const totalPlayers = tournaments.reduce((sum, t) => sum + t.players.length, 0);
    const avgPlayers = totalPlayers / tournamentCount;

    // Calculate average duration for completed tournaments
    const tournamentsWithDuration = completedTournaments.filter(
      (t) => t.startedAt && t.completedAt
    );
    const totalDurationMinutes = tournamentsWithDuration.reduce((sum, t) => {
      const duration =
        (t.completedAt!.getTime() - t.startedAt!.getTime()) / (1000 * 60);
      return sum + duration;
    }, 0);
    const avgDurationMinutes =
      tournamentsWithDuration.length > 0
        ? totalDurationMinutes / tournamentsWithDuration.length
        : 0;

    // Find most popular format
    const formatCounts: Record<string, number> = {};
    tournaments.forEach((t) => {
      formatCounts[t.format] = (formatCounts[t.format] || 0) + 1;
    });
    const mostPopularFormat = Object.entries(formatCounts).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0] || null;

    // Calculate revenue from tournaments in this period
    const tournamentIds = tournaments.map((t) => t.id);
    const revenueStats = await prisma.payment.aggregate({
      where: {
        tournamentId: { in: tournamentIds },
        status: 'succeeded',
      },
      _sum: { amount: true },
    });
    const revenue = revenueStats._sum.amount || 0;

    // Upsert the aggregate record
    await prisma.tournamentAggregate.upsert({
      where: {
        tenantId_periodType_periodStart: {
          tenantId,
          periodType,
          periodStart,
        },
      },
      create: {
        tenantId,
        periodStart,
        periodEnd,
        periodType,
        tournamentCount,
        completedCount,
        completionRate: new Prisma.Decimal(completionRate.toFixed(2)),
        totalPlayers,
        avgPlayers: new Prisma.Decimal(avgPlayers.toFixed(2)),
        avgDurationMinutes: new Prisma.Decimal(avgDurationMinutes.toFixed(2)),
        mostPopularFormat,
        revenue: new Prisma.Decimal(revenue / 100), // Convert cents to dollars
      },
      update: {
        periodEnd,
        tournamentCount,
        completedCount,
        completionRate: new Prisma.Decimal(completionRate.toFixed(2)),
        totalPlayers,
        avgPlayers: new Prisma.Decimal(avgPlayers.toFixed(2)),
        avgDurationMinutes: new Prisma.Decimal(avgDurationMinutes.toFixed(2)),
        mostPopularFormat,
        revenue: new Prisma.Decimal(revenue / 100),
      },
    });

    console.log(
      `[Aggregation] Tournament aggregation complete for tenant ${tenantId}: ${tournamentCount} tournaments, ${completedCount} completed`
    );
  } catch (error) {
    console.error(
      `[Aggregation] Error aggregating tournaments for tenant ${tenantId}:`,
      error
    );
    throw error;
  }
}

/**
 * Run all aggregations for a tenant and time period
 *
 * @param tenantId - Organization/tenant ID
 * @param periodStart - Start of the aggregation period
 * @param periodEnd - End of the aggregation period
 * @param periodType - Type of period (day, week, month, etc.)
 */
export async function aggregateAll(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date,
  periodType: PeriodType
): Promise<void> {
  console.log(
    `[Aggregation] Running all aggregations for tenant ${tenantId}, period ${format(
      periodStart,
      'yyyy-MM-dd'
    )} to ${format(periodEnd, 'yyyy-MM-dd')}`
  );

  await Promise.all([
    aggregateRevenue(tenantId, periodStart, periodEnd, periodType),
    aggregateTournaments(tenantId, periodStart, periodEnd, periodType),
  ]);

  // Cohorts are aggregated differently (by signup month)
  // We'll aggregate cohorts for the period month
  const cohortMonth = startOfMonth(periodStart);
  await aggregateCohorts(tenantId, cohortMonth);

  console.log(`[Aggregation] All aggregations complete for tenant ${tenantId}`);
}

/**
 * Get all active tenants that need aggregation
 *
 * @returns Array of tenant IDs
 */
export async function getActiveTenants(): Promise<string[]> {
  const organizations = await prisma.organization.findMany({
    select: { id: true },
  });

  return organizations.map((org) => org.id);
}

/**
 * Helper to get period boundaries for standard aggregation intervals
 */
export function getStandardPeriods(date: Date = new Date()): {
  day: { start: Date; end: Date };
  week: { start: Date; end: Date };
  month: { start: Date; end: Date };
  quarter: { start: Date; end: Date };
  year: { start: Date; end: Date };
} {
  return {
    day: getPeriodBoundaries(date, 'day'),
    week: getPeriodBoundaries(date, 'week'),
    month: getPeriodBoundaries(date, 'month'),
    quarter: getPeriodBoundaries(date, 'quarter'),
    year: getPeriodBoundaries(date, 'year'),
  };
}
