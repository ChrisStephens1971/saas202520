/**
 * Socket.io Context Provider
 * Sprint 9 - Real-Time Features
 *
 * Provides Socket.io client connection to React components
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/lib/socket/events';

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextType {
  socket: SocketType | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  isConnecting: false,
  error: null,
});

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }
  return context;
}

interface SocketProviderProps {
  children: ReactNode;
  token?: string; // Authentication token
  autoConnect?: boolean;
}

export function SocketProvider({ children, token, autoConnect = true }: SocketProviderProps) {
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    // Don't connect in server-side rendering
    if (typeof window === 'undefined') return;

    setIsConnecting(true);

    // Construct socket URL
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;

    console.log('Connecting to Socket.io server:', socketUrl);

    // Create socket connection
    const newSocket: SocketType = io(socketUrl, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket.io connected:', newSocket.id);
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket.io disconnected:', reason);
      setIsConnected(false);
      setIsConnecting(false);

      if (reason === 'io server disconnect') {
        // Server forcibly disconnected - try to reconnect
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket.io connection error:', err.message);
      setError(err.message);
      setIsConnecting(false);
      setIsConnected(false);
    });

    (newSocket as any).on('reconnect', (attemptNumber: number) => {
      console.log(`Socket.io reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setError(null);
    });

    (newSocket as any).on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`Socket.io reconnection attempt ${attemptNumber}`);
      setIsConnecting(true);
    });

    (newSocket as any).on('reconnect_error', (err: Error) => {
      console.error('Socket.io reconnection error:', err.message);
      setError(err.message);
    });

    (newSocket as any).on('reconnect_failed', () => {
      console.error('Socket.io reconnection failed after all attempts');
      setError('Failed to reconnect after multiple attempts');
      setIsConnecting(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('Disconnecting Socket.io');
      newSocket.close();
    };
  }, [token, autoConnect]);

  const value: SocketContextType = {
    socket,
    isConnected,
    isConnecting,
    error,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
