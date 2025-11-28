// WebSocket Provider for Y.js Sync
// Handles real-time synchronization with the sync service

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export interface SyncProviderConfig {
  serverUrl: string;
  roomName: string;
  doc: Y.Doc;
  connect?: boolean;
  awareness?: unknown;
  params?: Record<string, string>;
}

/**
 * WebSocket provider for syncing Y.Doc with server
 *
 * This wraps y-websocket and provides a clean interface
 * for connecting tournament documents to the sync service.
 */
export class TournamentSyncProvider {
  private provider: WebsocketProvider;
  public doc: Y.Doc;
  public roomName: string;
  public serverUrl: string;

  constructor(config: SyncProviderConfig) {
    this.doc = config.doc;
    this.roomName = config.roomName;
    this.serverUrl = config.serverUrl;

    // Initialize WebSocket provider
    this.provider = new WebsocketProvider(config.serverUrl, config.roomName, config.doc, {
      connect: config.connect !== false,
      awareness: config.awareness,
      params: config.params || {},
    });

    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for connection lifecycle
   */
  private setupEventHandlers(): void {
    this.provider.on('status', (_event: { status: string }) => {
      // Status event handler
    });

    this.provider.on('sync', (_isSynced: boolean) => {
      // Sync event handler
    });

    this.provider.on('connection-close', (_event: unknown) => {
      // Connection closed handler
    });

    this.provider.on('connection-error', (_event: unknown) => {
      // Connection error handler
    });
  }

  /**
   * Check if currently connected to server
   */
  get isConnected(): boolean {
    return this.provider.wsconnected;
  }

  /**
   * Check if document is synced with server
   */
  get isSynced(): boolean {
    return this.provider.synced;
  }

  /**
   * Manually connect to server
   */
  connect(): void {
    this.provider.connect();
  }

  /**
   * Manually disconnect from server
   */
  disconnect(): void {
    this.provider.disconnect();
  }

  /**
   * Clean up and destroy provider
   */
  destroy(): void {
    this.provider.destroy();
  }

  /**
   * Listen for sync status changes
   */
  onSync(callback: (isSynced: boolean) => void): void {
    this.provider.on('sync', callback);
  }

  /**
   * Listen for connection status changes
   */
  onStatus(callback: (event: { status: string }) => void): void {
    this.provider.on('status', callback);
  }
}

/**
 * Create a sync provider for a tournament
 */
export function createSyncProvider(
  tournamentId: string,
  doc: Y.Doc,
  serverUrl: string = 'ws://localhost:8020'
): TournamentSyncProvider {
  return new TournamentSyncProvider({
    serverUrl,
    roomName: `tournament:${tournamentId}`,
    doc,
  });
}
