# Notification Service Setup Guide

**Sprint 4 - NOTIFY-001 through NOTIFY-009**
**Last Updated:** 2025-11-05

---

## Overview

The notification service provides multi-channel notifications (in-app, email, SMS) with rate limiting, deduplication, and preference management. This guide covers complete setup for production deployment.

**Features:**

- ✅ In-app notifications
- ✅ Email notifications (SMTP/SendGrid)
- ✅ SMS notifications (Twilio)
- ✅ Rate limiting (10 email/min, 5 SMS/min per org)
- ✅ SMS deduplication (2-minute window)
- ✅ Preference management (opt-out, quiet hours)
- ✅ Template system with 7 notification types

---

## Prerequisites

### Required Services

| Service            | Purpose                           | Required For | Cost                     |
| ------------------ | --------------------------------- | ------------ | ------------------------ |
| **Upstash Redis**  | Rate limiting & SMS deduplication | Production   | Free tier available      |
| **Email Provider** | Email notifications               | Email        | SMTP free, SendGrid paid |
| **Twilio**         | SMS notifications                 | SMS          | Pay-as-you-go            |

### Optional Services

- **Sentry** - Error tracking for notification failures
- **PostHog** - Analytics for notification delivery

---

## 1. Upstash Redis Setup

### Why Upstash Redis?

Upstash Redis is used for:

- **Rate limiting** - Prevents abuse (10 email/min, 5 SMS/min per org)
- **SMS deduplication** - Prevents duplicate SMS within 2-minute window
- **Distributed locking** - Ensures consistency across multiple app instances

### Setup Steps

1. **Create Account**
   - Go to https://console.upstash.com/
   - Sign up with GitHub or email

2. **Create Redis Database**
   - Click "Create Database"
   - Choose a region (closest to your app server)
   - Select "Global" or "Regional" based on needs
   - **Free tier:** 10,000 commands/day (sufficient for MVP)

3. **Get Credentials**
   - After creation, click on your database
   - Navigate to "REST API" tab
   - Copy:
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`

4. **Add to Environment**

```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

5. **Verify Setup**

```bash
cd apps/web
pnpm test tests/unit/notification-service.test.ts
```

All tests should pass if Redis is configured correctly.

### Rate Limit Configuration

Current limits (configurable in `apps/web/lib/notification-service.ts`):

```typescript
// Rate limiters per organization
const rateLimiters = {
  email: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 emails per minute
  }),
  sms: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 SMS per minute
  }),
};
```

**To adjust limits:**

1. Edit `apps/web/lib/notification-service.ts`
2. Change the numbers in `slidingWindow(count, window)`
3. Redeploy

---

## 2. Email Setup

### Option A: SMTP (Gmail, Outlook, etc.)

**Pros:** Free, simple setup
**Cons:** Lower sending limits, may go to spam

1. **Gmail Setup**
   - Enable 2FA on your Google account
   - Generate App Password: https://myaccount.google.com/apppasswords
   - Copy the 16-character password

2. **Add to Environment**

```bash
# .env.local
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com
```

3. **Verify Setup**

```bash
cd apps/web
pnpm test tests/unit/notification-service.test.ts
```

### Option B: SendGrid (Recommended for Production)

**Pros:** Better deliverability, higher limits, analytics
**Cons:** Paid (free tier: 100 emails/day)

1. **Create Account**
   - Go to https://sendgrid.com/
   - Sign up and verify email

2. **Create API Key**
   - Navigate to Settings > API Keys
   - Click "Create API Key"
   - Choose "Full Access"
   - Copy the key (shown only once)

3. **Verify Sender Identity**
   - Navigate to Settings > Sender Authentication
   - Verify a domain OR single sender email
   - Follow DNS verification steps

4. **Add to Environment**

```bash
# .env.local
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com
```

5. **Update Code** (if using SendGrid instead of SMTP)

Edit `apps/web/lib/notification-service.ts`:

```typescript
// Replace nodemailer with SendGrid SDK
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// In sendEmailNotification():
await sgMail.send({
  to: recipient,
  from: process.env.EMAIL_FROM!,
  subject,
  html: body,
});
```

---

## 3. Twilio SMS Setup

### Why Twilio?

Twilio is the industry standard for SMS with:

