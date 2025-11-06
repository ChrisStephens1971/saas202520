/**
 * User Table Component
 * Sprint 9 Phase 2 - Admin Dashboard
 * Advanced user table with TanStack Table, search, filter, and pagination
 */

'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { UserWithActivity, UserRole, UserStatus } from '@tournament/shared/types/user';
import UserRoleBadge from './UserRoleBadge';
import UserStatusBadge from './UserStatusBadge';
import UserActionMenu from './UserActionMenu';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  users: UserWithActivity[];
  isLoading?: boolean;
  onUserClick: (userId: string) => void;
  onEdit: (userId: string) => void;
  onChangeRole: (userId: string) => void;
  onWarn: (userId: string) => void;
  onSuspend: (userId: string) => void;
  onBan: (userId: string) => void;
  onUnban: (userId: string) => void;
  onUnsuspend: (userId: string) => void;
}

export default function UserTable({
  users,
  isLoading = false,
  onUserClick,
  onEdit,
  onChangeRole,
  onWarn,
  onSuspend,
  onBan,
  onUnban,
  onUnsuspend,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<UserWithActivity>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'User',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {row.original.image ? (
                <img
                  src={row.original.image}
                  alt={row.original.name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-gray-600">
                  {(row.original.name || row.original.email)?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {row.original.name || 'Unnamed User'}
              </div>
              <div className="text-sm text-gray-500">{row.original.email}</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => <UserRoleBadge role={row.original.role as UserRole} />,
        filterFn: 'equals',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <UserStatusBadge status={row.original.status as UserStatus} />,
        filterFn: 'equals',
      },
      {
        accessorKey: 'totalTournaments',
        header: 'Tournaments',
        cell: ({ row }) => (
          <div className="text-center">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium">
              🎯 {row.original.totalTournaments}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'totalMatches',
        header: 'Matches',
        cell: ({ row }) => (
          <div className="text-center">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-sm font-medium">
              🎱 {row.original.totalMatches}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'organizationCount',
        header: 'Orgs',
        cell: ({ row }) => (
          <div className="text-center text-gray-700">
            {row.original.organizationCount}
          </div>
        ),
      },
      {
        accessorKey: 'lastActivityAt',
        header: 'Last Active',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">
            {row.original.lastActivityAt
              ? formatDistanceToNow(new Date(row.original.lastActivityAt), {
                  addSuffix: true,
                })
              : 'Never'}
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">
            {formatDistanceToNow(new Date(row.original.createdAt), {
              addSuffix: true,
            })}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <UserActionMenu
            user={row.original}
            onEdit={onEdit}
            onChangeRole={onChangeRole}
            onWarn={onWarn}
            onSuspend={onSuspend}
            onBan={onBan}
            onUnban={onUnban}
            onUnsuspend={onUnsuspend}
            onViewDetails={onUserClick}
          />
        ),
      },
    ],
    [onUserClick, onEdit, onChangeRole, onWarn, onSuspend, onBan, onUnban, onUnsuspend]
  );

  const table = useReactTable({
    data: users,
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
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Global Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Filter by Role */}
        <select
          value={(table.getColumn('role')?.getFilterValue() as string) ?? ''}
          onChange={(e) =>
            table.getColumn('role')?.setFilterValue(e.target.value || undefined)
          }
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          <option value={UserRole.ADMIN}>Admin</option>
          <option value={UserRole.ORGANIZER}>Organizer</option>
          <option value={UserRole.PLAYER}>Player</option>
        </select>

        {/* Filter by Status */}
        <select
          value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
          onChange={(e) =>
            table.getColumn('status')?.setFilterValue(e.target.value || undefined)
          }
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value={UserStatus.ACTIVE}>Active</option>
          <option value={UserStatus.PENDING}>Pending</option>
          <option value={UserStatus.SUSPENDED}>Suspended</option>
          <option value={UserStatus.BANNED}>Banned</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'cursor-pointer select-none flex items-center gap-2'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getIsSorted() && (
                          <span className="text-xs">
                            {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onUserClick(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">
            Showing {table.getRowModel().rows.length} of {users.length} users
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            First
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-700">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No users found</p>
          <p className="text-sm mt-2">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
