# Tournament Management Library

Sprint 2 implementation of match state machine and lifecycle management.

## Match State Machine

The match state machine provides a robust, event-sourced approach to managing match states with validation and guards to prevent illegal transitions.

### State Flow

```
pending → ready → active → completed
           ↓         ↓
        assigned   paused
                     ↓
                  active

Additional states: cancelled, abandoned, forfeited
```

### States

| State | Description |
|-------|-------------|
| `pending` | Match created, waiting for players to be assigned |
| `ready` | Both players assigned, waiting to start |
| `assigned` | Assigned to table but not started yet |
| `active` | Match in progress |
| `paused` | Temporarily paused (can resume) |
| `completed` | Match finished normally with a winner |
| `cancelled` | Match cancelled before completion |
| `abandoned` | Match abandoned (e.g., player left) |
| `forfeited` | One player forfeited, opponent wins |

### Transitions

| Event | From States | To State | Guards |
|-------|-------------|----------|--------|
| `assign_table` | pending | ready | hasPlayers, hasTable |
| `start` | ready, assigned | active | hasPlayers, hasTable |
| `pause` | active | paused | - |
| `resume` | paused | active | - |
| `complete` | active | completed | hasWinner |
| `cancel` | pending, ready, assigned | cancelled | - |
| `abandon` | active, paused | abandoned | - |
| `forfeit` | active, paused | forfeited | - |

### Guards

Guards are validation functions that run before a state transition:

- **hasPlayers**: Ensures both playerA and playerB are assigned
- **hasTable**: Ensures a table is assigned to the match
- **hasWinner**: Ensures a winner is set before completion

## Usage Examples

### Starting a Match

```typescript
import { startMatch } from '@/lib/tournament';

const result = await startMatch(matchId, {
  actorId: userId,
  device: 'web',
  tableId: 'table-123', // Optional, assigns if not already assigned
});

if (result.success) {
  console.log('Match started:', result.match);
} else {
  console.error('Failed to start match:', result.error);
  console.error('Violations:', result.violations);
}
```

### Updating Score

```typescript
import { updateMatchScore } from '@/lib/tournament';

const result = await updateMatchScore(matchId, {
  actorId: userId,
  device: 'web',
  player: 'A',
  newScore: {
    playerA: 5,
    playerB: 3,
    raceTo: 9,
  },
});
```

### Pausing and Resuming

```typescript
import { pauseMatch, resumeMatch } from '@/lib/tournament';

// Pause
await pauseMatch(matchId, {
  actorId: userId,
  device: 'web',
  reason: 'Equipment issue at table',
});

// Resume later
await resumeMatch(matchId, {
  actorId: userId,
  device: 'web',
});
```

### Completing a Match

```typescript
import { completeMatch } from '@/lib/tournament';

const result = await completeMatch(matchId, {
  actorId: userId,
  device: 'web',
  winnerId: player1Id,
  finalScore: {
    playerA: 9,
    playerB: 7,
    raceTo: 9,
  },
});
```

### Forfeit Handling

```typescript
import { forfeitMatch } from '@/lib/tournament';

const result = await forfeitMatch(matchId, {
  actorId: userId,
  device: 'web',
  forfeitingPlayerId: player2Id,
  reason: 'Player no-show',
});

// Winner is automatically set to the opponent
```

### Abandoning a Match

```typescript
import { abandonMatch } from '@/lib/tournament';

const result = await abandonMatch(matchId, {
  actorId: userId,
  device: 'web',
  reason: 'Tournament cancelled due to weather',
});
```

### Validating Transitions

Before attempting a transition, you can check if it's allowed:

```typescript
import { isTransitionAllowed } from '@/lib/tournament';

const validation = await isTransitionAllowed(matchId, 'start');

if (validation.allowed) {
  // Proceed with transition
  await startMatch(matchId, options);
} else {
  console.error('Cannot start match:', validation.violations);
  // violations: ['Match requires both players to be assigned']
}
```

### Querying Match State

```typescript
import { getMatchState, getMatchesByState } from '@/lib/tournament';

// Get current state
const state = await getMatchState(matchId);
console.log('Match state:', state); // 'active'

// Get all active matches in tournament
const activeMatches = await getMatchesByState(tournamentId, 'active');
console.log(`${activeMatches.length} matches in progress`);
```

