# Sprint 5: Chip Format Frontend UI

**Sprint Duration:** 2025-11-06 to 2025-11-19 (2 weeks)
**Sprint Goal:** Build complete frontend UI for chip format tournaments
**Status:** 🎯 PLANNED

---

## Sprint Overview

**Focus:** Create user-facing interfaces for the chip format tournament system, enabling tournament directors and players to interact with the chip-based tournament workflow.

**Success Criteria:**
- Tournament directors can configure and manage chip format tournaments
- Players can view live chip standings
- Match assignments display in real-time
- Queue status visible to TDs
- Manual chip adjustments interface working
- Finals cutoff can be triggered from UI

---

## Sprint Goals

### Primary Goals (Must Have)
1. **Tournament Setup UI** - Configure chip format tournaments
2. **Live Chip Standings** - Real-time leaderboard display
3. **Queue Management UI** - View and manage match queue
4. **Match Assignment Interface** - Assign matches from queue
5. **Finals Cutoff UI** - Trigger and manage finals cutoff

### Secondary Goals (Should Have)
6. **Manual Chip Adjustments** - TD interface for corrections
7. **Queue Statistics Dashboard** - Visual queue status
8. **Player Chip History** - View chip progression

### Stretch Goals (Nice to Have)
9. **Real-time Updates** - WebSocket integration
10. **Mobile Responsive** - Mobile-first design
11. **Chip Progression Charts** - Visual analytics

---

## User Stories

### Epic 1: Tournament Setup (UI-001)

**As a** tournament director
**I want to** create a chip format tournament with custom settings
**So that** I can run chip-based qualifications

**Acceptance Criteria:**
- [ ] Can select "Chip Format" as tournament type
- [ ] Can configure winner chips (default: 3)
- [ ] Can configure loser chips (default: 1)
- [ ] Can set qualification rounds (default: 5)
- [ ] Can set finals count (default: 8)
- [ ] Can select pairing strategy (random/rating/chip_diff)
- [ ] Can enable/disable duplicate pairings
- [ ] Can select tiebreaker method (head_to_head/rating/random)
- [ ] Settings validate before saving
- [ ] Clear help text for each setting

**API Endpoints Used:**
- POST `/api/tournaments` (existing, with chipConfig)

---

### Epic 2: Live Chip Standings (UI-002)

**As a** player or tournament director
**I want to** view live chip standings
**So that** I can see current rankings and qualification status

**Acceptance Criteria:**
- [ ] Displays player rankings by chip count
- [ ] Shows chip count, matches played, wins/losses
- [ ] Highlights top N players (finalist zone)
- [ ] Updates in real-time (or on refresh)
- [ ] Sortable by different columns
- [ ] Shows player's own rank prominently
- [ ] Mobile responsive design
- [ ] Shows tournament statistics (avg chips, max, min)

**API Endpoints Used:**
- GET `/api/tournaments/[id]/chip-standings?includeStats=true`

**Components:**
```typescript
- ChipStandingsTable
- ChipStandingRow
- PlayerChipBadge
- QualificationIndicator
- TournamentStats
```

---

### Epic 3: Queue Management (UI-003)

**As a** tournament director
**I want to** view and manage the match queue
**So that** I can see who's available for pairing

**Acceptance Criteria:**
- [ ] Shows number of players in queue
- [ ] Shows active matches count
- [ ] Shows pending matches count
- [ ] Displays available players list
- [ ] Shows players currently in matches
- [ ] Auto-refreshes queue status
- [ ] Visual indicators for queue health
- [ ] Shows next recommended pairing

**API Endpoints Used:**
- GET `/api/tournaments/[id]/queue-stats`

**Components:**
```typescript
- QueueDashboard
- QueueStatusCard
- AvailablePlayersList
- ActiveMatchesList
```

---

### Epic 4: Match Assignment (UI-004)

**As a** tournament director
**I want to** assign matches from the queue
**So that** players can compete and earn chips

