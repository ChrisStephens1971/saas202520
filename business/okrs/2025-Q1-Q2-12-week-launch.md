# OKRs - Q1-Q2 2025 (12-Week Launch)

**Period:** Nov 4, 2025 - Jan 24, 2026 (12 weeks)
**Owner:** Development Team
**Status:** Active
**Last Updated:** 2025-11-03

---

## Company Vision & Strategy

**Vision:** Build the ultimate offline-first tournament platform that runs flawlessly when Wi-Fi doesn't. Starting with Pool/Billiards, expanding to multi-sport dominance.

**This Period's Focus:** Complete Build of Pool/Billiards MVP. Ship a production-ready platform with offline-first sync, all bracket formats, payments, notifications, and Fargo integration. Validate with 2 external beta tournaments before public launch.

---

## Objective 1: Ship Production-Ready Platform in 12 Weeks

**Why this matters:** This is our foundational product. We must build a complete, reliable platform that TDs trust with their tournaments. Rushing to market with incomplete features would damage our reputation. A complete build validates our architecture and proves the offline-first approach works at scale.

### Key Result 1.1: Complete 100% of planned scope (all 6 sprints)

- **Target:** 100% of high-priority stories shipped by Week 12
- **Current:** 0% (starting)
- **Progress:** 0% 🟡
- **Owner:** Team
- **Confidence:** Medium (aggressive timeline, 2-person team)

**Progress Updates:**

- 2025-11-03: Sprint 1 starting today. Foundation sprint is critical - must complete by Week 2.

### Key Result 1.2: Pass all acceptance criteria from project brief

- **Target:** 100% of acceptance criteria pass by Week 12
- **Current:** 0%
- **Progress:** 0% 🟡
- **Owner:** Team
- **Confidence:** Medium

**Acceptance Criteria Checklist:**

- [ ] 64-player double-elim on 2 devices, Wi-Fi off 30 min, no data loss
- [ ] SMS "table now" median delivery <2s, >98% success
- [ ] RLS policies proven (cross-tenant access fails at DB level)
- [ ] Stripe: venue onboarding, entry fees, refunds, payout reconciliation works
- [ ] Fargo: unsupported formats blocked, supported formats export cleanly
- [ ] Printables: brackets and payout sheets render legibly
- [ ] Performance: overlay updates p50 <200ms, p95 <600ms

**Progress Updates:**

- 2025-11-03: Acceptance criteria defined in project brief and Sprint 6 plan.

### Key Result 1.3: Complete 2 external beta tournaments successfully

- **Target:** 2 beta tournaments (32-player, 64-player) complete without manual fixes
- **Current:** 0 tournaments
- **Progress:** 0% 🟡
- **Owner:** Team
- **Confidence:** Medium

**Progress Updates:**

- 2025-11-03: Need to line up 2 venues by Week 8. Targeting Week 11 (Beta 1) and Week 12 (Beta 2).

---

## Objective 2: Build Reliable Offline-First Architecture

**Why this matters:** Offline-first is our core differentiator. If sync doesn't work reliably, the entire product fails. We must prove the CRDT architecture handles real-world tournament chaos: flaky Wi-Fi, concurrent updates, device failures.

### Key Result 2.1: CRDT library evaluated and implemented by Week 2

- **Target:** CRDT library selected (ADR-003 updated to "Accepted"), basic sync working
- **Current:** Evaluation pending (Y.js vs Automerge)
- **Progress:** 0% 🟡
- **Owner:** Team
- **Confidence:** Medium (this is the hardest technical decision)

**Progress Updates:**

- 2025-11-03: ADR-003 created with evaluation plan. Days 1-3: Y.js prototype. Days 4-8: Decide or prototype Automerge. Decision by end of Week 2.

### Key Result 2.2: Chaos tests pass with 100% reliability

- **Target:** Offline flapping tests pass 10/10 times with deterministic merge
- **Current:** Tests not written yet
- **Progress:** 0% 🟡
- **Owner:** Team
- **Confidence:** Low (CRDT complexity is high risk)

**Progress Updates:**

- 2025-11-03: Chaos tests planned for Sprint 6 (Week 11). Must pass before Beta 1.

### Key Result 2.3: Zero data loss in beta tournaments

- **Target:** 0 incidents of data loss or conflict resolution errors in beta tournaments
- **Current:** N/A (no betas yet)
- **Progress:** 0% 🟡
- **Owner:** Team
- **Confidence:** Medium

**Progress Updates:**

- 2025-11-03: Will track during beta tournaments (Weeks 11-12).

---

