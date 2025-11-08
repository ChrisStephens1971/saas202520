/**
 * Tournament Filters Component
 * Sprint 8 - Advanced Features
 *
 * UI for filtering, sorting, and searching tournaments
 */

'use client';

import { useState, useEffect } from 'react';
import {
  type TournamentFilters as Filters,
  DEFAULT_FILTERS,
} from '@/lib/tournament-filters';

interface TournamentFiltersProps {
  onFiltersChange: (filters: Filters) => void;
  availableFormats: string[];
  totalTournaments: number;
}

export function TournamentFilters({
  onFiltersChange,
  availableFormats,
  totalTournaments,
}: TournamentFiltersProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [isExpanded, setIsExpanded] = useState(false);

  // Notify parent when filters change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, searchQuery: value }));
  };

  const handleStatusToggle = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
  };

  const handleFormatToggle = (format: string) => {
    setFilters(prev => ({
      ...prev,
      format: prev.format.includes(format)
        ? prev.format.filter(f => f !== format)
        : [...prev.format, format],
    }));
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value || undefined,
      },
    }));
  };

  const handleSortChange = (sortBy: Filters['sortBy']) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      // Toggle order if same field
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.status.length > 0 ||
    filters.format.length > 0 ||
    filters.dateRange.start ||
    filters.dateRange.end;

  const statuses = [
    { value: 'active', label: 'Active', color: 'green', icon: '▶️' },
    { value: 'completed', label: 'Completed', color: 'blue', icon: '✓' },
    { value: 'draft', label: 'Draft', color: 'gray', icon: '📝' },
    { value: 'cancelled', label: 'Cancelled', color: 'red', icon: '✕' },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 space-y-6">
      {/* Search Bar */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          🔍 Search Tournaments
        </label>
        <div className="relative">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by name, format, location..."
            className="w-full px-4 py-2 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-slate-400"
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
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
      >
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {isExpanded ? 'Hide Filters' : 'Show Filters'}
        </span>
        <svg
          className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          {/* Status Filters */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statuses.map(status => (
                <button
                  key={status.value}
                  onClick={() => handleStatusToggle(status.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                    filters.status.includes(status.value)
                      ? `border-${status.color}-500 bg-${status.color}-50 dark:bg-${status.color}-900/20`
                      : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  <span>{status.icon}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {status.label}
                  </span>
                  {filters.status.includes(status.value) && (
                    <svg className="w-4 h-4 ml-auto text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Format Filters */}
          {availableFormats.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Format
              </label>
              <div className="flex flex-wrap gap-2">
                {availableFormats.map(format => (
                  <button
                    key={format}
                    onClick={() => handleFormatToggle(format)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      filters.format.includes(format)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.dateRange.start || ''}
                  onChange={e => handleDateRangeChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.dateRange.end || ''}
                  onChange={e => handleDateRangeChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Sort By
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'name' as const, label: 'Name', icon: 'A-Z' },
                { value: 'startDate' as const, label: 'Start Date', icon: '📅' },
                { value: 'createdAt' as const, label: 'Created', icon: '🕐' },
                { value: 'playerCount' as const, label: 'Players', icon: '👥' },
              ].map(sort => (
                <button
                  key={sort.value}
                  onClick={() => handleSortChange(sort.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                    filters.sortBy === sort.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  <span>{sort.icon}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {sort.label}
                  </span>
                  {filters.sortBy === sort.value && (
                    <span className="ml-auto text-xs font-bold text-blue-600">
                      {filters.sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
              {totalTournaments} {totalTournaments === 1 ? 'tournament' : 'tournaments'} found
            </span>
          </div>
          <button
            onClick={handleClearFilters}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
