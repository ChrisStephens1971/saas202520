# Technical Specification: Public API & Webhooks

**Author:** Claude (Technical Architect)
**Date:** 2025-11-06
**Status:** Draft
**Related PRD:** `product/PRDs/public-api-webhooks.md`
**Sprint:** Sprint 10 - Week 3

---

## Overview

### Problem

Currently, tournament data is locked within the platform with no programmatic access. Third-party developers, integration partners, streaming services, and analytics platforms cannot access tournament information, match results, or player statistics. There is no way to receive real-time event notifications, forcing manual data exports and limiting ecosystem growth.

### Solution Summary

Build a RESTful API v1 with 15+ read-only endpoints, API key authentication, Redis-based rate limiting, and a webhook system for real-time event notifications. Include a developer portal for API key management, usage monitoring, and webhook configuration. Provide comprehensive OpenAPI documentation with interactive Swagger UI.

**Key Components:**

- RESTful API endpoints for tournaments, players, matches, leaderboards, and venues
- API key authentication with bcrypt hashing
- Redis-based rate limiting (3 tiers: 100/hr, 1000/hr, 10000/hr)
- Webhook system with Bull queue, retry logic, and signature verification
- Developer portal for self-service key management
- OpenAPI 3.0 specification with Swagger UI
- Multi-tenant data isolation

### Goals

1. **Enable Developer Ecosystem** - Provide comprehensive, reliable API for third-party integrations
2. **High Performance** - API response time <100ms (p95), >99.9% uptime
3. **Reliable Event Delivery** - >99% webhook delivery rate with automatic retries
4. **Developer Adoption** - 50+ active developers within 3 months of launch
5. **Security & Isolation** - Strong authentication, tenant isolation, zero security incidents

### Non-Goals

**Out of Scope for v1:**

- Write endpoints (POST, PUT, DELETE) - Planned for v2
- GraphQL API - Evaluate based on developer feedback
- Native SDKs (JavaScript, Python, PHP) - v1 focuses on REST API
- Sandbox environment with test data - May add in v1.1
- WebSocket real-time streaming - Use webhooks for v1
- Public unauthenticated endpoints - All endpoints require API key in v1

---

## Background & Context

### Current State

The platform currently has:

- Next.js 14+ application with App Router
- PostgreSQL database with multi-tenant architecture (tenant_id on all tables)
- Redis for caching and real-time features
- Existing REST API for internal use (not documented or rate-limited)
- No external API access or developer-facing documentation

**Existing Infrastructure:**

- API routes in `app/api/` (Next.js 14 App Router)
- Authentication via NextAuth.js
- Database queries using Prisma ORM
- Redis connection for caching

### Constraints

**Technical Constraints:**

- Must use Next.js API Routes (no separate API server)
- Must maintain <100ms API response time (p95)
- Redis must handle rate limiting for all API requests
- PostgreSQL must enforce tenant isolation on all queries
- All API endpoints must be HTTPS only

**Business Constraints:**

- Launch in Sprint 10 Week 3 (5 days development time)
- Must be production-ready for private beta (10 developers)
- Cannot disrupt existing platform features
- Must support 100,000+ API calls/month at launch

**Timeline Constraints:**

- Day 1-2: Foundation and core endpoints
- Day 3: Rate limiting and webhook foundation
- Day 4: Developer portal and webhook management
- Day 5: Documentation, testing, and beta launch

### Assumptions

- Developers are comfortable with REST API concepts and JSON
- Most developers will use JavaScript/TypeScript or Python
- Webhook endpoints can receive HTTP POST requests
- Developers can securely store API keys
- Initial usage will be read-heavy (95%+ GET requests)
- Free tier (100 req/hr) is sufficient for most use cases
- Tournament data is considered public within a tenant
- Developers will primarily integrate for mobile apps, streaming, and analytics

---

## Proposed Solution

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Client Applications                       │
│  (Mobile Apps, Streaming Services, Analytics Platforms)      │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ HTTPS (Authorization: Bearer sk_live_...)
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                     Next.js API Gateway                       │
│                   (app/api/v1/[resource])                     │
└───────────────────────────┬──────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼─────────┐  ┌──────▼─────────┐ ┌──────▼──────────┐
│  Auth Middleware│  │ Rate Limiter   │ │ Tenant Scoping  │
│  (API Key)      │  │ (Redis)        │ │ (tenant_id)     │
└───────┬─────────┘  └──────┬─────────┘ └──────┬──────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼─────────┐     ┌──────▼──────────┐
        │  API Services   │     │  Event Publisher│
        │  (Business      │     │  (Webhooks)     │
        │   Logic)        │     │                 │
        └───────┬─────────┘     └──────┬──────────┘
                │                       │
        ┌───────▼───────────────────────▼──────────┐
        │         PostgreSQL Database               │
        │  (Tournaments, Players, API Keys,         │
        │   Webhook Subscriptions, Delivery Logs)   │
        └───────────────────────────────────────────┘
                │
        ┌───────▼───────────────────────────────────┐
        │            Redis Cache & Queue            │
        │  • Rate limit counters                    │
        │  • Webhook delivery queue (Bull)          │
        │  • API response caching                   │
        └───────────────────────────────────────────┘

                      Webhook Delivery Flow:

┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Event     │─────▶│ Redis Queue  │─────▶│   Webhook    │
│  Occurs     │      │   (Bull)     │      │   Worker     │
└─────────────┘      └──────────────┘      └──────┬───────┘
                                                   │
                                            ┌──────▼────────┐
                                            │ HTTP POST to  │
                                            │ Developer URL │
                                            │ (with HMAC)   │
                                            └───────────────┘
```

### Components

#### Component 1: API Routes (Next.js 14 App Router)

**Purpose:** Handle incoming API requests, route to appropriate controllers

**Technology:** Next.js 14 App Router (`app/api/v1/`)

**Structure:**

```
app/api/v1/
├── tournaments/
│   ├── route.ts                    # GET /api/v1/tournaments
│   └── [id]/
│       ├── route.ts                # GET /api/v1/tournaments/:id
│       ├── matches/route.ts        # GET /api/v1/tournaments/:id/matches
│       ├── players/route.ts        # GET /api/v1/tournaments/:id/players
│       └── bracket/route.ts        # GET /api/v1/tournaments/:id/bracket
├── players/
│   ├── route.ts                    # GET /api/v1/players
│   └── [id]/
│       ├── route.ts                # GET /api/v1/players/:id
│       ├── history/route.ts        # GET /api/v1/players/:id/history
│       └── stats/route.ts          # GET /api/v1/players/:id/stats
├── matches/
│   ├── route.ts                    # GET /api/v1/matches
│   └── [id]/route.ts               # GET /api/v1/matches/:id
├── leaderboards/
│   ├── route.ts                    # GET /api/v1/leaderboards
│   ├── venue/[id]/route.ts         # GET /api/v1/leaderboards/venue/:id
│   └── format/[format]/route.ts    # GET /api/v1/leaderboards/format/:format
└── venues/
    ├── route.ts                     # GET /api/v1/venues
    └── [id]/
        ├── route.ts                 # GET /api/v1/venues/:id
        └── tournaments/route.ts     # GET /api/v1/venues/:id/tournaments
