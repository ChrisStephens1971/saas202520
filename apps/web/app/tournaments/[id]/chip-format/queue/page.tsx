/**
 * Queue Management Page
 * Full queue management interface
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import QueueDashboard from '@/components/chip-format/QueueDashboard';
import MatchAssignmentButton from '@/components/chip-format/MatchAssignmentButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getTournament(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
  });

  return tournament;
}

export default async function QueuePage({ params }: PageProps) {
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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/tournaments" className="hover:text-gray-900">
          Tournaments
        </Link>
        <span>/</span>
        <Link
          href={`/tournaments/${id}/chip-format`}
          className="hover:text-gray-900"
        >
          {tournament.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">Queue</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Queue Management</h1>
          <p className="text-gray-600 mt-1">Match assignment and queue monitoring</p>
        </div>
        <Link
          href={`/tournaments/${id}/chip-format`}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Match Assignment Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Match Assignment</h2>
        <div className="flex flex-wrap gap-4">
          <MatchAssignmentButton
            tournamentId={id}
            chipConfig={chipConfig}
            count={1}
          />
          <MatchAssignmentButton
            tournamentId={id}
            chipConfig={chipConfig}
            count={3}
            label="Assign 3 Matches"
          />
          <MatchAssignmentButton
            tournamentId={id}
            chipConfig={chipConfig}
            count={5}
            label="Assign 5 Matches"
          />
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Pairing Strategy: {chipConfig.pairingStrategy.replace('_', ' ')}
          </h3>
          <p className="text-xs text-blue-700">
            {chipConfig.pairingStrategy === 'random' && 'Players are paired randomly from the queue'}
            {chipConfig.pairingStrategy === 'rating' && 'Players are paired based on similar ratings'}
            {chipConfig.pairingStrategy === 'chip_diff' && 'Players are paired based on similar chip counts'}
          </p>
        </div>
      </div>

      {/* Queue Dashboard */}
      <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
        <QueueDashboard tournamentId={id} />
      </Suspense>
    </div>
  );
}
