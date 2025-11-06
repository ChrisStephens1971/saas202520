/**
 * Loading States Component
 * Skeleton loaders and empty states for analytics dashboard
 */

import React from 'react';

export function ChartSkeleton() {
  return (
    <div className="w-full h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
      <div className="space-y-4 w-full px-8">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
      </div>
    </div>
  );
}

export function KPISkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
        </div>
        <div className="h-12 w-12 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
      </div>
      <div className="mt-4 h-3 bg-gray-300 dark:bg-gray-700 rounded w-28"></div>
    </div>
  );
}

export function GridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <KPISkeleton key={i} />
      ))}
    </div>
  );
}

interface ErrorStateProps {
  error: Error;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="w-full h-[300px] bg-red-50 dark:bg-red-900/20 rounded-lg flex flex-col items-center justify-center p-6 border border-red-200 dark:border-red-800">
      <svg
        className="w-16 h-16 text-red-500 dark:text-red-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
        Error Loading Data
      </h3>
      <p className="text-sm text-red-700 dark:text-red-300 mb-4 text-center max-w-md">
        {error.message || 'An unexpected error occurred'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="w-full h-[300px] bg-gray-50 dark:bg-gray-800/50 rounded-lg flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-gray-700">
      <svg
        className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
          {description}
        </p>
      )}
    </div>
  );
}
