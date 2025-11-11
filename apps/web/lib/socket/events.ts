/**
 * WebSocket Event Types and Handlers
 * Sprint 9 - Real-Time Features
 *
 * Defines all Socket.io events and their payload types
 */

// Event names enum
export enum SocketEvent {
  // Connection events
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  RECONNECT = 'reconnect',
  RECONNECT_ERROR = 'reconnect_error',
  RECONNECT_FAILED = 'reconnect_failed',

  // Room management
  JOIN_TOURNAMENT = 'tournament:join',
  LEAVE_TOURNAMENT = 'tournament:leave',

  // Tournament events
  TOURNAMENT_UPDATED = 'tournament:updated',
  TOURNAMENT_STATUS_CHANGED = 'tournament:status_changed',
  TOURNAMENT_DELETED = 'tournament:deleted',

  // Match events
  MATCH_CREATED = 'match:created',
  MATCH_STARTED = 'match:started',
  MATCH_UPDATED = 'match:updated',
  MATCH_COMPLETED = 'match:completed',
  MATCH_DELETED = 'match:deleted',

  // Chip events
  CHIPS_AWARDED = 'chips:awarded',
  CHIPS_UPDATED = 'chips:updated',

  // Player events
  PLAYER_JOINED = 'player:joined',
  PLAYER_LEFT = 'player:left',
  PLAYER_ELIMINATED = 'player:eliminated',
  PLAYER_UPDATED = 'player:updated',

  // Presence events
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',
  USERS_IN_TOURNAMENT = 'users:in_tournament',

  // Notification events
  NOTIFICATION = 'notification',

  // Admin events
  ADMIN_BROADCAST = 'admin:broadcast',

  // Additional events (chip format specific)
  TOURNAMENT_CREATED = 'tournament:created',
  STANDINGS_UPDATED = 'standings:updated',
  FINALS_APPLIED = 'finals:applied',
  CHIPS_ADJUSTED = 'chips:adjusted',
  QUEUE_UPDATED = 'queue:updated',
  MATCH_ASSIGNED = 'match:assigned',
}

// Event payload types

export interface JoinTournamentPayload {
  tournamentId: string;
  userId?: string;
}

export interface LeaveTournamentPayload {
  tournamentId: string;
  userId?: string;
}

export interface TournamentUpdatedPayload {
  tournamentId: string;
  changes: {
    name?: string;
    status?: string;
    [key: string]: unknown;
  };
  updatedBy: string;
  timestamp: string;
}

export interface TournamentStatusChangedPayload {
  tournamentId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  timestamp: string;
}

export interface TournamentDeletedPayload {
  tournamentId: string;
  deletedBy: string;
  timestamp: string;
}

export interface MatchCreatedPayload {
  tournamentId: string;
  match: {
    id: string;
    matchNumber: number;
    player1Id: string;
    player2Id: string;
    status: string;
  };
  createdBy: string;
  timestamp: string;
}

export interface MatchStartedPayload {
  tournamentId: string;
  matchId: string;
  matchNumber: number;
  player1: {
    id: string;
    name: string;
  };
  player2: {
    id: string;
    name: string;
  };
  startedAt: string;
}

export interface MatchUpdatedPayload {
  tournamentId: string;
  matchId: string;
  changes: {
    status?: string;
    player1Chips?: number;
    player2Chips?: number;
    [key: string]: unknown;
  };
  updatedBy: string;
  timestamp: string;
}

export interface MatchCompletedPayload {
  tournamentId: string;
  matchId: string;
  matchNumber: number;
  winner: {
    id: string;
    name: string;
    chipsWon: number;
  };
  loser: {
    id: string;
    name: string;
    chipsWon: number;
  };
  completedAt: string;
}

export interface ChipsAwardedPayload {
  tournamentId: string;
  matchId: string;
  awards: Array<{
    playerId: string;
    playerName: string;
    chipsAwarded: number;
    totalChips: number;
  }>;
  awardedBy: string;
  timestamp: string;
}

export interface PlayerJoinedPayload {
  tournamentId: string;
  player: {
    id: string;
    name: string;
    email?: string;
  };
  joinedAt: string;
}

export interface PlayerEliminatedPayload {
  tournamentId: string;
  player: {
    id: string;
    name: string;
    finalChips: number;
    rank: number;
  };
  eliminatedAt: string;
}

