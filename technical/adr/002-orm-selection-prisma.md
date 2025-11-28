# ADR-002: Prisma ORM for Database Access

**Date:** 2025-11-03
**Status:** Proposed
**Deciders:** Development Team
**Technical Story:** Database access layer for multi-tenant tournament platform

---

## Context

Our tournament platform requires a robust database access layer with these critical requirements:

**Multi-tenancy with Row-Level Security (RLS):**

- All queries must be tenant-scoped (`org_id` filtering)
- Postgres RLS policies must be enforced at the database level
- Need to test that cross-tenant access is impossible

**Complex data modeling:**

- Event-sourced audit log (`tournament_events` append-only table)
- Projections derived from event streams
- Versioned sport configurations (JSON schemas)
- Bracket state with complex relationships (matches, players, tables)
- Payment and payout ledgers

**Type safety:**

- TypeScript types must match database schema exactly
- Schema changes must propagate to application code automatically
- Prevent runtime errors from schema drift

**Team constraints:**

- 2 developers with varying database expertise
- 12-week timeline demands productivity
- Need to iterate on schema quickly during early weeks

We need to choose between Prisma ORM, Drizzle ORM, or raw SQL with a migration tool.

---

## Decision

We will use **Prisma ORM** as our database access layer with the following configuration:

- **Prisma Client** for type-safe queries
- **Prisma Migrate** for schema versioning and migrations
- **Raw SQL for RLS policies** (Prisma doesn't handle RLS natively, so policies are defined in migration files)
- **Middleware pattern** for injecting tenant context (`org_id`) into all queries

Implementation approach:

```typescript
// Prisma schema with RLS-ready models
model Tournament {
  id      String   @id @default(cuid())
  orgId   String   @map("org_id")  // Tenant isolation
  status  String
  // ... other fields

  @@index([orgId])
  @@map("tournaments")
}

// Middleware for automatic tenant scoping
prisma.$use(async (params, next) => {
  if (params.model && TENANT_SCOPED_MODELS.includes(params.model)) {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        orgId: getCurrentTenantId(),
      }
    }
  }
  return next(params)
})
```

---

## Consequences

### Positive Consequences

- **Excellent developer experience**: Auto-complete, type safety, migrations all managed
- **Schema-first workflow**: `prisma migrate dev` updates DB + regenerates types in one command
- **Fast development**: Prisma Studio for quick data inspection, seed scripts are simple
- **Type safety**: Generated TypeScript types guarantee no runtime type mismatches
- **Multi-tenant support**: Middleware pattern makes tenant-scoping transparent and enforced
- **Mature ecosystem**: Well-documented, large community, proven at scale
- **Transaction support**: Built-in transactions with automatic rollback
- **Connection pooling**: Prisma handles connection management intelligently

### Negative Consequences

- **RLS not native**: Must write raw SQL for RLS policies in migration files (Prisma doesn't generate RLS)
- **Performance overhead**: Slightly slower than raw SQL for complex queries (~5-10ms added latency)
- **Query builder limitations**: Very complex queries may require raw SQL escape hatch (`prisma.$queryRaw`)
- **Bundle size**: Prisma Client adds ~1-2MB to server bundle (not an issue for Node.js services)
- **Lock-in risk**: Migrating away from Prisma requires rewriting data access layer (mitigated: abstraction layer can wrap Prisma)

### Neutral Consequences

- **Learning curve**: 1-2 days to understand Prisma schema syntax and migration workflow
- **Database-specific**: Prisma is opinionated about how it maps to Postgres (generally a good thing for consistency)

---

## Alternatives Considered

### Alternative 1: Drizzle ORM

**Description:** Lightweight TypeScript ORM with better performance and native SQL-like query builder.

**Pros:**

- **Better performance**: 10-20% faster than Prisma in benchmarks, closer to raw SQL
- **SQL-like syntax**: Queries look like SQL, easier for SQL-savvy developers
- **Smaller bundle**: ~500KB vs Prisma's 1-2MB
- **RLS-friendly**: Less abstraction, easier to integrate custom SQL
- **Explicit queries**: No "magic" middleware, everything is explicit

**Cons:**

- **Less mature**: Newer ecosystem, fewer resources, smaller community
- **More boilerplate**: No auto-generated types from schema alone, must define schemas in TypeScript
- **Weaker migrations**: Migration tooling is less polished than Prisma Migrate
- **Manual type management**: Schema changes require manual updates to TypeScript types
- **Steeper learning curve**: Less documentation and examples
- **No Prisma Studio equivalent**: Data inspection requires external tools

**Why rejected:** While Drizzle's performance is appealing, Prisma's maturity and developer experience are more valuable for a 2-person team on a tight timeline. The 10-20% performance difference won't be a bottleneck (we're building a tournament platform, not a high-frequency trading system). Prisma's auto-generated types and migration tools will save more time than Drizzle's slight performance edge.

---

### Alternative 2: Raw SQL with Postgres.js + Kysely

**Description:** Use raw SQL for all queries with a query builder (Kysely) for type safety, and a migration tool like node-pg-migrate.

**Pros:**

- **Maximum performance**: No ORM overhead, every query is optimized
- **Full control**: Can use every Postgres feature (RLS, partitions, advanced indexing)
- **Predictable**: No surprises from ORM behavior
- **RLS integration**: Native support, policies are first-class citizens
- **Flexibility**: No constraints from ORM opinions

**Cons:**

- **High manual overhead**: Must write all CRUD operations by hand
- **Type drift risk**: Schema changes don't auto-update TypeScript types
- **More code to maintain**: 3-5x more lines of code for data access
- **Error-prone**: Easy to make SQL typos, forget tenant scoping, or create SQL injection risks
- **Slower development**: Every new model requires writing migrations + types + queries manually
- **Testing burden**: Must test every query individually

**Why rejected:** For a 2-person team building 30+ database models in 12 weeks, the manual overhead is too high. Prisma's code generation and migration automation will save dozens of hours. We can use `prisma.$queryRaw` for the rare complex query that needs raw SQL.

---

### Alternative 3: TypeORM

**Description:** Mature TypeScript ORM with decorator-based models.

**Pros:**

- **Mature ecosystem**: Been around for years
- **Active Record + Data Mapper**: Flexible patterns
- **Good TypeScript support**: Native TypeScript
- **Migrations**: Built-in migration tool

**Cons:**

- **Heavier than Prisma**: More complex API surface
- **Decorator-based**: Mixing decorators with domain logic can get messy
- **Less modern DX**: Prisma's CLI and Studio are superior
- **Query builder quirks**: Less intuitive than Prisma's fluent API
- **Community momentum**: Prisma is growing faster, better maintained

**Why rejected:** TypeORM is solid but dated. Prisma offers a better developer experience with similar maturity. The decorator pattern can make code harder to test compared to Prisma's cleaner separation.

---

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Multi-Tenancy Guide](https://www.prisma.io/docs/guides/database/multi-tenancy)
- [Row-Level Security with Prisma](https://www.prisma.io/blog/row-level-security-postgres-prisma)
- [Drizzle vs Prisma Comparison](https://orm.drizzle.team/docs/prisma-comparison)
- [Prisma Performance Benchmarks](https://www.prisma.io/docs/guides/performance-and-optimization)

---

## Notes

**Implementation checklist:**

- [ ] Install Prisma: `pnpm add -w prisma @prisma/client`
- [ ] Initialize Prisma: `pnpm prisma init`
- [ ] Define schema in `prisma/schema.prisma` with all models
- [ ] Add RLS policies as raw SQL in migration file
- [ ] Create tenant-scoping middleware
- [ ] Set up Prisma Client singleton pattern
- [ ] Configure connection pooling for serverless (if deploying to Vercel/AWS Lambda)
- [ ] Add `prisma generate` to build pipeline
- [ ] Create seed script for development data
- [ ] Add Prisma Studio script: `pnpm prisma studio`

**RLS integration pattern:**

```sql
-- In migration file (raw SQL)
CREATE POLICY "tenant_isolation" ON tournaments
  FOR ALL
  TO authenticated
  USING (org_id = current_setting('app.current_org_id')::text);

-- Set tenant context before queries
await prisma.$executeRaw`SET app.current_org_id = ${orgId}`;
```

**Performance optimization notes:**

- Use `select` to fetch only needed fields
- Use `include` sparingly (N+1 query risk)
- Add indexes for `org_id` on all multi-tenant tables
- Use `.$queryRaw` for complex reporting queries

**Escape hatches:**
If Prisma becomes a bottleneck later (unlikely):

1. Profile queries with `prisma.$queryRaw` and compare
2. Optimize problematic queries with raw SQL
3. Incrementally migrate hot paths to Drizzle or raw SQL
4. Prisma can coexist with other approaches (gradual migration)

**Team impact:**

- **Estimated setup time:** 2-4 hours (schema definition, RLS policies)
- **Learning time:** 1 day for basics, 3-4 days for proficiency
- **Ongoing maintenance:** Minimal (migrations are straightforward)

---

## Superseded By

[None]
