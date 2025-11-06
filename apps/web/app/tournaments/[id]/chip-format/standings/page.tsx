/**
 * Full Chip Standings Page
 * Complete standings view with filtering and search
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ChipStandingsTable from '@/components/chip-format/ChipStandingsTable';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getTournament(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
  });

  return tournament;
}

export default async function StandingsPage({ params }: PageProps) {
  const { id } = await params;
  const tournament = await getTournament(id);

  if (!tournament || tournament.format !== 'chip_format') {
    notFound();
  }

  const chipConfig = tournament.chipConfig as unknown as {
    finalsCount: number;
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
        <span className="text-gray-900 font-semibold">Standings</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Complete Chip Standings</h1>
          <p className="text-gray-600 mt-1">{tournament.name}</p>
        </div>
        <Link
          href={`/tournaments/${id}/chip-format`}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Standings Table */}
      <div className="bg-white rounded-lg shadow">
        <Suspense fallback={<div className="h-96 bg-gray-100 animate-pulse" />}>
          <ChipStandingsTable
            tournamentId={id}
            finalsCount={chipConfig.finalsCount}
          />
        </Suspense>
      </div>
    </div>
  );
}
