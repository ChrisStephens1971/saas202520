// CRDT Types - Implementation pending library selection

export interface CRDTConfig {
  clientId: string;
  serverUrl: string;
}

export interface SyncState {
  lastSyncedAt?: Date;
  pendingUpdates: number;
  connected: boolean;
}
