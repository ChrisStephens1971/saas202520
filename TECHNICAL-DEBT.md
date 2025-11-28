# Technical Debt - Type Safety Improvements

**Created:** 2025-11-10
**Status:** Active Cleanup
**Build Status:** ✅ Passing (0 TypeScript errors)

## Overview

This document tracks all `as any` type assertions added during the TypeScript error resolution phase (910 → 0 errors). These represent technical debt that should be addressed for better type safety and maintainability.

**Total Instances:** 95+
**Categories:** 7

---

## 🔴 HIGH PRIORITY (Production Code - Type Safety Risks)

### 1. Socket Payload Mismatches

**Impact:** Runtime errors if payload structure changes
**Files:** 2
**Instances:** 2

#### LiveMatchCard.tsx:61

```typescript
tableNumber: (payload as any).tableNumber,
```

**Issue:** `MatchStartedPayload` doesn't define `tableNumber` property
**Fix:** Add `tableNumber?: number` to `MatchStartedPayload` in `lib/socket/events.ts:108-121`

#### LiveMatchCard.tsx:75-84

```typescript
const payloadAny = payload as any;
player1: payloadAny.player1 ? { ... } : match.player1,
player2: payloadAny.player2 ? { ... } : match.player2,
```

**Issue:** `MatchCompletedPayload` uses `winner`/`loser` structure, not `player1`/`player2`
**Options:**

- A) Update component to use `winner`/`loser` from payload
- B) Add adapter function to convert `winner`/`loser` → `player1`/`player2`
- C) Change payload type to include both structures

---

### 2. Prisma Schema Field Mismatches

**Impact:** Runtime errors, incorrect data access
**Files:** 2
**Instances:** 8

#### statistics-calculator.ts

```typescript
Line 66:  const metadata = (match as any).metadata as any;
Line 76:  const format = (match as any).format || 'unknown';
Line 87:  const metadata = (match as any).metadata as any;
Line 92:  const lastPlayedAt = ... ((matches[matches.length - 1] as any).matchDate ...
Line 232: favoriteFormat = (formatCounts[0] as any)?.format || favoriteFormat;
```

**Issues:**

- `metadata` field doesn't exist on MatchHistory model
- `format` field doesn't exist on Match model
- `matchDate` should be `playedAt`

**Fix:** Align Prisma schema with code expectations:

```prisma
model Match {
  // ... existing fields
  metadata  Json?     // Add metadata field
  format    String?   // Add format field
  matchDate DateTime? // Or use consistent naming (playedAt)
}
```

#### player-profile-service.ts

```typescript
Line ???: tournament.startDateTime (should be startedAt)
Line ???: match.metadata (doesn't exist)
Line ???: match.matchDate (should be playedAt)
```

---

### 3. Missing Prisma Models

**Impact:** Runtime errors when accessing non-existent models
**Files:** 3
**Instances:** 7

#### Models Referenced But Not Defined:

- `ChipAward` - Referenced in:
  - `app/api/tournaments/[id]/analytics/chip-progression/route.ts`
  - `app/api/tournaments/[id]/analytics/statistics/route.ts`

- `TournamentPlayer` - Referenced in:
  - `app/api/tournaments/[id]/analytics/statistics/route.ts`

- `ReportDelivery` - Referenced in:
  - `lib/analytics/services/scheduled-reports-service.ts`

**Fix:** Add missing models to `prisma/schema.prisma`:

```prisma
model ChipAward {
  id           String   @id @default(cuid())
  tournamentId String
  playerId     String
  amount       Int
  reason       String
  awardedAt    DateTime @default(now())
  tournament   Tournament @relation(fields: [tournamentId], references: [id])
  player       User       @relation(fields: [playerId], references: [id])
}

model TournamentPlayer {
  id           String   @id @default(cuid())
  tournamentId String
  playerId     String
  seed         Int?
  status       String
  tournament   Tournament @relation(fields: [tournamentId], references: [id])
  player       User       @relation(fields: [playerId], references: [id])
}

model ReportDelivery {
  id        String   @id @default(cuid())
  reportId  String
  channel   String   // email, slack, etc.
  recipient String
  status    String
  sentAt    DateTime @default(now())
}
```

---

### 4. Privacy Settings Type Issues

