/**
 * Webhook Event Types
 * Defines all webhook events that can be subscribed to
 *
 * Sprint 10 Week 3 - Public API & Webhooks
 */

/**
 * Webhook event type enumeration
 * Total: 8 event types across tournament, match, and player categories
 */
export enum WebhookEvent {
  // Tournament Events (3)
  TOURNAMENT_CREATED = 'tournament.created',
  TOURNAMENT_STARTED = 'tournament.started',
  TOURNAMENT_COMPLETED = 'tournament.completed',

  // Match Events (2)
  MATCH_STARTED = 'match.started',
  MATCH_COMPLETED = 'match.completed',

  // Player Events (3)
  PLAYER_REGISTERED = 'player.registered',
  PLAYER_CHECKED_IN = 'player.checked_in',
  PLAYER_ELIMINATED = 'player.eliminated',
}

/**
 * Base webhook payload structure
 * All webhook events follow this structure
 */
export interface WebhookPayload<T = any> {
  /** Unique event identifier (evt_...) */
  id: string;
  /** Event type (tournament.created, match.started, etc.) */
  event: WebhookEvent;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Tenant/organization ID */
  tenantId: string;
  /** Event-specific data */
  data: T;
}

/**
 * Tournament Created Event Data
 */
export interface TournamentCreatedData {
  tournamentId: string;
  name: string;
  format: string; // single_elimination, double_elimination, etc.
  status: string;
  startDate?: string;
  maxPlayers?: number;
  venueId?: string;
  venueName?: string;
  createdBy: string;
  createdAt: string;
}

/**
 * Tournament Started Event Data
 */
export interface TournamentStartedData {
  tournamentId: string;
  name: string;
  format: string;
  status: string;
  startedAt: string;
  playerCount: number;
  totalRounds: number;
}

/**
 * Tournament Completed Event Data
 */
export interface TournamentCompletedData {
  tournamentId: string;
  name: string;
  format: string;
  status: string;
  completedAt: string;
  playerCount: number;
  duration: number; // minutes
  winner?: {
    id: string;
    name: string;
  };
  results?: {
    playerId: string;
    playerName: string;
    placement: number;
  }[];
}

/**
 * Match Started Event Data
 */
export interface MatchStartedData {
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  round: number;
  bracket?: string; // winners, losers, null
  playerA: {
    id: string;
    name: string;
    seed?: number;
  };
  playerB: {
    id: string;
    name: string;
    seed?: number;
  };
  tableNumber?: number;
  startedAt: string;
}

/**
 * Match Completed Event Data
 */
export interface MatchCompletedData {
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  round: number;
  bracket?: string;
  playerA: {
    id: string;
    name: string;
    seed?: number;
  };
  playerB: {
    id: string;
    name: string;
    seed?: number;
  };
  winner: {
    id: string;
    name: string;
  };
  score: {
    playerA: number;
    playerB: number;
  };
  duration?: number; // minutes
  completedAt: string;
}

/**
 * Player Registered Event Data
 */
export interface PlayerRegisteredData {
  playerId: string;
  playerName: string;
  playerEmail?: string;
  tournamentId: string;
  tournamentName: string;
  registeredAt: string;
  seed?: number;
  rating?: {
    system: string;
    value: number | string;
  };
}

/**
 * Player Checked In Event Data
 */
export interface PlayerCheckedInData {
  playerId: string;
  playerName: string;
  tournamentId: string;
  tournamentName: string;
  checkedInAt: string;
  totalCheckedIn: number;
  totalRegistered: number;
}

/**
 * Player Eliminated Event Data
 */
export interface PlayerEliminatedData {
  playerId: string;
  playerName: string;
  tournamentId: string;
  tournamentName: string;
  eliminatedAt: string;
  placement: number;
  totalMatches: number;
  wins: number;
  losses: number;
}

/**
 * Type-safe webhook payload creators
 */
export type WebhookEventData =
  | TournamentCreatedData
  | TournamentStartedData
  | TournamentCompletedData
  | MatchStartedData
  | MatchCompletedData
  | PlayerRegisteredData
  | PlayerCheckedInData
  | PlayerEliminatedData;

/**
 * Webhook subscription configuration
 */
export interface WebhookSubscription {
  id: string;
  tenantId: string;
  apiKeyId: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  deliverySuccessCount: number;
  deliveryFailureCount: number;
  lastDeliveryAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Webhook delivery attempt
 */
export interface WebhookDeliveryAttempt {
  id: string;
  webhookId: string;
  eventId: string;
  eventType: WebhookEvent;
  url: string;
  payload: WebhookPayload;
  signature: string;
  attemptNumber: number;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  deliveredAt?: Date;
  createdAt: Date;
}

/**
 * Webhook job data for Bull queue
 */
export interface WebhookJobData {
  webhookId: string;
  deliveryId: string;
  event: WebhookEvent;
  payload: WebhookPayload;
}

/**
 * Helper function to validate webhook event type
 */
export function isValidWebhookEvent(event: string): event is WebhookEvent {
  return Object.values(WebhookEvent).includes(event as WebhookEvent);
}

/**
 * Helper function to get event category
 */
export function getEventCategory(event: WebhookEvent): 'tournament' | 'match' | 'player' {
  if (event.startsWith('tournament.')) return 'tournament';
  if (event.startsWith('match.')) return 'match';
  if (event.startsWith('player.')) return 'player';
  throw new Error(`Unknown event category for ${event}`);
}
