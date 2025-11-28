/**
 * GET /api/v1/leaderboards/venue/[id]
 * Leaderboard for specific venue
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
  matches_played: number;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate API request and get tenant context
    const auth = await authenticateApiRequest(request);

    if (!auth.success) {
      return NextResponse.json({ error: auth.error.message }, { status: 401 });
    }

    const tenantId = auth.context.tenantId;

    const { id: venueId } = await params;

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'win-rate';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    // Get venue leaderboard
    const leaderboard = await getVenueLeaderboard(tenantId, venueId, type, limit);

    return NextResponse.json({
      data: leaderboard,
      meta: {
        total: leaderboard.length,
        venue_id: venueId,
        type,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Venue leaderboard API error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'internal_error',
          message: 'An error occurred while fetching venue leaderboard data',
        },
      },
      { status: 500 }
    );
  }
}

async function getVenueLeaderboard(
  tenantId: string,
  venueId: string,
  type: string,
  limit: number
): Promise<LeaderboardEntry[]> {
  // Note: This assumes tournaments have a venue_id field
  // If not present, this will need to be added to the schema

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
      metric_value: parseFloat(winRate.toFixed(1)),
      matches_played: totalMatches,
    };
  });
}
