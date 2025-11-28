# ADR-004: Board Adapter Consolidation Strategy

**Date:** 2025-11-04
**Status:** Accepted
**Deciders:** Development Team
**Technical Story:** Multi-AI Swarm v2.1.2 implementation - ticket processing architecture

---

## Context

The Multi-AI Swarm system (v2.1.2) requires integration with project management boards (GitHub Projects, Jira, Linear) to poll for ready tickets and create agent work assignments. The reference specification suggests separate components:

1. **Board adapters** (`scripts/board-adapters/`) - Poll board APIs and fetch tickets
2. **process-tickets.js** - Transform tickets and create agent work

We need to decide whether to maintain these as separate scripts or consolidate functionality into unified board adapter modules.

Key considerations:

- **Code maintainability**: Separate scripts vs. unified modules
- **Data flow**: Ticket fetching → transformation → agent creation pipeline
- **Board-specific logic**: Each board (GitHub, Jira, Linear) has unique APIs and data models
- **Single Responsibility Principle**: Should adapters only adapt, or handle full workflow?
- **Team size**: 2-person team prefers simpler architecture

---

## Decision

We will **consolidate all ticket processing functionality into board adapter modules** rather than maintaining separate `process-tickets.js` script.

Each board adapter (`board-adapter-github.js`, `board-adapter-jira.js`, etc.) will be a **self-contained module** responsible for:

1. **Polling** - Fetch tickets from board API
2. **Transformation** - Convert board-specific format to internal ticket schema
3. **Lane routing** - Auto-determine lane from labels/tags
4. **Priority detection** - Extract priority from board metadata
5. **Agent creation** - Create agent status files and branches
6. **Capacity checking** - Validate lane capacity before assignment
7. **Status updates** - Update board when work starts/completes

**Current implementation:**

- `board-adapter-github.js` (443 lines, 14KB) contains:
  - `getReadyTickets()` - Fetches from GitHub Projects
  - `transformTicket()` - Converts to internal format
  - `determineLane()` - Auto-assigns based on labels
  - `determinePriority()` - Extracts priority
  - `extractEstimate()` - Parses story points
  - `extractAcceptanceCriteria()` - Extracts acceptance criteria
  - `createAgentWork()` - Creates agent status and branch
  - `countActiveAgentsInLane()` - Lane capacity checking
  - `createBranch()` - Git operations
  - `updateTicketStatus()` - Updates board status

---

## Consequences

### Positive Consequences

- **Simpler architecture**: One module per board instead of N adapters + shared processor
- **Board-specific optimizations**: Each adapter can optimize for its API (e.g., GitHub CLI batch operations)
- **Cleaner data flow**: No intermediate format conversions between adapter and processor
- **Easier testing**: Mock entire workflow in one module rather than coordinating multiple scripts
- **Better encapsulation**: Board-specific logic (label formats, API quirks) stays in one place
- **Less coordination**: No need to maintain shared ticket schema contract between adapter/processor
- **Faster execution**: No IPC or file I/O between adapter and processor

### Negative Consequences

- **Code duplication**: Common logic (lane routing, priority detection) duplicated across adapters
  - _Mitigation:_ Extract to shared utility module (`board-utils.js`) when 2nd adapter is added
- **Larger files**: Each adapter is 300-500 lines vs. smaller focused scripts
  - _Mitigation:_ Acceptable for self-contained modules; internal organization keeps it manageable
- **Breaks v2.1.2 spec**: Reference architecture shows separate `process-tickets.js`
  - _Mitigation:_ Architectural deviation documented in ADR; functionality is identical

### Neutral Consequences

- **One adapter per board**: Currently only GitHub Projects, future adapters (Jira, Linear) follow same pattern
- **Import model**: Coordinator imports adapter as module rather than spawning separate process

---

## Alternatives Considered

### Alternative 1: Separate Scripts (v2.1.2 Reference Architecture)

**Description:** Maintain `board-adapters/` for polling and separate `process-tickets.js` for transformation/agent creation.

**Data flow:**