- Global coverage (200+ countries)
- Reliable delivery (>99% uptime)
- Programmable messaging
- Webhook support for STOP/START commands

### Setup Steps

1. **Create Account**
   - Go to https://console.twilio.com/
   - Sign up (free trial includes $15 credit)

2. **Get Phone Number**
   - Navigate to Phone Numbers > Buy a Number
   - Choose a number in your target country
   - Enable SMS capability
   - Cost: ~$1/month + $0.0075 per SMS (US)

3. **Get Credentials**
   - Navigate to Console Dashboard
   - Copy:
     - `Account SID`
     - `Auth Token`
     - Your phone number (format: +1234567890)

4. **Configure Webhooks** (for STOP/START handling)
   - Navigate to Phone Numbers > Manage > Active Numbers
   - Click on your phone number
   - Under "Messaging", set:
     - **A message comes in:** `https://yourdomain.com/api/notifications/sms/webhook`
     - Method: `POST`
   - Save

5. **Add to Organization Database**

Twilio credentials are stored **per organization** in the database (not environment variables):

```sql
-- Via Prisma Studio or SQL:
UPDATE "Organization"
SET
  "twilioAccountSid" = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  "twilioAuthToken" = 'your_auth_token_here',
  "twilioPhoneNumber" = '+1234567890'
WHERE id = 'your-org-id';
```

Or via admin panel (when implemented):

- Organization Settings > Integrations > Twilio
- Enter credentials
- Test SMS delivery

6. **Verify Setup**

```bash
cd apps/web
pnpm test tests/unit/notification-service.test.ts
```

### SMS Best Practices

1. **Compliance**
   - Only send to users who opted in
   - Always include unsubscribe instructions
   - Respect quiet hours (10pm-8am)
   - Handle STOP/START commands

2. **Message Format**
   - Keep under 306 characters (extended SMS)
   - Include action URLs (shortened links)
   - Clear call-to-action

3. **Testing**
   - Use Twilio test credentials in development
   - Verify phone numbers during trial period
   - Monitor delivery rates in Twilio console

---

## 4. Database Configuration

### Required Tables

Ensure these tables exist (should be created by Prisma migrations):

```prisma
model Notification {
  id            String   @id @default(cuid())
  orgId         String
  playerId      String?
  tournamentId  String?
  type          String   // 'in_app' | 'email' | 'sms'
  channel       String   // 'in_app' | 'email' | 'sms_twilio'
  recipient     String
  subject       String?
  message       String
  status        String   @default("pending")
  sentAt        DateTime?
  readAt        DateTime?
  metadata      Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  organization  Organization @relation(fields: [orgId], references: [id])
  player        Player?      @relation(fields: [playerId], references: [id])
  tournament    Tournament?  @relation(fields: [tournamentId], references: [id])
}

model NotificationPreference {
  id               String   @id @default(cuid())
  playerId         String   @unique
  emailEnabled     Boolean  @default(true)
  smsEnabled       Boolean  @default(true)
  smsOptedOut      Boolean  @default(false)
  quietHoursStart  Int?     // Hour (0-23)
  quietHoursEnd    Int?     // Hour (0-23)
  timezone         String?  @default("UTC")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  player           Player   @relation(fields: [playerId], references: [id])
}

model Organization {
  // ... existing fields ...
  twilioAccountSid   String?
  twilioAuthToken    String?
  twilioPhoneNumber  String?
}
```

### Run Migrations

```bash
cd apps/web
pnpm prisma migrate dev --name add-notification-tables
```

---

## 5. Environment Variables Reference

### Complete .env.local Template

```bash
# ============================================
# Notification Service Configuration
# ============================================

# Upstash Redis (Rate Limiting & SMS Deduplication)
# Required: Yes (for production)
# Get from: https://console.upstash.com/
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here

# Email (SMTP)
# Required: Yes (for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com

# SendGrid (Alternative to SMTP)
# Required: No (choose SMTP or SendGrid)
# SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx

# Twilio (SMS)
# Required: No (stored per-organization in database)
# Organization-level credentials configured via admin panel
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=your_auth_token_here
# TWILIO_PHONE_NUMBER=+1234567890
```

---

## 6. Testing

### Unit Tests

