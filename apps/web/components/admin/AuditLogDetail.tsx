'use client';

import React from 'react';
import { format } from 'date-fns';
import { AuditLogEntry } from './AuditLogViewer';

interface AuditLogDetailProps {
  log: AuditLogEntry;
  onClose?: () => void;
}

// Render JSON with syntax highlighting
function JsonViewer({ data, title }: { data: unknown; title: string }) {
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
      <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-xs font-mono border border-gray-200">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// Render before/after comparison for updates
function DiffViewer({ before, after }: { before: unknown; after: unknown }) {
  const beforeKeys = before ? Object.keys(before) : [];
  const afterKeys = after ? Object.keys(after) : [];
  const allKeys = Array.from(new Set([...beforeKeys, ...afterKeys]));

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-700">Changes</h4>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Field
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Before
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                After
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allKeys.map((key) => {
              const beforeValue = before?.[key];
              const afterValue = after?.[key];
              const changed = JSON.stringify(beforeValue) !== JSON.stringify(afterValue);

              return (
                <tr key={key} className={changed ? 'bg-yellow-50' : ''}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                    {key}
                    {changed && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Modified
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    <code className="bg-red-50 px-2 py-1 rounded text-xs">
                      {typeof beforeValue === 'object'
                        ? JSON.stringify(beforeValue)
                        : String(beforeValue ?? '—')}
                    </code>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    <code className="bg-green-50 px-2 py-1 rounded text-xs">
                      {typeof afterValue === 'object'
                        ? JSON.stringify(afterValue)
                        : String(afterValue ?? '—')}
                    </code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AuditLogDetail({ log, onClose }: AuditLogDetailProps) {
  const timestamp = typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp;

  // Parse changes for diff view
  const changes = log.changes as { before?: unknown; after?: unknown } | null | undefined;
  const hasDiff = changes && (changes.before || changes.after);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Audit Log Details</h3>
              <p className="text-sm text-gray-500 mt-1">{format(timestamp, 'PPpp')}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <div className="text-sm text-gray-900 font-semibold capitalize">{log.action}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
                <div className="text-sm text-gray-900 capitalize">{log.resource}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <div className="text-sm text-gray-900">{log.userName}</div>
                <div className="text-xs text-gray-500 font-mono">{log.userId}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resource ID</label>
                <div className="text-sm text-gray-900 font-mono break-all">
                  {log.resourceId || '—'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                <div className="text-sm text-gray-900 font-mono">{log.ipAddress || '—'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                <div className="text-sm text-gray-900 font-mono break-all">{log.orgId}</div>
              </div>
            </div>

            {
              (log.userAgent ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                  <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg font-mono break-all">
                    {log.userAgent as string}
                  </div>
                </div>
              ) : null) as any
            }

            {/* Changes (Diff View) */}
            {hasDiff && <DiffViewer before={changes.before} after={changes.after} />}

            {/* Raw Changes (if not a proper diff) */}
            {log.changes && !hasDiff && <JsonViewer data={log.changes} title="Changes" />}

            {/* Metadata */}
            {log.metadata && <JsonViewer data={log.metadata} title="Metadata" />}

            {/* Link to Resource */}
            {log.resourceId && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    // Navigate to resource (implement based on resource type)
                    const resourcePath = getResourcePath(log.resource, log.resourceId!);
                    if (resourcePath) {
                      window.location.href = resourcePath;
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View {log.resource} →
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to get resource path
function getResourcePath(resource: string, resourceId: string): string | null {
  const resourceMap: Record<string, string> = {
    user: `/admin/users/${resourceId}`,
    tournament: `/tournaments/${resourceId}`,
    match: `/tournaments/${resourceId}/matches`, // May need more context
    player: `/tournaments/${resourceId}/players`, // May need more context
    settings: `/admin/settings`,
  };

  return resourceMap[resource.toLowerCase()] || null;
}
