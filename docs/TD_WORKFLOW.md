# Tournament Director Workflow

**Complete workflow for running a pool tournament using the Tournament Platform.**

---

## 📋 Overview

This document describes the step-by-step process a Tournament Director (TD) follows to run a pool tournament event using the platform, from login to final payout calculations.

---

## 🎯 Complete TD Flow

### 1. Authentication & Organization Selection

**URL:** `/login` → `/select-organization` (if multiple orgs)

**Steps:**

1. User navigates to app (redirected to `/login` if not authenticated)
2. Enter credentials (email + password)
3. System authenticates via NextAuth v5
4. If user belongs to multiple organizations:
   - Redirect to `/select-organization`
   - Select active organization
5. If user belongs to single organization:
   - Auto-select organization
   - Proceed to console

**Session State:**

- JWT includes: `userId`, `orgId`, `orgSlug`, `role`
- Middleware injects headers: `x-user-id`, `x-org-id`, `x-org-slug`, `x-user-role`

**API Routes:**

- `POST /api/auth/[...nextauth]` - NextAuth handlers

---

### 2. Tournament Selection/Creation

**URL:** `/tournaments` → `/tournaments/new` OR `/tournaments/[id]`

**Steps:**

1. Navigate to `/tournaments` - List all organization's tournaments
2. Either:
   - **Option A:** Select existing tournament
   - **Option B:** Create new tournament:
     - Click "Create Tournament"
     - Fill form: name, format (SE/DE/RR), sport config, race-to, max players
     - Submit
3. Tournament created/selected
4. Navigate to tournament detail page

**API Routes:**

- `GET /api/tournaments` - List tournaments (filtered by orgId)
- `POST /api/tournaments` - Create tournament (owner/TD only)
- `GET /api/tournaments/[id]` - Get tournament details

**Database Filtering:**

```typescript
// All queries filtered by orgId from headers
const tournaments = await prisma.tournament.findMany({
  where: { orgId }, // Tenant isolation
  // ...
});
```

---

### 3. Table Setup

**URL:** `/tournaments/[id]` (table management section)

**Steps:**

1. Within tournament detail page, navigate to "Tables" section
2. Create tables for venue:
   - Click "Add Table"
   - Enter label (e.g., "Table 1", "Back Corner", "Front Left")
   - Repeat for all physical tables
   - OR use bulk create: "Add Tables 1-8"
3. Tables now available for match assignment

**API Routes:**

- `GET /api/tables?tournamentId=xxx` - List tables for tournament
- `POST /api/tables` - Create single table
- `POST /api/tables` (bulk) - Create multiple tables at once
  - Body: `{ tournamentId, labels: ["Table 1", "Table 2", ...] }`

**Table States:**

- `available` - Ready for assignment
- `in_use` - Currently has active match
- `maintenance` - Temporarily unavailable

---

### 4. Player Registration

**URL:** `/tournaments/[id]` (players section)

**Steps:**

1. Within tournament, navigate to "Players" section
2. Add players via:
   - **Manual Entry:** Click "Add Player", fill name/email/phone, submit
   - **Import CSV:** Upload CSV file with player data
   - **From Database:** Search existing players in org, add to tournament
3. Players checked in:
   - Mark players as "checked-in" when they arrive
   - Assign skill levels/Fargo ratings if needed
4. Players seeded (optional):
   - Auto-seed by rating
   - Or manually assign seeds

**API Routes:**

- `GET /api/players?tournamentId=xxx` - List players for tournament
- `POST /api/players` - Add player to tournament
- `PATCH /api/players/[id]` - Update player (check-in, seed)
- `POST /api/players/bulk` - Bulk import players

**Player States:**

- `registered` - Added to tournament
- `checked-in` - Physically present
- `active` - In active match
- `eliminated` - Out of tournament
- `winner` - Tournament champion

---

### 5. Start Tournament (Generate Brackets)

**URL:** `/tournaments/[id]`

**Steps:**

1. Verify all players checked in
2. Verify tables created
3. Click "Start Tournament"
4. System generates:
   - Brackets (based on format: SE/DE/RR)
   - Initial match assignments
   - Queue of upcoming matches
5. Tournament status changes: `draft` → `active`
6. First round matches created

**API Routes:**

- `POST /api/tournaments/[id]/start` - Start tournament, generate brackets
- `GET /api/tournaments/[id]/matches` - Get all matches

**Match Generation:**

- **Single Elimination:** Standard bracket, losers eliminated
- **Double Elimination:** Winners + Losers brackets
- **Round Robin:** All players play each other

---

### 6. TD Console (Main Interface)

**URL:** `/console/room/[tournamentId]`

**Primary TD Interface - Real-time tournament management**

#### 6.1 Tournament Overview (Top Section)

**Displays:**

- Tournament name, format, status
- Active matches count
- Available tables count
- Total players
- Matches completed
- Matches remaining
- Estimated completion time

**Components:**

- `TournamentOverviewComponent` - Stats cards

