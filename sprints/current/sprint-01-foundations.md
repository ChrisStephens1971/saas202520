# Sprint 1 - Foundations & Architecture

**Sprint Duration:** Week 1-2 (Nov 4 - Nov 15, 2025)
**Sprint Goal:** Establish core infrastructure, multi-tenant architecture, event sourcing, and offline-first sync foundation
**Status:** Planning

---

## Sprint Goal

Lay the foundational architecture for the offline-first tournament platform. By the end of this sprint, we will have:
- Monorepo set up with Turborepo, Next.js web app, and Fastify sync service
- Multi-tenant authentication with Postgres RLS policies
- Event-sourced audit log (append-only `tournament_events` table)
- CRDT library evaluation and selection (Y.js vs Automerge)
- Basic local-first sync (IndexedDB → WebSocket → Postgres)
- CI/CD pipeline for automated testing and deployment

This sprint is 100% infrastructure—no user-facing features yet. Success means developers can build features on a solid, scalable foundation in future sprints.

---

## Sprint Capacity

**Available Days:** 10 working days (2 weeks, 2 developers)
**Capacity:** ~160 hours total (80 hours per developer)
**Commitments/Time Off:** None known
**Team:** 2 full-stack developers

---

## Sprint Backlog

### High Priority (Must Complete)

| Story | Description | Estimate | Assignee | Status | Notes |
|-------|-------------|----------|----------|--------|-------|
| **INFRA-001** | Set up monorepo with Turborepo | M | TBD | 📋 Todo | See ADR-001 |
| **INFRA-002** | Create Next.js app in `apps/web` | S | TBD | 📋 Todo | App Router, TypeScript, Tailwind |
| **INFRA-003** | Create Fastify sync service in `apps/sync-service` | S | TBD | 📋 Todo | WebSocket support |
| **INFRA-004** | Set up shared packages (`shared`, `crdt`, `events`) | M | TBD | 📋 Todo | TypeScript path aliases |
| **AUTH-001** | Implement multi-tenant authentication | L | TBD | 📋 Todo | Next-auth or Auth.js |
| **AUTH-002** | Add organization (tenant) model and setup | M | TBD | 📋 Todo | `orgs` table with RLS |
| **DB-001** | Set up Postgres with Prisma ORM | M | TBD | 📋 Todo | See ADR-002 |
| **DB-002** | Create initial schema (orgs, users, tournaments, tournament_events) | M | TBD | 📋 Todo | Prisma migrations |
| **DB-003** | Implement RLS policies for tenant isolation | L | TBD | 📋 Todo | Test cross-tenant access prevention |
| **EVENT-001** | Design event-sourced architecture | M | TBD | 📋 Todo | Event schemas, projections |
| **EVENT-002** | Implement `tournament_events` append-only table | M | TBD | 📋 Todo | Actor, device, timestamp, payload JSON |
| **SYNC-001** | Evaluate Y.js for offline-first sync | L | TBD | 📋 Todo | Days 1-3, prototype |
| **SYNC-002** | Evaluate Automerge for offline-first sync | M | TBD | 📋 Todo | Days 4-6, prototype (if needed) |
| **SYNC-003** | Make CRDT library decision | S | TBD | 📋 Todo | Update ADR-003, days 7-8 |
| **SYNC-004** | Implement IndexedDB storage layer | M | TBD | 📋 Todo | Local tournament state |
| **SYNC-005** | Build WebSocket sync service (basic) | L | TBD | 📋 Todo | CRDT sync over WS |
| **SYNC-006** | Test offline → online sync (2 clients) | M | TBD | 📋 Todo | Validate conflict-free merge |

### Medium Priority (Should Complete)

| Story | Description | Estimate | Assignee | Status | Notes |
|-------|-------------|----------|----------|--------|-------|
| **INFRA-005** | Set up ESLint, Prettier, TypeScript configs | S | TBD | 📋 Todo | Shared in `packages/config` |
| **INFRA-006** | Configure Turborepo caching | S | TBD | 📋 Todo | Optimize build times |
| **CI-001** | Create GitHub Actions CI pipeline | M | TBD | 📋 Todo | Lint, test, build |
| **CI-002** | Set up Docker compose for local dev | S | TBD | 📋 Todo | Postgres, Redis |
| **TEST-001** | Set up testing framework (Vitest/Jest) | S | TBD | 📋 Todo | Unit + integration tests |
| **OBS-001** | Add basic observability (Sentry, logging) | S | TBD | 📋 Todo | Error tracking setup |

### Low Priority (Nice to Have)

