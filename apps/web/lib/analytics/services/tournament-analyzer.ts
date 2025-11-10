/**
 * Tournament Analyzer Service
 * Sprint 10 Week 1 Day 3 - Advanced Analytics
 *
 * Advanced tournament performance analysis and insights.
 * Provides comprehensive tournament metrics, trend analysis,
 * format popularity, attendance predictions, and benchmarking.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfDay,
  endOfWeek,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  differenceInMinutes,
  format,
  getDay,
} from 'date-fns';
import * as CacheManager from './cache-manager';

const prisma = new PrismaClient();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Options for tournament analysis
 */
export interface AnalysisOptions {
  startDate?: Date;
  endDate?: Date;
  periodType?: 'day' | 'week' | 'month';
  compareToPrevious?: boolean;
  includeFormatBreakdown?: boolean;
  includePlayerMetrics?: boolean;
}

/**
 * Complete tournament performance analysis
 */
export interface TournamentPerformance {
  period: {
    start: Date;
    end: Date;
    type: 'day' | 'week' | 'month';
  };
  metrics: {
    tournamentCount: number;
    completedCount: number;
    completionRate: number;
    avgPlayersPerTournament: number;
    avgDurationMinutes: number;
    totalPlayers: number;
    totalRevenue: number;
    avgRevenuePerTournament: number;
  };
  comparison?: {
    tournamentCount: { value: number; change: number; trend: 'up' | 'down' | 'flat' };
    completionRate: { value: number; change: number; trend: 'up' | 'down' | 'flat' };
    avgPlayers: { value: number; change: number; trend: 'up' | 'down' | 'flat' };
    revenue: { value: number; change: number; trend: 'up' | 'down' | 'flat' };
  };
  formatBreakdown?: FormatPopularity[];
  insights: string[];
}

/**
 * Tournament format popularity analysis
 */
export interface FormatPopularity {
  format: string;
  tournamentCount: number;
  totalPlayers: number;
  avgPlayersPerTournament: number;
  completionRate: number;
  avgDurationMinutes: number;
  totalRevenue: number;
  avgRevenuePerTournament: number;
  marketShare: number; // Percentage of total tournaments
}

/**
 * Historical tournament trend data
 */
export interface TournamentTrend {
  period: Date;
  periodLabel: string;
  metrics: {
    tournamentCount: number;
    completionRate: number;
    avgPlayers: number;
    totalRevenue: number;
  };
  growthRates: {
    tournaments: number;
    players: number;
    revenue: number;
  };
}

/**
 * Core tournament metrics
 */
export interface TournamentMetrics {
  participationRate: number; // Percentage of registered players who actually play
  completionRate: number;
  avgDurationMinutes: number;
  avgPlayersPerTournament: number;
  playerReturnRate: number; // Percentage of players who play in multiple tournaments
  avgMatchesPerTournament: number;
  tableUtilization: number; // Percentage of time tables are in use
}

/**
 * Tournament attendance prediction
 */
export interface AttendancePrediction {
  tournamentId?: string;
  format: string;
  date: Date;
  dayOfWeek: string;
  predictedAttendance: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  confidence: 'high' | 'medium' | 'low';
  factors: {
    formatPopularity: number;
    dayOfWeekTrend: number;
    seasonalFactor: number;
    historicalAverage: number;
  };
  recommendation: string;
}

/**
 * Player engagement metrics
 */
export interface PlayerEngagement {
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    uniquePlayers: number;
    totalParticipations: number;
    avgTournamentsPerPlayer: number;
    repeatParticipationRate: number;
    newPlayerRate: number;
    retentionRate: number;
  };
  segments: {
    oneTournament: number;
    twoToFive: number;
    sixToTen: number;
    moreThanTen: number;
  };
  topPlayers: Array<{
    playerId: string;
    playerName: string;
    tournamentCount: number;
    winRate: number;
  }>;
}

/**
 * Industry benchmarks for tournament performance
 */
export interface TournamentBenchmarks {
  tenantId: string;
  industry: string;
  benchmarks: {
    completionRate: {
      target: number;
      current: number;
      status: 'above' | 'below' | 'at';
      percentile: number;
    };
    avgPlayers: {
      target: number;
      current: number;
      status: 'above' | 'below' | 'at';
      percentile: number;
    };
    avgDuration: {
      target: number;
      current: number;
      status: 'above' | 'below' | 'at';
      percentile: number;
    };
    playerRetention: {
      target: number;
      current: number;
      status: 'above' | 'below' | 'at';
      percentile: number;
    };
  };
  recommendations: string[];
  strengths: string[];
  improvementAreas: string[];
}

// ============================================================================
// CORE ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze complete tournament performance for a period
 *
 * Provides comprehensive performance analysis including metrics,
 * period-over-period comparisons, format breakdown, and insights.
 *
 * @param tenantId - Organization ID
 * @param options - Analysis options
 * @returns Complete tournament performance analysis
 */
