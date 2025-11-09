'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { format } from 'date-fns';

export interface AuditLogEntry {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  changes?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
  timestamp: Date | string;
}

interface AuditLogViewerProps {
  logs: AuditLogEntry[];
  onRowClick?: (log: AuditLogEntry) => void;
  isLoading?: boolean;
}

// Action type color mapping
const getActionColor = (action: string): string => {
  switch (action.toLowerCase()) {
    case 'create':
      return 'text-green-600 bg-green-50';
    case 'update':
      return 'text-blue-600 bg-blue-50';
    case 'delete':
      return 'text-red-600 bg-red-50';
    case 'login':
      return 'text-purple-600 bg-purple-50';
    case 'logout':
      return 'text-gray-600 bg-gray-50';
    case 'failed_login':
      return 'text-orange-600 bg-orange-50';
    case 'ban':
    case 'suspend':
      return 'text-red-700 bg-red-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
};

// Get user initials for avatar
const getUserInitials = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export function AuditLogViewer({ logs, onRowClick, isLoading }: AuditLogViewerProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timestamp', desc: true }, // Default: newest first
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<AuditLogEntry>[]>(
    () => [
      {
        accessorKey: 'timestamp',
        header: 'Timestamp',
        cell: ({ row }) => {
          const timestamp = row.original.timestamp;
          const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
          return (
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-900">
                {format(date, 'MMM dd, yyyy')}
              </div>
              <div className="text-xs text-gray-500">
                {format(date, 'HH:mm:ss')}
              </div>
            </div>
          );
        },
        size: 150,
      },
      {
        accessorKey: 'userName',
        header: 'User',
        cell: ({ row }) => {
          const userName = row.original.userName;
          const initials = getUserInitials(userName);
          return (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
                  {initials}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{userName}</div>
                <div className="text-xs text-gray-500 truncate max-w-[150px]" title={row.original.userId}>
                  {row.original.userId.slice(0, 8)}...
                </div>
              </div>
            </div>
          );
        },
        size: 200,
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => {
          const action = row.original.action;
          const colorClass = getActionColor(action);
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
            >
              {action}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'resource',
        header: 'Resource',
        cell: ({ row }) => {
          const resource = row.original.resource;
          const resourceId = row.original.resourceId;
          return (
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-900 capitalize">{resource}</div>
              {resourceId && (
                <div className="text-xs text-gray-500 font-mono truncate max-w-[120px]" title={resourceId}>
                  {resourceId}
                </div>
              )}
            </div>
          );
        },
        size: 150,
      },
      {
        accessorKey: 'ipAddress',
        header: 'IP Address',
        cell: ({ row }) => {
          const ip = row.original.ipAddress;
          return (
            <div className="text-sm text-gray-600 font-mono">
              {ip || <span className="text-gray-400">N/A</span>}
            </div>
          );
        },
        size: 130,
      },
      {
        id: 'details',
        header: 'Details',
        cell: ({ row }) => {
          const hasChanges = row.original.changes !== null && row.original.changes !== undefined;
          const hasMetadata = row.original.metadata !== null && row.original.metadata !== undefined;
          return (
            <button
              onClick={() => onRowClick?.(row.original)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              disabled={!hasChanges && !hasMetadata}
            >
              {hasChanges || hasMetadata ? 'View Details →' : '—'}
            </button>
          );
        },
        size: 120,
      },
    ],
    [onRowClick]
  );

  const table = useReactTable({
    data: logs,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Global Search */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search logs..."
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full max-w-md"
        />
        <div className="text-sm text-gray-500">
          {table.getFilteredRowModel().rows.length} of {logs.length} logs
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: header.column.getSize() }}
                    >
                      <div className="flex items-center space-x-1">
                        <span>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        <span className="text-gray-400">
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
                          }[header.column.getIsSorted() as string] ?? ''}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    No audit logs found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            First
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            {[10, 20, 50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
