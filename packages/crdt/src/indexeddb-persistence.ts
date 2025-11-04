// IndexedDB Persistence for Y.js Documents
// Stores tournament state locally for offline-first functionality

import * as Y from 'yjs';

const DB_NAME = 'tournament-platform';
const DB_VERSION = 1;
const STORE_NAME = 'tournaments';

interface TournamentRecord {
  tournamentId: string;
  update: Uint8Array;
  timestamp: number;
  version: number;
}

export class IndexedDBPersistence {
  private db: IDBDatabase | null = null;
  private tournamentId: string;
  private doc: Y.Doc;
  private synced: boolean = false;

  constructor(tournamentId: string, doc: Y.Doc) {
    this.tournamentId = tournamentId;
    this.doc = doc;
  }

  /**
   * Initialize IndexedDB connection and load persisted state
   */
  async init(): Promise<void> {
    this.db = await this.openDB();
    await this.loadFromDB();
    this.setupAutosave();
  }

  /**
   * Open IndexedDB connection
   */
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = (globalThis as any).indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'tournamentId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Load persisted document state from IndexedDB
   */
  private async loadFromDB(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const record = await this.getRecord(this.tournamentId);

    if (record && record.update) {
      // Apply persisted state to Y.Doc
      Y.applyUpdate(this.doc, record.update);
      console.log(`[IndexedDB] Loaded tournament ${this.tournamentId} from local storage (v${record.version})`);
    } else {
      console.log(`[IndexedDB] No persisted state found for tournament ${this.tournamentId}`);
    }

    this.synced = true;
  }

  /**
   * Get tournament record from IndexedDB
   */
  private getRecord(tournamentId: string): Promise<TournamentRecord | undefined> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(tournamentId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Save document state to IndexedDB
   */
  async save(): Promise<void> {
    if (!this.db || !this.synced) return;

    const update = Y.encodeStateAsUpdate(this.doc);
    const existingRecord = await this.getRecord(this.tournamentId);

    const record: TournamentRecord = {
      tournamentId: this.tournamentId,
      update,
      timestamp: Date.now(),
      version: (existingRecord?.version || 0) + 1,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`[IndexedDB] Saved tournament ${this.tournamentId} (v${record.version}, ${update.length} bytes)`);
        resolve();
      };
    });
  }

  /**
   * Set up automatic saving on document updates
   */
  private setupAutosave(): void {
    let saveTimeout: NodeJS.Timeout | null = null;

    // Debounced save (wait 1 second after last update)
    this.doc.on('update', () => {
      if (saveTimeout) clearTimeout(saveTimeout);

      saveTimeout = setTimeout(() => {
        this.save().catch((err) => {
          console.error('[IndexedDB] Failed to save:', err);
        });
      }, 1000);
    });
  }

  /**
   * Delete tournament from IndexedDB
   */
  async delete(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(this.tournamentId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`[IndexedDB] Deleted tournament ${this.tournamentId}`);
        resolve();
      };
    });
  }

  /**
   * Clear all persisted tournaments
   */
  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('[IndexedDB] Cleared all tournaments');
        resolve();
      };
    });
  }

  /**
   * Get all stored tournament IDs
   */
  async getAllTournamentIds(): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    tournamentCount: number;
    totalSize: number;
    tournaments: Array<{ id: string; size: number; version: number; lastUpdated: Date }>;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const records = request.result as TournamentRecord[];
        const tournaments = records.map((r) => ({
          id: r.tournamentId,
          size: r.update.length,
          version: r.version,
          lastUpdated: new Date(r.timestamp),
        }));

        resolve({
          tournamentCount: records.length,
          totalSize: records.reduce((sum, r) => sum + r.update.length, 0),
          tournaments,
        });
      };
    });
  }

  /**
   * Close database connection
   */
  destroy(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
