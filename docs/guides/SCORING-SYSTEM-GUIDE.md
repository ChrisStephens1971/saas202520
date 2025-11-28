# Scoring System Implementation Guide

**Sprint:** Sprint 3 (Scoring & Payments)
**Status:** ✅ Complete and Production Ready
**Created:** November 5, 2025

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Endpoints](#api-endpoints)
3. [Validation System](#validation-system)
4. [Audit Trail](#audit-trail)
5. [Concurrency Control](#concurrency-control)
6. [Role-Based Access](#role-based-access)
7. [Testing](#testing)
8. [Integration Examples](#integration-examples)

---

## Architecture Overview

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Mobile)                   │
│                  Scoring Card Component                       │
│              [Score A] [Score B] [Undo] [History]           │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP/JSON
┌────────────────▼────────────────────────────────────────────┐
│              Next.js API Routes (Auth + Validation)          │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │  /increment  │  /undo       │  /history                │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└────────────────┬────────────────────────────────────────────┘
                 │ Prisma ORM
┌────────────────▼────────────────────────────────────────────┐
│            PostgreSQL Database (Multi-Tenant)               │
│  ┌─────────────┬──────────────┬──────────────────────────┐ │
│  │ ScoreUpdate │ TournamentEvent │ Match (with rev)     │ │
│  │ (Immutable) │ (Append-only)   │ (Optimistic Lock)    │ │
│  └─────────────┴──────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Shared Libraries:
┌─────────────────────────────────────────────────────────────┐
│  /packages/shared                                           │
│  ├── scoring-validation.ts  (Race-to, illegal score guards)│
│  └── types/scoring.ts       (TypeScript definitions)       │
└─────────────────────────────────────────────────────────────┘

Backend Libraries:
┌─────────────────────────────────────────────────────────────┐
│  /apps/web/lib                                              │
│  ├── permissions.ts         (Role-based access control)   │
│  └── prisma.ts              (Database client)             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Score Increment

```
1. User taps "Score A" button on mobile
         ↓
2. Frontend: validateClientSide(score)
         ↓
3. POST /api/matches/[id]/score/increment
   {
     player: "A",
     device: "device-uuid",
     rev: 5  ← Optimistic lock
   }
         ↓
4. Server: getServerSession() ← Auth check
         ↓
5. Server: canScoreMatches(userId, orgId) ← Permission check
         ↓
6. Server: Fetch match + verify rev === requestRev
         ↓
7. Server: validateScoreIncrement() ← Racing logic
         ↓
8. Server: Database transaction:
   ├─ Update match (score, state, rev++)
   ├─ Create ScoreUpdate record
   └─ Create TournamentEvent record
         ↓
9. Return response with:
   ├─ New match state
   ├─ Score update details
   ├─ Validation warnings (hill-hill)
   └─ New rev number
         ↓
10. Frontend: Update UI with new score
         ↓
11. If hill-hill: Show confirmation modal
```

---

## API Endpoints

### Score Increment

```
POST /api/matches/[id]/score/increment
```

**Request:**

```json
{
  "player": "A" | "B",
  "device": "string (UUID)",
  "rev": "number (current match revision)"
}
```

**Response (200):**

```json
{
  "match": {
    "id": "string",
    "score": {
      "playerA": 8,
      "playerB": 5,
      "raceTo": 9,
      "games": [
        {
          "gameNumber": 1,
          "winner": "playerA" | "playerB",
          "score": { "playerA": 1, "playerB": 0 },
          "timestamp": "ISO 8601"
        }
      ]
    },
    "state": "active" | "completed",
    "winnerId": "string | null",
    "rev": 6
  },
  "scoreUpdate": {
    "id": "string",
    "action": "increment_a" | "increment_b",
    "previousScore": {...},
    "newScore": {...},
    "timestamp": "ISO 8601",
    "undone": false
  },
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": ["string"]
  }
}
```

**Errors:**

- `400 Bad Request`: Validation failed, missing fields
- `401 Unauthorized`: No session
- `403 Forbidden`: User doesn't have scorekeeper role
- `404 Not Found`: Match not found
- `409 Conflict`: Optimistic lock collision (rev mismatch)

---

### Score Undo

```
POST /api/matches/[id]/score/undo
```

**Request:**

```json
{
  "device": "string (UUID)",
  "rev": "number (current match revision)"
}
```

**Response (200):**

```json
{
  "match": {
    "id": "string",
    "score": {...},
    "state": "active",
    "rev": 7
  },
  "undoneUpdates": [
    {
      "id": "string",
      "action": "increment_a" | "increment_b",
      "timestamp": "ISO 8601"
    }
  ],
  "canUndo": true
}
```

**Notes:**

- Only undoes last action
- Marks original as `undone: true` (preserves audit trail)
- Creates new "undo" action record
- Limited to last 3 undoable actions (configurable)

---

### Score History

```
GET /api/matches/[id]/score/history?limit=50
```

**Response (200):**

```json
{
  "updates": [
    {
      "id": "string",
      "matchId": "string",
      "tournamentId": "string",
      "actor": "userId",
      "device": "device-uuid",
      "action": "increment_a" | "increment_b" | "undo",
      "previousScore": {...},
      "newScore": {...},
      "timestamp": "ISO 8601",
      "undone": false | true
    }
  ],
  "total": 15,
  "canUndo": true
}
```

---

## Validation System

### SCORE-002: Race-To Validation

Enforces race-to rules for match completion:

```typescript
import { validateScoreIncrement } from '@repo/shared/lib/scoring-validation';

const currentScore = { playerA: 8, playerB: 7, raceTo: 9 };
const result = validateScoreIncrement(currentScore, 'A', {
  raceTo: 9,
  allowHillHill: true,
  requireConfirmation: true
});

// Result for (8,7) -> (9,7):
{
  valid: true,
  errors: [],
  warnings: ["Match complete: Player A wins 9-7"]
}

// Result for (9,5) -> (10,5):
{
  valid: false,
  errors: ["Player A score cannot exceed race-to 9"],
  warnings: []
}
```

### SCORE-003: Illegal Score Guards

Prevents impossible score combinations:

```typescript
import { validateScoreIntegrity } from '@repo/shared/lib/scoring-validation';

// Rejects both players at race-to
validateScoreIntegrity({ playerA: 9, playerB: 9, raceTo: 9 })
→ { valid: false, errors: ["Both players cannot reach race-to simultaneously"] }

// Rejects negative scores
validateScoreIntegrity({ playerA: -1, playerB: 5, raceTo: 9 })
→ { valid: false, errors: ["Scores cannot be negative"] }

// Warns on suspicious score differences
validateScoreIntegrity({ playerA: 7, playerB: 0, raceTo: 9 })
→ { valid: true, warnings: ["Large score difference (7). Please verify."] }
```

### SCORE-004: Hill-Hill Detection

Detects when both players are one game away from winning:

```typescript
import { isHillHill, isMatchComplete, getMatchWinner } from '@repo/shared/lib/scoring-validation';

const score = { playerA: 8, playerB: 8, raceTo: 9 };

isHillHill(score, 9)
→ true  // Both players are 8-8 (one game away from 9)

isMatchComplete(score, 9)
→ false  // Neither at race-to yet

// After one more point:
const nextScore = { playerA: 9, playerB: 8, raceTo: 9 };
isMatchComplete(nextScore, 9)
→ true

getMatchWinner(nextScore, 9)
→ 'A'  // Player A wins
```

---

## Audit Trail

### Event-Sourcing Pattern

Every score change is recorded as an immutable event:

```sql
-- ScoreUpdate table (immutable, append-only)
INSERT INTO score_updates (
  id, matchId, tournamentId, actor, device, action,
  previousScore, newScore, timestamp, undone
) VALUES (
  'su-123', 'match-123', 'tournament-123', 'user-456', 'device-id',
  'increment_a',
  '{"playerA":7,"playerB":5,"raceTo":9}',
  '{"playerA":8,"playerB":5,"raceTo":9}',
  '2025-11-05T14:30:00Z',
  false
);

-- When undoing, don't delete - just mark undone and create undo record
UPDATE score_updates SET undone = true WHERE id = 'su-123';

INSERT INTO score_updates (
  id, matchId, tournamentId, actor, device, action,
  previousScore, newScore, timestamp, undone
) VALUES (
  'su-124', 'match-123', 'tournament-123', 'user-456', 'device-id',
  'undo',
  '{"playerA":8,"playerB":5,"raceTo":9}',
  '{"playerA":7,"playerB":5,"raceTo":9}',
  '2025-11-05T14:31:00Z',
  false
);
```

### Query Complete History

```sql
-- Get all score changes for a match (in reverse chronological order)
SELECT *
FROM score_updates
WHERE matchId = 'match-123'
ORDER BY timestamp DESC
LIMIT 50;

-- See what was undone
SELECT *
FROM score_updates
WHERE matchId = 'match-123' AND undone = true;

-- Reconstruct final score
SELECT previousScore, newScore
FROM score_updates
WHERE matchId = 'match-123'
ORDER BY timestamp DESC
LIMIT 1;
```

---

## Concurrency Control

### Optimistic Locking

Multiple scorekeepers on different devices won't create conflicts:

```
Device A:                       Device B:
GET /matches/123
  → { rev: 5, score: 7-5 }

                                GET /matches/123
                                  → { rev: 5, score: 7-5 }

POST /score/increment
{ player: 'A', rev: 5 }
  → Server checks rev=5✓
  → Updates match
  → Returns { rev: 6, score: 8-5 }

                                POST /score/increment
                                { player: 'B', rev: 5 }
                                  → Server checks rev=5✗
                                  → Collision! Return 409
                                  → currentRev: 6

                                GET /matches/123 (refresh)
                                  → { rev: 6, score: 8-5 }

                                POST /score/increment
                                { player: 'B', rev: 6 }
                                  → Server checks rev=6✓
                                  → Updates match
                                  → Returns { rev: 7, score: 8-6 }
```

### Implementation

```typescript
// Server-side check
const match = await prisma.match.findUnique({ where: { id } });

if (match.rev !== requestRev) {
  return NextResponse.json(
    {
      error: 'Match was updated by another user. Please refresh.',
      currentRev: match.rev,
    },
    { status: 409 }
  );
}

// Update increments version
await prisma.match.update({
  where: { id },
  data: {
    score: newScore,
    rev: { increment: 1 }, // ← Atomic increment
  },
});
```

---

## Role-Based Access

### Scoring Permissions

```typescript
import { canScoreMatches, getUserRole } from '@/lib/permissions';

// Check if user can score
const canScore = await canScoreMatches(userId, orgId);
// ✅ true for: owner, td, scorekeeper
// ❌ false for: streamer, unauthorized

// Get user's specific role
const role = await getUserRole(userId, orgId);
// Returns: 'owner' | 'td' | 'scorekeeper' | 'streamer' | null

// In API endpoint
if (!canScore) {
  return NextResponse.json(
    { error: 'Unauthorized: You must be a scorekeeper, TD, or owner' },
    { status: 403 }
  );
}
```

### Scorekeeper Management

```bash
# List scorekeepers (requires owner/td)
GET /api/organizations/org-123/scorekeepers
→ { scorekeepers: [...] }

# Assign scorekeeper role (requires owner/td)
POST /api/organizations/org-123/scorekeepers
{
  "userId": "user-456"
}

# Remove scorekeeper role (requires owner/td)
DELETE /api/organizations/org-123/scorekeepers?userId=user-456
```

---

## Testing

### Unit Tests

Located in `/packages/shared/src/lib/scoring-validation.test.ts`

```typescript
describe('Scoring Validation', () => {
  it('should allow valid score increment', () => {
    const result = validateScoreIncrement({ playerA: 5, playerB: 3, raceTo: 9 }, 'A', {
      raceTo: 9,
      allowHillHill: true,
      requireConfirmation: true,
    });
    expect(result.valid).toBe(true);
  });

  it('should prevent score exceeding race-to', () => {
    const result = validateScoreIncrement({ playerA: 9, playerB: 7, raceTo: 9 }, 'A', {
      raceTo: 9,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Player A score cannot exceed race-to 9');
  });

  it('should detect hill-hill (8-8 in race-to-9)', () => {
    const result = validateScoreIncrement({ playerA: 8, playerB: 7, raceTo: 9 }, 'B', {
      raceTo: 9,
      requireConfirmation: true,
    });
    expect(result.warnings).toContain('Hill-hill situation...');
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run only scoring tests
pnpm test scoring-validation

# Watch mode
pnpm test --watch

# Coverage
pnpm test --coverage
```

---

## Integration Examples

### React Scoring Card Component

```typescript
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

export function ScoringCard({ match }) {
  const [isHillHillVisible, setIsHillHillVisible] = useState(false);

  const { mutate: incrementScore, isPending } = useMutation({
    mutationFn: async (player: 'A' | 'B') => {
      const res = await fetch(
        `/api/matches/${match.id}/score/increment`,
        {
          method: 'POST',
          body: JSON.stringify({
            player,
            device: getDeviceId(),
            rev: match.rev
          })
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Update match state
      updateMatchState(data.match);

      // Check for hill-hill warning
      if (data.validation.warnings.some(w => w.includes('Hill-hill'))) {
        setIsHillHillVisible(true);
      }
    },
    onError: (error) => {
      if (error.status === 409) {
        // Refresh match and retry
        const fresh = await getMatch(match.id);
        incrementScore(player); // Will use fresh rev
      } else {
        showErrorAlert(error.message);
      }
    }
  });

  const { mutate: undoScore } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/matches/${match.id}/score/undo`, {
        method: 'POST',
        body: JSON.stringify({
          device: getDeviceId(),
          rev: match.rev
        })
      });

      if (!res.ok) throw new Error('Failed to undo');
      return res.json();
    },
    onSuccess: (data) => {
      updateMatchState(data.match);
    }
  });

  return (
    <div className="scoring-card">
      <div className="score-display">
        <div className="player-score">
          <h2>Player A</h2>
          <div className="score">{match.score.playerA}</div>
          <button
            onClick={() => incrementScore('A')}
            disabled={isPending}
            className="score-button"
          >
            + Score
          </button>
        </div>

        <div className="race-to">
          Race to {match.score.raceTo}
        </div>

        <div className="player-score">
          <h2>Player B</h2>
          <div className="score">{match.score.playerB}</div>
          <button
            onClick={() => incrementScore('B')}
            disabled={isPending}
            className="score-button"
          >
            + Score
          </button>
        </div>
      </div>

      <button
        onClick={() => undoScore()}
        disabled={!match.canUndo}
        className="undo-button"
      >
        ↶ Undo
      </button>

      {isHillHillVisible && (
        <HillHillModal
          onConfirm={() => setIsHillHillVisible(false)}
        />
      )}
    </div>
  );
}
```

### Error Handling Wrapper

```typescript
async function scoreWithRetry(matchId: string, player: 'A' | 'B', maxRetries = 3) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // Get current match state
      const match = await getMatch(matchId);

      // Attempt score increment
      const response = await fetch(`/api/matches/${matchId}/score/increment`, {
        method: 'POST',
        body: JSON.stringify({
          player,
          device: getDeviceId(),
          rev: match.rev,
        }),
      });

      if (response.status === 409) {
        // Optimistic lock collision - retry with fresh rev
        retries++;
        console.log(`Conflict detected, retrying (${retries}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, 100 * retries)); // Backoff
        continue;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      return response.json();
    } catch (error) {
      if (retries >= maxRetries - 1) {
        throw error;
      }
      retries++;
    }
  }

  throw new Error(`Failed to score after ${maxRetries} retries`);
}
```

### Permission Checking

```typescript
// In API endpoint
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: { tournament: true },
  });

  // Check permission
  const hasPermission = await canScoreMatches(session.user.id, match.tournament.orgId);

  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Unauthorized: You must be a scorekeeper, TD, or owner' },
      { status: 403 }
    );
  }

  // Continue with score logic...
}
```

---

## Monitoring & Debugging

### Check Score History

```bash
# Via API
curl http://localhost:3000/api/matches/match-123/score/history

# Via database
psql "postgresql://..." -c "
  SELECT action, actor, timestamp, undone, previousScore, newScore
  FROM score_updates
  WHERE matchId = 'match-123'
  ORDER BY timestamp DESC;"
```

### Audit Trail for Disputes

```bash
# Get all tournament events
curl http://localhost:3000/api/matches/match-123/score/history?limit=100 | jq '.updates | map({action, actor, timestamp})'

# Calculate actual match winner from events
# (Trace through history to see final state)
```

### Performance Profiling

```typescript
// Measure score increment time
const start = performance.now();
await incrementScore('A');
const duration = performance.now() - start;
console.log(`Score increment took ${duration}ms`);
// Expected: 40-60ms
```

---

## Deployment Checklist

- ✅ Database migrations applied (ScoreUpdate, TournamentEvent models)
- ✅ Prisma schema updated with rev field on Match
- ✅ Scoring validation tests passing
- ✅ API endpoints returning proper error codes
- ✅ Permission checks enforced
- ✅ Multi-tenant isolation verified (orgId scoping)
- ✅ Optimistic locking working correctly
- ✅ Audit trail recording all events
- ✅ Frontend components integrated
- ✅ TypeScript types available to frontend

---

## Quick Links

- **API Quick Reference:** `docs/quick-reference/SCORING-API-ENDPOINTS.md`
- **Full Implementation:** `SPRINT-3-SCORING-IMPLEMENTATION-SUMMARY.md`
- **Type Definitions:** `/packages/shared/src/types/scoring.ts`
- **Validation Logic:** `/packages/shared/src/lib/scoring-validation.ts`
- **Permission System:** `/apps/web/lib/permissions.ts`

---

**Status:** ✅ Production Ready
**Last Updated:** November 5, 2025
**Maintainer:** Claude Code Team
