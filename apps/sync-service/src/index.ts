import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { RoomManager } from './y-websocket-server.js';

const server = Fastify({
  logger: true,
});

// Initialize room manager for Y.js CRDT sync
const roomManager = new RoomManager();

// Register plugins
await server.register(cors, {
  origin: true, // Allow all origins in development
});

await server.register(websocket);

// Health check endpoint
server.get('/health', async () => {
  return {
    status: 'ok',
    service: 'sync-service',
    timestamp: new Date().toISOString(),
    stats: roomManager.getStats(),
  };
});

// WebSocket route for Y.js CRDT sync
server.register(async function (fastify) {
  fastify.get('/', { websocket: true }, (socket, req) => {
    // Extract room name from URL query parameter
    // Format: ws://localhost:8020/?room=tournament:123
    const roomName = req.query?.room as string || 'default';

    fastify.log.info(`Client connecting to room: ${roomName}`);

    // Get or create room
    const room = roomManager.getRoom(roomName);

    // Add connection to room
    room.addConnection(socket);

    // Handle incoming messages
    socket.on('message', (message: Buffer) => {
      try {
        // Y.js messages are binary (Uint8Array)
        const uint8Message = new Uint8Array(message);
        room.handleMessage(socket, uint8Message);
      } catch (err) {
        fastify.log.error({ err }, 'Error handling message');
      }
    });

    // Handle disconnection
    socket.on('close', () => {
      fastify.log.info(`Client disconnected from room: ${roomName}`);
      room.removeConnection(socket);

      // Cleanup empty rooms after a delay
      setTimeout(() => {
        roomManager.cleanupEmptyRooms();
      }, 30000); // 30 seconds
    });

    // Handle errors
    socket.on('error', (err) => {
      fastify.log.error({ err }, 'WebSocket error');
      room.removeConnection(socket);
    });
  });
});

// Periodic cleanup of empty rooms (every 5 minutes)
setInterval(() => {
  roomManager.cleanupEmptyRooms();
}, 5 * 60 * 1000);

// Start server
const start = async () => {
  try {
    const port = process.env.SYNC_SERVICE_PORT
      ? parseInt(process.env.SYNC_SERVICE_PORT)
      : 8020;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    server.log.info(`🚀 Y.js Sync Service listening on ${host}:${port}`);
    server.log.info(`WebSocket endpoint: ws://${host}:${port}/?room=tournament:<id>`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
