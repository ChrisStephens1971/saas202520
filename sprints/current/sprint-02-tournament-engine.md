# Sprint 2 - Core Tournament Engine

**Sprint Duration:** Week 3-4 (Nov 18 - Nov 29, 2025)
**Sprint Goal:** Build bracket generation, match lifecycle, table management, ETA calculation, and TD room view
**Status:** ✅ COMPLETE

---

## Sprint Goal

Implement the core tournament engine that powers bracket generation and match management. By the end of this sprint, TDs will be able to:

- Create tournaments with multiple bracket formats (single elim, double elim, round robin, modified single)
- Generate brackets with deterministic seeding (random, skill-based, manual)
- Manage match state (ready → active → completed)
- Assign matches to tables without double-booking
- See real-time ETAs for upcoming matches
- View tournament room status on TD console

This sprint delivers the first user-facing features. Success means a TD can run a basic tournament end-to-end (setup → bracket → assign tables → track progress).

---

## Sprint Capacity

**Available Days:** 10 working days (2 weeks, 2 developers)
**Capacity:** ~160 hours total
**Dependencies from Sprint 1:** CRDT sync, event log, RLS policies must be complete

---

## Sprint Backlog

### High Priority (Must Complete)

| Story           | Description                                         | Estimate | Assignee | Status  |
| --------------- | --------------------------------------------------- | -------- | -------- | ------- |
| **BRACKET-001** | Design bracket generation algorithm (single elim)   | L        | TBD      | 📋 Todo |
| **BRACKET-002** | Implement double elimination (W/L brackets)         | L        | TBD      | 📋 Todo |
| **BRACKET-003** | Implement round robin format                        | M        | TBD      | 📋 Todo |
| **BRACKET-004** | Implement modified single elim                      | M        | TBD      | 📋 Todo |
| **BRACKET-005** | Deterministic bye placement logic                   | M        | TBD      | 📋 Todo |
| **SEED-001**    | Random seeding algorithm                            | S        | TBD      | 📋 Todo |
| **SEED-002**    | Skill-based seeding (rating sort)                   | M        | TBD      | 📋 Todo |
| **SEED-003**    | Manual seeding UI                                   | S        | TBD      | 📋 Todo |
| **MATCH-001**   | Define match state machine (ready/active/completed) | M        | TBD      | 📋 Todo |
| **MATCH-002**   | Implement match progression logic                   | M        | TBD      | 📋 Todo |
| **TABLE-001**   | Create table resource model                         | S        | TBD      | 📋 Todo |
| **TABLE-002**   | Table assignment logic (prevent double-booking)     | M        | TBD      | 📋 Todo |
| **TABLE-003**   | Table locking mechanism                             | M        | TBD      | 📋 Todo |
| **ETA-001**     | Predictive duration model (basic)                   | L        | TBD      | 📋 Todo |
| **ETA-002**     | Ready queue with lookahead (next 3-5 matches)       | M        | TBD      | 📋 Todo |
| **UI-002**      | TD room view (bracket visualization)                | L        | TBD      | 📋 Todo |
| **UI-003**      | Table status board                                  | M        | TBD      | 📋 Todo |
| **UI-004**      | Match assignment interface                          | M        | TBD      | 📋 Todo |

### Medium Priority (Should Complete)

| Story          | Description                                     | Estimate | Assignee | Status  |
| -------------- | ----------------------------------------------- | -------- | -------- | ------- |
| **PLAYER-001** | Player model with contacts                      | M        | TBD      | 📋 Todo |
| **PLAYER-002** | Player registration flow                        | M        | TBD      | 📋 Todo |
| **SPORT-001**  | Sport config versioning (frozen per tournament) | M        | TBD      | 📋 Todo |
| **TEST-002**   | Bracket generation tests (property tests)       | M        | TBD      | 📋 Todo |
| **TEST-003**   | Table assignment race condition tests           | M        | TBD      | 📋 Todo |

### Low Priority (Nice to Have)

| Story         | Description            | Estimate | Assignee | Status  |
| ------------- | ---------------------- | -------- | -------- | ------- |
| **UI-005**    | Bracket export to PDF  | S        | TBD      | 📋 Todo |
| **ADMIN-001** | Tournament settings UI | S        | TBD      | 📋 Todo |

---

## Acceptance Criteria

**Bracket Generation:**

- ✅ 8, 16, 32, 64-player brackets generated correctly
- ✅ Byes distributed evenly (no player gets multiple byes)
- ✅ Seeding is deterministic (same seed → same bracket)
- ✅ Double elim creates W bracket + L bracket correctly

**Match Management:**

- ✅ Match progresses: ready → active → completed
- ✅ Cannot start match until players are available
- ✅ Completed match triggers next round progression

**Table Management:**

- ✅ Two TDs cannot assign same table simultaneously (locking works)
- ✅ Table status updates in real-time across devices
- ✅ Tables blocked until match completes

**ETA Calculation:**

- ✅ ETAs update as matches complete
- ✅ Ready queue shows next 3-5 matches
- ✅ Duration model is configurable (race-to affects estimate)

**TD Room View:**

- ✅ Bracket displays all matches and current round
- ✅ Table board shows which matches are on which tables
- ✅ Updates in real-time (CRDT sync tested)

---

## Links & References

- **Roadmap:** `product/roadmap/2025-Q1-Q2-12-week-launch.md`
- **Sprint 1:** `sprints/current/sprint-01-foundations.md`
- **Project Brief:** `project-brief/ultimate_tournament_platform_prompt.md`
