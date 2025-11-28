# Sprint 7 Plan: Testing, Analytics & Performance

**Sprint:** Sprint 7 - E2E Testing, Analytics Dashboard & Performance Monitoring
**Duration:** 2025-11-07 to 2025-11-21 (2 weeks)
**Status:** 📋 PLANNED
**Owner:** Development Team

---

## Sprint Goals

### Primary Goals (Must Have)

1. **E2E Testing with Playwright (TEST-002)** ⭐ HIGH PRIORITY
   - Set up Playwright for browser automation
   - Create E2E tests for chip format tournament workflows
   - Test real-time WebSocket updates
   - Verify Tournament Setup Wizard end-to-end
   - **Why:** Deferred from Sprint 6, critical for production confidence

2. **Performance Monitoring (PERF-002)**
   - Integrate Lighthouse CI into build pipeline
   - Set performance budgets
   - Monitor Core Web Vitals
   - Automated performance regression detection

3. **Analytics Dashboard (ANALYTICS-001)**
   - Chip progression charts with recharts
   - Tournament statistics visualization
   - Player performance analytics
   - Real-time tournament insights

### Secondary Goals (Should Have)

4. **Mobile PWA Optimization (MOBILE-001)**
   - Progressive Web App manifest
   - Service Worker for offline support
   - Mobile-optimized responsive design
   - Add to Home Screen functionality

5. **Advanced Notifications (NOTIFY-001)**
   - Push notifications via WebSocket
   - Browser notification API integration
   - Notification preferences UI
   - Tournament event notifications (match assigned, finals cutoff, etc.)

### Stretch Goals (Nice to Have)

- Dark mode theme switcher
- Export tournament reports (PDF)
- Multi-language support (i18n)
- Advanced tournament filtering

---

## Success Metrics

### Quantitative

- [ ] E2E test coverage: >80% of critical user flows
- [ ] Lighthouse performance score: >90
- [ ] Lighthouse accessibility score: >95
- [ ] First Contentful Paint: <1.5s
- [ ] Time to Interactive: <3.5s
- [ ] Mobile responsive: All pages work on 375px width

### Qualitative

- [ ] E2E tests run reliably in CI/CD
- [ ] Performance regressions caught automatically
- [ ] Analytics provide actionable insights
- [ ] Mobile experience feels native-like
- [ ] Notifications are timely and relevant

---

## Technical Implementation

### 1. E2E Testing with Playwright (TEST-002)

**Goal:** Comprehensive browser automation testing for critical workflows

**Tasks:**

1. Install and configure Playwright
   - `pnpm add -D @playwright/test`
   - Create `playwright.config.ts`
   - Set up test database seeding

2. Create E2E test suites
   - **Tournament Creation Flow**
     - User opens Tournament Setup Wizard
     - Fills out 4-step form
     - Submits and navigates to tournament page
     - Verifies tournament created in database

   - **Chip Format Tournament Flow**
     - Create tournament
     - Add players
     - Assign matches
     - Record match results
     - Award chips
     - Verify standings update
     - Apply finals cutoff
     - Verify finalists selected

   - **Real-time WebSocket Flow**
     - Open tournament page in two browser contexts
     - Record match result in context 1
     - Verify standings update in context 2 (WebSocket)
     - Verify connection indicator shows "connected"

   - **Queue Management Flow**
     - Add players to queue
     - Assign next match
     - Verify match assignment
     - Verify queue stats update

3. CI/CD Integration
   - Add Playwright to GitHub Actions
   - Parallel test execution
   - Screenshot/video on failure
   - Test result reporting

**Files to Create:**

- `apps/web/playwright.config.ts`
- `apps/web/tests/e2e/tournament-setup.spec.ts`
- `apps/web/tests/e2e/chip-format-flow.spec.ts`
- `apps/web/tests/e2e/websocket-realtime.spec.ts`
- `apps/web/tests/e2e/queue-management.spec.ts`
- `.github/workflows/e2e-tests.yml`

**Dependencies:**

```json
{
  "@playwright/test": "^1.48.0"
}
```

**Estimated Effort:** 16-20 hours

---

### 2. Performance Monitoring (PERF-002)

**Goal:** Automated performance tracking and regression detection

**Tasks:**

1. Install Lighthouse CI
   - `pnpm add -D @lhci/cli`
   - Create `.lighthouserc.json`
   - Configure performance budgets

2. Set up performance budgets

   ```json
   {
     "budgets": [
       {
         "resourceSizes": [
           { "resourceType": "script", "budget": 400 },
           { "resourceType": "stylesheet", "budget": 100 },
           { "resourceType": "image", "budget": 300 },
           { "resourceType": "total", "budget": 1000 }
         ]
       },
       {
         "timings": [
           { "metric": "first-contentful-paint", "budget": 1500 },
           { "metric": "interactive", "budget": 3500 },
           { "metric": "largest-contentful-paint", "budget": 2500 }
         ]
       }
     ]
   }
   ```

3. CI/CD Integration
   - Run Lighthouse on PR builds
   - Comment performance results on PRs
   - Fail builds if performance regressions detected

