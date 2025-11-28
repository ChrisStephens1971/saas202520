import Link from 'next/link';
import type { TournamentWithStats } from '@tournament/api-contracts';
import { StatusBadge } from '@/components/ui/status-badge';
import { FORMAT_BADGES } from '@tournament/ui-config';
import { DeleteTournamentButton } from './delete-tournament-button';

interface TournamentListProps {
  tournaments: TournamentWithStats[];
  canEdit: boolean;
  canDelete: boolean;
}

export function TournamentList({ tournaments, canEdit, canDelete }: TournamentListProps) {
  if (tournaments.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-2xl font-bold text-white mb-2">No tournaments found</h2>
        <p className="text-gray-300 mb-6">Try adjusting your filters or create a new tournament.</p>
        {canEdit && (
          <Link
            href="/tournaments/new"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Create Your First Tournament
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tournaments.map((tournament) => (
        <div
          key={tournament.id}
          className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition-colors relative group"
        >
          <Link href={`/tournaments/${tournament.id}`} className="absolute inset-0 z-0" />

          {/* Header */}
          <div className="flex justify-between items-start mb-4 relative z-10 pointer-events-none">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">{tournament.name}</h3>
              <p className="text-sm text-gray-400">/{tournament.slug}</p>
            </div>
            <StatusBadge status={tournament.status} />
          </div>

          {/* Description */}
          {tournament.description && (
            <p className="text-gray-300 text-sm mb-4 line-clamp-2 relative z-10 pointer-events-none">
              {tournament.description}
            </p>
          )}

          {/* Meta Info */}
          <div className="space-y-2 mb-4 relative z-10 pointer-events-none">
            <div className="flex items-center text-sm text-gray-300">
              <span className="font-semibold mr-2">Format:</span>
              <span>{FORMAT_BADGES[tournament.format]}</span>
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <span className="font-semibold mr-2">Game:</span>
              <span className="capitalize">{tournament.gameType.replace('-', ' ')}</span>
              <span className="mx-2">•</span>
              <span>Race to {tournament.raceToWins}</span>
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <span className="font-semibold mr-2">Players:</span>
              <span>
                {tournament.playerCount}
                {tournament.maxPlayers && ` / ${tournament.maxPlayers}`}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {(canEdit || canDelete) && (
            <div className="flex gap-2 pt-4 border-t border-white/10 relative z-20">
              {canEdit && (
                <Link
                  href={`/tournaments/${tournament.id}/edit`}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors text-center"
                >
                  Edit
                </Link>
              )}
              {canDelete && (
                <DeleteTournamentButton
                  tournamentId={tournament.id}
                  tournamentName={tournament.name}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