| Story | Description | Estimate | Assignee | Status | Notes |
|-------|-------------|----------|----------|--------|-------|
| **DOC-001** | Write architecture documentation | M | TBD | 📋 Todo | System diagrams, data flow |
| **DEV-001** | Create seed scripts for development data | S | TBD | 📋 Todo | Sample orgs, users, tournaments |
| **UI-001** | Set up shadcn/ui component library | S | TBD | 📋 Todo | Button, Card, Form components |

**Story Status Legend:**
- 📋 Todo
- 🏗️ In Progress
- 👀 In Review
- ✅ Done
- ❌ Blocked

---

## Technical Debt / Maintenance

Items that need attention but aren't new features:

- [ ] Configure environment variables pattern (`.env.example`)
- [ ] Set up pre-commit hooks (Husky) for linting
- [ ] Document local development setup in README
- [ ] Create contribution guidelines (if open-sourcing later)

---

## Daily Progress

### Week 1, Day 1 (Monday - Nov 4, 2025)
**What I worked on:**
- ✅ Monorepo initialization with Turborepo + pnpm workspaces
- ✅ Next.js 16 app created (TypeScript, Tailwind, App Router, ESLint)
- ✅ Fastify sync service with WebSocket support
- ✅ Shared packages created (@tournament/shared, @tournament/crdt, @tournament/events, @tournament/validation)
- ✅ Prisma schema with complete domain model (orgs, tournaments, players, matches, tables, events)
- ✅ Docker Compose updated (Postgres, Redis)
- ✅ Initial database migration applied
- ✅ RLS policies implemented for multi-tenant isolation
- ✅ Environment variables configured

**Blockers:**
- None

**Plan for tomorrow:**
- Test monorepo dev workflow (`pnpm dev` runs all services)
- Start Y.js CRDT evaluation (prototype)
- Set up authentication scaffolding

---

### Week 1, Day 2-3 (Tuesday-Wednesday - Nov 5-6, 2025)
**What I worked on:**
- ✅ Y.js CRDT implementation complete
  - TournamentDoc class with full CRUD operations (tournaments, players, matches, tables)
  - WebSocket provider for sync
  - Event log tracking (append-only audit trail)
  - Snapshot & update handling for persistence
- ✅ Sync service upgraded for Y.js protocol
  - Room manager for multi-tournament sync
  - Y.js sync protocol handler (MESSAGE_SYNC, MESSAGE_AWARENESS)
  - Automatic room cleanup
  - Health endpoint with room stats
- ✅ Authentication models added to Prisma
  - User model (email, password, emailVerified)
  - Account model (OAuth providers)
  - Session model (session tokens)
  - VerificationToken model
  - OrganizationMember linked to User
- ✅ Prisma client singleton created
  - Single instance pattern (connection pool management)
  - Tenant context helpers (setTenantContext, withTenantContext)
  - Development logging enabled
- ✅ Database baseline established
  - All models migrated cleanly
  - Migration: 20251103163100_init (complete schema + auth)

**Blockers:**
- Migration state issues resolved (baseline approach)

**Plan for tomorrow:**
- Test Y.js sync between 2 clients (manual validation)
- Implement basic authentication flow with NextAuth.js
- Create simple TD console UI

---

### Week 1, Day 3 (Wednesday)
**What I worked on:**
-

**Blockers:**
-

**Plan for tomorrow:**
-

---

### Week 1, Day 4 (Thursday)
**What I worked on:**
-

**Blockers:**
-

**Plan for tomorrow:**
-

---

### Week 1, Day 5 (Friday)
**What I worked on:**
-

**Blockers:**
-

**Plan for next week:**
-

---

### Week 2, Day 6 (Monday)
**What I worked on:**
-

**Blockers:**
-

**Plan for tomorrow:**
-

---

### Week 2, Day 7 (Tuesday)
**What I worked on:**
-

**Blockers:**
-

**Plan for tomorrow:**
-

---

### Week 2, Day 8 (Wednesday)
**What I worked on:**
-

**Blockers:**
-

**Plan for tomorrow:**
-

---

### Week 2, Day 9 (Thursday)
**What I worked on:**
-

**Blockers:**
-

**Plan for tomorrow:**
-

---

### Week 2, Day 10 (Friday)
**What I worked on:**
-

**Blockers:**
-

**Plan for next sprint:**
-

---

## Scope Changes

Document any stories added or removed during the sprint:

| Date | Change | Reason |
|------|--------|--------|
| - | - | - |

---

## Sprint Metrics

### Planned vs Actual
- **Planned:** 16 High Priority + 6 Medium Priority = 22 stories
- **Completed:** TBD (track during sprint)
- **Completion Rate:** TBD