#### 6.2 Table Status Grid (Left 2/3)

**Displays:**

- Grid of all tables
- Each table shows:
  - Label (e.g., "Table 1")
  - Status (available / in use / maintenance)
  - Current match (if in use):
    - Player A vs Player B
    - Current score (e.g., "3-2")
    - Match duration
    - Quick actions: Update Score, Complete Match

**Interactions:**

- Click table → Open table details modal
- Click "Update Score" → Score entry dialog
- Click "Complete Match" → Mark match complete, advance winner

**Components:**

- `TableStatusGrid` - Table grid display

#### 6.3 Match Queue (Right 1/3)

**Displays:**

- List of upcoming matches (not yet assigned)
- For each match:
  - Player A vs Player B
  - Match round (e.g., "R16", "QF", "SF", "F")
  - ETA (estimated start time)
  - "Assign to Table" button

**Interactions:**

- Click "Assign to Table" → Select table, assign match
- Drag match to table (if drag-and-drop enabled)
- Click match → Open match details

**Components:**

- `MatchQueue` - Queue display

#### 6.4 Quick Actions (Mobile FAB)

**Floating Action Button (Mobile Only):**

- Quick access to common actions
- Assign next match
- Start match
- Complete match
- Update score

**Components:**

- `QuickActions`, `FloatingActionButton`

**API Routes (Used by TD Console):**

- `GET /api/console/room/[tournamentId]` - Get room view data (tables, matches, queue)
- `POST /api/matches/[id]/assign` - Assign match to table
- `POST /api/matches/[id]/start` - Start match
- `PATCH /api/matches/[id]/score` - Update match score
- `POST /api/matches/[id]/complete` - Complete match

**Real-time Updates:**

- Polling: Every 5 seconds
- Socket.IO: Live updates when enabled
- Last updated timestamp displayed

---

### 7. Match Management

#### 7.1 Assign Match to Table

**Flow:**

1. Match appears in queue
2. TD clicks "Assign to Table"
3. Select available table from dropdown
4. Match assigned, table status → `in_use`
5. Match status: `pending` → `assigned`

**API:** `POST /api/matches/[id]/assign`

**Request:**

```json
{
  "tableId": "table-id-here"
}
```

#### 7.2 Start Match

**Flow:**

1. Players arrive at table
2. TD clicks "Start Match" on table
3. Match status: `assigned` → `active`
4. Match start time recorded
5. Score entry enabled

**API:** `POST /api/matches/[id]/start`

#### 7.3 Update Score

**Flow:**

1. Player wins game
2. TD clicks "Update Score" on table
3. Score entry dialog appears
4. Increment player's score
5. Score updated in real-time
6. Match continues

**API:** `PATCH /api/matches/[id]/score`

**Request:**

```json
{
  "playerAScore": 3,
  "playerBScore": 2
}
```

**Alternative (Increment):**

```
POST /api/matches/[id]/score/increment
{ "player": "A" }  // or "B"
```

#### 7.4 Complete Match

**Flow:**

1. Player reaches race-to score (e.g., 7)
2. TD clicks "Complete Match"
3. System:
   - Records final score
   - Marks match `complete`
   - Records match duration
   - Advances winner to next round
   - Frees table (status → `available`)
   - Generates next match (if needed)
4. Next match appears in queue

**API:** `POST /api/matches/[id]/complete`

**Request:**

```json
{
  "winnerId": "player-id",
  "finalScore": {
    "playerA": 7,
    "playerB": 4
  }
}
```

---

### 8. Chip Format / Live Standings

**URL:** `/tournaments/[id]/chip-format`

**Alternative View (for players and TDs):**

**Displays:**

- Live bracket visualization
- Current standings
- Match queue
- Player stats

**Sub-pages:**

- `/tournaments/[id]/chip-format/queue` - Match queue only
- `/tournaments/[id]/chip-format/standings` - Standings only
- `/tournaments/[id]/chip-format/settings` - Format settings
- `/tournaments/[id]/chip-format/analytics` - Analytics

**API Routes:**

- `GET /api/tournaments/[id]/standings` - Get current standings
- `GET /api/tournaments/[id]/bracket` - Get bracket structure

---

### 9. Tournament Completion & Payouts

**URL:** `/tournaments/[id]/payouts`

**Steps:**

1. All matches completed
2. Navigate to "Payouts" section
3. System calculates:
   - Final standings (1st, 2nd, 3rd, etc.)
   - Prize pool distribution
   - Payout amounts per player
4. Review payout structure
5. Export payout sheet (Excel/PDF)
6. Mark tournament `completed`

**API Routes:**

- `POST /api/tournaments/[id]/complete` - Mark tournament complete
- `GET /api/tournaments/[id]/payouts` - Get calculated payouts
- `POST /api/tournaments/[id]/payouts/calculate` - Recalculate payouts
- `GET /api/tournaments/[id]/payouts/sheet` - Download payout sheet (Excel)

**Payout Calculation:**