**Acceptance Criteria:**
- [ ] Single-click match assignment
- [ ] Batch assignment (multiple matches at once)
- [ ] Shows assigned player names
- [ ] Displays table number (if available)
- [ ] Confirms assignment success
- [ ] Shows error if not enough players
- [ ] Disables button when queue empty
- [ ] Shows loading state during assignment

**API Endpoints Used:**
- POST `/api/tournaments/[id]/matches/assign-next`
- POST `/api/tournaments/[id]/matches/assign-next` (with count for batch)

**Components:**
```typescript
- MatchAssignmentButton
- BatchAssignmentControl
- AssignmentConfirmation
- MatchAssignmentCard
```

---

### Epic 5: Finals Cutoff (UI-005)

**As a** tournament director
**I want to** trigger the finals cutoff
**So that** top players advance to bracket play

**Acceptance Criteria:**
- [ ] Shows "Apply Finals Cutoff" button
- [ ] Confirms action before applying
- [ ] Shows preview of finalists/eliminated
- [ ] Displays tiebreaker information
- [ ] Shows finalists count vs configured count
- [ ] Disabled if already applied
- [ ] Success confirmation with finalist list
- [ ] Can view cutoff results after applied

**API Endpoints Used:**
- POST `/api/tournaments/[id]/apply-finals-cutoff`

**Components:**
```typescript
- FinalsCutoffButton
- FinalsCutoffConfirmation
- FinalistsList
- EliminatedPlayersList
- TiebreakerResults
```

---

### Epic 6: Manual Chip Adjustments (UI-006)

**As a** tournament director
**I want to** manually adjust player chips
**So that** I can correct errors or apply penalties

**Acceptance Criteria:**
- [ ] Can select player from dropdown
- [ ] Can enter positive or negative adjustment
- [ ] Must provide reason for adjustment
- [ ] Shows current chip count
- [ ] Previews new chip count
- [ ] Confirms adjustment before applying
- [ ] Shows adjustment history
- [ ] Validates adjustment amount
- [ ] Prevents negative chip counts

**API Endpoints Used:**
- PATCH `/api/tournaments/[id]/players/[playerId]/chips`

**Components:**
```typescript
- ChipAdjustmentModal
- PlayerSelector
- AdjustmentInput
- ReasonTextarea
- AdjustmentPreview
- ChipHistoryList
```

---

### Epic 7: Queue Statistics Dashboard (UI-007)

**As a** tournament director
**I want to** see visual queue statistics
**So that** I can monitor tournament flow

**Acceptance Criteria:**
- [ ] Shows visual progress bars
- [ ] Displays match completion percentage
- [ ] Shows average chips per player
- [ ] Displays active/pending/completed counts
- [ ] Color-coded status indicators
- [ ] Updates automatically
- [ ] Responsive to different screen sizes

**API Endpoints Used:**
- GET `/api/tournaments/[id]/queue-stats`
- GET `/api/tournaments/[id]/chip-standings?includeStats=true`

**Components:**
```typescript
- QueueStatsDashboard
- StatCard
- ProgressBar
- StatusIndicator
```

---

### Epic 8: Player Chip History (UI-008)

**As a** player
**I want to** view my chip earning history
**So that** I can see how I earned my chips

**Acceptance Criteria:**
- [ ] Shows chronological list of chip awards
- [ ] Displays match ID for each award
- [ ] Shows chips earned per match
- [ ] Displays manual adjustments separately
- [ ] Shows timestamp for each award
- [ ] Running total of chips
- [ ] Can expand to see match details

**API Endpoints Used:**
- GET `/api/tournaments/[id]/players/[playerId]` (includes chipHistory)

**Components:**
```typescript
- ChipHistoryTimeline
- ChipAwardCard
- ManualAdjustmentCard
- ChipTotal
```

---

## Technical Requirements

### Framework & Libraries

