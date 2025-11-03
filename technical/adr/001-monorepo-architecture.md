# ADR-001: Monorepo Architecture with Turborepo

**Date:** 2025-11-03
**Status:** Proposed
**Deciders:** Development Team
**Technical Story:** Initial architecture setup for offline-first tournament platform

---

## Context

We are building a complex offline-first tournament platform with multiple interconnected services:
- **Web application** (Next.js PWA with TD Console, Player View, Kiosk Mode)
- **Sync service** (Node + Fastify for CRDT sync over WebSocket)
- **Shared packages** (CRDT types, domain models, validation schemas, sport configs)
- **Multiple deployment targets** (web, mobile PWA, potential native apps)

Key technical constraints:
- **Offline-first architecture** requires shared CRDT logic between client and server
- **Event-sourced system** needs consistent event schemas across all services
- **Type safety** is critical for tournament state management
- **Small team** (2 developers) needs efficient code sharing and maintenance
- **Rapid iteration** required to meet 12-week target timeline

We need to decide between a monorepo (single repository with multiple packages) or multi-repo (separate repositories per service) approach.

---

## Decision

We will adopt a **monorepo architecture using Turborepo** to house all services and shared packages in a single repository.

Structure:
```
tournament-platform/
├── apps/
│   ├── web/              # Next.js PWA (TD Console, Player View)
│   └── sync-service/     # Fastify WebSocket sync server
├── packages/
│   ├── shared/           # Domain models, types, constants
│   ├── crdt/             # CRDT logic (Y.js/Automerge wrapper)
│   ├── events/           # Event-sourced schemas and projections
│   ├── validation/       # Zod schemas for validation
│   ├── sport-configs/    # Sport rules and configurations
│   └── ui/               # Shared UI components (shadcn/ui)
├── prisma/               # Database schema and migrations
└── turbo.json            # Turborepo configuration
```

---

## Consequences

### Positive Consequences
- **Type safety across boundaries**: TypeScript types flow seamlessly from DB schema → API → client with zero manual synchronization
- **Code reuse**: CRDT logic, event schemas, validation rules, and sport configs are defined once and used everywhere
- **Atomic changes**: Refactoring domain models, API contracts, or event schemas happens in a single PR with coordinated changes
- **Simplified dependency management**: One `package.json`, one lock file, consistent versions across all packages
- **Faster CI/CD**: Turborepo's intelligent caching only rebuilds changed packages and their dependents
- **Better developer experience**: Single `pnpm install`, unified scripts (`pnpm dev` runs all services), easier onboarding
- **Consistent tooling**: Shared ESLint, Prettier, TypeScript configs across all packages

### Negative Consequences
- **Larger repository size**: All code in one place (mitigated: still small compared to most enterprise repos)
- **Potential build complexity**: Need to configure Turborepo properly (mitigated: well-documented, mature tooling)
- **Git history mixing**: Commits for different services in same timeline (mitigated: conventional commits with scope prefixes)
- **Repository permissions**: Cannot grant granular access per service (mitigated: not an issue for 2-person team)

### Neutral Consequences
- **Learning curve**: Team needs to understand monorepo concepts and Turborepo (1-2 days learning investment)
- **CI/CD adjustments**: Deploy pipelines need to detect changed apps (Turborepo provides helpers for this)

---

## Alternatives Considered

### Alternative 1: Multi-Repo (Separate Repositories)
**Description:** Create separate Git repositories for web app, sync service, and shared packages. Share code via npm packages published to private registry or Git submodules.

**Pros:**
- Clear service boundaries
- Independent versioning per service
- Smaller repository sizes
- Granular access control possible

**Cons:**
- **Type safety breaks**: Changes to shared types require publishing package → updating versions → coordinating releases
- **Coordination overhead**: Refactoring domain models requires PRs across 3-5 repositories
- **Dependency hell**: Managing versions of shared packages across repos is error-prone
- **Slower development**: Cannot test changes across services without publishing intermediary package versions
- **Poor DX**: Multiple clones, multiple `npm install`, switching contexts constantly
- **Version drift**: Services can end up on incompatible versions of shared code

**Why rejected:** The offline-first architecture with shared CRDT state and event sourcing demands tight coupling between services. Multi-repo adds significant overhead for a 2-person team with minimal benefit.

---

### Alternative 2: Monorepo with Nx
**Description:** Use Nx instead of Turborepo for monorepo orchestration.

**Pros:**
- More features than Turborepo (code generation, affected graph visualization, plugin ecosystem)
- Strong Angular/React support
- Powerful dependency graph analysis

**Cons:**
- Steeper learning curve and more complex configuration
- Heavier tooling overhead (Nx is more opinionated)
- Slower than Turborepo for simple build/cache workflows
- More abstraction layers to understand

**Why rejected:** Turborepo is simpler, faster, and sufficient for our needs. Nx's advanced features (generators, detailed affected analysis) are overkill for a 2-person team. Turborepo's minimalism aligns with "build fast, ship fast" philosophy.

---

### Alternative 3: Monorepo with pnpm Workspaces (No Turborepo)
**Description:** Use pnpm workspaces alone without an orchestration layer like Turborepo.

**Pros:**
- Simpler setup (native pnpm feature)
- No additional tooling to learn
- Works well for basic monorepos

**Cons:**
- No intelligent caching (rebuilds everything every time)
- No task pipelines (must manually manage build order)
- Slower CI/CD (no incremental builds)
- Manual script coordination across packages

**Why rejected:** With 4+ packages and 2 apps, we need task orchestration and caching. Turborepo adds minimal complexity while providing significant speed improvements for builds, tests, and linting.

---

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Vercel Monorepo Handbook](https://vercel.com/blog/monorepos)
- [Why Turborepo (Vercel)](https://vercel.com/blog/turborepo)
- [pnpm Workspaces](https://pnpm.io/workspaces)

---

## Notes

**Implementation checklist:**
- [ ] Initialize Turborepo with `npx create-turbo@latest`
- [ ] Configure `turbo.json` with build, dev, test, lint tasks
- [ ] Set up `apps/web` and `apps/sync-service`
- [ ] Create `packages/shared`, `packages/crdt`, `packages/events`
- [ ] Configure TypeScript path aliases for clean imports
- [ ] Set up shared ESLint/Prettier configs in `packages/config`
- [ ] Add CI pipeline with Turborepo remote caching (optional: Vercel Remote Cache)

**Migration path if wrong:**
If monorepo becomes unmanageable (unlikely for 2-person team), we can extract services later using Git history filtering tools. Starting with monorepo is lower risk than starting multi-repo.

**Team impact:**
- **Estimated setup time:** 4-6 hours
- **Learning time:** 1-2 days for full proficiency
- **Ongoing maintenance:** Minimal (Turborepo is mostly transparent after setup)

---

## Superseded By

[None]
