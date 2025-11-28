# Sprint 4 Implementation Plan - Notifications & Kiosk Mode

**Created:** November 5, 2025
**Sprint Duration:** Week 7-8 (Planned: Dec 16-27, 2025)
**Total Stories:** 16 (13 high priority + 3 medium priority)
**Status:** Planning → Ready to Start

---

## 🎯 Sprint Goal

Add real-time notifications and alternative tournament format support to enable:

- Players receive SMS/email notifications for matches
- Chip format tournaments (queue-based, non-bracket)
- Kiosk mode for player self-check-in
- Late entry and no-show handling

---

## 📋 Implementation Phases

### Phase 1: Notification Foundation (4 stories, ~2 days)

**Goal:** Build core notification infrastructure

**Stories:**

1. ✅ **NOTIFY-001** - In-app notification system
2. ✅ **NOTIFY-002** - Email notification templates
3. ✅ **NOTIFY-003** - SMS integration (Twilio)
4. ✅ **NOTIFY-008** - SMS consent & opt-in tracking

**Why First:**

- Foundation for all notification features
- Sets up Twilio integration
- Establishes database models
- Other features depend on this

**Key Deliverables:**

- Notification model (in-app, email, SMS)
- Twilio SDK integration
- Email template system
- SMS consent tracking

**Dependencies:** None (foundational work)

**Estimated Effort:** 2 days

- Day 1: Notification models + in-app system
- Day 2: Email templates + Twilio + consent

---

### Phase 2: Match Notification Triggers (2 stories, ~1 day)

**Goal:** Trigger notifications based on match events

**Stories:**

1. ✅ **NOTIFY-004** - SMS "table now" trigger
2. ✅ **NOTIFY-005** - SMS "up in 5" trigger

**Why Second:**

- Uses notification foundation from Phase 1
- Core user value (players get notified)
- Can be tested immediately

**Key Deliverables:**

- Match event hooks (status changes)
- "Table now" SMS when match starts
- "Up in 5" SMS when player is 5 minutes away
- Integration with tournament engine

**Dependencies:**

- Phase 1 complete (notification system)
- Sprint 2 tournament engine

**Estimated Effort:** 1 day

- Event hooks + trigger logic
- Integration with match model

---

### Phase 3: Notification Safety & Compliance (4 stories, ~1 day)

**Goal:** Prevent spam, ensure compliance

**Stories:**

1. ✅ **NOTIFY-006** - SMS dedupe logic (2-minute window)
2. ✅ **NOTIFY-007** - SMS throttling & rate limits
3. ✅ **NOTIFY-009** - STOP/HELP SMS handling

**Why Third:**

- Critical for production use
- Prevents spam and user complaints
- Required for Twilio compliance
- Builds on notification triggers

**Key Deliverables:**

- Dedupe: Don't send duplicate SMS within 2 minutes
- Throttling: Respect rate limits (per user, per org)
- STOP handling: Auto-unsubscribe from SMS
- HELP handling: Send help text
- Quiet hours: No SMS 10pm-8am

**Dependencies:**

- Phase 2 complete (triggers exist)

**Estimated Effort:** 1 day

- Dedupe + throttling logic
- STOP/HELP webhook handling
- Quiet hours enforcement

---

### Phase 4: Chip Format Tournament (3 stories, ~1.5 days)

**Goal:** Support queue-based chip format tournaments

**Stories:**

1. ✅ **CHIP-001** - Chip format queue engine
2. ✅ **CHIP-002** - Chip counter tracking
3. ✅ **CHIP-003** - Finals cutoff logic (top N by chips)

**Why Fourth:**

- Independent from notifications
- Alternative tournament format
- Uses existing tournament engine patterns

**Key Deliverables:**

- Chip format tournament type
- Queue-based match assignment (no bracket)
- Chip counter tracking per player
- Finals cutoff: Top N players by chip count
- Chip increment/decrement APIs

**Dependencies:**

- Sprint 2 tournament engine

**Estimated Effort:** 1.5 days

- Day 1: Queue engine + chip tracking
- Day 2: Finals cutoff logic + APIs

---

### Phase 5: Kiosk Mode (3 stories, ~1 day)

**Goal:** Enable player self-check-in on tablets

**Stories:**

1. ✅ **KIOSK-001** - Kiosk mode UI (tablet-optimized)
2. ✅ **KIOSK-002** - Player self-check-in flow
3. ✅ **KIOSK-003** - PIN-protected TD console toggle

**Why Fifth:**

- UI-focused, can be built independently
- Improves tournament day experience
- Reduces TD workload

**Key Deliverables:**

- Kiosk mode route (`/kiosk/[tournamentId]`)
- Large touch-friendly UI for tablets
- Player search and check-in
- PIN-protected exit to TD console
- Check-in status updates in real-time

**Dependencies:**

- Sprint 1 auth system

**Estimated Effort:** 1 day

- Kiosk UI + check-in flow
- PIN protection system

---

### Phase 6: Admin Features (4 stories, ~1 day)

**Goal:** Handle edge cases and exceptions

**Stories:**