4. Web Vitals Monitoring
   - Integrate `web-vitals` library
   - Send metrics to analytics endpoint
   - Create performance monitoring dashboard

**Files to Create:**

- `.lighthouserc.json`
- `apps/web/lib/web-vitals.ts`
- `.github/workflows/lighthouse-ci.yml`

**Dependencies:**

```json
{
  "@lhci/cli": "^0.14.0",
  "web-vitals": "^4.2.4"
}
```

**Estimated Effort:** 8-10 hours

---

### 3. Analytics Dashboard (ANALYTICS-001)

**Goal:** Visual analytics for tournament insights

**Tasks:**

1. Install recharts
   - `pnpm add recharts`
   - Create analytics component library

2. Create Chart Components
   - **Chip Progression Chart**
     - Line chart showing chip count over time per player
     - X-axis: Time/Round
     - Y-axis: Chip count
     - Multiple lines for each player

   - **Match Activity Chart**
     - Bar chart showing matches per time period
     - X-axis: Time period
     - Y-axis: Number of matches

   - **Player Performance Chart**
     - Win/loss ratio visualization
     - Pie chart or bar chart
     - Filter by player

   - **Tournament Statistics Card**
     - Total players
     - Total matches
     - Total chips in play
     - Average chips per player
     - Finals qualification rate

3. Analytics API Endpoints
   - `GET /api/tournaments/[id]/analytics/chip-progression`
   - `GET /api/tournaments/[id]/analytics/match-activity`
   - `GET /api/tournaments/[id]/analytics/player-performance`
   - `GET /api/tournaments/[id]/analytics/statistics`

4. Analytics Dashboard Page
   - Create `/tournaments/[id]/analytics` route
   - Layout with multiple chart sections
   - Export button for data (CSV/JSON)
   - Date range filter

**Files to Create:**

- `apps/web/components/analytics/ChipProgressionChart.tsx`
- `apps/web/components/analytics/MatchActivityChart.tsx`
- `apps/web/components/analytics/PlayerPerformanceChart.tsx`
- `apps/web/components/analytics/StatisticsCard.tsx`
- `apps/web/app/tournaments/[id]/analytics/page.tsx`
- `apps/web/app/api/tournaments/[id]/analytics/chip-progression/route.ts`
- `apps/web/app/api/tournaments/[id]/analytics/match-activity/route.ts`
- `apps/web/app/api/tournaments/[id]/analytics/player-performance/route.ts`
- `apps/web/app/api/tournaments/[id]/analytics/statistics/route.ts`

**Dependencies:**

```json
{
  "recharts": "^2.15.0"
}
```

**Estimated Effort:** 12-16 hours

---

### 4. Mobile PWA Optimization (MOBILE-001)

**Goal:** Native-like mobile experience with offline support

**Tasks:**

1. Create PWA Manifest
   - App name, icons, theme colors
   - Display mode: standalone
   - Start URL
   - Orientation

2. Implement Service Worker
   - Cache-first strategy for static assets
   - Network-first for API calls
   - Offline fallback page
   - Background sync for mutations

3. Mobile UI Improvements
   - Touch-friendly buttons (min 44x44px)
   - Swipe gestures for navigation
   - Bottom navigation for mobile
   - Responsive tables with horizontal scroll
   - Mobile-optimized forms

4. Add to Home Screen Prompt
   - Detect mobile browsers
   - Show install prompt banner
   - Handle beforeinstallprompt event

**Files to Create:**

- `apps/web/public/manifest.json`
- `apps/web/public/sw.js`
- `apps/web/components/PWAInstallPrompt.tsx`
- `apps/web/lib/service-worker-registration.ts`

**Dependencies:**

```json
{
  "next-pwa": "^5.6.0"
}
```

**Estimated Effort:** 10-12 hours

---

### 5. Advanced Notifications (NOTIFY-001)

**Goal:** Real-time push notifications for tournament events

**Tasks:**

1. Browser Notification API Integration
   - Request notification permission
   - Create notification utility functions
   - Handle notification clicks

2. WebSocket Event Notifications
   - Extend WebSocket events to trigger notifications
   - Notification for:
     - Match assigned to you
     - Finals cutoff applied
     - Tournament starting soon
     - Chips adjusted
     - New message/announcement

3. Notification Preferences UI
   - User settings page
   - Toggle notifications by type
   - Quiet hours setting
   - Sound/vibration preferences

4. Notification Service
   - Queue notifications
   - Batch similar notifications
   - Respect user preferences
   - Handle notification errors gracefully

**Files to Create:**

- `apps/web/lib/notifications.ts`
- `apps/web/hooks/useNotifications.ts`
- `apps/web/components/settings/NotificationSettings.tsx`
- `apps/web/app/api/notifications/preferences/route.ts`

**Database Changes:**

```sql
-- Add notification preferences to user
ALTER TABLE "User" ADD COLUMN "notificationPreferences" JSONB DEFAULT '{"matchAssigned": true, "finalsCutoff": true, "chipsAdjusted": true}'::JSONB;
```

