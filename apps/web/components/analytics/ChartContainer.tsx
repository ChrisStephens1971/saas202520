/**
 * Chart Container Component
 * Reusable wrapper for all chart components with consistent styling and controls
 */

'use client';

import React from 'react';
import { ChartContainerProps } from './types';
import { ErrorState, ChartSkeleton } from './LoadingStates';

export function ChartContainer({
  title,
  description,
  isLoading,
  error,
  onRefresh,
  onExport,
  children,
}: ChartContainerProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <ErrorState error={error} onRetry={onRefresh} />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Refresh data"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Export data"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
