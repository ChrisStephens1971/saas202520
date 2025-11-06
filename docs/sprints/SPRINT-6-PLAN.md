# Sprint 6: Real-time Updates & Quality Improvements

**Sprint Duration:** 2025-11-06 to 2025-11-20 (2 weeks)
**Sprint Goal:** Add real-time updates, complete remaining UI, and improve quality
**Status:** 🎯 PLANNED

---

## Sprint Overview

**Focus:** Enhance chip format UI with real-time updates via WebSockets, complete the deferred tournament setup UI, add comprehensive unit tests, and optimize performance.

**Success Criteria:**
- WebSocket real-time updates working for standings and queue
- Tournament setup form (UI-001) completed
- Unit tests for all chip format UI components (>80% coverage)
- Performance optimizations applied
- No regressions in existing functionality

---

## Sprint Goals

### Primary Goals (Must Have)
1. **WebSocket Integration** - Real-time updates without polling
2. **Tournament Setup UI** - Complete UI-001 (deferred from Sprint 5)
3. **Unit Testing Suite** - Test all chip format components
4. **Performance Optimization** - Improve load times and bundle size

### Secondary Goals (Should Have)
5. **E2E Testing** - Playwright tests for critical user flows
6. **Error Boundaries** - Graceful error handling in React
7. **Accessibility Audit** - WCAG compliance improvements

### Stretch Goals (Nice to Have)
8. **Chip Progression Charts** - Use recharts for visualizations
9. **Dark Mode** - Theme switcher
10. **Mobile PWA** - Progressive Web App features

---

## User Stories

### Epic 1: WebSocket Real-time Updates (WS-001)

**As a** tournament director or player
**I want** instant updates when data changes
**So that** I don't have to wait for polling intervals

**Acceptance Criteria:**
- [ ] Socket.io server integration
- [ ] Client-side socket connection management
- [ ] Real-time chip standings updates
- [ ] Real-time queue status updates
- [ ] Real-time match assignment notifications
- [ ] Connection status indicator
- [ ] Automatic reconnection on disconnect
- [ ] Fallback to polling if WebSockets unavailable

**Technical Requirements:**
```typescript
// Server-side events to emit
- 'standings:updated' - When chip counts change
- 'queue:updated' - When queue status changes
- 'match:assigned' - When new match is assigned
- 'finals:applied' - When finals cutoff is triggered
- 'chips:adjusted' - When manual adjustment made
```

**Implementation:**
1. Add Socket.io to backend
2. Create socket event emitters in chip format APIs
3. Create React hook for socket connection
4. Update components to listen for socket events
5. Replace SWR polling with socket + SWR cache updates

---

### Epic 2: Tournament Setup UI (UI-001)

**As a** tournament director
**I want** a user-friendly form to create chip format tournaments
**So that** I can configure all settings without using the API directly

**Acceptance Criteria:**
- [ ] Multi-step wizard interface
- [ ] Step 1: Basic tournament info (name, date, game)
- [ ] Step 2: Chip format configuration
- [ ] Step 3: Advanced settings (pairing, tiebreaker)
- [ ] Step 4: Review and confirmation
- [ ] Form validation with Zod schema
- [ ] React Hook Form integration
- [ ] Preview of configuration before creation
- [ ] Template selection (preset configurations)
- [ ] Save as template option

**Form Fields:**
```typescript
interface ChipFormatTournamentForm {
  // Basic Info
  name: string;
  startDate: Date;
  game: string;
  description?: string;

  // Chip Configuration
  winnerChips: number; // Default: 3
  loserChips: number; // Default: 1
  qualificationRounds: number; // Default: 5
  finalsCount: number; // Default: 8

  // Advanced Settings
  pairingStrategy: 'random' | 'rating' | 'chip_diff';
  allowDuplicatePairings: boolean;
  tiebreaker: 'head_to_head' | 'rating' | 'random';

  // Optional
  maxPlayers?: number;
  entryFee?: number;
  prizePool?: number;
}
```

**Components:**
- TournamentSetupWizard
- BasicInfoStep
- ChipConfigStep
- AdvancedSettingsStep
- ReviewStep
- TemplateSelector

---

### Epic 3: Unit Testing Suite (TEST-001)

**As a** developer
**I want** comprehensive unit tests for chip format UI
**So that** I can refactor and add features with confidence

