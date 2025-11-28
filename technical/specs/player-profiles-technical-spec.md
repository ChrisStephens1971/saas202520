# Technical Specification: Player Profiles & Enhanced Experience

**Author:** Claude (Technical Architect)
**Date:** 2025-11-06
**Status:** Draft
**Related PRD:** `product/PRDs/player-profiles-enhanced-experience.md`
**Sprint:** Sprint 10 Week 2
**Priority:** P0 (Launch Blocker)

---

## Overview

### Problem

Players currently have no persistent identity or way to track their progress across tournaments on our platform. When a tournament ends, there's no historical record of performance, no visibility into statistics, and no sense of progression or achievement. This creates three critical issues:

1. **No Player Retention Mechanism** - Players have no compelling reason to return to the platform between tournaments
2. **Missing Competitive Intelligence** - Players cannot analyze their performance, identify improvement areas, or compare records with rivals
3. **Limited TD Tools** - Tournament directors lack historical player data for effective seeding and handicapping decisions

### Solution Summary

Build a comprehensive player profile system with:

- **Player Profiles** - Persistent player identities with photos, bios, and customization
- **Statistics Dashboard** - Real-time aggregated stats (win/loss, win rate, tournaments played, streaks)
- **Achievement System** - Gamification layer with 20 achievements across 4 categories
- **Tournament History** - Searchable, filterable history of all tournaments played
- **Head-to-Head Records** - Opponent-specific records and match history
- **Performance Analytics** - Charts showing win rate trends, rating progression, format breakdowns
- **Player Search** - TD-focused search with filters for skill level, location, and activity

### Goals

**Performance Goals:**

- Profile page load time: <1 second (Time to Interactive)
- Statistics calculation: <50ms (cached)
- Achievement check processing: <200ms per player (background job)
- Search results: <200ms
- Head-to-head calculation: <100ms

**User Engagement Goals:**

- 80% of active players view their profile within first week
- 60% of players unlock at least 1 achievement within 2 weeks
- 70% profile completion rate (add bio/photo)
- 40% check head-to-head records within first week

**Business Goals:**

- Increase tournament registration rate by 25%
- Increase return player rate from 35% to 55%
- Increase average session duration by 30%

### Non-Goals

**Explicitly out of scope for v1:**

- Social messaging system between players (v2)
- Custom/organization-specific achievements (v2)
- Player-to-player challenges or betting (v2)
- Advanced analytics (break percentages, shot tracking)
- Video highlights or media uploads
- Leaderboards (considering for v1.5)
- XP/leveling system (v2)
- Equipment profiles or preferences

---

## Background & Context

### Current State

**Existing Systems:**

- Tournament management system (brackets, matches, results)
- User authentication and multi-tenant organization structure
- Real-time WebSocket system for live updates
- PostgreSQL database with Prisma ORM
- Redis caching layer
- Next.js 14+ App Router frontend

**Current User Flow:**

1. User registers for tournament
2. Tournament director creates brackets
3. Players compete, matches are recorded
4. Tournament ends, results are published
5. **Data disappears** - No historical record, no player stats, no progression

**Pain Points:**

- Players ask "How many tournaments have I won?" - No answer
- TDs manually track player skill levels in spreadsheets
- No way to show improvement or progression over time
- Players leave platform after tournament ends (no retention loop)

### Constraints

**Technical Constraints:**

- Must maintain <1s page load time (performance critical)
- Multi-tenant architecture required (all data scoped to organization)
- Must respect existing tournament data model (no breaking changes)
- Background job processing must not interfere with tournament operations
- Photo storage budget: ~$50/month for 10,000 users

**Business Constraints:**

- 5-day development timeline (Sprint 10 Week 2)
- Must launch before end of Sprint 10
- Cannot delay other Sprint 10 features
- No budget for third-party achievement platforms

**Privacy Constraints:**

- GDPR compliance required (right to delete, export)
- Default privacy: Private profiles (opt-in to public)
- Tournament directors can always view profiles in their organization
- No cross-tenant data visibility

**Timeline Constraints:**

- Day 1: Database schema + Profile pages
- Day 2: Statistics + History
- Day 3: Achievement system
- Day 4: H2H + Search
- Day 5: Testing + Launch

### Assumptions

1. **Tournament data is clean and accurate** - Match results, placements, and scores are correctly recorded
2. **Rating system exists** - Elo or Fargo rating calculation is already implemented
3. **Photo uploads are low-volume** - Estimate <20% of users upload photos in first month
4. **Achievement criteria are static** - No dynamic/organization-specific achievements in v1
5. **Single profile per user per organization** - Users cannot have multiple profiles
6. **Browser support** - Modern browsers only (Chrome, Firefox, Safari, Edge - last 2 versions)
7. **Mobile responsive** - 40% of traffic is mobile, must work on phones/tablets

---

## Proposed Solution

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Next.js 14+ App Router (React Server Components)          │ │
│  │                                                             │ │
│  │  Pages:                      Components:                   │ │
│  │  • /players                  • PlayerCard                  │ │
│  │  • /players/[id]             • StatsOverview               │ │
│  │  • /players/[id]/history     • AchievementBadge            │ │
│  │  • /players/[id]/achievements• AchievementGrid             │ │
│  │  • /players/[id]/stats       • TournamentHistoryTable      │ │
│  │  • /players/[id]/edit        • PerformanceChart            │ │
│  │  • /players/[id]/vs/[oppId]  • HeadToHeadRecord            │ │
│  │                              • PlayerSearch                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Next.js API Routes (Edge Runtime)                          │ │
│  │                                                             │ │
│  │  Services:                                                  │ │
│  │  • PlayerProfileService    • HeadToHeadService             │ │
│  │  • StatsCalculator         • SearchService                 │ │
│  │  • AchievementEngine       • PrivacyService                │ │
│  │  • HistoryService                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
           ↓                           ↓                    ↓
┌──────────────────┐     ┌──────────────────────┐   ┌──────────────┐
│   Redis Cache    │     │  Background Jobs      │   │  PostgreSQL  │
│                  │     │                       │   │   Database   │
│ • Profile data   │     │ • Achievement checks  │   │              │
│ • Stats summary  │     │ • Stats recalculation │   │ • Profiles   │
│ • Search results │     │ • Rating updates      │   │ • Statistics │
│                  │     │ • Photo processing    │   │ • History    │
│ TTL: 60s public  │     │                       │   │ • Achievements│
│ TTL: 10s private │     │ (Vercel Cron)         │   │ • Matches    │
└──────────────────┘     └──────────────────────┘   │ • Ratings    │
                                                      └──────────────┘
                                                            ↓
                                                   ┌──────────────┐
                                                   │  Cloudflare  │
                                                   │  R2 Storage  │
                                                   │              │
                                                   │ • Profile    │
                                                   │   photos     │
                                                   │ • Achievement│
                                                   │   cards      │
                                                   └──────────────┘
```

### Data Flow Diagrams

#### 1. Profile Page Load Flow

```
User navigates to /players/[id]
         ↓
┌────────────────────────────────────┐
│ 1. Check if user can view profile  │ ← Privacy check
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 2. Check Redis cache for profile   │
└────────────────────────────────────┘
         ↓
    Cache hit? ───Yes──→ Return cached data (200ms)
         │
         No
         ↓
┌────────────────────────────────────┐
│ 3. Query PostgreSQL:                │
│    • player_profiles                │
│    • player_statistics              │
│    • player_achievements (top 5)    │
│    • player_tournament_history (5)  │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 4. Aggregate data and format        │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 5. Cache in Redis (60s TTL)         │
└────────────────────────────────────┘
         ↓
Return to user (500-800ms first load)
```

#### 2. Achievement Unlock Flow

```
Tournament finalized
         ↓
┌────────────────────────────────────┐
│ 1. Webhook: tournament.finalized   │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 2. Queue background job:            │
│    • processAchievements(playerId) │
│    • One job per player in tourney │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 3. Fetch player stats from DB       │
│    • total_tournaments              │
│    • total_wins                     │
│    • current_streak                 │
│    • etc.                           │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 4. For each achievement:            │
│    • Evaluate criteria              │
│    • If met → unlock                │
│    • If progress → update progress  │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 5. Insert into player_achievements  │
│    (if newly unlocked)              │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 6. Send real-time notification      │
│    via WebSocket (toast message)    │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 7. Invalidate Redis cache           │
│    for player profile               │
└────────────────────────────────────┘
```

#### 3. Statistics Update Flow

```
Match completed
         ↓
┌────────────────────────────────────┐
│ 1. Update player_matches table      │
│    • Insert match record for both   │
│      players (winner/loser)         │
└────────────────────────────────────┘
         ↓
Tournament finalized
         ↓