### Velocity
- **Previous Sprint:** N/A (first sprint)
- **This Sprint:** TBD (establish baseline)
- **Trend:** N/A

**Sizing Guide:**
- XS = 2-4 hours
- S = 4-8 hours (half day)
- M = 8-16 hours (1-2 days)
- L = 16-32 hours (2-4 days)
- XL = 32+ hours (4+ days, should be broken down)

---

## Acceptance Criteria

### Sprint 1 Success Metrics

**Infrastructure:**
- ✅ Monorepo builds successfully (`pnpm build`)
- ✅ Web app runs locally (`pnpm dev`)
- ✅ Sync service runs locally
- ✅ All tests pass (`pnpm test`)

**Multi-Tenancy:**
- ✅ RLS policies enforce tenant isolation (automated test proves cross-tenant access fails)
- ✅ Authentication flow works (login → org context set → queries scoped to org)

**Event Sourcing:**
- ✅ `tournament_events` table receives events
- ✅ Events include actor, device, timestamp, payload
- ✅ Basic projection rebuilds state from events

**Offline Sync:**
- ✅ CRDT library selected (ADR-003 updated to "Accepted")
- ✅ IndexedDB stores tournament state locally
- ✅ 2 clients can update offline → merge when online with no data loss
- ✅ Merge is deterministic (running test 10 times yields same result)

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **CRDT evaluation takes too long** | High - blocks sync implementation | Time-box Y.js to days 1-3, Automerge to days 4-6. If both fail, fallback to last-write-wins + manual conflict resolution (document in ADR) |
| **RLS policies complex** | Medium - security critical | Dedicate 1 full developer to RLS testing, use automated test suite |
| **Authentication setup takes >1 day** | Medium - delays other work | Use Next-auth quickstart, defer custom flows to later sprint |
| **Two developers stepping on each other** | Medium - merge conflicts, wasted time | Define clear ownership: Dev 1 = frontend + CRDT, Dev 2 = backend + DB + RLS. Communicate daily. |

---

## Wins & Learnings

### What Went Well
- TBD (fill out at sprint end)

### What Could Be Improved
- TBD (fill out at sprint end)

### Action Items for Next Sprint
- [ ] TBD
- [ ] TBD

---

## Sprint Review Notes

**What We Shipped:**
- TBD (infrastructure, not user-facing features)

**Demo Notes:**
- Demo: 2 browsers updating tournament state offline, merge when reconnected
- Demo: Cross-tenant access blocked by RLS policies
- Demo: Event log replay rebuilds state correctly

**Feedback Received:**
- TBD (internal team feedback)

---

## Links & References

- **Roadmap:** `product/roadmap/2025-Q1-Q2-12-week-launch.md`
- **ADR-001:** Monorepo Architecture (`technical/adr/001-monorepo-architecture.md`)
- **ADR-002:** Prisma ORM (`technical/adr/002-orm-selection-prisma.md`)
- **ADR-003:** CRDT Library Selection (`technical/adr/003-crdt-library-selection.md`)
- **Multi-Tenant Architecture:** `technical/multi-tenant-architecture.md`
- **Project Brief:** `project-brief/ultimate_tournament_platform_prompt.md`

---

## Definition of Done (Sprint 1)

A story is "Done" when:
- [ ] Code is written and passes TypeScript checks
- [ ] Unit tests written and passing (where applicable)
- [ ] Code reviewed by other developer (pair programming or PR review)
- [ ] Merged to main branch
- [ ] No new TypeScript errors or linter warnings
- [ ] Documentation updated (if public API changes)

Infrastructure is "Done" when:
- [ ] README has setup instructions
- [ ] All developers can run locally without issues
- [ ] CI pipeline is green
- [ ] Docker compose works for local Postgres/Redis

---

## Notes for Team

**Week 1 Focus:** Infrastructure setup + CRDT evaluation
**Week 2 Focus:** Sync implementation + RLS testing

**Key decision point:** End of Week 1, decide on CRDT library. Cannot proceed to Week 2 sync implementation without this decision.

**Daily standup format (suggested):**
- What I did yesterday
- What I'm doing today
- Any blockers?
- (Keep it under 10 minutes, async in Slack/Discord is fine)

**Pairing opportunities:**
- RLS policy testing (complex, benefits from two sets of eyes)
- CRDT evaluation (both devs should understand the choice)
- Sync service architecture (foundational, should be collaborative)

**Communication:**
- Update this sprint doc daily with progress
- Mark stories in progress/done in real-time
- Flag blockers immediately (don't wait for standup)
