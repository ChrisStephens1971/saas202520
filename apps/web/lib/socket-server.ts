/**
 * Socket.io Server Initialization
 * Sprint 6: WebSocket Integration
 *
 * Provides real-time updates for chip format tournaments
 */

import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { SocketEvent } from './socket/events';

export interface SocketEvents {
  'standings:updated': { tournamentId: string };
  'queue:updated': { tournamentId: string };
  'match:assigned': { tournamentId: string; matchId: string };
  'finals:applied': { tournamentId: string; finalistsCount: number };
  'chips:adjusted': { tournamentId: string; playerId: string };
}

/**
 * Initialize Socket.io server for real-time tournament updates
 *
 * @param httpServer - HTTP server instance from Next.js
 * @returns Socket.io server instance
 */
export function initializeSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_URL || 'http://localhost:3020',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socket',
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log('[Socket.io] Client connected:', socket.id);

    // Join tournament room for scoped updates
    socket.on(SocketEvent.JOIN_TOURNAMENT, (tournamentId: string) => {
      if (!tournamentId) {
        console.error('[Socket.io] Invalid tournamentId provided');
        return;
      }
      socket.join(`tournament:${tournamentId}`);
      console.log(`[Socket.io] Client ${socket.id} joined tournament:${tournamentId}`);
    });

    // Leave tournament room
    socket.on(SocketEvent.LEAVE_TOURNAMENT, (tournamentId: string) => {
      if (!tournamentId) {
        console.error('[Socket.io] Invalid tournamentId provided');
        return;
      }
      socket.leave(`tournament:${tournamentId}`);
      console.log(`[Socket.io] Client ${socket.id} left tournament:${tournamentId}`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Client disconnected: ${socket.id} (reason: ${reason})`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('[Socket.io] Socket error:', error);
    });
  });

  console.log('[Socket.io] Server initialized successfully');
  return io;
}

/**
 * Emit standings update to all clients in tournament room
 */
export function emitStandingsUpdate(io: Server, tournamentId: string) {
  io.to(`tournament:${tournamentId}`).emit(SocketEvent.STANDINGS_UPDATED, { tournamentId });
  console.log(`[Socket.io] Emitted standings:updated for tournament:${tournamentId}`);
}

/**
 * Emit queue update to all clients in tournament room
 */
export function emitQueueUpdate(io: Server, tournamentId: string) {
  io.to(`tournament:${tournamentId}`).emit(SocketEvent.QUEUE_UPDATED, { tournamentId });
  console.log(`[Socket.io] Emitted queue:updated for tournament:${tournamentId}`);
}

/**
 * Emit match assignment notification
 */
export function emitMatchAssigned(io: Server, tournamentId: string, matchId: string) {
  io.to(`tournament:${tournamentId}`).emit(SocketEvent.MATCH_ASSIGNED, { tournamentId, matchId });
  console.log(`[Socket.io] Emitted match:assigned for tournament:${tournamentId}, match:${matchId}`);
}

/**
 * Emit finals cutoff applied notification
 */
export function emitFinalsApplied(io: Server, tournamentId: string, finalistsCount: number) {
  io.to(`tournament:${tournamentId}`).emit('finals:applied', { tournamentId, finalistsCount });
  console.log(`[Socket.io] Emitted finals:applied for tournament:${tournamentId}, finalists:${finalistsCount}`);
}

/**
 * Emit chip adjustment notification
 */
export function emitChipsAdjusted(io: Server, tournamentId: string, playerId: string) {
  io.to(`tournament:${tournamentId}`).emit('chips:adjusted', { tournamentId, playerId });
  console.log(`[Socket.io] Emitted chips:adjusted for tournament:${tournamentId}, player:${playerId}`);
}