- Based on final placement
- Configurable payout structure (e.g., 50/30/20, 60/20/20, etc.)
- Entry fees collected × payout percentages

---

## 🔒 Multi-Tenant Security

**ALL** API routes enforce tenant isolation:

### Middleware (proxy.ts)

**Header Injection:**

```typescript
// Middleware injects these headers for all authenticated requests:
response.headers.set('x-user-id', auth.user.id);
response.headers.set('x-org-id', auth.user.orgId);
response.headers.set('x-org-slug', auth.user.orgSlug);
response.headers.set('x-user-role', auth.user.role);
```

### API Route Pattern

**Every API route:**

```typescript
export async function GET(request: NextRequest) {
  // 1. Authenticate
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // 2. Extract orgId from headers
  const headersList = await headers();
  const orgId = headersList.get('x-org-id');

  if (!orgId) {
    return NextResponse.json({ error: 'NO_ORG_CONTEXT' }, { status: 400 });
  }

  // 3. Filter all queries by orgId
  const tournaments = await prisma.tournament.findMany({
    where: { orgId }, // Tenant isolation enforced
  });

  return NextResponse.json(tournaments);
}
```

### Tenant Context Helper

**Utility function (lib/auth/tenant.ts):**

```typescript
const tenantResult = await extractTenantContext();

if (!tenantResult.success) {
  return tenantResult.response; // 401 or 400 error
}

const { orgId, userId, userRole } = tenantResult.context;
// orgId guaranteed to exist and match session
```

---

## 📊 Data Flow

```
User Authenticates
  ↓
JWT Session Created (includes orgId, role)
  ↓
Middleware Injects Headers (x-org-id, x-user-role)
  ↓
API Routes Extract Headers
  ↓
Prisma Queries Filter by orgId
  ↓
Only Org's Data Returned
```

**Tenant Isolation Guarantees:**

- User can ONLY see data for their selected organization
- User can ONLY modify data for their selected organization
- Cross-tenant data access is impossible at the query level
- Role-based permissions enforced (owner, td, scorekeeper)

---

## 🎮 Role-Based Permissions

**Roles:**

- **owner:** Full access, can create tournaments, manage users
- **td:** Can create tournaments, manage matches, assign tables
- **scorekeeper:** Can update scores, complete matches (read-only on tournaments)
- **streamer:** Read-only access for streaming/broadcasting

**Permission Matrix:**

| Action            | Owner | TD  | Scorekeeper | Streamer |
| ----------------- | ----- | --- | ----------- | -------- |
| Create Tournament | ✅    | ✅  | ❌          | ❌       |
| Start Tournament  | ✅    | ✅  | ❌          | ❌       |
| Create Tables     | ✅    | ✅  | ❌          | ❌       |
| Assign Matches    | ✅    | ✅  | ⚠️          | ❌       |
| Update Scores     | ✅    | ✅  | ✅          | ❌       |
| Complete Matches  | ✅    | ✅  | ✅          | ❌       |
| View Console      | ✅    | ✅  | ✅          | ✅       |
| Manage Users      | ✅    | ❌  | ❌          | ❌       |

---

## 🔄 Real-Time Features

**TD Console supports:**

- **HTTP Polling:** Every 5 seconds (default)
- **Socket.IO (Optional):** Live updates via WebSocket
- **Last Updated Timestamp:** Shows data freshness
- **Live Indicator:** Green pulse when data is live

**Hook:** `useRoomView` (apps/web/hooks/useRoomView.ts)

---

## 📱 Mobile Support

**TD Console is PWA-ready:**

- Responsive design (mobile, tablet, desktop)
- Installable as standalone app
- Offline support (with sync-service, if enabled)
- Touch-optimized controls
- Floating Action Button for quick access

---

## 🎯 Key Components

| Component           | File                                                | Purpose           |
| ------------------- | --------------------------------------------------- | ----------------- |
| TD Console Page     | `apps/web/app/console/room/[tournamentId]/page.tsx` | Main TD interface |
| Tournament Overview | `components/console/TournamentOverview.tsx`         | Stats display     |
| Table Status Grid   | `components/console/TableStatusGrid.tsx`            | Table grid        |
| Match Queue         | `components/console/MatchQueue.tsx`                 | Queue list        |
| Room View Hook      | `hooks/useRoomView.ts`                              | Data fetching     |
| Tenant Helper       | `lib/auth/tenant.ts`                                | Tenant extraction |
| Middleware          | `proxy.ts`                                          | Header injection  |

---

## 🐛 Common Issues

**User can't see tournaments:**

- Check if organization is selected (`/select-organization`)
- Verify user is member of organization
- Check database: `OrganizationMember` table

**Matches not appearing:**

- Ensure tournament is `active` status
- Check if matches were generated (`POST /api/tournaments/[id]/start`)
- Verify table assignment

**Score updates not saving:**

- Check if match is `active` status
- Verify user has `scorekeeper` role or higher
- Check API logs for errors

---

**Last Updated:** 2025-11-15
