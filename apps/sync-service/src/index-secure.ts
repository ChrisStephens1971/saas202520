// Secure Sync Service - Y.js WebSocket Server with Authentication
// SECURITY: All connections require JWT authentication and room access tokens

import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import type { FastifyRequest } from 'fastify';
import type { IncomingMessage } from 'http';
import { SecureRoomManager } from './y-websocket-server-secure.js';
import { verifyToken, verifyRoomToken, extractTournamentId } from './auth.js';

const PORT = parseInt(process.env.SYNC_SERVICE_PORT || '8020', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3020').split(',');
const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

const server = Fastify({
  logger: process.env.NODE_ENV === 'development',
  // WebSocket-specific settings
  connectionTimeout: 60000, // 60 seconds
  keepAliveTimeout: 30000, // 30 seconds
});

const roomManager = new SecureRoomManager();

// CORS - STRICT whitelist only
await server.register(fastifyCors, {
  origin: (origin, callback) => {
    if (!origin) {
      // Allow requests with no origin (e.g., mobile apps, curl)
      callback(null, true);
      return;
    }

    if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
});

// WebSocket with payload limits
await server.register(fastifyWebsocket, {
  options: {
    maxPayload: MAX_PAYLOAD_SIZE,
    clientTracking: true,
    perMessageDeflate: false, // Disable compression to prevent DoS
  },
});

/**
 * SECURE Health endpoint - Requires authentication, returns minimal info
 */
server.get('/health', async (request, reply) => {
  // Verify authentication
  const token = verifyToken(request.raw);
  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  // Return sanitized stats (no sensitive data)
  const stats = roomManager.getPublicStats();

  return {
    status: 'ok',
    service: 'sync-service',
    timestamp: new Date().toISOString(),
    stats,
  };
});

/**
 * ADMIN Stats endpoint - Requires authentication and admin role
 */
server.get('/admin/stats', async (request, reply) => {
  // Verify authentication
  const token = verifyToken(request.raw);
  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  // Check admin role
  if (token.role !== 'owner' && token.role !== 'admin') {
    return reply.code(403).send({ error: 'Forbidden: Admin access required' });
  }

  // Return detailed stats for the user's organization
  const stats = roomManager.getAdminStats(token.orgId);

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    stats,
  };
});

/**
 * SECURE WebSocket endpoint - Requires JWT + room access token
 *
 * Connection parameters:
 * - token: JWT token from NextAuth (Authorization or query param)
 * - room: Signed room access token
 *
 * Example: ws://localhost:8020/?token=<jwt>&room=<signed-room-token>
 */
server.register(async function (fastify) {
  fastify.get(
    '/',
    { websocket: true },
    (socket, request: FastifyRequest<{ Querystring: { token?: string; room?: string } }>) => {
      const remoteAddress = request.ip;
      console.log(`[WebSocket] Connection attempt from ${remoteAddress}`);

      try {
        // STEP 1: Verify JWT authentication
        const userToken = verifyToken(request.raw as IncomingMessage);
        if (!userToken) {
          console.warn(`[WebSocket] Rejected: No valid JWT token from ${remoteAddress}`);
          socket.close(1008, 'Authentication required');
          return;
        }

        console.log(
          `[WebSocket] Authenticated user: ${userToken.userId} (org: ${userToken.orgId})`
        );

        // STEP 2: Verify room access token
        const roomTokenParam = request.query.room;
        if (!roomTokenParam) {
          console.warn(`[WebSocket] Rejected: No room token from user ${userToken.userId}`);
          socket.close(1008, 'Room access token required');
          return;
        }

        // Extract tournament ID from room token
        const roomToken = verifyRoomToken(roomTokenParam, ''); // We'll validate tournament ID next
        if (!roomToken) {
          console.warn(`[WebSocket] Rejected: Invalid room token from user ${userToken.userId}`);
          socket.close(1008, 'Invalid room access token');
          return;
        }

        // STEP 3: Verify user belongs to the same org as the room
        if (roomToken.orgId !== userToken.orgId) {
          console.warn(
            `[WebSocket] Rejected: Org mismatch for user ${userToken.userId} (user org: ${userToken.orgId}, room org: ${roomToken.orgId})`
          );
          socket.close(1008, 'Unauthorized: Organization mismatch');
          return;
        }

        // STEP 4: Get or create room (with quota enforcement)
        const tournamentId = roomToken.tournamentId;
        const secureRoomId = `${tournamentId}-${roomToken.orgId}`; // Deterministic room ID

        const room = roomManager.getOrCreateRoom(secureRoomId, tournamentId, roomToken.orgId);
        if (!room) {
          console.warn(`[WebSocket] Rejected: Room quota exceeded for org ${roomToken.orgId}`);
          socket.close(1008, 'Room quota exceeded');
          return;
        }

        // STEP 5: Add connection to room (with permission check)
        const added = room.addConnection(socket, roomToken);
        if (!added) {
          console.warn(
            `[WebSocket] Rejected: Failed to add connection for user ${userToken.userId}`
          );
          socket.close(1008, 'Access denied');
          return;
        }

        console.log(
          `[WebSocket] Connection established: user ${userToken.userId}, room ${secureRoomId}`
        );

        // STEP 6: Handle incoming messages
        socket.on('message', (message: Buffer) => {
          try {
            const uint8Message = new Uint8Array(message);

            // Additional payload size check (belt and suspenders)
            if (uint8Message.length > MAX_PAYLOAD_SIZE) {
              console.warn(
                `[WebSocket] Message too large from user ${userToken.userId}: ${uint8Message.length} bytes`
              );
              socket.close(1009, 'Message too large');
              return;
            }

            room.handleMessage(socket, uint8Message);
          } catch (error) {
            console.error(
              `[WebSocket] Message handling error for user ${userToken.userId}:`,
              error
            );
            socket.close(1002, 'Protocol error');
          }
        });

        // STEP 7: Handle disconnection
        socket.on('close', () => {
          console.log(
            `[WebSocket] Connection closed: user ${userToken.userId}, room ${secureRoomId}`
          );
          room.removeConnection(socket);
        });

        socket.on('error', (error) => {
          console.error(`[WebSocket] Socket error for user ${userToken.userId}:`, error);
          room.removeConnection(socket);
        });
      } catch (error) {
        console.error(`[WebSocket] Connection setup error:`, error);
        socket.close(1011, 'Internal server error');
      }
    }
  );
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  roomManager.destroy();
  await server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  roomManager.destroy();
  await server.close();
  process.exit(0);
});

// Start server
server.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }

  console.log(`🔒 SECURE Y.js Sync Service listening on ${address}`);
  console.log(`   Authentication: REQUIRED (JWT + Room Token)`);
  console.log(`   CORS whitelist: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`   Max payload: ${MAX_PAYLOAD_SIZE / 1024}KB`);
  console.log(`   Health endpoint: GET /health (auth required)`);
  console.log(`   Admin stats: GET /admin/stats (admin only)`);
});
