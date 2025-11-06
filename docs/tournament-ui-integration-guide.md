# Tournament Management UI - Integration Guide

**Sprint 9 Phase 2**
**Date:** 2025-11-06

---

## Quick Start

### 1. Navigate to Admin Tournament Management
```
URL: /admin/tournaments
```

### 2. Create Your First Tournament
1. Click "Create Tournament" button
2. Complete 3-step wizard:
   - **Step 1:** Enter name, slug, description
   - **Step 2:** Select format, game type, settings
   - **Step 3:** Review and create

### 3. Manage Tournaments
- **View:** Click "View" button or tournament row
- **Edit:** Click "Edit" button (owner/td only)
- **Delete:** Click "Delete" button (owner only)
- **Bulk Delete:** Check multiple tournaments, click "Delete Selected"

---

## Integration with Existing Code

### Socket.io Integration

#### Hooks Used (Already Implemented)
```typescript
import { useSocket, useSocketEvent, useTournamentRoom } from '@/hooks/useSocket';
```

**Location:** `/apps/web/hooks/useSocket.ts`

**Events Listened:**
- `tournament:created` - New tournament added to list
- `tournament:updated` - Tournament data refreshed
- `tournament:deleted` - Tournament removed from list

#### Socket Context (Already Implemented)
```typescript
import { useSocketContext } from '@/contexts/SocketContext';
```

**Location:** `/apps/web/contexts/SocketContext.tsx`

**Features:**
- Auto-reconnection
- Connection status tracking
- Room subscription management

---

### Authentication Integration

#### Session Data (Already Implemented)
```typescript
import { useSession } from 'next-auth/react';

const { data: session } = useSession();

// Access user data
session?.user?.id
session?.user?.role  // 'owner' | 'td' | 'scorekeeper' | 'streamer'
session?.user?.orgId // Tenant ID
```

#### Permission Checks
```typescript
const canEdit = session?.user?.role === 'owner' || session?.user?.role === 'td';
const canDelete = session?.user?.role === 'owner';
```

---

### API Contracts Integration

#### Types Imported
```typescript
import type {
  Tournament,
  TournamentWithStats,
  TournamentStatus,
  TournamentFormat,
  GameType,
  CreateTournamentRequest,
  UpdateTournamentRequest,
} from '@tournament/api-contracts';
```

**Location:** `/packages/api-contracts/src/tournaments.ts`

#### Validation Schemas
```typescript
import {
  CreateTournamentRequestSchema,
  UpdateTournamentRequestSchema,
  generateSlug,
  VALID_STATUS_TRANSITIONS,
  isValidStatusTransition,
} from '@tournament/api-contracts';
```

---

### UI Components Integration

#### Admin Layout (Already Implemented)
```typescript
// Location: /apps/web/app/admin/layout.tsx
// Provides navigation, sidebar, and layout structure
```

**Tournament pages automatically inherit:**
- Admin navigation sidebar
- Role-based access control
- Dark mode support
- Responsive layout

#### Tailwind Classes
Uses existing Tailwind configuration with dark mode support:
```typescript
className="bg-white dark:bg-gray-800"
className="text-gray-900 dark:text-white"
className="border-gray-300 dark:border-gray-600"
```

---

## API Endpoints (Backend Implementation Required)

### 1. Create Tournament
```typescript
POST /api/tournaments

Request Body:
{
  name: string;
  slug: string;
  description?: string;
  format: TournamentFormat;
  sport: 'pool';
  gameType: GameType;
  raceToWins: number;
  maxPlayers?: number;
}

Response:
{
  tournament: Tournament;
}

Socket Event (Emit):
socket.to(`org:${orgId}`).emit('tournament:created', {
  tournamentId: tournament.id,
  orgId: tournament.orgId,
  name: tournament.name,
  createdBy: tournament.createdBy,
});
```

### 2. Update Tournament
```typescript
PUT /api/tournaments/:id

Request Body:
{
  name?: string;
  slug?: string;
  description?: string;
  status?: TournamentStatus;
  format?: TournamentFormat;
  gameType?: GameType;
  raceToWins?: number;
  maxPlayers?: number;
}

Response:
{
  tournament: Tournament;
}

Socket Event (Emit):
socket.to(`org:${orgId}`).emit('tournament:updated', {
  tournamentId: tournament.id,
  orgId: tournament.orgId,
  updates: updatedFields,
});
```

### 3. Delete Tournament
```typescript
DELETE /api/tournaments/:id

Response:
{
  success: true;
}

Socket Event (Emit):
socket.to(`org:${orgId}`).emit('tournament:deleted', {
  tournamentId: id,
  orgId: tournament.orgId,
});
```

