# Chip Format API Documentation

## Overview

The Chip Format system provides a queue-based tournament format where players earn chips for wins and losses, compete in qualification rounds, and the top players advance to a finals bracket.

**Base URL:** `/api/tournaments/[id]`

**Sprint:** Sprint 4 - CHIP-001, CHIP-002, CHIP-003

---

## Endpoints

### 1. Get Chip Standings

**GET** `/api/tournaments/[id]/chip-standings`

Returns current chip standings for a chip format tournament, ranked by chip count.

#### Query Parameters

| Parameter      | Type    | Required | Description                   |
| -------------- | ------- | -------- | ----------------------------- |
| `includeStats` | boolean | No       | Include tournament statistics |

#### Response

```typescript
{
  standings: ChipStanding[];
  stats?: ChipStats; // If includeStats=true
}
```

**ChipStanding:**

```typescript
{
  rank: number; // Current rank (1-based)
  playerId: string; // Player ID
  playerName: string; // Player name
  chipCount: number; // Current chips
  matchesPlayed: number; // Matches completed
  wins: number; // Match wins
  losses: number; // Match losses
}
```

**ChipStats:**

```typescript
{
  totalPlayers: number; // Active players
  averageChips: number; // Mean chip count
  medianChips: number; // Median chip count
  maxChips: number; // Highest chip count
  minChips: number; // Lowest chip count
  averageMatches: number; // Mean matches played
}
```

#### Example Request

```bash
GET /api/tournaments/abc123/chip-standings?includeStats=true
```

#### Example Response

```json
{
  "standings": [
    {
      "rank": 1,
      "playerId": "player-1",
      "playerName": "John Doe",
      "chipCount": 18,
      "matchesPlayed": 6,
      "wins": 6,
      "losses": 0
    },
    {
      "rank": 2,
      "playerId": "player-2",
      "playerName": "Jane Smith",
      "chipCount": 15,
      "matchesPlayed": 5,
      "wins": 4,
      "losses": 1
    }
  ],
  "stats": {
    "totalPlayers": 32,
    "averageChips": 12.5,
    "medianChips": 12,
    "maxChips": 18,
    "minChips": 3,
    "averageMatches": 4.8
  }
}
```

#### Status Codes

- `200 OK` - Success
- `404 Not Found` - Tournament not found
- `500 Internal Server Error` - Server error

---

### 2. Assign Next Match

**POST** `/api/tournaments/[id]/matches/assign-next`

Assigns the next match from the queue using the configured pairing strategy.

#### Request Body

```typescript
{
  chipConfig?: ChipConfig;   // Optional config override
  count?: number;            // Number of matches to assign (default: 1)
}
```

**ChipConfig:**

```typescript
{
  winnerChips: number; // Chips for winner (default: 3)
  loserChips: number; // Chips for loser (default: 1)
  qualificationRounds: number; // Rounds before finals (default: 5)
  finalsCount: number; // Players in finals (default: 8)
  pairingStrategy: 'random' | 'rating' | 'chip_diff'; // Pairing method
  allowDuplicatePairings: boolean; // Allow rematches
  tiebreaker: 'head_to_head' | 'rating' | 'random'; // Tiebreaker method
}
```

#### Response (Single Match)

```typescript
{
  success: true;
  assignment: {
    match: Match;
    playerA: Player;
    playerB: Player;
    tableNumber?: number;
  }
}
```

#### Response (Batch)

```typescript
{
  success: true;
  assignments: MatchAssignment[];
  count: number;
}
```

#### Example Request (Single)

```bash
POST /api/tournaments/abc123/matches/assign-next
Content-Type: application/json

{}
```

#### Example Request (Batch)

```bash
POST /api/tournaments/abc123/matches/assign-next
Content-Type: application/json

{
  "count": 4
}
```

#### Example Response

```json
{
  "success": true,
  "assignment": {
    "match": {
      "id": "match-123",
      "playerAId": "player-1",
      "playerBId": "player-2",
      "tableNumber": 5,
      "state": "pending",
      "score": {
        "playerA": 0,
        "playerB": 0,
        "raceTo": 9,
        "games": []
      }
    },
    "playerA": {
      "id": "player-1",
      "name": "John Doe",
      "chipCount": 12
    },
    "playerB": {
      "id": "player-2",
      "name": "Jane Smith",
      "chipCount": 10
    },
    "tableNumber": 5
  }
}
```

#### Status Codes

- `200 OK` - Success
- `400 Bad Request` - Not enough players in queue
- `404 Not Found` - Tournament not found
- `500 Internal Server Error` - Server error

---

### 3. Get Queue Statistics

**GET** `/api/tournaments/[id]/queue-stats`

Returns statistics about the current match queue.

#### Response

```typescript
{
  playersInQueue: number; // Players available for pairing
  activeMatches: number; // Matches currently in progress
  completedMatches: number; // Matches finished
  pendingMatches: number; // Matches assigned but not started
  totalPlayers: number; // All tournament players
  availableForPairing: number; // Players not in active matches
}
```

#### Example Request

```bash
GET /api/tournaments/abc123/queue-stats
```

#### Example Response

```json
{
  "playersInQueue": 24,
  "activeMatches": 4,
  "completedMatches": 48,
  "pendingMatches": 2,
  "totalPlayers": 32,
  "availableForPairing": 24
}
```

#### Status Codes

- `200 OK` - Success
- `404 Not Found` - Tournament not found
- `500 Internal Server Error` - Server error

---

### 4. Manual Chip Adjustment

**PATCH** `/api/tournaments/[id]/players/[playerId]/chips`

Manually adjust a player's chip count (TD corrections, penalties, bonuses).

#### Request Body

