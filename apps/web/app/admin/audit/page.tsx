/**
 * Admin Audit Logs Page
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Activity history and audit trail (placeholder for future implementation)
 */

export const dynamic = 'force-dynamic';

export default function AdminAuditPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Audit Logs</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          System activity history and audit trail
        </p>
      </div>

      {/* Coming Soon */}
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center dark:bg-gray-800 dark:border-gray-600">
        <span className="text-6xl mb-4 block">📝</span>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Audit Logs Coming Soon
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          This section will include detailed activity logs, user actions, system changes, and
          comprehensive audit trails for compliance and security.
        </p>
      </div>
    </div>
  );
}
