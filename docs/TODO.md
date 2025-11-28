# Tournament Platform - TODO List

**Last Updated:** 2025-11-15

**Primary Objective:** Get this tournament platform into a state where a developer can clone, run locally, and a Tournament Director can run a live event through the console UI.

**Approach:** Work in phases, completing each task before moving to the next. Each item should be completable in one focused work session.

---

## 🎯 Phase 0: Discovery & Reality Check

**Goal:** Understand what exists, what's missing, and what doesn't match reality.

- [x] Scan repository structure
- [x] Identify app entrypoints and architecture
- [x] Check database schema, migrations, seed data
- [x] Verify auth implementation
- [x] Review sync-service status
- [x] Check CI/CD workflows
- [x] Detect README/docs mismatches
- [x] Create PROJECT_LOG.md
- [x] Create TODO.md (this file)

**Status:** ✅ COMPLETE

---

## 🚀 Phase 1: Local Dev Bootstrap (CRITICAL PATH)

**Goal:** Make it trivially easy for a developer to clone and run the app locally end-to-end.

**Status:** 🔴 NOT STARTED

### 1.1 - Environment & Documentation

- [ ] **Consolidate .env.example files**
  - Decide: Use root .env or apps/web/.env or both?
  - Create ONE canonical .env.example with all required vars clearly documented
  - Include sections: Database, Auth, Redis, Stripe (test), Twilio (optional), SMTP (optional)
  - Mark which vars are REQUIRED vs OPTIONAL for local dev
  - Add comments explaining each variable

- [ ] **Rewrite README.md**
  - Remove generic planning template content (completely wrong for this project!)
  - Write tournament platform-specific README:
    - What is this? (Tournament Platform for Pool/Billiards)
    - Tech stack overview (Next.js 16, React 19, Prisma, PostgreSQL, etc.)
    - Prerequisites (Node 20+, pnpm 10+, PostgreSQL 16+)
    - Quick Start section (5-10 steps to run locally)
    - Key features overview
    - Links to detailed docs

- [ ] **Create docs/LOCAL_DEV.md**
  - Detailed step-by-step local setup guide
  - Database setup (PostgreSQL installation, createdb, connection string)
  - Environment variable configuration
  - Installation steps (pnpm install, db:generate, db:migrate, db:seed)
  - Running the dev server
  - Accessing the app (login credentials from seed data)
  - Troubleshooting common issues
  - Optional services setup (Redis, Stripe webhook testing, etc.)

### 1.2 - Database Setup & Verification

- [ ] **Verify Prisma schema compiles**
  - Run `pnpm db:generate` and ensure no errors
  - Check that @prisma/client is generated correctly

- [ ] **Test migrations**
  - Verify migrations run cleanly on fresh database
  - Run `pnpm db:migrate` (prisma migrate deploy)
  - Check for any errors or warnings

- [ ] **Enhance seed script if needed**
  - Review `prisma/seed.ts` - does it create realistic data?
  - Ensure it creates:
    - At least 1 organization ("Phoenix Pool League" ✓)
    - At least 1 user with known credentials ✓
    - At least 1 venue with tables
    - At least 1-2 tournaments (one active, one in registration)
    - At least 5-10 players
    - Sample matches for the active tournament
  - Document seed data credentials in README

- [ ] **Test full database workflow**
  - Fresh database → migrate → seed → verify data
  - Document the exact commands in order

### 1.3 - Auth Flow Verification

- [ ] **Verify auth.ts works end-to-end**
  - Apps/web/auth.ts exists and exports auth() ✓
  - Test that unauthenticated users are redirected to /login
  - Test that login works with seed user credentials
  - Test that session includes orgId, orgSlug, role
  - Test that organization selection/switching works

- [ ] **Check for auth import errors**
  - Verify all 64 files importing '@/auth' can resolve it
  - Fix any path resolution issues
  - Ensure TypeScript compilation passes

### 1.4 - Dev Server & Runtime

- [ ] **Verify dev server starts without errors**
  - Run `pnpm dev` (or `pnpm --filter web dev`)
  - Check that server.ts works (custom Socket.IO server)
  - Ensure no runtime errors on startup
  - Verify app loads at localhost:3000 (or configured port)