```

**Interfaces:**

- Request: HTTP GET with Authorization header
- Response: JSON with data, meta, and error fields
- Middleware: apiKeyAuth, rateLimiter, tenantScoping, errorHandler

#### Component 2: Authentication Middleware

**Purpose:** Validate API keys and attach tenant context to requests

**Technology:** Next.js middleware, bcrypt for key hashing

**File:** `lib/api/middleware/apiKeyAuth.ts`

**Interfaces:**

```typescript
interface ApiKeyAuthResult {
  apiKey: ApiKey;
  tenantId: string;
  tier: 'free' | 'pro' | 'enterprise';
}

async function apiKeyAuth(request: NextRequest): Promise<ApiKeyAuthResult>;
```

**Process:**

1. Extract Authorization header (Bearer token)
2. Hash API key with bcrypt
3. Query database for matching key_hash
4. Verify key is active and not expired
5. Update last_used_at timestamp
6. Return tenant_id and tier for downstream use

#### Component 3: Rate Limiter Service

**Purpose:** Enforce rate limits per API key using Redis

**Technology:** Redis with sliding window algorithm

**File:** `lib/api/services/rateLimiter.ts`

**Interfaces:**

```typescript
interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

async function checkRateLimit(
  apiKeyId: string,
  tier: 'free' | 'pro' | 'enterprise'
): Promise<RateLimitResult>;
```

**Rate Limits:**

- Free: 100 requests/hour
- Pro: 1,000 requests/hour
- Enterprise: 10,000 requests/hour

**Redis Keys:**

- Pattern: `rate_limit:{api_key_id}:{hour}`
- Data: Sorted set with request timestamps
- Expiry: 1 hour (automatic cleanup)

#### Component 4: API Key Service

**Purpose:** Manage API key lifecycle (create, validate, revoke)

**Technology:** bcrypt for hashing, crypto for key generation

**File:** `lib/api/services/apiKeyService.ts`

**Interfaces:**

```typescript
async function generateApiKey(
  tenantId: string,
  userId: string,
  name: string,
  tier: 'free' | 'pro' | 'enterprise'
): Promise<{ key: string; prefix: string }>;

async function validateApiKey(key: string): Promise<ApiKey | null>;

async function revokeApiKey(apiKeyId: string): Promise<void>;
```

**API Key Format:**

- Live: `sk_live_` + 32 random characters
- Test: `sk_test_` + 32 random characters
- Stored: Only bcrypt hash (original key never stored)
- Displayed: Prefix shown, full key only on creation

#### Component 5: Webhook Service

**Purpose:** Manage webhook subscriptions and event publishing

**Technology:** PostgreSQL for subscriptions, Bull queue for delivery

**File:** `lib/api/services/webhookService.ts`

**Interfaces:**

```typescript
interface WebhookSubscription {
  id: string;
  tenantId: string;
  apiKeyId: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
}

async function createWebhook(data: CreateWebhookInput): Promise<WebhookSubscription>;
async function publishEvent(event: WebhookEvent, data: any): Promise<void>;
async function deliverWebhook(webhookId: string, payload: any): Promise<void>;
```

**Event Types:**

```typescript
enum WebhookEvent {
  TOURNAMENT_CREATED = 'tournament.created',
  TOURNAMENT_STARTED = 'tournament.started',
  TOURNAMENT_COMPLETED = 'tournament.completed',
  MATCH_STARTED = 'match.started',
  MATCH_COMPLETED = 'match.completed',
  PLAYER_REGISTERED = 'player.registered',
  PLAYER_CHECKED_IN = 'player.checked_in',
  PLAYER_ELIMINATED = 'player.eliminated',
}
```

#### Component 6: Webhook Delivery Worker

**Purpose:** Process webhook queue and deliver events to developer endpoints

**Technology:** Bull queue with Redis, axios for HTTP requests

**File:** `lib/api/workers/webhookWorker.ts`

**Interfaces:**

```typescript
interface WebhookJob {
  webhookId: string;
  eventId: string;
  eventType: WebhookEvent;
  url: string;
  payload: any;
  signature: string;
  attempt: number;
}

async function processWebhook(job: Job<WebhookJob>): Promise<void>;
```

**Retry Logic:**

- Attempt 1: Immediate
- Attempt 2: +1 minute (if 5xx or timeout)
- Attempt 3: +5 minutes
- Attempt 4: +15 minutes
- Max attempts: 3 retries (4 total attempts)

**Delivery Process:**

1. Fetch webhook subscription from database
2. Verify webhook is active
3. Generate HMAC SHA-256 signature
4. HTTP POST to webhook URL with signature header
5. Log delivery attempt (success/failure, status code, response)
6. Schedule retry if failed (5xx, timeout, network error)
7. Update webhook delivery statistics

#### Component 7: Developer Portal UI

**Purpose:** Self-service interface for API key and webhook management

**Technology:** Next.js 14, React, Tailwind CSS

**Files:**

```
app/(dashboard)/developer/
├── page.tsx                    # Dashboard overview
├── api-keys/page.tsx           # API key management
├── webhooks/page.tsx           # Webhook management
├── usage/page.tsx              # Usage analytics
└── documentation/page.tsx      # Embedded Swagger UI
```

**Features:**

- Create/revoke API keys
- View usage statistics (daily, weekly, monthly)
- Configure webhook endpoints
- Test webhook deliveries
- View delivery logs
- Upgrade tier (free → pro → enterprise)

#### Component 8: OpenAPI Specification & Swagger UI

**Purpose:** Provide interactive API documentation

**Technology:** OpenAPI 3.0, Swagger UI

**Files:**

- `public/api/openapi.yaml` - OpenAPI specification
- `app/(dashboard)/developer/documentation/page.tsx` - Swagger UI integration

**Generated From:** API route handlers with JSDoc comments

---

## Data Model

### New/Modified Tables

#### Table: `api_keys`

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,           -- 'sk_live_abc...' (first 15 chars for display)
  key_hash VARCHAR(255) NOT NULL UNIQUE,     -- bcrypt hash of full key
  tier VARCHAR(20) NOT NULL DEFAULT 'free',  -- 'free', 'pro', 'enterprise'
  rate_limit INTEGER NOT NULL,               -- requests per hour
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,                       -- NULL = never expires
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX idx_api_keys_active ON api_keys(is_active, expires_at);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);

-- Constraints
ALTER TABLE api_keys ADD CONSTRAINT chk_tier
  CHECK (tier IN ('free', 'pro', 'enterprise'));
ALTER TABLE api_keys ADD CONSTRAINT chk_rate_limit
  CHECK (rate_limit > 0 AND rate_limit <= 10000);
```

**Relationships:**

- Foreign key to `organizations(id)` (tenant_id)
- Foreign key to `users(id)` (user_id - creator)

**Notes:**

