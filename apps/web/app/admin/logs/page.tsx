'use client';

import React, { useState, useEffect } from 'react';
import { AuditLogViewer, AuditLogEntry } from '@/components/admin/AuditLogViewer';
import { AuditLogDetail } from '@/components/admin/AuditLogDetail';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Filters
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');

  // Fetch logs
  useEffect(() => {
    async function fetchLogs() {
      try {
        setIsLoading(true);
        // eslint-disable-next-line no-undef
        const response = await fetch('/api/admin/audit-logs');
        if (!response.ok) throw new Error('Failed to fetch logs');
        const data = await response.json();
        setLogs(data.logs || []);
        setFilteredLogs(data.logs || []);
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        // TODO: Show error notification
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...logs];

    if (userFilter) {
      filtered = filtered.filter((log) =>
        log.userName.toLowerCase().includes(userFilter.toLowerCase()) ||
        log.userId.toLowerCase().includes(userFilter.toLowerCase())
      );
    }

    if (actionFilter) {
      filtered = filtered.filter((log) =>
        log.action.toLowerCase() === actionFilter.toLowerCase()
      );
    }

    if (resourceFilter) {
      filtered = filtered.filter((log) =>
        log.resource.toLowerCase() === resourceFilter.toLowerCase()
      );
    }

    if (dateRangeStart) {
      const startDate = new Date(dateRangeStart);
      filtered = filtered.filter((log) => {
        const logDate = typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp;
        return logDate >= startDate;
      });
    }

    if (dateRangeEnd) {
      const endDate = new Date(dateRangeEnd);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter((log) => {
        const logDate = typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp;
        return logDate <= endDate;
      });
    }

    setFilteredLogs(filtered);
  }, [logs, userFilter, actionFilter, resourceFilter, dateRangeStart, dateRangeEnd]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'User ID', 'Action', 'Resource', 'Resource ID', 'IP Address'];
    const csvData = filteredLogs.map((log) => {
      const timestamp = typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp;
      return [
        timestamp.toISOString(),
        log.userName,
        log.userId,
        log.action,
        log.resource,
        log.resourceId || '',
        log.ipAddress || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setUserFilter('');
    setActionFilter('');
    setResourceFilter('');
    setDateRangeStart('');
    setDateRangeEnd('');
  };

  // Get unique values for filters
  const uniqueActions = Array.from(new Set(logs.map((log) => log.action))).sort();
  const uniqueResources = Array.from(new Set(logs.map((log) => log.resource))).sort();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="mt-2 text-sm text-gray-600">
            View all administrative actions and system events
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleClearFilters}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear All
              </button>
              <button
                onClick={handleExportCSV}
                disabled={filteredLogs.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export to CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User
              </label>
              <input
                type="text"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource
              </label>
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Resources</option>
                {uniqueResources.map((resource) => (
                  <option key={resource} value={resource}>
                    {resource}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Start */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date Range End */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Results Count */}
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold">{filteredLogs.length}</span> of{' '}
                <span className="font-semibold">{logs.length}</span> logs
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <AuditLogViewer
            logs={filteredLogs}
            onRowClick={setSelectedLog}
            isLoading={isLoading}
          />
        </div>

        {/* Detail Modal */}
        {selectedLog && (
          <AuditLogDetail log={selectedLog} onClose={() => setSelectedLog(null)} />
        )}
      </div>
    </div>
  );
}