- [ ] **Test basic page loads**
  - Homepage: `/`
  - Login: `/login`
  - Dashboard: `/dashboard` (after auth)
  - Console: `/console`
  - Tournament detail: `/tournaments/[id]`
  - TD Console: `/console/room/[tournamentId]`

- [ ] **Verify API routes respond**
  - Test a few key routes:
    - `GET /api/tournaments`
    - `GET /api/tables`
    - `GET /api/players`
  - Check for tenant context (orgId filtering)

### 1.5 - Package Scripts & Commands

- [ ] **Document all runnable scripts**
  - In README, list key commands:
    - `pnpm install` - Install dependencies
    - `pnpm db:generate` - Generate Prisma Client
    - `pnpm db:migrate` - Run migrations
    - `pnpm db:seed` - Seed sample data
    - `pnpm dev` - Start dev server
    - `pnpm build` - Build for production
    - `pnpm test:run` - Run tests

- [ ] **Test each script works**
  - Verify no errors
  - Fix any broken scripts

### 1.6 - Validation & Documentation

- [ ] **End-to-end local dev test**
  - From a clean state, follow README instructions
  - Time how long it takes (goal: < 15 minutes)
  - Note any friction points
  - Update docs to address them

- [ ] **Update PROJECT_LOG.md**
  - Document what was done in Phase 1
  - List any issues encountered and how they were resolved
  - Mark Phase 1 as COMPLETE

---

## 🎮 Phase 2: Core TD Flow (Tournament Director Experience)

**Goal:** Ensure a Tournament Director can realistically run a pool tournament from this system.

**Status:** ⏳ PENDING (Start after Phase 1 complete)

### 2.1 - Define the Core Flow

- [ ] **Document the primary TD workflow**
  - Write out exact steps TD takes:
    1. Log in
    2. Select organization (if multiple)
    3. Select or create venue
    4. Set up tables (assign names/numbers)
    5. Create new tournament OR select existing
    6. Register players or import player list
    7. Start tournament (generate brackets/rounds)
    8. Assign matches to tables
    9. Run matches via TD console:
       - View all tables and current matches
       - Start a match
       - Update scores in real-time
       - Complete a match
       - See queue of upcoming matches
    10. View standings
    11. Complete tournament and calculate payouts

- [ ] **Identify all pages/routes for this flow**
  - List every page URL involved
  - List every API route called

### 2.2 - Page-by-Page Verification

- [ ] **Login & Organization Selection**
  - `/login` - Works, validates credentials
  - `/select-organization` - Shows user's orgs, allows selection

- [ ] **Venue & Table Setup**
  - Find/create venue management page
  - Find/create table management page
  - Ensure orgId is enforced in queries

- [ ] **Tournament Creation/Selection**
  - `/tournaments` - List tournaments for org
  - `/tournaments/new` - Create new tournament
  - `/tournaments/[id]` - Tournament detail/overview

- [ ] **Player Registration**
  - Find player management for tournament
  - Test player addition (manual and bulk)

- [ ] **Tournament Start/Brackets**
  - Test tournament start (generates matches)
  - Verify bracket generation for SE/DE/RR formats

- [ ] **TD Console**
  - `/console/room/[tournamentId]` - Main TD interface
  - Verify shows:
    - All tables
    - Current matches per table
    - Match queue
    - Controls to start/complete matches

- [ ] **Chip Format Pages**
  - `/tournaments/[id]/chip-format` - Main chip format view
  - `/tournaments/[id]/chip-format/queue` - Match queue
  - `/tournaments/[id]/chip-format/standings` - Live standings

- [ ] **Payouts**
  - Find/verify payout calculation page
  - Test payout distribution

### 2.3 - API Routes Verification

- [ ] **Test tournament APIs**
  - `GET /api/tournaments` - List tournaments (filtered by orgId)
  - `POST /api/tournaments` - Create tournament
  - `GET /api/tournaments/[id]` - Get tournament details
  - `PATCH /api/tournaments/[id]` - Update tournament

- [ ] **Test table APIs**
  - `GET /api/tables` - List tables (filtered by orgId)
  - `POST /api/tables` - Create table
  - `PATCH /api/tables/[id]/assign` - Assign match to table

- [ ] **Test match APIs**
  - Match score updates
  - Match start/complete
  - Match history