1. ✅ **ADMIN-002** - Late entry handling
2. ✅ **ADMIN-003** - No-show tracking & penalties
3. ✅ **ADMIN-004** - Reseed guardrails
4. ✅ **TEST-005** - Notification delivery tests

**Why Last:**

- Edge cases and admin tooling
- Nice-to-have for MVP
- Can be deferred if needed

**Key Deliverables:**

- Late entry: Add player after bracket generated
- No-show: Mark player as no-show, penalties
- Reseed: Guardrails against accidental reseeding
- Tests: Notification delivery test suite

**Dependencies:**

- Phase 1-5 (uses notification and tournament systems)

**Estimated Effort:** 1 day

- Late entry + no-show logic
- Reseed guardrails
- Notification tests

---

## 📊 Implementation Timeline

**Total Estimated Effort:** 7.5 days (~1.5 weeks)

| Phase                      | Stories | Days | Cumulative |
| -------------------------- | ------- | ---- | ---------- |
| 1. Notification Foundation | 4       | 2.0  | Day 2      |
| 2. Match Triggers          | 2       | 1.0  | Day 3      |
| 3. Safety & Compliance     | 3       | 1.0  | Day 4      |
| 4. Chip Format             | 3       | 1.5  | Day 5.5    |
| 5. Kiosk Mode              | 3       | 1.0  | Day 6.5    |
| 6. Admin Features          | 4       | 1.0  | Day 7.5    |

**Buffer:** 2.5 days for testing, bug fixes, documentation

---

## 🗂️ Database Schema Changes

### New Tables

**Notification:**

```sql
Notification
  - id (uuid)
  - orgId (fk)
  - tournamentId (fk, optional)
  - playerId (fk, optional)
  - type (in_app, email, sms)
  - channel (in_app, email, sms_twilio)
  - recipient (phone or email)
  - subject (optional)
  - message (text)
  - status (pending, sent, failed, delivered)
  - sentAt (timestamp)
  - deliveredAt (timestamp)
  - errorMessage (optional)
  - metadata (json - e.g., Twilio message SID)
  - createdAt, updatedAt
```

**NotificationPreference:**

```sql
NotificationPreference
  - id (uuid)
  - playerId (fk, unique)
  - smsEnabled (boolean, default: true)
  - emailEnabled (boolean, default: true)
  - smsOptedOut (boolean, default: false)
  - smsOptedOutAt (timestamp)
  - quietHoursStart (time, default: 22:00)
  - quietHoursEnd (time, default: 08:00)
  - timezone (string)
  - createdAt, updatedAt
```

**ChipCounter:**

```sql
ChipCounter
  - id (uuid)
  - tournamentId (fk)
  - playerId (fk)
  - chips (int, default: 0)
  - rank (int, computed)
  - qualifiedForFinals (boolean)
  - createdAt, updatedAt
  - unique(tournamentId, playerId)
```

### Schema Changes to Existing Tables

**Tournament:**

```sql
Tournament
  + format (enum: single_elim, double_elim, round_robin, chip_format)
  + chipFormatConfig (json)
    - chipsPerWin: 1
    - finalsPlayerCount: 8
    - finalsFormat: 'single_elim'
```

**TournamentPlayer:**

```sql
TournamentPlayer
  + checkedIn (boolean, default: false)
  + checkedInAt (timestamp)
  + checkedInBy (fk to User, optional - null = self check-in)
  + noShow (boolean, default: false)
  + noShowMarkedAt (timestamp)
  + lateEntry (boolean, default: false)
  + lateEntryAt (timestamp)
```

**Organization:**

```sql
Organization
  + kioskPin (string, 4 digits)
  + twilioAccountSid (string, encrypted)
  + twilioAuthToken (string, encrypted)
  + twilioPhoneNumber (string)
```

---

## 🔧 Technical Stack Additions

### New Dependencies

**Twilio (SMS):**

```bash
pnpm add twilio@^5.3.4
pnpm add -D @types/twilio
```

**Email (if not using existing):**

```bash
pnpm add nodemailer@^6.9.15
pnpm add -D @types/nodemailer
```

**PDF Templates (for notifications):**

- Already have pdfkit from Sprint 3

**Rate Limiting:**

```bash
pnpm add @upstash/ratelimit@^2.0.3
pnpm add @upstash/redis@^1.34.3
```

---

## 📝 API Endpoints to Create

### Notification APIs (Phase 1-3)

- `POST /api/notifications` - Create notification
- `GET /api/notifications` - List notifications (org-scoped)
- `GET /api/notifications/player/[id]` - Player's notifications
- `PUT /api/notifications/[id]/mark-read` - Mark as read
- `POST /api/notifications/sms/webhook` - Twilio webhook (STOP, HELP, delivery status)
- `GET /api/notifications/preferences/[playerId]` - Get preferences
- `PUT /api/notifications/preferences/[playerId]` - Update preferences

### Chip Format APIs (Phase 4)

- `POST /api/tournaments/[id]/chip-counters/increment` - Increment chips
- `POST /api/tournaments/[id]/chip-counters/decrement` - Decrement chips
- `GET /api/tournaments/[id]/chip-counters` - Get leaderboard
- `POST /api/tournaments/[id]/chip-format/finalize` - Move top N to finals

