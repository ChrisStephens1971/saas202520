// Secure Sync Service V2 - Addresses All Security Audit Gaps
// IMPROVEMENTS:
// - Auth runs in preValidation hook (not regular middleware)
// - Redis-backed per-message rate limiting
// - Room validation before DB lookup
// - Incremental document size tracking
// - Explicit Origin validation during upgrade
// - Normalized room IDs (case-insensitive)

import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import type { FastifyRequest } from 'fastify';
import type { IncomingMessage } from 'http';
import { SecureRoomManager } from './y-websocket-server-secure.js';
import { verifyToken, verifyRoomToken, extractTournamentId } from './auth.js';
import { initRateLimiters, checkMessageRateLimit, destroyRateLimiters } from './rate-limiter.js';

const PORT = parseInt(process.env.SYNC_SERVICE_PORT || '8020', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3020').split(',');
const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

const server = Fastify({
  logger: process.env.NODE_ENV === 'development',
  connectionTimeout: 60000,
  keepAliveTimeout: 30000,
});

const roomManager = new SecureRoomManager();

// Initialize rate limiters (Redis or fallback to in-memory)
await initRateLimiters();

// CORS for HTTP endpoints (Note: Does NOT affect WebSocket upgrade)
await server.register(fastifyCors, {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
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
    perMessageDeflate: false,
    // Verify origin during upgrade (CRITICAL: CORS doesn't apply to WebSocket)
    verifyClient: (info, callback) => {
      const origin = info.origin || info.req.headers.origin;

      // Allow no origin (native apps, curl)
      if (!origin) {
        callback(true);
        return;
      }

      // Check whitelist
      if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
        callback(true);
      } else {
        console.warn(`[WebSocket] Rejected upgrade from origin: ${origin}`);
        callback(false, 403, 'Forbidden: Invalid origin');
      }
    },
  },
});

/**
 * Validate room format before expensive DB lookup
 * Returns error message if invalid, null if valid
 */
function validateRoomFormat(roomTokenParam: string): string | null {
  if (!roomTokenParam || roomTokenParam.length < 10) {
    return 'Room token too short';
  }

  if (roomTokenParam.length > 500) {
    return 'Room token too long';
  }

  // Basic JWT format check (3 parts separated by dots)
  const parts = roomTokenParam.split('.');
  if (parts.length !== 3) {
    return 'Invalid room token format';
  }

  return null;
}

/**
 * Normalize room/org identifiers (case-insensitive, trim whitespace)
 */
function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

/**
 * SECURE Health endpoint - Requires authentication
 */
server.get('/health', async (request, reply) => {
  const token = verifyToken(request.raw);
  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const stats = roomManager.getPublicStats();

  return {
    status: 'ok',
    service: 'sync-service',
    version: '2.0-secure',
    timestamp: new Date().toISOString(),
    stats,
  };
});

/**
 * ADMIN Stats endpoint - Requires authentication and admin role
 */
server.get('/admin/stats', async (request, reply) => {
  const token = verifyToken(request.raw);
  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  if (token.role !== 'owner' && token.role !== 'admin') {
    return reply.code(403).send({ error: 'Forbidden: Admin access required' });
  }

  const stats = roomManager.getAdminStats(token.orgId);

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    stats,
  };
});

/**
 * SECURE WebSocket endpoint with preValidation hook
 * Authentication runs BEFORE upgrade (not in regular middleware)
 */
