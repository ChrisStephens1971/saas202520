/**
 * Chip History Timeline Component
 * Epic: UI-008 - Player Chip History
 * Displays chip earning progression for a player
 */

'use client';

import { format } from 'date-fns';

interface ChipAward {
  matchId: string;
  chipsEarned: number;
  timestamp: string | Date;
}

interface Props {
  history: ChipAward[];
  playerName: string;
  currentChips: number;
}

export default function ChipHistoryTimeline({ history, playerName, currentChips }: Props) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No chip history yet</p>
        <p className="text-sm mt-2">History will appear here as matches are completed</p>
      </div>
    );
  }

  // Pre-calculate running totals for each award
  const historyWithTotals = history.map((award, index) => {
    const runningTotal = history.slice(0, index + 1).reduce((sum, a) => sum + a.chipsEarned, 0);
    return { ...award, runningTotal };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Chip History: {playerName}</h3>
        <div className="text-2xl font-bold text-blue-600">🔷 {currentChips} chips</div>
      </div>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300" />

        {/* Timeline Items */}
        <div className="space-y-4">
          {historyWithTotals.map((item, index) => {
            const isManual = item.matchId.startsWith('manual-');
            const isPositive = item.chipsEarned > 0;

            return (
              <div key={index} className="relative pl-16">
                {/* Timeline Dot */}
                <div
                  className={`absolute left-4 w-4 h-4 rounded-full border-2 border-white ${
                    isManual ? 'bg-purple-500' : isPositive ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                />

                {/* Card */}
                <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            isManual ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isManual ? 'Manual Adjustment' : 'Match'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(item.timestamp), 'MMM d, h:mm a')}
                        </span>
                      </div>

                      {!isManual && (
                        <div className="text-sm text-gray-600">
                          Match ID: {item.matchId.slice(0, 8)}...
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-lg font-bold ${
                          isPositive ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {item.chipsEarned}
                      </div>
                      <div className="text-xs text-gray-500">Total: {item.runningTotal}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{history.length}</div>
            <div className="text-xs text-gray-600">Total Events</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              +{history.filter((a) => a.chipsEarned > 0).reduce((sum, a) => sum + a.chipsEarned, 0)}
            </div>
            <div className="text-xs text-gray-600">Chips Earned</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {history.filter((a) => a.chipsEarned < 0).reduce((sum, a) => sum + a.chipsEarned, 0)}
            </div>
            <div className="text-xs text-gray-600">Chips Lost</div>
          </div>
        </div>
      </div>
    </div>
  );
}
