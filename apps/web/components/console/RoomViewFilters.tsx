/**
 * RoomViewFilters Component
 * Sprint 2 - TD Console Room View
 *
 * Provides filtering and search capabilities:
 * - Search by player name or match number
 * - Filter by match status
 * - Filter by table status
 * - Sort options
 */

'use client';

import { useState } from 'react';
import type { RoomViewFilters } from '@/types/room-view';
import { MatchState } from '@/packages/shared/src/types/match';
import { TableStatus } from '@/packages/shared/src/types/tournament';

interface RoomViewFiltersProps {
  filters: RoomViewFilters;
  onFiltersChange: (filters: RoomViewFilters) => void;
  className?: string;
}

export function RoomViewFiltersComponent({
  filters,
  onFiltersChange,
  className = '',
}: RoomViewFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchChange = (query: string) => {
    onFiltersChange({ ...filters, searchQuery: query });
  };

  const handleMatchStatusChange = (status: MatchState | 'all') => {
    onFiltersChange({ ...filters, matchStatus: status });
  };

  const handleTableStatusChange = (status: TableStatus | 'all') => {
    onFiltersChange({ ...filters, tableStatus: status });
  };

  const handleSortChange = (sortBy: RoomViewFilters['sortBy']) => {
    onFiltersChange({ ...filters, sortBy });
  };

  const handleShowCompletedToggle = () => {
    onFiltersChange({ ...filters, showCompleted: !filters.showCompleted });
  };

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.matchStatus !== 'all' ||
    filters.tableStatus !== 'all' ||
    !filters.showCompleted;

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      matchStatus: 'all',
      tableStatus: 'all',
      sortBy: 'priority',
      showCompleted: true,
    });
  };

  return (
    <div className={`backdrop-blur-lg bg-white/10 rounded-lg border border-white/20 ${className}`}>
      {/* Search Bar - Always Visible */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search players or match #..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`
              px-4 py-2 rounded-lg border font-semibold transition-all
              ${isExpanded
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/20'
              }
              ${hasActiveFilters && !isExpanded ? 'ring-2 ring-blue-500' : ''}
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30 transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-4">
          {/* Match Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Match Status
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'pending', 'ready', 'assigned', 'active', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleMatchStatusChange(status)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-semibold transition-all
                    ${filters.matchStatus === status
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }
                  `}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Table Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Table Status
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'available', 'in_use', 'blocked'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleTableStatusChange(status)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-semibold transition-all
                    ${filters.tableStatus === status
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }
                  `}
                >
                  {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sort By
            </label>
            <div className="flex flex-wrap gap-2">
              {(['priority', 'waitTime', 'tableNumber'] as const).map((sort) => (
                <button
                  key={sort}
                  onClick={() => handleSortChange(sort)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-semibold transition-all
                    ${filters.sortBy === sort
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }
                  `}
                >
                  {sort === 'waitTime' ? 'Wait Time' :
                   sort === 'tableNumber' ? 'Table Number' :
                   'Priority'}
                </button>
              ))}
            </div>
          </div>

          {/* Show Completed Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showCompleted"
              checked={filters.showCompleted}
              onChange={handleShowCompletedToggle}
              className="w-4 h-4 rounded bg-white/10 border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="showCompleted" className="text-sm font-medium text-gray-300">
              Show completed matches
            </label>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && !isExpanded && (
        <div className="px-4 pb-3 flex items-center gap-2 text-xs text-gray-400">
          <span>Active filters:</span>
          {filters.searchQuery && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
              Search: "{filters.searchQuery}"
            </span>
          )}
          {filters.matchStatus !== 'all' && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
              Status: {filters.matchStatus}
            </span>
          )}
          {filters.tableStatus !== 'all' && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
              Table: {filters.tableStatus}
            </span>
          )}
          {!filters.showCompleted && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
              Hide completed
            </span>
          )}
        </div>
      )}
    </div>
  );
}
