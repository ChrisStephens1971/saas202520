'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { type TournamentStatus } from '@tournament/ui-config';

const STATUS_FILTERS: (TournamentStatus | 'all')[] = [
  'all',
  'draft',
  'registration',
  'active',
  'paused',
  'completed',
  'cancelled',
];

export function TournamentFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get('status') || 'all';

  const handleFilterChange = useCallback(
    (status: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (status === 'all') {
        params.delete('status');
      } else {
        params.set('status', status);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {STATUS_FILTERS.map((status) => (
        <button
          key={status}
          onClick={() => handleFilterChange(status)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
            currentFilter === status
              ? 'bg-purple-600 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          {status}
        </button>
      ))}
    </div>
  );
}