**Acceptance Criteria:**
- [ ] Test all 7 chip format components
- [ ] >80% code coverage for components
- [ ] Test user interactions (button clicks, form inputs)
- [ ] Test loading and error states
- [ ] Mock SWR data fetching
- [ ] Test sorting and filtering logic
- [ ] Test form validation
- [ ] Snapshot tests for UI consistency

**Test Files to Create:**
1. `ChipStandingsTable.test.tsx`
2. `QueueDashboard.test.tsx`
3. `MatchAssignmentButton.test.tsx`
4. `FinalsCutoffButton.test.tsx`
5. `ChipAdjustmentModal.test.tsx`
6. `QueueStatsDashboard.test.tsx`
7. `ChipHistoryTimeline.test.tsx`

**Testing Tools:**
- Vitest (already configured)
- React Testing Library
- @testing-library/user-event
- @testing-library/jest-dom

---

### Epic 4: Performance Optimization (PERF-001)

**As a** user
**I want** fast page loads and smooth interactions
**So that** I have a great user experience

**Acceptance Criteria:**
- [ ] Code splitting for chip format routes
- [ ] Image optimization (if any added)
- [ ] Bundle size analysis and reduction
- [ ] Lazy loading for heavy components
- [ ] React.memo for expensive renders
- [ ] useMemo/useCallback where appropriate
- [ ] Lighthouse score >90 (mobile & desktop)
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3.5s

**Optimizations to Apply:**
1. Dynamic imports for modals
2. Virtual scrolling for long standings tables
3. Debounce search/filter inputs
4. Optimize re-renders with React DevTools Profiler
5. Remove unused dependencies
6. Tree-shake large libraries

---

## Technical Implementation

### WebSocket Architecture

**Server Setup (Socket.io):**
```typescript
// apps/web/lib/socket-server.ts
import { Server } from 'socket.io';

export function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.NEXT_PUBLIC_URL },
    path: '/api/socket',
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join:tournament', (tournamentId) => {
      socket.join(`tournament:${tournamentId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}
```

**Client Hook:**
```typescript
// apps/web/hooks/useSocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(tournamentId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io({
      path: '/api/socket',
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      socketInstance.emit('join:tournament', tournamentId);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [tournamentId]);

  return { socket, isConnected };
}
```

**Component Integration:**
```typescript
// Update ChipStandingsTable to use WebSocket
export default function ChipStandingsTable({ tournamentId, finalsCount }: Props) {
  const { socket, isConnected } = useSocket(tournamentId);
  const { data, mutate } = useSWR(
    `/api/tournaments/${tournamentId}/chip-standings?includeStats=true`,
    fetcher,
    {
      refreshInterval: 0, // Disable polling, use WebSocket instead
      revalidateOnFocus: true,
    }
  );

  useEffect(() => {
    if (!socket) return;

    socket.on('standings:updated', () => {
      mutate(); // Trigger SWR revalidation
    });

    return () => {
      socket.off('standings:updated');
    };
  }, [socket, mutate]);

  // ... rest of component
}
```

---

## Testing Strategy

### Unit Tests Example

```typescript
// ChipStandingsTable.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import ChipStandingsTable from './ChipStandingsTable';

const mockStandings = [
  { playerId: '1', playerName: 'Player 1', chipCount: 20, rank: 1, wins: 5, losses: 0, matchesPlayed: 5, status: 'active' },
  { playerId: '2', playerName: 'Player 2', chipCount: 15, rank: 2, wins: 3, losses: 2, matchesPlayed: 5, status: 'active' },
];

