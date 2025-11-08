/**
 * GET /api/v1/leaderboards
 * Global leaderboards across all players
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';

interface LeaderboardEntry {
  rank: number;
  player: {
    id: string;
    name: string;
  };
  metric_value: number;
  change: string;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate API request and get tenant context
    const auth = await authenticateApiRequest(request);

    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error!.message },
        { status: 401 }
      );
    }

    const tenantId = auth.context!.tenantId;

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'win-rate';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    let leaderboard: LeaderboardEntry[] = [];

    switch (type) {
      case 'win-rate':
        leaderboard = await getWinRateLeaderboard(tenantId, limit);
        break;
      case 'tournaments':
        leaderboard = await getTournamentCountLeaderboard(tenantId, limit);
        break;
      case 'prize-money':
        leaderboard = await getPrizeMoneyLeaderboard(tenantId, limit);
        break;
      default:
        return NextResponse.json(
          {
            error: {
              code: 'invalid_parameter',
              message: 'Invalid type parameter. Must be one of: win-rate, tournaments, prize-money',
            },
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      data: leaderboard,
      meta: {
        total: leaderboard.length,
        type,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'internal_error',
          message: 'An error occurred while fetching leaderboard data',
        },
      },
      { status: 500 }
    );
  }
}

async function getWinRateLeaderboard(
  tenantId: string,
  limit: number
): Promise<LeaderboardEntry[]> {
  // Get all players with match statistics
  const players = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      total_matches: bigint;
      wins: bigint;
    }>
  >`
    SELECT
      p.id,
      p.name,
      COUNT(DISTINCT m.id) as total_matches,
      SUM(CASE WHEN m.winner_id = p.id THEN 1 ELSE 0 END) as wins
    FROM players p
    INNER JOIN matches m ON (p.id = m.player_a_id OR p.id = m.player_b_id)
    INNER JOIN tournaments t ON p.tournament_id = t.id
    WHERE t.org_id = ${tenantId}::text
      AND m.state = 'completed'
    GROUP BY p.id, p.name
    HAVING COUNT(DISTINCT m.id) >= 5
    ORDER BY (SUM(CASE WHEN m.winner_id = p.id THEN 1 ELSE 0 END)::float / COUNT(DISTINCT m.id)) DESC
    LIMIT ${limit}
  `;

  return players.map((player, index) => {
    const totalMatches = Number(player.total_matches);
    const wins = Number(player.wins);
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

    return {
      rank: index + 1,
      player: {
        id: player.id,
        name: player.name,
      },
      metric_value: parseFloat(winRate.toFixed(1)),
      change: '+0', // TODO: Calculate change from last period
    };
  });
}

async function getTournamentCountLeaderboard(
  tenantId: string,
  limit: number
): Promise<LeaderboardEntry[]> {
  const players = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      tournament_count: bigint;
    }>
  >`
    SELECT
      p.id,
      p.name,
      COUNT(DISTINCT p.tournament_id) as tournament_count
    FROM players p
    INNER JOIN tournaments t ON p.tournament_id = t.id
    WHERE t.org_id = ${tenantId}::text
    GROUP BY p.id, p.name
    ORDER BY tournament_count DESC
    LIMIT ${limit}
  `;

  return players.map((player, index) => ({
    rank: index + 1,
    player: {
      id: player.id,
      name: player.name,
    },
    metric_value: Number(player.tournament_count),
    change: '+0', // TODO: Calculate change from last period
  }));
}

async function getPrizeMoneyLeaderboard(
  tenantId: string,
  limit: number
): Promise<LeaderboardEntry[]> {
  // TODO: Implement prize money tracking
  // This requires a prizes/payouts table to track earnings
  // For now, return empty array
  return [];
}