**Frontend Stack:**
```json
{
  "framework": "Next.js 16 (App Router)",
  "ui": "shadcn/ui + Tailwind CSS",
  "state": "React hooks + SWR for data fetching",
  "forms": "React Hook Form + Zod validation",
  "icons": "Lucide React",
  "charts": "Recharts (for chip progression)"
}
```

### Component Architecture

**Directory Structure:**
```
apps/web/app/
├── tournaments/
│   └── [id]/
│       └── chip-format/
│           ├── page.tsx (main chip format dashboard)
│           ├── standings/
│           │   └── page.tsx
│           ├── queue/
│           │   └── page.tsx
│           └── settings/
│               └── page.tsx
└── components/
    └── chip-format/
        ├── ChipStandingsTable.tsx
        ├── QueueDashboard.tsx
        ├── MatchAssignmentButton.tsx
        ├── FinalsCutoffButton.tsx
        ├── ChipAdjustmentModal.tsx
        └── ...
```

### Data Fetching Strategy

**Use SWR for real-time updates:**
```typescript
import useSWR from 'swr';

// Auto-refreshing standings
const { data, error, mutate } = useSWR(
  `/api/tournaments/${id}/chip-standings?includeStats=true`,
  { refreshInterval: 5000 } // Refresh every 5 seconds
);

// Manual refresh after actions
await mutate(); // Re-fetch after match assignment
```

---

## Design Guidelines

### UI/UX Principles

1. **Real-time First**
   - Data should refresh automatically
   - Loading states for all async operations
   - Optimistic updates where possible

2. **Tournament Director Focus**
   - Quick actions accessible
   - Batch operations supported
   - Clear confirmation for destructive actions

3. **Player Experience**
   - Clear visibility of standings
   - Own rank highlighted
   - Qualification status obvious

4. **Mobile Responsive**
   - Works on tablets and phones
   - Touch-friendly buttons
   - Responsive tables

5. **Accessibility**
   - ARIA labels on all interactive elements
   - Keyboard navigation
   - Screen reader support

### Color Scheme

```typescript
const chipFormatColors = {
  finalist: 'green', // Top N players
  qualification: 'blue', // In qualification zone
  danger: 'red', // Elimination zone
  neutral: 'gray', // Default
  active: 'yellow', // Currently playing
};
```

---

## Implementation Plan

### Phase 1: Core UI (Days 1-5)
**Priority: MUST HAVE**

**Day 1-2: Tournament Setup**
- [ ] Create chip format tournament creation form
- [ ] Add configuration validation
- [ ] Integrate with existing tournament creation flow

**Day 3-4: Chip Standings**
- [ ] Build standings table component
- [ ] Add real-time refresh
- [ ] Implement sorting and filtering
- [ ] Add statistics display

**Day 5: Queue Dashboard**
- [ ] Create queue status cards
- [ ] Build available players list
- [ ] Add auto-refresh functionality

---

### Phase 2: Actions & Management (Days 6-9)
**Priority: MUST HAVE**

**Day 6-7: Match Assignment**
- [ ] Build single match assignment button
- [ ] Add batch assignment interface
- [ ] Implement loading and error states
- [ ] Add assignment confirmations

**Day 8: Finals Cutoff**
- [ ] Create finals cutoff trigger UI
- [ ] Build confirmation modal
- [ ] Display finalist/eliminated lists
- [ ] Show tiebreaker results

**Day 9: Manual Adjustments**
- [ ] Build chip adjustment modal
- [ ] Add player selection
- [ ] Implement reason requirement
- [ ] Create adjustment preview

---

### Phase 3: Polish & Enhancement (Days 10-14)
**Priority: NICE TO HAVE**

**Day 10-11: Advanced Features**
- [ ] Add chip history timeline
- [ ] Build queue statistics dashboard
- [ ] Create chip progression charts

**Day 12-13: Real-time Updates**
- [ ] Implement WebSocket connection
- [ ] Add live match updates
- [ ] Push standings changes

