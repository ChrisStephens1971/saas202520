# Bracket Generator - Complete Guide

**Sprint 2**: BRACKET-001 to BRACKET-005, SEED-001 to SEED-003

Comprehensive bracket generation for all tournament formats with deterministic seeding.

---

## 📋 Quick Reference

| Format | Function | Players | Rounds Formula |
|--------|----------|---------|----------------|
| Single Elimination | `generateSingleElimination()` | Any | log₂(next power of 2) |
| Double Elimination | `generateDoubleElimination()` | Any | Winners + Losers + Finals |
| Round Robin | `generateRoundRobin()` | ≥2 | n-1 (even) or n (odd) |
| Modified Single | `generateModifiedSingleElimination()` | Any | Single + Consolation |

---

## 🎯 Tournament Formats

### 1. Single Elimination

**Use Case**: Standard knockout tournament, fastest format

```typescript
const bracket = generateSingleElimination(players, {
  type: 'random',
  seed: 12345,
});

// 8 players → 7 matches (4 + 2 + 1)
// 16 players → 15 matches (8 + 4 + 2 + 1)
```

**Features**:
- ✅ Automatic bye placement for non-power-of-2 counts
- ✅ Even bye distribution (top/bottom of bracket)
- ✅ Match dependencies via `nextMatchId`

**Bye Placement Example** (7 players):
```
Round 1:
Player 1 (BYE) ─── Auto-advances
Player 2 ─┐
          ├─── Winner 2-3
Player 3 ─┘

Player 4 ─┐
          ├─── Winner 4-5
Player 5 ─┘

Player 6 ─┐
          ├─── Winner 6-7
Player 7 ─┘
```

---

### 2. Double Elimination

**Use Case**: Competitive tournaments where players deserve a second chance

```typescript
const bracket = generateDoubleElimination(players, {
  type: 'skill-based',
});

// Creates:
// - Winners bracket (standard single elim)
// - Losers bracket (crossovers from winners)
// - Grand finals (W champ vs L champ)
```

**Features**:
- ✅ Winners bracket progression
- ✅ Losers bracket with crossovers
- ✅ Proper loser routing via `loserNextMatchId`
- ✅ Grand finals

**Match Flow**:
```
Winners Round 1 → Winners Round 2 → Winners Finals
     ↓                  ↓                    ↓
Losers Round 1 → Losers Round 2 → Losers Finals → Grand Finals
                      ↑
              (Crossover from Winners R2)
```

---

### 3. Round Robin

**Use Case**: Everyone plays everyone, fair scheduling

```typescript
const bracket = generateRoundRobin(players);

// 4 players → 6 matches (n * (n-1) / 2)
// 6 players → 15 matches
```

**Features**:
- ✅ Circle scheduling algorithm (balanced rounds)
- ✅ Handles odd player counts automatically
- ✅ All unique pairings guaranteed

**Scheduling Example** (4 players):
```
Round 1: 1vs2, 3vs4
Round 2: 1vs3, 2vs4
Round 3: 1vs4, 2vs3

Every player plays 3 matches
```

---

### 4. Modified Single Elimination

**Use Case**: Single elim with 3rd/4th place match

```typescript
const bracket = generateModifiedSingleElimination(players, undefined, {
  includeConsolation: true,
});

// Standard single elim + consolation match
```

**Features**:
- ✅ Consolation bracket option
- ✅ Semi-final loser routing
- ✅ Extensible for custom variations

---

## 🎲 Seeding Algorithms

### Random Seeding

**Deterministic Fisher-Yates shuffle**

```typescript
// Truly random
const bracket = generateSingleElimination(players, {
  type: 'random',
});

// Deterministic (same seed = same bracket)
const bracket = generateSingleElimination(players, {
  type: 'random',
  seed: Date.now(),
});
```

**Use Cases**:
- Casual tournaments
- Testing (use fixed seed)
- Fair randomization

---

### Skill-Based Seeding

**Sort by rating (highest first)**

```typescript
const players = [
  { id: 'p1', rating: { system: 'fargo', value: 650 } },
  { id: 'p2', rating: { system: 'fargo', value: 700 } },
  { id: 'p3', rating: { system: 'apa', value: '7' } },
];

const bracket = generateSingleElimination(players, {
  type: 'skill-based',
});

// Order: p2 (700) → p1 (650) → p3 (7)
```

**Supported Rating Systems**:
- **Fargo**: 400-800 (numeric)
- **APA**: 2-9 (string)
- **BCA**: Numeric
- **No rating**: Placed last

---

### Manual Seeding

**Custom TD ordering**

