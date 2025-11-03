import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';

const server = Fastify({
  logger: true,
});

// Register plugins
await server.register(cors, {
  origin: true, // Allow all origins in development
});

await server.register(websocket);

// Health check endpoint
server.get('/health', async () => {
  return { status: 'ok', service: 'sync-service', timestamp: new Date().toISOString() };
});

// WebSocket route for CRDT sync
server.register(async function (fastify) {
  fastify.get('/sync', { websocket: true }, (socket, req) => {
    fastify.log.info('Client connected to /sync');

    socket.on('message', (message) => {
      const data = message.toString();
      fastify.log.info({ message: data }, 'Received message from client');

      // Echo back for now (will implement CRDT sync logic later)
      socket.send(JSON.stringify({
        type: 'ack',
        message: 'Message received',
        timestamp: Date.now()
      }));
    });

    socket.on('close', () => {
      fastify.log.info('Client disconnected from /sync');
    });

    socket.on('error', (err) => {
      fastify.log.error({ err }, 'WebSocket error');
    });

    // Send welcome message
    socket.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to tournament sync service',
      timestamp: Date.now()
    }));
  });
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 8020;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    server.log.info(`Sync service listening on ${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
