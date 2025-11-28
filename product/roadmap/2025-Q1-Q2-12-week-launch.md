# Product Roadmap - 12-Week Tournament Platform Launch

**Period:** Q1-Q2 2025 (12 weeks, Complete Build)
**Owner:** Development Team
**Last Updated:** 2025-11-03
**Status:** Approved
**Build Approach:** Complete Build - All features delivered before external beta

---

## Vision & Strategy

### Product Vision

Build the ultimate offline-first tournament platform that runs flawlessly when Wi-Fi doesn't. Tournament directors need software that works reliably in venues with spotty connectivity—no more clipboard fallbacks, no more manually reconciling brackets. Our platform provides conflict-free synchronization, real-time ETAs, automated SMS table calls, transparent payout calculations, and stream overlays that update themselves.

Starting with Pool/Billiards (APA, Fargo, BCA formats), we're architecting for multi-sport expansion from day one. Every feature is built for offline-first reliability, event-sourced auditability, and multi-tenant isolation. Our target: 90% of tournaments finish without manual bracket surgery, venues run 2+ events in their first 30 days, and support tickets stay under 0.1 per event.

### Strategic Themes for 12-Week Build

1. **Offline-First Resilience** - CRDT sync, IndexedDB, conflict-free merges, deterministic state
2. **Complete Pool/Billiards MVP** - All bracket types, chip format, scoring, race-to logic, Fargo integration
3. **Production-Grade Operations** - Stripe payments, SMS notifications, audit logs, security (RLS), observability
4. **Real-World Validation** - Two external beta tournaments (weeks 11-12) before public launch

---

## Roadmap Overview

### Phase 1: Foundations (Weeks 1-2)

**Focus:** Core infrastructure, authentication, multi-tenancy, event sourcing, offline sync

| Feature/Initiative                       | Status      | Owner | Target Date | Priority |
| ---------------------------------------- | ----------- | ----- | ----------- | -------- |
| Auth & org setup (multi-tenant)          | Not Started | Team  | Week 1      | P0       |
| Postgres RLS policies                    | Not Started | Team  | Week 1      | P0       |
| Event-sourced audit log                  | Not Started | Team  | Week 1-2    | P0       |
| CRDT library evaluation (Y.js/Automerge) | Not Started | Team  | Week 1-2    | P0       |
| Local-first IndexedDB + sync service     | Not Started | Team  | Week 2      | P0       |
| Monorepo setup (Turborepo)               | Not Started | Team  | Week 1      | P0       |
| CI/CD pipeline (basic)                   | Not Started | Team  | Week 2      | P1       |

### Phase 2: Core Tournament Engine (Weeks 3-4)

**Focus:** Brackets, match lifecycle, table management, ETA calculation, room view

| Feature/Initiative                     | Status      | Owner | Target Date | Priority |
| -------------------------------------- | ----------- | ----- | ----------- | -------- |
| Bracket generator (single/double elim) | Not Started | Team  | Week 3      | P0       |
| Round robin & modified single elim     | Not Started | Team  | Week 3      | P0       |
| Match state machine (lifecycle)        | Not Started | Team  | Week 3      | P0       |
| Table resource management              | Not Started | Team  | Week 4      | P0       |
| ETA calculation engine                 | Not Started | Team  | Week 4      | P0       |
| Ready queue & scheduling loop          | Not Started | Team  | Week 4      | P0       |
| Room view (TD console PWA)             | Not Started | Team  | Week 4      | P0       |
| Seeding (random, skill-based, manual)  | Not Started | Team  | Week 4      | P1       |

### Phase 3: Scoring & Payments (Weeks 5-6)

**Focus:** Mobile scoring interface, Stripe integration, payout calculation

| Feature/Initiative                      | Status      | Owner | Target Date | Priority |
| --------------------------------------- | ----------- | ----- | ----------- | -------- |
| Mobile-first scoring card               | Not Started | Team  | Week 5      | P0       |
| Illegal-score guards & validation       | Not Started | Team  | Week 5      | P0       |
| Hill-hill sanity checks                 | Not Started | Team  | Week 5      | P0       |
| Undo with audit trail                   | Not Started | Team  | Week 5      | P0       |
| Stripe Connect onboarding               | Not Started | Team  | Week 6      | P0       |
| Entry fee collection & receipts         | Not Started | Team  | Week 6      | P0       |
| Refund workflows                        | Not Started | Team  | Week 6      | P0       |
| Payout calculator (side pots/calcuttas) | Not Started | Team  | Week 6      | P0       |
| Printable payout sheet (PDF)            | Not Started | Team  | Week 6      | P1       |