- [ ] **Test player APIs**
  - Player registration
  - Player profile

### 2.4 - Tenant Context Enforcement

- [ ] **Audit Prisma queries for orgId filtering**
  - Search codebase for `prisma.tournament.find*` - check if where: { orgId } present
  - Search for `prisma.table.find*` - check orgId filtering
  - Search for `prisma.player.find*` - check orgId filtering
  - Search for other models that should be tenant-scoped

- [ ] **Create helper for tenant context**
  - Check if `withTenantContext` utility exists
  - If not, create it: `lib/auth/tenant.ts`
  - Use in API routes to automatically filter by session orgId

- [ ] **Test cross-tenant isolation**
  - Create two orgs with seed data
  - Verify user from org A cannot see org B's data

### 2.5 - Error Handling

- [ ] **Add error boundaries**
  - Ensure pages don't crash on errors
  - Show user-friendly error messages

- [ ] **API error responses**
  - Return proper HTTP status codes
  - Return useful error messages
  - Handle common errors (not found, unauthorized, validation)

### 2.6 - Manual End-to-End Test

- [ ] **Run full TD flow manually**
  - Log in as seed user
  - Select organization
  - Create venue + tables
  - Create tournament
  - Add 8 players
  - Start tournament (single elimination)
  - Run through all matches
  - Complete tournament
  - View standings and payouts

- [ ] **Document any issues found**
  - Note in PROJECT_LOG.md
  - Fix critical issues
  - Create follow-up tasks for non-critical issues

### 2.7 - Phase 2 Completion

- [ ] **Update PROJECT_LOG.md with Phase 2 summary**
- [ ] **Mark Phase 2 as COMPLETE**

---

## 🔌 Phase 3: Offline / Sync Service Decision

**Goal:** Make the offline story explicit - either ship minimal secure sync or disable it for V1.

**Status:** ⏳ PENDING (Start after Phase 2 complete)

### 3.1 - Sync Service Analysis

- [ ] **Review sync-service code**
  - Read `apps/sync-service/src/index.ts`
  - Read `apps/sync-service/src/index-secure.ts`
  - Read `apps/sync-service/src/index-v2-secure.ts`
  - Understand the differences

- [ ] **Identify type errors**
  - Try to run build (currently disabled)
  - Note all type errors
  - Estimate effort to fix

- [ ] **Check dependencies**
  - Fastify, WebSocket, Yjs, lib0, y-protocols
  - Are they up to date?
  - Any security vulnerabilities?

### 3.2 - Decision Point

- [ ] **Decide: Ship sync-service or defer?**
  - **Option A: Ship minimal secure sync**
    - Pros: Offline support, real-time collaboration, competitive advantage
    - Cons: More work, security risk if not done right, added complexity
    - Effort estimate: ?

  - **Option B: Defer offline to V2**
    - Pros: Faster to ship, less complexity, focus on core features
    - Cons: No offline support, miss out on unique feature
    - Effort estimate: Low (just disable/hide)

  - Get user input if needed for this decision
  - Document decision in PROJECT_LOG.md

### 3.3A - If SHIP sync-service:

- [ ] **Fix type errors**
  - Enable build script
  - Fix all TypeScript errors
  - Run `pnpm --filter sync-service build` successfully

- [ ] **Use secure entrypoint**
  - Decide which secure version to use (index-secure.ts or index-v2-secure.ts)
  - Set as default in package.json dev/start scripts

- [ ] **Configure environment variables**
  - Add to .env.example:
    - SYNC_SERVICE_URL
    - SYNC_SERVICE_PORT
    - SYNC_SERVICE_JWT_SECRET

- [ ] **Verify JWT-based auth**
  - Test room token generation in web app
  - Test sync-service validates tokens

- [ ] **Test WebSocket connection**
  - Use test-client.html
  - Verify connection, sync, disconnect

- [ ] **Add to dev workflow**
  - Document how to run sync-service locally
  - Add to README/LOCAL_DEV.md

- [ ] **Add to CI**
  - Enable sync-service build in CI workflow
  - Ensure tests pass

### 3.3B - If DEFER sync-service:

- [ ] **Disable offline features in UI**
  - Add feature flag: ENABLE_OFFLINE_SYNC=false
  - Hide offline-related UI components
  - Show message "Offline mode coming soon" if user tries to access

