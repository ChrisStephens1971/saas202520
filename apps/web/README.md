# Tournament Management SaaS - Web Application

**Next.js 16.0.1** application for tournament bracket management with real-time notifications, payments, and scoring.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** or **Bun** runtime
- **PostgreSQL** database running on port 5420
- **pnpm** package manager (`npm install -g pnpm`)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment template
cp ../../.env.example .env.local

# Configure environment variables (see below)

# Run database migrations
pnpm prisma migrate dev

# Start development server
pnpm dev
```

Open [http://localhost:3020](http://localhost:3020) in your browser.

---

## 📋 Environment Configuration

### Minimum Required (Development)

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5420/saas202520

# Authentication
JWT_SECRET=your-secret-key-here
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3020
```

### Full Configuration

See `../../.env.example` for all available configuration options.

**Essential services:**
- **Upstash Redis** - Rate limiting & SMS deduplication (production required)
- **Email (SMTP/SendGrid)** - Email notifications
- **Twilio** - SMS notifications (optional, configured per-organization)
- **Stripe** - Payment processing (optional)

**Complete setup guide:** `../../technical/NOTIFICATION-SERVICE-SETUP.md`

---

## 🔧 Available Scripts

### Development

```bash
pnpm dev              # Start dev server on port 3020
pnpm dev:turbo        # Start with Turbopack (faster HMR)
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript type checking
```

### Database

```bash
pnpm prisma studio            # Open Prisma Studio (database GUI)
pnpm prisma migrate dev       # Run migrations (development)
pnpm prisma migrate deploy    # Run migrations (production)
pnpm prisma generate          # Generate Prisma Client
pnpm prisma db seed           # Seed database with test data
```

### Testing

```bash
pnpm test             # Run all tests (watch mode)
pnpm test:run         # Run all tests (single run)
pnpm test:ui          # Open Vitest UI
pnpm test:coverage    # Generate coverage report
```

**Test files:**
- Unit tests: `tests/unit/**/*.test.ts`
- Integration tests: `tests/integration/**/*.test.ts`
- API tests: `app/api/**/__tests__/*.test.ts`

---

## 📁 Project Structure

```
apps/web/
├── app/                        # Next.js app router
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── tournaments/       # Tournament management
│   │   ├── brackets/          # Bracket generation
│   │   ├── matches/           # Match scoring
│   │   ├── notifications/     # Notification system
│   │   └── payments/          # Payment processing
│   ├── (dashboard)/           # Dashboard pages
│   └── (public)/              # Public pages
│
├── lib/                       # Core business logic
│   ├── bracket-generator.ts   # Bracket generation algorithms
│   ├── seeding-algorithm.ts   # Seeding strategies
│   ├── notification-service.ts # Multi-channel notifications
│   ├── notification-templates.ts # Template system
│   ├── match-notifications.ts # Match notification triggers
│   ├── stripe-payments.ts     # Payment integration
│   └── prisma.ts              # Database client
│
├── components/                # React components
│   ├── ui/                    # shadcn/ui components
│   ├── brackets/              # Bracket visualization
│   ├── tournaments/           # Tournament components
│   └── matches/               # Match components
│
├── tests/                     # Test files
│   ├── unit/                  # Unit tests
│   └── integration/           # Integration tests
│
└── prisma/                    # Database schema & migrations
    ├── schema.prisma          # Prisma schema
    ├── migrations/            # Database migrations
    └── seed.ts                # Seed data
```

---

## 🎯 Key Features

### Sprint 1-2: Core Tournament System
- ✅ Organization & player management
- ✅ Tournament creation & registration
- ✅ Bracket generation (single/double elimination, round robin, swiss)

### Sprint 3: Scoring & Payments
- ✅ Match scoring & progression
- ✅ Real-time bracket updates
- ✅ Stripe payment integration
- ✅ Entry fee collection

### Sprint 4: Notifications (89% Complete)
- ✅ In-app notification system
- ✅ Email notifications (SMTP/SendGrid)
- ✅ SMS notifications (Twilio)
- ✅ Rate limiting (10 email/min, 5 SMS/min)
- ✅ SMS deduplication (2-minute window)
- ✅ Preference management (opt-out, quiet hours)
- ✅ Template system (7 notification types)

**See:** `../../sprints/current/sprint-04-notifications-kiosk.md`

---

## 🧪 Testing

### Unit Tests (64 tests)

```bash
# Notification service tests
pnpm test tests/unit/notification-service.test.ts        # 15 tests
pnpm test tests/unit/notification-templates.test.ts      # 30 tests
pnpm test tests/unit/match-notifications.test.ts         # 12 tests

# Payment tests
pnpm test tests/unit/stripe-payments.test.ts             # 23 tests

# Bracket tests
pnpm test tests/unit/bracket-generator.test.ts
pnpm test tests/unit/seeding-algorithm.test.ts
```

### Integration Tests

