# Tournament Architecture Guide

## Overview

This document describes the architecture patterns for the tournament feature, focusing on Server Components, multi-tenant security, and UX consistency.

## Data Access Pattern

### Server Components Architecture

The tournaments page follows Next.js App Router best practices:

```
app/tournaments/
├── page.tsx              # Server Component (async, fetches data)
├── loading.tsx           # Loading UI with skeleton
└── components/
    ├── tournament-list.tsx    # Server Component (renders grid)
    ├── tournament-filters.tsx # Client Component (interactive)
    └── delete-tournament-button.tsx # Client Component (actions)
```

**Key Principles:**

1. **Server Components by default** - No `"use client"` unless needed
2. **Data fetching on server** - Use `lib/data/tournaments.ts`, NOT `fetch('/api/...')`
3. **Client boundaries** - Only mark components as `"use client"` when they need:
   - Event handlers (onClick, onChange, etc.)
   - React hooks (useState, useEffect, etc.)
   - Browser APIs

### Data Layer

All server-side data access goes through `lib/data/*.ts`:

```typescript
// lib/data/tournaments.ts
export async function getTournamentsForOrg(): Promise<TournamentWithStats[]> {
  const orgId = await getOrgIdFromSession(); // Security check

  return await prisma.tournament.findMany({
    where: { orgId }, // Tenant isolation
    include: { _count: { select: { matches: true, players: true } } },
  });
}
```

**Never** accept `orgId` from client - always get from session.

## Multi-Tenant Security Pattern

### Core Helpers

All org-scoped operations MUST use these helpers from `lib/auth/server-auth.ts`:

```typescript
// Get org from session, redirects if not authenticated
const orgId = await getOrgIdFromSession();

// Validate resource belongs to user's org
await ensureOrgAccess(resourceOrgId);
```

### Security Patterns

**Pattern 1: Filter by orgId (Preferred)**

```typescript
const tournament = await prisma.tournament.findFirst({
  where: { id: tournamentId, orgId: sessionOrgId },
});
// Returns null if not found OR wrong org
```

**Pattern 2: Fetch then validate**

```typescript
const tournament = await prisma.tournament.findUnique({
  where: { id: tournamentId },
});
await ensureOrgAccess(tournament.orgId); // Throws if mismatch
```

### What NOT to do

❌ **Never trust client-provided orgId:**

```typescript
// WRONG - Client can send any orgId
const { orgId } = await request.json();
await prisma.tournament.findMany({ where: { orgId } });
```

❌ **Never query without org filter:**

```typescript
// WRONG - Exposes all orgs' data
const tournament = await prisma.tournament.findUnique({
  where: { id: tournamentId },
});
// ... use tournament without validation
```

## UX Patterns

### Confirmation Dialogs

Use `useConfirm` hook instead of native `confirm()`:

```typescript
'use client';
import { useConfirm } from '@/hooks/use-confirm';

export function MyComponent() {
  const { confirm, ConfirmDialog } = useConfirm();

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete Tournament',
      description: 'Are you sure? This cannot be undone.',
      actionLabel: 'Delete',
      cancelLabel: 'Cancel',
    });

    if (!ok) return;
    // ... proceed with deletion
  };

  return (
    <>
      <button onClick={handleDelete}>Delete</button>
      {ConfirmDialog}
    </>
  );
}
```

### Toast Notifications

Use `sonner` for all notifications instead of `alert()`:

```typescript
import { toast } from 'sonner';

// Success
toast.success('Tournament created successfully!');

// Error
toast.error('Failed to create tournament');

// Info
toast.info('Processing...');
```

### UI Consistency

Use centralized design tokens from `@tournament/ui-config`:

```typescript
import { TOURNAMENT_STATUS_COLORS, FORMAT_BADGES } from '@tournament/ui-config';
import { StatusBadge } from '@/components/ui/status-badge';

// Use StatusBadge component
<StatusBadge status={tournament.status} />

// Or use tokens directly
const colors = TOURNAMENT_STATUS_COLORS[status];
```

**Never** use ad-hoc Tailwind colors for tournament statuses or formats.

## Loading States

Use Next.js loading.tsx for automatic loading UI:

```typescript
// app/tournaments/loading.tsx
export default function Loading() {
  return <TournamentSkeleton />;
}
```

The framework automatically shows this while the page is loading.

## Testing

### Unit Tests

Test security helpers in isolation:

```typescript
// lib/auth/server-auth.test.ts
it('should throw for mismatched org', async () => {
  await expect(ensureOrgAccess('wrong-org')).rejects.toThrow('Forbidden');
});
```

### Integration Tests

Test full CRUD flow with org validation:

```typescript
// tests/integration/tournament-crud.test.ts
it('should not return tournaments from other orgs', async () => {
  const tournaments = await getTournamentsForOrg();
  expect(tournaments.every((t) => t.orgId === testOrgId)).toBe(true);
});
```

### E2E Tests

Test UI flows with Playwright:

```typescript
// tests/e2e/tournaments.spec.ts
test('should delete tournament with confirmation', async ({ page }) => {
  await page.click('[data-testid="delete-button"]');
  await page.click('text=Delete'); // Confirm dialog
  await expect(page.locator('text=Tournament deleted')).toBeVisible();
});
```

## Offline-First Considerations

This architecture keeps the door open for offline-first features:

1. **Data layer abstraction** - `lib/data/tournaments.ts` can be swapped for a sync-aware client
2. **Server Components** - Can be replaced with client-side rendering when offline
3. **Optimistic updates** - Toast notifications work well with optimistic UI patterns

Future offline implementation can:

- Replace `getTournamentsForOrg()` with a client-side cache query
- Add sync status indicators to the UI
- Use service workers for background sync

## Quick Reference

### Checklist for New Features

- [ ] Server Component by default (no `"use client"` unless needed)
- [ ] Data access through `lib/data/*.ts`
- [ ] Always use `getOrgIdFromSession()` for org context
- [ ] Filter DB queries by `orgId` or validate with `ensureOrgAccess()`
- [ ] Use `useConfirm` instead of `confirm()`
- [ ] Use `toast` instead of `alert()`
- [ ] Use `StatusBadge` and `ui-config` tokens for styling
- [ ] Add loading.tsx for loading states
- [ ] Write integration tests for security

### Common Patterns

**Fetch tournaments:**

```typescript
const tournaments = await getTournamentsForOrg();
```

**Delete with security:**

```typescript
const tournament = await prisma.tournament.findFirst({
  where: { id, orgId: await getOrgIdFromSession() },
});
if (!tournament) throw new Error('Not found');
await prisma.tournament.delete({ where: { id } });
```

**Client-side action:**

```typescript
const { confirm, ConfirmDialog } = useConfirm();
const ok = await confirm({ title: '...', description: '...' });
if (!ok) return;
// ... perform action
toast.success('Success!');
```