- [ ] **Prevent sync-service connection attempts**
  - Guard WebSocket connection code with feature flag
  - Gracefully handle when sync-service not available

- [ ] **Keep code in repo but mark as experimental**
  - Add README.md to apps/sync-service explaining status
  - Mark build as optional/skipped in turbo.json

- [ ] **Update documentation**
  - README: Note offline features planned for future release
  - Architecture docs: Explain sync-service is not yet in production

### 3.4 - Phase 3 Completion

- [ ] **Update PROJECT_LOG.md with decision and implementation**
- [ ] **Mark Phase 3 as COMPLETE**

---

## 🏗️ Phase 4: Infrastructure & CI

**Goal:** Make infra and CI configs reflect THIS project, not generic templates. Ensure CI passes.

**Status:** ⏳ PENDING (Start after Phase 3 complete)

### 4.1 - Infrastructure Templates Review

- [ ] **Review Bicep templates**
  - Check `infrastructure/bicep/main.bicep`
  - Look for placeholder values like {{PROJECT_NAME}}
  - Verify resource names match project

- [ ] **Review Terraform templates**
  - Check `infrastructure/terraform/main.tf`
  - Look for placeholder values
  - Verify variable files (dev.tfvars, prod.tfvars)

- [ ] **Decide on infrastructure approach**
  - Use Bicep (Azure-native) OR Terraform OR both for different environments?
  - Document decision

### 4.2 - Minimal Infra Config

- [ ] **Create staging environment config**
  - Resource group naming for tournament platform
  - Database (Azure PostgreSQL or Cosmos?)
  - App Service or Container Apps for web app
  - (Optional) App Service for sync-service
  - Storage for uploads
  - Key Vault for secrets

- [ ] **Document deployment process**
  - High-level overview in PROJECT_LOG.md
  - Don't need full deployment scripts yet, just structure

### 4.3 - CI Pipeline Fixes

- [ ] **Review .github/workflows/ci.yml**
  - Currently runs: lint, build, unit-tests
  - Check if it handles sync-service properly (after Phase 3 decision)

- [ ] **Handle disabled sync-service build**
  - If sync-service deferred: exclude from build pipeline
  - If sync-service shipped: ensure build succeeds

- [ ] **Review other workflows**
  - coordinator.yml, \*-worker.yml - Are these needed? What do they do?
  - e2e-tests.yml - Are e2e tests implemented?
  - lighthouse-ci.yml - Is lighthouse configured? Does it need secrets?

- [ ] **Test CI locally (if possible)**
  - Run lint, build, test locally
  - Ensure all pass

- [ ] **Disable or guard workflows that need missing secrets**
  - Lighthouse CI might need LHCI_GITHUB_APP_TOKEN
  - Stripe tests might need STRIPE_SECRET_KEY
  - Either add dummy secrets for CI or guard these workflows

### 4.4 - CI Green Status

- [ ] **Push to main branch and verify CI passes**
  - All jobs should be green
  - If failures, fix them

- [ ] **Document CI expectations**
  - What runs on PR?
  - What runs on merge to main?
  - What proves the code is good?

### 4.5 - Phase 4 Completion

- [ ] **Update PROJECT_LOG.md with infra and CI summary**
- [ ] **Mark Phase 4 as COMPLETE**

---

## 📚 Phase 5: Documentation & Polish

**Goal:** Make the repo self-explanatory to any competent engineer seeing it for the first time.

**Status:** ⏳ PENDING (Start after Phase 4 complete)

### 5.1 - README.md (Final Pass)

- [ ] **Polish README**
  - Clear project description
  - Tech stack summary
  - Quickstart (validated from Phase 1)
  - Architecture overview (1-2 paragraphs)
  - Links to detailed docs
  - Contributing guidelines (if applicable)
  - License

### 5.2 - Architecture Documentation

