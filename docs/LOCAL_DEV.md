# Local Development Guide

Complete guide to setting up and running the Tournament Platform locally.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Running the App](#running-the-app)
6. [Development Workflow](#development-workflow)
7. [Troubleshooting](#troubleshooting)
8. [Optional Services](#optional-services)
9. [Tips & Best Practices](#tips--best-practices)

---

## Prerequisites

### Required

- **Node.js** 20.0.0 or higher
  - Check: `node --version`
  - Download: https://nodejs.org/

- **pnpm** 10.0.0 or higher
  - Check: `pnpm --version`
  - Install: `npm install -g pnpm`

- **PostgreSQL** 16.0 or higher
  - Check: `psql --version`
  - Download: https://www.postgresql.org/download/
  - Or use Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine`

- **Git**
  - Check: `git --version`

### Optional (for full features)

- **Redis** (for caching)
  - Download: https://redis.io/download
  - Or use Docker: `docker run -d -p 6379:6379 redis:7-alpine`

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd tournament-platform
```

### 2. Install Dependencies

```bash
pnpm install
```

This will:

- Install all workspace dependencies
- Set up git hooks
- Install Turborepo
- Link internal packages

**Expected time:** 2-3 minutes

---

## Database Setup

### Option A: Local PostgreSQL (Recommended)

#### 1. Ensure PostgreSQL is Running

```bash
# Check if PostgreSQL is running
pg_isready

# If not running, start it (macOS with Homebrew)
brew services start postgresql@16

# Or on Linux (Ubuntu/Debian)
sudo systemctl start postgresql

# Or on Windows
# Start from Services app or pgAdmin
```

#### 2. Create Database

```bash
# Using createdb command
createdb tournament_platform

# Or using psql
psql -U postgres -c "CREATE DATABASE tournament_platform;"
```

#### 3. Verify Database

```bash
psql -U postgres -l | grep tournament_platform
```

You should see `tournament_platform` in the list.

### Option B: Docker PostgreSQL

```bash
# Run PostgreSQL in Docker
docker run -d \
  --name tournament-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tournament_platform \
  -p 5432:5432 \
  postgres:16-alpine

# Verify it's running
docker ps | grep tournament-db
```

### Option C: Remote PostgreSQL

Use a hosted PostgreSQL service:

- **Supabase** (free tier): https://supabase.com
- **Neon** (free tier): https://neon.tech
- **Railway** (free tier): https://railway.app

Just get the connection string and use it in `DATABASE_URL`.

---

## Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.example .env.local
```

### 2. Edit `.env.local`

**Minimum required config:**

```bash
# Database - Update with your actual PostgreSQL credentials
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tournament_platform"

# Auth - Generate a secure secret
AUTH_SECRET="<run: openssl rand -base64 32>"

# App URL
NEXTAUTH_URL="http://localhost:3000"
```

**Generate AUTH_SECRET:**

```bash
# Linux/macOS
openssl rand -base64 32

# Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Or just use a random string (32+ characters)
```

### 3. Optional Configuration

**For email notifications:**

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-specific-password"
SMTP_FROM='"Tournament Platform" <noreply@tournament.com>'
```

**For Gmail:** Create an App Password at https://myaccount.google.com/apppasswords

**For Redis caching:**

```bash
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"
```

**For Stripe payments (test mode):**

```bash
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

---

## Running the App

### Step-by-Step First Run

#### 1. Generate Prisma Client

```bash
pnpm db:generate
```

This generates the TypeScript types for your database schema.

#### 2. Run Database Migrations

```bash
pnpm db:migrate
```

This creates all the tables in your database.

**Expected output:**

```
Prisma Migrate applied the following migration(s):
- 20251103163100_init
- 20251104_add_tournament_description
- 20251106_add_analytics_tables
- 20251106_add_player_profiles
- 20251106000000_add_performance_indexes
- 20251111173004_add_venue_and_prize_tracking
```

#### 3. Seed Sample Data

```bash
pnpm db:seed
```

This creates sample data for testing:

- **Organization:** Phoenix Pool League
- **User:** `mike@phoenixpool.com` / `password123`
- **Sport Config:** 8-Ball Pool
- **Tournaments:** 2 sample tournaments
- **Tables:** 8 tables (Table 1-8)
- **Players:** 16 sample players
- **Venues:** 1 sample venue

**Expected output:**

```
🌱 Seeding database...
Clearing existing data...
✓ Cleared existing data
Creating sport configurations...
✓ Created sport config: 8-Ball Pool
Creating organization: Phoenix Pool League...
✓ Created user: mike@phoenixpool.com (password: password123)
...
✅ Seed completed successfully!
```

#### 4. Start Development Server

```bash
pnpm dev
```

This starts:

- Next.js web app on port 3000
- Socket.IO server on the same port
- Turbo watch mode for all packages

**Expected output:**

```
• Packages in scope: @tournament/api-contracts, @tournament/crdt, @tournament/events, @tournament/shared, @tournament/tournament-engine, @tournament/validation, web
• Running dev in 7 packages
• Remote caching disabled

web:dev: ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

#### 5. Open Browser

Navigate to: **http://localhost:3000**

You should see the Tournament Platform homepage.

#### 6. Log In

**Credentials:**

- Email: `mike@phoenixpool.com`
- Password: `password123`

After login, you'll be redirected to the dashboard or org selection page.

---

## Development Workflow

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
pnpm install

# 3. Run migrations (if schema changed)
pnpm db:migrate

# 4. Regenerate Prisma Client (if schema changed)
pnpm db:generate

# 5. Start dev server
pnpm dev
```

### Working on Specific Packages

```bash
# Run only web app
pnpm --filter web dev

# Run only sync-service
pnpm --filter sync-service dev

# Build specific package
pnpm --filter @tournament/tournament-engine build

# Run tests for specific package
pnpm --filter web test
```

### Database Commands

```bash
# Open Prisma Studio (visual database editor)
pnpm db:studio

# Generate Prisma Client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Create a new migration
cd prisma
pnpm exec prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
pnpm exec prisma migrate reset

# Seed database
pnpm db:seed
```

### Testing

```bash
# Run all tests (watch mode)
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run tests with coverage
pnpm --filter web test:coverage

# Run e2e tests (Playwright)
pnpm --filter web test
```

### Code Quality

```bash
# Lint all packages
pnpm lint

# Format code
pnpm format

# Type check
pnpm build  # TypeScript compilation is part of build
```

---

## Troubleshooting

### Database Issues

#### ❌ "Connection refused" or "Can't connect to database"

**Check if PostgreSQL is running:**

```bash
pg_isready
# Expected: accepting connections
```

**If not running:**

```bash
# macOS
brew services start postgresql@16

# Linux
sudo systemctl start postgresql

# Docker
docker start tournament-db
```

**Verify connection string:**

```bash
# Test connection manually
psql "postgresql://postgres:postgres@localhost:5432/tournament_platform"
```

#### ❌ "Database does not exist"

```bash
createdb tournament_platform
```

#### ❌ "Migration failed" or "P1001 error"

- Check `DATABASE_URL` in `.env.local`
- Ensure format: `postgresql://user:password@host:port/database`
- Ensure no trailing spaces or quotes

#### ❌ "Prisma Client not generated"

```bash
pnpm db:generate
```

### Authentication Issues

#### ❌ "Invalid credentials" or "Unable to login"

- Verify seed script ran successfully
- Check that user exists:
  ```bash
  pnpm db:studio
  # Navigate to User table, look for mike@phoenixpool.com
  ```
- Re-seed database:
  ```bash
  pnpm db:seed
  ```

#### ❌ "AUTH_SECRET error"

- Ensure `AUTH_SECRET` is set in `.env.local`
- Must be at least 32 characters
- Generate new one: `openssl rand -base64 32`

#### ❌ "Session not persisting" or "Logged out immediately"

- Clear browser cookies and cache
- Check `NEXTAUTH_URL` matches your app URL exactly
- Restart dev server

### Build/Runtime Issues

#### ❌ "Module not found" errors

```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install

# Regenerate Prisma Client
pnpm db:generate
```

#### ❌ "Port 3000 already in use"

**Find and kill process:**

```bash
# macOS/Linux
lsof -ti:3000 | xargs kill

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Or change port in `.env.local`:**

```bash
PORT=3001
NEXTAUTH_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

#### ❌ "TypeScript errors"

```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Regenerate Prisma types
pnpm db:generate

# Rebuild
pnpm build
```

#### ❌ "Socket.IO connection failed"

- Check if server started correctly (look for "ready started server" in logs)
- Verify `NEXT_PUBLIC_SOCKET_URL` is correct or unset (defaults to same origin)
- Check browser console for WebSocket errors

### Performance Issues

#### Slow queries?

```bash
# Enable query logging in Prisma
# Add to prisma/schema.prisma:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  log      = ["query", "info", "warn", "error"]
}
```

#### High memory usage?

- Restart dev server
- Clear `.next` cache: `rm -rf apps/web/.next`
- Check for memory leaks in Socket.IO connections

---

## Optional Services

### Redis (Caching)

**Why:** Improves performance for frequently accessed data, session storage, rate limiting.

**Install:**

```bash
# macOS
brew install redis
brew services start redis

# Linux (Ubuntu/Debian)
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d --name tournament-redis -p 6379:6379 redis:7-alpine
```

**Configure in `.env.local`:**

```bash
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"
```

**Test:**

```bash
redis-cli ping
# Expected: PONG
```

### Stripe (Payments)

**Why:** Test payment flows locally.

**Setup:**

1. Create Stripe account: https://dashboard.stripe.com/register
2. Get test API keys: https://dashboard.stripe.com/test/apikeys
3. Add to `.env.local`:
   ```bash
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_PUBLISHABLE_KEY="pk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   ```

**Webhook testing (optional):**

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Email (SMTP)

**Testing with Mailtrap:**

1. Create account: https://mailtrap.io/
2. Get SMTP credentials
3. Add to `.env.local`:
   ```bash
   SMTP_HOST="sandbox.smtp.mailtrap.io"
   SMTP_PORT="2525"
   SMTP_USER="your-mailtrap-user"
   SMTP_PASS="your-mailtrap-pass"
   ```

**All emails will be caught by Mailtrap (won't send to real addresses)**

---

## Tips & Best Practices

### Development

- **Use Prisma Studio** for quick database inspection: `pnpm db:studio`
- **Check logs** in terminal for errors and warnings
- **Use browser DevTools** to inspect API calls and WebSocket connections
- **Restart dev server** if you change environment variables

### Database

- **Create database backups** before making schema changes:
  ```bash
  pg_dump tournament_platform > backup_$(date +%Y%m%d).sql
  ```
- **Use migrations** for all schema changes (don't manually edit database)
- **Test migrations** on a copy of your database first

### Git Workflow

- **Pull before you start** working: `git pull origin main`
- **Run tests before committing:** `pnpm test:run`
- **Check lint:** `pnpm lint`
- **Commit often** with clear messages

### Performance

- **Use server components** in Next.js where possible (app router)
- **Minimize database queries** - use Prisma's `include` for relations
- **Use Socket.IO** for real-time updates instead of polling
- **Enable Redis caching** for frequently accessed data

### Security

- **Never commit `.env.local`** (it's gitignored)
- **Use test keys** for Stripe, never production keys in development
- **Keep dependencies updated:** `pnpm update`
- **Review security advisories:** `pnpm audit`

---

## Quick Reference

### Essential Commands

```bash
# Installation
pnpm install                   # Install dependencies
pnpm db:generate              # Generate Prisma Client
pnpm db:migrate               # Run migrations
pnpm db:seed                  # Seed database

# Development
pnpm dev                      # Start dev server
pnpm dev --filter web         # Start only web app
pnpm build                    # Build for production

# Database
pnpm db:studio                # Open Prisma Studio
pnpm db:generate              # Regenerate Prisma Client
pnpm db:migrate               # Run migrations
pnpm db:seed                  # Seed sample data

# Testing
pnpm test                     # Run tests (watch)
pnpm test:run                 # Run tests (CI)
pnpm lint                     # Lint code

# Troubleshooting
rm -rf node_modules && pnpm install  # Reinstall deps
rm -rf apps/web/.next               # Clear Next.js cache
pnpm db:generate                    # Regenerate Prisma
```

### Default Credentials

After seeding:

- **Email:** `mike@phoenixpool.com`
- **Password:** `password123`
- **Organization:** Phoenix Pool League

### Default Ports

- **Web App:** 3000
- **PostgreSQL:** 5432
- **Redis:** 6379

---

## Need Help?

- **Check logs** in terminal for error messages
- **Search docs** in `docs/` directory
- **Review API docs** in `docs/api/`
- **Check PROJECT_LOG.md** for recent changes
- **Create an issue** if you find a bug

---

**Ready to build?** Start the dev server and start coding! 🚀
