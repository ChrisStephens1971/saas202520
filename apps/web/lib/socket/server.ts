/**
 * Socket.io Server Setup
 * Sprint 9 - Real-Time Features
 *
 * Configures Socket.io server for Next.js with Redis adapter
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  SocketEvent,
  JoinTournamentPayload,
  LeaveTournamentPayload,
} from './events';
import { authMiddleware, rateLimitMiddleware, loggingMiddleware } from './middleware';

let io: SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> | null = null;

export function getIO(): SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> | null {
  return io;
}

export function initializeSocketServer(
  httpServer: HTTPServer
): SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  if (io) {
    console.log('Socket.io server already initialized');
    return io;
  }

  console.log('Initializing Socket.io server...');

  // Create Socket.io server
  io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Set up Redis adapter if Redis is configured
  if (process.env.REDIS_URL) {
    try {
      const pubClient = new Redis(process.env.REDIS_URL);
      const subClient = pubClient.duplicate();

      io.adapter(createAdapter(pubClient, subClient));
      console.log('Redis adapter initialized');
    } catch (error) {
      console.error('Failed to initialize Redis adapter:', error);
      console.log('Continuing without Redis adapter (single instance only)');
    }
  } else {
    console.log('No Redis URL configured, running in single-instance mode');
  }

  // Apply middleware
  io.use(loggingMiddleware);
  io.use(rateLimitMiddleware);
  io.use(authMiddleware);
  console.log('Socket.io middleware applied: logging, rate limiting, authentication');

  // Connection handler
  io.on(SocketEvent.CONNECTION, (socket) => {
    console.log(
      `Client connected: ${socket.id} (user: ${socket.data.userId || 'anonymous'}, role: ${socket.data.role})`
    );

    // Join tournament room
    socket.on(SocketEvent.JOIN_TOURNAMENT, ({ tournamentId, userId }: JoinTournamentPayload) => {
      console.log(`Socket ${socket.id} joining tournament: ${tournamentId}`);

      socket.join(`tournament:${tournamentId}`);
      socket.data.tournaments.add(tournamentId);
      socket.data.userId = userId;

      // Notify others in the room
      socket.to(`tournament:${tournamentId}`).emit(SocketEvent.USER_ONLINE, {
        userId: userId || socket.id,
        username: socket.data.username || 'Anonymous',
        status: 'online',
        timestamp: new Date().toISOString(),
      });

      // Send current users in tournament
      io?.in(`tournament:${tournamentId}`)
        .fetchSockets()
        .then((sockets) => {
          const users = sockets.map((s) => ({
            userId: s.data.userId || s.id,
            username: s.data.username || 'Anonymous',
            role: s.data.role || 'player',
          }));

          socket.emit(SocketEvent.USERS_IN_TOURNAMENT, {
            tournamentId,
            users,
          });
        });
    });

    // Leave tournament room
    socket.on(SocketEvent.LEAVE_TOURNAMENT, ({ tournamentId, userId }: LeaveTournamentPayload) => {
      console.log(`Socket ${socket.id} leaving tournament: ${tournamentId}`);

      socket.leave(`tournament:${tournamentId}`);
      socket.data.tournaments.delete(tournamentId);

      // Notify others
      socket.to(`tournament:${tournamentId}`).emit(SocketEvent.USER_OFFLINE, {
        userId: userId || socket.id,
        username: socket.data.username || 'Anonymous',
        status: 'offline',
        timestamp: new Date().toISOString(),
      });
    });

    // Disconnect handler
    socket.on(SocketEvent.DISCONNECT, () => {
      console.log(`Client disconnected: ${socket.id}`);

      // Notify all tournaments this user was in
      socket.data.tournaments.forEach((tournamentId) => {
        socket.to(`tournament:${tournamentId}`).emit(SocketEvent.USER_OFFLINE, {
          userId: socket.data.userId || socket.id,
          username: socket.data.username || 'Anonymous',
          status: 'offline',
          timestamp: new Date().toISOString(),
        });
      });
    });

    // Error handler
    socket.on(SocketEvent.ERROR, (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.log('Socket.io server initialized successfully');
  return io;
}

// Helper functions to emit events

export function emitToTournament<K extends keyof ServerToClientEvents>(
  tournamentId: string,
  event: K,
  payload: Parameters<ServerToClientEvents[K]>[0]
): void {
  if (!io) {
    console.error('Socket.io server not initialized');
    return;
  }

  (io.to(`tournament:${tournamentId}`) as any).emit(event, payload);
}

export function emitToAll<K extends keyof ServerToClientEvents>(
  event: K,
  payload: Parameters<ServerToClientEvents[K]>[0]
): void {
  if (!io) {
    console.error('Socket.io server not initialized');
    return;
  }

  (io as any).emit(event, payload);
}

export function emitToUser<K extends keyof ServerToClientEvents>(
  userId: string,
  event: K,
  payload: Parameters<ServerToClientEvents[K]>[0]
): void {
  if (!io) {
    console.error('Socket.io server not initialized');
    return;
  }

  // Find socket by user ID
  io.sockets.sockets.forEach((socket) => {
    if (socket.data.userId === userId) {
      (socket as any).emit(event, payload);
    }
  });
}

export async function getTournamentUsers(tournamentId: string): Promise<
  Array<{
    userId: string;
    username: string;
    role: string;
  }>
> {
  if (!io) {
    return [];
  }

  const sockets = await io.in(`tournament:${tournamentId}`).fetchSockets();
  return sockets.map((socket) => ({
    userId: socket.data.userId || socket.id,
    username: socket.data.username || 'Anonymous',
    role: socket.data.role || 'player',
  }));
}
