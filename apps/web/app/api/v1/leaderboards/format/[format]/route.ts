/**
 * GET /api/v1/leaderboards/format/[format]
 * Leaderboard by game format (8-ball, 9-ball, 10-ball, etc.)
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
  win_rate: number;
  matches_played: number;
  tournaments_played: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ format: string }> }
) {
  try {
    // Authenticate API request and get tenant context
    const auth = await authenticateApiRequest(request);

    if (!auth.success) {
      return NextResponse.json({ error: auth.error.message }, { status: 401 });
    }

    const tenantId = auth.context.tenantId;

    const { format } = await params;

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    // Validate format
    const validFormats = [
      'single_elimination',
      'double_elimination',
      'round_robin',
      'modified_single',
      'chip_format',
    ];

    if (!validFormats.includes(format)) {
      return NextResponse.json(
        {
          error: {
            code: 'invalid_parameter',
            message: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Get format leaderboard
    const leaderboard = await getFormatLeaderboard(tenantId, format, limit);

    return NextResponse.json({
      data: leaderboard,
      meta: {
        total: leaderboard.length,
        format,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Format leaderboard API error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'internal_error',
          message: 'An error occurred while fetching format leaderboard data',
        },
      },
      { status: 500 }
    );
  }
}

async function getFormatLeaderboard(
  tenantId: string,
  format: string,
  limit: number
): Promise<LeaderboardEntry[]> {
  const players = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      total_matches: bigint;
      wins: bigint;
      tournaments: bigint;
    }>
  >`
    SELECT
      p.id,
      p.name,
      COUNT(DISTINCT m.id) as total_matches,
      SUM(CASE WHEN m.winner_id = p.id THEN 1 ELSE 0 END) as wins,
      COUNT(DISTINCT p.tournament_id) as tournaments
    FROM players p
    INNER JOIN matches m ON (p.id = m.player_a_id OR p.id = m.player_b_id)
    INNER JOIN tournaments t ON p.tournament_id = t.id
    WHERE t.org_id = ${tenantId}::text
      AND t.format = ${format}
      AND m.state = 'completed'
    GROUP BY p.id, p.name
    HAVING COUNT(DISTINCT m.id) >= 3
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
      win_rate: parseFloat(winRate.toFixed(1)),
      matches_played: totalMatches,
      tournaments_played: Number(player.tournaments),
    };
  });
}
