// Y.js WebSocket Server Utilities
// Handles Y.js CRDT synchronization protocol

import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import type { WebSocket } from 'ws';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

/**
 * Room - manages a shared Y.Doc for a tournament
 */
export class Room {
  public name: string;
  public doc: Y.Doc;
  public connections: Map<WebSocket, Set<number>>;
  public awareness: awarenessProtocol.Awareness;

  constructor(name: string) {
    this.name = name;
    this.doc = new Y.Doc();
    this.connections = new Map();
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    // Log document updates for debugging
    this.doc.on('update', (update: Uint8Array, origin: any) => {
      console.log(`[Room ${this.name}] Document updated, size: ${update.length} bytes`);
    });
  }

  /**
   * Add a WebSocket connection to this room
   */
  addConnection(ws: WebSocket): void {
    this.connections.set(ws, new Set());
    console.log(`[Room ${this.name}] Connection added, total: ${this.connections.size}`);

    // Send current document state to new connection
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    ws.send(encoding.toUint8Array(encoder));
  }

  /**
   * Remove a WebSocket connection from this room
   */
  removeConnection(ws: WebSocket): void {
    const controlledIds = this.connections.get(ws);
    if (controlledIds) {
      this.awareness.setLocalState(null);
      this.connections.delete(ws);
      console.log(`[Room ${this.name}] Connection removed, remaining: ${this.connections.size}`);
    }
  }

  /**
   * Handle incoming message from a client
   */
  handleMessage(ws: WebSocket, message: Uint8Array): void {
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC:
        this.handleSyncMessage(ws, decoder);
        break;
      case MESSAGE_AWARENESS:
        this.handleAwarenessMessage(ws, message);
        break;
      default:
        console.warn(`[Room ${this.name}] Unknown message type: ${messageType}`);
    }
  }

  /**
   * Handle Y.js sync protocol messages
   */
  private handleSyncMessage(ws: WebSocket, decoder: decoding.Decoder): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);

    // Apply sync protocol
    const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, ws);

    // Broadcast update to all other clients
    if (syncMessageType === syncProtocol.messageYjsSyncStep2) {
      const update = encoding.toUint8Array(encoder);
      this.broadcast(update, ws);
    }

    // Send response back to sender
    const response = encoding.toUint8Array(encoder);
    if (response.length > 1) {
      ws.send(response);
    }
  }

  /**
   * Handle awareness protocol messages (cursor positions, user presence, etc.)
   */
  private handleAwarenessMessage(ws: WebSocket, message: Uint8Array): void {
    awarenessProtocol.applyAwarenessUpdate(
      this.awareness,
      message.slice(1), // Skip message type byte
      ws
    );
    // Broadcast awareness update to all other clients
    this.broadcast(message, ws);
  }

  /**
   * Broadcast a message to all connected clients except sender
   */
  private broadcast(message: Uint8Array, exclude?: WebSocket): void {
    this.connections.forEach((_, conn) => {
      if (conn !== exclude && conn.readyState === 1) {
        conn.send(message);
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
   * Clean up resources
   */
  destroy(): void {
    this.doc.destroy();
    this.connections.clear();
  }
}

/**
 * Room Manager - manages all active tournament rooms
 */
export class RoomManager {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map();
  }

  /**
   * Get or create a room
   */
  getRoom(roomName: string): Room {
    if (!this.rooms.has(roomName)) {
      console.log(`[RoomManager] Creating new room: ${roomName}`);
      this.rooms.set(roomName, new Room(roomName));
    }
    return this.rooms.get(roomName)!;
  }

  /**
   * Remove empty rooms (cleanup)
   */
  cleanupEmptyRooms(): void {
    const emptyRooms: string[] = [];
    this.rooms.forEach((room, name) => {
      if (room.isEmpty()) {
        emptyRooms.push(name);
      }
    });

    emptyRooms.forEach((name) => {
      console.log(`[RoomManager] Removing empty room: ${name}`);
      const room = this.rooms.get(name);
      if (room) {
        room.destroy();
        this.rooms.delete(name);
      }
    });
  }

  /**
   * Get stats about active rooms
   */
  getStats() {
    return {
      totalRooms: this.rooms.size,
      rooms: Array.from(this.rooms.entries()).map(([name, room]) => ({
        name,
        connections: room.connections.size,
        docSize: Y.encodeStateAsUpdate(room.doc).length,
      })),
    };
  }
}