export async function analyzeTournamentPerformance(
  tenantId: string,
  options: AnalysisOptions = {}
): Promise<TournamentPerformance> {
  const cacheKey = CacheManager.getCacheKey(
    'analytics:tournament:performance',
    tenantId,
    JSON.stringify(options)
  );

  return CacheManager.getOrSet(
    cacheKey,
    async () => {
      // Determine period boundaries
      const endDate = options.endDate || new Date();
      const periodType = options.periodType || 'month';

      let startDate: Date;
      let periodStart: Date;
      let periodEnd: Date;

      switch (periodType) {
        case 'day':
          periodStart = startOfDay(endDate);
          periodEnd = endOfDay(endDate);
          startDate = options.startDate || periodStart;
          break;
        case 'week':
          periodStart = startOfWeek(endDate);
          periodEnd = endOfWeek(endDate);
          startDate = options.startDate || periodStart;
          break;
        case 'month':
        default:
          periodStart = startOfMonth(endDate);
          periodEnd = endOfMonth(endDate);
          startDate = options.startDate || periodStart;
          break;
      }

      // Query tournament aggregates
      const aggregates = await prisma.tournamentAggregate.findMany({
        where: {
          tenantId,
          periodStart: {
            gte: startDate,
            lte: periodEnd,
          },
          periodType,
        },
      });

      // Calculate current period metrics
      const metrics = calculateAggregateMetrics(aggregates);

      // Get previous period for comparison
      let comparison;
      if (options.compareToPrevious) {
        const previousPeriodStart =
          periodType === 'day'
            ? startOfDay(subDays(periodStart, 1))
            : periodType === 'week'
            ? startOfWeek(subWeeks(periodStart, 1))
            : startOfMonth(subMonths(periodStart, 1));

        const previousPeriodEnd =
          periodType === 'day'
            ? endOfDay(subDays(periodStart, 1))
            : periodType === 'week'
            ? endOfWeek(subWeeks(periodStart, 1))
            : endOfMonth(subMonths(periodStart, 1));

        const previousAggregates = await prisma.tournamentAggregate.findMany({
          where: {
            tenantId,
            periodStart: {
              gte: previousPeriodStart,
              lte: previousPeriodEnd,
            },
            periodType,
          },
        });

        const previousMetrics = calculateAggregateMetrics(previousAggregates);
        comparison = buildComparison(metrics, previousMetrics);
      }

      // Get format breakdown
      let formatBreakdown;
      if (options.includeFormatBreakdown) {
        formatBreakdown = await analyzeFormatPopularity(tenantId, startDate, periodEnd);
      }

      // Generate insights
      const insights = generateInsights(metrics, comparison, formatBreakdown);

      return {
        period: {
          start: startDate,
          end: periodEnd,
          type: periodType,
        },
        metrics,
        comparison,
        formatBreakdown,
        insights,
      };
    },
    CacheManager.DEFAULT_TTL.SHORT
  );
}

/**
 * Analyze tournament format popularity
 *
 * Breaks down tournament metrics by format type to identify
 * which formats are most popular and perform best.
 *
 * @param tenantId - Organization ID
 * @param startDate - Start of analysis period
 * @param endDate - End of analysis period
 * @returns Format popularity breakdown
 */