export interface UserPresencePayload {
  userId: string;
  username: string;
  status: 'online' | 'offline';
  timestamp: string;
}

export interface UsersInTournamentPayload {
  tournamentId: string;
  users: Array<{
    userId: string;
    username: string;
    role: string;
  }>;
}

export interface NotificationPayload {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  actionUrl?: string;
}

export interface AdminBroadcastPayload {
  message: string;
  type: 'info' | 'warning' | 'alert';
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
}

export interface TournamentCreatedPayload {
  tournamentId: string;
  name: string;
  format: string;
  createdBy: string;
  timestamp: string;
}

export interface StandingsUpdatedPayload {
  tournamentId: string;
  standings: Array<{
    playerId: string;
    playerName: string;
    chips: number;
    rank: number;
  }>;
  timestamp: string;
}

export interface FinalsAppliedPayload {
  tournamentId: string;
  finalists: string[];
  timestamp: string;
}

export interface ChipsAdjustedPayload {
  tournamentId: string;
  playerId: string;
  previousChips: number;
  newChips: number;
  adjustedBy: string;
  timestamp: string;
}

export interface QueueUpdatedPayload {
  tournamentId: string;
  queue: Array<{
    playerId: string;
    playerName: string;
    position: number;
  }>;
  timestamp: string;
}

export interface MatchAssignedPayload {
  tournamentId: string;
  matchId: string;
  tableId: string;
  player1Id: string;
  player2Id: string;
  timestamp: string;
}

// Server-to-client events map
export interface ServerToClientEvents {
  [SocketEvent.TOURNAMENT_UPDATED]: (payload: TournamentUpdatedPayload) => void;
  [SocketEvent.TOURNAMENT_STATUS_CHANGED]: (payload: TournamentStatusChangedPayload) => void;
  [SocketEvent.TOURNAMENT_CREATED]: (payload: TournamentCreatedPayload) => void;
  [SocketEvent.TOURNAMENT_DELETED]: (payload: TournamentDeletedPayload) => void;
  [SocketEvent.MATCH_CREATED]: (payload: MatchCreatedPayload) => void;
  [SocketEvent.MATCH_STARTED]: (payload: MatchStartedPayload) => void;
  [SocketEvent.MATCH_UPDATED]: (payload: MatchUpdatedPayload) => void;
  [SocketEvent.MATCH_COMPLETED]: (payload: MatchCompletedPayload) => void;
  [SocketEvent.MATCH_ASSIGNED]: (payload: MatchAssignedPayload) => void;
  [SocketEvent.CHIPS_AWARDED]: (payload: ChipsAwardedPayload) => void;
  [SocketEvent.CHIPS_ADJUSTED]: (payload: ChipsAdjustedPayload) => void;
  [SocketEvent.PLAYER_JOINED]: (payload: PlayerJoinedPayload) => void;
  [SocketEvent.PLAYER_ELIMINATED]: (payload: PlayerEliminatedPayload) => void;
  [SocketEvent.USER_ONLINE]: (payload: UserPresencePayload) => void;
  [SocketEvent.USER_OFFLINE]: (payload: UserPresencePayload) => void;
  [SocketEvent.USERS_IN_TOURNAMENT]: (payload: UsersInTournamentPayload) => void;
  [SocketEvent.NOTIFICATION]: (payload: NotificationPayload) => void;
  [SocketEvent.ADMIN_BROADCAST]: (payload: AdminBroadcastPayload) => void;
  [SocketEvent.STANDINGS_UPDATED]: (payload: StandingsUpdatedPayload) => void;
  [SocketEvent.FINALS_APPLIED]: (payload: FinalsAppliedPayload) => void;
  [SocketEvent.QUEUE_UPDATED]: (payload: QueueUpdatedPayload) => void;
}

// Client-to-server events map
export interface ClientToServerEvents {
  [SocketEvent.JOIN_TOURNAMENT]: (payload: JoinTournamentPayload) => void;
  [SocketEvent.LEAVE_TOURNAMENT]: (payload: LeaveTournamentPayload) => void;
}

// Inter-server events (for Redis adapter)
export interface InterServerEvents {
  ping: () => void;
}

// Socket data (attached to each socket)
export interface SocketData {
  userId?: string;
  username?: string;
  role?: string;
  tournaments: Set<string>; // Joined tournament IDs
}
