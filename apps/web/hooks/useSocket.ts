/**
 * useSocket Hook
 * Sprint 9 - Real-Time Features
 *
 * Custom React hooks for Socket.io operations with type safety
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@/lib/socket/events';

/**
 * Main Socket.io hook with convenience methods
 *
 * Provides typed access to socket operations:
 * - Event listeners (on)
 * - Event emitters (emit)
 * - Room management (joinTournament, leaveTournament)
 *
 * @example
 * const { socket, isConnected, joinTournament, emit } = useSocket();
 *
 * useEffect(() => {
 *   if (isConnected) {
 *     joinTournament('tournament-123', 'user-456');
 *   }
 * }, [isConnected, joinTournament]);
 */
export function useSocket() {
  const { socket, isConnected, isConnecting, error } = useSocketContext();

  /**
   * Listen to a Socket.io event
   * Automatically removes listener on unmount
   */
  const on = useCallback(
    <K extends keyof ServerToClientEvents>(
      event: K,
      handler: ServerToClientEvents[K]
    ) => {
      if (!socket) {
        console.warn('[useSocket] Cannot listen to event - socket not connected');
        return () => {};
      }

      socket.on(event, handler);
      console.log(`[useSocket] Listening to event: ${String(event)}`);

      // Return cleanup function
      return () => {
        socket.off(event, handler);
        console.log(`[useSocket] Stopped listening to event: ${String(event)}`);
      };
    },
    [socket]
  );

  /**
   * Emit a Socket.io event
   * Type-safe event emission
   */
  const emit = useCallback(
    <K extends keyof ClientToServerEvents>(
      event: K,
      ...args: Parameters<ClientToServerEvents[K]>
    ) => {
      if (!socket) {
        console.warn('[useSocket] Cannot emit event - socket not connected');
        return;
      }

      socket.emit(event, ...args);
      console.log(`[useSocket] Emitted event: ${String(event)}`, args);
    },
    [socket]
  );

  /**
   * Join a tournament room for scoped real-time updates
   */
  const joinTournament = useCallback(
    (tournamentId: string, userId?: string) => {
      if (!socket) {
        console.warn('[useSocket] Cannot join tournament - socket not connected');
        return;
      }

      socket.emit('tournament:join' as keyof ClientToServerEvents, {
        tournamentId,
        userId,
      } as any);

      console.log(`[useSocket] Joined tournament room: ${tournamentId}`);
    },
    [socket]
  );

  /**
   * Leave a tournament room
   */
  const leaveTournament = useCallback(
    (tournamentId: string, userId?: string) => {
      if (!socket) {
        console.warn('[useSocket] Cannot leave tournament - socket not connected');
        return;
      }

      socket.emit('tournament:leave' as keyof ClientToServerEvents, {
        tournamentId,
        userId,
      } as any);

      console.log(`[useSocket] Left tournament room: ${tournamentId}`);
    },
    [socket]
  );

  return {
    socket,
    isConnected,
    isConnecting,
    error,
    on,
    emit,
    joinTournament,
    leaveTournament,
  };
}

/**
 * Hook for listening to a specific Socket.io event
 *
 * Automatically manages event listener lifecycle and cleanup
 *
 * @param event - Socket.io event name
 * @param handler - Event handler function
 * @param dependencies - Additional dependencies for handler (default: [])
 *
 * @example
 * useSocketEvent('tournament:updated', (payload) => {
 *   console.log('Tournament updated:', payload);
 *   // Update local state...
 * });
 */
export function useSocketEvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K],
  dependencies: any[] = []
) {
  const { socket, isConnected } = useSocketContext();

  // Use ref to avoid re-creating listener on every render
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    // Wrap handler to use current ref value
    const wrappedHandler = (...args: any[]) => {
      handlerRef.current(...(args as Parameters<ServerToClientEvents[K]>));
    };

    socket.on(event, wrappedHandler as any);
    console.log(`[useSocketEvent] Listening to: ${String(event)}`);

    return () => {
      socket.off(event, wrappedHandler as any);
      console.log(`[useSocketEvent] Stopped listening to: ${String(event)}`);
    };
  }, [socket, isConnected, event, ...dependencies]);
}

/**
 * Hook for managing tournament room subscription
 *
 * Automatically joins tournament room on mount and leaves on unmount
 * Re-subscribes when tournament ID changes
 *
 * @param tournamentId - Tournament ID to join (null to skip)
 * @param userId - Optional user ID for presence tracking
 *
 * @example
 * const { isInRoom, users } = useTournamentRoom(tournamentId, currentUserId);
 *
 * if (isInRoom) {
 *   // Render real-time tournament UI
 * }
 */
export function useTournamentRoom(tournamentId: string | null, userId?: string) {
  const { socket, isConnected } = useSocketContext();
  const { joinTournament, leaveTournament } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !tournamentId) {
      return;
    }

    // Join tournament room
    joinTournament(tournamentId, userId);

    // Cleanup: leave room on unmount or tournament change
    return () => {
      leaveTournament(tournamentId, userId);
    };
  }, [socket, isConnected, tournamentId, userId, joinTournament, leaveTournament]);

  return {
    isInRoom: isConnected && !!tournamentId,
    tournamentId,
  };
}

/**
 * Hook for managing user presence in a tournament
 *
 * Tracks online/offline users and provides presence updates
 *
 * @param tournamentId - Tournament ID to track presence for
 *
 * @example
 * const { onlineUsers, totalUsers } = usePresence(tournamentId);
 *
 * return (
 *   <div>
 *     {onlineUsers.length} / {totalUsers} players online
 *   </div>
 * );
 */
export function usePresence(tournamentId: string) {
  const { socket, isConnected } = useSocketContext();
  const [onlineUsers, setOnlineUsers] = React.useState<string[]>([]);

  useSocketEvent(
    'user:online',
    useCallback(
      (payload) => {
        if (payload.userId) {
          setOnlineUsers((prev) => [...new Set([...prev, payload.userId!])]);
        }
      },
      []
    )
  );

  useSocketEvent(
    'user:offline',
    useCallback(
      (payload) => {
        if (payload.userId) {
          setOnlineUsers((prev) => prev.filter((id) => id !== payload.userId));
        }
      },
      []
    )
  );

  // Request current users when joining
  useEffect(() => {
    if (socket && isConnected && tournamentId) {
      // Server will emit users:in:tournament event with current users
      socket.emit('tournament:join' as any, { tournamentId });
    }
  }, [socket, isConnected, tournamentId]);

  return {
    onlineUsers,
    totalUsers: onlineUsers.length,
    isTracking: isConnected,
  };
}