### Phase 4: Notifications & Kiosk (Weeks 7-8)

**Focus:** SMS/email notifications, chip format, kiosk mode

| Feature/Initiative                | Status      | Owner | Target Date | Priority |
| --------------------------------- | ----------- | ----- | ----------- | -------- |
| In-app notifications              | Not Started | Team  | Week 7      | P0       |
| Email notifications (templates)   | Not Started | Team  | Week 7      | P0       |
| SMS "table now" & "up in 5"       | Not Started | Team  | Week 7      | P0       |
| SMS dedupe & throttling           | Not Started | Team  | Week 7      | P0       |
| SMS consent & STOP/HELP handling  | Not Started | Team  | Week 7      | P1       |
| Chip format queue engine          | Not Started | Team  | Week 8      | P0       |
| Kiosk mode (player self-check-in) | Not Started | Team  | Week 8      | P0       |
| Late entry & no-show handling     | Not Started | Team  | Week 8      | P1       |
| Reseed guardrails                 | Not Started | Team  | Week 8      | P1       |

### Phase 5: Pool-Specific Features (Weeks 9-10)

**Focus:** Handicap systems, race calculations, break rules, Fargo integration

| Feature/Initiative                    | Status      | Owner | Target Date | Priority |
| ------------------------------------- | ----------- | ----- | ----------- | -------- |
| Race-to logic (8-ball/9-ball)         | Not Started | Team  | Week 9      | P0       |
| Break rules (alternate/winner)        | Not Started | Team  | Week 9      | P0       |
| 3-foul toggle & enforcement           | Not Started | Team  | Week 9      | P0       |
| APA handicap adapter                  | Not Started | Team  | Week 9      | P0       |
| Fargo rating adapter                  | Not Started | Team  | Week 10     | P0       |
| Fargo export preflight validation     | Not Started | Team  | Week 10     | P0       |
| Fargo upload outbox (clean export)    | Not Started | Team  | Week 10     | P0       |
| "Why not" reasons for invalid exports | Not Started | Team  | Week 10     | P1       |

### Phase 6: Polish, Testing, Beta (Weeks 11-12)

**Focus:** Chaos testing, documentation, venue presets, external beta tournaments

| Feature/Initiative                 | Status      | Owner | Target Date | Priority |
| ---------------------------------- | ----------- | ----- | ----------- | -------- |
| Chaos testing (offline flapping)   | Not Started | Team  | Week 11     | P0       |
| Conflict resolution stress tests   | Not Started | Team  | Week 11     | P0       |
| RLS policy automated tests         | Not Started | Team  | Week 11     | P0       |
| Integration tests (full workflows) | Not Started | Team  | Week 11     | P0       |
| Documentation (user guides)        | Not Started | Team  | Week 11     | P1       |
| Venue preset templates             | Not Started | Team  | Week 11     | P1       |
| Beta tournament 1 (live venue)     | Not Started | Team  | Week 11     | P0       |
| Beta tournament 2 (live venue)     | Not Started | Team  | Week 12     | P0       |
| Bug fixes from beta feedback       | Not Started | Team  | Week 12     | P0       |
| Performance optimization           | Not Started | Team  | Week 12     | P1       |

---

## Detailed Feature Breakdown

### 1. Offline-First Sync Architecture

**Problem:** Tournament venues often have unreliable Wi-Fi. TDs need to run tournaments without losing data or creating conflicts when connectivity drops.

**Solution:**

- IndexedDB for local storage on each TD device
- CRDT (Y.js or Automerge) for conflict-free state synchronization
- WebSocket sync service with deterministic merge logic
- Projections derived from append-only event stream

**Impact:**

- Zero downtime for tournaments when Wi-Fi fails
- Multiple TDs can work simultaneously without conflicts
- Deterministic audit trail for compliance and debugging

**Effort:** Large (Weeks 1-2, foundational)
**Dependencies:** CRDT library selection (ADR-003)
**Status:** Not Started
**PRD:** TBD (Week 1)

---

### 2. Event-Sourced Audit Log

**Problem:** Tournament integrity requires immutable record of all changes (scoring, bracket updates, payments). Disputes demand proof of what happened, when, and by whom.

**Solution:**

- Append-only `tournament_events` table with actor, device, timestamp
- All state derived from event replay (projections)
- Immutable diffs for every change
- Export to CSV/JSON/PDF for dispute evidence

**Impact:**

- Complete auditability for Fargo reporting and disputes
- Enables undo/redo functionality
- Simplifies debugging (replay events to reproduce bugs)