- `key_hash`: bcrypt hash, never store plaintext key
- `key_prefix`: First 15 chars for display in UI (`sk_live_abc123...`)
- `rate_limit`: Redundant with tier for flexibility (can override per key)
- `expires_at`: Optional expiration date for temporary keys

#### Table: `webhooks`

```sql
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(255) NOT NULL,              -- HMAC secret for signature verification
  events TEXT[] NOT NULL,                    -- Array of event types (e.g., ['tournament.started'])
  is_active BOOLEAN DEFAULT true,
  delivery_success_count INTEGER DEFAULT 0,
  delivery_failure_count INTEGER DEFAULT 0,
  last_delivery_at TIMESTAMP,
  last_error TEXT,                            -- Last error message for debugging
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_api_key ON webhooks(api_key_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

-- Constraints
ALTER TABLE webhooks ADD CONSTRAINT chk_url_https
  CHECK (url LIKE 'https://%');
ALTER TABLE webhooks ADD CONSTRAINT chk_events_not_empty
  CHECK (array_length(events, 1) > 0);
```

**Relationships:**

- Foreign key to `organizations(id)` (tenant_id)
- Foreign key to `api_keys(id)` (api_key_id - associated API key)

**Notes:**

- `url`: Must be HTTPS only
- `secret`: Generated on creation, used for HMAC signature
- `events`: Array of subscribed event types
- `delivery_*_count`: Statistics for monitoring

#### Table: `webhook_deliveries`

```sql
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_id VARCHAR(100) NOT NULL,            -- Unique event ID (evt_abc123...)
  event_type VARCHAR(100) NOT NULL,          -- 'tournament.started', etc.
  url VARCHAR(500) NOT NULL,                 -- Snapshot of URL at delivery time
  payload JSONB NOT NULL,                    -- Full event payload
  signature VARCHAR(255) NOT NULL,           -- HMAC signature sent
  attempt_number INTEGER DEFAULT 1,
  status_code INTEGER,                       -- HTTP response code (200, 500, etc.)
  response_body TEXT,                        -- First 1000 chars of response
  error_message TEXT,                        -- Error if delivery failed
  delivered_at TIMESTAMP,                    -- NULL if failed
  created_at TIMESTAMP DEFAULT NOW()         -- When delivery was queued
);

-- Indexes
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_event ON webhook_deliveries(event_id);
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status_code)
  WHERE status_code >= 500 OR status_code IS NULL;

-- Constraints
ALTER TABLE webhook_deliveries ADD CONSTRAINT chk_attempt_number
  CHECK (attempt_number >= 1 AND attempt_number <= 4);
```

**Relationships:**

- Foreign key to `webhooks(id)` (webhook_id)

**Notes:**

- `event_id`: Unique identifier for idempotency (`evt_` prefix)
- `payload`: Full JSON event data
- `status_code`: NULL if network error or timeout
- Retention: Keep for 30 days, then archive or delete

#### Table: `api_usage`

```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,            -- '/api/v1/tournaments'
  method VARCHAR(10) NOT NULL,               -- 'GET', 'POST', etc.
  status_code INTEGER NOT NULL,              -- 200, 404, 429, etc.
  response_time_ms INTEGER,                  -- Response time in milliseconds
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_usage_key ON api_usage(api_key_id, timestamp DESC);
CREATE INDEX idx_api_usage_tenant ON api_usage(tenant_id, timestamp DESC);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp DESC);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint, timestamp DESC);

-- Partitioning (for high volume)
-- Consider partitioning by timestamp (daily or monthly) for better performance
```

**Relationships:**

- Foreign key to `api_keys(id)` (api_key_id)
- Foreign key to `organizations(id)` (tenant_id)

**Notes:**

- High write volume table
- Consider time-series database or partitioning for scale
- Retention: Keep detailed logs for 90 days, then aggregate
- Used for usage analytics dashboard

### Redis Data Structures

**Rate Limiting:**

```
Key: rate_limit:{api_key_id}:{hour}
Type: Sorted Set (ZSET)
Members: {timestamp}-{random} (e.g., "1699286400000-0.5234")
Score: timestamp (for range queries)
Expiry: 1 hour (automatic cleanup)
```

**Webhook Queue:**

```
Queue: webhook:queue
Type: Bull Queue
Jobs: { webhookId, eventId, eventType, url, payload, signature, attempt }
Priority: All jobs same priority (FIFO)
Delayed Jobs: Retry jobs scheduled with delay
```

**API Response Cache (Optional):**

```
Key: api_cache:{endpoint}:{query_hash}
Type: String (JSON)
Value: Serialized API response
Expiry: 60 seconds (for frequently accessed data)
```

---

## API Design

### Authentication

**Method:** Bearer token authentication

**Header:**

```
Authorization: Bearer YOUR_API_KEY_HERE
```

**Example API Key Format (for reference only, not real keys):**

- Live: `sk_live_` + 32 random characters (example: `sk_live_abc123...xyz789`)
- Test: `sk_test_` + 32 random characters (example: `sk_test_def456...uvw012`)

**Error Responses:**

```json
// 401 Unauthorized - Missing or invalid API key
{
  "error": {
    "code": "unauthorized",
    "message": "Invalid or missing API key"
  }
}

// 401 Unauthorized - Expired API key
{
  "error": {
    "code": "api_key_expired",
    "message": "API key has expired",
    "details": {
      "expired_at": "2025-11-01T00:00:00Z"
    }
  }
}
```

### Rate Limiting

**Headers (all responses):**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699293600
```

**429 Rate Limit Exceeded:**

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "You have exceeded your rate limit of 100 requests per hour",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset": "2025-11-06T14:00:00Z"
    }
  }
}
```

**Response Headers:**

```
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699293600
```

### Standard Response Structure

**Success Response:**

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

**Error Response:**

```json
{
  "error": {
    "code": "resource_not_found",
    "message": "Tournament not found",
    "details": {
      "tournament_id": "abc-123"
    }
  }
}
```

### Endpoint 1: GET /api/v1/tournaments

**Purpose:** List all tournaments with pagination and filtering

**Query Parameters:**

- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Items per page
- `status` (string): Filter by status (upcoming, active, completed)
- `venue_id` (string): Filter by venue
- `format` (string): Filter by format (single_elimination, double_elimination, round_robin)
- `start_date_from` (ISO date): Filter tournaments starting after this date
- `start_date_to` (ISO date): Filter tournaments starting before this date

**Request:**

```http
GET /api/v1/tournaments?page=1&limit=20&status=active
Authorization: Bearer sk_live_...
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Championship Finals 2025",
      "format": "single_elimination",
      "status": "active",
      "start_date": "2025-11-10T18:00:00Z",
      "venue": {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "name": "Main Arena"
      },
      "player_count": 32,
      "current_round": 3,
      "total_rounds": 5,
      "created_at": "2025-11-01T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Missing or invalid API key
- `429 Too Many Requests`: Rate limit exceeded

### Endpoint 2: GET /api/v1/tournaments/:id

**Purpose:** Get detailed tournament information

**Request:**

```http
GET /api/v1/tournaments/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer sk_live_...
```

**Response (200 OK):**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Championship Finals 2025",
    "description": "Annual championship tournament",
    "format": "single_elimination",
    "status": "active",
    "start_date": "2025-11-10T18:00:00Z",
    "end_date": null,
    "venue": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Main Arena",
      "address": "123 Main St, City, State"
    },
    "player_count": 32,
    "max_players": 32,
    "current_round": 3,
    "total_rounds": 5,
    "buy_in": 50.0,
    "prize_pool": 1600.0,
    "organizer": {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "name": "Tournament Organizer Inc."
    },
    "created_at": "2025-11-01T12:00:00Z",
    "updated_at": "2025-11-06T10:30:00Z"
  }
}
```

