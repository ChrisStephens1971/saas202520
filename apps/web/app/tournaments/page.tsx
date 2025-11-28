import { auth } from '@/auth';
import { getTournamentsForOrg } from '@/lib/data/tournaments';
import { TournamentList } from '@/components/tournaments/tournament-list';
import { TournamentFilters } from '@/components/tournaments/tournament-filters';

// Force dynamic rendering to ensure fresh data
export const revalidate = 0;

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const canEdit = session?.user?.role === 'owner' || session?.user?.role === 'td';
  const canDelete = session?.user?.role === 'owner';

  // Fetch data on the server
  const allTournaments = await getTournamentsForOrg();

  // Filter on the server (or client, but server is fine for initial load)
  // Note: We are doing simple filtering here to match the previous client-side logic.
  // In a real app with pagination, this would be a DB query with where clause.
  const params = await searchParams;
  const statusFilter = typeof params.status === 'string' ? params.status : 'all';

  const filteredTournaments =
    statusFilter === 'all'
      ? allTournaments
      : allTournaments.filter((t) => t.status === statusFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Tournaments</h1>
            <p className="text-gray-300">Your Organization</p>
          </div>
          {canEdit && (
            <a
              href="/tournaments/new"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              + Create Tournament
            </a>
          )}
        </div>

        {/* Status Filter (Client Component) */}
        <TournamentFilters />

        {/* Tournament List (Server Component) */}
        <TournamentList
          tournaments={filteredTournaments}
          canEdit={!!canEdit}
          canDelete={!!canDelete}
        />
      </div>
    </div>
  );
}
