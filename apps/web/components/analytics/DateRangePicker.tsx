/**
 * Date Range Picker Component
 * Allows users to select predefined or custom date ranges for analytics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { DateRange } from './types';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { label: 'Last 7 Days', value: 'last7days' as const },
  { label: 'Last 30 Days', value: 'last30days' as const },
  { label: 'Last 90 Days', value: 'last90days' as const },
  { label: 'Custom', value: 'custom' as const },
];

function getPresetDates(
  preset: 'last7days' | 'last30days' | 'last90days'
): DateRange {
  const endDate = new Date();
  const startDate = new Date();

  switch (preset) {
    case 'last7days':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'last30days':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case 'last90days':
      startDate.setDate(endDate.getDate() - 90);
      break;
  }

  return { startDate, endDate, preset };
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(
    value.startDate.toISOString().split('T')[0]
  );
  const [customEnd, setCustomEnd] = useState(
    value.endDate.toISOString().split('T')[0]
  );

  const handlePresetClick = (
    preset: 'last7days' | 'last30days' | 'last90days' | 'custom'
  ) => {
    if (preset === 'custom') {
      onChange({
        startDate: new Date(customStart),
        endDate: new Date(customEnd),
        preset: 'custom',
      });
    } else {
      onChange(getPresetDates(preset));
    }
    if (preset !== 'custom') {
      setIsOpen(false);
    }
  };

  const handleCustomApply = () => {
    onChange({
      startDate: new Date(customStart),
      endDate: new Date(customEnd),
      preset: 'custom',
    });
    setIsOpen(false);
  };

  const formatDateRange = (range: DateRange): string => {
    const start = range.startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const end = range.endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <svg
          className="w-5 h-5 text-gray-500 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {formatDateRange(value)}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-4">
            <div className="space-y-2 mb-4">
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    value.preset === preset.value
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {value.preset === 'custom' && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <button
                  onClick={handleCustomApply}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
