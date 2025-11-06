/**
 * Analytics Loading State
 * Shown while the analytics page is loading
 */

import React from 'react';
import { GridSkeleton } from '@/components/analytics/LoadingStates';

export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-96"></div>
          </div>

          <div className="mt-6 flex gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GridSkeleton count={4} />
      </div>
    </div>
  );
}
