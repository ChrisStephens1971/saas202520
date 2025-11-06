/**
 * useSocket Hook
 * Sprint 6 - WebSocket Integration
 *
 * Client-side Socket.io connection management for real-time updates
 */

'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  error: Error | null;
}

/**
 * Custom React hook for Socket.io connection
 *
 * @param tournamentId - Tournament ID to join for scoped updates
 * @param enabled - Whether to establish connection (default: true)
 * @returns Socket instance, connection status, and error state
 */
export function useSocket(
  tournamentId?: string,
  enabled: boolean = true
): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Skip if disabled or socket already exists
    if (!enabled) {
      return;
    }

    // Initialize socket connection
    const socketInstance = io({
      path: '/api/socket',
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('[useSocket] Connected to Socket.io server');
      setSocket(socketInstance);
      setIsConnected(true);
      setError(null);

      // Join tournament room if tournamentId provided
      if (tournamentId) {
        socketInstance.emit('join:tournament', tournamentId);
        console.log(`[useSocket] Joined tournament room: ${tournamentId}`);
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`[useSocket] Disconnected: ${reason}`);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('[useSocket] Connection error:', err);
      setError(err);
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`[useSocket] Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setError(null);
    });

    socketInstance.on('reconnect_error', (err) => {
      console.error('[useSocket] Reconnection error:', err);
      setError(err);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('[useSocket] Reconnection failed after max attempts');
      setError(new Error('Reconnection failed after maximum attempts'));
    });

    // Cleanup on unmount
    return () => {
      if (tournamentId) {
        socketInstance.emit('leave:tournament', tournamentId);
        console.log(`[useSocket] Left tournament room: ${tournamentId}`);
      }

      socketInstance.disconnect();
      setSocket(null);
      console.log('[useSocket] Socket disconnected and cleaned up');
    };
  }, [tournamentId, enabled]);

  return {
    socket,
    isConnected,
    error,
  };
}

/**
 * Hook for listening to socket events with SWR integration
 *
 * @param tournamentId - Tournament ID to join
 * @param eventName - Socket event to listen for
 * @param callback - Callback function when event is received
 * @param enabled - Whether to establish connection (default: true)
 */
export function useSocketEvent<T = unknown>(
  tournamentId: string,
  eventName: string,
  callback: (data: T) => void,
  enabled: boolean = true
) {
  const { socket, isConnected } = useSocket(tournamentId, enabled);

  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    socket.on(eventName, callback);
    console.log(`[useSocketEvent] Listening for event: ${eventName}`);

    return () => {
      socket.off(eventName, callback);
      console.log(`[useSocketEvent] Stopped listening for event: ${eventName}`);
    };
  }, [socket, isConnected, eventName, callback]);

  return { socket, isConnected };
}