### 4. List Tournaments (Already Implemented)
```typescript
GET /api/tournaments?limit=50&offset=0&status=active

Response:
{
  tournaments: TournamentWithStats[];
  total: number;
  limit: number;
  offset: number;
}
```

### 5. Get Tournament Details (Already Implemented)
```typescript
GET /api/tournaments/:id

Response:
{
  tournament: TournamentWithStats;
}
```

---

## Backend Implementation Example

### Create Tournament Handler
```typescript
// File: apps/web/app/api/tournaments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSocket } from '@/lib/socket-server';
import { CreateTournamentRequestSchema } from '@tournament/api-contracts';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check permissions
    const canCreate = session.user.role === 'owner' || session.user.role === 'td';
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Parse and validate request
    const body = await request.json();
    const validated = CreateTournamentRequestSchema.parse(body);

    // 4. Create tournament in database
    const tournament = await prisma.tournament.create({
      data: {
        orgId: session.user.orgId,
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        format: validated.format,
        sport: validated.sport,
        gameType: validated.gameType,
        raceToWins: validated.raceToWins,
        maxPlayers: validated.maxPlayers,
        createdBy: session.user.id,
        status: 'draft',
      },
    });

    // 5. Emit Socket.io event
    const io = getServerSocket();
    io.to(`org:${session.user.orgId}`).emit('tournament:created', {
      tournamentId: tournament.id,
      orgId: tournament.orgId,
      name: tournament.name,
      createdBy: tournament.createdBy,
    });

    // 6. Return response
    return NextResponse.json({ tournament }, { status: 201 });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    );
  }
}
```

### Update Tournament Handler
```typescript
// File: apps/web/app/api/tournaments/[id]/route.ts

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check permissions
    const canEdit = session.user.role === 'owner' || session.user.role === 'td';
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Verify tournament ownership
    const existing = await prisma.tournament.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.orgId !== session.user.orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 4. Parse and validate request
    const body = await request.json();
    const validated = UpdateTournamentRequestSchema.parse(body);

    // 5. Validate status transition
    if (validated.status && existing.status !== validated.status) {
      const isValid = isValidStatusTransition(existing.status, validated.status);
      if (!isValid) {
        return NextResponse.json(
          { error: `Cannot transition from ${existing.status} to ${validated.status}` },
          { status: 400 }
        );
      }
    }

    // 6. Update tournament
    const tournament = await prisma.tournament.update({
      where: { id: params.id },
      data: validated,
    });

    // 7. Emit Socket.io event
    const io = getServerSocket();
    io.to(`org:${session.user.orgId}`).emit('tournament:updated', {
      tournamentId: tournament.id,
      orgId: tournament.orgId,
      updates: validated,
    });

    // 8. Return response
    return NextResponse.json({ tournament });
  } catch (error) {
    console.error('Error updating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to update tournament' },
      { status: 500 }
    );
  }
}
```

### Delete Tournament Handler
```typescript
// File: apps/web/app/api/tournaments/[id]/route.ts

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check permissions (only owner can delete)
    if (session.user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Verify tournament ownership
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    });

    if (!tournament || tournament.orgId !== session.user.orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 4. Delete tournament (cascades to players and matches)
    await prisma.tournament.delete({
      where: { id: params.id },
    });

    // 5. Emit Socket.io event
    const io = getServerSocket();
    io.to(`org:${session.user.orgId}`).emit('tournament:deleted', {
      tournamentId: params.id,
      orgId: tournament.orgId,
    });

    // 6. Return response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json(
      { error: 'Failed to delete tournament' },
      { status: 500 }
    );
  }
}
```

---

## Socket.io Event Types

### Define Event Interfaces
```typescript
// File: apps/web/lib/socket/events.ts

export interface TournamentCreatedPayload {
  tournamentId: string;
  orgId: string;
  name: string;
  createdBy: string;
}

export interface TournamentUpdatedPayload {
  tournamentId: string;
  orgId: string;
  updates: Partial<Tournament>;
}

export interface TournamentDeletedPayload {
  tournamentId: string;
  orgId: string;
}

// Add to ServerToClientEvents
export interface ServerToClientEvents {
  'tournament:created': (payload: TournamentCreatedPayload) => void;
  'tournament:updated': (payload: TournamentUpdatedPayload) => void;
  'tournament:deleted': (payload: TournamentDeletedPayload) => void;
  // ... existing events
}
```

---

## Testing the Integration

### 1. Manual Testing Checklist

**Create Tournament:**
- [ ] Navigate to `/admin/tournaments`
- [ ] Click "Create Tournament"
- [ ] Complete wizard (all 3 steps)
- [ ] Verify tournament appears in list
- [ ] Check Socket.io event in browser console

