/**
 * Socket.io Authentication Middleware
 * Sprint 9 - Real-Time Features
 *
 * Authenticates Socket.io connections using JWT tokens from next-auth
 */

import { Socket } from 'socket.io';
import { decode } from 'next-auth/jwt';
import type { JWT } from 'next-auth/jwt';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Define ExtendedError type locally (internal socket.io type not exported)
type ExtendedError = Error & { data?: unknown };
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './events';

// Initialize Redis for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Socket-specific rate limiters
const socketRateLimiters = {
  // Connection rate limit: 10 connections per minute per IP
  connection: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: '@upstash/ratelimit/socket/connection',
  }),
  // Event rate limit: 100 events per minute per user
  events: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: '@upstash/ratelimit/socket/events',
  }),
};

type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Authentication middleware for Socket.io
 * Validates JWT token from next-auth and attaches user data to socket
 */
export async function authMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: ExtendedError) => void
): Promise<void> {
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

    try {
      // Verify JWT token with next-auth
      const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

      if (!secret) {
        console.error('AUTH_SECRET not configured for JWT verification');
        throw new Error('Server configuration error');
      }

      // Decode and verify the JWT token
      const decoded = await decode({
        token: token as string,
        secret,
        salt: '',
      });

      if (!decoded || !decoded.sub) {
        console.log(`Socket ${socket.id}: Invalid or expired token`);
        // Fall back to anonymous
        socket.data.userId = undefined;
        socket.data.username = 'Anonymous';
        socket.data.role = 'guest';
        socket.data.tournaments = new Set();
        return next();
      }

      // Extract user data from JWT
      const userId = decoded.sub;
      const username = decoded.name || decoded.email || 'User';
      const role = (decoded.role as string) || 'player';
      const orgId = decoded.orgId as string | undefined;

      // Attach authenticated user data to socket
      socket.data.userId = userId;
      socket.data.username = username;
      socket.data.role = role;
      socket.data.tournaments = new Set();

      console.log(`Socket ${socket.id} authenticated as user ${userId} (${role}${orgId ? `, org: ${orgId}` : ''})`);
      next();
    } catch (error) {
      console.error(`Socket ${socket.id}: Token verification error:`, error);
      // On error, fall back to anonymous (don't block connections)
      socket.data.userId = undefined;
      socket.data.username = 'Anonymous';
      socket.data.role = 'guest';
      socket.data.tournaments = new Set();
      next();
    }
  } catch (error) {
    console.error(`Socket ${socket.id}: Auth middleware error:`, error);
    next(new Error('Authentication failed'));
  }
}

/**
 * Rate limiting middleware
 * Prevents spam and abuse by limiting connections per IP
 */
export async function rateLimitMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: ExtendedError) => void
): Promise<void> {
  try {
    // Get client IP address
    const clientIP =
      socket.handshake.headers['x-forwarded-for'] ||
      socket.handshake.headers['x-real-ip'] ||
      socket.handshake.address ||
      'unknown';

    // Use first IP if x-forwarded-for contains multiple
    const ip = Array.isArray(clientIP) ? clientIP[0] : clientIP.toString().split(',')[0].trim();

    // Check connection rate limit
    const { success, limit, remaining, reset } = await socketRateLimiters.connection.limit(ip);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      console.warn(`Rate limit exceeded for IP ${ip}. Retry after ${retryAfter}s`);

      // Log violation for monitoring
      await redis.setex(
        `socket_rate_limit_violation:${ip}:${Date.now()}`,
        86400, // 24 hours
        JSON.stringify({
          ip,
          timestamp: new Date().toISOString(),
          limit,
          remaining,
          reset,
        })
      );

      const error = new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
      error.name = 'RateLimitError';
      return next(error);
    }

    console.log(`Socket ${socket.id} passed rate limit check (${remaining}/${limit} remaining)`);
    next();
  } catch (error) {
    console.error(`Socket ${socket.id}: Rate limit check error:`, error);
    // On error, allow connection (fail open)
    next();
  }
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