### Kiosk APIs (Phase 5)

- `GET /api/tournaments/[id]/kiosk/players` - Search players
- `POST /api/tournaments/[id]/kiosk/check-in` - Player check-in
- `POST /api/tournaments/[id]/kiosk/unlock` - Verify PIN and unlock TD console

### Admin APIs (Phase 6)

- `POST /api/tournaments/[id]/players/late-entry` - Add late entry
- `PUT /api/tournaments/[id]/players/[id]/mark-no-show` - Mark no-show
- `POST /api/tournaments/[id]/reseed` - Reseed bracket (with guardrails)

**Total New Endpoints:** ~15 REST APIs

---

## 🧪 Testing Strategy

### Unit Tests (Phase 6, TEST-005)

**Notification Logic:**

- Dedupe algorithm (2-minute window)
- Throttling logic (rate limits)
- Quiet hours enforcement
- STOP/HELP handling

**Chip Format Logic:**

- Chip counter increment/decrement
- Leaderboard ranking
- Finals cutoff (top N)

**Total New Tests:** ~20-25 unit tests

### Integration Tests (Optional)

- Twilio SMS delivery (test mode)
- Email delivery (test SMTP)
- Full notification flow

### Manual Testing Checklist

- [ ] SMS "table now" arrives within 2 seconds
- [ ] SMS dedupe prevents duplicates
- [ ] STOP unsubscribes player
- [ ] Quiet hours respected
- [ ] Chip counters update correctly
- [ ] Kiosk check-in works on tablet
- [ ] Late entry integrates with bracket
- [ ] No-show marking works

---

## 🔐 Security & Compliance

### Twilio Compliance

- ✅ Obtain user consent before sending SMS
- ✅ Respect STOP requests immediately
- ✅ Provide HELP text
- ✅ Include opt-out instructions in messages
- ✅ Respect quiet hours (10pm-8am local time)
- ✅ Rate limiting (prevent spam)

### TCPA Compliance (USA)

- Express written consent required for SMS
- Clear opt-out mechanism
- Identification of sender
- No auto-dialing to cell phones without consent

### GDPR Compliance (EU)

- Consent must be explicit
- Right to be forgotten (delete preferences)
- Data minimization (only store necessary data)

### Multi-Tenant Security

- All notifications scoped to organization
- Twilio credentials encrypted per org
- SMS consent tracked per player
- Cross-org SMS sending prevented

---

## 📋 Acceptance Criteria

### Notifications

- ✅ SMS "table now" median delivery <2s, >98% success rate
- ✅ No duplicate SMS within 2-minute window
- ✅ STOP unsubscribes player from future SMS
- ✅ Quiet hours respected (no SMS 10pm-8am)
- ✅ Email notifications send successfully

### Chip Format

- ✅ Queue-based match assignment works
- ✅ Chip counters update correctly
- ✅ Finals cutoff automatically promotes top N players
- ✅ Leaderboard shows real-time rankings

### Kiosk Mode

- ✅ Tablet kiosk allows self-check-in
- ✅ TD console requires PIN to exit kiosk mode
- ✅ Check-in status updates in real-time
- ✅ Large touch targets work on tablets

### Admin Features

- ✅ Late entry adds player to existing bracket
- ✅ No-show marking removes player from queue
- ✅ Reseed guardrails prevent accidents

---

## 🎯 Success Metrics

**User Experience:**

- Players check in <30 seconds using kiosk
- SMS notifications deliver in <2 seconds
- Zero SMS spam complaints
- Chip format tournaments run smoothly

**Technical:**

- 100% SMS delivery rate (test mode)
- <100ms notification creation
- Zero notification duplicates
- All tests passing

**Business:**

- Reduced TD workload (kiosk mode)
- Alternative tournament format support
- Better player experience (notifications)
- Compliance with SMS regulations

---

## 🚀 Getting Started (Phase 1)

### Step 1: Set up Twilio Account

1. Create Twilio account (test mode)
2. Get test phone number
3. Store credentials in `.env`

### Step 2: Create Notification Models

1. Run Prisma schema changes
2. Create notification types/interfaces
3. Set up database tables

### Step 3: Build Core Notification System

1. Notification service (send SMS, email, in-app)
2. Notification preferences
3. Basic UI components

### Step 4: Test Foundation

1. Unit tests for notification logic
2. Test SMS in Twilio test mode
3. Verify database models

---

## 📚 Reference Documentation

**Twilio:**

- SMS API: https://www.twilio.com/docs/sms
- Webhooks: https://www.twilio.com/docs/usage/webhooks
- Best Practices: https://www.twilio.com/docs/sms/best-practices

**TCPA Compliance:**

- FCC Guidelines: https://www.fcc.gov/tcpa

**Next Steps:**

1. Review this plan
2. Confirm prioritization
3. Start Phase 1: Notification Foundation

---

**Plan Created:** November 5, 2025
**Ready to Start:** ✅ Yes
**Estimated Completion:** 7.5 days + 2.5 day buffer = 10 working days
