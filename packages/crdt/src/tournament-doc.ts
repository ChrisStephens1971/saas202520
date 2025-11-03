// Y.js Tournament Document Structure
// This implements the CRDT document for tournament state

import * as Y from 'yjs';
import type { Tournament, Player, Match, Table } from '@tournament/shared';

/**
 * Tournament CRDT Document
 *
 * This Y.Doc structure represents the complete tournament state
 * that can be synchronized across multiple devices offline-first.
 */
export class TournamentDoc {
  public doc: Y.Doc;

  // Y.js shared types for different parts of the tournament
  private tournamentMap: Y.Map<any>;
  private playersMap: Y.Map<any>;
  private matchesMap: Y.Map<any>;
  private tablesMap: Y.Map<any>;
  private eventsArray: Y.Array<any>;

  constructor(docId: string) {
    this.doc = new Y.Doc();
    this.doc.clientID = Math.floor(Math.random() * 1000000); // Unique client ID

    // Initialize shared data structures
    this.tournamentMap = this.doc.getMap('tournament');
    this.playersMap = this.doc.getMap('players');
    this.matchesMap = this.doc.getMap('matches');
    this.tablesMap = this.doc.getMap('tables');
    this.eventsArray = this.doc.getArray('events');
  }

  // ============================================================================
  // TOURNAMENT OPERATIONS
  // ============================================================================

  setTournament(tournament: Partial<Tournament>): void {
    Object.entries(tournament).forEach(([key, value]) => {
      this.tournamentMap.set(key, value);
    });
  }

  getTournament(): Partial<Tournament> {
    return this.tournamentMap.toJSON();
  }

  updateTournamentStatus(status: string): void {
    this.tournamentMap.set('status', status);
    this.addEvent({
      kind: 'tournament.status_changed',
      payload: { status },
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // PLAYER OPERATIONS
  // ============================================================================

  addPlayer(player: Player): void {
    this.playersMap.set(player.id, player);
    this.addEvent({
      kind: 'player.registered',
      payload: { playerId: player.id, name: player.name },
      timestamp: new Date().toISOString(),
    });
  }

  updatePlayer(playerId: string, updates: Partial<Player>): void {
    const existing = this.playersMap.get(playerId);
    if (existing) {
      this.playersMap.set(playerId, { ...existing, ...updates });
      this.addEvent({
        kind: 'player.updated',
        payload: { playerId, updates },
        timestamp: new Date().toISOString(),
      });
    }
  }

  getPlayer(playerId: string): Player | undefined {
    return this.playersMap.get(playerId);
  }

  getAllPlayers(): Player[] {
    return Array.from(this.playersMap.values());
  }

  checkInPlayer(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (player) {
      this.updatePlayer(playerId, {
        status: 'checked_in',
        checkedInAt: new Date(),
      });
      this.addEvent({
        kind: 'player.checked_in',
        payload: { playerId, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ============================================================================
  // MATCH OPERATIONS
  // ============================================================================

  addMatch(match: Match): void {
    this.matchesMap.set(match.id, match);
    this.addEvent({
      kind: 'match.created',
      payload: { matchId: match.id, round: match.round },
      timestamp: new Date().toISOString(),
    });
  }

  updateMatch(matchId: string, updates: Partial<Match>): void {
    const existing = this.matchesMap.get(matchId);
    if (existing) {
      // Increment revision for optimistic locking
      const updated = { ...existing, ...updates, rev: (existing.rev || 0) + 1 };
      this.matchesMap.set(matchId, updated);
      this.addEvent({
        kind: 'match.updated',
        payload: { matchId, updates, rev: updated.rev },
        timestamp: new Date().toISOString(),
      });
    }
  }

  getMatch(matchId: string): Match | undefined {
    return this.matchesMap.get(matchId);
  }

  getAllMatches(): Match[] {
    return Array.from(this.matchesMap.values());
  }

  updateMatchScore(matchId: string, score: { playerA: number; playerB: number }): void {
    const match = this.getMatch(matchId);
    if (match) {
      this.updateMatch(matchId, { score: { ...match.score, ...score } });
      this.addEvent({
        kind: 'score.updated',
        payload: { matchId, score },
        timestamp: new Date().toISOString(),
      });
    }
  }

  assignMatchToTable(matchId: string, tableId: string): void {
    this.updateMatch(matchId, { tableId, state: 'assigned' });
    this.addEvent({
      kind: 'table.assigned',
      payload: { matchId, tableId },
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // TABLE OPERATIONS
  // ============================================================================

  addTable(table: Table): void {
    this.tablesMap.set(table.id, table);
    this.addEvent({
      kind: 'table.created',
      payload: { tableId: table.id, label: table.label },
      timestamp: new Date().toISOString(),
    });
  }

  updateTable(tableId: string, updates: Partial<Table>): void {
    const existing = this.tablesMap.get(tableId);
    if (existing) {
      this.tablesMap.set(tableId, { ...existing, ...updates });
    }
  }

  getTable(tableId: string): Table | undefined {
    return this.tablesMap.get(tableId);
  }

  getAllTables(): Table[] {
    return Array.from(this.tablesMap.values());
  }

  // ============================================================================
  // EVENT LOG (Append-Only Audit Trail)
  // ============================================================================

  private addEvent(event: { kind: string; payload: any; timestamp: string }): void {
    this.eventsArray.push([{
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...event,
      clientId: this.doc.clientID,
    }]);
  }

  getEvents(): any[] {
    return this.eventsArray.toArray();
  }

  // ============================================================================
  // SYNC & PERSISTENCE
  // ============================================================================

  /**
   * Get the current state update to send to other clients
   */
  getStateUpdate(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  /**
   * Apply an update from another client
   */
  applyUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update);
  }

  /**
   * Get a snapshot of the entire document for persistence
   */
  getSnapshot(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  /**
   * Load from a snapshot
   */
  loadSnapshot(snapshot: Uint8Array): void {
    Y.applyUpdate(this.doc, snapshot);
  }

  /**
   * Subscribe to changes in the document
   */
  onUpdate(callback: (update: Uint8Array, origin: any) => void): void {
    this.doc.on('update', callback);
  }

  /**
   * Clean up and destroy the document
   */
  destroy(): void {
    this.doc.destroy();
  }
}

/**
 * Helper to create a tournament document
 */
export function createTournamentDoc(tournamentId: string): TournamentDoc {
  return new TournamentDoc(tournamentId);
}