```typescript
{
  adjustment: number; // Chip change (positive or negative)
  reason: string; // Required reason for adjustment
}
```

#### Response

```typescript
{
  success: true;
  player: {
    id: string;
    name: string;
    chipCount: number; // Updated chip count
    matchesPlayed: number;
  }
  adjustment: number; // Change applied
  reason: string; // Reason provided
}
```

#### Example Request

```bash
PATCH /api/tournaments/abc123/players/player-1/chips
Content-Type: application/json

{
  "adjustment": -3,
  "reason": "Late arrival penalty"
}
```

#### Example Response

```json
{
  "success": true,
  "player": {
    "id": "player-1",
    "name": "John Doe",
    "chipCount": 15,
    "matchesPlayed": 5
  },
  "adjustment": -3,
  "reason": "Late arrival penalty"
}
```

#### Status Codes

- `200 OK` - Success
- `400 Bad Request` - Invalid adjustment or missing reason
- `404 Not Found` - Player not found
- `500 Internal Server Error` - Server error

---

### 5. Apply Finals Cutoff

**POST** `/api/tournaments/[id]/apply-finals-cutoff`

Applies the finals cutoff, selecting the top N players for the finals bracket.

#### Request Body

None required (uses tournament's chipConfig)

#### Response

```typescript
{
  success: true;
  finalists: ChipStanding[];     // Players who qualified
  eliminated: ChipStanding[];    // Players who did not qualify
  tiebreakers: TiebreakerResult[]; // Tiebreaker details if applicable
  finalistsCount: number;        // Count of finalists
  eliminatedCount: number;       // Count of eliminated
}
```

**TiebreakerResult:**

```typescript
{
  playerId: string;
  reason: string; // Explanation of tiebreaker result
}
```

#### Example Request

```bash
POST /api/tournaments/abc123/apply-finals-cutoff
```

#### Example Response

```json
{
  "success": true,
  "finalists": [
    {
      "rank": 1,
      "playerId": "player-1",
      "playerName": "John Doe",
      "chipCount": 18,
      "matchesPlayed": 6
    },
    {
      "rank": 2,
      "playerId": "player-2",
      "playerName": "Jane Smith",
      "chipCount": 15,
      "matchesPlayed": 5
    }
  ],
  "eliminated": [
    {
      "rank": 9,
      "playerId": "player-9",
      "playerName": "Bob Jones",
      "chipCount": 9,
      "matchesPlayed": 5
    }
  ],
  "tiebreakers": [],
  "finalistsCount": 8,
  "eliminatedCount": 24
}
```

#### Status Codes

- `200 OK` - Success
- `400 Bad Request` - Tournament not chip format or missing config
- `404 Not Found` - Tournament not found
- `500 Internal Server Error` - Server error

---

## Workflow

### Typical Tournament Flow

1. **Tournament Start**
   - TD configures chip format settings
   - Players check in and join queue

2. **Qualification Rounds**

   ```
   GET /queue-stats              → Check queue status
   POST /matches/assign-next     → Assign matches
   → Players complete matches
   → Chips automatically awarded
   GET /chip-standings           → View leaderboard
   ```

3. **Optional Adjustments**

   ```
   PATCH /players/[id]/chips     → Manual corrections
   ```

4. **Finals Cutoff**
   ```
   POST /apply-finals-cutoff     → Select top N players
   → Switch to bracket format
   ```

---

## Pairing Strategies

### Random

Randomly pairs available players. Simple and fair.

### Rating-Based

Pairs players with similar ratings. Creates competitive matches.

### Chip Difference

Pairs players with similar chip counts. Keeps standings competitive.

---

## Tiebreaker Methods

### Head-to-Head

Uses previous match results between tied players.

### Rating

Uses player skill ratings to break ties.

### Random

Random selection (used as last resort).

---

## Error Handling

All endpoints return standard error responses:

```typescript
{
  error: string;  // Error message
  details?: any;  // Additional error details
}
```

### Common Errors

- **Tournament not found** - Invalid tournament ID
- **Player not found** - Invalid player ID
- **Not enough players** - Queue has insufficient players
- **Invalid chip config** - Missing or invalid configuration
- **Permission denied** - User lacks required permissions

---

## Authentication

All endpoints require authentication with appropriate permissions:

- **Scorekeeper, TD, or Owner** - Can use all endpoints
- **Player** - Can view standings and stats only

Headers:

```
Authorization: Bearer <token>
```

---

## Rate Limiting

- **100 requests per minute** per IP address
- **1000 requests per hour** per authenticated user

Exceeding limits returns `429 Too Many Requests`.

---

## Data Models

### Match States

- `pending` - Assigned but not started
- `active` - Currently in progress
- `completed` - Finished
- `cancelled` - Cancelled by TD

### Player Status

- `registered` - Signed up
- `checked_in` - Present and ready
- `active` - Currently playing
- `eliminated` - Did not qualify for finals
- `finalist` - Qualified for finals bracket
- `withdrawn` - Left tournament
- `no_show` - Did not check in

---

## Best Practices

### Queue Management

1. Check queue stats before assigning matches
2. Assign multiple matches when many players are waiting
3. Monitor active matches to optimize table usage

### Chip Adjustments

1. Always provide clear reasons for manual adjustments
2. Document penalties and bonuses in tournament log
3. Announce adjustments to affected players

### Finals Cutoff

1. Announce cutoff timing in advance
2. Review standings before applying cutoff
3. Handle ties according to announced rules
4. Verify all qualification matches are complete

---

## Support

For issues or questions:

- GitHub: https://github.com/ChrisStephens1971/saas202520
- Documentation: `/docs/chip-format`
- Sprint 4 Implementation: CHIP-001, CHIP-002, CHIP-003
