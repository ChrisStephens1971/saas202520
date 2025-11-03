// Event-Sourced Architecture
// All tournament state changes flow through immutable events

export interface TournamentEvent {
  id: string;
  tournamentId: string;
  kind: EventKind;
  actor: string; // User ID
  device: string; // Device ID for CRDT
  payload: Record<string, any>;
  timestamp: Date;
}

export enum EventKind {
  TOURNAMENT_CREATED = 'tournament.created',
  PLAYER_REGISTERED = 'player.registered',
  PLAYER_CHECKED_IN = 'player.checked_in',
  MATCH_CREATED = 'match.created',
  MATCH_STARTED = 'match.started',
  SCORE_UPDATED = 'score.updated',
  MATCH_COMPLETED = 'match.completed',
  TABLE_ASSIGNED = 'table.assigned',
  // ... more events as needed
}

// Projections rebuild state from events
export interface Projection<T> {
  apply(event: TournamentEvent): void;
  getState(): T;
  reset(): void;
}