**Impact:** Loss of type safety for privacy/notification settings
**Files:** 1
**Instances:** 4

#### privacy-service.ts

```typescript
Line 60:  const privacySettings = profile.privacySettings as any;
Line 169: return profile.privacySettings as any;
Line 228: const currentSettings = (profile.privacySettings as any) || {};
Line 237: const currentPreferences = (profile.notificationPreferences as any) || {};
```

**Issue:** Prisma JSON fields lose type information
**Fix:** Create proper TypeScript types and use Prisma's `JsonValue` correctly:

```typescript
// types/privacy.ts
export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showPhone: boolean;
  // ... other settings
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  // ... other preferences
}

// In service:
import { Prisma } from '@prisma/client';

const privacySettings = profile.privacySettings as Prisma.JsonObject as PrivacySettings;
```

---

## 🟡 MEDIUM PRIORITY (Production Code - Can Be Improved)

### 5. Recharts Type Issues

**Impact:** Cosmetic, Recharts works but loses type checking
**Files:** 1
**Instances:** 6

#### AnalyticsCharts.tsx

```typescript
Line 170: data={data as any}  // MatchCompletionChart
Line 174: ((percent as number) * 100)
Line 334: data={data as any}  // FormatDistributionChart
Line 338: ((percent as number) * 100)
Line 433: data={data as any}  // RoleDistributionChart
Line 437: ((percent as number) * 100)
```

**Fix:** Add index signatures to data types:

```typescript
interface MatchStatusData {
  name: string;
  value: number;
  [key: string]: unknown; // Add index signature
}

// Or use Recharts types properly:
import { PieChart, Pie, ResponsiveContainer, Cell, Label } from 'recharts';
import type { LabelRenderProps } from 'recharts';

const renderLabel = (props: LabelRenderProps) => {
  const percent = props.percent; // Now properly typed
  return `${(percent * 100).toFixed(0)}%`;
};
```

---

### 6. Conditional Rendering Type Issues

**Impact:** Low, works at runtime but loses type checking
**Files:** 1
**Instances:** 1

#### AuditLogDetail.tsx:198

```typescript
{(log.userAgent ? (
  <div>...</div>
) : null) as any}
```

**Fix:** Use proper ReactNode typing:

```typescript
{log.userAgent && (
  <div>...</div>
)}

// Or with explicit type:
{(() => {
  if (!log.userAgent) return null;
  return (
    <div>...</div>
  );
})()}
```

---

### 7. Export/API Type Conversions

**Impact:** Medium, could cause data corruption
**Files:** 2
**Instances:** 2

#### ExportButton.tsx:154

```typescript
const rows = data.map((row) => headers.map((header) => row[header])) as any;
```

**Fix:** Properly type the row data:

```typescript
const rows: (string | number)[][] = data.map((row) =>
  headers.map((header) => {
    const value = row[header];
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  })
);
```

#### app/api/v1/matches/[id]/route.ts:128

```typescript
score: g.score as any, // Type assertion: stored as string but GameScore expects object
```

**Fix:** Create adapter function:

```typescript
function parseScore(score: unknown): GameScore {
  if (typeof score === 'string') {
    const [playerA, playerB] = score.split('-').map(Number);
    return { playerA, playerB };
  }
  return score as GameScore;
}

// Usage:
games: match.games.map((g) => ({
  ...g,
  score: parseScore(g.score),
}));
```

---

## 🟢 LOW PRIORITY (Tests, Browser APIs, Acceptable)

### 8. Test Mocks

**Impact:** None (test code only)
**Files:** Multiple test files
**Instances:** 50+

All instances in `__tests__` directories are acceptable:

- `mockSession as any` - Test mocks don't need full type compliance
- `test-utils.ts` - Test utilities using `as any` for mock data

**Action:** No fix needed. Test code type assertions are acceptable.

---

### 9. Browser API Limitations

**Impact:** None (TypeScript limitation for browser APIs)
**Files:** 2
**Instances:** 5

#### sync-manager.ts

```typescript
Line 428: if (!('periodicSync' in (self as any).registration))
Line 451: if (!('periodicSync' in (self as any).registration))
```

#### install-prompt.ts

```typescript
Line 124: (window.navigator as any).standalone === true;
Line 288-289: (window as any).gtag('event', ...)
```