**Effort:** Medium (Weeks 1-2)
**Dependencies:** Postgres setup, RLS policies
**Status:** Not Started
**PRD:** TBD (Week 1)

---

### 3. Bracket Generator (All Formats)

**Problem:** TDs need automated bracket generation for single elimination, double elimination (winner/loser brackets), round robin, modified single elim, and chip formats.

**Solution:**

- Deterministic seeding algorithms (random, skill-based, manual)
- Bye placement logic (balanced across rounds)
- Bracket templates per sport configuration
- State machine for match lifecycle (ready → active → completed)

**Impact:**

- Eliminates manual bracket setup (30-60 minutes saved per tournament)
- Ensures fair seeding and bye distribution
- Supports all common pool tournament formats

**Effort:** Large (Weeks 3-4)
**Dependencies:** Event log, match model, sport configs
**Status:** Not Started
**PRD:** TBD (Week 2-3)

---

### 4. ETA Calculation & Table Assignment

**Problem:** Players and spectators want to know "when am I up?" TDs need to assign matches to tables efficiently without double-booking.

**Solution:**

- Predictive duration model (based on race-to, player skill)
- Ready queue with configurable lookahead (next 3-5 matches)
- Table resource locking (prevent concurrent assignment)
- ETA updates on room view and player devices

**Impact:**

- Reduces player confusion and "when am I up?" questions
- Optimizes table utilization (fewer idle tables)
- Improves tournament flow and spectator experience

**Effort:** Medium (Week 4)
**Dependencies:** Bracket generator, match state machine, table model
**Status:** Not Started
**PRD:** TBD (Week 3-4)

---

### 5. Mobile-First Scoring Interface

**Problem:** Scorekeepers need fast, error-resistant scoring on phones/tablets. Illegal scores (e.g., score exceeds race-to) must be prevented.

**Solution:**

- Touch-optimized scoring card (large buttons, minimal taps)
- Real-time validation (race-to logic, illegal score guards)
- Hill-hill detection with confirmation prompt
- Undo with audit trail (last 3 actions)

**Impact:**

- Faster scoring (15-20 seconds per game vs. 60+ seconds manual entry)
- Reduces scoring errors by 90%+
- Improves scorekeeper experience (less frustration)

**Effort:** Medium (Week 5)
**Dependencies:** Match model, event log, sport config rules
**Status:** Not Started
**PRD:** TBD (Week 4-5)

---

### 6. Stripe Connect Payments

**Problem:** Venues need to collect entry fees, issue receipts, handle refunds, and generate payout sheets. Manual cash handling is error-prone and lacks transparency.

**Solution:**

- Stripe Connect onboarding flow for venues
- Entry fee collection with automatic receipts
- Refund workflows with audit trail
- Payout calculator (entry fees → prizes, side pots, calcuttas as ledger entries)
- Printable payout sheet (PDF export)

**Impact:**

- Transparent money handling (reduces disputes)
- Automated receipts and refund processing
- Stripe handles PCI compliance (security win)
- Printable payout sheets for cash tournaments

**Effort:** Large (Weeks 6)
**Dependencies:** Event log, payment ledger model, Stripe account
**Status:** Not Started
**PRD:** TBD (Week 5-6)

---

### 7. SMS Notifications (Table Calls)

**Problem:** Players miss table calls or don't know when they're up next. TDs spend time manually calling out names.

**Solution:**

- SMS "table now" when match assigned (< 2s delivery, >98% success)
- SMS "you're up in 5" for next matches in ready queue
- Dedupe (no duplicate pings within 2 minutes)
- Throttling (respect opt-in, quiet hours)
- STOP/HELP handling for compliance

**Impact:**

- Reduces no-shows and delays
- Frees up TD from manual table calls
- Improves player experience (no need to watch bracket constantly)

**Effort:** Medium (Week 7)
**Dependencies:** Twilio account, notification model, table assignment logic
**Status:** Not Started
**PRD:** TBD (Week 6-7)

---

### 8. Chip Format Queue Engine

**Problem:** "Chip" tournaments use queue-based play (no brackets). Players accumulate chips, top chip-holders advance to finals.

**Solution:**

- Non-bracket engine with chip counters
- Queue-based match assignment (next available players)
- Chip accumulation tracking
- Finals cutoff logic (e.g., top 8 by chips)

**Impact:**

- Supports popular pool tournament format
- Expands addressable market (chip tournaments are 20-30% of pool events)

**Effort:** Medium (Week 8)
**Dependencies:** Match model, queue logic, sport config
**Status:** Not Started
**PRD:** TBD (Week 7-8)

