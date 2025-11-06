/**
 * Custom Next.js Server with Socket.io
 * Sprint 9: Real-Time Features
 *
 * This custom server enables Socket.io for real-time updates
 * while maintaining Next.js functionality
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeSocketServer } from './lib/socket/server';
import { authMiddleware, loggingMiddleware } from './lib/socket/middleware';
import type { Server as SocketIOServer } from 'socket.io';

// Extend global type to include Socket.io instance
declare global {
  var io: SocketIOServer | undefined;
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3020', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling request:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Initialize Socket.io with new Sprint 9 implementation
  const io = initializeSocketServer(server);

  // Apply middleware
  io.use(loggingMiddleware);
  io.use(authMiddleware);

  // Make Socket.io instance globally available
  global.io = io;

  server.once('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server running with Redis adapter support`);
  });
});