**Reason:** TypeScript doesn't have full typings for:

- `periodicSync` API (experimental)
- `window.navigator.standalone` (iOS Safari specific)
- `window.gtag` (Google Analytics, added dynamically)

**Action:** Keep `as any`. Add comments explaining why:

```typescript
// TypeScript doesn't include experimental Periodic Background Sync API
if (!('periodicSync' in (self as any).registration)) {
  // ...
}
```

---

### 10. Miscellaneous Low-Risk

**Impact:** Low
**Files:** Various
**Instances:** 10 → 0 ✅

#### table-manager.ts:419 ✅ FIXED

```typescript
// BEFORE:
? (table as any).matches.find((m) => m.id === table.currentMatchId)

// AFTER:
const tables: TableWithMatches[] = await prisma.table.findMany({...})
// Now TypeScript knows about the matches property
? table.matches.find((m) => m.id === table.currentMatchId)
```

**Fix Applied:** Created `TableWithMatches` type using `Prisma.TableGetPayload<{...}>` with proper includes

#### bracket-generator.ts:547 ✅ FIXED

```typescript
// BEFORE:
schedulePlayers.push(null as any); // Placeholder for bye

// AFTER:
const schedulePlayers: (PlayerWithRating | null)[] = [...seededPlayers];
if (hasOddPlayers) {
  schedulePlayers.push(null); // Placeholder for bye
}
```

**Fix Applied:** Properly typed array as `(PlayerWithRating | null)[]`

#### tournament-updates.ts:272 ✅ FIXED

```typescript
// BEFORE:
emitToTournament(tournamentId, (SocketEvent as any).BRACKET_ADVANCED, payload);

// AFTER:
emitToTournament(tournamentId, SocketEvent.BRACKET_ADVANCED, payload);
```

**Fix Applied:** Added `BRACKET_ADVANCED = 'bracket:advanced'` to `SocketEvent` enum and created `BracketAdvancedPayload` interface in `events.ts`

---

## Recommended Action Plan

### Phase 1: HIGH Priority (Week 1)

1. **Socket Payloads** - Add missing fields to type definitions
2. **Prisma Models** - Add ChipAward, TournamentPlayer, ReportDelivery models
3. **Schema Fields** - Add metadata, format fields to Match model
4. **Privacy Settings** - Create proper TypeScript interfaces

### Phase 2: MEDIUM Priority (Week 2)

5. **Recharts** - Add index signatures to chart data types
6. **Conditional Rendering** - Fix React type issues
7. **Export/API Conversions** - Add proper adapter functions

### Phase 3: LOW Priority (Week 3)

8. **Test Mocks** - Leave as-is
9. **Browser APIs** - Add explanatory comments
10. **Miscellaneous** - Fix case-by-case

---

## Progress Tracking

**Phase 1 (HIGH):** ✅ 100% complete (5/5 tasks)

- ✅ Fixed missing TOURNAMENT_DELETED socket event type
- ✅ Fixed socket payload type mismatches (MatchStartedPayload, MatchCompletedPayload)
- ✅ Added missing Prisma models (ChipAward, TournamentPlayer, ReportDelivery)
- ✅ Fixed Prisma schema field mismatches (metadata, format, matchDate)
- ✅ Fixed privacy settings type issues in privacy-service.ts

**Phase 2 (MEDIUM):** ✅ 100% complete (3/3 tasks)

- ✅ Fixed Recharts type issues (AnalyticsCharts.tsx)
- ✅ Fixed conditional rendering type issues (AuditLogDetail.tsx)
- ✅ Fixed Export/API type conversions (ExportButton, v1 matches API)

**Phase 3 (LOW):** ✅ 100% complete (3/3 tasks)

- ✅ Fixed table-manager.ts dynamic match lookup (TableWithMatches type)
- ✅ Fixed bracket-generator.ts null placeholder ((PlayerWithRating | null)[])
- ✅ Fixed tournament-updates.ts BRACKET_ADVANCED socket event
- Test mocks: Acceptable in test code (no fix needed)
- Browser APIs: TypeScript limitations documented (no fix needed)

**Last Updated:** 2025-11-11
**Status:** ✅ ALL type safety improvements complete (100% across all phases)
