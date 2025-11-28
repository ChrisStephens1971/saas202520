# Sprint 6 - Testing, Polish & Beta

**Sprint Duration:** Week 11-12 (Jan 13 - Jan 24, 2026)
**Sprint Goal:** Chaos testing, documentation, venue presets, and two external beta tournaments
**Status:** Planning

---

## Sprint Goal

Validate the platform with real-world tournaments and comprehensive testing. By the end of this sprint:

- Chaos tests prove offline-first architecture works
- RLS policies validated with automated security tests
- Integration tests cover full workflows
- Documentation written for TDs and venues
- Two external beta tournaments completed successfully
- Critical bugs from beta feedback fixed
- Performance optimized (overlay updates <200ms p50)

Success means platform is production-ready for public launch.

---

## Sprint Capacity

**Available Days:** 10 working days
**Capacity:** ~160 hours total
**Dependencies:** ALL previous sprints must be complete

---

## Sprint Backlog

### High Priority (Must Complete)

| Story          | Description                                             | Estimate | Assignee | Status  |
| -------------- | ------------------------------------------------------- | -------- | -------- | ------- |
| **CHAOS-001**  | Chaos testing harness (toggle Wi-Fi)                    | M        | TBD      | 📋 Todo |
| **CHAOS-002**  | Offline flapping tests (30 min Wi-Fi off)               | L        | TBD      | 📋 Todo |
| **CHAOS-003**  | Concurrent score conflict tests                         | M        | TBD      | 📋 Todo |
| **CHAOS-004**  | Double table assignment race tests                      | M        | TBD      | 📋 Todo |
| **SEC-001**    | RLS policy automated test suite                         | L        | TBD      | 📋 Todo |
| **SEC-002**    | Cross-tenant access penetration tests                   | M        | TBD      | 📋 Todo |
| **SEC-003**    | Session fixation & role escalation tests                | M        | TBD      | 📋 Todo |
| **INT-001**    | Full workflow integration tests (registration → payout) | L        | TBD      | 📋 Todo |
| **INT-002**    | Payment integration tests (Stripe webhooks)             | M        | TBD      | 📋 Todo |
| **LOAD-001**   | Load testing (500 players polling)                      | M        | TBD      | 📋 Todo |
| **LOAD-002**   | Sync lag metrics (20 kiosks, 5 TD consoles)             | M        | TBD      | 📋 Todo |
| **DOC-002**    | TD user guide                                           | M        | TBD      | 📋 Todo |
| **DOC-003**    | Venue setup documentation                               | M        | TBD      | 📋 Todo |
| **DOC-004**    | Troubleshooting guide                                   | S        | TBD      | 📋 Todo |
| **PRESET-001** | Venue preset templates (APA, BCA)                       | M        | TBD      | 📋 Todo |
| **BETA-001**   | Beta tournament 1 setup & support                       | L        | TBD      | 📋 Todo |
| **BETA-002**   | Beta tournament 2 setup & support                       | L        | TBD      | 📋 Todo |
| **BUG-001**    | Fix critical bugs from beta feedback                    | XL       | TBD      | 📋 Todo |

### Medium Priority (Should Complete)

| Story        | Description                        | Estimate | Assignee | Status  |
| ------------ | ---------------------------------- | -------- | -------- | ------- |
| **PERF-001** | Profile overlay update performance | M        | TBD      | 📋 Todo |
| **PERF-002** | Optimize slow queries              | M        | TBD      | 📋 Todo |
| **A11Y-001** | Keyboard navigation tests          | M        | TBD      | 📋 Todo |
| **A11Y-002** | Screen reader compatibility        | M        | TBD      | 📋 Todo |
| **A11Y-003** | High-contrast print views          | S        | TBD      | 📋 Todo |

### Low Priority (Nice to Have)