server.register(async function (fastify) {
  fastify.get(
    '/',
    {
      websocket: true,
      // CRITICAL: preValidation hook runs before WebSocket upgrade
      preValidation: async (request, reply) => {
        const querystring = request.query as { token?: string; room?: string };

        // STEP 1: Verify JWT authentication
        const userToken = verifyToken(request.raw as IncomingMessage);
        if (!userToken) {
          reply.code(401).send({ error: 'Authentication required' });
          return;
        }

        // STEP 2: Validate room token format (before expensive verification)
        const roomTokenParam = querystring.room;
        if (!roomTokenParam) {
          reply.code(400).send({ error: 'Room access token required' });
          return;
        }

        const formatError = validateRoomFormat(roomTokenParam);
        if (formatError) {
          reply.code(400).send({ error: formatError });
          return;
        }

        // Store validated tokens in request for WebSocket handler
        (request as any).userToken = userToken;
        (request as any).roomTokenParam = roomTokenParam;
      },
    },
    (socket, request: FastifyRequest<{ Querystring: { token?: string; room?: string } }>) => {
      const remoteAddress = request.ip;

      try {
        // Retrieve pre-validated tokens from preValidation hook
        const userToken = (request as any).userToken;
        const roomTokenParam = (request as any).roomTokenParam;

        if (!userToken || !roomTokenParam) {
          console.error('[WebSocket] Missing validated tokens (preValidation failed)');
          socket.close(1008, 'Internal error');
          return;
        }

        console.log(
          `[WebSocket] Authenticated user: ${userToken.userId} (org: ${userToken.orgId})`
        );

        // STEP 3: Verify room access token
        const roomToken = verifyRoomToken(roomTokenParam, '');
        if (!roomToken) {
          console.warn(
            `[WebSocket] Invalid room token from user ${userToken.userId}`
          );
          socket.close(1008, 'Invalid room access token');
          return;
        }

        // STEP 4: Verify org match (normalized)
        const normalizedUserOrg = normalizeId(userToken.orgId);
        const normalizedRoomOrg = normalizeId(roomToken.orgId);

        if (normalizedUserOrg !== normalizedRoomOrg) {
          console.warn(
            `[WebSocket] Org mismatch for user ${userToken.userId} (user: ${normalizedUserOrg}, room: ${normalizedRoomOrg})`
          );
          socket.close(1008, 'Unauthorized: Organization mismatch');
          return;
        }

        // STEP 5: Get or create room (with quota enforcement)
        const tournamentId = normalizeId(roomToken.tournamentId);
        const secureRoomId = `${tournamentId}-${normalizedRoomOrg}`;

        const room = roomManager.getOrCreateRoom(
          secureRoomId,
          tournamentId,
          normalizedRoomOrg
        );

        if (!room) {
          console.warn(
            `[WebSocket] Room quota exceeded for org ${normalizedRoomOrg}`
          );
          socket.close(1008, 'Room quota exceeded');
          return;
        }

        // STEP 6: Add connection to room
        const added = room.addConnection(socket, roomToken);
        if (!added) {
          console.warn(
            `[WebSocket] Failed to add connection for user ${userToken.userId}`
          );
          socket.close(1008, 'Access denied');
          return;
        }

        const connectionId = `${userToken.userId}-${Date.now()}`;
        console.log(
          `[WebSocket] Connection established: user ${userToken.userId}, room ${secureRoomId}, connId ${connectionId}`
        );

        // STEP 7: Handle incoming messages with Redis-backed rate limiting
        socket.on('message', async (message: Buffer) => {
          try {
            const uint8Message = new Uint8Array(message);

            // Payload size check
            if (uint8Message.length > MAX_PAYLOAD_SIZE) {
              console.warn(
                `[WebSocket] Message too large from user ${userToken.userId}: ${uint8Message.length} bytes`
              );
              socket.close(1009, 'Message too large');
              return;
            }

            // CRITICAL: Per-message rate limiting (Redis-backed)
            const rateLimitError = await checkMessageRateLimit(
              connectionId,
              userToken.userId,
              normalizedUserOrg
            );

            if (rateLimitError) {
              console.warn(
                `[WebSocket] Rate limit exceeded for user ${userToken.userId}: ${rateLimitError}`
              );
              socket.close(1008, rateLimitError);
              return;
            }

            // Process message
            room.handleMessage(socket, uint8Message);
          } catch (error) {
            console.error(
              `[WebSocket] Message handling error for user ${userToken.userId}:`,
              error
            );
            socket.close(1002, 'Protocol error');
          }
        });

        // STEP 8: Handle disconnection
        socket.on('close', () => {
          console.log(
            `[WebSocket] Connection closed: user ${userToken.userId}, room ${secureRoomId}`
          );
          room.removeConnection(socket);
        });

        socket.on('error', (error) => {
          console.error(
            `[WebSocket] Socket error for user ${userToken.userId}:`,
            error
          );
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
async function shutdown() {
  console.log('[Server] Shutting down gracefully...');
  await destroyRateLimiters();
  roomManager.destroy();
  await server.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
server.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }

  console.log(`🔒 SECURE Y.js Sync Service V2 listening on ${address}`);
  console.log(`   ✅ Auth in preValidation hook (runs before upgrade)`);
  console.log(`   ✅ Redis-backed per-message rate limiting`);
  console.log(`   ✅ Room validation before DB lookup`);
  console.log(`   ✅ Normalized IDs (case-insensitive)`);
  console.log(`   ✅ Origin validation during WebSocket upgrade`);
  console.log(`   CORS whitelist: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`   Max payload: ${MAX_PAYLOAD_SIZE / 1024}KB`);
});