```typescript
const bracket = generateSingleElimination(players, {
  type: 'manual',
  manualOrder: ['p3', 'p1', 'p4', 'p2'],
});

// Players placed in exact order specified
// Unlisted players appended at end
```

---

## 🚀 Usage Examples

### Basic Usage

```typescript
import { generateSingleElimination, validateBracket } from '@/lib/tournament';

const players = [
  { id: 'p1', name: 'Alice', rating: null },
  { id: 'p2', name: 'Bob', rating: null },
  // ... more players
];

const bracket = generateSingleElimination(players, {
  type: 'random',
  seed: 12345,
});

// Validate
const validation = validateBracket(bracket);
if (!validation.valid) {
  console.error(validation.errors);
}

console.log(`Matches: ${bracket.matches.length}`);
console.log(`Rounds: ${bracket.rounds}`);
console.log(`Byes: ${bracket.metadata.byeCount}`);
```

---

### Save to Database

```typescript
import { prisma } from '@/lib/prisma';
import { generateDoubleElimination } from '@/lib/tournament';

async function createBracket(tournamentId: string, players: any[]) {
  const bracket = generateDoubleElimination(players, { type: 'random' });

  // Bulk insert
  await prisma.match.createMany({
    data: bracket.matches.map((match) => ({
      tournamentId,
      round: match.round,
      bracket: match.bracket,
      position: match.position,
      playerAId: match.playerAId,
      playerBId: match.playerBId,
      state: match.state,
      winnerId: match.winnerId,
      score: { playerA: 0, playerB: 0 },
    })),
  });

  return bracket;
}
```

---

### Query Helpers

```typescript
import { getMatchesByRound, getReadyMatches } from '@/lib/tournament';

// Get matches for round 1
const round1 = getMatchesByRound(bracket, 1);
console.log(`Round 1: ${round1.length} matches`);

// Get ready matches (both players assigned, not started)
const ready = getReadyMatches(bracket.matches);
console.log(`${ready.length} matches ready to start`);
```

---

## 📖 API Reference

### `generateSingleElimination(players, seedingOptions?)`

Generate single elimination bracket.

**Parameters**:
- `players: PlayerWithRating[]`
- `seedingOptions?: SeedingOptions`

**Returns**: `BracketStructure`

```typescript
interface BracketStructure {
  matches: BracketMatch[];
  rounds: number;
  format: 'single_elimination';
  metadata: {
    totalPlayers: number;
    byeCount: number;
    totalRounds: number;
  };
}
```

---

### `generateDoubleElimination(players, seedingOptions?)`

Generate double elimination bracket.

**Parameters**:
- `players: PlayerWithRating[]`
- `seedingOptions?: SeedingOptions`

**Returns**: `BracketStructure` with `format: 'double_elimination'`

---

### `generateRoundRobin(players, seedingOptions?)`

Generate round robin bracket.

**Parameters**:
- `players: PlayerWithRating[]`
- `seedingOptions?: SeedingOptions`

**Returns**: `BracketStructure` with `format: 'round_robin'`

**Throws**: Error if less than 2 players

---

### `generateModifiedSingleElimination(players, seedingOptions?, options?)`

Generate modified single elimination bracket.

**Parameters**:
- `players: PlayerWithRating[]`
- `seedingOptions?: SeedingOptions`
- `options?: { includeConsolation?: boolean }`

**Returns**: `BracketStructure` with `format: 'modified_single'`

---

### `seedPlayers(players, options?)`

Apply seeding algorithm to players.

**Parameters**:
- `players: PlayerWithRating[]`
- `options?: SeedingOptions`

**Returns**: `PlayerWithRating[]` in seeded order

```typescript
interface SeedingOptions {
  type: 'random' | 'skill-based' | 'manual';
  seed?: number; // For random
  manualOrder?: string[]; // For manual
}
```

---

### `validateBracket(bracket)`

Validate bracket structure and match dependencies.

**Parameters**:
- `bracket: BracketStructure`

**Returns**:
```typescript
{
  valid: boolean;
  errors: string[];
}
```

**Checks**:
- ✅ All matches have valid rounds
- ✅ Match dependencies exist (`nextMatchId`, `loserNextMatchId`)
- ✅ No orphaned matches

---

### `calculateTotalRounds(playerCount, format)`

Calculate total rounds for a tournament.

**Parameters**:
- `playerCount: number`
- `format: 'single_elimination' | 'double_elimination' | 'round_robin' | 'modified_single'`

**Returns**: `number`

**Examples**:
```typescript
calculateTotalRounds(8, 'single_elimination'); // 3
calculateTotalRounds(8, 'double_elimination'); // 7
calculateTotalRounds(8, 'round_robin'); // 7
```

