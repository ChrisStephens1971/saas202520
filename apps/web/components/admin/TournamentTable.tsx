/**
 * TournamentTable Component
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Advanced data table with TanStack Table v8
 * Features: sorting, filtering, pagination, bulk operations
 */

'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
} from '@tanstack/react-table';
import type { TournamentWithStats } from '@tournament/api-contracts';
import { TournamentStatusBadge } from './TournamentStatusBadge';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/hooks/use-confirm';

interface TournamentTableProps {
  data: TournamentWithStats[];
  isLoading?: boolean;
  onDelete?: (tournamentId: string, tournamentName: string) => Promise<void>;
  onBulkDelete?: (tournamentIds: string[]) => Promise<void>;
  canEdit?: boolean;
  canDelete?: boolean;
}

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: 'Single Elim',
  double_elimination: 'Double Elim',
  round_robin: 'Round Robin',
  modified_single: 'Modified Single',
  chip_format: 'Chip Format',
};

export function TournamentTable({
  data,
  isLoading = false,
  onDelete,
  onBulkDelete,
  canEdit = false,
  canDelete = false,
}: TournamentTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  // Define columns
  const columns = useMemo<ColumnDef<TournamentWithStats>[]>(
    () => [
      // Checkbox column for bulk operations
      ...(canDelete
        ? [
          {
            id: 'select',
            header: ({ table }) => (
              <input
                type="checkbox"
                checked={table.getIsAllRowsSelected()}
                onChange={table.getToggleAllRowsSelectedHandler()}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            ),
            cell: ({ row }) => (
              <input
                type="checkbox"
                checked={row.getIsSelected()}
                onChange={row.getToggleSelectedHandler()}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            ),
            enableSorting: false,
          } as ColumnDef<TournamentWithStats>,
        ]
        : []),

      // Name
      {
        accessorKey: 'name',
        header: 'Tournament Name',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.original.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              /{row.original.slug}
            </div>
          </div>
        ),
      },

      // Status
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <TournamentStatusBadge status={row.original.status} size="sm" />
        ),
        filterFn: 'equals',
      },

      // Format
      {
        accessorKey: 'format',
        header: 'Format',
        cell: ({ row }) => (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {FORMAT_LABELS[row.original.format]}
          </span>
        ),
      },

      // Game Type
      {
        accessorKey: 'gameType',
        header: 'Game',
        cell: ({ row }) => (
          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
            {row.original.gameType.replace('-', ' ')}
          </span>
        ),
      },

      // Players
      {
        accessorKey: 'playerCount',
        header: 'Players',
        cell: ({ row }) => (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {row.original.playerCount}
            {row.original.maxPlayers && ` / ${row.original.maxPlayers}`}
          </span>
        ),
      },

      // Matches
      {
        id: 'matches',
        header: 'Matches',
        cell: ({ row }) => (
          <div className="text-sm">
            <div className="text-gray-700 dark:text-gray-300">
              {row.original.completedMatchCount} / {row.original.matchCount}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {row.original.matchCount > 0
                ? `${Math.round(
                  (row.original.completedMatchCount / row.original.matchCount) * 100
                )}% complete`
                : 'No matches'}
            </div>
          </div>
        ),
      },

      // Created Date
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },

      // Actions
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/admin/tournaments/${row.original.id}`)}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              View
            </button>
            {canEdit && (
              <button
                onClick={() => router.push(`/admin/tournaments/${row.original.id}/edit`)}
                className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
              >
                Edit
              </button>
            )}
            {canDelete && onDelete && (
              <button
                onClick={() => onDelete(row.original.id, row.original.name)}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Delete
              </button>
            )}
          </div>
        ),
        enableSorting: false,
      },
    ],
    [canEdit, canDelete, onDelete, router]
  );

  // Initialize table
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: canDelete,
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedCount === 0) return;

    const ok = await confirm({
      title: 'Delete Tournaments',
      description: `Are you sure you want to delete ${selectedCount} tournament(s)? This action cannot be undone.`,
      actionLabel: 'Delete Selected',
      cancelLabel: 'Cancel',
    });

    if (!ok) return;

    setBulkDeleteLoading(true);
    try {
      const ids = selectedRows.map((row) => row.original.id);
      await onBulkDelete(ids);
      setRowSelection({});
    } catch (error) {
      console.error('Bulk delete failed:', error);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading tournaments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search tournaments..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn('name')?.setFilterValue(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Bulk Actions */}
        {canDelete && selectedCount > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedCount} selected
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
            >
              {bulkDeleteLoading ? 'Deleting...' : 'Delete Selected'}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
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
                          {header.column.getCanSort() && (
                            <span className="text-gray-400">
                              {{
                                asc: '↑',
                                desc: '↓',
                              }[header.column.getIsSorted() as string] ?? '↕'}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No tournaments found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-4 text-sm text-gray-900 dark:text-white"
                      >
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
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length} tournaments
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
          >
            ««
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
          >
            «
          </button>
          <span className="px-4 py-1 text-sm text-gray-700 dark:text-gray-300">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
          >
            »
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
          >
            »»
          </button>
        </div>
      </div>
    </div>
      { ConfirmDialog }
    </div >
  );
}