---

### 9. Fargo Rating Integration

**Problem:** Pool tournaments require submitting results to Fargo for official ratings. Unsupported formats or missing data cause rejections.

**Solution:**

- Preflight validation (check required fields: player names, ratings, match outcomes)
- Clean export to Fargo-compatible format
- Upload outbox with human-readable "why not" reasons for invalid exports
- Explicit error messages (e.g., "Player 'John Doe' missing Fargo ID")

**Impact:**

- Enables official-rated tournaments (market requirement)
- Reduces Fargo submission errors by 95%+
- Saves TDs 30-60 minutes of manual data cleanup

**Effort:** Medium (Weeks 9-10)
**Dependencies:** Player model, match results, Fargo API documentation
**Status:** Not Started
**PRD:** TBD (Week 9)

---

### 10. Kiosk Mode (Player Self-Check-In)

**Problem:** TDs spend 15-30 minutes at tournament start doing manual check-ins. Players arrive at different times, creating bottlenecks.

**Solution:**

- Kiosk mode PWA (tablet at venue entrance)
- Player self-check-in (scan QR code or search name)
- Automatic status update (registered → checked in)
- PIN-protected TD console (prevent unauthorized changes)

**Impact:**

- Reduces TD workload at tournament start
- Faster tournament start (no check-in bottleneck)
- Better player experience (self-service)

**Effort:** Small (Week 8)
**Dependencies:** Auth, player model, PWA setup
**Status:** Not Started
**PRD:** TBD (Week 7-8)

---

### 11. Chaos Testing & Resilience

**Problem:** Offline-first architecture is complex. Must validate that sync works correctly under network partitions, concurrent updates, and device failures.

**Solution:**

- Automated chaos tests (toggle Wi-Fi on/off, simulate conflicts)
- Stress tests (2+ devices updating simultaneously for 30 minutes)
- Validation: no data loss, deterministic merge, audit log replay matches final state
- Integration tests for full workflows (registration → bracket → scoring → payout)

**Impact:**

- De-risks launch (catches sync bugs before production)
- Builds confidence in offline-first architecture
- Validates acceptance criteria (64-player tournament on 2 devices, Wi-Fi off 30 min)

**Effort:** Medium (Week 11)
**Dependencies:** All core features complete, test harness setup
**Status:** Not Started
**PRD:** TBD (Week 10-11)

---

## Success Metrics

### Key Results for 12-Week Build

| Metric                            | Target                                                | Measurement                  | Status         |
| --------------------------------- | ----------------------------------------------------- | ---------------------------- | -------------- |
| **All features complete**         | 100% of scope shipped                                 | Feature completion checklist | 🟡 Not Started |
| **Acceptance criteria met**       | 100% pass rate                                        | Automated test suite         | 🟡 Not Started |
| **Beta tournaments completed**    | 2 external venues                                     | Live tournament runs         | 🟡 Not Started |
| **Critical bugs**                 | <5 after beta                                         | Bug tracker count            | 🟡 Not Started |
| **Performance (overlay updates)** | p50 <200ms, p95 <600ms                                | Monitoring metrics           | 🟡 Not Started |
| **Offline test**                  | 64 players, 2 devices, Wi-Fi off 30 min, no data loss | Chaos test pass              | 🟡 Not Started |

### Post-Launch Targets (First 60 Days)

| Metric                                 | Current              | Target | Status         |
| -------------------------------------- | -------------------- | ------ | -------------- |
| Tournaments finish w/o manual fixes    | 0% (no launches yet) | 90%    | 🟡 Not Started |
| Corrections per 50 matches post-finals | N/A                  | <1     | 🟡 Not Started |
| Venues running 2+ events in 30 days    | N/A                  | 60%    | 🟡 Not Started |
| Support tickets per event              | N/A                  | <0.1   | 🟡 Not Started |

---

## Resource Allocation

### Team Capacity

- **Engineering:** 2 developers (full-stack)
- **Design:** Self-service (shadcn/ui + Tailwind)
- **Product:** Team-led (no dedicated PM)

### Effort Distribution (12-Week Build)

- **60%** - Core features (brackets, scoring, sync, payments)
- **20%** - Infrastructure & DevOps (CI/CD, RLS, observability)
- **15%** - Testing & QA (chaos tests, integration tests, beta validation)
- **5%** - Documentation & polish

### Sprint Cadence

- **2-week sprints** (6 sprints total)
- Daily standups (async or sync, team decides)
- Sprint reviews at end of each phase (weeks 2, 4, 6, 8, 10, 12)

---

## Risks and Dependencies