**Error Responses:**

- `404 Not Found`: Tournament does not exist or not accessible by tenant
- `401 Unauthorized`: Missing or invalid API key

### Endpoint 3: GET /api/v1/tournaments/:id/matches

**Purpose:** Get all matches in a tournament

**Query Parameters:**

- `round` (integer): Filter by round number
- `status` (string): Filter by match status (scheduled, in_progress, completed)

**Request:**

```http
GET /api/v1/tournaments/550e8400-e29b-41d4-a716-446655440000/matches?round=3
Authorization: Bearer sk_live_...
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "tournament_id": "550e8400-e29b-41d4-a716-446655440000",
      "round": 3,
      "match_number": 1,
      "status": "completed",
      "table_number": 5,
      "player1": {
        "id": "990e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "seed": 1
      },
      "player2": {
        "id": "aa0e8400-e29b-41d4-a716-446655440000",
        "name": "Jane Smith",
        "seed": 8
      },
      "winner_id": "990e8400-e29b-41d4-a716-446655440000",
      "score": "7-5",
      "started_at": "2025-11-06T19:00:00Z",
      "completed_at": "2025-11-06T20:15:00Z"
    }
  ],
  "meta": {
    "total": 16
  }
}
```

### Endpoint 4: GET /api/v1/tournaments/:id/bracket

**Purpose:** Get tournament bracket structure with complete match tree

**Request:**

```http
GET /api/v1/tournaments/550e8400-e29b-41d4-a716-446655440000/bracket
Authorization: Bearer sk_live_...
```

**Response (200 OK):**

```json
{
  "data": {
    "tournament_id": "550e8400-e29b-41d4-a716-446655440000",
    "format": "single_elimination",
    "total_rounds": 5,
    "rounds": [
      {
        "round": 1,
        "matches": [
          {
            "id": "880e8400-e29b-41d4-a716-446655440000",
            "match_number": 1,
            "player1": { "id": "...", "name": "John Doe", "seed": 1 },
            "player2": { "id": "...", "name": "Player 2", "seed": 32 },
            "winner_id": "...",
            "status": "completed",
            "score": "7-3"
          }
        ]
      },
      {
        "round": 2,
        "matches": [...]
      }
    ]
  }
}
```

### Endpoint 5: GET /api/v1/players

**Purpose:** List all players with search and pagination

**Query Parameters:**

- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)
- `search` (string): Search by name or nickname
- `venue_id` (string): Filter by primary venue

**Request:**

```http
GET /api/v1/players?search=john&limit=10
Authorization: Bearer sk_live_...
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "nickname": "The Shark",
      "primary_venue": {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "name": "Main Arena"
      },
      "skill_rating": 1850,
      "total_tournaments": 45,
      "total_wins": 120,
      "win_rate": 65.5,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "total_pages": 1
  }
}
```

### Endpoint 6: GET /api/v1/players/:id/stats

**Purpose:** Get aggregated player statistics

**Request:**

```http
GET /api/v1/players/990e8400-e29b-41d4-a716-446655440000/stats
Authorization: Bearer sk_live_...
```

**Response (200 OK):**

```json
{
  "data": {
    "player_id": "990e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "skill_rating": 1850,
    "tournaments": {
      "total": 45,
      "wins": 8,
      "top_3_finishes": 15,
      "win_rate": 17.8
    },
    "matches": {
      "total": 183,
      "wins": 120,
      "losses": 63,
      "win_rate": 65.5
    },
    "by_format": {
      "single_elimination": {
        "tournaments": 30,
        "win_rate": 64.2
      },
      "double_elimination": {
        "tournaments": 15,
        "win_rate": 68.1
      }
    },
    "recent_form": {
      "last_10_matches": {
        "wins": 7,
        "losses": 3
      },
      "last_5_tournaments": [
        { "name": "...", "finish": 1 },
        { "name": "...", "finish": 3 }
      ]
    }
  }
}
```

### Endpoint 7: GET /api/v1/matches/:id

**Purpose:** Get detailed match information

**Request:**

```http
GET /api/v1/matches/880e8400-e29b-41d4-a716-446655440000
Authorization: Bearer sk_live_...
```

**Response (200 OK):**

```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "tournament": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Championship Finals 2025"
    },
    "round": 3,
    "match_number": 1,
    "status": "completed",
    "table_number": 5,
    "player1": {
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "seed": 1
    },
    "player2": {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "name": "Jane Smith",
      "seed": 8
    },
    "winner_id": "990e8400-e29b-41d4-a716-446655440000",
    "score": "7-5",
    "race_to": 7,
    "started_at": "2025-11-06T19:00:00Z",
    "completed_at": "2025-11-06T20:15:00Z",
    "duration_minutes": 75
  }
}
```

### Endpoint 8: GET /api/v1/leaderboards

**Purpose:** Get global player rankings

**Query Parameters:**

- `limit` (integer, default: 100, max: 500): Number of players to return
- `type` (string, default: 'global'): Leaderboard type (global, venue, format)

**Request:**

```http
GET /api/v1/leaderboards?limit=50
Authorization: Bearer sk_live_...
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "rank": 1,
      "player": {
        "id": "990e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe"
      },
      "skill_rating": 1850,
      "total_tournaments": 45,
      "win_rate": 65.5,
      "recent_form": "+120" // Rating change last 30 days
    }
  ],
  "meta": {
    "total": 500,
    "updated_at": "2025-11-06T12:00:00Z"
  }
}
```

### Webhook Payload Structure

**Standard Webhook Payload:**

```json
{
  "id": "evt_abc123def456ghi789",
  "type": "tournament.started",
  "created_at": "2025-11-06T18:00:00Z",
  "data": {
    "tournament": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Championship Finals 2025",
      "format": "single_elimination",
      "status": "active",
      "start_date": "2025-11-10T18:00:00Z",
      "player_count": 32
    }
  }
}
```

**Webhook Headers:**

```http
POST /webhooks/tournaments HTTP/1.1
Host: yourapp.com
Content-Type: application/json
X-Webhook-Signature: sha256=abc123def456...
X-Webhook-Event: tournament.started
X-Webhook-Id: evt_abc123def456ghi789
X-Webhook-Timestamp: 1699293600
User-Agent: TournamentPlatform-Webhooks/1.0
```

**Signature Verification (HMAC SHA-256):**

