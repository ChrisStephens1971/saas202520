/**
 * Global Type Declarations
 * Sprint 6 - WebSocket Integration
 */

import type { Server as SocketIOServer } from 'socket.io';

declare global {
  var io: SocketIOServer | undefined;
}

export {};
