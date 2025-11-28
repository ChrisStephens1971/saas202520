/**
 * Chip Format Tournament Dashboard
 * Main dashboard for chip format tournament management
 * Sprint 5 - UI-001 through UI-008
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ChipStandingsTable from '@/components/chip-format/ChipStandingsTable';
import QueueDashboard from '@/components/chip-format/QueueDashboard';
import MatchAssignmentButton from '@/components/chip-format/MatchAssignmentButton';
import FinalsCutoffButton from '@/components/chip-format/FinalsCutoffButton';
import QueueStatsDashboard from '@/components/chip-format/QueueStatsDashboard';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getTournament(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      players: {
        where: {
          status: { notIn: ['withdrawn', 'no_show'] },
        },
        orderBy: { chipCount: 'desc' },
        take: 20, // Top 20 for initial render
      },
    },
  });

  if (!tournament) {
    return null;
  }

  return tournament;
}

export default async function ChipFormatDashboard({ params }: PageProps) {
  const { id } = await params;
  const tournament = await getTournament(id);

  if (!tournament || tournament.format !== 'chip_format') {
    notFound();
  }

  const chipConfig = tournament.chipConfig as unknown as {
    winnerChips: number;
    loserChips: number;
    qualificationRounds: number;
    finalsCount: number;
    pairingStrategy: string;
    tiebreaker: string;
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{tournament.name}</h1>
          <p className="text-gray-600">Chip Format Tournament</p>
        </div>
        <div className="flex gap-2">
          <FinalsCutoffButton
            tournamentId={id}
            chipConfig={chipConfig}
            status={tournament.status}
          />
        </div>
      </div>

      {/* Tournament Statistics */}
      <Suspense fallback={<div className="h-32 bg-gray-100 animate-pulse rounded-lg" />}>
        <QueueStatsDashboard tournamentId={id} />
      </Suspense>

      {/* Match Assignment Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Match Management</h2>
        <div className="flex gap-4">
          <MatchAssignmentButton tournamentId={id} chipConfig={chipConfig} count={1} />
          <MatchAssignmentButton
            tournamentId={id}
            chipConfig={chipConfig}
            count={3}
            label="Assign 3 Matches"
          />
        </div>
      </div>

      {/* Queue Dashboard */}
      <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
        <QueueDashboard tournamentId={id} />
      </Suspense>

      {/* Chip Standings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Chip Standings</h2>
          <p className="text-sm text-gray-600">
            Top {chipConfig.finalsCount} players advance to finals
          </p>
        </div>
        <Suspense fallback={<div className="h-96 bg-gray-100 animate-pulse" />}>
          <ChipStandingsTable tournamentId={id} finalsCount={chipConfig.finalsCount} />
        </Suspense>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4">
        <a
          href={`/tournaments/${id}/chip-format/standings`}
          className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition"
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="font-semibold">Full Standings</div>
        </a>
        <a
          href={`/tournaments/${id}/chip-format/queue`}
          className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition"
        >
          <div className="text-2xl mb-2">👥</div>
          <div className="font-semibold">Queue Management</div>
        </a>
        <a
          href={`/tournaments/${id}/chip-format/settings`}
          className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition"
        >
          <div className="text-2xl mb-2">⚙️</div>
          <div className="font-semibold">Settings</div>
        </a>
      </div>
    </div>
  );
}
