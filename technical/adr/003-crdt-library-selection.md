# ADR-003: CRDT Library Selection for Offline-First Sync

**Date:** 2025-11-03
**Status:** Proposed (Decision Pending)
**Deciders:** Development Team
**Technical Story:** Offline-first architecture with conflict-free synchronization

---

## Context

The tournament platform's core architectural requirement is **offline-first operation**: tournament directors must be able to run tournaments with 2+ devices even when internet connectivity is lost. This demands:

**Conflict-free synchronization:**

- Multiple TD devices updating tournament state simultaneously
- Deterministic merge when devices reconnect
- No "last write wins" data loss
- Audit trail showing who changed what, when, on which device

**Technical requirements:**

- Runs in browser (IndexedDB) and Node.js (sync service)
- WebSocket transport for real-time sync
- Handles network partitions gracefully (offline mode)
- State projections for reads (event sourcing integration)
- Support for complex data structures (nested objects, arrays, maps)
- Performance: handle 1000+ tournament events in 10 minutes without lag

**Critical use cases:**

1. **Bracket updates**: Two TDs update different matches simultaneously offline, merge when back online
2. **Score entry**: Scorekeeper updates match score while TD updates table assignments, no conflicts
3. **Late entries**: TD adds player on one device while another TD starts round 1, deterministic merge
4. **Concurrent table assignments**: Two TDs assign different matches to tables, no double-booking

We need to choose between **Y.js** and **Automerge** as our CRDT library.

---

## Decision

**Status: DECISION DEFERRED - Team will evaluate both during Week 1-2 prototype phase.**

**Recommendation: Start with Y.js, migrate to Automerge if conflict resolution proves insufficient.**

Reasoning:

- Y.js offers better performance and simpler API (faster to prototype)
- Automerge has superior conflict resolution and audit trails (better for production)
- Both support our use case, so start fast with Y.js and validate
- If conflict edge cases emerge during early testing, migrate to Automerge before week 4

**Implementation approach (whichever is chosen):**

```typescript
// Abstraction layer allows swapping libraries
interface TournamentCRDT {
  applyEvent(event: TournamentEvent): void;
  getState(): TournamentState;
  merge(remote: TournamentCRDT): void;
  toSnapshot(): Uint8Array;
  fromSnapshot(data: Uint8Array): void;
}

// Y.js implementation
class YjsTournamentCRDT implements TournamentCRDT {
  /* ... */
}

// Automerge implementation (if we migrate)
class AutomergeTournamentCRDT implements TournamentCRDT {
  /* ... */
}
```

---

## Consequences (Y.js - Recommended Start)

### Positive Consequences

- **Fastest performance**: 3-5x faster than Automerge in benchmarks
- **Smaller bundle**: ~150KB vs Automerge's ~500KB
- **Rich ecosystem**: Bindings for Yjs-Quill, Yjs-Monaco, Yjs-Prosemirror (useful for future features)
- **Simpler API**: Easier to learn and debug
- **Battle-tested**: Used by Figma, Linear, Notion (proven at scale)
- **WebRTC + WebSocket support**: Built-in network layers

### Negative Consequences

- **Weaker audit trails**: Less explicit about change history
- **Less intuitive conflict resolution**: Sometimes unpredictable merges for complex nested updates
- **JSON-CRDT hybrid**: Mixing Y.Map, Y.Array requires care
- **Debugging difficulty**: Opaque internal state makes debugging merges harder

---

## Consequences (Automerge - Fallback Option)

### Positive Consequences

- **Superior conflict resolution**: Explicit rules for concurrent edits, more predictable
- **Excellent audit trails**: Built-in change history and actor tracking (perfect for event sourcing)
- **Immutable-friendly**: Change history is first-class, easier to integrate with event log
- **Better for complex data**: Nested objects and arrays merge more intuitively
- **Rich history API**: Easy to implement undo/redo, time-travel debugging

### Negative Consequences