| Story          | Description                     | Estimate | Assignee | Status  |
| -------------- | ------------------------------- | -------- | -------- | ------- |
| **POLISH-001** | UI polish & animations          | M        | TBD      | 📋 Todo |
| **POLISH-002** | Error message improvements      | S        | TBD      | 📋 Todo |
| **MARKET-001** | Landing page copy & screenshots | M        | TBD      | 📋 Todo |

---

## Acceptance Criteria (Critical - Must Pass)

### Chaos Testing

- ✅ 64-player double-elim on 2 TD devices, Wi-Fi disabled for 30 minutes → no data loss
- ✅ Conflict resolution yields one authoritative result
- ✅ Audit replay matches final state

### Security

- ✅ Cross-tenant access attempts fail at DB level (RLS policies enforced)
- ✅ Automated tests prove tenant isolation

### Performance

- ✅ Overlay updates p50 <200ms, p95 <600ms
- ✅ TD UI handles 1000 match events in 10 minutes without jank

### Payments

- ✅ Venue onboarding completes successfully
- ✅ Entry fees collected, refund works
- ✅ Payout ledger reconciles
- ✅ Dispute evidence pack auto-generated from audit events

### Notifications

- ✅ SMS "table now" median delivery <2s, >98% success
- ✅ Dedupe prevents duplicate pings within 2 minutes

### Fargo

- ✅ Unsupported formats blocked with explicit reasons
- ✅ Supported formats export cleanly

### Printables

- ✅ Brackets render legibly in black-and-white
- ✅ Payout sheets one-click download

### Beta Tournaments

- ✅ Beta 1: Tournament completes without manual bracket surgery
- ✅ Beta 2: Tournament completes without manual bracket surgery
- ✅ <5 critical bugs reported across both beta tournaments
- ✅ All critical bugs fixed before public launch

---

## Beta Tournament Plan

### Beta Tournament 1 (Week 11)

**Venue:** TBD (line up by Week 8)
**Format:** 32-player single elimination
**Goals:**

- Test full tournament workflow end-to-end
- Validate offline-first sync with 2 TD devices
- Test SMS notifications in real-world venue
- Gather TD feedback on UX

**Team presence:**

- 1 developer on-site for support
- 1 developer remote for critical fixes
- Document all issues in real-time

### Beta Tournament 2 (Week 12)

**Venue:** TBD (different venue than Beta 1)
**Format:** 64-player double elimination (stress test)
**Goals:**

- Validate fixes from Beta 1
- Test at larger scale (more players, more matches)
- Validate performance under load
- Confirm no critical issues remain

**Team presence:**

- Same as Beta 1

---

## Risk Mitigation

| Risk                         | Mitigation                                                        |
| ---------------------------- | ----------------------------------------------------------------- |
| **Beta venue unavailable**   | Line up 2 backup venues by Week 8                                 |
| **Critical bug during beta** | 1 dev on-site, 1 dev remote for hotfixes                          |
| **Performance issues**       | Profile early in Week 11, optimize before Beta 2                  |
| **RLS security issue found** | Fix immediately, delay launch if needed (security non-negotiable) |
| **CRDT merge bugs**          | Extensive chaos testing Week 11, fix before Beta 1                |

---

## Definition of "Production-Ready"

Platform is ready to launch when:

- ✅ All acceptance criteria above pass
- ✅ Both beta tournaments complete successfully
- ✅ <5 critical bugs remain (all P2 or lower)
- ✅ All P0 bugs fixed
- ✅ Documentation complete (TD guide, venue setup, troubleshooting)
- ✅ Performance targets met (p50 <200ms, p95 <600ms)
- ✅ Security validated (RLS policies tested, no vulnerabilities)
- ✅ Chaos tests pass (offline sync works reliably)

---

## Links & References

- **Roadmap:** `product/roadmap/2025-Q1-Q2-12-week-launch.md`
- **Sprint 5:** `sprints/current/sprint-05-pool-features.md`
- **Project Brief:** `project-brief/ultimate_tournament_platform_prompt.md` (Acceptance Criteria section)
