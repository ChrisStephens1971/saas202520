'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
            Dashboard Error
          </h2>

          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
            An error occurred while loading the dashboard. Please try again or return home.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-mono text-gray-800 dark:text-gray-300 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
              aria-label="Retry loading dashboard"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Try again
            </button>
            <a
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
              aria-label="Return to home page"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              Go home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