- **Slower performance**: 3-5x slower than Y.js, may struggle with 1000+ events in 10 minutes
- **Larger bundle size**: ~500KB vs Y.js's ~150KB
- **Steeper learning curve**: More concepts to understand (actors, patches, snapshots)
- **Less mature ecosystem**: Fewer integrations and community resources
- **WebAssembly dependency**: Requires WASM, adds complexity to build pipeline

---

## Detailed Comparison

| Criterion               | Y.js                          | Automerge                 | Winner                    |
| ----------------------- | ----------------------------- | ------------------------- | ------------------------- |
| **Performance**         | 5-10ms for 1000 ops           | 20-50ms for 1000 ops      | Y.js (3-5x faster)        |
| **Bundle Size**         | ~150KB                        | ~500KB                    | Y.js (smaller)            |
| **Conflict Resolution** | Automatic, sometimes opaque   | Explicit, predictable     | Automerge (better logic)  |
| **Audit Trail**         | Manual tracking needed        | Built-in change history   | Automerge (native)        |
| **Learning Curve**      | Easy (2-3 days)               | Moderate (4-5 days)       | Y.js (simpler)            |
| **Ecosystem**           | Rich (editor bindings, tools) | Growing (fewer tools)     | Y.js (mature)             |
| **Event Sourcing Fit**  | Requires wrapper              | Natural fit               | Automerge (better match)  |
| **Debugging**           | Harder (opaque state)         | Easier (explicit patches) | Automerge (transparency)  |
| **Network Layer**       | Built-in (WS, WebRTC)         | Bring your own            | Y.js (batteries included) |
| **Production Use**      | Proven at scale (Figma)       | Growing (Actual Budget)   | Y.js (proven)             |

---

## Alternatives Considered

### Alternative 1: Y.js (Fast Start)

**Description:** Start with Y.js for rapid prototyping and performance, migrate to Automerge if conflict resolution proves inadequate.

**Pros:**

- Fastest time-to-prototype (simpler API)
- Best performance out of the box
- Proven at scale (de-risks architecture)
- Built-in network layer saves time

**Cons:**

- May hit conflict resolution limitations later (migration cost)
- Audit trail requires custom implementation
- Less natural fit with event sourcing

**Why recommended as starting point:** Speed is critical for 12-week timeline. Y.js gets us to a working offline-first prototype faster. If we discover Y.js's conflict resolution is insufficient during weeks 1-4, we can migrate to Automerge before major implementation begins.

---

### Alternative 2: Automerge (Production Choice)

**Description:** Start with Automerge for superior conflict resolution and audit trails, accept slower performance.

**Pros:**

- Better conflict resolution from day 1 (no migration risk)
- Audit trail built-in (perfect for event sourcing)
- More predictable behavior for complex state
- Better long-term fit with our architecture

**Cons:**

- Slower development (steeper learning curve)
- Performance may require optimization work
- Larger bundle size (minor issue for PWA)
- Less mature tooling

**Why considered as fallback:** If early Y.js testing reveals unacceptable conflict edge cases (e.g., two TDs create matches with same IDs, bracket state diverges), we migrate to Automerge. The abstraction layer makes this migration feasible.

---

### Alternative 3: Hybrid Approach (Both Libraries)

**Description:** Use Y.js for text editing (e.g., notes, announcements) and Automerge for structured tournament state.

**Pros:**

- Best of both worlds (speed for text, correctness for state)
- Flexibility to optimize per use case

**Cons:**

- **Double complexity**: Two CRDT libraries to maintain
- **Increased bundle size**: 650KB+ combined
- **Inconsistent patterns**: Developers must know both APIs
- **Sync complexity**: Coordinating two CRDT systems is error-prone

**Why rejected:** Premature optimization. Start with one library, validate it works for all use cases. If specific use cases demand different CRDTs later (unlikely), we can split then.

---

### Alternative 4: Custom CRDT Implementation

**Description:** Build a tournament-specific CRDT tailored to our exact needs.

**Pros:**

- Perfect fit for our domain
- Maximum performance (only what we need)
- Full control over conflict resolution

**Cons:**

