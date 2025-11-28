import { TournamentSkeleton } from '@/components/tournaments/tournament-skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Tournaments</h1>
            <p className="text-gray-300">Your Organization</p>
          </div>
          <div className="h-12 w-48 bg-white/20 rounded-lg animate-pulse" />
        </div>

        {/* Filters Skeleton */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 w-24 bg-white/10 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Tournament List Skeleton */}
        <TournamentSkeleton />
      </div>
    </div>
  );
}