```
board-adapter-github.js → tickets.json → process-tickets.js → agent-status/*.json
```

**Pros:**

- Matches v2.1.2 reference spec exactly
- Clearer separation of concerns (adapter only adapts)
- Shared processing logic across all board types

**Cons:**

- **Extra file I/O**: Write tickets.json intermediate file, then read it
- **Coordination overhead**: Adapter must signal completion, processor must wait
- **Harder error handling**: Failures in either stage complicate recovery
- **Brittle contract**: Changes to ticket schema require coordinating 2+ scripts
- **Slower execution**: Two process spawns instead of one module import

**Why rejected:** For a 2-person team, the overhead of coordinating separate scripts outweighs benefits. Performance suffers from extra I/O. Error handling becomes complex.

---

### Alternative 2: Shared Base Class

**Description:** Create abstract `BoardAdapter` base class with shared methods, concrete adapters inherit and override board-specific methods.

**Pros:**

- Eliminates code duplication via inheritance
- Enforces consistent interface across adapters
- Shared utilities in base class

**Cons:**

- **Premature abstraction**: Only 1 adapter currently (GitHub)
- **Inheritance complexity**: JavaScript/TypeScript class hierarchies harder to reason about
- **Overengineering**: YAGNI - don't need abstraction until 2nd adapter
- **Harder to customize**: Board-specific quirks fight against base class assumptions

**Why rejected:** Wait until 2nd adapter (Jira or Linear) is needed, then extract common utilities to shared module. Avoid premature abstraction.

---

### Alternative 3: Microservice Architecture

**Description:** Separate service per board type, communicate via message queue (Redis, RabbitMQ).

**Pros:**

- Maximum isolation and scalability
- Language-agnostic (could write Jira adapter in Python)
- Independent deployment per adapter

**Cons:**

- **Massive overkill**: 2-person team, single swarm instance
- **Infrastructure burden**: Redis/RabbitMQ adds operational complexity
- **Network latency**: IPC overhead for every ticket
- **Debugging nightmare**: Distributed tracing for debugging

**Why rejected:** Inappropriate for team size and scale. Single-process architecture is sufficient.

---

## Implementation Notes

### Current State (100% Complete)

✅ `board-adapter-github.js` fully implements consolidated architecture
✅ Coordinator workflow imports and calls adapter directly
✅ No separate `process-tickets.js` file (intentionally omitted)
✅ All ticket processing functionality present in adapter

### Future Board Adapters

When implementing Jira or Linear adapters:

1. **Copy pattern** from `board-adapter-github.js`
2. **Extract shared utilities** to `board-utils.js` if duplication becomes painful:
   - Lane routing logic
   - Priority detection
   - Estimate parsing
   - Acceptance criteria extraction
3. **Keep board-specific logic** in adapter:
   - API calls
   - Authentication
   - Data model transformations
   - Rate limiting
4. **Same interface** for coordinator:
   ```javascript
   async getReadyTickets()     // Returns ticket[]
   async createAgentWork(ticket)  // Returns agentStatus
   ```

### Shared Utilities Module (Future)

When 2nd adapter is added, create `scripts/board-adapters/board-utils.js`:

```javascript
// Shared utilities across all board adapters
export function determineLane(labels) { ... }
export function determinePriority(labels) { ... }
export function extractEstimate(body) { ... }
export function extractAcceptanceCriteria(body) { ... }
export function slugify(title) { ... }
```

Each adapter imports and uses these, overriding only board-specific behavior.

---

## References

- [Multi-AI Swarm v2.1.2 Specification](../docs/multi-ai-swarm-prompts-v2.1.2.md)
- [board-adapter-github.js](../../scripts/board-adapters/board-adapter-github.js)
- [SWARM-IMPLEMENTATION-COMPLETE.md](../../SWARM-IMPLEMENTATION-COMPLETE.md)

---

## Revision History

| Date       | Change              | Author                |
| ---------- | ------------------- | --------------------- |
| 2025-11-04 | Initial ADR created | Claude (AI Assistant) |

---

## Superseded By

[None]