- [ ] **Create or update docs/ARCHITECTURE.md**
  - High-level system design
  - Key domains:
    - Organization (multi-tenant)
    - Venue & Tables (physical resources)
    - Tournament (event management)
    - Player (participant profiles)
    - Match (game state)
    - Scorekeeper (role-based access)
    - Payment (Stripe integration)
    - Notifications (email, SMS, push)
    - Analytics (event tracking)
  - Package structure:
    - apps/web - Frontend + API
    - apps/sync-service - WebSocket sync (status: deferred or shipped?)
    - packages/tournament-engine - Core logic
    - packages/shared - Prisma client, utilities
    - packages/\* - Other shared code
  - Data flow diagrams (optional but helpful)

### 5.3 - Local Development Guide

- [ ] **Finalize docs/LOCAL_DEV.md**
  - Complete step-by-step guide (validated in Phase 1)
  - Troubleshooting section
  - FAQ section
  - Tips for debugging

### 5.4 - Multi-Tenant & Security Docs

- [ ] **Document multi-tenant design**
  - How orgId is enforced
  - Session structure
  - Organization switching
  - RLS vs application-level filtering

- [ ] **Security best practices**
  - Auth flow
  - API route protection
  - Tenant isolation
  - Payment security (Stripe)

### 5.5 - API Documentation

- [ ] **Review existing API docs**
  - docs/api/PUBLIC-API-V1.md
  - docs/api/ADMIN-API-DOCUMENTATION.md
  - docs/api/chip-format-api.md
  - Are they up to date?

- [ ] **Update if needed**
  - Ensure all major routes documented
  - Include request/response examples
  - Note authentication requirements

### 5.6 - Sync Service Documentation

- [ ] **Document sync-service status**
  - If shipped: How to use, how to configure, architecture
  - If deferred: Status, plan for future, why deferred

- [ ] **Update apps/sync-service/README.md** (if shipped)
  - How it works
  - How to run locally
  - How to test
  - Security model

### 5.7 - Final Review

- [ ] **Review all project docs**
  - README.md
  - docs/PROJECT_LOG.md (this log)
  - docs/TODO.md (this file)
  - docs/ARCHITECTURE.md
  - docs/LOCAL_DEV.md
  - Ensure consistency

- [ ] **Check for outdated information**
  - Remove references to features not implemented
  - Update statuses

- [ ] **Verify all links work**
  - Internal doc links
  - External references

### 5.8 - Phase 5 Completion

- [ ] **Final update to PROJECT_LOG.md**
  - Summarize entire project delivery
  - Note remaining known issues (if any)
  - Mark project as SHIPPABLE

- [ ] **Mark Phase 5 as COMPLETE**

---

## 🎯 Post-Launch / Future Work

**Items that don't block shipping but are good to track:**

### Testing & Quality

- [ ] Add integration tests (DB + API routes)
- [ ] Add e2e tests with Playwright
- [ ] Increase unit test coverage (target: 60%+ for V1, 80%+ for V2)
- [ ] Set up test database and CI test pipeline

### Performance

- [ ] Add caching layer (Redis)
- [ ] Optimize database queries (analyze slow queries)
- [ ] Add database indexes for common query patterns
- [ ] Frontend performance audit (Lighthouse)
- [ ] Load testing (k6 scripts exist, need to run and optimize)

### Features

- [ ] Offline/sync service (if deferred in Phase 3)
- [ ] Mobile app (PWA or native)
- [ ] Advanced analytics
- [ ] Tournament templates
- [ ] Bracket visualization improvements
- [ ] Live streaming integration

### DevOps

- [ ] Containerize apps (Dockerfiles)
- [ ] Set up staging environment
- [ ] Set up production environment
- [ ] CI/CD for automated deployments
- [ ] Monitoring and alerting (Sentry, Azure Monitor)
- [ ] Backup and disaster recovery plan

### Documentation

- [ ] User guide for Tournament Directors
- [ ] Admin guide
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Video tutorials

---

## 📝 Notes

**Principles:**

- Minimal, targeted changes
- Make it WORK before making it perfect
- Don't rename major directories or change architecture unless absolutely necessary
- Prefer solutions that get to working product faster
- Keep changes aligned with current tech choices

**Decision Log:**

- (To be filled as decisions are made in each phase)

**Blocked Items:**

- (Track anything that's blocked and why)

**Questions for User:**

- (Track questions that need user input)

---

**Last Phase Completed:** Phase 0
**Current Phase:** Phase 1 (Not Started)
**Overall Progress:** 7% (Phase 0 of ~6 phases)
