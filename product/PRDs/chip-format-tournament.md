# PRD: Chip Format Tournament System

**Status:** Draft
**Created:** 2025-11-05
**Sprint:** Sprint 4 (CHIP-001, CHIP-002, CHIP-003)
**Priority:** High

---

## Problem Statement

Tournament Directors (TDs) need to run "chip format" tournaments, a popular format in foosball and other table sports where players accumulate chips through matches rather than competing in a traditional bracket. Current system only supports bracket-based formats (single/double elimination, round robin).

**User Pain Points:**

- Cannot run chip format tournaments without manual chip tracking
- No automated match assignment for queue-based formats
- Manual selection of finalists based on chip counts
- Popular format in competitive foosball community

---

## Goals & Success Metrics

### Goals

1. Enable TDs to create and run chip format tournaments
2. Automate chip tracking and match assignment
3. Automatically determine finalists based on chip counts
4. Maintain offline-first architecture for tournament day

### Success Metrics

- ✅ TDs can create chip format tournaments
- ✅ Chip counts update automatically after each match
- ✅ Top N players automatically identified for finals
- ✅ <1 second match assignment time
- ✅ Zero chip counting errors

---

## User Stories

### CHIP-001: Queue Engine

**As a** Tournament Director
**I want** matches to be assigned from a queue without a bracket structure
**So that** players can play continuously without waiting for bracket progression

**Acceptance Criteria:**

- Queue-based match assignment (no bracket tree)
- Configurable pairing logic (random, rating-based, round-robin)
- Tables assigned automatically to available players
- Match history prevents duplicate pairings (optional)

### CHIP-002: Chip Counter Tracking

**As a** Tournament Director
**I want** chip counts to update automatically when matches complete
**So that** I don't have to manually track chips for each player

**Acceptance Criteria:**

- Chip count stored per player
- Configurable chip values (winner/loser chips)
- Automatic increment on match completion
- Chip history tracked in audit log
- TD can manually adjust chips if needed

### CHIP-003: Finals Cutoff Logic

**As a** Tournament Director
**I want** the system to automatically select top N players by chip count
**So that** I can easily transition from qualification to finals bracket

**Acceptance Criteria:**

- Configurable cutoff (top 4, 8, 16, etc.)
- Automatic ranking by chip count
- Tiebreaker rules (head-to-head, rating, random)
- Finals bracket generated from top N players
- Qualification phase locks after cutoff

---

## Solution Design

### Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│            Chip Format Tournament                      │
├──────────────────────────────────────────────────────┤
│                                                        │
│  Phase 1: Qualification (Queue-Based)                 │
│  ┌──────────────────────────────────────┐            │
│  │  Player Queue                        │            │
│  │  ├─ Player A (chips: 15)            │            │
│  │  ├─ Player B (chips: 12)            │            │
│  │  ├─ Player C (chips: 18)            │            │
│  │  └─ Player D (chips: 9)             │            │
│  └──────────────────────────────────────┘            │
│           │                                           │
│           ▼                                           │
│  ┌──────────────────────────────────────┐            │
│  │  Match Assignment Engine             │            │
│  │  ├─ Pair players from queue         │            │
│  │  ├─ Assign to available tables      │            │
│  │  └─ Track match history             │            │
│  └──────────────────────────────────────┘            │
│           │                                           │
│           ▼                                           │
│  ┌──────────────────────────────────────┐            │
│  │  Match Completion                    │            │
│  │  ├─ Award chips to winner/loser     │            │
│  │  ├─ Update player chip counts       │            │
│  │  └─ Return players to queue         │            │
│  └──────────────────────────────────────┘            │
│                                                        │
│  Phase 2: Finals (Bracket-Based)                      │
│  ┌──────────────────────────────────────┐            │
│  │  Finals Cutoff                       │            │
│  │  ├─ Rank players by chip count      │            │
│  │  ├─ Select top N players            │            │
│  │  ├─ Apply tiebreaker rules          │            │
│  │  └─ Generate finals bracket         │            │
│  └──────────────────────────────────────┘            │
│                                                        │
└──────────────────────────────────────────────────────┘
```

### Data Model

#### Tournament Configuration

```typescript
{
  format: 'chip_format',
  chipConfig: {
    winnerChips: 3,      // Chips awarded to winner
    loserChips: 1,       // Chips awarded to loser (optional)
    qualificationRounds: 5, // Number of rounds before finals
    finalsCount: 8,      // Top N players advance to finals
    pairingStrategy: 'random' | 'rating' | 'round_robin',
    allowDuplicatePairings: false, // Prevent same pairing twice
    tiebreaker: 'head_to_head' | 'rating' | 'random'
  }
}
```

#### Player Extensions

```typescript
{
  chipCount: number,    // Current chip total
  matchesPlayed: number, // Qualification matches completed
  chipHistory: {        // Chip award history
    matchId: string,
    chipsEarned: number,
    timestamp: Date
  }[]
}
```

### API Endpoints

#### Create Chip Format Tournament

```
POST /api/tournaments
{
  "format": "chip_format",
  "chipConfig": { ... }
}
```

#### Assign Next Match (Queue Engine)

```
POST /api/tournaments/[id]/matches/assign-next
Response: {
  "matchId": "match-123",
  "playerA": { "id": "...", "name": "...", "chips": 15 },
  "playerB": { "id": "...", "name": "...", "chips": 12 },
  "tableId": "table-1"
}
```

#### Award Chips (Match Completion Hook)

```
POST /api/tournaments/[id]/matches/[matchId]/complete
Body: { "winnerId": "player-a", "score": { ... } }
Side Effect: Automatically awards chips to players
```

#### Get Chip Standings

```
GET /api/tournaments/[id]/chip-standings
Response: {
  "standings": [
    { "playerId": "...", "name": "...", "chips": 18, "matchesPlayed": 5, "rank": 1 },
    { "playerId": "...", "name": "...", "chips": 15, "matchesPlayed": 5, "rank": 2 }
  ]
}
```

#### Apply Finals Cutoff

```
POST /api/tournaments/[id]/apply-finals-cutoff
Body: { "finalistsCount": 8 }
Response: {
  "finalists": [...],
  "eliminated": [...],
  "tiebreakers": [...]
}
```

---

## Technical Implementation

### Files to Create

1. **`apps/web/lib/chip-format-engine.ts`**
   - Queue-based match assignment logic
   - Pairing strategies (random, rating, round-robin)
   - Duplicate pairing prevention

2. **`apps/web/lib/chip-tracker.ts`**
   - Chip award calculations
   - Chip history tracking
   - Manual chip adjustments

3. **`apps/web/lib/finals-cutoff.ts`**
   - Ranking algorithm
   - Tiebreaker resolution
   - Finals bracket generation

4. **`apps/web/app/api/tournaments/[id]/matches/assign-next/route.ts`**
   - API endpoint for queue-based match assignment

5. **`apps/web/app/api/tournaments/[id]/chip-standings/route.ts`**
   - API endpoint for chip standings

6. **`apps/web/app/api/tournaments/[id]/apply-finals-cutoff/route.ts`**
   - API endpoint for finals cutoff

### Database Schema Changes

```prisma
model Player {
  // ... existing fields ...
  chipCount         Int       @default(0) @map("chip_count")
  matchesPlayed     Int       @default(0) @map("matches_played")
  chipHistory       Json?     @map("chip_history") // Array of chip awards
}