```typescript
const signature = request.headers['x-webhook-signature'];
const timestamp = request.headers['x-webhook-timestamp'];
const payload = JSON.stringify(request.body);

const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(`${timestamp}.${payload}`)
  .digest('hex');

if (`sha256=${expectedSignature}` !== signature) {
  throw new Error('Invalid webhook signature');
}

// Also check timestamp to prevent replay attacks
const currentTime = Math.floor(Date.now() / 1000);
if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
  throw new Error('Webhook timestamp too old (>5 minutes)');
}
```

---

## Implementation Plan

### Phase 1: Foundation (Day 1-2)

**Goal:** Set up database schema, authentication, and core API infrastructure

**Tasks:**

- [x] Database schema migration (api_keys, webhooks, webhook_deliveries, api_usage)
- [x] API key service (generate, validate, revoke)
- [x] Authentication middleware (Bearer token, bcrypt verification)
- [x] Rate limiting service (Redis sliding window)
- [x] Rate limiter middleware (check limits, set headers)
- [x] Tenant scoping middleware (filter by tenant_id)
- [x] Error handler middleware (standard error responses)
- [x] Request logger middleware (log to api_usage table)

**Estimated Effort:** 1.5 days

**Key Files:**

```
lib/api/
├── middleware/
│   ├── apiKeyAuth.ts
│   ├── rateLimiter.ts
│   ├── tenantScoping.ts
│   ├── errorHandler.ts
│   └── requestLogger.ts
├── services/
│   ├── apiKeyService.ts
│   └── rateLimitService.ts
└── types/
    └── api.ts

prisma/
└── migrations/
    └── 20251106_api_webhooks.sql
```

### Phase 2: API Endpoints (Day 2-3)

**Goal:** Implement all 15 read-only API endpoints

**Tasks:**

- [x] Tournament endpoints (5)
  - GET /api/v1/tournaments
  - GET /api/v1/tournaments/:id
  - GET /api/v1/tournaments/:id/matches
  - GET /api/v1/tournaments/:id/players
  - GET /api/v1/tournaments/:id/bracket
- [x] Player endpoints (4)
  - GET /api/v1/players
  - GET /api/v1/players/:id
  - GET /api/v1/players/:id/history
  - GET /api/v1/players/:id/stats
- [x] Match endpoints (2)
  - GET /api/v1/matches
  - GET /api/v1/matches/:id
- [x] Leaderboard endpoints (3)
  - GET /api/v1/leaderboards
  - GET /api/v1/leaderboards/venue/:id
  - GET /api/v1/leaderboards/format/:format
- [x] Venue endpoints (1)
  - GET /api/v1/venues/:id/tournaments

**Estimated Effort:** 1.5 days

**Key Files:**

```
app/api/v1/
├── tournaments/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       ├── matches/route.ts
│       ├── players/route.ts
│       └── bracket/route.ts
├── players/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       ├── history/route.ts
│       └── stats/route.ts
├── matches/
│   ├── route.ts
│   └── [id]/route.ts
├── leaderboards/
│   ├── route.ts
│   ├── venue/[id]/route.ts
│   └── format/[format]/route.ts
└── venues/
    └── [id]/
        └── tournaments/route.ts
```

### Phase 3: Webhook System (Day 3-4)

**Goal:** Build webhook subscription, event publishing, and delivery system

**Tasks:**

- [x] Webhook service (CRUD operations)
- [x] Signature service (HMAC SHA-256 generation)
- [x] Event publisher (publish events to Redis queue)
- [x] Bull queue setup (webhook:queue)
- [x] Webhook delivery worker (process queue, deliver, retry)
- [x] Retry logic (exponential backoff: 1min, 5min, 15min)
- [x] Delivery logging (status, response, errors)
- [x] Webhook health monitoring (success/failure counts)

**Estimated Effort:** 1 day

**Key Files:**

```
lib/api/
├── services/
│   ├── webhookService.ts
│   └── signatureService.ts
├── workers/
│   └── webhookWorker.ts
└── events/
    └── eventPublisher.ts

lib/queues/
└── webhookQueue.ts
```

### Phase 4: Developer Portal (Day 4)

**Goal:** Build UI for API key management, webhook configuration, and usage analytics

**Tasks:**

- [x] Developer dashboard page (overview, usage stats)
- [x] API key management page (create, list, revoke)
- [x] Webhook management page (add, edit, delete, test)
- [x] Usage analytics page (charts, endpoint breakdown)
- [x] Delivery logs page (webhook delivery history)
- [x] API documentation page (embedded Swagger UI)

**Estimated Effort:** 1 day

**Key Files:**

```
app/(dashboard)/developer/
├── page.tsx                     # Dashboard
├── api-keys/
│   ├── page.tsx                 # List API keys
│   └── create/page.tsx          # Create new key
├── webhooks/
│   ├── page.tsx                 # List webhooks
│   ├── create/page.tsx          # Create webhook
│   └── [id]/
│       ├── edit/page.tsx        # Edit webhook
│       └── logs/page.tsx        # Delivery logs
├── usage/page.tsx               # Usage analytics
└── documentation/page.tsx       # Swagger UI

components/developer/
├── ApiKeyCard.tsx
├── WebhookCard.tsx
├── UsageChart.tsx
└── DeliveryLogTable.tsx
```

### Phase 5: Documentation & Testing (Day 5)

**Goal:** Complete OpenAPI spec, documentation, testing, and private beta launch

**Tasks:**

- [x] OpenAPI 3.0 specification (all endpoints documented)
- [x] Swagger UI integration
- [x] Code examples (JavaScript, Python, curl)
- [x] Getting Started guide
- [x] Authentication guide
- [x] Webhook setup guide
- [x] Unit tests (services, middleware)
- [x] Integration tests (API endpoints, authentication, rate limiting)
- [x] Webhook delivery tests
- [x] Multi-tenant isolation tests
- [x] Load testing (100 concurrent requests)
- [x] Security review (API key storage, signature verification, SQL injection)
- [x] Private beta deployment
- [x] Beta user invitations (10 developers)

**Estimated Effort:** 1 day

**Key Files:**

```
public/api/
└── openapi.yaml

docs/api/
├── getting-started.md
├── authentication.md
├── webhooks.md
├── rate-limiting.md
└── examples/
    ├── javascript.md
    ├── python.md
    └── curl.md

tests/api/
├── unit/
│   ├── apiKeyService.test.ts
│   ├── rateLimitService.test.ts
│   └── webhookService.test.ts
├── integration/
│   ├── tournaments.test.ts
│   ├── players.test.ts
│   ├── authentication.test.ts
│   └── webhooks.test.ts
└── load/
    └── api-load-test.js
```

---

## Testing Strategy

### Unit Tests

**Services (lib/api/services/):**

- `apiKeyService.test.ts`
  - Test API key generation (format, uniqueness)
  - Test key validation (valid, invalid, expired)
  - Test key revocation
  - Test bcrypt hashing
- `rateLimitService.test.ts`
  - Test rate limit checking (within limit, exceeded)
  - Test sliding window algorithm
  - Test Redis key expiry
  - Test tier-based limits (free, pro, enterprise)
