/**
 * Socket.io API Route
 * Sprint 9 - Real-Time Features
 *
 * Initializes Socket.io server with Next.js
 */

import { NextRequest } from 'next/server';
import { Server as HTTPServer } from 'http';
import { initializeSocketServer, getIO } from '@/lib/socket/server';
import { authMiddleware, loggingMiddleware } from '@/lib/socket/middleware';

// This will be used to attach the Socket.io server to the Next.js server
export async function GET(req: NextRequest) {
  try {
    const io = getIO();

    if (io) {
      return new Response(JSON.stringify({ status: 'Socket.io server already running' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Note: In Next.js App Router, we can't directly access the HTTP server
    // The Socket.io server should be initialized in a custom server file
    // This endpoint just checks if it's running

    return new Response(
      JSON.stringify({
        status: 'Socket.io server needs to be initialized in custom server',
        message: 'Run the application with the custom server to enable Socket.io',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Socket.io initialization error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to initialize Socket.io',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