- **High risk**: CRDTs are notoriously hard to implement correctly
- **Months of work**: Likely 4-8 weeks just for CRDT implementation
- **Bug risk**: Conflict resolution edge cases are subtle and dangerous
- **Reinventing the wheel**: Y.js and Automerge solve this problem

**Why rejected:** Building a production-grade CRDT is a 2-3 month project by itself. Our team of 2 developers doesn't have the time or expertise to implement and debug a custom CRDT while also building the entire platform. Use proven libraries.

---

## References

- [Y.js Documentation](https://docs.yjs.dev/)
- [Automerge Documentation](https://automerge.org/docs/)
- [Y.js vs Automerge Comparison (2024)](https://www.inkandswitch.com/local-first/)
- [CRDT Performance Benchmarks](https://github.com/dmonad/crdt-benchmarks)
- [Conflict-Free Replicated Data Types (Paper)](https://hal.inria.fr/hal-00932836/document)
- [Local-First Software Principles](https://www.inkandswitch.com/local-first/)

---

## Notes

**Week 1-2 Evaluation Plan:**

**Day 1-3: Y.js Prototype**

- [ ] Implement tournament state as Y.Doc
- [ ] Test concurrent match updates on 2 clients
- [ ] Simulate offline → online merge scenarios
- [ ] Measure performance with 1000 events
- [ ] Test edge cases: simultaneous bracket updates, concurrent table assignments

**Day 4-5: Evaluate Y.js Results**

- [ ] Review conflict resolution behavior (acceptable?)
- [ ] Check audit trail feasibility (can we track changes?)
- [ ] Assess performance (meets <200ms p50 overlay update target?)
- [ ] Identify any show-stopping limitations

**Day 6-8: Automerge Prototype (If Needed)**

- [ ] Implement same scenarios with Automerge
- [ ] Compare conflict resolution behavior
- [ ] Test audit trail integration
- [ ] Measure performance impact

**Day 9-10: Final Decision**

- [ ] Document findings in this ADR
- [ ] Update status to "Accepted" with chosen library
- [ ] Commit to implementation for week 2+

**Implementation abstraction (to enable migration):**

```typescript
// packages/crdt/src/index.ts
export interface TournamentCRDT {
  applyEvent(event: TournamentEvent): void;
  getState(): TournamentState;
  merge(remote: TournamentCRDT): ConflictResult;
  getHistory(): ChangeEvent[];
  toSnapshot(): Uint8Array;
  fromSnapshot(data: Uint8Array): void;
}

// Implementation lives in separate file
// import { YjsCRDT } from './impls/yjs'
// import { AutomergeCRDT } from './impls/automerge'
```

**Migration cost estimate (if switching Y.js → Automerge):**

- **Before week 4:** 2-3 days work (minimal code written)
- **After week 8:** 1-2 weeks work (lots of refactoring)
- **Mitigation:** Make decision by end of week 2

**Performance acceptance criteria:**

- 1000 events processed in <500ms (Y.js: ~100ms, Automerge: ~300ms)
- Overlay updates p50 <200ms (both should achieve this)
- No UI jank when syncing after 30-minute offline period

**Conflict resolution acceptance criteria:**

- Two TDs update different matches → both updates preserved ✓
- Two TDs assign same table → deterministic winner (no double-booking) ✓
- Two TDs create matches with auto-generated IDs → unique IDs (no collisions) ✓
- TD updates bracket while scorekeeper updates match score → both changes merge correctly ✓

---

## Superseded By

[Will be updated once decision is finalized]

---

## Decision Log (to be filled during Week 1-2)

**Week 1 Testing Results:**

- [ ] Y.js prototype completed: [Date]
- [ ] Performance benchmarks: [Results]
- [ ] Conflict resolution tests: [Pass/Fail + Notes]
- [ ] Automerge prototype needed: [Yes/No + Reason]

**Final Decision:**

- [ ] Library selected: [Y.js / Automerge]
- [ ] Rationale: [Detailed reasoning]
- [ ] Status updated to: Accepted
- [ ] Implementation begins: [Date]