describe('ChipStandingsTable', () => {
  it('renders standings data correctly', async () => {
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ChipStandingsTable tournamentId="test-1" finalsCount={8} />
      </SWRConfig>
    );

    await waitFor(() => {
      expect(screen.getByText('Player 1')).toBeInTheDocument();
      expect(screen.getByText('Player 2')).toBeInTheDocument();
    });
  });

  it('highlights finalists correctly', async () => {
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ChipStandingsTable tournamentId="test-1" finalsCount={1} />
      </SWRConfig>
    );

    await waitFor(() => {
      const finalistRow = screen.getByText('Player 1').closest('tr');
      expect(finalistRow).toHaveClass('bg-green-50');
    });
  });
});
```

### E2E Tests Example

```typescript
// e2e/chip-format-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chip Format Tournament Flow', () => {
  test('complete tournament workflow', async ({ page }) => {
    // Navigate to tournament
    await page.goto('/tournaments/test-tournament-id/chip-format');

    // Verify dashboard loads
    await expect(page.locator('h1')).toContainText('Test Tournament');

    // Assign a match
    await page.click('text=Assign Next Match');
    await expect(page.locator('text=Match Assigned Successfully')).toBeVisible();

    // Check standings updated
    await expect(page.locator('table')).toBeVisible();

    // Apply finals cutoff
    await page.click('text=Apply Finals Cutoff');
    await page.click('text=Apply Cutoff'); // Confirm modal
    await expect(page.locator('text=Finals Cutoff Applied')).toBeVisible();
  });
});
```

---

## Implementation Plan

### Phase 1: WebSocket Integration (Days 1-4)

**Day 1-2: Server Setup**
- [ ] Install Socket.io dependencies
- [ ] Create socket server initialization
- [ ] Add socket events to chip format APIs
- [ ] Test socket connection

**Day 3-4: Client Integration**
- [ ] Create useSocket hook
- [ ] Update ChipStandingsTable
- [ ] Update QueueDashboard
- [ ] Add connection status indicator
- [ ] Test real-time updates

---

### Phase 2: Tournament Setup UI (Days 5-8)

**Day 5-6: Wizard Structure**
- [ ] Create wizard component
- [ ] Implement step navigation
- [ ] Add form validation with Zod
- [ ] Integrate React Hook Form

**Day 7-8: Configuration Steps**
- [ ] Build all form steps
- [ ] Add template selector
- [ ] Implement review step
- [ ] Connect to tournament creation API
- [ ] Test complete flow

---

### Phase 3: Testing & Quality (Days 9-12)

**Day 9-10: Unit Tests**
- [ ] Set up React Testing Library
- [ ] Write component tests
- [ ] Achieve 80% coverage
- [ ] Fix any bugs found

**Day 11-12: E2E & Performance**
- [ ] Set up Playwright
- [ ] Write E2E tests for critical flows
- [ ] Run Lighthouse audits
- [ ] Apply performance optimizations
- [ ] Verify improvements

---

### Phase 4: Polish & Deploy (Days 13-14)

**Day 13: Final Polish**
- [ ] Error boundaries
- [ ] Accessibility improvements
- [ ] Mobile responsiveness check
- [ ] Documentation updates

**Day 14: Deployment**
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Performance verification
- [ ] Deploy to production

---

## Dependencies

### New Packages to Install

```bash
# WebSocket
pnpm add socket.io socket.io-client

# Testing
pnpm add -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
pnpm add -D @playwright/test

# Form Handling (already have react-hook-form, just need zod schemas)
# Already installed: react-hook-form, zod
```

---

## Success Metrics

### Quantitative
- [ ] WebSocket latency <100ms
- [ ] Unit test coverage >80%
- [ ] E2E tests covering 3 critical flows
- [ ] Lighthouse score >90
- [ ] Page load time <2s
- [ ] Bundle size <500KB (gzipped)

### Qualitative
- [ ] Real-time updates feel instant
- [ ] Tournament setup is intuitive
- [ ] No regressions in existing features
- [ ] Positive user feedback

---

## Risks & Mitigation

### Risk 1: WebSocket Complexity
**Mitigation:** Start with simple pub/sub, add complexity incrementally

### Risk 2: Test Coverage Time
**Mitigation:** Prioritize critical components, defer nice-to-have tests

### Risk 3: Performance Regressions
**Mitigation:** Continuous monitoring, benchmark before/after changes

---

## Definition of Done

A user story is "Done" when:
- [ ] Code implemented and tested
- [ ] Unit tests passing (>80% coverage)
- [ ] E2E tests passing (if applicable)
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Deployed to staging
- [ ] User acceptance testing passed

---

## Next Sprint Preview (Sprint 7)

**Potential Focus Areas:**
- Analytics & reporting dashboard
- Advanced tournament features (multi-day, progressive structures)
- Admin panel for system management
- Mobile app (React Native or PWA)
- Advanced notifications (push notifications)

---

**Sprint Created:** 2025-11-05
**Sprint Owner:** Development Team
**Status:** 🎯 READY TO START
