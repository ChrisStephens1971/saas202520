# Database Migration Guide

## Overview

This guide documents the database migration process for the tournament platform, including multi-tenant considerations, best practices, and rollback procedures.

## Migration Strategy

### Development Workflow

```bash
# 1. Make changes to prisma/schema.prisma
# 2. Create a new migration
pnpm db:migrate dev --name descriptive_migration_name

# 3. Review the generated SQL
cat prisma/migrations/YYYYMMDD_migration_name/migration.sql

# 4. Test locally
pnpm db:migrate deploy

# 5. Commit migration files
git add prisma/
git commit -m "feat(migrations): add descriptive migration name"
```

### Production Deployment

```bash
# 1. Backup database before migration
pg_dump -U username -d tournament_platform > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migrations
pnpm db:migrate deploy

# 3. Verify migration success
psql -U username -d tournament_platform -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

# 4. Test critical paths
pnpm test:integration
```

## Multi-Tenant Considerations

### Required Patterns

All tenant-scoped tables **MUST**:

1. ✅ Include `org_id` column (tenant identifier)
2. ✅ Have foreign key to `organizations` table
3. ✅ Use `ON DELETE CASCADE` for tenant cleanup
4. ✅ Have index on `org_id` for query performance
5. ✅ Never allow cross-tenant access

### Migration Template

```sql
-- Create tenant-scoped table
CREATE TABLE "example_table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "org_id" TEXT NOT NULL,  -- Tenant ID (required)
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    -- Foreign key to organizations (multi-tenant)
    CONSTRAINT "example_table_org_id_fkey"
        FOREIGN KEY ("org_id")
        REFERENCES "organizations"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Multi-tenant isolation index (required)
CREATE INDEX "example_table_org_id_idx" ON "example_table"("org_id");

-- Additional indexes as needed
CREATE INDEX "example_table_status_idx" ON "example_table"("status");
```

### Row Level Security (Future)

When implementing RLS:

```sql
-- Enable RLS on table
ALTER TABLE "tournaments" ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
CREATE POLICY "tenant_isolation_policy" ON "tournaments"
    USING (org_id = current_setting('app.current_org_id')::text);

-- Grant access to application role
GRANT SELECT, INSERT, UPDATE, DELETE ON "tournaments" TO app_role;
```

## Migration Checklist

### Before Creating Migration

- [ ] Review Prisma schema changes
- [ ] Verify all tenant-scoped tables have `org_id`
- [ ] Check foreign key relationships
- [ ] Plan indexes for query performance
- [ ] Consider data migration needs

### After Creating Migration

- [ ] Review generated SQL for correctness
- [ ] Test migration on local database
- [ ] Verify rollback procedure works
- [ ] Update seed data if needed
- [ ] Document breaking changes
- [ ] Test API endpoints affected

### Before Production Deploy

- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Notify team of deployment window
- [ ] Plan rollback procedure
- [ ] Monitor application health

## Common Migration Patterns

### Adding a Column

```sql
-- Add optional column
ALTER TABLE "tournaments" ADD COLUMN "description" TEXT;

-- Add required column (two-step process)
-- Step 1: Add as optional
ALTER TABLE "tournaments" ADD COLUMN "new_field" TEXT;

-- Step 2: Backfill data
UPDATE "tournaments" SET "new_field" = 'default_value' WHERE "new_field" IS NULL;

-- Step 3: Make required (next migration)
ALTER TABLE "tournaments" ALTER COLUMN "new_field" SET NOT NULL;
```

### Adding an Index

```sql
-- Add index for query performance
CREATE INDEX "tournaments_status_idx" ON "tournaments"("status");

-- Add composite index
CREATE INDEX "tournaments_org_status_idx" ON "tournaments"("org_id", "status");

-- Add unique constraint
CREATE UNIQUE INDEX "tournaments_org_slug_idx" ON "tournaments"("org_id", "slug");
```

### Renaming a Column

```sql
-- Rename column
ALTER TABLE "tournaments" RENAME COLUMN "old_name" TO "new_name";

-- Update comments
COMMENT ON COLUMN "tournaments"."new_name" IS 'Updated field description';
```

### Adding a Table

```sql
-- Create new table with multi-tenant support
CREATE TABLE "tournament_brackets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournament_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "bracket_type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT "tournament_brackets_tournament_id_fkey"
        FOREIGN KEY ("tournament_id")
        REFERENCES "tournaments"("id")
        ON DELETE CASCADE,

    CONSTRAINT "tournament_brackets_org_id_fkey"
        FOREIGN KEY ("org_id")
        REFERENCES "organizations"("id")
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX "tournament_brackets_tournament_id_idx" ON "tournament_brackets"("tournament_id");
CREATE INDEX "tournament_brackets_org_id_idx" ON "tournament_brackets"("org_id");
```

