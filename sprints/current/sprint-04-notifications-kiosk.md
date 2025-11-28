# Sprint 4 - Notifications & Kiosk Mode

**Sprint Duration:** Week 7-8 (Dec 16 - Dec 27, 2025)
**Sprint Goal:** Implement SMS/email notifications, chip format, and kiosk mode
**Status:** 🟢 Notifications Complete (100%) | 🟡 Chip Format & Kiosk Pending

---

## Sprint Goal

Add real-time notifications and alternative tournament format support. By the end of this sprint:

- Players receive SMS "table now" and "up in 5" notifications
- Email notifications work for general updates
- SMS dedupe and throttling prevent spam
- Chip format tournaments supported (queue-based, non-bracket)
- Kiosk mode enables player self-check-in
- Late entry and no-show handling implemented

Success means tournaments run smoother with automated player notifications and support for popular chip format.

---

## Sprint Capacity

**Available Days:** 10 working days
**Capacity:** ~160 hours total
**Dependencies from Sprint 3:** Match scoring, player model

---

## Sprint Backlog

### High Priority (Must Complete)

| Story          | Description                          | Estimate | Assignee | Status      |
| -------------- | ------------------------------------ | -------- | -------- | ----------- |
| **NOTIFY-001** | In-app notification system           | M        | Claude   | ✅ Complete |
| **NOTIFY-002** | Email notification templates         | M        | Claude   | ✅ Complete |
| **NOTIFY-003** | SMS integration (Twilio)             | M        | Claude   | ✅ Complete |
| **NOTIFY-004** | SMS "table now" trigger              | M        | Claude   | ✅ Complete |
| **NOTIFY-005** | SMS "up in 5" trigger                | M        | Claude   | ✅ Complete |
| **NOTIFY-006** | SMS dedupe logic (2-minute window)   | M        | Claude   | ✅ Complete |
| **NOTIFY-007** | SMS throttling & rate limits         | S        | Claude   | ✅ Complete |
| **NOTIFY-008** | SMS consent & opt-in tracking        | M        | Claude   | ✅ Complete |
| **NOTIFY-009** | STOP/HELP SMS handling               | S        | Claude   | ✅ Complete |
| **CHIP-001**   | Chip format queue engine             | L        | TBD      | 📋 Todo     |
| **CHIP-002**   | Chip counter tracking                | M        | TBD      | 📋 Todo     |
| **CHIP-003**   | Finals cutoff logic (top N by chips) | M        | TBD      | 📋 Todo     |
| **KIOSK-001**  | Kiosk mode UI (tablet-optimized)     | M        | TBD      | 📋 Todo     |
| **KIOSK-002**  | Player self-check-in flow            | M        | TBD      | 📋 Todo     |
| **KIOSK-003**  | PIN-protected TD console toggle      | S        | TBD      | 📋 Todo     |

### Medium Priority (Should Complete)

| Story         | Description                  | Estimate | Assignee | Status  |
| ------------- | ---------------------------- | -------- | -------- | ------- |
| **ADMIN-002** | Late entry handling          | M        | TBD      | 📋 Todo |
| **ADMIN-003** | No-show tracking & penalties | M        | TBD      | 📋 Todo |
| **ADMIN-004** | Reseed guardrails            | M        | TBD      | 📋 Todo |
| **TEST-005**  | Notification delivery tests  | M        | TBD      | 📋 Todo |

---

## Acceptance Criteria

**Notifications:**

- ✅ SMS "table now" median delivery <2s, >98% success rate
- ✅ No duplicate SMS within 2-minute window
- ✅ STOP unsubscribes player from future SMS
- ✅ Quiet hours respected (no SMS 10pm-8am)

**Chip Format:**

- ⏳ Queue-based match assignment works
- ⏳ Chip counters update correctly
- ⏳ Finals cutoff automatically promotes top N players

**Kiosk Mode:**

- ⏳ Tablet kiosk allows self-check-in
- ⏳ TD console requires PIN to exit kiosk mode
- ⏳ Check-in status updates in real-time

---

## Links & References

- **Roadmap:** `product/roadmap/2025-Q1-Q2-12-week-launch.md`
- **Sprint 3:** `sprints/current/sprint-03-scoring-payments.md`
