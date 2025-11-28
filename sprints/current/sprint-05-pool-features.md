# Sprint 5 - Pool-Specific Features

**Sprint Duration:** Week 9-10 (Dec 30 - Jan 10, 2026)
**Sprint Goal:** Implement pool/billiards-specific rules, handicaps, and Fargo integration
**Status:** Planning

---

## Sprint Goal

Add pool-specific features that make this a complete Pool/Billiards tournament platform. By the end of this sprint:

- Race-to logic enforced (8-ball, 9-ball)
- Break rules configurable (alternate/winner)
- 3-foul rule toggle
- APA and Fargo handicap systems integrated
- Fargo export with preflight validation
- "Why not" error messages for invalid exports

Success means platform supports all major pool tournament rules and integrates with Fargo rating system.

---

## Sprint Capacity

**Available Days:** 10 working days
**Capacity:** ~160 hours total
**Dependencies from Sprint 4:** Sport config model, scoring system

---

## Sprint Backlog

### High Priority (Must Complete)

| Story         | Description                               | Estimate | Assignee | Status  |
| ------------- | ----------------------------------------- | -------- | -------- | ------- |
| **POOL-001**  | Race-to logic (8-ball/9-ball)             | M        | TBD      | 📋 Todo |
| **POOL-002**  | Break rule implementation (alternate)     | M        | TBD      | 📋 Todo |
| **POOL-003**  | Break rule implementation (winner breaks) | S        | TBD      | 📋 Todo |
| **POOL-004**  | 3-foul toggle & enforcement               | M        | TBD      | 📋 Todo |
| **POOL-005**  | Table size configuration                  | S        | TBD      | 📋 Todo |
| **POOL-006**  | Jump cue policy setting                   | S        | TBD      | 📋 Todo |
| **HANDI-001** | APA handicap adapter                      | L        | TBD      | 📋 Todo |
| **HANDI-002** | APA race calculation                      | M        | TBD      | 📋 Todo |
| **FARGO-001** | Fargo rating adapter                      | M        | TBD      | 📋 Todo |
| **FARGO-002** | Fargo export preflight validation         | L        | TBD      | 📋 Todo |
| **FARGO-003** | Fargo-compatible format export            | M        | TBD      | 📋 Todo |
| **FARGO-004** | Upload outbox with error reasons          | M        | TBD      | 📋 Todo |
| **FARGO-005** | "Why not" error messages                  | M        | TBD      | 📋 Todo |

### Medium Priority (Should Complete)

| Story         | Description                             | Estimate | Assignee | Status  |
| ------------- | --------------------------------------- | -------- | -------- | ------- |
| **POOL-007**  | Venue preset templates (APA, BCA, etc.) | M        | TBD      | 📋 Todo |
| **HANDI-003** | Handicap calculator UI                  | S        | TBD      | 📋 Todo |
| **TEST-006**  | Race calculation tests                  | M        | TBD      | 📋 Todo |
| **TEST-007**  | Fargo export validation tests           | M        | TBD      | 📋 Todo |

---

## Acceptance Criteria

**Pool Rules:**

- ✅ Race-to enforced correctly (8-ball and 9-ball)
- ✅ Break alternates or winner breaks (configurable)
- ✅ 3-foul rule triggers correctly when enabled

**Handicaps:**

- ✅ APA races calculated correctly (skill level → race-to)
- ✅ Fargo ratings integrate with bracket seeding

**Fargo Integration:**

- ✅ Unsupported formats blocked with clear reasons
- ✅ Supported formats export cleanly
- ✅ Missing player Fargo IDs flagged before export
- ✅ Export outbox shows human-readable errors

---

## Links & References

- **Roadmap:** `product/roadmap/2025-Q1-Q2-12-week-launch.md`
- **Sprint 4:** `sprints/current/sprint-04-notifications-kiosk.md`