## Objective 3: Validate Product-Market Fit with Real Venues

**Why this matters:** We can build the most technically impressive platform, but if TDs don't use it or venues don't trust it, we fail. Beta tournaments prove the product works in real-world conditions and identify critical UX issues before public launch.

### Key Result 3.1: Beta TDs rate platform 4/5 or higher

- **Target:** Average rating ≥4.0/5.0 from beta TDs (survey after each tournament)
- **Current:** N/A
- **Progress:** 0% 🟡
- **Owner:** Team
- **Confidence:** Medium

**Progress Updates:**

- 2025-11-03: Will survey TDs after Beta 1 and Beta 2. Questions: ease of use, reliability, feature completeness, likelihood to use again.

### Key Result 3.2: <5 critical bugs reported during beta tournaments

- **Target:** <5 P0 bugs across both beta tournaments
- **Current:** 0 bugs (no betas yet)
- **Progress:** 0% 🟡
- **Owner:** Team
- **Confidence:** Medium

**Progress Updates:**

- 2025-11-03: Will track bugs in real-time during betas. P0 bugs must be fixed before public launch.

### Key Result 3.3: 90% of tournament finishes without manual intervention

- **Target:** ≥90% of matches/bracket progression automated (no TD "fixing" bracket manually)
- **Current:** N/A
- **Progress:** 0% 🟡
- **Owner:** Team
- **Confidence:** Medium

**Progress Updates:**

- 2025-11-03: Will measure during beta tournaments. This is a critical acceptance criterion from project brief.

---

## Supporting Initiatives

Projects and work that support the OKRs but aren't KRs themselves:

- **Architecture Decision Records (ADRs)**
  - Supports: Objective 2 (reliable architecture)
  - Status: ✅ Done (ADR-001, ADR-002, ADR-003 created)

- **Monorepo Setup with Turborepo**
  - Supports: Objective 1 (development efficiency)
  - Status: 📋 Not Started (Sprint 1, Week 1)

- **RLS Policy Testing**
  - Supports: Objective 1 (security), Objective 2 (reliability)
  - Status: 📋 Not Started (Sprint 1, Week 1-2)

- **Stripe Connect Integration**
  - Supports: Objective 1 (complete scope), Objective 3 (real-world validation)
  - Status: 📋 Not Started (Sprint 3, Week 6)

- **Fargo Integration**
  - Supports: Objective 1 (complete scope), Objective 3 (market fit)
  - Status: 📋 Not Started (Sprint 5, Week 10)

- **Beta Venue Outreach**
  - Supports: Objective 3 (validation)
  - Status: 📋 Not Started (need to line up 2 venues by Week 8)

---

## Weekly Check-ins

### Week 1 (Nov 4-8, 2025)

**Overall Status:** 🟡 Starting

**Highlights:**

- Sprint 1 kicked off
- Planning docs created (roadmap, sprint plans, OKRs, ADRs)
- Team aligned on Complete Build approach

**Concerns:**

- CRDT library decision is critical and complex
- 12-week timeline is aggressive for 2-person team

**Focus for next week:**

- Complete monorepo setup
- Evaluate Y.js (days 1-3)
- Start Prisma schema and RLS policies
- Decide on CRDT library by end of week 2

---

### Week 2 (Nov 11-15, 2025)

**Overall Status:**

## **Highlights:**

## **Concerns:**

## **Focus for next week:**

---

### Week 3 (Nov 18-22, 2025)

**Overall Status:**

## **Highlights:**

## **Concerns:**

## **Focus for next week:**

---

### Week 4 (Nov 25-29, 2025)

**Overall Status:**

## **Highlights:**

## **Concerns:**

## **Focus for next week:**

---

### Week 5 (Dec 2-6, 2025)

**Overall Status:**

## **Highlights:**

## **Concerns:**

## **Focus for next week:**

---

### Week 6 (Dec 9-13, 2025)

**Overall Status:**

## **Highlights:**

## **Concerns:**

## **Focus for next week:**

---

### Week 7 (Dec 16-20, 2025)

**Overall Status:**

## **Highlights:**

## **Concerns:**

## **Focus for next week:**

---

### Week 8 (Dec 23-27, 2025)

**Overall Status:**

## **Highlights:**

## **Concerns:**

## **Focus for next week:**

---

### Week 9 (Dec 30-Jan 3, 2026)

**Overall Status:**

## **Highlights:**

## **Concerns:**

## **Focus for next week:**

---

### Week 10 (Jan 6-10, 2026)

**Overall Status:**

## **Highlights:**

## **Concerns:**

## **Focus for next week:**