model Tournament {
  // ... existing fields ...
  chipConfig        Json?     @map("chip_config") // Chip format configuration
  qualificationLocked Boolean @default(false) @map("qualification_locked") // True after finals cutoff
}
```

---

## Edge Cases & Considerations

### 1. Tiebreakers

**Problem:** Multiple players with same chip count
**Solution:**

1. Head-to-head record (if they played each other)
2. Fargo rating (if available)
3. Random selection (fair coin flip)

### 2. Odd Number of Players

**Problem:** One player left unpaired in queue
**Solution:**

- Assign "bye" match (automatic chip award)
- Wait for next available player
- Allow TD to manually pair with another player

### 3. Match Assignment Fairness

**Problem:** Same players paired multiple times
**Solution:**

- Track match history per player pair
- Prevent duplicate pairings (configurable)
- Round-robin strategy ensures everyone plays everyone

### 4. Late Entries

**Problem:** Player joins after qualification started
**Solution:**

- Start with 0 chips
- TD can manually award "catch-up" chips
- Late entry fee adjustment

### 5. No-Shows During Qualification

**Problem:** Player no-shows after being paired
**Solution:**

- Award chips to present player (forfeit win)
- Mark absent player for penalty/elimination
- Return present player to queue

### 6. Finals Bracket Format

**Problem:** Top 8 could use single or double elimination
**Solution:**

- TD chooses finals bracket format (separate from chip format)
- Standard bracket generation using top N players
- Seeding based on chip count (highest seed = most chips)

---

## Testing Strategy

### Unit Tests

- ✅ Pairing algorithm (random, rating, round-robin)
- ✅ Chip award calculations
- ✅ Ranking with tiebreakers
- ✅ Finals cutoff selection

### Integration Tests

- ✅ Full qualification phase (multiple rounds)
- ✅ Finals cutoff transition
- ✅ Chip count consistency across match completions

### Manual Testing Scenarios

1. Create chip format tournament (8 players)
2. Run 5 qualification rounds
3. Verify chip counts match expected results
4. Apply finals cutoff (top 4)
5. Generate finals bracket
6. Complete finals and verify placements

---

## Open Questions

1. **Chip values:** Should loser chips be configurable or always 1?
   - **Recommendation:** Configurable (some TDs use 3-1, others 2-0)

2. **Qualification rounds:** Fixed rounds or time-based?
   - **Recommendation:** Fixed rounds for v1, time-based in future

3. **Finals bracket format:** Always single elimination?
   - **Recommendation:** Let TD choose (single or double)

4. **Chip adjustment UI:** Should TDs have manual chip adjustment?
   - **Recommendation:** Yes, for corrections and penalties

---

## Launch Plan

### Phase 1: MVP (Sprint 4)

- ✅ CHIP-001: Queue engine with random pairing
- ✅ CHIP-002: Basic chip tracking (winner/loser chips)
- ✅ CHIP-003: Finals cutoff with simple tiebreaker

### Phase 2: Enhancements (Sprint 5+)

- ⏳ Round-robin pairing strategy
- ⏳ Advanced tiebreakers (head-to-head)
- ⏳ Time-based qualification phases
- ⏳ Chip adjustment UI for TDs
- ⏳ Real-time chip leaderboard display

---

## Success Criteria

**Must Have (MVP):**

- ✅ Create chip format tournament
- ✅ Automatic match assignment (random pairing)
- ✅ Chip counts update on match completion
- ✅ Finals cutoff selects top N players
- ✅ Generate finals bracket from finalists

**Nice to Have (v2):**

- ⏳ Multiple pairing strategies
- ⏳ Live chip leaderboard
- ⏳ Manual chip adjustments
- ⏳ Advanced tiebreaker rules

---

## Appendix

### Chip Format in Foosball

Chip format is a popular tournament structure in foosball where:

- Players earn chips by winning matches during qualification
- Typical chip awards: 3 chips for win, 1 chip for loss (3-1 format)
- After qualification rounds (e.g., 5 rounds), top N players advance
- Finals use traditional bracket (single or double elimination)
- Promotes continuous play and rewards consistency

### Example Tournament Flow

1. **Registration:** 16 players register
2. **Qualification:** Each player plays 5 matches (random opponents)
3. **Chip Awards:** Winners get 3 chips, losers get 1 chip per match
4. **Rankings:** After 5 rounds, players ranked by total chips
5. **Cutoff:** Top 8 players advance to finals
6. **Finals:** Double elimination bracket seeded by chip count
7. **Prizes:** 1st, 2nd, 3rd place from finals bracket

---

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Next Review:** After CHIP-001 implementation