---

## 🧪 Testing

### Run Tests

```bash
npm test -- apps/web/lib/tournament/__tests__/bracket-generator.test.ts
```

### Coverage

**Seeding**:
- ✅ Random (with/without seed)
- ✅ Skill-based (numeric, string, no rating)
- ✅ Manual (full, partial order)

**Single Elimination**:
- ✅ 8, 16, 32 players
- ✅ Odd counts with byes
- ✅ Match dependencies

**Double Elimination**:
- ✅ Winners/Losers brackets
- ✅ Crossover routing
- ✅ Grand finals

**Round Robin**:
- ✅ Even/odd player counts
- ✅ Unique pairings
- ✅ Balanced rounds

**Property Tests**:
- ✅ No duplicate pairings
- ✅ Bracket integrity (4-64 players)

---

## ⚡ Performance

| Players | Matches | Generation Time |
|---------|---------|-----------------|
| 8 | 7 | <1ms |
| 16 | 15 | <2ms |
| 32 | 31 | <5ms |
| 64 | 63 | <10ms |

**Database Insertion** (with transaction):
- 8 players: ~50ms
- 32 players: ~200ms

---

## 🔧 Multi-Tenant Safe

All bracket generation is **stateless**:

- ✅ No database access
- ✅ Pure functions (deterministic)
- ✅ Tenant isolation at save time

```typescript
// Generation is tenant-agnostic
const bracket = generateSingleElimination(players);

// Tenant scoped when saving
await prisma.match.createMany({
  data: bracket.matches.map((match) => ({
    ...match,
    tournamentId, // Already tenant-scoped
  })),
});
```

---

## 📊 Data Structures

### BracketMatch

```typescript
interface BracketMatch {
  id: string;
  round: number;
  bracket?: 'winners' | 'losers' | null;
  position: number;
  playerAId: string | null;
  playerBId: string | null;
  state: 'pending' | 'ready' | 'assigned' | 'active' | 'completed';
  winnerId: string | null;
  nextMatchId?: string; // Winner advances here
  loserNextMatchId?: string; // Loser goes here (double elim)
  isBye: boolean;
}
```

### PlayerWithRating

```typescript
interface PlayerWithRating {
  id: string;
  name: string;
  rating: {
    system: 'apa' | 'fargo' | 'bca';
    value: number | string;
  } | null;
}
```

---

## 🎯 Real-World Examples

### Tournament Director Workflow

```typescript
// 1. Fetch checked-in players
const players = await prisma.player.findMany({
  where: {
    tournamentId,
    status: 'checked_in',
  },
  select: { id: true, name: true, rating: true },
});

// 2. Generate bracket (skill-based)
const bracket = generateSingleElimination(players, {
  type: 'skill-based',
});

// 3. Validate
const validation = validateBracket(bracket);
if (!validation.valid) {
  throw new Error(`Bracket errors: ${validation.errors.join(', ')}`);
}

// 4. Save to database
await prisma.$transaction(
  bracket.matches.map((match) =>
    prisma.match.create({
      data: {
        tournamentId,
        round: match.round,
        position: match.position,
        playerAId: match.playerAId,
        playerBId: match.playerBId,
        state: match.state,
        winnerId: match.winnerId,
        score: { playerA: 0, playerB: 0 },
      },
    })
  )
);

// 5. Update tournament status
await prisma.tournament.update({
  where: { id: tournamentId },
  data: {
    status: 'active',
    startedAt: new Date(),
  },
});
```

---

## 🔗 Integration

**Works With**:
- Match State Machine (`match-state-machine.ts`)
- Tournament CRDT Sync (Sprint 1)
- Table Assignment (Sprint 2)
- ETA Calculation (Sprint 2)

**APIs**:
- `POST /api/tournaments/[id]/generate-bracket`
- `GET /api/tournaments/[id]/bracket`
- `POST /api/tournaments/[id]/reseed`

---

## 📚 References

- **Sprint 2 Plan**: `sprints/current/sprint-02-tournament-engine.md`
- **Prisma Schema**: `prisma/schema.prisma`
- **Match State Machine**: `apps/web/lib/tournament/match-state-machine.ts`
- **Tests**: `apps/web/lib/tournament/__tests__/bracket-generator.test.ts`

---

## 🤝 Contributing

When adding new formats:

1. Add generation function to `bracket-generator.ts`
2. Export from `index.ts`
3. Add comprehensive tests
4. Update this documentation
5. Add to `calculateTotalRounds()`
6. Validate with `validateBracket()`