**Day 14: Mobile & Testing**
- [ ] Mobile responsive refinements
- [ ] Cross-browser testing
- [ ] Accessibility audit
- [ ] Performance optimization

---

## Testing Strategy

### Unit Tests
- [ ] Component rendering tests
- [ ] User interaction tests
- [ ] Form validation tests
- [ ] State management tests

### Integration Tests
- [ ] End-to-end tournament flow
- [ ] Match assignment workflow
- [ ] Finals cutoff process
- [ ] Manual adjustment flow

### Manual Testing
- [ ] Tournament director workflows
- [ ] Player viewing experience
- [ ] Mobile device testing
- [ ] Accessibility testing

---

## API Integration

### Existing Endpoints (Already Implemented)

All backend APIs are complete and tested:

1. **GET** `/api/tournaments/[id]/chip-standings?includeStats=true`
2. **POST** `/api/tournaments/[id]/matches/assign-next`
3. **GET** `/api/tournaments/[id]/queue-stats`
4. **PATCH** `/api/tournaments/[id]/players/[playerId]/chips`
5. **POST** `/api/tournaments/[id]/apply-finals-cutoff`

**No new backend work required** - all APIs are production-ready.

---

## Dependencies

### NPM Packages to Install

```bash
pnpm add swr recharts date-fns
pnpm add -D @types/recharts
```

**Justification:**
- `swr` - Data fetching with automatic revalidation
- `recharts` - Chip progression charts
- `date-fns` - Timestamp formatting

---

## Success Metrics

### Quantitative Metrics
- [ ] All 8 user stories completed
- [ ] 100% component test coverage
- [ ] <2s page load time
- [ ] <500ms API response time
- [ ] Mobile lighthouse score >90

### Qualitative Metrics
- [ ] TDs can run entire tournament from UI
- [ ] Players can track progress easily
- [ ] No confusion about qualification status
- [ ] Positive user feedback

---

## Risks & Mitigation

### Risk 1: Real-time Updates Complexity
**Mitigation:** Start with polling (SWR), add WebSockets in Phase 3

### Risk 2: Mobile Performance
**Mitigation:** Progressive enhancement, test early on mobile

### Risk 3: State Management Complexity
**Mitigation:** Use SWR caching, avoid premature optimization

---

## Sprint Ceremonies

### Daily Standup
- What did I complete yesterday?
- What will I work on today?
- Any blockers?

### Sprint Review (End of Sprint)
- Demo all completed features
- Get user feedback
- Document lessons learned

### Sprint Retrospective
- What went well?
- What can improve?
- Action items for next sprint

---

## Definition of Done

A user story is "Done" when:
- [ ] Code is written and follows standards
- [ ] Component tests passing
- [ ] Integration tests passing
- [ ] Code reviewed
- [ ] Documented (if needed)
- [ ] Deployed to staging
- [ ] Accepted by product owner

---

## Next Sprint Preview (Sprint 6)

**Potential Focus Areas:**
- Real-time updates (WebSockets)
- Analytics & reporting dashboard
- Admin panel for system management
- Mobile app (if needed)
- Performance optimization

---

## Resources

### Documentation
- API Docs: `docs/api/chip-format-api.md`
- Implementation: `docs/progress/CHIP-FORMAT-COMPLETE.md`
- Figma Designs: (TBD)

### Related Sprints
- Sprint 4: Chip Format Backend (COMPLETE)
- Sprint 3: Notifications & Payments (COMPLETE)
- Sprint 2: Bracket Systems (COMPLETE)

---

## Sprint Board

**Backlog:**
- All user stories listed above

**To Do:**
- (Sprint starts on Day 1)

**In Progress:**
- (None yet)

**Done:**
- (None yet)

---

**Sprint Created:** 2025-11-05
**Sprint Owner:** Development Team
**Status:** 🎯 READY TO START