## Data Migration

### Backfilling Data

```sql
-- Example: Backfill tournament descriptions from names
UPDATE "tournaments"
SET "description" = CONCAT('Tournament: ', "name")
WHERE "description" IS NULL;

-- Example: Migrate enum values
UPDATE "tournaments"
SET "status" =
    CASE
        WHEN "status" = 'pending' THEN 'draft'
        WHEN "status" = 'in_progress' THEN 'active'
        ELSE "status"
    END;
```

### Handling Large Tables

```sql
-- For tables with millions of rows, use batching
DO $$
DECLARE
    batch_size INT := 10000;
    rows_updated INT;
BEGIN
    LOOP
        UPDATE "tournaments"
        SET "new_field" = 'default'
        WHERE "id" IN (
            SELECT "id" FROM "tournaments"
            WHERE "new_field" IS NULL
            LIMIT batch_size
        );

        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        EXIT WHEN rows_updated = 0;

        -- Commit batch
        COMMIT;
    END LOOP;
END $$;
```

## Rollback Procedures

### Automatic Rollback

Prisma migrations are transactional. If a migration fails, it will automatically rollback.

### Manual Rollback

```bash
# 1. Restore from backup
psql -U username -d tournament_platform < backup_YYYYMMDD_HHMMSS.sql

# 2. Or revert specific migration
# Edit prisma/migrations/_prisma_migrations table
DELETE FROM "_prisma_migrations" WHERE "migration_name" = 'YYYYMMDD_migration_name';

# 3. Re-run previous state
pnpm db:migrate deploy
```

### Down Migrations

Create separate down migration files for complex changes:

```sql
-- migrations/YYYYMMDD_add_field/down.sql
ALTER TABLE "tournaments" DROP COLUMN "description";
```

## Testing Migrations

### Local Testing

```bash
# 1. Reset database
pnpm db:migrate reset

# 2. Run migrations
pnpm db:migrate deploy

# 3. Seed test data
pnpm db:seed

# 4. Run tests
pnpm test
```

### Integration Tests

```typescript
// Example migration test
describe('Tournament Description Migration', () => {
  it('should allow null descriptions', async () => {
    const tournament = await prisma.tournament.create({
      data: {
        orgId: 'org-123',
        name: 'Test Tournament',
        description: null, // Should work
        // ... other fields
      },
    });
    expect(tournament.description).toBeNull();
  });

  it('should store descriptions when provided', async () => {
    const tournament = await prisma.tournament.create({
      data: {
        orgId: 'org-123',
        name: 'Test Tournament',
        description: 'A fun tournament',
        // ... other fields
      },
    });
    expect(tournament.description).toBe('A fun tournament');
  });
});
```

## Performance Considerations

### Index Strategy

- ✅ Index on `org_id` (required for all tenant-scoped tables)
- ✅ Index on foreign keys
- ✅ Index on frequently queried columns (status, created_at)
- ✅ Composite indexes for common query patterns
- ⚠️ Avoid over-indexing (slows down writes)

### Large Table Migrations

For tables with >1M rows:

1. **Add index concurrently** (doesn't lock table)

   ```sql
   CREATE INDEX CONCURRENTLY "idx_name" ON "table"("column");
   ```

2. **Use batching for data updates** (see Handling Large Tables above)

3. **Schedule during low-traffic windows**

4. **Monitor query performance** before/after migration

## Troubleshooting

### Migration Fails

```bash
# Check migration status
psql -U username -d tournament_platform -c "SELECT * FROM _prisma_migrations;"

# Check for locks
psql -U username -d tournament_platform -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Kill blocking queries
psql -U username -d tournament_platform -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <PID>;"
```

### Prisma Client Out of Sync

```bash
# Regenerate Prisma Client
pnpm db:generate

# If still broken, reset
rm -rf node_modules/.prisma
pnpm install
pnpm db:generate
```

## Migration History

| Date       | Migration                             | Description           | Status         |
| ---------- | ------------------------------------- | --------------------- | -------------- |
| 2025-11-03 | `20251103163038_init`                 | Initial schema        | ✅ Deployed    |
| 2025-11-03 | `20251103163100_init`                 | Schema refinements    | ✅ Deployed    |
| 2025-11-04 | `20251104_add_tournament_description` | Add description field | ✅ Week 1 test |

## References

- [Prisma Migrations Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Multi-Tenant Database Design](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)

---

**Last Updated:** 2025-11-04 (Week 1)
**Maintained By:** Tournament Platform Team