**Estimated Effort:** 8-10 hours

---

## Sprint Timeline

### Week 1 (Nov 7-13)

**Day 1-2: E2E Testing Setup**

- Install Playwright
- Configure test environment
- Create first E2E test (tournament creation)

**Day 3-4: E2E Test Suites**

- Chip format tournament flow tests
- WebSocket real-time tests
- Queue management tests

**Day 5: Performance Monitoring**

- Install Lighthouse CI
- Configure performance budgets
- Set up CI/CD integration

### Week 2 (Nov 14-21)

**Day 1-2: Analytics Dashboard**

- Install recharts
- Create chart components
- Build analytics API endpoints

**Day 3: Analytics Dashboard UI**

- Create analytics dashboard page
- Integrate charts
- Add export functionality

**Day 4: Mobile PWA (if time permits)**

- Create PWA manifest
- Implement service worker
- Mobile UI improvements

**Day 5: Advanced Notifications (if time permits)**

- Browser notification API
- WebSocket event notifications
- Notification preferences UI

---

## Dependencies and Prerequisites

### Technical Prerequisites

- Sprint 6 complete (WebSocket integration, Tournament Setup Wizard)
- Database accessible for E2E tests
- CI/CD pipeline configured

### External Dependencies

- None (all libraries are well-maintained open source)

### Team Dependencies

- None (can be completed independently)

---

## Risks and Mitigation

### Risk 1: E2E Tests Flaky

**Probability:** Medium
**Impact:** High
**Mitigation:**

- Use Playwright's auto-waiting features
- Implement proper test isolation
- Use retry logic for network operations
- Run tests multiple times in CI

### Risk 2: Performance Budget Too Strict

**Probability:** Medium
**Impact:** Medium
**Mitigation:**

- Start with reasonable budgets
- Iterate based on actual measurements
- Allow for some variance
- Focus on trends, not absolute numbers

### Risk 3: Analytics Queries Slow

**Probability:** Low
**Impact:** Medium
**Mitigation:**

- Add database indexes for analytics queries
- Implement caching for expensive aggregations
- Use pagination for large datasets
- Consider pre-computing common analytics

### Risk 4: Service Worker Caching Issues

**Probability:** Medium
**Impact:** Medium
**Mitigation:**

- Implement versioned cache names
- Clear old caches automatically
- Test cache invalidation thoroughly
- Provide manual cache clear option

---

## Definition of Done

Sprint 7 is "Done" when:

- [x] E2E tests implemented and passing (>80% critical flow coverage)
- [x] E2E tests integrated into CI/CD pipeline
- [x] Lighthouse CI configured with performance budgets
- [x] Lighthouse runs on all PR builds
- [x] Analytics dashboard implemented with charts
- [x] Analytics API endpoints tested and documented
- [ ] PWA manifest and service worker implemented (secondary goal)
- [ ] Mobile UI optimizations complete (secondary goal)
- [ ] Push notifications working (secondary goal)
- [x] All tests passing (unit, integration, E2E)
- [x] No linting errors
- [x] Documentation updated
- [x] Code reviewed
- [ ] Deployed to staging
- [ ] User acceptance testing passed

---

## Testing Strategy

### E2E Tests (New in Sprint 7)

- Playwright browser automation
- Critical user flows covered
- Run in CI/CD on every PR
- Screenshot/video on failure

### Unit Tests

- Maintain >80% coverage
- Test new analytics functions
- Test notification logic

### Integration Tests

- Existing chip format integration tests pass
- Add analytics API integration tests

### Performance Tests

- Lighthouse CI on every PR
- Performance budgets enforced
- Core Web Vitals monitored

---

## Technical Debt

### Addressed in Sprint 7

- E2E testing gap (deferred from Sprint 6)
- Performance monitoring gap
- Mobile experience gap

### Deferred to Future Sprints

- Dark mode implementation
- Multi-language support (i18n)
- PDF export functionality
- Advanced filtering

---

## Notes

### From Sprint 6 Retrospective

- E2E testing was deferred due to time constraints
- Performance monitoring should be automated
- Mobile experience needs improvement
- Analytics would provide valuable insights

### For Engineering Team

- Playwright requires Chromium/Firefox/WebKit browsers
- Service workers require HTTPS (or localhost)
- Notification API requires user permission
- Lighthouse CI requires deployment URL

### For Product Team

- E2E tests will give confidence for production launches
- Analytics dashboard will help tournament directors make decisions
- Mobile PWA will improve mobile user experience
- Notifications will improve user engagement

---

## Sprint Review Checklist

At the end of Sprint 7, review:

- [ ] All primary goals completed
- [ ] E2E tests running reliably in CI
- [ ] Performance budgets met
- [ ] Analytics dashboard provides value
- [ ] Demo prepared for stakeholders
- [ ] Sprint 8 priorities identified
- [ ] Retrospective scheduled

---

**Sprint Owner:** Development Team
**Created:** 2025-11-06
**Status:** 📋 PLANNED
**Next Review:** 2025-11-21

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