---

### Week 11 (Jan 13-17, 2026)

**Overall Status:**

## **Highlights:**

## **Concerns:**

## **Focus for next week:**

---

### Week 12 (Jan 20-24, 2026)

**Overall Status:**

## **Highlights:**

## **Concerns:**

## **Focus for next sprint:**

---

## End of Period Review

### Final Scores

| Objective                                              | Score | Notes                                        |
| ------------------------------------------------------ | ----- | -------------------------------------------- |
| Objective 1: Ship Production-Ready Platform            | TBD   | Complete = 1.0, Partial = 0.5-0.9            |
| Objective 2: Build Reliable Offline-First Architecture | TBD   | Measured by chaos tests and beta reliability |
| Objective 3: Validate Product-Market Fit               | TBD   | Beta feedback and bug count                  |

**Overall Score:** TBD (target: ≥0.7)

### Scoring Guide

- **1.0:** Achieved everything and more (shipped on time, all features, <5 bugs, 4/5+ rating)
- **0.7-0.9:** Mostly achieved, great progress (shipped with minor delays, most features, <10 bugs)
- **0.4-0.6:** Made progress but fell short (partial ship, significant bugs, mixed feedback)
- **0.0-0.3:** Little to no progress (major delays, incomplete features, failed betas)

---

## Retrospective

### What Went Well

- TBD (fill out at end of Week 12)

### What Didn't Go Well

- TBD (fill out at end of Week 12)

### Learnings

- TBD (fill out at end of Week 12)

### Adjustments for Next Quarter (Post-Launch)

- [ ] TBD based on beta feedback
- [ ] TBD based on launch results

---

## Related Links

- **Product Roadmap:** `product/roadmap/2025-Q1-Q2-12-week-launch.md`
- **Sprint Plans:** `sprints/current/sprint-01-foundations.md` (and sprints 2-6)
- **Project Brief:** `project-brief/ultimate_tournament_platform_prompt.md`
- **ADRs:** `technical/adr/` (001-monorepo, 002-orm, 003-crdt)

---

## Risk Management

### High-Risk Areas

**1. CRDT Library Selection (Weeks 1-2)**

- **Risk:** Wrong choice = rewrite sync layer later
- **Mitigation:** Time-boxed evaluation, decision by end of Week 2, fallback to simpler approach if both fail

**2. Offline Sync Complexity (Weeks 1-4)**

- **Risk:** CRDT bugs cause data loss or conflicts
- **Mitigation:** Extensive chaos testing (Week 11), real-world validation (betas), daily testing during development

**3. Stripe Connect Approval (Week 6)**

- **Risk:** Stripe delays approval, blocks beta tournaments
- **Mitigation:** Apply early (Week 5), use test mode for development, have fallback "cash-only" mode

**4. Beta Venue Availability (Weeks 11-12)**

- **Risk:** Venues cancel, no real-world validation
- **Mitigation:** Line up 2 venues by Week 8, have 2 backup venues ready

**5. Team Burnout (Weeks 8-12)**

- **Risk:** 12-week sprint is exhausting, quality suffers
- **Mitigation:** Monitor velocity, adjust scope if needed, defer P1/P2 features to post-launch if behind

### Contingency Plans

**If behind schedule by Week 6:**

- Defer P1 features (Fargo integration, chip format, kiosk mode)
- Focus on core: brackets, scoring, payments, offline sync
- Push deferred features to v1.1 (post-launch)

**If CRDT proves too complex by Week 4:**

- Fallback: Last-write-wins + manual conflict resolution
- Document limitation, iterate to CRDT in v2.0
- Still ship offline-first, but with simpler merge strategy

**If beta tournaments reveal critical issues:**

- Delay public launch (no hard deadline)
- Fix all P0 bugs before launch
- Consider additional beta if major changes needed

---

## Success Definition

**We succeed if:**

- ✅ All 6 sprints complete on time (or within 1 week delay)
- ✅ Both beta tournaments complete successfully with <5 critical bugs
- ✅ Beta TDs rate platform ≥4.0/5.0 and say they'd use it again
- ✅ All acceptance criteria pass (offline sync, RLS, performance, payments)
- ✅ Platform is production-ready for public launch by Week 12

**We fail if:**

- ❌ Cannot complete beta tournaments due to critical bugs
- ❌ Offline sync doesn't work reliably (data loss, conflicts)
- ❌ Security issues (RLS bypass, cross-tenant access)
- ❌ Performance unacceptable (overlay updates >1s, UI jank)
- ❌ Beta TDs won't use platform again (major UX issues)
