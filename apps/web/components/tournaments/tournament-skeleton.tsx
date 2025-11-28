import { cn } from '@/lib/utils';

interface TournamentSkeletonProps {
  count?: number;
  className?: string;
}

export function TournamentSkeleton({ count = 6, className }: TournamentSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 animate-pulse">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="h-6 bg-white/20 rounded w-3/4 mb-2" />
              <div className="h-4 bg-white/10 rounded w-1/2" />
            </div>
            <div className="h-6 w-20 bg-white/20 rounded-full" />
          </div>

          {/* Description */}
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-white/10 rounded w-full" />
            <div className="h-4 bg-white/10 rounded w-2/3" />
          </div>

          {/* Meta Info */}
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-2/3" />
            <div className="h-4 bg-white/10 rounded w-1/2" />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-white/10">
            <div className="flex-1 h-10 bg-white/20 rounded-lg" />
            <div className="flex-1 h-10 bg-white/20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