| Risk/Dependency                             | Impact                                 | Mitigation                                                           | Owner |
| ------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- | ----- |
| **CRDT library choice** (Y.js vs Automerge) | High - affects weeks 1-2 foundation    | Evaluate both in week 1-2, decide by end of week 2                   | Team  |
| **Offline sync complexity**                 | High - core requirement, hard to debug | Invest extra time in weeks 1-2, chaos tests in week 11               | Team  |
| **Stripe Connect approval delays**          | Medium - blocks payment testing        | Apply early (week 5), use Stripe test mode for development           | Team  |
| **Fargo API documentation**                 | Medium - needed for integration        | Research early (week 9), contact Fargo if docs insufficient          | Team  |
| **Beta venue availability**                 | Medium - needed for validation         | Line up 2 venues by week 8, backup venues if needed                  | Team  |
| **RLS policy bugs**                         | High - security risk                   | Automated tests (week 11), manual penetration testing                | Team  |
| **Performance bottlenecks**                 | Medium - affects UX                    | Profile early (week 8), optimize in week 12 if needed                | Team  |
| **Team burnout**                            | High - aggressive timeline             | Monitor velocity, adjust scope if falling behind, prioritize P0 only | Team  |

---

## What We're NOT Doing (Explicitly Deferred)

Clear scope boundaries for 12-week build:

- ❌ **Additional sports** (soccer, darts, cornhole) - Multi-sport expansion deferred to v2.0 (post-launch)
- ❌ **Native mobile apps** - PWA only for MVP, native apps if demand warrants
- ❌ **Advanced analytics** (player performance history, venue dashboards) - Post-launch feature
- ❌ **Streaming integrations** (OBS plugins, Twitch/YouTube auto-publish) - Read-only JSON/SSE endpoints only
- ❌ **Social features** (player profiles, leaderboards, messaging) - Not in v1 scope
- ❌ **White-label customization** - Single brand for launch, white-label in v2 if enterprise demand
- ❌ **Third-party integrations** (Challonge import, BCA tournament sync) - Post-launch if requested
- ❌ **Advanced handicap systems** (BCA, WPBA) - APA + Fargo only for MVP
- ❌ **Multi-language support** - English only for launch (US market focus)

---

## Decision Log

| Date       | Decision                                                       | Rationale                                                                                                                  |
| ---------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 2025-11-03 | Complete Build approach (12 weeks, all features before launch) | Project brief specifies comprehensive feature set, team wants to validate full offline-first architecture before launching |
| 2025-11-03 | Monorepo with Turborepo                                        | ADR-001: Shared types, CRDT logic, validation across web + sync service                                                    |
| 2025-11-03 | Prisma ORM                                                     | ADR-002: Best DX for 2-person team, type safety, migration tooling                                                         |
| 2025-11-03 | CRDT library TBD (Y.js vs Automerge)                           | ADR-003: Evaluate both in weeks 1-2, decide based on conflict resolution testing                                           |
| 2025-11-03 | Pool/Billiards MVP first, multi-sport deferred                 | Focus on one sport for validation, architecture supports multi-sport expansion                                             |
| 2025-11-03 | PWA only (no native apps)                                      | PWA provides offline-first + kiosk mode, native apps add 4-6 weeks to timeline                                             |
| 2025-11-03 | 2-week sprint cadence                                          | Balances planning overhead with flexibility, 6 sprints = 6 milestones                                                      |

---

## Feedback and Questions

**For team discussion:**

- Do we need daily standups, or can we operate async? (Decide by end of week 1)
- Who owns which domains? (e.g., one dev = frontend + CRDT, other dev = backend + payments?) (Decide by end of week 1)
- What's our backup plan if CRDT proves too complex? (Discussed in ADR-003: fallback to simpler last-write-wins with manual conflict resolution)
- How do we prioritize if we fall behind schedule? (P0 features only, defer P1/P2 to post-launch)

---

## Revision History

| Date       | Changes                                            | Updated By            |
| ---------- | -------------------------------------------------- | --------------------- |
| 2025-11-03 | Initial 12-week roadmap created from project brief | Claude (AI Assistant) |

---

## Links & References

- **Project Brief:** `project-brief/ultimate_tournament_platform_prompt.md`
- **Architecture Decisions:** `technical/adr/001-monorepo-architecture.md`, `002-orm-selection-prisma.md`, `003-crdt-library-selection.md`
- **Sprint Plans:** `sprints/current/` (to be created)
- **OKRs:** `business/okrs/` (to be created)
- **Multi-Tenant Architecture:** `technical/multi-tenant-architecture.md`