```bash
# API endpoint tests
pnpm test app/api/notifications/__tests__
pnpm test app/api/tournaments/__tests__
pnpm test app/api/brackets/__tests__
```

### Test Coverage

Current coverage:
- **Notification system:** 95% (64 tests)
- **Payment system:** 90% (23 tests)
- **Bracket generation:** 85% (40+ tests)
- **Total:** 127+ unit tests passing

---

## 📚 Documentation

### Technical Guides

- **Notification Setup:** `../../technical/NOTIFICATION-SERVICE-SETUP.md`
- **Bracket Algorithms:** `../../technical/BRACKET-ALGORITHMS.md`
- **Payment Integration:** `../../technical/PAYMENT-INTEGRATION.md`
- **Multi-Tenant Architecture:** `../../technical/multi-tenant-architecture.md`

### Sprint Documentation

- **Sprint 4 Summary:** `../../docs/progress/SPRINT-04-SUMMARY.md`
- **Sprint 3 Summary:** `../../docs/progress/SPRINT-03-SUMMARY.md`
- **Product Roadmap:** `../../product/roadmap/2025-Q1-Q2-12-week-launch.md`

### API Documentation

See `../../technical/api/` for API endpoint documentation.

---

## 🔌 Integrations

### Required for Production

| Service | Purpose | Setup Guide |
|---------|---------|-------------|
| **Upstash Redis** | Rate limiting, deduplication | [Setup](../../technical/NOTIFICATION-SERVICE-SETUP.md#1-upstash-redis-setup) |
| **Email Provider** | Email notifications | [Setup](../../technical/NOTIFICATION-SERVICE-SETUP.md#2-email-setup) |
| **PostgreSQL** | Primary database | Auto-configured |

### Optional Services

| Service | Purpose | Setup Guide |
|---------|---------|-------------|
| **Twilio** | SMS notifications | [Setup](../../technical/NOTIFICATION-SERVICE-SETUP.md#3-twilio-sms-setup) |
| **Stripe** | Payment processing | [Setup](../../technical/PAYMENT-INTEGRATION.md) |
| **Sentry** | Error tracking | [Docs](https://docs.sentry.io/) |
| **PostHog** | Product analytics | [Docs](https://posthog.com/docs) |

---

## 🚀 Deployment

### Build for Production

```bash
pnpm build
pnpm start
```

### Environment Variables (Production)

**Required:**
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://yourdomain.com
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_FROM=noreply@yourdomain.com
```

**Optional:**
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Deployment Platforms

**Recommended:**
- **Vercel** - Zero-config Next.js hosting
- **Railway** - Full-stack hosting with PostgreSQL
- **Render** - Docker-based hosting

**Database:**
- **Neon** - Serverless PostgreSQL
- **Supabase** - PostgreSQL with real-time features
- **Railway** - Integrated PostgreSQL

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
Error: Can't reach database server
```

**Fix:**
- Verify PostgreSQL is running on port 5420
- Check `DATABASE_URL` in `.env.local`
- Run: `pnpm prisma migrate dev`

#### 2. Notifications Not Sending

**Fix:**
- Check Redis credentials (rate limiting)
- Verify SMTP credentials (email)
- Check Twilio credentials (SMS)
- See: `../../technical/NOTIFICATION-SERVICE-SETUP.md#7-monitoring--debugging`

#### 3. Type Errors

```bash
pnpm prisma generate
pnpm type-check
```

#### 4. Tests Failing

```bash
# Clear test cache
rm -rf node_modules/.vitest
pnpm test:run
```

---

## 📊 Performance

### Optimization Features

- ✅ Static page generation (SSG)
- ✅ Incremental static regeneration (ISR)
- ✅ Image optimization (Next.js Image)
- ✅ Code splitting & lazy loading
- ✅ Redis caching for rate limiting
- ✅ Database query optimization (Prisma)

### Bundle Size

```bash
pnpm build
# Check .next/analyze for bundle analysis
```

---

## 🤝 Contributing

### Code Style

- **TypeScript** - Strict mode enabled
- **ESLint** - Enforced on commit
- **Prettier** - Auto-formatting
- **Vitest** - Test all new features

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, add tests
pnpm test

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push to GitHub
git push origin feature/my-feature
```

### Testing Requirements

- ✅ Unit tests for all new logic
- ✅ Integration tests for API endpoints
- ✅ 80%+ code coverage for new files

---

## 📖 Tech Stack

- **Framework:** Next.js 16.0.1 (App Router)
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL + Prisma ORM
- **UI:** React 19, Tailwind CSS, shadcn/ui
- **Testing:** Vitest, React Testing Library
- **Notifications:** Twilio (SMS), Nodemailer (Email)
- **Payments:** Stripe
- **Cache:** Upstash Redis

---

## 📄 License

Proprietary - All rights reserved

---

## 💬 Support

**Questions or Issues?**
- Check documentation in `../../technical/`
- Review sprint summaries in `../../docs/progress/`
- Check test files for examples

---

**Version:** 1.0.0
**Last Updated:** 2025-11-05
