# Tournament Platform

A modern tournament management platform for Pool, Billiards, and similar competitive events. Built for Tournament Directors to run seamless events with real-time scoring, table management, and live standings.

**V1 Status:** Online-only platform. Offline/sync features designed but deferred to V2.

---

## 🎯 What is This?

**Tournament Platform** is a comprehensive SaaS solution that enables tournament organizers to:

- **Manage Tournaments:** Create single/double elimination, round-robin, and custom format tournaments
- **Live Scoring:** Real-time match scoring via Tournament Director console
- **Table Management:** Assign matches to tables, track availability, optimize floor usage
- **Player Profiles:** Player statistics, ratings, history, and leaderboards
- **Payments:** Integrated Stripe support for entry fees and automated payout calculations
- **Notifications:** Email, SMS, and push notifications for players and staff
- **Analytics:** Detailed tournament analytics, performance tracking, and reporting
- **Multi-Tenant:** Fully isolated organization-level data and settings

**Perfect for:** Pool leagues, billiard halls, tournament organizers, competitive gaming venues

---

## 🏗️ Tech Stack

**Frontend:**

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Socket.IO (real-time updates)
- SWR (data fetching)

**Backend:**

- Next.js API Routes
- Prisma ORM
- PostgreSQL
- NextAuth v5 (authentication)
- BullMQ (job queues)

**Infrastructure:**

- Turborepo (monorepo)
- pnpm (package manager)
- Bicep/Terraform (IaC)
- GitHub Actions (CI/CD)

**Integrations:**