```bash
cd apps/web

# Test notification service
pnpm test tests/unit/notification-service.test.ts

# Test notification templates
pnpm test tests/unit/notification-templates.test.ts

# Test match notifications
pnpm test tests/unit/match-notifications.test.ts

# All notification tests
pnpm test tests/unit/notification*.test.ts
```

Expected results:

- **64 tests passing** (notification system)
- No errors or warnings

### Integration Tests

```bash
# Test email delivery
curl -X POST http://localhost:3020/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "test-org",
    "playerId": "test-player",
    "type": "email",
    "channel": "email",
    "recipient": "test@example.com",
    "subject": "Test Email",
    "message": "This is a test email"
  }'

# Test SMS delivery
curl -X POST http://localhost:3020/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "test-org",
    "playerId": "test-player",
    "type": "sms",
    "channel": "sms_twilio",
    "recipient": "+1234567890",
    "message": "Test SMS message"
  }'
```

### Manual Testing Checklist

- [ ] Send test email via SMTP
- [ ] Send test SMS via Twilio
- [ ] Verify rate limiting (send 15+ emails rapidly)
- [ ] Test SMS deduplication (send same message twice within 2 minutes)
- [ ] Test opt-out (send SMS with "STOP")
- [ ] Test opt-in (send SMS with "START" after opting out)
- [ ] Test quiet hours (set quiet hours, send notification)
- [ ] Test template rendering (all 7 template types)
- [ ] Test in-app notifications (create and mark as read)
- [ ] Monitor error logs (Sentry, console)

---

## 7. Monitoring & Debugging

### View Notification Logs

```bash
# Via Prisma Studio
cd apps/web
pnpm prisma studio

# Navigate to Notification table
# Filter by: status, type, sentAt, etc.
```

### Common Issues

#### 1. Rate Limiting Not Working

**Symptoms:** Can send unlimited emails/SMS rapidly
**Cause:** Redis credentials missing or incorrect
**Fix:**

1. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in `.env.local`
2. Check Upstash console for connection errors
3. Restart dev server: `pnpm dev`

#### 2. Email Not Sending

**Symptoms:** Email notifications fail with SMTP error
**Cause:** Incorrect SMTP credentials or blocked by provider
**Fix:**

1. Verify SMTP credentials (host, port, user, password)
2. For Gmail: Use App Password, not account password
3. Check spam folder for test emails
4. Try SendGrid for better deliverability

#### 3. SMS Not Sending

**Symptoms:** SMS notifications fail with Twilio error
**Cause:** Missing or incorrect Twilio credentials in database
**Fix:**

1. Verify organization has Twilio credentials set:
   ```sql
   SELECT "twilioAccountSid", "twilioPhoneNumber"
   FROM "Organization"
   WHERE id = 'your-org-id';
   ```
2. Check Twilio console for errors
3. Verify phone number format (+1234567890)
4. Check Twilio balance (free trial has limits)

#### 4. SMS Deduplication False Positives

**Symptoms:** Valid SMS blocked as duplicate
**Cause:** Redis key collision or TTL issue
**Fix:**

1. Check Redis for stale keys: `KEYS sms:dedupe:*`
2. Manually delete if needed: `DEL sms:dedupe:+1234567890:xyz`
3. Verify 2-minute window is acceptable for use case

#### 5. Webhooks Not Working (STOP/START)

**Symptoms:** STOP commands not unsubscribing users
**Cause:** Twilio webhook not configured correctly
**Fix:**

1. Verify webhook URL in Twilio console
2. Ensure URL is publicly accessible (not localhost)
3. Check webhook logs in Twilio console
4. Test webhook manually:
   ```bash
   curl -X POST http://localhost:3020/api/notifications/sms/webhook \
     -d "Body=STOP" \
     -d "From=+1234567890"
   ```

---

## 8. Production Deployment

### Checklist

- [ ] Upstash Redis configured with production credentials
- [ ] Email provider configured (SMTP or SendGrid)
- [ ] Twilio credentials added to production database
- [ ] Twilio webhook URL updated to production domain
- [ ] Environment variables set in deployment platform
- [ ] Database migrations applied
- [ ] Rate limiting verified
- [ ] SMS deduplication verified
- [ ] Error tracking enabled (Sentry)
- [ ] Notification analytics enabled (PostHog)

