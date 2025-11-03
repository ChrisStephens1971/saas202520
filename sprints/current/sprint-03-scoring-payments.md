# Sprint 3 - Scoring & Payments

**Sprint Duration:** Week 5-6 (Dec 2 - Dec 13, 2025)
**Sprint Goal:** Build mobile-first scoring interface and Stripe payment integration
**Status:** Planning

---

## Sprint Goal

Enable real-time match scoring and payment processing. By the end of this sprint:
- Scorekeepers can enter scores on mobile devices with validation
- Illegal scores are prevented (race-to logic, hill-hill checks)
- Undo functionality preserves audit trail
- Venues can collect entry fees via Stripe Connect
- Refunds and payout calculations work correctly
- Printable payout sheets available

Success means tournaments can handle money transparently and scores are entered quickly without errors.

---

## Sprint Capacity

**Available Days:** 10 working days
**Capacity:** ~160 hours total
**Dependencies from Sprint 2:** Match model, tournament engine

---

## Sprint Backlog

### High Priority (Must Complete)

| Story | Description | Estimate | Assignee | Status |
|-------|-------------|----------|----------|--------|
| **SCORE-001** | Mobile-first scoring card UI | L | TBD | 📋 Todo |
| **SCORE-002** | Race-to validation logic | M | TBD | 📋 Todo |
| **SCORE-003** | Illegal score guards | M | TBD | 📋 Todo |
| **SCORE-004** | Hill-hill sanity checks | S | TBD | 📋 Todo |
| **SCORE-005** | Undo functionality (last 3 actions) | M | TBD | 📋 Todo |
| **SCORE-006** | Scoring audit trail integration | M | TBD | 📋 Todo |
| **PAY-001** | Stripe Connect onboarding flow | L | TBD | 📋 Todo |
| **PAY-002** | Entry fee collection | M | TBD | 📋 Todo |
| **PAY-003** | Payment receipt generation | M | TBD | 📋 Todo |
| **PAY-004** | Refund workflow | M | TBD | 📋 Todo |
| **PAY-005** | Payout calculator (prizes, side pots) | L | TBD | 📋 Todo |
| **PAY-006** | Payout ledger model | M | TBD | 📋 Todo |
| **PAY-007** | Printable payout sheet (PDF) | M | TBD | 📋 Todo |

### Medium Priority (Should Complete)

| Story | Description | Estimate | Assignee | Status |
|-------|-------------|----------|----------|--------|
| **SCORE-007** | Scorekeeper role & permissions | S | TBD | 📋 Todo |
| **PAY-008** | Dispute evidence pack (from audit log) | M | TBD | 📋 Todo |
| **TEST-004** | Payment workflow tests (Stripe test mode) | M | TBD | 📋 Todo |

---

## Acceptance Criteria

**Scoring:**
- ✅ Score entered in <15 seconds per game
- ✅ Illegal scores blocked (e.g., 10-9 in race-to-9)
- ✅ Hill-hill confirmation prompt works
- ✅ Undo reverts last action, preserves audit trail

**Payments:**
- ✅ Venue completes Stripe onboarding
- ✅ Entry fees collected, receipts sent
- ✅ Refunds processed successfully
- ✅ Payout sheet reconciles with collected fees
- ✅ Dispute evidence includes audit log events

---

## Links & References

- **Roadmap:** `product/roadmap/2025-Q1-Q2-12-week-launch.md`
- **Sprint 2:** `sprints/current/sprint-02-tournament-engine.md`
