import { prisma } from '@tournament/shared';
import { getOrgIdFromSession } from '@/lib/auth/server-auth';
import type { TournamentWithStats } from '@tournament/api-contracts';

export async function getTournamentsForOrg(): Promise<TournamentWithStats[]> {
  const orgId = await getOrgIdFromSession();

  // Note: We need to cast to TournamentWithStats because Prisma types might not perfectly align
  // with the API contract types which include computed stats.
  // In a real app, we would use a mapper or ensure the Prisma query returns the exact shape.
  // For now, we assume the DB schema matches enough or we'd add a mapper.

  const tournaments = await prisma.tournament.findMany({
    where: {
      orgId: orgId,
    },
    include: {
      _count: {
        select: {
          matches: true,
          players: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Map to API contract shape
  return tournaments.map((t) => ({
    ...t,
    playerCount: t._count.players,
    matchCount: t._count.matches,
    completedMatchCount: 0, // TODO: Add logic to count completed matches if needed
    // Add other missing fields if necessary
  })) as unknown as TournamentWithStats[];
}