### Viewing Match History

```typescript
import { getMatchHistory } from '@/lib/tournament';

const history = await getMatchHistory(matchId);

console.log('Match:', history.match);
console.log('Events:');
history.events.forEach(event => {
  console.log(`${event.timestamp}: ${event.kind}`, event.payload);
});

// Output:
// 2024-11-09 10:00:00: match.assign_table { matchId, tableId, ... }
// 2024-11-09 10:05:00: match.start { matchId, startedAt, ... }
// 2024-11-09 10:15:00: match.score_updated { matchId, player: 'A', ... }
// 2024-11-09 10:45:00: match.complete { matchId, winnerId, ... }
```

## Event Sourcing

All state transitions are recorded as events in the `tournament_events` table:

```typescript
{
  kind: 'match.start',
  actor: userId,
  device: 'web',
  payload: {
    matchId: 'match-123',
    previousState: 'ready',
    newState: 'active',
    startedAt: '2024-11-09T10:05:00Z'
  }
}
```

This provides:
- Complete audit trail of all state changes
- Ability to replay events and reconstruct state
- Multi-device synchronization support
- Historical analysis and debugging

## Multi-Tenant Isolation

All functions automatically respect tenant boundaries through:
- Match includes tournament relationship with `orgId`
- All events include `tournamentId` for tenant scoping
- Queries filter by tournament which is tenant-scoped

## Integration with Existing Code

This state machine integrates with:

- **Score Updates** (`/api/matches/[id]/score/increment`): Uses `updateMatchScore` internally
- **Match Assignment** (`/api/matches/[id]/assign`): Uses state machine for validation
- **Match Notifications**: Triggered on state transitions (completed, ready, etc.)
- **Chip Format**: Awards chips on match completion

## Error Handling

All functions return a `TransitionResult` with:

```typescript
interface TransitionResult {
  success: boolean;
  newState?: MatchState;
  match?: Match;
  error?: string;
  violations?: string[];
}
```

Always check `success` before proceeding:

```typescript
const result = await startMatch(matchId, options);

if (!result.success) {
  if (result.violations?.length) {
    // Guard validation failed
    console.error('Validation errors:', result.violations);
  } else {
    // System error
    console.error('Error:', result.error);
  }
}
```

## TypeScript Types

All types are exported and fully typed:

```typescript
import type {
  MatchState,
  MatchTransitionEvent,
  TransitionResult,
  StartMatchOptions,
  CompleteMatchOptions,
  // ... etc
} from '@/lib/tournament';
```

## Future Enhancements

Potential improvements for future sprints:

1. **Timed Matches**: Add timer tracking and auto-complete on time limit
2. **Match Scheduling**: Queue system for match scheduling
3. **Conflict Resolution**: CRDT-based conflict resolution for multi-device scoring
4. **State Machine Visualization**: Admin UI to visualize state transitions
5. **Custom Guards**: Allow tournaments to define custom transition rules
6. **Rollback**: Event sourcing enables rollback to previous states
7. **Real-time Sync**: WebSocket integration for live state updates

## Testing

Example test cases:

```typescript
describe('Match State Machine', () => {
  it('should not allow starting a match without players', async () => {
    const validation = await isTransitionAllowed(matchId, 'start');
    expect(validation.allowed).toBe(false);
    expect(validation.violations).toContain('Match requires both players to be assigned');
  });

  it('should transition from ready to active on start', async () => {
    const result = await startMatch(matchId, options);
    expect(result.success).toBe(true);
    expect(result.newState).toBe('active');
  });

  it('should create event on state transition', async () => {
    await startMatch(matchId, options);
    const history = await getMatchHistory(matchId);
    expect(history.events).toContainEqual(
      expect.objectContaining({ kind: 'match.start' })
    );
  });
});
```

## Architecture Decisions

**Why a State Machine?**
- Prevents illegal state transitions (e.g., scoring a completed match)
- Provides clear, explicit state flow
- Enables validation before state changes
- Supports complex tournament rules

**Why Event Sourcing?**
- Complete audit trail for compliance
- Enables time-travel debugging
- Supports multi-device synchronization
- Allows state reconstruction from events

**Why Guards?**
- Enforces business rules at the state machine level
- Prevents invalid transitions before they happen
- Provides clear error messages for validation failures
- Extensible for custom tournament rules
