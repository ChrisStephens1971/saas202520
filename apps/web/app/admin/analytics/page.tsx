/**
 * Admin Analytics Page
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Analytics and reporting interface (placeholder for future implementation)
 */

export const dynamic = 'force-dynamic';

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics & Reports</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Insights and data analysis for your organization
        </p>
      </div>

      {/* Coming Soon */}
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center dark:bg-gray-800 dark:border-gray-600">
        <span className="text-6xl mb-4 block">📈</span>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Analytics Coming Soon
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          This section will include tournament statistics, player performance metrics, revenue
          reports, and custom analytics dashboards.
        </p>
      </div>
    </div>
  );
}
