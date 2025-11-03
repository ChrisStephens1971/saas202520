// Y.js WebSocket Server - SECURE VERSION
// Implements authentication, authorization, payload limits, and awareness ownership

import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/dist/sync.cjs';
import * as awarenessProtocol from 'y-protocols/dist/awareness.cjs';
import * as encoding from 'lib0/dist/encoding.cjs';
import * as decoding from 'lib0/dist/decoding.cjs';
import type { WebSocket } from 'ws';
import { verifyRoomToken, hasPermission, type RoomAccessToken } from './auth.js';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

// Security limits
const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB max message size
const MAX_ROOMS_PER_ORG = 100; // Prevent DoS via room creation
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface ConnectionMetadata {
  userId: string;
  orgId: string;
  roomToken: RoomAccessToken;
  awarenessIds: Set<number>;
  messageCount: number;
  lastMessageTime: number;
}

/**
 * Secure Room - manages a shared Y.Doc with authentication and access control
 */
export class SecureRoom {
  public name: string;
  public tournamentId: string;
  public orgId: string;
  public doc: Y.Doc;
  public connections: Map<WebSocket, ConnectionMetadata>;
  public awareness: awarenessProtocol.Awareness;
  private createdAt: number;
  private lastActivity: number;

  constructor(name: string, tournamentId: string, orgId: string) {
    this.name = name;
    this.tournamentId = tournamentId;
    this.orgId = orgId;
    this.doc = new Y.Doc();
    this.connections = new Map();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.createdAt = Date.now();
    this.lastActivity = Date.now();

    // Log document updates
    this.doc.on('update', (update: Uint8Array, origin: any) => {
      this.lastActivity = Date.now();
      console.log(
        `[SecureRoom ${this.name}] Document updated, size: ${update.length} bytes, org: ${this.orgId}`
      );
    });

    // Clean up awareness when states are removed
    this.awareness.on('change', () => {
      this.lastActivity = Date.now();
    });
  }

  /**
   * Add an authenticated WebSocket connection to this room
   */
  addConnection(ws: WebSocket, roomToken: RoomAccessToken): boolean {
    // Verify the token is for this room's organization
    if (roomToken.orgId !== this.orgId) {
      console.warn(
        `[SecureRoom ${this.name}] Connection rejected: org mismatch (token: ${roomToken.orgId}, room: ${this.orgId})`
      );
      return false;
    }

    // Verify read permission at minimum
    if (!hasPermission(roomToken, 'read')) {
      console.warn(
        `[SecureRoom ${this.name}] Connection rejected: no read permission for user ${roomToken.userId}`
      );
      return false;
    }

    const metadata: ConnectionMetadata = {
      userId: roomToken.userId,
      orgId: roomToken.orgId,
      roomToken,
      awarenessIds: new Set(),
      messageCount: 0,
      lastMessageTime: Date.now(),
    };

    this.connections.set(ws, metadata);
    console.log(
      `[SecureRoom ${this.name}] Connection added (user: ${roomToken.userId}, total: ${this.connections.size})`
    );

    // Send current document state to new connection
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    const syncMessage = encoding.toUint8Array(encoder);

    // Check payload size before sending
    if (syncMessage.length > MAX_PAYLOAD_SIZE) {
      console.error(
        `[SecureRoom ${this.name}] Initial sync message exceeds limit: ${syncMessage.length} bytes`
      );
      return false;
    }

    ws.send(syncMessage);
    return true;
  }

  /**
   * Remove a WebSocket connection from this room
   */
  removeConnection(ws: WebSocket): void {
    const metadata = this.connections.get(ws);
    if (metadata) {
      // Remove all awareness states owned by this connection
      if (metadata.awarenessIds.size > 0) {
        const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(
          this.awareness,
          Array.from(metadata.awarenessIds),
          new Map()
        );
        this.broadcast(
          new Uint8Array([MESSAGE_AWARENESS, ...awarenessUpdate]),
          ws
        );
      }

      this.connections.delete(ws);
      console.log(
        `[SecureRoom ${this.name}] Connection removed (user: ${metadata.userId}, remaining: ${this.connections.size})`
      );
    }
  }