┌────────────────────────────────────┐
│ 2. Queue background job:            │
│    • recalculateStats(playerId)     │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 3. Aggregate from tournament tables:│
│    • Count tournaments played       │
│    • Count total matches (W/L)      │
│    • Calculate win rate             │
│    • Determine best finish          │
│    • Calculate streak               │
│    • Breakdown by format            │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 4. Update player_statistics table   │
│    (single row per player)          │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 5. Insert player_tournament_history │
│    (denormalized record)            │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 6. Insert player_rating_history     │
│    (if rating changed)              │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ 7. Invalidate Redis cache           │
└────────────────────────────────────┘
```

---

## Components

### Frontend Pages

#### 1. `/players` - Player Directory

**Purpose:** Browse and search all players in the organization

**Route:** `/players?search=name&skill_min=1200&limit=20&offset=0`

**Server Component:** Yes (SSR for SEO)

**Features:**

- Player search with autocomplete
- Advanced filters (skill level, location, tournaments played)
- Grid view of player cards (3 columns desktop, 1 column mobile)
- Pagination (20 per page)
- Privacy-respecting (only shows public profiles + own org)

**Performance:**

- Initial load: <800ms
- Search typing: 200ms debounce
- Filter change: <300ms

**Tech Stack:**

- React Server Component for initial data
- Client component for search/filter interactivity
- React Query for search results caching
- Intersection Observer for infinite scroll (mobile)

---

#### 2. `/players/[id]` - Player Profile (Main)

**Purpose:** Comprehensive player profile page (default view)

**Route:** `/players/[id]`

**Server Component:** Yes (SSR with ISR - 60s revalidation)

**Sections:**

1. **Profile Header**
   - Profile photo (400x400, optimized WebP)
   - Display name
   - Location (city, state)
   - Rating with trend indicator (↑/↓)
   - Bio (max 500 chars)
   - Member since date
   - Social links (Twitter, Instagram)
   - Edit button (owner only)

2. **Statistics Dashboard** (above the fold)
   - Win rate percentage (large display)
   - Total tournaments played
   - Best finish position
   - Total record (wins-losses)
   - Total matches played
   - Current streak (wins or losses with direction)
   - Stats by format (collapsible section)

3. **Achievements Showcase** (top 5 unlocked)
   - Achievement badges with hover tooltips
   - "View All Achievements →" link

4. **Recent Tournaments** (last 3)
   - Tournament name, date, format
   - Placement and record
   - "View Full History →" link

**Performance:**

- Time to Interactive: <1s
- Skeleton loader while loading
- Staggered content load (header → stats → achievements → history)

**Caching Strategy:**

- Public profiles: Redis 60s + Next.js ISR 60s
- Private profiles: Redis 10s + no ISR (always fresh)
- Owner viewing own profile: 5s cache (frequent updates)

---

#### 3. `/players/[id]/history` - Tournament History

**Purpose:** Paginated, filterable list of all tournaments played

**Route:** `/players/[id]/history?format=8ball&dateRange=2024&page=1`

**Server Component:** Hybrid (SSR initial, client-side pagination)

**Features:**

- Table view with sortable columns
- Filters: format, date range (presets + custom), venue
- Pagination (20 per page, cursor-based)
- Quick stats summary at top
- Export to CSV button

**Table Columns:**

- Tournament name (link to tournament)
- Date
- Format badge
- Placement (with medal icons for 1/2/3)
- Record (W-L)
- Win rate
- Prize amount (if applicable)

**Performance:**

- Initial load: <500ms
- Filter change: <200ms (cached)
- Page navigation: <150ms

---

#### 4. `/players/[id]/achievements` - Achievements Detail

**Purpose:** Full achievement grid with progress tracking

**Route:** `/players/[id]/achievements?category=performance`

**Client Component:** Yes (interactive, real-time updates)

**Features:**

- Achievement grid (4 columns desktop, 2 mobile)
- Filter by category (participation, performance, engagement, format)
- Filter by status (all, unlocked, in progress, locked)
- Sort by: rarity, date unlocked, points, alphabetical
- Achievement modal on click (detailed view)
- Share achievement button (social media)

**Achievement Card States:**

1. **Unlocked** - Full color, badge, unlock date
2. **In Progress** - Semi-transparent, progress bar, "X/Y completed"
3. **Locked** - Grayscale, lock icon
4. **Secret** - Question mark icon (hidden until unlocked)

**Modal Details:**

- Achievement name and description
- Badge icon (large)
- Rarity and points
- Unlock date (if unlocked)
- Progress breakdown (if in progress)
- Share buttons (Twitter, Facebook, copy link)

**Performance:**

- Grid render: <300ms
- Modal open: <100ms
- Real-time unlock: WebSocket notification

---

#### 5. `/players/[id]/stats` - Performance Analytics

**Purpose:** Detailed statistics with charts and trends

**Route:** `/players/[id]/stats?period=90d`

**Client Component:** Yes (charts require client-side rendering)

**Charts:**

1. **Win Rate Over Time** (line chart)
   - X-axis: Date (daily/weekly/monthly granularity based on zoom)
   - Y-axis: Win rate percentage
   - Period selector: 30d, 90d, 6m, 1y, All
   - Hover tooltip: "Aug 15: 68% win rate (12-6)"

2. **Rating Progression** (line chart)
   - X-axis: Date
   - Y-axis: Elo/Fargo rating
   - Shows rating floor/ceiling
   - Highlights tournament events (vertical lines)

3. **Tournament Frequency** (bar chart)
   - X-axis: Month
   - Y-axis: Number of tournaments
   - Shows activity trends

4. **Performance by Venue** (horizontal bar chart)
   - X-axis: Win rate
   - Y-axis: Venue names
   - Min 3 tournaments at venue to display

5. **Performance by Format** (donut chart)
   - Breakdown of win rate by format (8-ball, 9-ball, etc.)
   - Shows percentage of total matches per format

**Data Aggregation:**

- Stats calculated on-demand (not pre-computed)
- Cached for 5 minutes in Redis
- Query optimization with proper indexes

**Performance:**

- Chart library: Recharts (lightweight, React-native)
- Lazy load: Charts only render when tab is visible
- Initial render: <400ms per chart
- Interaction (zoom, filter): <100ms

**Export:**

- "Export Data" button → CSV download
- Includes all stats for selected period

---

#### 6. `/players/[id]/edit` - Profile Editing

**Purpose:** Edit profile information, privacy settings

**Route:** `/players/[id]/edit`

**Client Component:** Yes (form with optimistic updates)

**Authentication:** Owner only (redirect if not owner)

**Sections:**

1. **Profile Information**
   - Display name (text input, max 100 chars)
   - Bio (textarea, max 500 chars, character counter)
   - Location (city, state dropdowns)
   - Social links (Twitter, Instagram handles)

2. **Profile Photo**
   - Drag & drop upload zone
   - Click to browse file picker
   - Image preview before save
   - Crop tool (1:1 aspect ratio)
   - Max file size: 5MB
   - Accepted formats: JPG, PNG, WebP
   - "Remove Photo" button

3. **Privacy Settings**
   - Global toggle: "Public Profile" (on/off)
   - Granular checkboxes:
     - ☑ Show my statistics
     - ☑ Show my tournament history
     - ☑ Show my achievements
     - ☑ Allow head-to-head lookups
   - Info icons with tooltips explaining each setting
   - Note: "Tournament directors in your organization can always view your profile"

**Form Handling:**

- Auto-save on blur (debounced)
- Optimistic UI updates (instant feedback)
- Error handling with inline validation
- Success toast notification
- "Save" and "Cancel" buttons (sticky at bottom)

**Photo Upload Flow:**

1. User selects file
2. Client-side validation (size, format)
3. Show crop tool
4. User confirms crop
5. Upload to `/api/players/[id]/photo` (multipart)
6. Server processes: resize to 400x400, convert to WebP, upload to R2
7. Return URL
8. Update player profile record
9. Optimistic UI update (show new photo immediately)

**Performance:**

- Form field updates: <50ms (optimistic)
- Photo upload: <2s (for 5MB image)
- Save confirmation: <200ms

---

#### 7. `/players/[id]/vs/[opponentId]` - Head-to-Head

**Purpose:** Compare records against specific opponent

**Route:** `/players/[id]/vs/[opponentId]`

**Server Component:** Hybrid (SSR initial, client for search)

**Features:**

1. **Header**
   - Player 1 photo and name (left)
   - "vs." text (center)
   - Player 2 photo and name (right)

2. **Overall Record**
   - Large display: "Player 1: 12 | Player 2: 8"
   - Win rate percentages below each count
   - Visual indicator (green highlight for leader)

3. **Recent Matches** (last 10)
   - Table with columns:
     - Tournament name
     - Date
     - Winner
     - Score (e.g., "9-7")
     - Bracket round (e.g., "Winners Finals")
   - Expandable rows for match details

4. **Breakdown by Format**
   - If players have faced off in multiple formats
   - "8-Ball: Player 1 leads 7-4"
   - "9-Ball: Player 1 leads 5-4"

5. **Venue Breakdown** (if >1 venue)
   - "Main Street Billiards: Player 1 leads 8-3"
   - "Downtown Pool Hall: Player 2 leads 5-4"

6. **Actions**
   - "Share This Record" button (social media + copy link)
   - "View [Opponent]'s Profile" link
   - "Search Another Opponent" (autocomplete search box)

**Privacy:**

- Respects "Allow head-to-head lookups" setting
- If opponent has disabled H2H, show message: "This player has disabled head-to-head lookups"
- TDs can always view H2H in their organization

**Performance:**

- Query optimization: Single SQL query with JOINs
- Cached for 60s in Redis
- Initial load: <300ms

**Data Source:**

- Query `player_matches` table
- Filter: `(player1_id = A AND player2_id = B) OR (player1_id = B AND player2_id = A)`
- Aggregate: Count wins per player, group by format/venue

---

### Frontend Components

#### 1. `PlayerCard`

**Purpose:** Reusable player card for search results, leaderboards

**Props:**

```typescript
interface PlayerCardProps {
  playerId: string;
  displayName: string;
  photoUrl?: string;
  rating: number;
  ratingTrend: 'up' | 'down' | 'stable';
  totalTournaments: number;
  winRate: number;
  location?: {
    city: string;
    state: string;
  };
  onClick?: () => void;
}
```

**Layout:**

```
┌─────────────────────────────┐
│ ┌────────┐  John Smith      │
│ │ Photo  │  Rating: 1847 ↑  │
│ └────────┘  Phoenix, AZ     │
│                             │
│ 47 Tourneys | 68.4% W/R    │
└─────────────────────────────┘
```

**Features:**

- Hover effect (scale + shadow)
- Click to navigate to profile
- Skeleton loader state
- Responsive (mobile-friendly)

---

#### 2. `StatsOverview`

**Purpose:** Statistics dashboard component (used on profile page)

**Props:**

```typescript
interface StatsOverviewProps {
  statistics: {
    winRate: number;
    totalTournaments: number;
    totalMatches: number;
    totalWins: number;
    totalLosses: number;
    bestFinish: number;
    currentStreak: number; // positive = wins, negative = losses
    longestWinStreak: number;
    statsByFormat?: Record<string, { wins: number; losses: number }>;
  };
}
```

**Layout:**

```
┌──────────────────────────────────────────────┐
│ STATISTICS DASHBOARD                          │
│ ┌──────────────┬──────────────┬──────────────┐│
│ │ Win Rate     │ Tournaments  │ Best Finish  ││
│ │    68.4%     │     47       │     1st      ││
│ └──────────────┴──────────────┴──────────────┘│
│ ┌──────────────┬──────────────┬──────────────┐│
│ │ Total Record │ Matches      │ Current      ││
│ │   142-66     │     208      │   4 Win ↑    ││
│ └──────────────┴──────────────┴──────────────┘│
│                                                │
│ BY FORMAT                                      │
│ ┌────────────────────────────────────────────┐│
│ │ 8-Ball:  78-32  (70.9%)                    ││
│ │ 9-Ball:  54-28  (65.9%)                    ││
│ │ 10-Ball: 10-6   (62.5%)                    ││
│ └────────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

**Features:**

- Color-coded trends (green up, red down)
- Animated counters (count up on mount)
- Collapsible "By Format" section
- Skeleton loader for each stat card

---

#### 3. `AchievementBadge`

**Purpose:** Individual achievement display (badge + info)

**Props:**

```typescript
interface AchievementBadgeProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    category: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    iconUrl: string;
    points: number;
    isSecret: boolean;
  };
  status: 'unlocked' | 'in_progress' | 'locked';
  unlockedAt?: Date;
  progress?: {
    current: number;
    required: number;
  };
  onClick?: () => void;
}
```

**Visual States:**

1. **Unlocked:**
   - Full color icon
   - Shine/glow animation on mount
   - "Unlocked: Oct 27, 2024" text

2. **In Progress:**
   - Semi-transparent (60% opacity)
   - Progress bar overlay
   - "7/10 tournaments" text

3. **Locked:**
   - Grayscale filter
   - Lock icon overlay
   - No progress text

4. **Secret (locked):**
   - Question mark icon
   - "???" for name
   - "Unlock this to reveal" for description

**Rarity Colors:**