- Stripe (payments)
- Twilio (SMS)
- Nodemailer (email)
- Sentry (error tracking)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **pnpm** 10+ (`npm install -g pnpm`)
- **PostgreSQL** 16+ ([Download](https://www.postgresql.org/download/))
- **Git**

### Installation (5 minutes)

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd tournament-platform
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   # Copy the example file
   cp .env.example .env.local

   # Edit .env.local and set:
   # - DATABASE_URL (your PostgreSQL connection string)
   # - AUTH_SECRET (generate with: openssl rand -base64 32)
   # - NEXTAUTH_URL (http://localhost:3000)
   ```

4. **Create database**

   ```bash
   # Using psql:
   createdb tournament_platform

   # Or manually create a database named 'tournament_platform'
   ```

5. **Run database migrations**

   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

6. **Seed sample data**

   ```bash
   pnpm db:seed
   ```

   This creates:
   - Organization: "Phoenix Pool League"
   - User: `mike@phoenixpool.com` / `password123`
   - Sample tournaments, tables, and players

7. **Start the development server**

   ```bash
   pnpm dev
   ```

8. **Open your browser**

   ```
   http://localhost:3000
   ```

   Login with: `mike@phoenixpool.com` / `password123`

---

## 📚 Documentation

- **[Local Development Guide](docs/LOCAL_DEV.md)** - Detailed setup, troubleshooting, and tips
- **[Architecture](docs/ARCHITECTURE.md)** - System design and data models
- **[API Documentation](docs/api/)** - API routes and contracts
- **[Project Log](docs/PROJECT_LOG.md)** - Development history and decisions
- **[TODO](docs/TODO.md)** - Project roadmap and task tracking

---

## 🎮 Key Features

### For Tournament Directors

- **TD Console:** Real-time view of all tables, matches, and queues
- **Quick Scoring:** Click-to-score interface for fast match updates
- **Table Assignment:** Drag-and-drop match assignment to tables
- **Bracket Management:** Auto-generate brackets, handle byes, manage advancement
- **Live Updates:** Players see their matches instantly via Socket.IO

### For Players

- **Live Standings:** Real-time tournament standings and brackets
- **Match Queue:** See upcoming matches and table assignments
- **Notifications:** Get notified when your match is called
- **Player Profiles:** Track your stats, rating, and tournament history
- **Leaderboards:** Global and organization-level rankings

### For Organizers

- **Multi-Venue Support:** Manage multiple locations
- **Payment Processing:** Stripe integration for entry fees
- **Payout Calculations:** Automated prize pool distribution
- **Analytics Dashboard:** Tournament performance metrics
- **User Management:** Role-based access (TD, Scorekeeper, Admin)

---

## 🗂️ Repository Structure

```
tournament-platform/
├── apps/
│   ├── web/                    # Next.js frontend + API routes
│   │   ├── app/               # Next.js app router pages
│   │   ├── components/        # React components
│   │   ├── lib/               # Utilities, services, helpers
│   │   └── auth.ts            # NextAuth configuration
│   └── sync-service/          # WebSocket sync service (deferred to V2)
├── packages/
│   ├── tournament-engine/     # Core tournament logic
│   ├── shared/                # Shared Prisma client, types
│   ├── api-contracts/         # API type definitions
│   ├── crdt/                  # CRDT for offline sync
│   ├── events/                # Event system
│   └── validation/            # Zod validation schemas
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Sample data seeder
├── infrastructure/
│   ├── bicep/                 # Azure Bicep templates
│   └── terraform/             # Terraform templates
├── docs/                      # Documentation
├── .github/workflows/         # CI/CD pipelines
└── README.md                  # This file
```

---

## 🔧 Development Commands

```bash
# Install dependencies
pnpm install

# Database
pnpm db:generate              # Generate Prisma Client
pnpm db:migrate               # Run migrations
pnpm db:seed                  # Seed sample data
pnpm db:studio                # Open Prisma Studio (DB GUI)

# Development
pnpm dev                      # Start dev server (all apps)
pnpm dev --filter web         # Start only web app
pnpm dev --filter sync-service # Start only sync service

# Build
pnpm build                    # Build all apps for production

# Testing
pnpm test                     # Run tests (watch mode)
pnpm test:run                 # Run tests (CI mode)
pnpm test:coverage            # Run tests with coverage

# Linting & Formatting
pnpm lint                     # Run ESLint
pnpm format                   # Format code with Prettier

# Load Testing
pnpm load-test                # Run k6 load tests
```

---

## 🔐 Multi-Tenant Architecture

This platform is **multi-tenant by design**:

- Each organization has isolated data (tournaments, players, tables, etc.)
- Users can belong to multiple organizations
- Organization context is stored in the session (JWT)
- All database queries are automatically filtered by `orgId`
- Users can switch organizations via `/select-organization`

**Security:** Tenant isolation is enforced at the application level via Prisma queries and auth middleware.

---

## 🌐 Environment Variables

**Required for local development:**

- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - App URL (e.g., `http://localhost:3000`)

**Optional (for full features):**

- `SMTP_*` - Email notifications
- `REDIS_*` - Caching and performance
- `STRIPE_*` - Payment processing
- `TWILIO_*` - SMS notifications
- `SENTRY_*` - Error tracking

**Offline/Sync (V2):**

- `OFFLINE_SYNC_ENABLED` - Set to `false` for V1 (default)
- Offline features are designed but deferred to a future release

See `.env.example` for the complete list with descriptions.

---

## 🧪 Testing

**Unit Tests:**

```bash
pnpm test:run
```

**E2E Tests** (Playwright):

```bash
pnpm --filter web test
```

**Test Database:**

- Use a separate database for testing (e.g., `tournament_platform_test`)
- Set `DATABASE_URL` in `.env.test`

---

## 🚢 Deployment

### Azure (Recommended)

This project includes Bicep and Terraform templates for Azure:

1. **Review infrastructure templates:** `infrastructure/bicep/`
2. **Configure parameters:** Set organization, environment, region
3. **Deploy:**
   ```bash
   az deployment sub create \
     --location eastus2 \
     --template-file infrastructure/bicep/main.bicep \
     --parameters @infrastructure/bicep/environments/prod.parameters.json
   ```

See `infrastructure/README.md` for detailed deployment instructions.

### Other Platforms

The app can be deployed to:

- Vercel (Next.js native)
- AWS (ECS, Fargate, or Amplify)
- Google Cloud (Cloud Run)
- Docker/Kubernetes

Requirements:

- PostgreSQL database
- Environment variables configured
- Redis (optional, for caching)

---

## 📊 Database Schema

**Core Models:**

- `Organization` - Multi-tenant isolation
- `User` - Authentication and profiles
- `Tournament` - Event management
- `Player` - Participant profiles
- `Match` - Game state and scoring
- `Table` - Physical resource management
- `Venue` - Location management
- `Payment` - Stripe integration
- `Notification` - Email/SMS/Push
- `AnalyticsEvent` - Event tracking

See `prisma/schema.prisma` for the complete schema.

---

## 🤝 Contributing

This is a private/commercial project. If you have access:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `pnpm test:run`
4. Ensure lint passes: `pnpm lint`
5. Commit: `git commit -m "feat: your feature"`
6. Push and create a PR

---

## 🐛 Troubleshooting

**Database connection fails:**

- Verify PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` in `.env.local`
- Ensure database exists: `createdb tournament_platform`

**Auth errors:**

- Verify `AUTH_SECRET` is set and not the default
- Check `NEXTAUTH_URL` matches your app URL
- Clear browser cookies and try again

**Build fails:**

- Run `pnpm db:generate` to generate Prisma Client
- Clear `.next` folder: `rm -rf apps/web/.next`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`

**Port already in use:**

- Change `PORT` in `.env.local`
- Or kill the process using port 3000: `lsof -ti:3000 | xargs kill`

See [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md) for more troubleshooting tips.

---

## 📝 License

Proprietary - All rights reserved

---

## 📧 Support

- **Issues:** Create an issue in this repository
- **Documentation:** See `docs/` directory
- **Questions:** Contact the development team

---

**Built with ❤️ for tournament organizers everywhere**