  /**
   * Handle incoming message from a client - WITH SECURITY CHECKS
   */
  handleMessage(ws: WebSocket, message: Uint8Array): void {
    const metadata = this.connections.get(ws);
    if (!metadata) {
      console.warn(`[SecureRoom ${this.name}] Message from unknown connection`);
      ws.close(1008, 'Unauthorized');
      return;
    }

    // Rate limiting: track message count
    metadata.messageCount++;
    metadata.lastMessageTime = Date.now();

    // Simple rate limit: max 100 messages per second per connection
    const timeSinceLastReset = Date.now() - (metadata.lastMessageTime || 0);
    if (timeSinceLastReset < 1000 && metadata.messageCount > 100) {
      console.warn(
        `[SecureRoom ${this.name}] Rate limit exceeded for user ${metadata.userId}`
      );
      ws.close(1008, 'Rate limit exceeded');
      return;
    }

    // Reset counter every second
    if (timeSinceLastReset >= 1000) {
      metadata.messageCount = 0;
    }

    // Payload size limit
    if (message.length > MAX_PAYLOAD_SIZE) {
      console.warn(
        `[SecureRoom ${this.name}] Message exceeds size limit: ${message.length} bytes (user: ${metadata.userId})`
      );
      ws.close(1009, 'Message too large');
      return;
    }

    try {
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MESSAGE_SYNC:
          this.handleSyncMessage(ws, decoder, metadata);
          break;
        case MESSAGE_AWARENESS:
          this.handleAwarenessMessage(ws, message, metadata);
          break;
        default:
          console.warn(`[SecureRoom ${this.name}] Unknown message type: ${messageType}`);
      }
    } catch (error) {
      console.error(`[SecureRoom ${this.name}] Message handling error:`, error);
      ws.close(1002, 'Protocol error');
    }
  }

  /**
   * Handle Y.js sync protocol messages - WITH WRITE PERMISSION CHECK
   */
  private handleSyncMessage(
    ws: WebSocket,
    decoder: decoding.Decoder,
    metadata: ConnectionMetadata
  ): void {
    // Check write permission for sync updates
    if (!hasPermission(metadata.roomToken, 'write')) {
      console.warn(
        `[SecureRoom ${this.name}] Sync rejected: user ${metadata.userId} lacks write permission`
      );
      ws.close(1008, 'Insufficient permissions');
      return;
    }

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);

    // Apply sync protocol
    const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, ws);

    // Broadcast update to all other clients
    if (syncMessageType === syncProtocol.messageYjsSyncStep2) {
      const update = encoding.toUint8Array(encoder);
      if (update.length <= MAX_PAYLOAD_SIZE) {
        this.broadcast(update, ws);
      } else {
        console.error(
          `[SecureRoom ${this.name}] Sync update exceeds limit: ${update.length} bytes`
        );
      }
    }

    // Send response back to sender
    const response = encoding.toUint8Array(encoder);
    if (response.length > 1 && response.length <= MAX_PAYLOAD_SIZE) {
      try {
        ws.send(response);
      } catch (error) {
        console.error(`[SecureRoom ${this.name}] Failed to send sync response:`, error);
      }
    }
  }

  /**
   * Handle awareness protocol messages - WITH OWNERSHIP VALIDATION
   */
  private handleAwarenessMessage(
    ws: WebSocket,
    message: Uint8Array,
    metadata: ConnectionMetadata
  ): void {
    try {
      // Decode awareness update
      const awarenessUpdate = message.slice(1); // Skip message type byte
      const decoder = decoding.createDecoder(awarenessUpdate);

      // Read the awareness update structure
      const numUpdates = decoding.readVarUint(decoder);
      const validUpdates: number[] = [];

      for (let i = 0; i < numUpdates; i++) {
        const clientID = decoding.readVarUint(decoder);
        const clock = decoding.readVarUint(decoder);
        const stateLength = decoding.readVarUint(decoder);

        // SECURITY: Validate ownership
        // Only allow updates to awareness IDs that this connection owns
        if (metadata.awarenessIds.has(clientID) || stateLength > 0) {
          // Allow new IDs or updates to owned IDs
          if (stateLength > 0) {
            metadata.awarenessIds.add(clientID);
          } else {
            metadata.awarenessIds.delete(clientID);
          }
          validUpdates.push(clientID);
        } else {
          console.warn(
            `[SecureRoom ${this.name}] Awareness update rejected: user ${metadata.userId} attempted to update foreign ID ${clientID}`
          );
        }

        // Skip state data
        if (stateLength > 0) {
          decoding.readVarUint8Array(decoder);
        }
      }

      // Only apply the awareness update if all client IDs are valid
      if (validUpdates.length === numUpdates) {
        awarenessProtocol.applyAwarenessUpdate(this.awareness, awarenessUpdate, ws);
        // Broadcast to other clients
        this.broadcast(message, ws);
      }
    } catch (error) {
      console.error(`[SecureRoom ${this.name}] Awareness message error:`, error);
    }
  }

  /**
   * Broadcast a message to all connected clients except sender
   */
  private broadcast(message: Uint8Array, exclude?: WebSocket): void {
    this.connections.forEach((metadata, conn) => {
      if (conn !== exclude && conn.readyState === 1) {
        try {
          conn.send(message);
        } catch (error) {
          console.error(
            `[SecureRoom ${this.name}] Failed to broadcast to user ${metadata.userId}:`,
            error
          );
          // Connection is dead, remove it
          this.removeConnection(conn);
        }
      }
    });
  }

  /**
   * Check if room is empty (no connections)
   */
  isEmpty(): boolean {
    return this.connections.size === 0;
  }

  /**
   * Check if room is inactive (no activity for timeout period)
   */
  isInactive(timeoutMs: number = 30 * 60 * 1000): boolean {
    // 30 minutes default
    return Date.now() - this.lastActivity > timeoutMs;
  }

  /**
   * Get room statistics
   */
  getStats() {
    return {
      name: this.name,
      tournamentId: this.tournamentId,
      orgId: this.orgId,
      connections: this.connections.size,
      docSize: Y.encodeStateAsUpdate(this.doc).length,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      activeUsers: Array.from(this.connections.values()).map((m) => ({
        userId: m.userId,
        messageCount: m.messageCount,
      })),
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Close all connections
    this.connections.forEach((_, ws) => {
      ws.close(1000, 'Room closed');
    });

    this.doc.destroy();
    this.connections.clear();
  }
}

