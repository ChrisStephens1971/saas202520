/**
 * useRoomView Hook
 * Sprint 2 - TD Console Room View
 *
 * Manages room view state and real-time updates:
 * - Fetches tournament room data
 * - Polls for updates or uses WebSocket
 * - Handles filtering and search
 * - Provides actions for match management
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  TournamentRoomData,
  RoomViewFilters,
  QueuedMatch,
  TableWithMatch,
} from '@/types/room-view';

interface UseRoomViewOptions {
  tournamentId: string;
  pollInterval?: number; // milliseconds, default 5000
  enablePolling?: boolean; // default true
}

interface UseRoomViewResult {
  data: TournamentRoomData | null;
  loading: boolean;
  error: Error | null;
  filters: RoomViewFilters;
  filteredMatches: QueuedMatch[];
  filteredTables: TableWithMatch[];
  setFilters: (filters: RoomViewFilters) => void;
  refresh: () => Promise<void>;
  assignMatch: (matchId: string, tableId?: string) => Promise<void>;
  startMatch: (matchId: string) => Promise<void>;
  completeMatch: (matchId: string) => Promise<void>;
}

export function useRoomView({
  tournamentId,
  pollInterval = 5000,
  enablePolling = true,
}: UseRoomViewOptions): UseRoomViewResult {
  const [data, setData] = useState<TournamentRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<RoomViewFilters>({
    searchQuery: '',
    matchStatus: 'all',
    tableStatus: 'all',
    sortBy: 'priority',
    showCompleted: false,
  });

  // Fetch room data
  const fetchRoomData = useCallback(async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/room`);
      if (!response.ok) {
        throw new Error('Failed to fetch room data');
      }
      const roomData: TournamentRoomData = await response.json();
      setData(roomData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  // Initial load
  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  // Polling for updates
  useEffect(() => {
    if (!enablePolling) return;

    const interval = setInterval(() => {
      fetchRoomData();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [enablePolling, pollInterval, fetchRoomData]);

  // Filter matches based on current filters
  const filteredMatches = useMemo(() => {
    if (!data) return [];

    let matches = [...data.matchQueue];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      matches = matches.filter((qm) => {
        const matchNum = qm.match.position.toString();
        const playerA = qm.playerNames.playerA?.toLowerCase() || '';
        const playerB = qm.playerNames.playerB?.toLowerCase() || '';

        return (
          matchNum.includes(query) ||
          playerA.includes(query) ||
          playerB.includes(query)
        );
      });
    }

    // Match status filter
    if (filters.matchStatus !== 'all') {
      matches = matches.filter((qm) => qm.match.state === filters.matchStatus);
    }

    // Sort
    matches.sort((a, b) => {
      switch (filters.sortBy) {
        case 'priority':
          return b.priority - a.priority;
        case 'waitTime':
          return b.waitingDuration - a.waitingDuration;
        case 'tableNumber':
          return (a.match.tableId || '').localeCompare(b.match.tableId || '');
        default:
          return 0;
      }
    });

    return matches;
  }, [data, filters]);

  // Filter tables based on current filters
  const filteredTables = useMemo(() => {
    if (!data) return [];

    let tables = [...data.tables];

    // Table status filter
    if (filters.tableStatus !== 'all') {
      tables = tables.filter((table) => table.status === filters.tableStatus);
    }

    // Search filter (by table label or match)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      tables = tables.filter((table) => {
        const label = table.label.toLowerCase();
        const matchNum = table.currentMatch?.position.toString() || '';
        return label.includes(query) || matchNum.includes(query);
      });
    }

    return tables;
  }, [data, filters]);

  // Refresh data manually
  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchRoomData();
  }, [fetchRoomData]);

  // Assign match to table
  const assignMatch = useCallback(async (matchId: string, tableId?: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign match');
      }

      // Refresh data after action
      await fetchRoomData();
    } catch (err) {
      console.error('Error assigning match:', err);
      throw err;
    }
  }, [tournamentId, fetchRoomData]);

  // Start match
  const startMatch = useCallback(async (matchId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start match');
      }

      // Refresh data after action
      await fetchRoomData();
    } catch (err) {
      console.error('Error starting match:', err);
      throw err;
    }
  }, [tournamentId, fetchRoomData]);

  // Complete match
  const completeMatch = useCallback(async (matchId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to complete match');
      }

      // Refresh data after action
      await fetchRoomData();
    } catch (err) {
      console.error('Error completing match:', err);
      throw err;
    }
  }, [tournamentId, fetchRoomData]);

  return {
    data,
    loading,
    error,
    filters,
    filteredMatches,
    filteredTables,
    setFilters,
    refresh,
    assignMatch,
    startMatch,
    completeMatch,
  };
}