**Edit Tournament:**
- [ ] Click "Edit" on a tournament
- [ ] Change name, description, or settings
- [ ] Save changes
- [ ] Verify updates appear immediately
- [ ] Check other users see update (real-time)

**Delete Tournament:**
- [ ] Click "Delete" on a tournament
- [ ] Confirm deletion
- [ ] Verify tournament removed from list
- [ ] Check other users see removal (real-time)

**Bulk Operations:**
- [ ] Select multiple tournaments
- [ ] Click "Delete Selected"
- [ ] Confirm bulk deletion
- [ ] Verify all removed from list

### 2. E2E Test Example
```typescript
// File: apps/web/tests/e2e/admin-tournaments.spec.ts

import { test, expect } from '@playwright/test';

test('Admin can create, edit, and delete tournament', async ({ page }) => {
  // Login as owner
  await page.goto('/login');
  await page.fill('[name="email"]', 'owner@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Navigate to tournaments
  await page.goto('/admin/tournaments');
  await expect(page.locator('h1')).toContainText('Tournament Management');

  // Create tournament
  await page.click('text=Create Tournament');
  await page.fill('[name="name"]', 'Test Tournament');
  await page.click('text=Next');
  await page.click('text=Next');
  await page.click('text=Create Tournament');

  // Verify created
  await expect(page.locator('text=Test Tournament')).toBeVisible();

  // Edit tournament
  await page.click('text=Edit');
  await page.fill('[name="name"]', 'Updated Tournament');
  await page.click('text=Save Changes');

  // Verify updated
  await expect(page.locator('text=Updated Tournament')).toBeVisible();

  // Delete tournament
  await page.click('text=Delete');
  page.on('dialog', dialog => dialog.accept());
  await page.click('text=Delete');

  // Verify deleted
  await expect(page.locator('text=Updated Tournament')).not.toBeVisible();
});
```

---

## Troubleshooting

### Issue: Socket events not received
**Solution:**
1. Check Socket.io connection status (use `ConnectionStatus` component)
2. Verify user is subscribed to org room: `org:${orgId}`
3. Check server logs for emitted events
4. Verify event names match exactly

### Issue: Permission denied
**Solution:**
1. Check user role: `session.user.role`
2. Verify `canEdit` and `canDelete` logic
3. Check backend permission validation

### Issue: Tournament not found after creation
**Solution:**
1. Verify API response includes `tournament.id`
2. Check navigation: `router.push(\`/admin/tournaments/\${id}\`)`
3. Verify database insert succeeded
4. Check org context matches

### Issue: Real-time updates delayed
**Solution:**
1. Check Socket.io reconnection frequency
2. Verify event emission happens after database write
3. Check for rate limiting on Socket.io events
4. Monitor network latency

---

## Performance Optimization

### 1. Table Optimization
```typescript
// Use pagination to limit rendered rows
pagination: {
  pageSize: 10, // Start with 10, adjust based on performance
  pageIndex: 0,
}

// Use React.memo for table cells
const TournamentRow = React.memo(({ tournament }) => { ... });
```

### 2. Socket Event Debouncing
```typescript
// Debounce rapid updates
import { debounce } from 'lodash';

const debouncedUpdate = debounce((payload) => {
  setTournaments(prev => /* update logic */);
}, 300);

useSocketEvent('tournament:updated', debouncedUpdate);
```

### 3. Server-Side Pagination
```typescript
// For 1000+ tournaments, use server-side pagination
const [page, setPage] = useState(0);
const [pageSize, setPageSize] = useState(50);

useEffect(() => {
  fetch(`/api/tournaments?offset=${page * pageSize}&limit=${pageSize}`)
    .then(res => res.json())
    .then(data => setTournaments(data.tournaments));
}, [page, pageSize]);
```

---

## Deployment Checklist

### Frontend Deployment
- [ ] All TypeScript files compile without errors
- [ ] ESLint validation passes
- [ ] Dark mode tested
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Socket.io connection tested

### Backend Deployment
- [ ] API route handlers implemented
- [ ] Socket.io events integrated
- [ ] Permission checks added
- [ ] Error handling implemented
- [ ] Database indexes created

### Integration Testing
- [ ] Create tournament flow tested
- [ ] Edit tournament flow tested
- [ ] Delete tournament flow tested
- [ ] Real-time updates verified
- [ ] Multi-user testing completed

---

## Support

For questions or issues:
1. Check this integration guide
2. Review `/docs/sprint-9-phase-2-implementation.md`
3. Check source code comments
4. Review API contracts: `/packages/api-contracts/src/tournaments.ts`
5. Check Socket.io events: `/apps/web/lib/socket/events.ts`