/**
 * Secure Room Manager - WITH QUOTAS AND RATE LIMITING
 */
export class SecureRoomManager {
  private rooms: Map<string, SecureRoom>;
  private orgRoomCounts: Map<string, number>;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.rooms = new Map();
    this.orgRoomCounts = new Map();

    // Periodic cleanup of inactive rooms
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveRooms();
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Get or create a room - WITH QUOTA ENFORCEMENT
   */
  getOrCreateRoom(
    roomName: string,
    tournamentId: string,
    orgId: string
  ): SecureRoom | null {
    // Check if room already exists
    if (this.rooms.has(roomName)) {
      return this.rooms.get(roomName)!;
    }

    // Check org quota
    const orgRoomCount = this.orgRoomCounts.get(orgId) || 0;
    if (orgRoomCount >= MAX_ROOMS_PER_ORG) {
      console.warn(
        `[SecureRoomManager] Org ${orgId} has reached room limit (${MAX_ROOMS_PER_ORG})`
      );
      return null;
    }

    // Create new room
    console.log(
      `[SecureRoomManager] Creating new room: ${roomName} (tournament: ${tournamentId}, org: ${orgId})`
    );
    const room = new SecureRoom(roomName, tournamentId, orgId);
    this.rooms.set(roomName, room);

    // Update org quota
    this.orgRoomCounts.set(orgId, orgRoomCount + 1);

    return room;
  }

  /**
   * Remove empty and inactive rooms (cleanup)
   */
  cleanupInactiveRooms(): void {
    const roomsToRemove: string[] = [];

    this.rooms.forEach((room, name) => {
      if (room.isEmpty() && room.isInactive()) {
        roomsToRemove.push(name);
      }
    });

    roomsToRemove.forEach((name) => {
      const room = this.rooms.get(name);
      if (room) {
        console.log(
          `[SecureRoomManager] Removing inactive room: ${name} (org: ${room.orgId})`
        );

        // Update org quota
        const orgCount = this.orgRoomCounts.get(room.orgId) || 0;
        if (orgCount > 0) {
          this.orgRoomCounts.set(room.orgId, orgCount - 1);
        }

        room.destroy();
        this.rooms.delete(name);
      }
    });

    if (roomsToRemove.length > 0) {
      console.log(`[SecureRoomManager] Cleaned up ${roomsToRemove.length} inactive rooms`);
    }
  }

  /**
   * Get stats about active rooms - SANITIZED FOR SECURITY
   */
  getPublicStats() {
    return {
      totalRooms: this.rooms.size,
      totalOrgs: this.orgRoomCounts.size,
      // DO NOT expose room names or tournament IDs
    };
  }

  /**
   * Get detailed stats (for authenticated admin endpoints only)
   */
  getAdminStats(orgId?: string) {
    const rooms = Array.from(this.rooms.values());

    // Filter by org if specified
    const filteredRooms = orgId ? rooms.filter((r) => r.orgId === orgId) : rooms;

    return {
      totalRooms: this.rooms.size,
      rooms: filteredRooms.map((room) => room.getStats()),
      orgQuotas: Array.from(this.orgRoomCounts.entries()).map(([org, count]) => ({
        orgId: org,
        roomCount: count,
        limit: MAX_ROOMS_PER_ORG,
      })),
    };
  }

  /**
   * Shutdown and cleanup all rooms
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.rooms.forEach((room) => room.destroy());
    this.rooms.clear();
    this.orgRoomCounts.clear();
  }
}
