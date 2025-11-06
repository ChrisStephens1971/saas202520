/**
 * DateRangePicker Component
 * Sprint 9 Phase 2 - Admin Analytics Dashboard
 *
 * Date range selection for filtering analytics with:
 * - Quick preset ranges (Today, Last 7 days, Last 30 days, etc.)
 * - Custom date range selection
 * - Comparison with previous period option
 * - Responsive design
 */

'use client';

import { useState, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth, subMonths } from 'date-fns';

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'last3Months'
  | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
  preset?: DateRangePreset;
  compareWithPrevious?: boolean;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  allowComparison?: boolean;
  className?: string;
}

const presets: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last3Months', label: 'Last 3 Months' },
];

export function DateRangePicker({
  value,
  onChange,
  allowComparison = true,
  className = '',
}: DateRangePickerProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState(format(value.start, 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(value.end, 'yyyy-MM-dd'));

  // Get date range for preset
  const getPresetRange = (preset: DateRangePreset): { start: Date; end: Date } => {
    const now = new Date();
    const today = startOfDay(now);

    switch (preset) {
      case 'today':
        return { start: today, end: endOfDay(now) };
      case 'yesterday':
        return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case 'last7days':
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case 'last30days':
        return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
      case 'thisWeek':
        return { start: startOfWeek(now), end: endOfDay(now) };
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subDays(now, 7));
        return { start: lastWeekStart, end: endOfDay(subDays(lastWeekStart, -6)) };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfDay(now) };
      case 'lastMonth':
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = startOfDay(startOfMonth(now));
        return { start: lastMonthStart, end: endOfDay(subDays(lastMonthEnd, 1)) };
      case 'last3Months':
        return { start: startOfDay(subMonths(now, 3)), end: endOfDay(now) };
      default:
        return { start: today, end: endOfDay(now) };
    }
  };

  // Handle preset selection
  const handlePresetChange = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setShowCustomPicker(true);
      return;
    }

    const range = getPresetRange(preset);
    onChange({
      ...range,
      preset,
      compareWithPrevious: value.compareWithPrevious,
    });
    setShowCustomPicker(false);
  };

  // Handle custom range apply
  const handleApplyCustomRange = () => {
    const start = startOfDay(new Date(customStart));
    const end = endOfDay(new Date(customEnd));

    if (start > end) {
      alert('Start date must be before end date');
      return;
    }

    onChange({
      start,
      end,
      preset: 'custom',
      compareWithPrevious: value.compareWithPrevious,
    });
    setShowCustomPicker(false);
  };

  // Handle comparison toggle
  const handleComparisonToggle = () => {
    onChange({
      ...value,
      compareWithPrevious: !value.compareWithPrevious,
    });
  };

  // Format display
  const displayText = useMemo(() => {
    if (value.preset && value.preset !== 'custom') {
      const preset = presets.find(p => p.value === value.preset);
      return preset?.label || 'Select Range';
    }
    return `${format(value.start, 'MMM d, yyyy')} - ${format(value.end, 'MMM d, yyyy')}`;
  }, [value]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map(preset => (
          <button
            key={preset.value}
            onClick={() => handlePresetChange(preset.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              value.preset === preset.value
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustomPicker(!showCustomPicker)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            value.preset === 'custom'
              ? 'bg-purple-600 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          Custom Range
        </button>
      </div>

      {/* Custom Date Picker */}
      {showCustomPicker && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                max={customEnd}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                min={customStart}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCustomPicker(false)}
              className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCustomRange}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Display Selected Range */}
      <div className="flex items-center justify-between bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-white font-medium">{displayText}</span>
        </div>

        {/* Comparison Toggle */}
        {allowComparison && (
          <button
            onClick={handleComparisonToggle}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
          >
            <input
              type="checkbox"
              checked={value.compareWithPrevious}
              onChange={handleComparisonToggle}
              className="w-4 h-4 rounded accent-purple-600"
            />
            <span className="text-gray-300">Compare with previous period</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to use date range state
 */
export function useDateRange(initialPreset: DateRangePreset = 'last30days') {
  const getInitialRange = (): DateRange => {
    const now = new Date();
    const start = startOfDay(subDays(now, 29));
    const end = endOfDay(now);

    return {
      start,
      end,
      preset: initialPreset,
      compareWithPrevious: false,
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getInitialRange());

  return [dateRange, setDateRange] as const;
}
