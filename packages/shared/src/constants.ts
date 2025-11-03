// Shared Constants

export const APP_NAME = 'Tournament Platform';
export const APP_VERSION = '0.1.0';

// Default ports
export const DEFAULT_PORTS = {
  WEB: 3020,
  SYNC_SERVICE: 8020,
  POSTGRES: 5420,
  REDIS: 6420,
} as const;

// Multi-tenant configuration
export const TENANT_HEADER = 'x-tenant-id';
export const TENANT_COOKIE = 'tenant_id';

// WebSocket event types
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  SYNC_REQUEST: 'sync:request',
  SYNC_UPDATE: 'sync:update',
  SYNC_ACK: 'sync:ack',
  ERROR: 'error',
} as const;

// Tournament limits
export const TOURNAMENT_LIMITS = {
  MAX_PLAYERS: 256,
  MAX_TABLES: 50,
  MIN_PLAYERS: 2,
} as const;

// Timing constants
export const TIMING = {
  SMS_DEDUPE_WINDOW_MS: 2 * 60 * 1000, // 2 minutes
  DEFAULT_MATCH_DURATION_MIN: 30,
  SYNC_HEARTBEAT_INTERVAL_MS: 30 * 1000, // 30 seconds
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Validation limits
export const VALIDATION = {
  MAX_NAME_LENGTH: 100,
  MAX_PHONE_LENGTH: 20,
  MAX_EMAIL_LENGTH: 255,
  MIN_PASSWORD_LENGTH: 8,
} as const;
