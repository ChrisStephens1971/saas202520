# Tournament Platform - Architecture

**Project:** Tournament Platform (saas202520)
**Version:** V1 (Online-Only)
**Last Updated:** 2025-11-15

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Core Domains](#core-domains)
- [Multi-Tenant Architecture](#multi-tenant-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Data Model](#data-model)
- [Package Structure](#package-structure)
- [Real-Time Features](#real-time-features)
- [Offline/Sync (V2)](#offlinesync-v2)
- [Deployment Architecture](#deployment-architecture)

---

## Overview

The Tournament Platform is a **multi-tenant SaaS application** designed for managing pool, billiards, and similar competitive events. It enables Tournament Directors to run live events with real-time scoring, table management, and automated bracket generation.

### Key Characteristics

- **Multi-Tenant:** Organization-level data isolation with `orgId` scoping
- **Real-Time:** Socket.IO for live updates to TD console and player views
- **Role-Based Access:** Owner, TD, Scorekeeper, Streamer roles
- **Online-Only (V1):** Offline/sync features designed but deferred to V2
- **Modern Stack:** Next.js 16, React 19, Prisma, PostgreSQL, NextAuth v5

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser/PWA)                     │
│  - Next.js 16 Pages (App Router)                            │
│  - React 19 Components                                       │
│  - Socket.IO Client (real-time)                              │
│  - SWR (data fetching)                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS/WebSocket
┌──────────────────▼──────────────────────────────────────────┐
│                    Next.js Server (apps/web)                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  App Router Pages (/app)                               │ │
│  │  - Server Components                                   │ │
│  │  - Client Components                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Routes (/app/api)                                 │ │
│  │  - RESTful endpoints                                   │ │
│  │  - Tenant isolation middleware                         │ │
│  │  - NextAuth v5 authentication                          │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Socket.IO Server (lib/socket)                         │ │
│  │  - Real-time match updates                             │ │
│  │  - TD console sync                                     │ │
│  │  - Player notifications                                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Prisma ORM (packages/shared)                          │ │
│  │  - Database access layer                               │ │
│  │  - Automatic orgId filtering                           │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│               PostgreSQL Database                            │
│  - Multi-tenant data model                                   │
│  - Application-level isolation (orgId)                       │
│  - Migrations via Prisma Migrate                             │
└──────────────────────────────────────────────────────────────┘
```

### Request Flow

**Authenticated API Request:**

1. Client sends request with session cookie
2. Middleware (`proxy.ts`) extracts JWT and injects headers:
   - `x-user-id`: User's ID
   - `x-org-id`: Organization ID
   - `x-org-slug`: Organization slug
   - `x-user-role`: User's role in org
3. API route reads headers to get tenant context
4. Prisma query filters by `orgId` automatically
5. Response returned (only org's data)

**WebSocket Connection:**

1. Client connects to Socket.IO server
2. Server validates session
3. Client joins org-specific rooms
4. Real-time updates broadcast to room members

---

## Core Domains

### 1. Organization (Multi-Tenant)

**Purpose:** Top-level tenant isolation

**Key Models:**

- `Organization` - Tenant entity (name, slug, settings)
- `OrganizationMember` - User membership with role
- `OrganizationSettings` - Org-specific configuration

**Isolation:**

- All queries filtered by `orgId`
- Users can belong to multiple organizations
- Session stores current active org

### 2. Venue & Tables (Physical Resources)

**Purpose:** Manage physical tournament locations and equipment

**Key Models:**

- `Venue` - Physical location (name, address, capacity)
- `Table` - Physical table (number, status, current match)

**Features:**

- Table availability tracking
- Match assignment to tables
- Table status: `available`, `occupied`, `maintenance`

### 3. Tournament (Event Management)

**Purpose:** Core tournament lifecycle management

**Key Models:**

- `Tournament` - Event entity (name, format, dates, status)
- `TournamentPlayer` - Player registration for tournament
- `TournamentEvent` - Audit log for tournament changes

**Formats:**

- Single Elimination (SE)
- Double Elimination (DE)
- Round Robin (RR)
- Custom/Hybrid

**Lifecycle:**

- `draft` → `registration` → `active` → `completed` → `cancelled`

### 4. Player (Participant Profiles)

**Purpose:** Manage player information and statistics

**Key Models:**

- `Player` - Player profile (name, skill level, Fargo rating)
- `PlayerRating` - Historical rating snapshots
- `PlayerStats` - Aggregated statistics

**Features:**

- Skill level tracking
- Fargo rating integration
- Win/loss records
- Tournament history

### 5. Match (Game State)

**Purpose:** Track individual games and scoring

**Key Models:**

- `Match` - Game entity (players, scores, table, status)
- `MatchScore` - Detailed score tracking
- `MatchHistory` - Move-by-move audit

**Match Flow:**

- `pending` → `assigned` → `in_progress` → `completed`

**Chip Format Support:**

- Race-to-X scoring
- Chip management (add/remove)
- Live standings calculation

### 6. Scorekeeper (Role-Based Access)

**Purpose:** Role-based permissions for tournament operations

**Roles:**

- **Owner:** Full organization control
- **TD (Tournament Director):** Tournament management, match scoring
- **Scorekeeper:** Match scoring only
- **Streamer:** Read-only access for broadcasting

**Permissions:**

- Enforced at API route level
- Checked via `x-user-role` header
- Role hierarchy: Owner > TD > Scorekeeper > Streamer

### 7. Payment (Stripe Integration)

**Purpose:** Handle entry fees and payouts

**Key Models:**

- `Payment` - Payment record (amount, status, Stripe ID)
- `Payout` - Prize distribution
- `PaymentMethod` - Saved payment methods

**Features:**

- Stripe Checkout integration
- Entry fee collection
- Automated payout calculation
- Payment reconciliation

### 8. Notifications (Email, SMS, Push)

**Purpose:** Multi-channel player and staff notifications

**Key Models:**

- `Notification` - Notification record (type, status, recipient)
- `NotificationTemplate` - Reusable templates
- `NotificationPreference` - User preferences

**Channels:**

- Email (via SMTP/Nodemailer)
- SMS (via Twilio)
- Push (Web Push API)
- In-app notifications

### 9. Analytics (Event Tracking)

**Purpose:** Track user behavior and tournament metrics

**Key Models:**

- `AnalyticsEvent` - Event record (type, metadata, timestamp)
- `AnalyticsDashboard` - Custom dashboards

**Tracked Events:**

- Tournament creation/completion
- Match updates
- Player actions
- Payment transactions

---

## Multi-Tenant Architecture

### Isolation Strategy

**Application-Level Isolation:**

- Every tenant-scoped model has `orgId` field
- All Prisma queries **must** include `where: { orgId }`
- No database-level RLS (Row Level Security)
- Simpler for V1, can add RLS in V2 for defense-in-depth

### Session Structure

**JWT Token (NextAuth v5):**

```typescript
{
  id: "user-uuid",
  email: "user@example.com",
  orgId: "org-uuid",          // Active organization
  orgSlug: "phoenix-pool",     // Active org slug
  role: "td"                   // Role in active org
}
```

### Organization Switching

**Flow:**

1. User logs in (may belong to multiple orgs)
2. If multiple orgs: redirect to `/select-organization`
3. User selects org → updates JWT with `orgId` and `role`
4. Redirected to dashboard with org context

### Tenant Context Extraction

**Helper:** `lib/auth/tenant.ts`

```typescript
export async function extractTenantContext() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, response: unauthorized() };
  }

  const headersList = await headers();
  const orgId = headersList.get('x-org-id');

  if (!orgId) {
    return { success: false, response: noOrgContext() };
  }

  return {
    success: true,
    context: { orgId, userId: session.user.id, userRole: ... }
  };
}
```

**Usage in API Routes:**

```typescript
export async function GET(request: NextRequest) {
  const result = await extractTenantContext();
  if (!result.success) return result.response;

  const { orgId, userId } = result.context;

  // All queries automatically filtered by orgId
  const tournaments = await prisma.tournament.findMany({
    where: { orgId }, // REQUIRED: Tenant isolation
  });

  return NextResponse.json(tournaments);
}
```

---

## Authentication & Authorization

### Authentication (NextAuth v5)

**Provider:** Credentials (email/password)
**Session Strategy:** JWT (stateless)
**Config:** `apps/web/auth.ts`

**Auth Flow:**

1. User submits credentials → `signIn('credentials', ...)`
2. Authorize callback validates user + password
3. JWT callback adds org context to token
4. Session callback exposes org data to client

**Protected Routes:**

- Middleware (`proxy.ts`) checks for valid session
- Redirects to `/signin` if unauthenticated
- Public routes: `/`, `/signin`, `/signup`, `/api/auth/*`

### Authorization (Role-Based)

**Roles:**

- `owner` - Full org control
- `td` - Tournament management
- `scorekeeper` - Scoring only
- `streamer` - Read-only

**Enforcement:**

```typescript
const { userRole } = await extractTenantContext();

if (userRole !== 'owner' && userRole !== 'td') {
  return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
}
```

---

## Data Model

### Entity Relationship Diagram (Simplified)

```
┌─────────────┐
│Organization │──┐
└─────────────┘  │
                 │
       ┌─────────┴──────────┬──────────────┬────────────┐
       │                    │              │            │
       ▼                    ▼              ▼            ▼
┌──────────┐         ┌──────────┐   ┌──────────┐ ┌──────────┐
│   User   │─────────│Tournament│   │  Venue   │ │  Table   │
└──────────┘         └──────────┘   └──────────┘ └──────────┘
       │                    │              │            │
       │                    │              │            │
       │             ┌──────┴──────┐       │            │
       │             │             │       │            │
       ▼             ▼             ▼       ▼            ▼
┌──────────┐   ┌──────────┐ ┌──────────┐ ┌────────────────┐
│  Player  │   │  Match   │ │Tournament│ │MatchAssignment │
└──────────┘   └──────────┘ │  Player  │ └────────────────┘
       │             │       └──────────┘
       │             │
       └─────┬───────┘
             │
             ▼
       ┌──────────┐
       │ Payment  │
       └──────────┘
```

### Key Relationships

- `Organization` → `User` (many-to-many via `OrganizationMember`)
- `Organization` → `Tournament` (one-to-many)
- `Organization` → `Venue` (one-to-many)
- `Organization` → `Table` (one-to-many)
- `Tournament` → `Match` (one-to-many)
- `Tournament` → `Player` (many-to-many via `TournamentPlayer`)
- `Match` → `Table` (many-to-one)
- `Match` → `Player` (many-to-many for matchups)

---

## Package Structure

### Turborepo Monorepo

```
tournament-platform/
├── apps/
│   ├── web/                       # Main Next.js app
│   │   ├── app/                   # App Router pages
│   │   │   ├── (auth)/            # Auth pages (signin, signup)
│   │   │   ├── (dashboard)/       # Authenticated pages
│   │   │   ├── api/               # API routes
│   │   │   └── console/           # TD console
│   │   ├── components/            # React components
│   │   ├── lib/                   # Utilities, hooks, services
│   │   ├── auth.ts                # NextAuth config
│   │   └── proxy.ts               # Middleware
│   │
│   └── sync-service/              # WebSocket sync (V2)
│       └── README.md              # Status: Deferred
│
├── packages/
│   ├── tournament-engine/         # Core tournament logic
│   │   ├── bracket-generator/     # SE/DE/RR bracket generation
│   │   ├── match-scheduler/       # Match queue management
│   │   └── standings-calculator/  # Live standings
│   │
│   ├── shared/                    # Shared Prisma client
│   │   ├── prisma-client.ts       # Singleton Prisma instance
│   │   └── types.ts               # Shared TypeScript types
│   │
│   ├── api-contracts/             # API type definitions
│   │   └── types/                 # Request/response types
│   │
│   ├── validation/                # Zod validation schemas
│   │   └── schemas/               # API validation
│   │
│   ├── events/                    # Event system
│   │   └── emitter.ts             # Event bus
│   │
│   └── crdt/                      # CRDT utilities (V2)
│       └── README.md              # Status: Deferred
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── migrations/                # Database migrations
│   └── seed.ts                    # Sample data seeder
│
└── infrastructure/
    ├── bicep/                     # Azure Bicep templates
    ├── terraform/                 # Terraform templates
    └── azure-security-bicep/      # Security baseline
```

### Package Dependencies

```
web → shared, tournament-engine, api-contracts, validation, events
tournament-engine → shared
api-contracts → shared
sync-service → shared, crdt, events (V2)
```

---

## Real-Time Features

### Socket.IO Implementation

**Server:** `apps/web/lib/socket/server.ts`
**Client Hook:** `apps/web/hooks/useSocket.ts`

**Events:**

- `match:update` - Match score/status changed
- `table:update` - Table status changed
- `tournament:update` - Tournament settings changed
- `queue:update` - Match queue changed

**Room Structure:**

```
tournament:{tournamentId}      - All tournament participants
org:{orgId}                    - Organization-wide updates
```

**Example (TD Console):**

```typescript
// Server (when match updated)
io.to(`tournament:${tournamentId}`).emit('match:update', {
  matchId,
  status: 'in_progress',
  scores: { player1: 3, player2: 2 },
});

// Client (TD Console)
const socket = useSocket();
socket.on('match:update', (data) => {
  // Update UI with new match data
  queryClient.invalidateQueries(['matches']);
});
```

### Polling Fallback

For clients without WebSocket support:

- SWR with `refreshInterval: 5000` (5-second polling)
- Falls back automatically if Socket.IO fails
- Configurable: `enablePolling` prop on hooks

---

## Offline/Sync (V2)

**Status:** Designed but deferred to V2

### Planned Architecture

**Components:**

- **Sync Service:** Fastify + WebSocket server (apps/sync-service)
- **CRDT Layer:** Yjs for conflict-free data replication
- **Redis:** Connection state and room management
- **JWT Auth:** Secure WebSocket connections

**Why Deferred:**

- Faster time to market for V1
- Focus on core TD workflow without added complexity
- Requires additional infrastructure (Redis, sync-service deployment)
- Security audit needed before enabling

**Enablement Path:**

1. Set `OFFLINE_SYNC_ENABLED=true` in `.env`
2. Fix sync-service TypeScript errors
3. Deploy sync-service + Redis
4. Update web app to use Yjs providers
5. Test offline scenarios and conflict resolution

See `apps/sync-service/README.md` for complete details.

---

## Deployment Architecture

### V1 Deployment (Current)

**Infrastructure:**

- Azure App Service (Next.js web app)
- Azure Database for PostgreSQL
- Azure Application Insights (monitoring)

**Deployment:**

1. Create resource groups via Bicep/Terraform
2. Deploy web app via Azure Portal/CLI or GitHub Actions
3. Configure environment variables
4. Run database migrations
5. Verify health

**GitHub Actions:**

- `ci.yml` - Lint, build, test on every push/PR
- `e2e-tests.yml` - Playwright E2E tests (optional)

### V2 Deployment (Planned)

**Additional Infrastructure:**

- Azure Container Instances (sync-service)
- Azure Cache for Redis
- Azure Key Vault (secrets)
- Azure Virtual Network (private connectivity)

**Full IaC:**

- Bicep modules for all resources
- Automated deployment pipeline
- Multi-environment support (dev/stg/prd)

See `infrastructure/README.md` for deployment guide.

---

## Performance Considerations

### Database

**Indexes:**

- `Tournament.orgId` (tenant filtering)
- `Match.tournamentId` (match queries)
- `Table.venueId` (table lookups)
- Composite indexes for common query patterns

**Query Optimization:**

- Use `select` to fetch only needed fields
- Implement pagination for large datasets
- Use `include` strategically (avoid N+1)

### Caching

**Client-Side:**

- SWR for API response caching
- React Query (optional upgrade)
- LocalStorage for user preferences

**Server-Side (Future):**

- Redis for session storage
- API response caching
- Computed standings caching

### Real-Time

**Socket.IO Scaling:**

- Redis adapter for multi-instance deployments
- Room-based broadcasting (minimize message volume)
- Connection pooling

---

## Security

### OWASP Top 10 Mitigation

1. **Broken Access Control:** Multi-tenant `orgId` filtering, role checks
2. **Cryptographic Failures:** HTTPS, bcrypt passwords, secure JWT
3. **Injection:** Prisma ORM (parameterized queries)
4. **Insecure Design:** Principle of least privilege, tenant isolation
5. **Security Misconfiguration:** Environment variables, secure headers
6. **Vulnerable Components:** Dependabot, regular updates
7. **Authentication Failures:** NextAuth v5, rate limiting (TODO)
8. **Data Integrity:** Audit logs, transaction integrity
9. **Logging Failures:** Winston logging (TODO), error tracking
10. **SSRF:** Input validation, allow-list for external requests

### Secrets Management

**Development:**

- `.env.local` (gitignored)
- `.env.example` (template with dummy values)

**Production:**

- Azure Key Vault
- GitHub Secrets (for CI/CD)
- Environment variables in App Service

---

## Future Enhancements

**V2 Roadmap:**

- Offline/sync capabilities (Yjs CRDT)
- Mobile apps (React Native)
- Advanced analytics dashboard
- Live streaming integration
- Multi-venue tournaments
- SMS/email campaign management

**Performance:**

- Redis caching layer
- Database read replicas
- CDN for static assets
- Image optimization

**Features:**

- Multi-sport support (beyond pool/billiards)
- Handicap systems
- Team tournaments
- Sponsorship management
- Merchandise integration

---

## Contributing

See main `README.md` for contribution guidelines.

**Architecture Changes:**

- Discuss major changes in issues/PRs
- Update this document when adding new domains
- Maintain backward compatibility where possible

---

**Document Version:** 1.0
**Last Updated:** 2025-11-15
**Maintained By:** Tournament Platform Team