- `webhookService.test.ts`
  - Test webhook creation
  - Test event subscription filtering
  - Test signature generation (HMAC SHA-256)
  - Test webhook activation/deactivation

**Middleware (lib/api/middleware/):**

- `apiKeyAuth.test.ts`
  - Test valid API key extraction
  - Test invalid API key rejection
  - Test missing Authorization header
  - Test expired key handling
- `rateLimiter.test.ts`
  - Test rate limit enforcement
  - Test header injection (X-RateLimit-\*)
  - Test 429 response when exceeded
- `tenantScoping.test.ts`
  - Test tenant_id extraction from API key
  - Test cross-tenant access prevention

### Integration Tests

**API Endpoints (tests/api/integration/):**

- `tournaments.test.ts`
  - Test GET /api/v1/tournaments (pagination, filtering)
  - Test GET /api/v1/tournaments/:id (valid, not found)
  - Test tenant isolation (cannot access other tenant's tournaments)
  - Test response format consistency
- `players.test.ts`
  - Test GET /api/v1/players (search, pagination)
  - Test GET /api/v1/players/:id/stats (aggregation accuracy)
- `authentication.test.ts`
  - Test API key authentication flow
  - Test invalid key rejection
  - Test expired key handling
  - Test rate limiting integration
- `webhooks.test.ts`
  - Test webhook delivery (success)
  - Test webhook delivery (failure, retry)
  - Test signature verification
  - Test event filtering (subscribed vs unsubscribed)

**Webhook Flow:**

```typescript
describe('Webhook Delivery', () => {
  it('should deliver webhook with correct signature', async () => {
    // 1. Create webhook subscription
    const webhook = await createWebhook({
      url: 'https://test.example.com/webhook',
      events: ['tournament.started'],
    });

    // 2. Publish event
    await publishEvent('tournament.started', tournamentData);

    // 3. Wait for delivery
    await waitForWebhookDelivery(webhook.id);

    // 4. Verify delivery log
    const log = await getDeliveryLog(webhook.id);
    expect(log.status_code).toBe(200);
    expect(log.signature).toMatch(/^sha256=/);
  });

  it('should retry failed webhook deliveries', async () => {
    // 1. Create webhook with failing endpoint
    const webhook = await createWebhook({
      url: 'https://test.example.com/failing-webhook',
      events: ['tournament.started'],
    });

    // 2. Publish event
    await publishEvent('tournament.started', tournamentData);

    // 3. Wait for initial delivery and retry
    await waitForRetries(webhook.id, 3);

    // 4. Verify retry attempts
    const logs = await getDeliveryLogs(webhook.id);
    expect(logs).toHaveLength(4); // 1 initial + 3 retries
    expect(logs[0].attempt_number).toBe(1);
    expect(logs[3].attempt_number).toBe(4);
  });
});
```

### Performance Tests

**Load Testing (tests/api/load/):**

```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 100, // 100 virtual users
  duration: '60s', // 1 minute
};

export default function () {
  const params = {
    headers: {
      Authorization: 'Bearer sk_live_test_key',
    },
  };

  const res = http.get('https://api.platform.com/api/v1/tournaments', params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
    'rate limit headers present': (r) => r.headers['X-RateLimit-Limit'] !== undefined,
  });
}
```

**Performance Targets:**

- **p50 response time:** <50ms
- **p95 response time:** <100ms
- **p99 response time:** <200ms
- **Throughput:** 1,000 requests/second (per API server)
- **Rate limit check overhead:** <5ms

**Scenarios:**

1. **High read load:** 100 concurrent users fetching tournaments
2. **Pagination stress:** Sequential page requests (1-100)
3. **Rate limit boundary:** Request exactly at rate limit threshold
4. **Webhook burst:** 100 events published simultaneously

### Security Considerations

**Authentication:**

- API keys hashed with bcrypt (cost factor: 10)
- Keys never stored in plaintext
- HTTPS only (TLS 1.2+)
- Bearer token in Authorization header (not query param)

**Authorization:**

- Tenant isolation enforced on all queries (tenant_id filter)
- API key scoped to tenant (cannot access other tenants)
- Cross-tenant access tests in integration suite

**Data Validation:**

- Input validation on all query parameters
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (no HTML in API responses)
- Request size limits (1MB max body)

**Rate Limiting:**

- Redis-based distributed rate limiting
- Prevents brute force attacks
- Protects against DDoS
- Per-key rate limits (not global)

**Webhook Security:**

- HTTPS-only webhook URLs
- HMAC SHA-256 signature verification
- Timestamp check (reject requests >5 minutes old)
- Secret rotation capability

**Monitoring:**

- Failed authentication attempts logged
- Rate limit violations logged
- Webhook delivery failures logged
- Suspicious patterns alerted (e.g., rapid key creation)

---

## Deployment & Operations

### Deployment Strategy

**Environments:**

1. **Development** (local)
   - Local PostgreSQL, Redis
   - Test API keys
   - No rate limiting (for testing)

2. **Staging**
   - Vercel preview deployment
   - Staging database (copy of production schema)
   - Staging Redis
   - Test webhooks with RequestBin

3. **Production**
   - Vercel production deployment
   - Production PostgreSQL (Supabase/Neon)
   - Production Redis (Upstash)
   - Full rate limiting enabled

**Deployment Steps:**

```bash
# 1. Database migration
npm run db:migrate:deploy

# 2. Build Next.js application
npm run build

# 3. Deploy to Vercel
vercel --prod

# 4. Verify API health
curl https://api.platform.com/api/v1/health

# 5. Monitor error rates
# (Check Vercel logs, Sentry errors)
```

**Gradual Rollout:**

- **Day 1 (Private Beta):** 10 invited developers
- **Week 2:** Monitor metrics, fix critical bugs
- **Week 3:** Public beta (all users)
- **Week 4-5:** Expand to 50+ developers
- **Week 6+:** General availability

### Monitoring & Alerts

**Metrics to Track:**

1. **API Performance:**
   - Response time (p50, p95, p99)
   - Requests per second
   - Error rate (4xx, 5xx)
   - Cache hit rate

2. **Rate Limiting:**
   - Requests blocked (429 responses)
   - Rate limit violations by tier
   - Average requests per key

3. **Webhook Delivery:**
   - Delivery success rate
   - Average delivery time
   - Retry rate
   - Queue depth

4. **Resource Usage:**
   - Redis memory usage
   - PostgreSQL connection pool
   - CPU/memory usage (Vercel functions)
   - Database query time

**Alerts (via Vercel, Sentry, or custom):**

```yaml
# High error rate
- name: API Error Rate
  condition: error_rate > 5% for 5 minutes
  severity: high
  action: Page on-call engineer

# Slow response times
- name: API Latency
  condition: p95_latency > 200ms for 10 minutes
  severity: medium
  action: Slack notification

# Webhook queue backlog
- name: Webhook Queue Depth
  condition: queue_depth > 1000 for 15 minutes
  severity: medium
  action: Email team

# Rate limit abuse
- name: Rate Limit Violations
  condition: 429_responses > 100/minute from single key
  severity: low
  action: Log and review

# Webhook delivery failures
- name: Webhook Failure Rate
  condition: webhook_failure_rate > 10% for 30 minutes
  severity: medium
  action: Slack notification
```

**Dashboards:**

- Vercel Analytics (request volume, response times)
- Custom developer portal analytics (usage by tier)
- Webhook delivery dashboard (success rate, retry rate)
- Error tracking (Sentry or similar)

### Rollback Plan

**If Critical Issues Occur:**

1. **API Response Issues:**
   - Revert Vercel deployment to previous stable version
   - Database rollback (if schema issue)
   - Clear Redis cache if stale data

2. **Rate Limiting Issues:**
   - Temporarily disable rate limiting (emergency)
   - Increase rate limits for affected keys
   - Fix and redeploy rate limiter

3. **Webhook Delivery Issues:**
   - Pause webhook queue processing
   - Fix webhook worker
   - Resume queue (deliveries will retry)

4. **Database Issues:**
   - Database migration rollback script
   - Point application to previous schema
   - Re-run migration after fix

**Rollback Commands:**

```bash
# Revert Vercel deployment
vercel rollback

# Database migration rollback
npm run db:migrate:rollback

# Clear Redis cache
redis-cli FLUSHDB

# Pause webhook queue
# (Set WEBHOOK_WORKER_ENABLED=false in env)
```

---

## Dependencies

### External Dependencies

**Core Services:**

- **Vercel** - Hosting and serverless functions
- **PostgreSQL** (Supabase/Neon) - Database
- **Redis** (Upstash) - Rate limiting and webhook queue
- **Next.js 14+** - Application framework

**Libraries:**

- **bcrypt** (v5.1+) - API key hashing
- **bull** (v4.11+) - Background job queue for webhooks
- **ioredis** (v5.3+) - Redis client
- **@prisma/client** (v5.6+) - Database ORM
- **axios** (v1.6+) - HTTP client for webhook delivery
- **zod** (v3.22+) - Request/response validation
- **swagger-ui-react** (v5.10+) - API documentation UI
- **crypto** (Node.js built-in) - HMAC signature generation

**Development Dependencies:**

- **@types/swagger-ui-react** - TypeScript definitions
- **openapi-types** (v12+) - OpenAPI spec types
- **k6** - Load testing
- **jest** - Unit testing
- **@testing-library/react** - Component testing

### Internal Dependencies

**Must Be Completed First:**

- [x] Multi-tenant authentication system (NextAuth.js)
- [x] Organizations/tenants table in database
- [x] Redis connection setup
- [x] Base API route structure

**Related Features:**

- Tournament management system (data source for API)
- Player management system (data source for API)
- Match tracking system (data source for API)
- Leaderboard system (data source for API)

**Database Schema Dependencies:**

- `organizations` table (tenant_id foreign key)
- `users` table (api_key creator reference)
- `tournaments`, `players`, `matches` tables (data endpoints)

---

## Performance & Scale

### Expected Load

**Launch (Month 1):**

- 50 active developers
- 100,000 API calls/month (~3,000/day)
- 25 webhook subscriptions
- 5,000 webhook deliveries/month

**Growth (Month 3-6):**

- 200 active developers
- 1,000,000 API calls/month (~33,000/day)
- 100 webhook subscriptions
- 50,000 webhook deliveries/month

**Scale Target (Year 1):**

- 1,000+ active developers
- 10,000,000 API calls/month (~330,000/day)
- 500 webhook subscriptions
- 500,000 webhook deliveries/month

### Performance Targets

**API Response Times:**

- **p50:** <50ms (50th percentile)
- **p95:** <100ms (95th percentile)
- **p99:** <200ms (99th percentile)

**Webhook Delivery:**

- **Initial delivery:** <2 seconds from event
- **Delivery success rate:** >99%
- **Retry delays:** 1min, 5min, 15min (exponential backoff)

**Database Query Times:**

- Simple queries (tournaments list): <20ms
- Complex queries (bracket generation): <100ms
- Aggregations (player stats): <200ms

**Developer Portal:**

- Page load time: <500ms
- Dashboard charts: <1 second to render

### Scalability Considerations

**Horizontal Scaling:**

- Next.js API routes are stateless (scale via Vercel)
- Redis cluster for distributed rate limiting
- PostgreSQL read replicas for high read load
- Multiple webhook workers (Bull queue supports horizontal scaling)

**Caching Strategy:**

```typescript
// Cache frequently accessed, slowly changing data
const CACHE_TTL = {
  tournaments_list: 60, // 60 seconds
  tournament_detail: 30, // 30 seconds
  leaderboards: 300, // 5 minutes
  player_stats: 120, // 2 minutes
};

// Cache keys
const cacheKey = `api:tournaments:${tenantId}:${queryHash}`;
```

**Database Optimization:**

- Indexes on all foreign keys (tenant_id, tournament_id, player_id)
- Composite indexes for common queries (e.g., `tenant_id + status + start_date`)
- Pagination cursor-based (not offset-based) for large datasets
- Connection pooling (max 100 connections)

**Rate Limiting Scale:**

- Redis Sorted Set (ZSET) for sliding window
- Keys expire automatically (1 hour TTL)
- Distributed across Redis cluster for high throughput
- Can handle 10,000+ checks per second

**Webhook Queue Scale:**

- Bull queue backed by Redis
- Multiple worker processes (4-8 workers)
- Priority queue (if needed in future)
- Dead letter queue for failed deliveries after max retries

**Cost Optimization:**

- Cache popular endpoints (reduce database queries)
- Archive old webhook_deliveries logs (>30 days)
- Aggregate api_usage logs daily (reduce table size)
- Use read replicas for analytics queries

---

## Risks & Mitigations

| Risk                               | Impact                                            | Probability | Mitigation                                                                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API Abuse/DDoS**                 | High - Service outage, cost spike                 | Medium      | - Robust rate limiting (Redis)<br>- API key revocation capability<br>- Cloudflare WAF/CDN protection<br>- Monitor unusual patterns<br>- Automatic IP blocking for repeated abuse                        |
| **Breaking Changes in API**        | High - Breaks developer integrations              | Low         | - API versioning (/v1/, /v2/)<br>- Never remove fields, only add<br>- Deprecation policy (6-month notice)<br>- Maintain backward compatibility<br>- Comprehensive changelog                             |
| **Webhook Delivery Failures**      | Medium - Missed events, frustrated developers     | Medium      | - Retry logic (3 attempts, exponential backoff)<br>- Delivery logs for debugging<br>- Manual retry capability<br>- Email alerts for persistent failures<br>- Webhook health monitoring                  |
| **Security Vulnerabilities**       | High - Data breach, unauthorized access           | Low         | - HTTPS only<br>- API key bcrypt hashing<br>- Webhook signature verification (HMAC)<br>- Tenant isolation enforcement<br>- Regular security audits<br>- Rate limiting prevents brute force              |
| **Low Developer Adoption**         | High - Feature doesn't achieve goals              | Medium      | - Excellent documentation (interactive)<br>- Simple onboarding (one-click API key)<br>- Fast support responses<br>- Showcase integrations<br>- Free tier to reduce barriers<br>- Promote in communities |
| **Performance Degradation**        | Medium - Slow API responses, poor UX              | Medium      | - Database query optimization (indexes)<br>- Response caching (Redis)<br>- Horizontal scaling (stateless)<br>- Load testing before launch<br>- Performance monitoring<br>- p95 <100ms budget            |
| **Webhook Queue Overload**         | Medium - Delayed event delivery                   | Low         | - Bull queue with Redis<br>- Horizontal scaling of workers<br>- Monitor queue depth<br>- Alert for queue backlog<br>- Rate limiting prevents thundering herd                                            |
| **Database Connection Exhaustion** | High - API timeouts, failures                     | Medium      | - Connection pooling (max 100)<br>- Connection timeout limits<br>- Monitor active connections<br>- Auto-scaling read replicas<br>- Query optimization                                                   |
| **API Key Compromise**             | Medium - Unauthorized access                      | Low         | - API key revocation capability<br>- Last used timestamp monitoring<br>- Unusual activity alerts<br>- Key rotation recommendation<br>- Tenant isolation limits damage                                   |
| **Incomplete Documentation**       | Medium - Developer frustration, high support load | High        | - Comprehensive docs before launch<br>- Code examples in 3 languages<br>- Interactive Swagger UI<br>- Beta feedback on docs<br>- FAQ for common issues<br>- Video tutorials                             |

---

## Alternatives Considered

### Alternative 1: GraphQL API Instead of REST

**Pros:**

- Flexible queries (clients request exactly what they need)
- Reduces over-fetching and under-fetching
- Strong typing with GraphQL schema
- Single endpoint (/graphql)

**Cons:**

- More complex to implement and document
- Steeper learning curve for developers
- Harder to cache responses
- Rate limiting more complex (query complexity scoring)
- Webhooks still needed (GraphQL doesn't replace them)

**Why Not Chosen:**

- REST is more familiar to most developers
- Simpler caching strategy
- Easier rate limiting
- Can add GraphQL in v2 if demand exists

### Alternative 2: WebSockets for Real-Time Data Instead of Webhooks

**Pros:**

- True real-time bidirectional communication
- Lower latency for live updates
- No need for webhook endpoint setup

**Cons:**

- Requires persistent connections (higher server cost)
- More complex for developers (connection management)
- Not suitable for all use cases (e.g., mobile apps with battery constraints)
- Harder to scale (stateful connections)

**Why Not Chosen:**

- Webhooks are simpler and more universal
- Lower infrastructure cost (no persistent connections)
- Better for most integration use cases
- Can add WebSocket support in v2 if needed

### Alternative 3: API Gateway (Kong, AWS API Gateway) Instead of Next.js

**Pros:**

- Dedicated API management features
- Built-in rate limiting, authentication, logging
- Plugin ecosystem for extensibility
- Better separation of concerns

**Cons:**

- Additional infrastructure to manage
- Increased complexity
- Higher cost (separate service)
- Longer development time (learning curve)

**Why Not Chosen:**

- Next.js API routes sufficient for v1
- Keep infrastructure simple initially
- Faster time to market
- Can migrate to API gateway later if needed

### Alternative 4: SDK-First Approach (Official SDKs Before REST API)

**Pros:**

- Better developer experience (language-specific)
- Type safety built-in
- Handles authentication, rate limiting, retries automatically

**Cons:**

- Much longer development time (multiple languages)
- SDKs need maintenance across versions
- REST API still needed (SDKs wrap it)
- Delays launch

**Why Not Chosen:**

- REST API is foundation (SDKs can come later)
- Faster to launch with REST only
- Community can build SDKs if desired
- Official SDKs planned for v2

---

## Open Questions

- [x] **API Versioning Strategy:** URL versioning (/v1/) chosen over header versioning
  - **Decision:** Use URL versioning for simplicity and visibility

- [ ] **Write Endpoints Timeline:** When to add POST/PUT/DELETE?
  - **Recommendation:** v1.1 (3 months after launch) after validating read-only demand

- [ ] **Public Tournament Data:** Should public tournaments be accessible without auth?
  - **Trade-off:** Easier for developers vs. more attack surface
  - **Decision:** Keep all endpoints authenticated for v1, revisit in v1.1

- [ ] **Webhook Batch Delivery:** Support batching multiple events into one request?
  - **Trade-off:** Reduces webhook calls but complicates processing
  - **Decision:** Single events only for v1, add batching if requested

- [ ] **GraphQL Alternative:** Is there demand for GraphQL alongside REST?
  - **Action:** Survey beta developers on preference

- [ ] **SDK Priority:** Which languages for official SDKs?
  - **Options:** JavaScript/TypeScript (highest priority), Python, PHP, Ruby, Go
  - **Decision:** Gather developer feedback during beta

- [ ] **Sandbox Environment:** Provide separate sandbox with test data?
  - **Trade-off:** Better DX but more infrastructure
  - **Decision:** Evaluate based on beta feedback

- [ ] **API Pricing Enforcement:** How to handle tier upgrades/downgrades?
  - **Implementation Detail:** Stripe integration for paid tiers (Pro/Enterprise)

- [ ] **Response Caching:** Which endpoints to cache and for how long?
  - **Recommendation:** Cache leaderboards (5min), tournaments list (1min)

- [ ] **API Key Expiry:** Should all keys have expiration dates?
  - **Recommendation:** Optional expiry, recommend 1 year for security

---

## References

### API Design Best Practices

- [REST API Design Best Practices](https://stackoverflow.blog/2020/03/02/best-practices-for-rest-api-design/)
- [OpenAPI Specification 3.0](https://swagger.io/specification/)
- [HMAC Authentication](https://docs.stripe.com/webhooks/signatures)
- [Webhook Best Practices](https://hookdeck.com/webhooks/guides/webhook-best-practices)

### Rate Limiting

- [Rate Limiting Strategies](https://blog.logrocket.com/rate-limiting-node-js/)
- [Redis Rate Limiter](https://redis.io/docs/manual/patterns/rate-limiter/)
- [Sliding Window Algorithm](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/)

### Competitive Analysis

- **Stripe API:** [docs.stripe.com/api](https://docs.stripe.com/api)
- **GitHub API:** [docs.github.com/rest](https://docs.github.com/rest)
- **Twilio API:** [twilio.com/docs/api](https://www.twilio.com/docs/api)
- **SendGrid API:** [docs.sendgrid.com/api-reference](https://docs.sendgrid.com/api-reference)

### Related Documents

- **PRD:** `product/PRDs/public-api-webhooks.md`
- **Sprint Plan:** `sprints/current/sprint-10-business-growth.md`
- **Multi-Tenant Architecture:** `technical/multi-tenant-architecture.md`
- **Security Audit:** `technical/security/api-security-review.md` (to be created post-launch)

---

## Revision History

| Date       | Author                       | Changes                                       |
| ---------- | ---------------------------- | --------------------------------------------- |
| 2025-11-06 | Claude (Technical Architect) | Initial comprehensive technical specification |