### Environment Variables (Production)

Set these in your deployment platform (Vercel, Netlify, Railway, etc.):

```bash
UPSTASH_REDIS_REST_URL=https://prod-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_prod_token
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

### Scaling Considerations

1. **Redis Scaling**
   - Upstash auto-scales
   - Monitor command count in console
   - Upgrade plan if approaching limits

2. **Email Scaling**
   - SMTP: Max 500-2000 emails/day (Gmail)
   - SendGrid: Upgrade plan for higher volume
   - Consider bulk email service for newsletters

3. **SMS Scaling**
   - Twilio auto-scales
   - Monitor spending in console
   - Enable auto-recharge to prevent service interruption

4. **Rate Limiting**
   - Adjust limits based on usage patterns
   - Monitor for abuse in logs
   - Consider per-user limits for fairness

---

## 9. Cost Estimates

### MVP / Small Scale (<1000 active users)

| Service       | Usage               | Cost            |
| ------------- | ------------------- | --------------- |
| Upstash Redis | 10,000 commands/day | **Free**        |
| Email (SMTP)  | 500 emails/day      | **Free**        |
| Twilio SMS    | 100 SMS/month       | **$0.75/month** |
| **Total**     |                     | **~$1/month**   |

### Growth Stage (1000-10,000 users)

| Service       | Usage                | Cost            |
| ------------- | -------------------- | --------------- |
| Upstash Redis | 100,000 commands/day | **$10/month**   |
| SendGrid      | 50,000 emails/month  | **$20/month**   |
| Twilio SMS    | 1,000 SMS/month      | **$7.50/month** |
| **Total**     |                      | **~$40/month**  |

### Scale (10,000+ users)

| Service       | Usage                 | Cost                |
| ------------- | --------------------- | ------------------- |
| Upstash Redis | 1M+ commands/day      | **$50-100/month**   |
| SendGrid      | 100,000+ emails/month | **$80-200/month**   |
| Twilio SMS    | 10,000 SMS/month      | **$75/month**       |
| **Total**     |                       | **~$200-400/month** |

---

## 10. API Reference

### Send Notification

```typescript
POST /api/notifications
Content-Type: application/json

{
  "orgId": "org-123",
  "playerId": "player-123",
  "type": "sms",
  "channel": "sms_twilio",
  "recipient": "+1234567890",
  "message": "Your match is ready!"
}
```

### Send with Template

```typescript
POST /api/notifications
Content-Type: application/json

{
  "orgId": "org-123",
  "playerId": "player-123",
  "templateType": "match_upcoming",
  "templateVariables": {
    "playerName": "John Doe",
    "matchOpponent": "Jane Smith",
    "matchTime": "2pm",
    "matchLocation": "Table 5"
  },
  "channels": ["sms", "email"]
}
```

### Update Preferences

```typescript
PATCH /api/notifications/preferences
Content-Type: application/json

{
  "smsEnabled": false,
  "quietHoursStart": 22,
  "quietHoursEnd": 8
}
```

### Get Notification Analytics

```typescript
GET /api/notifications/analytics?orgId=org-123&startDate=2025-01-01&endDate=2025-01-31

Response:
{
  "totalSent": 1234,
  "byChannel": {
    "email": 800,
    "sms": 434
  },
  "deliveryRate": 0.98,
  "avgDeliveryTime": 1.5
}
```

---

## 11. Support & Resources

### Documentation

- **Upstash Redis:** https://docs.upstash.com/redis
- **Twilio SMS:** https://www.twilio.com/docs/sms
- **SendGrid:** https://docs.sendgrid.com/
- **Nodemailer:** https://nodemailer.com/

### Internal Documentation

- **Sprint 4 Summary:** `docs/progress/SPRINT-04-SUMMARY.md`
- **Template System:** `apps/web/lib/notification-templates.ts`
- **Service Implementation:** `apps/web/lib/notification-service.ts`
- **Match Notifications:** `apps/web/lib/match-notifications.ts`

### Getting Help

1. Check this guide first
2. Review unit tests for examples
3. Check Upstash/Twilio console for errors
4. Review logs (console, Sentry)
5. Contact development team

---

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Next Review:** After production deployment