export async function analyzeFormatPopularity(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<FormatPopularity[]> {
  const cacheKey = CacheManager.getCacheKey(
    'analytics:tournament:format',
    tenantId,
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd')
  );

  return CacheManager.getOrSet(
    cacheKey,
    async () => {
      // Get all tournaments in the period
      const tournaments = await prisma.tournament.findMany({
        where: {
          orgId: tenantId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          players: {
            select: { id: true },
          },
        },
      });

      if (tournaments.length === 0) {
        return [];
      }

      // Group by format
      const formatGroups = new Map<string, typeof tournaments>();
      tournaments.forEach((tournament) => {
        const existing = formatGroups.get(tournament.format) || [];
        existing.push(tournament);
        formatGroups.set(tournament.format, existing);
      });

      // Get payment data for revenue calculation
      const tournamentIds = tournaments.map((t) => t.id);
      const payments = await prisma.payment.groupBy({
        by: ['tournamentId'],
        where: {
          tournamentId: { in: tournamentIds },
          status: 'succeeded',
        },
        _sum: {
          amount: true,
        },
      });

      const revenueByTournament = new Map(
        payments.map((p) => [p.tournamentId, p._sum.amount || 0])
      );

      // Calculate metrics per format
      const totalTournaments = tournaments.length;
      const results: FormatPopularity[] = [];

      for (const [format, formatTournaments] of formatGroups) {
        const tournamentCount = formatTournaments.length;
        const totalPlayers = formatTournaments.reduce(
          (sum, t) => sum + t.players.length,
          0
        );
        const avgPlayersPerTournament =
          tournamentCount > 0 ? totalPlayers / tournamentCount : 0;

        const completedTournaments = formatTournaments.filter(
          (t) => t.status === 'completed'
        );
        const completionRate =
          (completedTournaments.length / tournamentCount) * 100;

        // Calculate average duration
        const tournamentsWithDuration = completedTournaments.filter(
          (t) => t.startedAt && t.completedAt
        );
        const totalDuration = tournamentsWithDuration.reduce((sum, t) => {
          if (!t.completedAt || !t.startedAt) return sum;
          const duration = differenceInMinutes(t.completedAt, t.startedAt);
          return sum + duration;
        }, 0);
        const avgDurationMinutes =
          tournamentsWithDuration.length > 0
            ? totalDuration / tournamentsWithDuration.length
            : 0;

        // Calculate revenue
        const totalRevenue = formatTournaments.reduce((sum, t) => {
          return sum + (revenueByTournament.get(t.id) || 0);
        }, 0);
        const avgRevenuePerTournament =
          tournamentCount > 0 ? totalRevenue / tournamentCount / 100 : 0; // Convert cents to dollars

        const marketShare = (tournamentCount / totalTournaments) * 100;

        results.push({
          format,
          tournamentCount,
          totalPlayers,
          avgPlayersPerTournament: Math.round(avgPlayersPerTournament * 100) / 100,
          completionRate: Math.round(completionRate * 100) / 100,
          avgDurationMinutes: Math.round(avgDurationMinutes * 100) / 100,
          totalRevenue: Math.round((totalRevenue / 100) * 100) / 100,
          avgRevenuePerTournament: Math.round(avgRevenuePerTournament * 100) / 100,
          marketShare: Math.round(marketShare * 100) / 100,
        });
      }

      // Sort by tournament count (most popular first)
      results.sort((a, b) => b.tournamentCount - a.tournamentCount);

      return results;
    },
    CacheManager.DEFAULT_TTL.MEDIUM
  );
}

/**
 * Analyze tournament trends over time
 *
 * Tracks tournament metrics over multiple periods to identify
 * growth trends, seasonality, and momentum.
 *
 * @param tenantId - Organization ID
 * @param periodType - Type of period to analyze
 * @param periods - Number of periods to analyze
 * @returns Historical trend data
 */
export async function analyzeTournamentTrends(
  tenantId: string,
  periodType: 'day' | 'week' | 'month' = 'week',
  periods: number = 12
): Promise<TournamentTrend[]> {
  const cacheKey = CacheManager.getCacheKey(
    'analytics:tournament:trends',
    tenantId,
    periodType,
    periods.toString()
  );

  return CacheManager.getOrSet(
    cacheKey,
    async () => {
      const now = new Date();
      const trends: TournamentTrend[] = [];

      for (let i = periods - 1; i >= 0; i--) {
        const periodDate =
          periodType === 'day'
            ? subDays(now, i)
            : periodType === 'week'
            ? subWeeks(now, i)
            : subMonths(now, i);

        const periodStart =
          periodType === 'day'
            ? startOfDay(periodDate)
            : periodType === 'week'
            ? startOfWeek(periodDate)
            : startOfMonth(periodDate);

        // Get aggregates for this period
        const aggregates = await prisma.tournamentAggregate.findMany({
          where: {
            tenantId,
            periodStart,
            periodType,
          },
        });

        const metrics = calculateAggregateMetrics(aggregates);

        // Calculate growth rates compared to previous period
        let growthRates = { tournaments: 0, players: 0, revenue: 0 };

        if (i < periods - 1 && trends.length > 0) {
          const previousMetrics = trends[trends.length - 1].metrics;
          growthRates = {
            tournaments: calculateGrowthRate(
              metrics.tournamentCount,
              previousMetrics.tournamentCount
            ),
            players: calculateGrowthRate(
              metrics.avgPlayersPerTournament,
              previousMetrics.avgPlayers
            ),
            revenue: calculateGrowthRate(
              metrics.totalRevenue,
              previousMetrics.totalRevenue
            ),
          };
        }

        trends.push({
          period: periodStart,
          periodLabel: format(
            periodStart,
            periodType === 'day' ? 'MMM d' : periodType === 'week' ? 'MMM d' : 'MMM yyyy'
          ),
          metrics: {
            tournamentCount: metrics.tournamentCount,
            completionRate: metrics.completionRate,
            avgPlayers: metrics.avgPlayersPerTournament,
            totalRevenue: metrics.totalRevenue,
          },
          growthRates,
        });
      }

      return trends;
    },
    CacheManager.DEFAULT_TTL.MEDIUM
  );
}

/**
 * Calculate core tournament metrics
 *
 * Computes key performance indicators for tournaments including
 * participation, completion, duration, and utilization rates.
 *
 * @param tenantId - Organization ID
 * @param tournamentId - Optional specific tournament ID
 * @returns Core tournament metrics
 */
export async function calculateTournamentMetrics(
  tenantId: string,
  tournamentId?: string
): Promise<TournamentMetrics> {
  const cacheKey = CacheManager.getCacheKey(
    'analytics:tournament:metrics',
    tenantId,
    tournamentId || 'all'
  );

  return CacheManager.getOrSet(
    cacheKey,
    async () => {
      const whereClause: Prisma.TournamentWhereInput = {
        orgId: tenantId,
      };

      if (tournamentId) {
        whereClause.id = tournamentId;
      }

      // Get tournaments with detailed data
      const tournaments = await prisma.tournament.findMany({
        where: whereClause,
        include: {
          players: true,
          matches: true,
          tables: true,
        },
      });

      if (tournaments.length === 0) {
        return {
          participationRate: 0,
          completionRate: 0,
          avgDurationMinutes: 0,
          avgPlayersPerTournament: 0,
          playerReturnRate: 0,
          avgMatchesPerTournament: 0,
          tableUtilization: 0,
        };
      }

      // Calculate participation rate
      const totalRegistered = tournaments.reduce((sum, t) => sum + t.players.length, 0);
      const totalPlayed = tournaments.reduce((sum, t) => {
        return (
          sum + t.players.filter((p) => p.status === 'active' || p.status === 'eliminated').length
        );
      }, 0);
      const participationRate =
        totalRegistered > 0 ? (totalPlayed / totalRegistered) * 100 : 0;

      // Calculate completion rate
      const completedCount = tournaments.filter((t) => t.status === 'completed').length;
      const completionRate = (completedCount / tournaments.length) * 100;

      // Calculate average duration
      const completedWithDuration = tournaments.filter(
        (t) => t.status === 'completed' && t.startedAt && t.completedAt
      );
      const totalDuration = completedWithDuration.reduce((sum, t) => {
        if (!t.completedAt || !t.startedAt) return sum;
        return sum + differenceInMinutes(t.completedAt, t.startedAt);
      }, 0);
      const avgDurationMinutes =
        completedWithDuration.length > 0 ? totalDuration / completedWithDuration.length : 0;

      // Calculate average players
      const avgPlayersPerTournament = totalRegistered / tournaments.length;

      // Calculate player return rate
      const playerParticipations = new Map<string, number>();
      tournaments.forEach((t) => {
        t.players.forEach((p) => {
          const current = playerParticipations.get(p.id) || 0;
          playerParticipations.set(p.id, current + 1);
        });
      });
      const repeatPlayers = Array.from(playerParticipations.values()).filter(
        (count) => count > 1
      ).length;
      const uniquePlayers = playerParticipations.size;
      const playerReturnRate = uniquePlayers > 0 ? (repeatPlayers / uniquePlayers) * 100 : 0;

      // Calculate average matches per tournament
      const totalMatches = tournaments.reduce((sum, t) => sum + t.matches.length, 0);
      const avgMatchesPerTournament =
        tournaments.length > 0 ? totalMatches / tournaments.length : 0;

      // Calculate table utilization
      const tournamentsWithTables = tournaments.filter((t) => t.tables.length > 0);
      let totalUtilization = 0;

      for (const tournament of tournamentsWithTables) {
        if (tournament.startedAt && tournament.completedAt) {
          const tournamentDuration = differenceInMinutes(
            tournament.completedAt,
            tournament.startedAt
          );
          const tableCount = tournament.tables.length;

          // Calculate total table-minutes used
          const completedMatches = tournament.matches.filter(
            (m) => m.state === 'completed' && m.startedAt && m.completedAt
          );
          const totalTableMinutes = completedMatches.reduce((sum, m) => {
            if (!m.completedAt || !m.startedAt) return sum;
            return sum + differenceInMinutes(m.completedAt, m.startedAt);
          }, 0);

          // Calculate available table-minutes
          const availableTableMinutes = tournamentDuration * tableCount;

          if (availableTableMinutes > 0) {
            totalUtilization += (totalTableMinutes / availableTableMinutes) * 100;
          }
        }
      }

      const tableUtilization =
        tournamentsWithTables.length > 0 ? totalUtilization / tournamentsWithTables.length : 0;

      return {
        participationRate: Math.round(participationRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        avgDurationMinutes: Math.round(avgDurationMinutes * 100) / 100,
        avgPlayersPerTournament: Math.round(avgPlayersPerTournament * 100) / 100,
        playerReturnRate: Math.round(playerReturnRate * 100) / 100,
        avgMatchesPerTournament: Math.round(avgMatchesPerTournament * 100) / 100,
        tableUtilization: Math.round(tableUtilization * 100) / 100,
      };
    },
    CacheManager.DEFAULT_TTL.SHORT
  );
}

/**
 * Predict tournament attendance
 *
 * Uses historical data, format popularity, day of week patterns,
 * and seasonality to predict expected attendance for a tournament.
 *
 * @param tenantId - Organization ID
 * @param format - Tournament format
 * @param date - Tournament date
 * @returns Attendance prediction with confidence interval
 */
export async function predictTournamentAttendance(
  tenantId: string,
  format: string,
  date: Date
): Promise<AttendancePrediction> {
  const cacheKey = CacheManager.getCacheKey(
    'analytics:tournament:prediction',
    tenantId,
    format,
    format(date, 'yyyy-MM-dd')
  );

  return CacheManager.getOrSet(
    cacheKey,
    async () => {
      // Get historical tournaments for the same format
      const historicalTournaments = await prisma.tournament.findMany({
        where: {
          orgId: tenantId,
          format,
          createdAt: {
            gte: subMonths(date, 6), // Look back 6 months
          },
        },
        include: {
          players: {
            select: { id: true },
          },
        },
      });

      // Calculate historical average
      const historicalAverage =
        historicalTournaments.length > 0
          ? historicalTournaments.reduce((sum, t) => sum + t.players.length, 0) /
            historicalTournaments.length
          : 0;

      // Analyze day of week pattern
      const dayOfWeek = getDay(date);
      const dayName = format(date, 'EEEE');
      const sameDayTournaments = historicalTournaments.filter(
        (t) => getDay(t.createdAt) === dayOfWeek
      );
      const dayOfWeekAverage =
        sameDayTournaments.length > 0
          ? sameDayTournaments.reduce((sum, t) => sum + t.players.length, 0) /
            sameDayTournaments.length
          : historicalAverage;

      // Calculate day of week trend factor
      const dayOfWeekTrend =
        historicalAverage > 0 ? (dayOfWeekAverage / historicalAverage) * 100 : 100;

      // Get format popularity
      const formatAnalysis = await analyzeFormatPopularity(
        tenantId,
        subMonths(date, 3),
        date
      );
      const formatData = formatAnalysis.find((f) => f.format === format);
      const formatPopularity = formatData ? formatData.avgPlayersPerTournament : historicalAverage;

      // Calculate seasonal factor (month-based)
      const month = date.getMonth();
      const sameMonthTournaments = historicalTournaments.filter(
        (t) => t.createdAt.getMonth() === month
      );
      const monthlyAverage =
        sameMonthTournaments.length > 0
          ? sameMonthTournaments.reduce((sum, t) => sum + t.players.length, 0) /
            sameMonthTournaments.length
          : historicalAverage;
      const seasonalFactor = historicalAverage > 0 ? (monthlyAverage / historicalAverage) * 100 : 100;

      // Calculate weighted prediction
      const weights = {
        historical: 0.3,
        format: 0.3,
        dayOfWeek: 0.25,
        seasonal: 0.15,
      };

      const predictedAttendance =
        historicalAverage * weights.historical +
        formatPopularity * weights.format +
        dayOfWeekAverage * weights.dayOfWeek +
        monthlyAverage * weights.seasonal;

      // Calculate confidence based on data availability
      const dataPoints = historicalTournaments.length;
      let confidence: 'high' | 'medium' | 'low';
      let confidenceWidth: number;

      if (dataPoints >= 10) {
        confidence = 'high';
        confidenceWidth = 0.15; // ±15%
      } else if (dataPoints >= 5) {
        confidence = 'medium';
        confidenceWidth = 0.25; // ±25%
      } else {
        confidence = 'low';
        confidenceWidth = 0.4; // ±40%
      }

      const low = Math.max(0, Math.round(predictedAttendance * (1 - confidenceWidth)));
      const high = Math.round(predictedAttendance * (1 + confidenceWidth));

      // Generate recommendation
      let recommendation: string;
      if (predictedAttendance > historicalAverage * 1.2) {
        recommendation = `High attendance expected! Consider adding extra tables or staff.`;
      } else if (predictedAttendance < historicalAverage * 0.8) {
        recommendation = `Lower attendance expected. Good opportunity for promotions or marketing.`;
      } else {
        recommendation = `Average attendance expected. Prepare for typical tournament setup.`;
      }

      return {
        format,
        date,
        dayOfWeek: dayName,
        predictedAttendance: Math.round(predictedAttendance),
        confidenceInterval: { low, high },
        confidence,
        factors: {
          formatPopularity: Math.round(formatPopularity * 100) / 100,
          dayOfWeekTrend: Math.round(dayOfWeekTrend * 100) / 100,
          seasonalFactor: Math.round(seasonalFactor * 100) / 100,
          historicalAverage: Math.round(historicalAverage * 100) / 100,
        },
        recommendation,
      };
    },
    CacheManager.DEFAULT_TTL.MEDIUM
  );
}

/**
 * Analyze player engagement patterns
 *
 * Examines how players interact with tournaments including
 * participation frequency, retention, and engagement levels.
 *
 * @param tenantId - Organization ID
 * @param startDate - Start of analysis period
 * @param endDate - End of analysis period
 * @returns Player engagement metrics
 */
export async function analyzePlayerEngagement(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<PlayerEngagement> {
  const cacheKey = CacheManager.getCacheKey(
    'analytics:tournament:engagement',
    tenantId,
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd')
  );

  return CacheManager.getOrSet(
    cacheKey,
    async () => {
      // Get all tournaments and players in the period
      const tournaments = await prisma.tournament.findMany({
        where: {
          orgId: tenantId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          players: true,
          matches: {
            where: {
              state: 'completed',
            },
          },
        },
      });

      // Track player participations
      const playerParticipations = new Map<string, number>();
      const playerTournaments = new Map<string, string[]>();
      const playerWins = new Map<string, number>();
      const playerNames = new Map<string, string>();

      tournaments.forEach((tournament) => {
        tournament.players.forEach((player) => {
          // Count participations
          const currentCount = playerParticipations.get(player.id) || 0;
          playerParticipations.set(player.id, currentCount + 1);

          // Track tournament IDs
          const currentTournaments = playerTournaments.get(player.id) || [];
          currentTournaments.push(tournament.id);
          playerTournaments.set(player.id, currentTournaments);

          // Store name
          playerNames.set(player.id, player.name);
        });

        // Count wins
        const winnerId = tournament.matches.find(
          (m) => m.winnerId && m.round === 1 && m.state === 'completed'
        )?.winnerId;

        if (winnerId) {
          const currentWins = playerWins.get(winnerId) || 0;
          playerWins.set(winnerId, currentWins + 1);
        }
      });

      // Calculate metrics
      const uniquePlayers = playerParticipations.size;
      const totalParticipations = Array.from(playerParticipations.values()).reduce(
        (sum, count) => sum + count,
        0
      );
      const avgTournamentsPerPlayer =
        uniquePlayers > 0 ? totalParticipations / uniquePlayers : 0;

      // Calculate repeat participation rate
      const repeatPlayers = Array.from(playerParticipations.values()).filter(
        (count) => count > 1
      ).length;
      const repeatParticipationRate = uniquePlayers > 0 ? (repeatPlayers / uniquePlayers) * 100 : 0;

      // Calculate new player rate (players with only 1 tournament)
      const newPlayers = Array.from(playerParticipations.values()).filter(
        (count) => count === 1
      ).length;
      const newPlayerRate = uniquePlayers > 0 ? (newPlayers / uniquePlayers) * 100 : 0;

      // Calculate retention rate (players who return)
      const retentionRate = 100 - newPlayerRate;

      // Segment players by tournament count
      const segments = {
        oneTournament: 0,
        twoToFive: 0,
        sixToTen: 0,
        moreThanTen: 0,
      };

      playerParticipations.forEach((count) => {
        if (count === 1) segments.oneTournament++;
        else if (count <= 5) segments.twoToFive++;
        else if (count <= 10) segments.sixToTen++;
        else segments.moreThanTen++;
      });

      // Find top players
      const topPlayers = Array.from(playerParticipations.entries())
        .map(([playerId, tournamentCount]) => {
          const wins = playerWins.get(playerId) || 0;
          const winRate = tournamentCount > 0 ? (wins / tournamentCount) * 100 : 0;

          return {
            playerId,
            playerName: playerNames.get(playerId) || 'Unknown',
            tournamentCount,
            winRate: Math.round(winRate * 100) / 100,
          };
        })
        .sort((a, b) => b.tournamentCount - a.tournamentCount)
        .slice(0, 10);

      return {
        period: {
          start: startDate,
          end: endDate,
        },
        metrics: {
          uniquePlayers,
          totalParticipations,
          avgTournamentsPerPlayer: Math.round(avgTournamentsPerPlayer * 100) / 100,
          repeatParticipationRate: Math.round(repeatParticipationRate * 100) / 100,
          newPlayerRate: Math.round(newPlayerRate * 100) / 100,
          retentionRate: Math.round(retentionRate * 100) / 100,
        },
        segments,
        topPlayers,
      };
    },
    CacheManager.DEFAULT_TTL.MEDIUM
  );
}

/**
 * Get tournament performance benchmarks
 *
 * Compares tenant's tournament metrics to industry benchmarks
 * and provides recommendations for improvement.
 *
 * @param tenantId - Organization ID
 * @returns Tournament benchmarks and recommendations
 */
export async function getTournamentBenchmarks(
  tenantId: string
): Promise<TournamentBenchmarks> {
  const cacheKey = CacheManager.getCacheKey('analytics:tournament:benchmarks', tenantId);

  return CacheManager.getOrSet(
    cacheKey,
    async () => {
      // Calculate current metrics
      const metrics = await calculateTournamentMetrics(tenantId);

      // Define industry benchmarks (based on typical pool tournament operations)
      const industryBenchmarks = {
        completionRate: 85, // 85% completion rate
        avgPlayers: 16, // 16 players average
        avgDuration: 180, // 3 hours average
        playerRetention: 60, // 60% player return rate
      };

      // Calculate percentiles (simplified - in production, would compare against all tenants)
      const calculatePercentile = (current: number, target: number): number => {
        if (current >= target * 1.2) return 90;
        if (current >= target * 1.1) return 75;
        if (current >= target) return 60;
        if (current >= target * 0.9) return 40;
        if (current >= target * 0.8) return 25;
        return 10;
      };

      const benchmarks = {
        completionRate: {
          target: industryBenchmarks.completionRate,
          current: metrics.completionRate,
          status: getStatus(metrics.completionRate, industryBenchmarks.completionRate),
          percentile: calculatePercentile(metrics.completionRate, industryBenchmarks.completionRate),
        },
        avgPlayers: {
          target: industryBenchmarks.avgPlayers,
          current: metrics.avgPlayersPerTournament,
          status: getStatus(metrics.avgPlayersPerTournament, industryBenchmarks.avgPlayers),
          percentile: calculatePercentile(
            metrics.avgPlayersPerTournament,
            industryBenchmarks.avgPlayers
          ),
        },
        avgDuration: {
          target: industryBenchmarks.avgDuration,
          current: metrics.avgDurationMinutes,
          status: getStatus(metrics.avgDurationMinutes, industryBenchmarks.avgDuration),
          percentile: calculatePercentile(metrics.avgDurationMinutes, industryBenchmarks.avgDuration),
        },
        playerRetention: {
          target: industryBenchmarks.playerRetention,
          current: metrics.playerReturnRate,
          status: getStatus(metrics.playerReturnRate, industryBenchmarks.playerRetention),
          percentile: calculatePercentile(metrics.playerReturnRate, industryBenchmarks.playerRetention),
        },
      };

      // Generate recommendations
      const recommendations: string[] = [];
      const strengths: string[] = [];
      const improvementAreas: string[] = [];

      if (benchmarks.completionRate.status === 'below') {
        recommendations.push(
          'Improve tournament completion rates by better time management and player communication'
        );
        improvementAreas.push('Tournament completion rate');
      } else if (benchmarks.completionRate.status === 'above') {
        strengths.push('Excellent tournament completion rate');
      }

      if (benchmarks.avgPlayers.status === 'below') {
        recommendations.push(
          'Increase tournament participation through marketing and player outreach'
        );
        improvementAreas.push('Player attendance');
      } else if (benchmarks.avgPlayers.status === 'above') {
        strengths.push('Strong player turnout per tournament');
      }

      if (benchmarks.avgDuration.status === 'above') {
        recommendations.push(
          'Consider optimizing tournament format or adding tables to reduce duration'
        );
        improvementAreas.push('Tournament duration');
      } else if (benchmarks.avgDuration.status === 'below') {
        strengths.push('Efficient tournament pacing and timing');
      }

      if (benchmarks.playerRetention.status === 'below') {
        recommendations.push(
          'Implement player engagement programs to improve retention and repeat participation'
        );
        improvementAreas.push('Player retention');
      } else if (benchmarks.playerRetention.status === 'above') {
        strengths.push('High player retention and loyalty');
      }

      if (metrics.tableUtilization < 70) {
        recommendations.push(
          'Table utilization is below optimal. Consider reducing table count or increasing player capacity'
        );
        improvementAreas.push('Table utilization');
      } else if (metrics.tableUtilization > 85) {
        strengths.push('Excellent table utilization');
      }

      return {
        tenantId,
        industry: 'Pool Tournaments',
        benchmarks,
        recommendations,
        strengths,
        improvementAreas,
      };
    },
    CacheManager.DEFAULT_TTL.LONG
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Tournament aggregate data structure
 */
interface TournamentAggregateData {
  tournamentCount?: number;
  completedCount?: number;
  totalPlayers?: number;
  avgDurationMinutes?: number | { toString: () => string };
  revenue?: number | { toString: () => string };
}

/**
 * Calculate aggregate metrics from tournament aggregates
 */
function calculateAggregateMetrics(aggregates: TournamentAggregateData[]) {
  if (aggregates.length === 0) {
    return {
      tournamentCount: 0,
      completedCount: 0,
      completionRate: 0,
      avgPlayersPerTournament: 0,
      avgDurationMinutes: 0,
      totalPlayers: 0,
      totalRevenue: 0,
      avgRevenuePerTournament: 0,
    };
  }

  const tournamentCount = aggregates.reduce(
    (sum, agg) => sum + (agg.tournamentCount || 0),
    0
  );
  const completedCount = aggregates.reduce(
    (sum, agg) => sum + (agg.completedCount || 0),
    0
  );
  const completionRate =
    tournamentCount > 0 ? (completedCount / tournamentCount) * 100 : 0;

  const totalPlayers = aggregates.reduce((sum, agg) => sum + (agg.totalPlayers || 0), 0);
  const avgPlayersPerTournament = tournamentCount > 0 ? totalPlayers / tournamentCount : 0;

  // Weighted average duration
  const totalDuration = aggregates.reduce((sum, agg) => {
    const duration = agg.avgDurationMinutes
      ? parseFloat(agg.avgDurationMinutes.toString())
      : 0;
    const count = agg.tournamentCount || 0;
    return sum + duration * count;
  }, 0);
  const avgDurationMinutes = tournamentCount > 0 ? totalDuration / tournamentCount : 0;

  const totalRevenue = aggregates.reduce((sum, agg) => {
    return sum + (agg.revenue ? parseFloat(agg.revenue.toString()) : 0);
  }, 0);
  const avgRevenuePerTournament = tournamentCount > 0 ? totalRevenue / tournamentCount : 0;

  return {
    tournamentCount,
    completedCount,
    completionRate: Math.round(completionRate * 100) / 100,
    avgPlayersPerTournament: Math.round(avgPlayersPerTournament * 100) / 100,
    avgDurationMinutes: Math.round(avgDurationMinutes * 100) / 100,
    totalPlayers,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgRevenuePerTournament: Math.round(avgRevenuePerTournament * 100) / 100,
  };
}

/**
 * Metrics for comparison
 */
interface ComparisonMetrics {
  tournamentCount: number;
  completionRate: number;
  avgPlayersPerTournament: number;
  totalRevenue: number;
}

/**
 * Build comparison metrics between current and previous periods
 */
function buildComparison(current: ComparisonMetrics, previous: ComparisonMetrics) {
  return {
    tournamentCount: {
      value: previous.tournamentCount,
      change: current.tournamentCount - previous.tournamentCount,
      trend: getTrend(current.tournamentCount, previous.tournamentCount),
    },
    completionRate: {
      value: previous.completionRate,
      change: current.completionRate - previous.completionRate,
      trend: getTrend(current.completionRate, previous.completionRate),
    },
    avgPlayers: {
      value: previous.avgPlayersPerTournament,
      change: current.avgPlayersPerTournament - previous.avgPlayersPerTournament,
      trend: getTrend(current.avgPlayersPerTournament, previous.avgPlayersPerTournament),
    },
    revenue: {
      value: previous.totalRevenue,
      change: current.totalRevenue - previous.totalRevenue,
      trend: getTrend(current.totalRevenue, previous.totalRevenue),
    },
  };
}

/**
 * Comparison data structure
 */
interface ComparisonData {
  tournamentCount: { value: number; change: number; trend: 'up' | 'down' | 'flat' };
  revenue: { value: number; change: number; trend: 'up' | 'down' | 'flat' };
}

/**
 * Generate insights from metrics
 */
function generateInsights(
  metrics: ComparisonMetrics,
  comparison?: ComparisonData,
  formatBreakdown?: FormatPopularity[]
): string[] {
  const insights: string[] = [];

  // Completion rate insights
  if (metrics.completionRate < 70) {
    insights.push(
      `Low completion rate (${metrics.completionRate}%). Consider investigating causes of tournament cancellations.`
    );
  } else if (metrics.completionRate > 90) {
    insights.push(
      `Excellent completion rate (${metrics.completionRate}%). Your tournaments are running smoothly.`
    );
  }

  // Comparison insights
  if (comparison) {
    if (comparison.tournamentCount.trend === 'up' && comparison.tournamentCount.change > 0) {
      insights.push(
        `Tournament count increased by ${comparison.tournamentCount.change} compared to previous period.`
      );
    }
    if (comparison.revenue.trend === 'up' && comparison.revenue.change > 0) {
      insights.push(
        `Revenue increased by $${Math.round(comparison.revenue.change)} compared to previous period.`
      );
    }
  }

  // Format insights
  if (formatBreakdown && formatBreakdown.length > 0) {
    const topFormat = formatBreakdown[0];
    insights.push(
      `${topFormat.format} is your most popular format with ${topFormat.marketShare}% market share.`
    );

    const highestRevenue = [...formatBreakdown].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
    if (highestRevenue.format !== topFormat.format) {
      insights.push(
        `${highestRevenue.format} generates the highest revenue despite not being the most popular format.`
      );
    }
  }

  return insights;
}

/**
 * Get status compared to benchmark
 */
function getStatus(current: number, target: number): 'above' | 'below' | 'at' {
  const threshold = 5; // ±5% tolerance
  if (current > target + threshold) return 'above';
  if (current < target - threshold) return 'below';
  return 'at';
}

/**
 * Get trend direction
 */
function getTrend(current: number, previous: number): 'up' | 'down' | 'flat' {
  const threshold = 1; // 1% threshold for flat
  const percentChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  if (Math.abs(percentChange) < threshold) return 'flat';
  return percentChange > 0 ? 'up' : 'down';
}

/**
 * Calculate growth rate percentage
 */
function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  const rate = ((current - previous) / previous) * 100;
  return Math.round(rate * 100) / 100;
}