- Common: Gray (#9CA3AF)
- Uncommon: Green (#10B981)
- Rare: Blue (#3B82F6)
- Epic: Purple (#8B5CF6)
- Legendary: Gold (#F59E0B)

---

#### 4. `AchievementGrid`

**Purpose:** Grid layout for all achievements with filtering

**Props:**

```typescript
interface AchievementGridProps {
  achievements: Achievement[];
  filter?: {
    category?: string;
    status?: 'all' | 'unlocked' | 'in_progress' | 'locked';
    sort?: 'rarity' | 'date' | 'points' | 'alphabetical';
  };
  onAchievementClick: (id: string) => void;
}
```

**Layout:**

- Grid: 4 columns (desktop), 2 columns (mobile)
- Gap: 1rem
- Responsive breakpoints

**Filtering:**

- Category dropdown (All, Participation, Performance, Engagement, Format)
- Status dropdown (All, Unlocked, In Progress, Locked)
- Sort dropdown (Rarity, Date Unlocked, Points, Alphabetical)
- Filters persist in URL query params

---

#### 5. `TournamentHistoryTable`

**Purpose:** Paginated table of tournament history

**Props:**

```typescript
interface TournamentHistoryTableProps {
  history: TournamentHistoryEntry[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  filters?: {
    format?: string;
    dateRange?: { start: Date; end: Date };
    venue?: string;
  };
  onFilterChange: (filters: any) => void;
}
```

**Columns:**

- Tournament Name (link)
- Date (formatted: "Nov 2, 2024")
- Format (badge with icon)
- Placement (medal icon for top 3)
- Record (W-L format)
- Win Rate (%)
- Prize (if applicable)

**Features:**

- Sortable columns (click header to sort)
- Row hover effect
- Click row to navigate to tournament
- Mobile: Card view (stacked layout)

---

#### 6. `PerformanceChart`

**Purpose:** Reusable chart component for analytics

**Props:**

```typescript
interface PerformanceChartProps {
  type: 'line' | 'bar' | 'donut';
  data: any[];
  xAxisKey?: string;
  yAxisKey?: string;
  period?: '30d' | '90d' | '6m' | '1y' | 'all';
  onPeriodChange?: (period: string) => void;
}
```

**Features:**

- Built with Recharts library
- Responsive (resize listener)
- Tooltips with formatted data
- Legend
- Period selector (line charts only)
- Loading skeleton
- Export to CSV button

---

#### 7. `HeadToHeadRecord`

**Purpose:** H2H record display component

**Props:**

```typescript
interface HeadToHeadRecordProps {
  player1: {
    id: string;
    name: string;
    photoUrl?: string;
    wins: number;
    winRate: number;
  };
  player2: {
    id: string;
    name: string;
    photoUrl?: string;
    wins: number;
    winRate: number;
  };
  matches: Match[];
  breakdown?: {
    byFormat?: Record<string, { p1Wins: number; p2Wins: number }>;
    byVenue?: Record<string, { p1Wins: number; p2Wins: number }>;
  };
}
```

**Layout:**

- Side-by-side player info (responsive stacks on mobile)
- Large record display in center
- Match list below
- Expandable breakdowns (format, venue)

---

#### 8. `PlayerSearch`

**Purpose:** Search interface with autocomplete and filters

**Props:**

```typescript
interface PlayerSearchProps {
  onSearch: (query: string, filters: any) => void;
  filters?: {
    location?: string;
    skillLevel?: { min: number; max: number };
    tournamentsPlayed?: { min: number; max: number };
    winRate?: { min: number; max: number };
  };
  results?: PlayerCardProps[];
  loading?: boolean;
}
```

**Features:**

- Autocomplete dropdown (200ms debounce)
- Advanced filters (collapsible panel)
- Search history (local storage)
- Voice search (optional)
- Clear button
- Results count ("47 players found")

---

### Backend Services

#### 1. `PlayerProfileService`

**Purpose:** CRUD operations for player profiles

**Location:** `apps/api/services/PlayerProfileService.ts`

**Methods:**

```typescript
class PlayerProfileService {
  // Get profile by ID (with privacy check)
  async getProfile(
    profileId: string,
    viewerId: string,
    organizationId: string
  ): Promise<PlayerProfile | null>;

  // Create profile for new user
  async createProfile(
    userId: string,
    organizationId: string,
    data: Partial<PlayerProfile>
  ): Promise<PlayerProfile>;

  // Update profile (owner only)
  async updateProfile(
    profileId: string,
    ownerId: string,
    data: Partial<PlayerProfile>
  ): Promise<PlayerProfile>;

  // Delete profile (soft delete, anonymize)
  async deleteProfile(profileId: string, ownerId: string): Promise<void>;

  // Export profile data (GDPR compliance)
  async exportProfile(profileId: string, ownerId: string): Promise<PlayerProfileExport>;

  // Upload profile photo
  async uploadPhoto(profileId: string, file: File): Promise<string>; // Returns photo URL

  // Delete profile photo
  async deletePhoto(profileId: string): Promise<void>;

  // Check privacy permissions
  async canViewProfile(
    profileId: string,
    viewerId: string,
    organizationId: string
  ): Promise<boolean>;
}
```

**Privacy Logic:**

```typescript
function canViewProfile(profile, viewer, org): boolean {
  // Owner can always view own profile
  if (profile.userId === viewer.id) return true;

  // TDs in same org can always view
  if (viewer.role === 'TD' && profile.organizationId === org.id) return true;

  // Public profiles visible to all logged-in users
  if (profile.isPublic) return true;

  // Private profiles only visible to same org
  if (profile.organizationId === org.id) return true;

  // Otherwise, no access
  return false;
}
```

---

#### 2. `StatsCalculator`

**Purpose:** Real-time stat aggregation and calculation

**Location:** `apps/api/services/StatsCalculator.ts`

**Methods:**

```typescript
class StatsCalculator {
  // Calculate all stats for a player
  async calculateStats(playerId: string, organizationId: string): Promise<PlayerStatistics>;

  // Recalculate stats after tournament
  async recalculateStatsForTournament(tournamentId: string): Promise<void>;

  // Calculate win rate for period
  async calculateWinRate(playerId: string, period: { start: Date; end: Date }): Promise<number>;

  // Calculate current streak
  async calculateStreak(playerId: string): Promise<number>;

  // Get stats breakdown by format
  async getStatsByFormat(
    playerId: string
  ): Promise<Record<string, { wins: number; losses: number }>>;

  // Get performance trend over time
  async getPerformanceTrend(
    playerId: string,
    period: '30d' | '90d' | '6m' | '1y' | 'all'
  ): Promise<TrendData[]>;
}
```

**Calculation Logic:**

```typescript
// Win rate calculation
function calculateWinRate(wins: number, losses: number): number {
  const totalMatches = wins + losses;
  if (totalMatches === 0) return 0;
  return (wins / totalMatches) * 100;
}

// Streak calculation (from most recent match backwards)
function calculateStreak(matches: Match[]): number {
  if (matches.length === 0) return 0;

  const sortedMatches = matches.sort((a, b) => b.date - a.date);
  let streak = 0;
  let lastResult = sortedMatches[0].isWin;

  for (const match of sortedMatches) {
    if (match.isWin === lastResult) {
      streak += match.isWin ? 1 : -1;
    } else {
      break;
    }
  }

  return streak;
}

// Best finish calculation
function calculateBestFinish(history: TournamentHistory[]): number {
  if (history.length === 0) return null;
  return Math.min(...history.map((t) => t.placement));
}

// Average finish calculation
function calculateAverageFinish(history: TournamentHistory[]): number {
  if (history.length === 0) return null;
  const sum = history.reduce((acc, t) => acc + t.placement, 0);
  return sum / history.length;
}
```

**Performance Optimization:**

- Use database aggregation functions (COUNT, SUM, AVG) where possible
- Cache results in Redis (5min TTL)
- Only recalculate when tournament finalizes (not per match)
- Use generated columns for frequently accessed calculations (win_rate)

---

#### 3. `AchievementEngine`

**Purpose:** Achievement unlock detection and processing

**Location:** `apps/api/services/AchievementEngine.ts`

**Methods:**

```typescript
class AchievementEngine {
  // Check all achievements for a player
  async checkAchievements(
    playerId: string,
    organizationId: string,
    tournamentId?: string
  ): Promise<Achievement[]>; // Returns newly unlocked achievements

  // Evaluate specific achievement criteria
  async evaluateCriteria(
    criteria: AchievementCriteria,
    playerStats: PlayerStatistics
  ): Promise<boolean>;

  // Unlock achievement for player
  async unlockAchievement(
    playerId: string,
    achievementId: string,
    tournamentId?: string
  ): Promise<void>;

  // Update achievement progress
  async updateProgress(playerId: string, achievementId: string, progress: any): Promise<void>;

  // Get all achievements with unlock status for player
  async getPlayerAchievements(playerId: string): Promise<PlayerAchievement[]>;
}
```

**Criteria Evaluation Examples:**

```typescript
// Tournament count achievement
{
  type: 'tournament_count',
  count: 10
}
→ Check: player_statistics.total_tournaments >= 10

// Tournament wins achievement
{
  type: 'tournament_wins',
  count: 5
}
→ Check: player_statistics.tournament_wins >= 5

// Consecutive wins achievement
{
  type: 'consecutive_wins',
  count: 3
}
→ Check: Query last N tournament placements, check for 3 consecutive 1st places

// Win rate achievement
{
  type: 'win_rate',
  threshold: 0.9,
  min_matches: 10
}
→ Check: player_statistics.total_matches >= 10 AND player_statistics.win_rate >= 90

// Format mastery achievement
{
  type: 'format_wins',
  format: '8-ball',
  count: 10
}
→ Check: Count tournaments won in '8-ball' format >= 10

// Underdog achievement
{
  type: 'underdog_win',
  count: 1
}
→ Check: Query tournaments where player was lowest seed and finished 1st
```

**Background Job Flow:**

```typescript
// Vercel Cron job (runs after tournament finalization)
export async function processAchievements(tournamentId: string) {
  // Get all players in tournament
  const players = await getPlayersInTournament(tournamentId);

  for (const player of players) {
    // Check achievements for this player
    const unlockedAchievements = await achievementEngine.checkAchievements(
      player.id,
      player.organizationId,
      tournamentId
    );

    // Send notifications for newly unlocked achievements
    if (unlockedAchievements.length > 0) {
      await notificationService.sendAchievementUnlock(player.userId, unlockedAchievements);

      // Invalidate cache
      await redis.del(`player:${player.id}:achievements`);
    }
  }
}
```

---

#### 4. `HistoryService`

**Purpose:** Tournament history queries and filtering

**Location:** `apps/api/services/HistoryService.ts`

**Methods:**

```typescript
class HistoryService {
  // Get paginated tournament history
  async getHistory(
    playerId: string,
    options: {
      page: number;
      limit: number;
      format?: string;
      dateRange?: { start: Date; end: Date };
      venue?: string;
      sortBy?: 'date' | 'placement' | 'winRate';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    history: TournamentHistoryEntry[];
    totalCount: number;
    page: number;
    pageSize: number;
  }>;

  // Get tournament history for export (CSV)
  async exportHistory(playerId: string): Promise<string>; // CSV string

  // Add tournament to player history (called on tournament finalization)
  async addTournamentToHistory(
    playerId: string,
    tournamentId: string,
    placement: number,
    wins: number,
    losses: number,
    ratingBefore: number,
    ratingAfter: number
  ): Promise<void>;
}
```

**Query Optimization:**

```sql
-- Use denormalized table for fast queries (no JOINs)
SELECT * FROM player_tournament_history
WHERE player_profile_id = $1
  AND organization_id = $2
  AND ($3::text IS NULL OR tournament_format = $3) -- format filter
  AND ($4::date IS NULL OR tournament_date >= $4) -- date range start
  AND ($5::date IS NULL OR tournament_date <= $5) -- date range end
  AND ($6::uuid IS NULL OR venue_id = $6) -- venue filter
ORDER BY tournament_date DESC
LIMIT $7 OFFSET $8;
```

**Indexing:**

```sql
CREATE INDEX idx_player_history_filters ON player_tournament_history (
  player_profile_id,
  organization_id,
  tournament_format,
  tournament_date DESC
);
```

---

#### 5. `HeadToHeadService`

**Purpose:** Calculate opponent records and match history

**Location:** `apps/api/services/HeadToHeadService.ts`

**Methods:**

```typescript
class HeadToHeadService {
  // Get head-to-head record vs opponent
  async getHeadToHead(
    playerId: string,
    opponentId: string,
    organizationId: string
  ): Promise<HeadToHeadRecord>;

  // Get recent matches vs opponent
  async getRecentMatches(
    playerId: string,
    opponentId: string,
    limit: number = 10
  ): Promise<Match[]>;

  // Get H2H breakdown by format
  async getBreakdownByFormat(
    playerId: string,
    opponentId: string
  ): Promise<Record<string, { playerWins: number; opponentWins: number }>>;

  // Get H2H breakdown by venue
  async getBreakdownByVenue(
    playerId: string,
    opponentId: string
  ): Promise<Record<string, { playerWins: number; opponentWins: number }>>;

  // Record match for H2H tracking (called on match completion)
  async recordMatch(
    player1Id: string,
    player2Id: string,
    winnerId: string,
    tournamentId: string,
    matchDate: Date,
    player1Score: number,
    player2Score: number,
    format: string,
    venueId?: string,
    bracketRound?: string
  ): Promise<void>;
}
```

**Privacy Check:**

```typescript
async function getHeadToHead(playerId, opponentId, orgId) {
  // Check if opponent allows H2H lookups
  const opponentProfile = await getProfile(opponentId);
  if (!opponentProfile.allowHeadToHead) {
    throw new Error('This player has disabled head-to-head lookups');
  }

  // Query matches
  const matches = await db.query(
    `
    SELECT * FROM player_matches
    WHERE organization_id = $1
      AND (
        (player1_profile_id = $2 AND player2_profile_id = $3)
        OR (player1_profile_id = $3 AND player2_profile_id = $2)
      )
    ORDER BY match_date DESC
  `,
    [orgId, playerId, opponentId]
  );

  // Aggregate wins
  const playerWins = matches.filter((m) => m.winner_profile_id === playerId).length;
  const opponentWins = matches.filter((m) => m.winner_profile_id === opponentId).length;

  return {
    player: { id: playerId, wins: playerWins },
    opponent: { id: opponentId, wins: opponentWins },
    matches,
  };
}
```

---

#### 6. `SearchService`

**Purpose:** Player search with filters and autocomplete

**Location:** `apps/api/services/SearchService.ts`

**Methods:**

```typescript
class SearchService {
  // Search players with filters
  async searchPlayers(
    query: string,
    organizationId: string,
    filters: {
      location?: { city?: string; state?: string };
      skillLevel?: { min: number; max: number };
      tournamentsPlayed?: { min: number; max: number };
      winRate?: { min: number; max: number };
    },
    options: {
      page: number;
      limit: number;
      sortBy?: 'rating' | 'tournaments' | 'winRate';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    players: PlayerCard[];
    totalCount: number;
  }>;

  // Autocomplete for player names
  async autocomplete(
    query: string,
    organizationId: string,
    limit: number = 10
  ): Promise<PlayerSuggestion[]>;

  // Get recent opponents (for H2H search)
  async getRecentOpponents(playerId: string, limit: number = 10): Promise<PlayerSuggestion[]>;
}
```

**Search Query:**

```sql
-- Full-text search with filters
SELECT
  pp.id,
  pp.display_name,
  pp.profile_photo_url,
  pp.location_city,
  pp.location_state,
  ps.current_rating,
  ps.total_tournaments,
  ps.win_rate
FROM player_profiles pp
JOIN player_statistics ps ON ps.player_profile_id = pp.id
WHERE pp.organization_id = $1
  AND pp.is_public = true -- Privacy filter
  AND (
    $2::text IS NULL
    OR pp.display_name ILIKE '%' || $2 || '%'
  )
  AND ($3::int IS NULL OR ps.current_rating >= $3) -- skill min
  AND ($4::int IS NULL OR ps.current_rating <= $4) -- skill max
  AND ($5::int IS NULL OR ps.total_tournaments >= $5) -- tournaments min
  AND ($6::decimal IS NULL OR ps.win_rate >= $6) -- win rate min
ORDER BY
  CASE
    WHEN $7 = 'rating' THEN ps.current_rating
    WHEN $7 = 'tournaments' THEN ps.total_tournaments
    WHEN $7 = 'winRate' THEN ps.win_rate
    ELSE ps.current_rating
  END DESC
LIMIT $8 OFFSET $9;
```

**Autocomplete Query:**

```sql
-- Fast autocomplete with trigram similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_player_name_trgm ON player_profiles
USING gin (display_name gin_trgm_ops);

SELECT
  id,
  display_name,
  profile_photo_url,
  current_rating
FROM player_profiles pp
JOIN player_statistics ps ON ps.player_profile_id = pp.id
WHERE pp.organization_id = $1
  AND pp.display_name ILIKE $2 || '%'
ORDER BY similarity(pp.display_name, $2) DESC
LIMIT 10;
```

**Caching Strategy:**

- Cache autocomplete results for 60s (low volatility)
- Cache search results for 30s (medium volatility)
- Invalidate on profile creation/update

---

#### 7. `PrivacyService`

**Purpose:** Privacy settings enforcement

**Location:** `apps/api/services/PrivacyService.ts`

**Methods:**

```typescript
class PrivacyService {
  // Get privacy settings for player
  async getPrivacySettings(profileId: string): Promise<PrivacySettings>;

  // Update privacy settings (owner only)
  async updatePrivacySettings(
    profileId: string,
    ownerId: string,
    settings: Partial<PrivacySettings>
  ): Promise<PrivacySettings>;

  // Check if viewer can see specific data
  async canViewStatistics(profileId: string, viewerId: string): Promise<boolean>;

  async canViewTournamentHistory(profileId: string, viewerId: string): Promise<boolean>;

  async canViewAchievements(profileId: string, viewerId: string): Promise<boolean>;

  async canPerformHeadToHead(profileId: string, viewerId: string): Promise<boolean>;

  // Apply privacy filters to profile data
  async applyPrivacyFilters(profile: PlayerProfile, viewerId: string): Promise<PlayerProfile>; // Returns filtered profile
}
```

**Privacy Matrix:**

| Data Type                     | Public Profile                  | Private Profile (Same Org)      | Private Profile (Different Org) | Owner | TD (Same Org) |
| ----------------------------- | ------------------------------- | ------------------------------- | ------------------------------- | ----- | ------------- |
| Basic Info (name, photo, bio) | ✅                              | ✅                              | ❌                              | ✅    | ✅            |
| Statistics                    | ✅ (if show_statistics)         | ✅ (if show_statistics)         | ❌                              | ✅    | ✅            |
| Tournament History            | ✅ (if show_tournament_history) | ✅ (if show_tournament_history) | ❌                              | ✅    | ✅            |
| Achievements                  | ✅ (if show_achievements)       | ✅ (if show_achievements)       | ❌                              | ✅    | ✅            |
| Head-to-Head                  | ✅ (if allow_head_to_head)      | ✅ (if allow_head_to_head)      | ❌                              | ✅    | ✅            |

**Default Settings:**

- `is_public`: false (private by default)
- `show_statistics`: true
- `show_tournament_history`: true
- `show_achievements`: true
- `allow_head_to_head`: true

---

## Data Model

### New Database Tables

#### Table 1: `player_profiles`

**Purpose:** Store player profile information and privacy settings

```sql
CREATE TABLE player_profiles (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Profile Information
  display_name VARCHAR(255) NOT NULL,
  bio TEXT CHECK (LENGTH(bio) <= 500),
  photo_url VARCHAR(500),

  -- Location
  location_city VARCHAR(100),
  location_state VARCHAR(50),
  location_country VARCHAR(50) DEFAULT 'USA',

  -- Skill Ratings
  fargo_rating INTEGER,
  elo_rating INTEGER DEFAULT 1500,

  -- Privacy Settings
  privacy_level VARCHAR(20) DEFAULT 'private' CHECK (privacy_level IN ('public', 'private')),
  show_tournaments BOOLEAN DEFAULT true,
  show_stats BOOLEAN DEFAULT true,
  show_achievements BOOLEAN DEFAULT true,
  allow_head_to_head BOOLEAN DEFAULT true,

  -- Social Links (JSONB for flexibility)
  social_links JSONB DEFAULT '{}',
  -- Example: {"twitter": "@username", "instagram": "username"}

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, tenant_id)
);

-- Indexes
CREATE INDEX idx_player_profiles_user ON player_profiles(user_id);
CREATE INDEX idx_player_profiles_tenant ON player_profiles(tenant_id);
CREATE INDEX idx_player_profiles_name ON player_profiles(tenant_id, display_name);
CREATE INDEX idx_player_profiles_public ON player_profiles(tenant_id, privacy_level) WHERE privacy_level = 'public';

-- Trigger for updated_at
CREATE TRIGGER update_player_profiles_updated_at
  BEFORE UPDATE ON player_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Relationships:**

- `user_id` → `users(id)` (one-to-one)
- `tenant_id` → `organizations(id)` (many-to-one)

**Row-Level Security (RLS):**

```sql
-- Enable RLS
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own profile
CREATE POLICY player_profiles_select_own ON player_profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can update own profile
CREATE POLICY player_profiles_update_own ON player_profiles
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can view public profiles in same tenant
CREATE POLICY player_profiles_select_public ON player_profiles
  FOR SELECT
  USING (
    privacy_level = 'public'
    AND tenant_id = current_tenant_id()
  );

-- Policy: TDs can view all profiles in their tenant
CREATE POLICY player_profiles_select_td ON player_profiles
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'TD'
  );
```

---

#### Table 2: `player_statistics`

**Purpose:** Aggregated player statistics (updated on tournament completion)

```sql
CREATE TABLE player_statistics (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE UNIQUE,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Overall Stats
  total_tournaments INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,

  -- Win Rate (generated column)
  win_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN total_matches > 0
      THEN (matches_won::DECIMAL / total_matches::DECIMAL * 100)
      ELSE 0
    END
  ) STORED,

  -- Tournament Stats
  tournaments_won INTEGER DEFAULT 0,
  avg_finish_position DECIMAL(5,2),
  best_finish_position INTEGER,

  -- Streak Stats
  current_win_streak INTEGER DEFAULT 0,
  current_loss_streak INTEGER DEFAULT 0,
  longest_win_streak INTEGER DEFAULT 0,

  -- Financial
  prize_winnings DECIMAL(10,2) DEFAULT 0,

  -- Format Breakdown (JSONB)
  stats_by_format JSONB DEFAULT '{}',
  -- Example: {"8-ball": {"wins": 78, "losses": 32}, "9-ball": {"wins": 54, "losses": 28}}

  -- Metadata
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(player_id, tenant_id)
);

-- Indexes
CREATE INDEX idx_player_stats_tenant ON player_statistics(tenant_id);
CREATE INDEX idx_player_stats_win_rate ON player_statistics(tenant_id, win_rate DESC);
CREATE INDEX idx_player_stats_tournaments ON player_statistics(tenant_id, total_tournaments DESC);
CREATE INDEX idx_player_stats_format ON player_statistics USING gin(stats_by_format);

-- Trigger for updated_at
CREATE TRIGGER update_player_stats_updated_at
  BEFORE UPDATE ON player_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Relationships:**

- `player_id` → `player_profiles(id)` (one-to-one)
- `tenant_id` → `organizations(id)` (many-to-one)

**Sample Data:**

```json
{
  "player_id": "uuid-123",
  "total_tournaments": 47,
  "total_matches": 208,
  "matches_won": 142,
  "matches_lost": 66,
  "win_rate": 68.27, // Auto-calculated
  "tournaments_won": 12,
  "avg_finish_position": 8.3,
  "best_finish_position": 1,
  "current_win_streak": 4,
  "longest_win_streak": 12,
  "stats_by_format": {
    "8-ball": { "wins": 78, "losses": 32 },
    "9-ball": { "wins": 54, "losses": 28 },
    "10-ball": { "wins": 10, "losses": 6 }
  }
}
```

---

#### Table 3: `player_tournament_history`

**Purpose:** Denormalized tournament history for fast queries (no JOINs)

```sql
CREATE TABLE player_tournament_history (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,

  -- Tournament Info (denormalized)
  tournament_name VARCHAR(255) NOT NULL,
  tournament_date DATE NOT NULL,
  tournament_format VARCHAR(50),
  venue_name VARCHAR(255),

  -- Player Performance
  placement INTEGER NOT NULL,
  total_players INTEGER,
  matches_played INTEGER NOT NULL,
  matches_won INTEGER NOT NULL,
  matches_lost INTEGER NOT NULL,
  win_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN matches_played > 0
      THEN (matches_won::DECIMAL / matches_played::DECIMAL * 100)
      ELSE 0
    END
  ) STORED,
  prize_amount DECIMAL(10,2),

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(player_id, tournament_id)
);

-- Indexes
CREATE INDEX idx_player_history_player ON player_tournament_history(player_id, tournament_date DESC);
CREATE INDEX idx_player_history_tenant ON player_tournament_history(tenant_id);
CREATE INDEX idx_player_history_format ON player_tournament_history(player_id, tournament_format);
CREATE INDEX idx_player_history_date ON player_tournament_history(tournament_date DESC);
```

**Relationships:**

- `player_id` → `player_profiles(id)` (many-to-one)
- `tournament_id` → `tournaments(id)` (many-to-one)
- `tenant_id` → `organizations(id)` (many-to-one)

**Why Denormalized:**

- Avoids JOINs with `tournaments` and `venues` tables
- Tournament name/date/format rarely change (safe to denormalize)
- Much faster queries for pagination and filtering
- Trade-off: Slightly more storage, but significant performance gain

---

#### Table 4: `achievements`

**Purpose:** Achievement definitions (seeded data, 20 achievements)

```sql
CREATE TABLE achievements (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Achievement Definition
  slug VARCHAR(100) NOT NULL UNIQUE, -- e.g., "first_steps", "champion", "dynasty"
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'participation',
    'performance',
    'engagement',
    'format_mastery'
  )),
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN (
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary'
  )),
  icon_url VARCHAR(500),
  points INTEGER NOT NULL,

  -- Unlock Criteria (JSONB for flexibility)
  unlock_criteria JSONB NOT NULL,
  -- Examples:
  -- {"type": "tournament_count", "count": 10}
  -- {"type": "tournament_wins", "count": 5}
  -- {"type": "consecutive_wins", "count": 3}
  -- {"type": "win_rate", "threshold": 0.9, "min_matches": 10}

  -- Visibility
  is_secret BOOLEAN DEFAULT false,

  -- Display Order
  sort_order INTEGER,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_achievements_category ON achievements(category, sort_order);
CREATE INDEX idx_achievements_rarity ON achievements(rarity);
CREATE INDEX idx_achievements_slug ON achievements(slug);
```

**Relationships:** None (static reference data)

**Sample Data:**

```sql
INSERT INTO achievements (slug, name, description, category, rarity, points, unlock_criteria, sort_order) VALUES
('first_steps', 'First Steps', 'Complete your first tournament', 'participation', 'common', 10, '{"type": "tournament_count", "count": 1}', 1),
('winner', 'Winner', 'Win your first tournament', 'performance', 'common', 25, '{"type": "tournament_wins", "count": 1}', 2),
('champion', 'Champion', 'Win 10 tournaments', 'performance', 'uncommon', 100, '{"type": "tournament_wins", "count": 10}', 3),
('dynasty', 'Dynasty', 'Win 3 consecutive tournaments', 'performance', 'legendary', 250, '{"type": "consecutive_wins", "count": 3}', 4);
-- ... 16 more
```

---

#### Table 5: `player_achievements`

**Purpose:** Track player achievement unlocks and progress

```sql
CREATE TABLE player_achievements (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Progress Tracking
  progress JSONB DEFAULT '{}',
  -- Examples:
  -- {"current": 7, "required": 10} -- For "play 10 tournaments"
  -- {"current": 2, "required": 3} -- For "win 3 consecutive tournaments"

  -- Unlock Info
  unlocked_at TIMESTAMP,
  is_unlocked BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(player_id, achievement_id)
);

-- Indexes
CREATE INDEX idx_player_achievements_player ON player_achievements(player_id, is_unlocked, unlocked_at DESC);
CREATE INDEX idx_player_achievements_achievement ON player_achievements(achievement_id);
CREATE INDEX idx_player_achievements_unlocked ON player_achievements(is_unlocked, unlocked_at DESC);
CREATE INDEX idx_player_achievements_progress ON player_achievements USING gin(progress);
```

**Relationships:**

- `player_id` → `player_profiles(id)` (many-to-one)
- `achievement_id` → `achievements(id)` (many-to-one)
- `tenant_id` → `organizations(id)` (many-to-one)

**Sample Data:**

```json
{
  "player_id": "uuid-123",
  "achievement_id": "uuid-456",
  "is_unlocked": true,
  "unlocked_at": "2024-10-27T18:30:00Z",
  "progress": {
    "current": 10,
    "required": 10
  }
}
```

---

#### Table 6: `player_matches`

**Purpose:** Match-level data for head-to-head tracking

```sql
CREATE TABLE player_matches (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,

  -- Match Details
  match_date DATE NOT NULL,
  is_winner BOOLEAN NOT NULL,
  player_score INTEGER,
  opponent_score INTEGER,
  format VARCHAR(50),
  venue_name VARCHAR(255),

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (player_id != opponent_id)
);

-- Indexes
CREATE INDEX idx_player_matches_player ON player_matches(player_id, match_date DESC);
CREATE INDEX idx_player_matches_opponent ON player_matches(player_id, opponent_id);
CREATE INDEX idx_player_matches_h2h ON player_matches(player_id, opponent_id, match_date DESC);
CREATE INDEX idx_player_matches_tenant ON player_matches(tenant_id);
```

**Relationships:**

- `player_id` → `player_profiles(id)` (many-to-one)
- `opponent_id` → `player_profiles(id)` (many-to-one)
- `match_id` → `matches(id)` (one-to-one)
- `tournament_id` → `tournaments(id)` (many-to-one)
- `tenant_id` → `organizations(id)` (many-to-one)

**Why Two Rows Per Match:**

- Insert 2 rows per match (one for each player)
- Makes H2H queries much simpler (no complex ORs)
- Allows easy filtering by player_id

**Sample Data:**

```json
// Match: Player A (9) vs Player B (7)
// Row 1 (Player A's perspective):
{
  "player_id": "uuid-player-a",
  "opponent_id": "uuid-player-b",
  "is_winner": true,
  "player_score": 9,
  "opponent_score": 7
}

// Row 2 (Player B's perspective):
{
  "player_id": "uuid-player-b",
  "opponent_id": "uuid-player-a",
  "is_winner": false,
  "player_score": 7,
  "opponent_score": 9
}
```

---

#### Table 7: `player_rating_history`

**Purpose:** Track rating changes over time for trend charts

```sql
CREATE TABLE player_rating_history (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Rating Data
  rating_type VARCHAR(20) NOT NULL CHECK (rating_type IN ('elo', 'fargo')),
  rating INTEGER NOT NULL,
  change INTEGER,

  -- Context
  reason VARCHAR(50), -- 'tournament_win', 'match_win', 'manual_update'
  tournament_id UUID REFERENCES tournaments(id),

  -- Timestamp
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rating_history_player ON player_rating_history(player_id, rating_type, recorded_at DESC);
CREATE INDEX idx_rating_history_tenant ON player_rating_history(tenant_id);
```

**Relationships:**

- `player_id` → `player_profiles(id)` (many-to-one)
- `tournament_id` → `tournaments(id)` (many-to-one)
- `tenant_id` → `organizations(id)` (many-to-one)

**Sample Data:**

```json
{
  "player_id": "uuid-123",
  "rating_type": "elo",
  "rating": 1847,
  "change": +23,
  "reason": "tournament_win",
  "tournament_id": "uuid-tournament-456",
  "recorded_at": "2024-11-02T20:00:00Z"
}
```

---

### Database Migration Plan

**Migration File:** `migrations/YYYYMMDDHHMMSS_create_player_profiles_system.sql`

**Order of Execution:**

1. Create `player_profiles` table
2. Create `player_statistics` table
3. Create `player_tournament_history` table
4. Create `achievements` table
5. Create `player_achievements` table
6. Create `player_matches` table
7. Create `player_rating_history` table
8. Create indexes
9. Create RLS policies
10. Seed achievements data (20 achievements)

**Rollback Plan:**

- Down migration drops tables in reverse order
- Backfill script to populate from existing tournament data (if needed)

---

## API Design

### API Endpoints (Next.js App Router)

#### Profile Routes

**1. GET /api/players?search=name&limit=20&offset=0**

**Purpose:** Search/browse players

**Query Params:**

- `search` (string, optional): Search query
- `skill_min` (number, optional): Minimum rating
- `skill_max` (number, optional): Maximum rating
- `tournaments_min` (number, optional): Minimum tournaments played
- `location` (string, optional): City or state
- `limit` (number, default: 20, max: 100)
- `offset` (number, default: 0)
- `sort_by` (string, default: 'rating'): 'rating' | 'tournaments' | 'winRate'
- `sort_order` (string, default: 'desc'): 'asc' | 'desc'

**Response (200 OK):**

```json
{
  "players": [
    {
      "id": "uuid-123",
      "displayName": "John Smith",
      "photoUrl": "https://cdn.example.com/photos/uuid-123.webp",
      "location": {
        "city": "Phoenix",
        "state": "AZ"
      },
      "rating": 1847,
      "ratingTrend": "up",
      "totalTournaments": 47,
      "winRate": 68.4
    }
  ],
  "totalCount": 142,
  "page": 1,
  "pageSize": 20
}
```

**Error Responses:**

- `400 Bad Request`: Invalid query params
- `401 Unauthorized`: Not authenticated
- `429 Too Many Requests`: Rate limit exceeded

**Caching:** 30s

---

**2. GET /api/players/[id]**

**Purpose:** Get player profile

**Path Params:**

- `id` (string): Player profile ID

**Response (200 OK):**

```json
{
  "profile": {
    "id": "uuid-123",
    "userId": "uuid-user-456",
    "displayName": "John Smith",
    "bio": "Play hard, stay humble. 🎱",
    "photoUrl": "https://cdn.example.com/photos/uuid-123.webp",
    "location": {
      "city": "Phoenix",
      "state": "AZ"
    },
    "socialLinks": {
      "twitter": "@johnpool",
      "instagram": "johnpool"
    },
    "memberSince": "2024-01-15T00:00:00Z",
    "privacyLevel": "public"
  },
  "statistics": {
    "winRate": 68.4,
    "totalTournaments": 47,
    "totalMatches": 208,
    "matchesWon": 142,
    "matchesLost": 66,
    "tournamentsWon": 12,
    "bestFinish": 1,
    "avgFinish": 8.3,
    "currentWinStreak": 4,
    "longestWinStreak": 12,
    "prizeWinnings": 1250.0,
    "statsByFormat": {
      "8-ball": { "wins": 78, "losses": 32 },
      "9-ball": { "wins": 54, "losses": 28 },
      "10-ball": { "wins": 10, "losses": 6 }
    }
  },
  "achievements": {
    "total": 20,
    "unlocked": 8,
    "totalPoints": 550,
    "recentUnlocks": [
      {
        "id": "uuid-ach-1",
        "slug": "champion",
        "name": "Champion",
        "description": "Win 10 tournaments",
        "category": "performance",
        "rarity": "uncommon",
        "iconUrl": "https://cdn.example.com/icons/champion.svg",
        "points": 100,
        "unlockedAt": "2024-10-27T18:30:00Z"
      }
    ]
  },
  "recentHistory": [
    {
      "id": "uuid-history-1",
      "tournamentId": "uuid-tournament-1",
      "tournamentName": "Phoenix 8-Ball Championship",
      "tournamentDate": "2024-11-02",
      "format": "8-ball",
      "placement": 2,
      "matchesPlayed": 7,
      "matchesWon": 6,
      "matchesLost": 1,
      "winRate": 85.71,
      "prizeAmount": 150.0
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Profile is private and viewer doesn't have access
- `404 Not Found`: Player not found

**Caching:** 60s (public), 10s (private)

---

**3. PATCH /api/players/[id]**

**Purpose:** Update player profile (owner only)

**Path Params:**

- `id` (string): Player profile ID

**Request Body:**

```json
{
  "displayName": "John \"Rack Attack\" Smith",
  "bio": "Updated bio text",
  "location": {
    "city": "Phoenix",
    "state": "AZ"
  },
  "socialLinks": {
    "twitter": "@johnpool",
    "instagram": "johnpool"
  }
}
```

**Response (200 OK):**

```json
{
  "profile": {
    // Updated profile object
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid data (bio too long, invalid location, etc.)
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not profile owner
- `404 Not Found`: Player not found

**Validation:**

- `displayName`: Max 100 chars
- `bio`: Max 500 chars
- `location.city`: Max 100 chars
- `location.state`: Valid US state code

**Cache Invalidation:** Clear cache for this player

---

**4. DELETE /api/players/[id]**

**Purpose:** Delete player profile (owner only)

**Path Params:**

- `id` (string): Player profile ID

**Response (200 OK):**

```json
{
  "message": "Profile deleted successfully"
}
```

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not profile owner
- `404 Not Found`: Player not found

**Behavior:**

- Soft delete (set `deleted_at` timestamp)
- Anonymize data (keep stats for historical records)
- Remove photo from storage
- Clear all caches

---

#### Statistics Routes

**5. GET /api/players/[id]/stats**

**Purpose:** Get detailed statistics

**Path Params:**

- `id` (string): Player profile ID

**Query Params:**

- `period` (string, optional): '30d' | '90d' | '6m' | '1y' | 'all'

**Response (200 OK):**

```json
{
  "overall": {
    "winRate": 68.4,
    "totalTournaments": 47,
    "totalMatches": 208
    // ... (same as profile statistics)
  },
  "trends": {
    "winRateOverTime": [
      { "date": "2024-08", "winRate": 65.2 },
      { "date": "2024-09", "winRate": 68.1 },
      { "date": "2024-10", "winRate": 70.5 }
    ],
    "ratingProgression": [
      { "date": "2024-08-15", "rating": 1780 },
      { "date": "2024-09-12", "rating": 1820 },
      { "date": "2024-11-02", "rating": 1847 }
    ],
    "tournamentFrequency": [
      { "month": "2024-08", "count": 4 },
      { "month": "2024-09", "count": 5 },
      { "month": "2024-10", "count": 6 }
    ]
  },
  "breakdowns": {
    "byFormat": {
      "8-ball": { "wins": 78, "losses": 32, "winRate": 70.9 },
      "9-ball": { "wins": 54, "losses": 28, "winRate": 65.9 }
    },
    "byVenue": {
      "Main Street Billiards": { "wins": 42, "losses": 18, "winRate": 70.0 },
      "Downtown Pool Hall": { "wins": 36, "losses": 22, "winRate": 62.1 }
    }
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Cannot view stats (privacy setting)
- `404 Not Found`: Player not found

**Caching:** 5min

---

#### Tournament History Routes

**6. GET /api/players/[id]/history?limit=20&offset=0&format=8ball**

**Purpose:** Get paginated tournament history

**Path Params:**

- `id` (string): Player profile ID

**Query Params:**

- `limit` (number, default: 20, max: 100)
- `offset` (number, default: 0)
- `format` (string, optional): Filter by format
- `date_start` (string, optional): ISO date
- `date_end` (string, optional): ISO date
- `venue` (string, optional): Venue name
- `sort_by` (string, default: 'date'): 'date' | 'placement' | 'winRate'
- `sort_order` (string, default: 'desc'): 'asc' | 'desc'

**Response (200 OK):**

```json
{
  "history": [
    {
      "id": "uuid-history-1",
      "tournamentId": "uuid-tournament-1",
      "tournamentName": "Phoenix 8-Ball Championship",
      "tournamentDate": "2024-11-02",
      "format": "8-ball",
      "venueName": "Main Street Billiards",
      "placement": 2,
      "totalPlayers": 32,
      "matchesPlayed": 7,
      "matchesWon": 6,
      "matchesLost": 1,
      "winRate": 85.71,
      "prizeAmount": 150.0
    }
  ],
  "totalCount": 47,
  "page": 1,
  "pageSize": 20,
  "summary": {
    "totalTournaments": 47,
    "bestFinish": 1,
    "avgFinish": 8.3
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Cannot view history (privacy setting)
- `404 Not Found`: Player not found

**Caching:** 60s

---

#### Achievement Routes

**7. GET /api/players/[id]/achievements**

**Purpose:** Get all achievements with unlock status

**Path Params:**

- `id` (string): Player profile ID

**Query Params:**

- `category` (string, optional): Filter by category
- `status` (string, optional): 'all' | 'unlocked' | 'in_progress' | 'locked'

**Response (200 OK):**

```json
{
  "achievements": [
    {
      "achievement": {
        "id": "uuid-ach-1",
        "slug": "champion",
        "name": "Champion",
        "description": "Win 10 tournaments",
        "category": "performance",
        "rarity": "uncommon",
        "iconUrl": "https://cdn.example.com/icons/champion.svg",
        "points": 100,
        "isSecret": false
      },
      "status": "unlocked",
      "unlockedAt": "2024-10-27T18:30:00Z",
      "progress": {
        "current": 10,
        "required": 10
      }
    },
    {
      "achievement": {
        "id": "uuid-ach-2",
        "slug": "dynasty",
        "name": "Dynasty",
        "description": "Win 3 consecutive tournaments",
        "category": "performance",
        "rarity": "legendary",
        "iconUrl": "https://cdn.example.com/icons/dynasty.svg",
        "points": 250,
        "isSecret": false
      },
      "status": "in_progress",
      "unlockedAt": null,
      "progress": {
        "current": 2,
        "required": 3
      }
    }
  ],
  "summary": {
    "total": 20,
    "unlocked": 8,
    "inProgress": 5,
    "locked": 7,
    "totalPoints": 550
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Cannot view achievements (privacy setting)
- `404 Not Found`: Player not found

**Caching:** 60s (invalidated on unlock)

---

**8. POST /api/players/[id]/achievements/check**

**Purpose:** Trigger achievement check (internal, cron job only)

**Path Params:**

- `id` (string): Player profile ID

**Request Body:**

```json
{
  "tournamentId": "uuid-tournament-1"
}
```

**Response (200 OK):**

```json
{
  "newUnlocks": [
    {
      "achievementId": "uuid-ach-1",
      "name": "Champion",
      "unlockedAt": "2024-11-06T20:00:00Z"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized`: Not authenticated (requires internal API key)
- `404 Not Found`: Player not found

**Authentication:** Internal API key only (not exposed to clients)

---

#### Head-to-Head Routes

**9. GET /api/players/[id]/vs/[opponentId]**

**Purpose:** Get head-to-head record vs opponent

**Path Params:**

- `id` (string): Player profile ID
- `opponentId` (string): Opponent profile ID

**Response (200 OK):**

```json
{
  "player": {
    "id": "uuid-player-1",
    "displayName": "John Smith",
    "photoUrl": "https://cdn.example.com/photos/uuid-player-1.webp",
    "wins": 12,
    "winRate": 60.0
  },
  "opponent": {
    "id": "uuid-player-2",
    "displayName": "Mike Johnson",
    "photoUrl": "https://cdn.example.com/photos/uuid-player-2.webp",
    "wins": 8,
    "winRate": 40.0
  },
  "totalMatches": 20,
  "recentMatches": [
    {
      "id": "uuid-match-1",
      "tournamentId": "uuid-tournament-1",
      "tournamentName": "Phoenix 8-Ball Championship",
      "date": "2024-11-02",
      "winnerId": "uuid-player-1",
      "playerScore": 9,
      "opponentScore": 7,
      "format": "8-ball",
      "bracketRound": "Winners Finals"
    }
  ],
  "breakdownByFormat": {
    "8-ball": {
      "playerWins": 7,
      "opponentWins": 4,
      "playerWinRate": 63.6
    },
    "9-ball": {
      "playerWins": 5,
      "opponentWins": 4,
      "playerWinRate": 55.6
    }
  },
  "breakdownByVenue": {
    "Main Street Billiards": {
      "playerWins": 8,
      "opponentWins": 3,
      "playerWinRate": 72.7
    }
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Opponent has disabled H2H lookups
- `404 Not Found`: Player or opponent not found

**Caching:** 60s

---

#### Search Routes

**10. GET /api/players/search?q=john&skill_min=1200**

**Purpose:** Search players with filters

**Query Params:**

- `q` (string): Search query
- `skill_min` (number, optional): Minimum rating
- `skill_max` (number, optional): Maximum rating
- `tournaments_min` (number, optional): Minimum tournaments played
- `win_rate_min` (number, optional): Minimum win rate
- `location_city` (string, optional): City filter
- `location_state` (string, optional): State filter
- `limit` (number, default: 20, max: 100)
- `offset` (number, default: 0)

**Response:** Same as `GET /api/players`

**Caching:** 30s

---

#### Privacy Routes

**11. PATCH /api/players/[id]/privacy**

**Purpose:** Update privacy settings (owner only)

**Path Params:**

- `id` (string): Player profile ID

**Request Body:**

```json
{
  "privacyLevel": "public",
  "showTournaments": true,
  "showStats": true,
  "showAchievements": true,
  "allowHeadToHead": true
}
```

**Response (200 OK):**

```json
{
  "privacySettings": {
    "privacyLevel": "public",
    "showTournaments": true,
    "showStats": true,
    "showAchievements": true,
    "allowHeadToHead": true
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid privacy settings
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not profile owner
- `404 Not Found`: Player not found

**Cache Invalidation:** Clear cache for this player

---

#### Photo Upload Routes

**12. POST /api/players/[id]/photo**

**Purpose:** Upload profile photo (owner only)

**Path Params:**

- `id` (string): Player profile ID

**Request:** `multipart/form-data`

- `file` (File): Image file (max 5MB)

**Response (200 OK):**

```json
{
  "photoUrl": "https://cdn.example.com/photos/uuid-123.webp"
}
```

**Error Responses:**

- `400 Bad Request`: File too large, invalid format, etc.
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not profile owner
- `404 Not Found`: Player not found
- `413 Payload Too Large`: File exceeds 5MB

**Processing:**

1. Validate file (size, format)
2. Resize to 400x400 (Sharp)
3. Convert to WebP (80% quality)
4. Generate thumbnails: 200x200, 100x100
5. Upload to Cloudflare R2
6. Update player profile record
7. Return URLs

**Caching:** CDN cache for 1 year (immutable URLs with hash)

---

**13. DELETE /api/players/[id]/photo**

**Purpose:** Delete profile photo (owner only)

**Path Params:**

- `id` (string): Player profile ID

**Response (200 OK):**

```json
{
  "message": "Photo deleted successfully"
}
```

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not profile owner
- `404 Not Found`: Player not found

**Behavior:**

- Remove photo from R2 storage
- Set `photo_url` to NULL in database
- Clear CDN cache

---

## Implementation Plan

### Day 1: Database & Profile Pages

**Goal:** Set up database schema and basic profile pages

**Tasks:**

- [ ] Write database migration for all 7 tables
- [ ] Create indexes and RLS policies
- [ ] Seed achievements data (20 achievements)
- [ ] Create `PlayerProfileService` (CRUD operations)
- [ ] Create `/players/[id]` route (Server Component)
- [ ] Create `PlayerCard` component
- [ ] Create `StatsOverview` component
- [ ] Create `/players/[id]/edit` route
- [ ] Implement photo upload API route
- [ ] Test profile creation and viewing

**Deliverables:**

- ✅ Database schema fully migrated
- ✅ Basic profile page viewable
- ✅ Profile editing works
- ✅ Photo upload functional

**Estimated Effort:** 8 hours

---

### Day 2: Statistics & History

**Goal:** Build stats dashboard and tournament history

**Tasks:**

- [ ] Create `StatsCalculator` service
- [ ] Implement stats aggregation logic
- [ ] Create background job for stats recalculation
- [ ] Create `/api/players/[id]/stats` route
- [ ] Create `/players/[id]/history` route
- [ ] Create `TournamentHistoryTable` component
- [ ] Implement history pagination
- [ ] Add filters (format, date range)
- [ ] Create performance trend calculations
- [ ] Test stats accuracy with sample data

**Deliverables:**

- ✅ Stats dashboard displays correctly
- ✅ Tournament history paginated
- ✅ Stats auto-update after tournament
- ✅ Filters work as expected

**Estimated Effort:** 8 hours

---

### Day 3: Achievement System

**Goal:** Build achievement engine and UI

**Tasks:**

- [ ] Create `AchievementEngine` service
- [ ] Implement achievement criteria evaluation
- [ ] Create background job for achievement checks
- [ ] Create `/api/players/[id]/achievements` route
- [ ] Create `AchievementBadge` component
- [ ] Create `AchievementGrid` component
- [ ] Implement achievement unlock notifications (WebSocket)
- [ ] Create achievement modal
- [ ] Implement social sharing for achievements
- [ ] Test all 20 achievements unlock correctly

**Deliverables:**

- ✅ All 20 achievements defined and seeded
- ✅ Achievement unlock detection works
- ✅ Real-time notifications on unlock
- ✅ Achievement UI displays all states (unlocked, in progress, locked)
- ✅ Social sharing functional

**Estimated Effort:** 8 hours

---

### Day 4: H2H & Search

**Goal:** Build head-to-head and player search

**Tasks:**

- [ ] Create `HeadToHeadService` service
- [ ] Implement H2H record calculation
- [ ] Create `/api/players/[id]/vs/[opponentId]` route
- [ ] Create `/players/[id]/vs/[opponentId]` page
- [ ] Create `HeadToHeadRecord` component
- [ ] Create `SearchService` service
- [ ] Implement player search with autocomplete
- [ ] Create `/api/players/search` route
- [ ] Create `/players` directory page
- [ ] Create `PlayerSearch` component
- [ ] Implement privacy controls
- [ ] Test cross-tenant isolation

**Deliverables:**

- ✅ H2H records accurate
- ✅ Player search functional with filters
- ✅ Autocomplete works
- ✅ Privacy settings enforced
- ✅ Multi-tenant isolation verified

**Estimated Effort:** 8 hours

---

### Day 5: Testing & Polish

**Goal:** Test, fix bugs, optimize performance, soft launch

**Tasks:**

- [ ] Unit tests for all services
- [ ] Integration tests for API routes
- [ ] Privacy isolation tests
- [ ] Performance optimization (caching, indexes)
- [ ] Load testing (simulate 1000 concurrent users)
- [ ] Mobile responsiveness testing
- [ ] Achievement unlock testing (all 20)
- [ ] Photo upload testing (various sizes/formats)
- [ ] Bug fixes from testing
- [ ] Documentation (API docs, help articles)
- [ ] Soft launch to dev team
- [ ] Beta launch to select TDs (20% rollout)
- [ ] Monitor metrics and performance
- [ ] Full launch (100% rollout)
- [ ] Send announcement email
- [ ] Post on social media

**Deliverables:**

- ✅ All tests passing
- ✅ Performance targets met (<1s profile load)
- ✅ Zero critical bugs
- ✅ Feature fully launched
- ✅ Documentation complete

**Estimated Effort:** 8 hours

---

## Testing Strategy

### Unit Tests

**Backend Services:**

- `StatsCalculator`: Win rate, streak, average finish calculations
- `AchievementEngine`: Criteria evaluation for all 20 achievements
- `HeadToHeadService`: Record aggregation logic
- `PrivacyService`: Privacy permission checks
- `SearchService`: Query building with filters

**Frontend Components:**

- `PlayerCard`: Renders correctly with all props
- `StatsOverview`: Displays stats accurately
- `AchievementBadge`: All states (unlocked, in progress, locked, secret)
- `TournamentHistoryTable`: Pagination, sorting, filtering

**Test Coverage Target:** 80% minimum

---

### Integration Tests

**API Routes:**

- `GET /api/players/[id]`: Returns correct data, respects privacy
- `PATCH /api/players/[id]`: Updates profile, validates input
- `GET /api/players/[id]/achievements`: Returns achievements with correct unlock status
- `POST /api/players/[id]/achievements/check`: Unlocks achievements correctly
- `GET /api/players/[id]/vs/[opponentId]`: Calculates H2H record accurately

**Database:**

- Multi-tenant isolation: Players cannot see other orgs' data
- RLS policies: Users can only edit own profile
- Generated columns: Win rate auto-calculates
- Triggers: `updated_at` auto-updates

---

### Performance Tests

**Load Testing (Apache Bench or k6):**

- Simulate 1000 concurrent users viewing profiles
- Measure: p50, p95, p99 response times
- Target: <1s for p95

**Stress Testing:**

- Achievement check processing for 100 tournaments (3200 players)
- Measure: Job completion time, database load
- Target: <5 minutes total, no timeouts

**Database Query Performance:**

- Profile query: <50ms
- History query (paginated): <100ms
- H2H query: <100ms
- Stats calculation: <200ms
- Search query: <200ms

**Tooling:**

- k6 for load testing
- PostgreSQL EXPLAIN ANALYZE for query optimization
- New Relic or DataDog for APM

---

### Security & Privacy Tests

**Multi-Tenant Isolation:**

- User in Org A cannot view private profile in Org B
- User in Org A cannot search players in Org B
- User in Org A cannot perform H2H lookup on player in Org B

**Privacy Settings:**

- Private profile not visible to unauthenticated users
- Stats hidden when `show_stats = false`
- History hidden when `show_tournaments = false`
- H2H blocked when `allow_head_to_head = false`

**Authentication:**

- Cannot edit profile without being owner
- Cannot upload photo for another user
- Cannot delete another user's profile

**SQL Injection:**

- Test search query with malicious input
- Test filter params with SQL injection attempts

**CSRF Protection:**

- All POST/PATCH/DELETE routes protected with CSRF tokens

---

### User Acceptance Testing (UAT)

**Beta Testers:**

- 10 TDs (tournament directors)
- 20 competitive players
- 5 casual players

**Test Scenarios:**

1. **Profile Creation:** Create profile, add photo, write bio
2. **View Stats:** Check stats accuracy vs. manual calculations
3. **Achievement Unlock:** Win tournament, verify achievement unlocks
4. **H2H Lookup:** Search opponent, verify record matches
5. **Privacy:** Set profile to private, verify not visible to public
6. **Search:** Search for players by name, location, skill level
7. **Mobile:** Test all features on iPhone and Android

**Feedback Collection:**

- Post-test survey (1-10 rating, open-ended feedback)
- Bug reports via dedicated channel
- Feature requests logged

**Success Criteria:**

- 80% of testers rate 8/10 or higher
- <5 critical bugs reported
- Zero data privacy breaches

---

## Deployment & Operations

### Deployment Strategy

**Environment Progression:**

1. **Dev:** Developers test locally
2. **Staging:** QA team tests with production-like data
3. **Production (Soft Launch):** 5% of users (feature flag)
4. **Production (Beta):** 20% of users (feature flag)
5. **Production (Full):** 100% of users

**Feature Flags:**

```typescript
const FEATURE_FLAGS = {
  playerProfiles: {
    enabled: true,
    rolloutPercentage: 100, // Start at 5%, increase to 20%, then 100%
    allowlist: ['org-uuid-1', 'org-uuid-2'], // Beta organizations
  },
};
```

**Deployment Steps:**

1. Deploy database migration (via CI/CD)
2. Deploy backend API routes (zero-downtime)
3. Deploy frontend pages (incremental static regeneration)
4. Enable feature flag for 5% (soft launch)
5. Monitor for 24 hours
6. Increase to 20% (beta launch)
7. Monitor for 48 hours
8. Full rollout to 100%

**Rollback Plan:**

- Feature flag: Instant disable (set `enabled: false`)
- Database: Run down migration (if critical issue)
- Code: Revert Git commit, re-deploy previous version

---

### Monitoring & Alerts

**Metrics to Track:**

**Application Metrics:**

- Profile page load time (p50, p95, p99)
- API response time per endpoint
- Achievement check processing time
- Photo upload success rate
- Cache hit rate (Redis)

**Business Metrics:**

- Profile view count (daily)
- Profile edit count (daily)
- Achievement unlock count (daily, per achievement)
- H2H lookup count (daily)
- Player search count (daily)
- Photo upload count (daily)

**Error Metrics:**

- API error rate (per endpoint)
- Database query errors
- Photo upload failures
- Achievement check failures
- Cache failures

**Alerts:**

**Critical (Page On-Call):**

- API error rate > 5% for 5 minutes
- Database connection pool exhausted
- Redis cache down
- Photo upload service down

**Warning (Slack Notification):**

- API response time p95 > 2s for 10 minutes
- Achievement check queue backed up > 100 jobs
- Profile page load time > 1.5s for 10 minutes
- Disk space > 80%

**Tooling:**

- Application Monitoring: New Relic or DataDog
- Error Tracking: Sentry
- Logs: CloudWatch or Logtail
- Uptime: Pingdom or UptimeRobot

---

### Rollback Plan

**Scenarios:**

**1. Critical Bug (Data Corruption):**

- Disable feature flag immediately
- Identify affected users
- Run data fix script
- Test fix in staging
- Re-enable feature flag

**2. Performance Degradation:**

- Increase cache TTL temporarily
- Add database indexes (if missing)
- Scale up database (if needed)
- Optimize slow queries

**3. Privacy Breach:**

- Disable feature flag immediately
- Audit access logs
- Notify affected users
- Fix privacy logic
- Security review before re-enable

**4. Database Migration Issue:**

- If migration fails mid-way: Run rollback migration
- If data loss: Restore from backup (RDS snapshot)
- If schema change breaks app: Deploy hotfix or revert

**Rollback Procedure:**

1. Disable feature flag (instant)
2. Communicate to team (Slack)
3. Identify root cause
4. Deploy fix or revert code
5. Test fix in staging
6. Re-enable feature flag gradually

---

## Dependencies

### External Dependencies

**1. Cloudflare R2 (Photo Storage)**

- **Version:** Latest API
- **Purpose:** Store profile photos
- **Why:** Cost-effective ($0.015/GB vs. S3 $0.023/GB), fast CDN
- **Alternative:** AWS S3 (if R2 unavailable)
- **Budget:** ~$10/month for 10,000 users

**2. Recharts (Chart Library)**

- **Version:** ^2.10.0
- **Purpose:** Render performance trend charts
- **Why:** Lightweight, React-native, good TypeScript support
- **Alternative:** Chart.js (more features, larger bundle)

**3. Sharp (Image Processing)**

- **Version:** ^0.33.0
- **Purpose:** Resize and optimize profile photos
- **Why:** Fastest image processing library for Node.js
- **Alternative:** jimp (pure JS, slower)

**4. React Query (Server State Management)**

- **Version:** ^5.0.0
- **Purpose:** Cache and manage server state (profiles, stats, achievements)
- **Why:** Built-in caching, automatic refetching, optimistic updates
- **Alternative:** SWR (simpler, less features)

**5. Zustand (Client State Management)**

- **Version:** ^4.4.0
- **Purpose:** Manage UI state (edit mode, filters, modals)
- **Why:** Lightweight, simple API, TypeScript support
- **Alternative:** Redux (more boilerplate)

**6. date-fns (Date Utilities)**

- **Version:** ^3.0.0
- **Purpose:** Format dates, calculate streaks, date ranges
- **Why:** Smaller than moment.js, tree-shakeable, immutable
- **Alternative:** Day.js (similar size, different API)

---

### Internal Dependencies

**1. Authentication System**

- **Required For:** Profile ownership, privacy checks
- **Dependency:** User session with `userId` and `organizationId`
- **Impact:** Cannot identify profile owner without auth

**2. Tournament System**

- **Required For:** Source of player data (matches, placements, results)
- **Dependency:** Tournament finalization webhook
- **Impact:** Stats and achievements depend on tournament data

**3. Organization System**

- **Required For:** Multi-tenant isolation
- **Dependency:** `organizationId` in all queries
- **Impact:** Cross-tenant data leakage if missing

**4. Notification System**

- **Required For:** Achievement unlock notifications
- **Dependency:** WebSocket or push notification infrastructure
- **Impact:** Users won't know when achievements unlock (degraded UX)

**5. Rating System (Elo/Fargo)**

- **Required For:** Skill ratings, rating trends
- **Dependency:** Elo/Fargo calculation service
- **Impact:** Cannot display rating or rating progression charts

---

## Performance & Scale

### Expected Load

**User Base:**

- 10,000 active players (6 months post-launch)
- 1,000 concurrent users (peak)
- 500 tournaments per month (across all orgs)
- 10,000 matches per month

**Request Volume:**

- Profile views: 50,000/day
- Stats API calls: 20,000/day
- Achievement checks: 500/day (background jobs)
- Photo uploads: 100/day
- Search queries: 5,000/day

**Data Volume:**

- Player profiles: 10,000 rows (~10MB)
- Player statistics: 10,000 rows (~5MB)
- Tournament history: 100,000 rows (~50MB)
- Player matches: 500,000 rows (~200MB)
- Achievements: 20 rows (static)
- Player achievements: 200,000 rows (~20MB)
- Rating history: 100,000 rows (~10MB)
- **Total:** ~300MB (easily fits in single PostgreSQL instance)

---

### Performance Targets

**API Response Times (p95):**

- Profile page (full): <1000ms
- Profile API: <200ms
- Stats API: <300ms
- History API: <200ms
- Achievements API: <200ms
- H2H API: <300ms
- Search API: <200ms
- Photo upload: <2000ms

**Database Query Times (p95):**

- Profile SELECT: <50ms
- Stats aggregation: <100ms
- History pagination: <100ms
- H2H calculation: <100ms
- Search query: <150ms

**Background Job Processing:**

- Achievement check per player: <200ms
- Stats recalculation per player: <100ms
- Batch processing 100 players: <30 seconds

**Cache Performance:**

- Redis GET: <5ms
- Cache hit rate: >80%

---

### Scalability Considerations

**Database Scaling:**

**Current Capacity (Single Instance):**

- PostgreSQL (db.t3.medium): 4GB RAM, 2 vCPU
- Can handle 1000 QPS
- Current expected load: ~100 QPS (well within capacity)

**Scaling Strategy:**

1. **Optimize queries and indexes** (Day 1-100)
2. **Add read replicas** (100-1000 QPS)
3. **Implement connection pooling** (1000-5000 QPS)
4. **Shard by tenant** (5000+ QPS)

**When to scale:**

- Monitor database CPU > 70% for 1 hour
- Monitor active connections > 80% of max
- Monitor query latency > 200ms p95

**Redis Scaling:**

**Current Capacity:**

- Redis (t3.small): 2GB RAM
- Can cache 500,000 profiles (4KB each)
- Current expected: 10,000 profiles (20MB)

**Scaling Strategy:**

1. **Increase TTL** (reduce cache churn)
2. **Upgrade instance size** (more RAM)
3. **Add Redis cluster** (horizontal scaling)

**Application Scaling:**

**Next.js Deployment:**

- Vercel serverless functions (auto-scaling)
- Edge functions for static content
- ISR for profile pages (cached at CDN)

**Background Jobs:**

- Vercel Cron (serverless, auto-scaling)
- Queue: Redis or PostgreSQL-based queue
- Concurrency: 10 jobs in parallel (current)
- Scale to 100 jobs in parallel (if needed)

**CDN Scaling:**

- Cloudflare CDN (unlimited bandwidth)
- Cache profile photos (1 year expiration)
- Cache static assets (immutable)

---

### Bottleneck Analysis

**Potential Bottlenecks:**

**1. Database (PostgreSQL)**

- **Risk:** High read volume on player profiles, stats
- **Mitigation:** Redis caching (60s TTL), read replicas
- **Monitoring:** Query latency, connection pool usage

**2. Photo Upload Processing**

- **Risk:** Image resizing is CPU-intensive
- **Mitigation:** Offload to background job, use Sharp (fast)
- **Monitoring:** Upload success rate, processing time

**3. Achievement Check Processing**

- **Risk:** Batch processing 100+ players after large tournament
- **Mitigation:** Queue-based system, parallel processing
- **Monitoring:** Queue depth, job failure rate

**4. Search Queries**

- **Risk:** Complex filters on large datasets
- **Mitigation:** Database indexes, autocomplete caching
- **Monitoring:** Query latency, cache hit rate

**5. WebSocket Connections (Notifications)**

- **Risk:** 1000 concurrent WebSocket connections
- **Mitigation:** Use Redis pub/sub, scale horizontally
- **Monitoring:** Connection count, message latency

---

## Risks & Mitigations

| Risk                                                                   | Impact   | Probability | Mitigation                                                                                    |
| ---------------------------------------------------------------------- | -------- | ----------- | --------------------------------------------------------------------------------------------- |
| **Privacy Breach** - Player data exposed to wrong users                | Critical | Low         | Default privacy: private. Granular controls. RLS policies. Extensive testing. Security audit. |
| **Performance Degradation** - Slow profile loads, timeouts             | High     | Medium      | Aggressive caching (Redis + CDN). Database indexes. Load testing. Auto-scaling.               |
| **Achievement Gaming** - Players exploit system to unlock achievements | Medium   | Medium      | Careful criteria design. Manual review for suspicious unlocks. Rate limiting.                 |
| **Data Inconsistency** - Stats don't match tournament results          | High     | Low         | Automated tests for calculations. Webhook-based updates. Recalculation script.                |
| **Photo Upload Abuse** - Inappropriate images, spam                    | Medium   | Medium      | File size limits. Format validation. Content moderation. Report button.                       |
| **Low Engagement** - Players don't use features                        | High     | Medium      | Gamification (achievements). Email campaigns. In-tournament prompts. Contests.                |
| **Multi-Tenant Data Leakage** - Cross-org data access                  | Critical | Very Low    | RLS policies. All queries include `tenant_id`. Security audit. Automated tests.               |
| **Database Scaling Issues** - DB performance degrades                  | Medium   | Low         | Read replicas. Connection pooling. Monitoring. Auto-scaling.                                  |
| **Feature Creep** - Scope expands, launch delayed                      | Medium   | High        | Strict prioritization (P0, P1, P2). Weekly scope review. Defer P2 to post-launch.             |
| **GDPR Compliance** - Data retention, deletion issues                  | High     | Low         | Privacy policy. Data export endpoint. Hard delete option. Lawyer review.                      |

---

## Alternatives Considered

### Alternative 1: Third-Party Achievement Platform (e.g., Xbox Live SDK)

**Pros:**

- Pre-built achievement system
- Social features included (friends, messaging)
- Proven at scale

**Cons:**

- Cost: $0.10 per user/month (~$1000/month for 10k users)
- Vendor lock-in
- Limited customization
- Requires integration work

**Why Not Chosen:**

- Too expensive for current budget
- We need custom achievement criteria (tournament-specific)
- Want full control over data and UX

---

### Alternative 2: Elasticsearch for Player Search

**Pros:**

- Extremely fast full-text search
- Advanced filtering and faceting
- Scales to millions of documents

**Cons:**

- Added infrastructure complexity
- Cost: ~$50/month for managed Elasticsearch
- Overkill for 10,000 players
- Data sync complexity (PostgreSQL → Elasticsearch)

**Why Not Chosen:**

- PostgreSQL with proper indexes is fast enough for current scale
- Can migrate to Elasticsearch later if needed (when >100k players)
- Trigram indexes provide good autocomplete performance

---

### Alternative 3: NoSQL Database (MongoDB) for Profiles

**Pros:**

- Flexible schema (easy to add fields)
- Good for document-like data (profiles with JSONB)
- Horizontal scaling built-in

**Cons:**

- No native multi-tenant RLS (manual enforcement)
- No JOINs (need to denormalize more)
- Team is more familiar with PostgreSQL
- Adds another database to infrastructure

**Why Not Chosen:**

- PostgreSQL JSONB provides same flexibility
- PostgreSQL RLS provides better multi-tenant security
- Consistency with existing stack (all other data in PostgreSQL)

---

### Alternative 4: Server-Side Rendering (SSR) Instead of ISR

**Pros:**

- Always fresh data (no stale cache)
- Better SEO (real-time content)

**Cons:**

- Slower page loads (no CDN caching)
- Higher server load (render on every request)
- Worse user experience (longer TTFB)

**Why Not Chosen:**

- Profiles don't change frequently (ISR 60s is acceptable)
- Performance is critical (<1s load time)
- ISR provides best balance (fast + fresh enough)

---

### Alternative 5: Manual Achievement Unlocks (TD Awards)

**Pros:**

- Simple implementation (no background jobs)
- TDs have full control
- No gaming/exploits

**Cons:**

- Manual work for TDs (overhead)
- Inconsistent (some TDs forget)
- Delayed gratification (not real-time)
- Less engaging for players

**Why Not Chosen:**

- Automation provides better UX (instant unlock)
- Real-time notifications create excitement
- Reduces TD workload

---

## Open Questions

**Product Questions:**

- [ ] **Achievement Rarity Distribution:** Confirmed 30% common, 25% uncommon, 25% rare, 15% epic, 5% legendary?
- [ ] **Default Privacy:** Private confirmed (opt-in to public)?
- [ ] **Player Search Access:** All users or TDs only? → **Decision: All users, TDs get advanced filters**
- [ ] **Rating System:** Elo confirmed for v1? Add Fargo later?
- [ ] **Profile URLs:** UUIDs for now, vanity URLs later?
- [ ] **Achievement Notifications:** Toast for rare+, silent for common? → **Decision: Yes**

**Technical Questions:**

- [ ] **Photo Storage:** Cloudflare R2 confirmed?
- [ ] **Background Jobs:** Vercel Cron confirmed?
- [ ] **Chart Library:** Recharts confirmed?
- [ ] **Real-Time Notifications:** Server-Sent Events confirmed?
- [ ] **Database Scaling:** When to add read replica? → **Monitor: >70% CPU for 1 hour**

**Design Questions:**

- [ ] **Profile Photo Placeholder:** Initials + colored background?
- [ ] **Achievement Icons:** Icon library for v1, custom later?
- [ ] **Mobile Navigation:** Horizontal scrollable tabs?
- [ ] **Color Scheme:** Green/red for win/loss?

**Business Questions:**

- [ ] **Premium Features:** All free for v1?
- [ ] **Advertising:** No ads on profiles?
- [ ] **Data Licensing:** TDs can export stats for own org only?

---

## References

**Related Documents:**

- Product Requirements: `product/PRDs/player-profiles-enhanced-experience.md`
- Sprint Plan: `sprints/current/sprint-10-business-growth.md`
- Multi-Tenant Architecture: `technical/multi-tenant-architecture.md`
- Coding Standards: `C:\devop\coding_standards.md`
- Database Schema: `technical/database-schema.md` (to be updated)
- API Documentation: `technical/api-spec.md` (to be updated)

**External Resources:**

- Recharts Documentation: https://recharts.org/
- Sharp Documentation: https://sharp.pixelplumbing.com/
- React Query Documentation: https://tanstack.com/query/latest
- PostgreSQL Performance Tuning: https://www.postgresql.org/docs/current/performance-tips.html
- Cloudflare R2 Documentation: https://developers.cloudflare.com/r2/

**Research:**

- User Interviews (Oct 2024): 80% want stat tracking
- Competitor Analysis: 5 platforms analyzed, none have comprehensive achievements
- Gaming Industry Data: 60% achievement unlock rate (Xbox, PlayStation)
- Sports App Benchmarks: 80% view stats after events (Strava, Nike Run Club)

---

## Revision History

| Date       | Author                       | Changes                                                                                                                                                                                            |
| ---------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-11-06 | Claude (Technical Architect) | Initial draft - comprehensive technical specification with architecture, data model, API design, implementation plan, testing strategy, deployment plan, performance analysis, and risk mitigation |
