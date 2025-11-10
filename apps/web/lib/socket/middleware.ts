/**
 * Socket.io Authentication Middleware
 * Sprint 9 - Real-Time Features
 *
 * Authenticates Socket.io connections
 */

import { Socket } from 'socket.io';

// Define ExtendedError type locally (internal socket.io type not exported)
type ExtendedError = Error & { data?: unknown };
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './events';

type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Authentication middleware for Socket.io
 * Validates the token and attaches user data to socket
 */
export function authMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: ExtendedError) => void
): void {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      console.log(`Socket ${socket.id}: No token provided, continuing as anonymous`);
      // Allow anonymous connections
      socket.data.userId = undefined;
      socket.data.username = 'Anonymous';
      socket.data.role = 'guest';
      socket.data.tournaments = new Set();
      return next();
    }

    // TODO: Verify JWT token with next-auth or your auth provider
    // For now, we'll parse a simple format: "userId:username:role"
    // In production, you should verify JWT tokens properly

    try {
      const parts = (token as string).split(':');
      if (parts.length >= 2) {
        socket.data.userId = parts[0];
        socket.data.username = parts[1];
        socket.data.role = parts[2] || 'player';
        socket.data.tournaments = new Set();

        console.log(`Socket ${socket.id} authenticated as user ${socket.data.userId}`);
        next();
      } else {
        console.log(`Socket ${socket.id}: Invalid token format`);
        socket.data.userId = undefined;
        socket.data.username = 'Anonymous';
        socket.data.role = 'guest';
        socket.data.tournaments = new Set();
        next();
      }
    } catch (error) {
      console.error(`Socket ${socket.id}: Token parsing error:`, error);
      next(new Error('Invalid token'));
    }
  } catch (error) {
    console.error(`Socket ${socket.id}: Auth error:`, error);
    next(new Error('Authentication failed'));
  }
}

/**
 * Rate limiting middleware
 * Prevents spam and abuse
 */
export function rateLimitMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: ExtendedError) => void
): void {
  // TODO: Implement rate limiting
  // For now, just allow all connections
  next();
}

/**
 * Role-based access control middleware
 * Checks if user has required role
 */
export function requireRole(role: string) {
  return (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void): void => {
    if (socket.data.role === 'admin') {
      // Admins can do everything
      return next();
    }

    if (socket.data.role === role) {
      return next();
    }

    const error = new Error(`Unauthorized: requires role ${role}`);
    error.name = 'UnauthorizedError';
    next(error);
  };
}

/**
 * Logging middleware
 * Logs all socket events for debugging
 */
export function loggingMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: ExtendedError) => void
): void {
  console.log(`[Socket.io] Connection from ${socket.handshake.address}`);
  console.log(`[Socket.io] User Agent: ${socket.handshake.headers['user-agent']}`);

  // Log all events
  socket.onAny((event, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Socket.io] Event "${event}" from ${socket.id}:`, args);
    }
  });

  next();
}
