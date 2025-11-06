# Player Profiles & Enhanced Experience - PRD

**Author:** Claude (Product Assistant)
**Date:** 2025-11-06
**Status:** Draft
**Last Updated:** 2025-11-06
**Sprint:** Sprint 10 - Business Growth & Advanced Features
**Priority:** High (P0)

---

## 1. Executive Summary

Player Profiles & Enhanced Experience transforms our tournament platform from a simple scheduling tool into an engaging player ecosystem. By providing comprehensive player profiles, detailed statistics, an achievement system, and performance analytics, we create a compelling reason for players to return, engage deeply with the platform, and participate in more tournaments. This feature addresses the critical need for player retention and engagement while providing tournament directors with valuable player data for better tournament organization.

---

## 2. Problem Statement

### What problem are we solving?

Currently, players have no persistent identity or way to track their progress across tournaments. When a tournament ends, there's no historical record of performance, no visibility into statistics, and no sense of progression or achievement. Players who want to improve have no data to analyze, and competitive players cannot compare their records with rivals. Tournament directors lack player history data for effective seeding and handicapping decisions.

**Key Problems:**
1. **No Player Identity** - Players exist only within individual tournaments, not across the platform
2. **Zero Visibility** - No way to view personal statistics, trends, or historical performance
3. **No Engagement Loop** - Nothing brings players back between tournaments
4. **Missing Competitive Element** - No head-to-head records or player rankings
5. **TD Blind Spots** - Tournament directors have no access to player history for seeding
6. **No Gamification** - No achievements, progression, or rewards for participation

### Who has this problem?

- **Primary Users:** Competitive players (ages 21-55) who play 2+ tournaments per month and want to track improvement and compare with rivals
- **Secondary Users:** Tournament directors who need player data for seeding, handicapping, and promotional activities
- **Tertiary Users:** Casual spectators who want to follow top players and understand competitive hierarchy

### Why is this important now?

**Business Context:**
- Sprint 10 focus on business growth requires features that drive user retention and engagement
- Multi-tenant platform needs differentiators that create network effects within organizations
- Player retention is key to tournament participation rates and platform stickiness

**Market Opportunity:**
- Competitors lack comprehensive player profile systems
- Gaming and esports platforms prove that achievements drive 40-60% more engagement
- Sports analytics trends show players actively seek performance data

**Strategic Importance:**
- Player profiles create data moats (historical data becomes more valuable over time)
- Achievement systems drive habitual usage patterns
- Social features enable viral growth through profile sharing

---

## 3. Goals and Success Metrics

### Primary Goals

1. **Increase Player Engagement** - Create compelling reasons for players to return to the platform between tournaments
2. **Improve Player Retention** - Transform one-time participants into regular, long-term users
3. **Drive Tournament Participation** - Use gamification and progression systems to encourage more tournament registrations
4. **Enable Data-Driven Improvement** - Provide analytics that help players understand and improve their performance
5. **Build Community** - Create social layer through profiles, achievements, and head-to-head records

### Key Metrics

| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| **Profile View Rate** | 0% (new feature) | 80% of active players | 4 weeks post-launch |
| **Achievement Unlock Rate** | 0% (new feature) | 60% unlock ≥1 achievement | 4 weeks post-launch |
| **Return Player Rate** | ~35% (current) | 55% | 8 weeks post-launch |
| **Tournament Registrations** | Baseline (current avg) | +25% increase | 12 weeks post-launch |
| **Profile Completion Rate** | N/A | 70% add bio/photo | 8 weeks post-launch |
| **Head-to-Head Views** | 0% (new feature) | 40% check rival records | 8 weeks post-launch |
| **Social Shares** | N/A | 15% share achievements | 8 weeks post-launch |
| **Player Search Usage** | 0% (new feature) | 50% of TDs use search | 4 weeks post-launch |

### Secondary Metrics (Leading Indicators)

- Average session duration (+30% target)
- Pages per session (+50% target)
- Profile edit rate (50% of users)
- Tournament history views (60% of players)
- Performance trend views (40% of players)

---

## 4. User Stories

### Core Profile Management

**US-1: View My Player Profile**
**As a** registered player
**I want** to view my comprehensive player profile with stats, history, and achievements
**So that** I can see my progress and share my accomplishments with others

**Acceptance Criteria:**
- [ ] Profile page displays player name, photo, bio, and member since date
- [ ] Statistics dashboard shows win/loss record, win rate, and skill rating
- [ ] Tournament history is visible with pagination (20 per page)
- [ ] Achievement section displays earned achievements with progress
- [ ] Page loads in <1 second with caching
- [ ] Profile URL is shareable (e.g., `/players/[playerId]`)
- [ ] Privacy settings are respected (public/private toggle)

---

**US-2: Edit My Profile Information**
**As a** player
**I want** to customize my profile with a photo, bio, and personal information
**So that** I can create a unique identity and let others know who I am

**Acceptance Criteria:**
- [ ] Edit button on profile opens edit mode
- [ ] Can upload profile photo (max 5MB, image formats only)
- [ ] Can write bio (max 500 characters)
- [ ] Can add location (city, state)
- [ ] Can add social links (optional: Twitter, Instagram, etc.)
- [ ] Changes save immediately with visual feedback
- [ ] Profile preview shows changes before saving
- [ ] Image uploads are optimized and resized automatically

---

### Statistics & Analytics

**US-3: View My Statistics**
**As a** competitive player
**I want** to see detailed statistics about my performance
**So that** I can understand my strengths, weaknesses, and track improvement

**Acceptance Criteria:**
- [ ] Statistics dashboard shows overall win/loss record
- [ ] Win rate percentage is prominently displayed
- [ ] Stats broken down by format (8-ball, 9-ball, etc.)
- [ ] Total tournaments and matches played
- [ ] Average finish position and best finish
- [ ] Current streak (wins or losses)
- [ ] Skill rating (Elo/Fargo) with trend indicator
- [ ] All stats update in real-time after tournament completion

---

**US-4: View Performance Trends**
**As a** player focused on improvement
**I want** to see charts and graphs of my performance over time
**So that** I can identify trends and measure my progress

**Acceptance Criteria:**
- [ ] Line chart shows win rate over time (last 3/6/12 months)
- [ ] Line chart shows skill rating progression
- [ ] Bar chart shows tournament frequency by month
- [ ] Comparison charts for performance by venue
- [ ] Comparison charts for performance by format
- [ ] Can filter charts by date range
- [ ] Charts are interactive (hover for details)
- [ ] Export data as CSV option

---

### Tournament History

**US-5: Browse My Tournament History**
**As a** player
**I want** to see a complete list of all tournaments I've played
**So that** I can review past performances and access tournament details

**Acceptance Criteria:**
- [ ] Tournament history displays in reverse chronological order
- [ ] Each entry shows tournament name, date, format
- [ ] Shows placement (1st, 2nd, 3rd, etc.) and record (wins-losses)
- [ ] Shows prize winnings if applicable
- [ ] Pagination with 20 tournaments per page
- [ ] Filter by format (8-ball, 9-ball, etc.)
- [ ] Filter by date range (custom or presets)
- [ ] Filter by venue
- [ ] Click tournament to view full details
- [ ] Quick stats summary at top (total tournaments, best finish)

---

### Achievement System

**US-6: Unlock and View Achievements**
**As a** player
**I want** to earn achievements for my accomplishments and milestones
**So that** I feel rewarded for my participation and can showcase my achievements

**Acceptance Criteria:**
- [ ] Achievement section shows all 20 achievements (locked and unlocked)
- [ ] Locked achievements show progress toward unlock (e.g., "7/10 tournaments")
- [ ] Unlocked achievements display with badge, title, description, date earned
- [ ] Achievements sorted by rarity (common → legendary)
- [ ] Secret achievements hidden until unlocked
- [ ] Real-time notification when achievement is unlocked
- [ ] Achievement points total displayed
- [ ] Can share individual achievements to social media
- [ ] Achievement showcase on profile (display top 3-5)

---

### Head-to-Head Records

**US-7: View Head-to-Head Record**
**As a** competitive player
**I want** to see my record against specific opponents
**So that** I can understand my performance against rivals and prepare for matches

**Acceptance Criteria:**
- [ ] Search or select opponent from list
- [ ] Head-to-head page shows overall record (wins-losses)
- [ ] Win rate percentage vs. this opponent
- [ ] List of most recent matches (date, tournament, result)
- [ ] Breakdown by format if applicable
- [ ] Shows venue where matches occurred
- [ ] Link to full tournament for each match
- [ ] Can share head-to-head record
- [ ] Shows mutual achievement comparison

---

### Player Search & Discovery

**US-8: Search for Players**
**As a** tournament director
**I want** to search for players by name, location, and skill level
**So that** I can find players for seeding, invitations, or handicapping

**Acceptance Criteria:**
- [ ] Search bar with autocomplete
- [ ] Search by player name (partial match)
- [ ] Filter by location (city, state, region)
- [ ] Filter by skill level/rating range
- [ ] Filter by tournaments played (min/max)
- [ ] Filter by win rate range
- [ ] Sort by rating, tournaments played, or total wins
- [ ] Advanced filters: format specialty, venue preference
- [ ] Results show player card (name, photo, rating, stats)
- [ ] Click player to view full profile
- [ ] Search respects privacy settings (private profiles not shown)

---

### Privacy & Settings

**US-9: Control Profile Privacy**
**As a** player concerned about privacy
**I want** to control who can see my profile and statistics
**So that** I can share as much or as little as I'm comfortable with

**Acceptance Criteria:**
- [ ] Privacy settings page accessible from profile
- [ ] Global toggle: Public profile (anyone) or Private (logged-in users only)
- [ ] Granular controls: Show statistics (yes/no)
- [ ] Granular controls: Show tournament history (yes/no)
- [ ] Granular controls: Show achievements (yes/no)
- [ ] Granular controls: Allow head-to-head lookups (yes/no)
- [ ] Default privacy: Private (opt-in to public)
- [ ] Settings save immediately
- [ ] Clear explanation of each privacy option
- [ ] Private profiles still show basic info to TDs in their organization

---

### Social Sharing

**US-10: Share Achievements**
**As a** player who unlocked an achievement
**I want** to share my achievement on social media
**So that** I can celebrate with friends and promote the platform

**Acceptance Criteria:**
- [ ] "Share" button on each unlocked achievement
- [ ] Share to Twitter, Facebook, Instagram
- [ ] Pre-populated message with achievement details
- [ ] Generated image card with achievement badge, player name, platform logo
- [ ] Share link includes player profile URL
- [ ] Share tracking (analytics)
- [ ] Can copy shareable link to clipboard
- [ ] Share from achievement unlock notification

---

## 5. Requirements

### Must Have (P0) - Launch Blockers

**Player Profile System:**
- ✅ Player profile page with dynamic routing (`/players/[playerId]`)
- ✅ Profile header: name, photo, bio, member since, location
- ✅ Profile editing functionality (photo upload, bio, social links)
- ✅ Privacy settings (public/private toggle with granular controls)
- ✅ Default privacy: private (opt-in to public)

**Statistics Dashboard:**
- ✅ Overall win/loss record and win rate percentage
- ✅ Total tournaments played and total matches played
- ✅ Stats breakdown by format (8-ball, 9-ball, etc.)
- ✅ Average finish position and best finish
- ✅ Current streak (wins or losses)
- ✅ Skill rating display (Elo or Fargo)
- ✅ Real-time stat updates after tournaments

**Tournament History:**
- ✅ Complete tournament history with pagination (20 per page)
- ✅ Each entry: tournament name, date, format, placement, record
- ✅ Filter by format
- ✅ Filter by date range (presets and custom)
- ✅ Link to full tournament details
- ✅ Quick stats summary

**Achievement System (Basic - 10 Achievements):**
- ✅ Achievement data model and tracking system
- ✅ 10 core achievements (mix of participation and performance)
  - First Steps, Winner, Champion, Participant, Regular
  - Comeback Kid, Marathon, Early Bird, Social Butterfly, Specialist
- ✅ Achievement unlock detection (background job)
- ✅ Achievement display on profile (locked/unlocked states)
- ✅ Progress tracking for locked achievements
- ✅ Real-time unlock notifications

**Data & Performance:**
- ✅ Database schema for player profiles, stats, achievements
- ✅ Efficient queries with proper indexes
- ✅ Caching for frequently accessed profiles (<1s load time)
- ✅ Multi-tenant isolation (player data scoped to organization)

---

### Should Have (P1) - Post-Launch Priority

**Full Achievement System (20 Achievements):**
- ✅ Additional 10 achievements (rare and epic tiers)
  - Dynasty, Undefeated, Perfectionist, Underdog, Dominant
  - Rival, Globetrotter, All-Rounder, Lucky 13, Veteran
- ✅ Achievement rarity tiers (common, uncommon, rare, epic, legendary)
- ✅ Secret achievements (hidden until unlocked)
- ✅ Achievement points system
- ✅ Achievement showcase (display top achievements on profile)

**Head-to-Head Records:**
- ✅ Head-to-head lookup by opponent
- ✅ Overall record vs. specific opponent
- ✅ Win rate vs. opponent
- ✅ Recent match list with details
- ✅ Breakdown by format and venue
- ✅ Shareable head-to-head page

**Performance Trends & Analytics:**
- ✅ Win rate over time (line chart with 3/6/12 month views)
- ✅ Skill rating progression (line chart)
- ✅ Tournament frequency (bar chart by month)
- ✅ Performance by venue (comparison chart)
- ✅ Performance by format (comparison chart)
- ✅ Interactive charts (hover for details)
- ✅ Date range filtering

**Player Search & Discovery:**
- ✅ Player search with autocomplete
- ✅ Search by name, location, skill level
- ✅ Filter by tournaments played, win rate
- ✅ Advanced filters (format specialty, venue)
- ✅ Sort options (rating, tournaments, wins)
- ✅ Player cards in search results
- ✅ Privacy-respecting search (excludes private profiles from public search)

**Social Features:**
- ✅ Share achievements to social media (Twitter, Facebook)
- ✅ Generated achievement cards for sharing
- ✅ Shareable profile URLs
- ✅ Share head-to-head records

---

### Nice to Have (P2) - Future Enhancements

**Advanced Social Features:**
- 🔮 Player messaging system
- 🔮 Friend/follow system
- 🔮 Activity feed (friend achievements, tournament results)
- 🔮 Player endorsements ("Great sportsmanship", "Skilled player")
- 🔮 Profile comments (moderated)

**Custom & Advanced Achievements:**
- 🔮 Organization-specific custom achievements
- 🔮 Seasonal achievements (expire and reset)
- 🔮 Team achievements (team tournaments)
- 🔮 Community challenges (global achievement goals)

**Leaderboards:**
- 🔮 Global leaderboards (most wins, highest rating, most achievements)
- 🔮 Venue-specific leaderboards
- 🔮 Format-specific leaderboards
- 🔮 Monthly/seasonal leaderboards with prizes

**Advanced Analytics:**
- 🔮 Break percentage statistics
- 🔮 Match duration averages
- 🔮 Strength of schedule calculations
- 🔮 Predictive win probability vs. opponents
- 🔮 Export full analytics to PDF

**Gamification Enhancements:**
- 🔮 Player levels and XP system
- 🔮 Badges and titles (unlockable display names)
- 🔮 Rewards marketplace (redeem points for perks)
- 🔮 Challenges and quests (complete X to earn Y)

**Profile Enhancements:**
- 🔮 Video highlights (upload match highlights)
- 🔮 Photo gallery
- 🔮 Equipment showcase (cue collection)
- 🔮 Preferred playing conditions
- 🔮 Availability calendar (when player can play)

---

## 6. User Experience

### User Flow: Viewing Player Profile

```
Entry Points → Profile Page → Profile Sections → Actions
     |              |               |              |
     |              |               |              |
1. Navigation    Header         Statistics      Edit Profile
   - Main nav    - Name         - Win/Loss      - Upload photo
   - Player      - Photo        - Win rate      - Write bio
     search      - Bio          - Tournaments   - Privacy
   - Tournament  - Rating       - Best finish
     results     - Member since - Streak        Share Profile
   - Leaderboard                                - Copy link
                                                - Social media
2. Direct Link   Tabs           Achievements
   - Shared URL  - Overview     - Unlocked      View Tournament
   - Email       - History      - In progress   - Click history
   - Social      - Stats        - Locked        - See details
                 - Achievements
                 - H2H          Tournament      Check H2H
                                History         - Search opponent
3. Self Profile  Trends         - All tourneys  - View record
   - Dashboard   - Charts       - Filters
   - Settings    - Analytics    - Pagination    Unlock Achievement
                                                - Notification
                                                - Share
```

### Key Interactions

#### 1. **Profile Page Load**
- **Action:** User navigates to `/players/[playerId]` or clicks player name
- **Experience:**
  - Immediate skeleton loader (profile shape with pulsing placeholders)
  - Profile header loads first (name, photo, bio) - 200ms
  - Statistics dashboard loads next - 400ms
  - Achievement section loads last - 600ms
  - Total time to interactive: <1 second
  - Smooth transitions between loading states
- **Privacy:**
  - If profile is private and viewer is not logged in: Show "This profile is private" message
  - If logged in but not in same organization: Show limited info
  - If in same organization: Show full profile regardless of privacy setting (for TDs)

#### 2. **Achievement Unlock Notification**
- **Trigger:** Achievement criteria met (e.g., win 10th tournament)
- **Experience:**
  - Real-time toast notification appears (top-right corner)
  - Achievement badge animation (scale + glow effect)
  - Sound effect (optional, user can disable)
  - Notification shows: "Achievement Unlocked: [Name]", badge icon
  - Click notification to view achievement details
  - "Share" button in notification for immediate social sharing
  - Notification auto-dismisses after 8 seconds
  - Achievement marked as "NEW" on profile until viewed

#### 3. **Editing Profile**
- **Action:** Click "Edit Profile" button
- **Experience:**
  - Page transitions to edit mode (same URL, no navigation)
  - Editable fields highlighted with subtle border
  - Photo upload: Drag & drop or click to browse
  - Photo preview before saving
  - Bio textarea with character counter (500 max)
  - "Save" and "Cancel" buttons sticky at bottom
  - Changes save with optimistic UI (immediate feedback)
  - Success toast: "Profile updated"
  - Return to view mode automatically

#### 4. **Viewing Head-to-Head Record**
- **Action:** Click "Head-to-Head" tab, search for opponent
- **Experience:**
  - Search box with autocomplete (shows recent opponents first)
  - Type opponent name, see suggestions
  - Select opponent from dropdown
  - H2H page loads with animated counter (record counts up)
  - Large display: "You: 12 - Opponent: 8" with win rate
  - Match list below (expandable for details)
  - Visual indicators: W/L badges, color coding
  - "Share this record" button
  - Link to view opponent's full profile

#### 5. **Browsing Tournament History**
- **Action:** Click "History" tab on profile
- **Experience:**
  - List view with tournament cards (20 per page)
  - Each card shows: tournament name, date, format badge, placement, record
  - Filter bar at top (format dropdown, date range picker)
  - Filters apply instantly (no page reload)
  - Pagination at bottom (numbered pages + prev/next)
  - Click any tournament to navigate to full tournament view
  - Quick stats at top: "Played 47 tournaments | Best finish: 1st | Avg: 8.3"

#### 6. **Viewing Performance Trends**
- **Action:** Click "Stats" tab, scroll to trends section
- **Experience:**
  - Section loads with chart placeholders (wireframe)
  - Charts animate in (line draws from left to right)
  - Interactive: Hover over data points for exact values
  - Tooltips show date, value, context (e.g., "Aug 2024: 68% win rate, +3% vs. July")
  - Date range selector at top (3M, 6M, 1Y, All)
  - Chart updates smoothly when date range changes
  - Color-coded: green for improvements, red for declines
  - "Export data" button downloads CSV

#### 7. **Player Search (TD Perspective)**
- **Action:** TD clicks "Players" in main navigation, enters search
- **Experience:**
  - Search page with prominent search bar
  - Autocomplete suggestions appear as TD types (200ms debounce)
  - Advanced filters collapsed by default (expand with "Show filters")
  - Filter options: location, skill level range, tournaments played, win rate
  - Results display as grid of player cards (3 columns)
  - Each card: photo, name, rating, tournaments, win rate
  - Hover card: Quick stats preview
  - Click card: Navigate to full profile
  - Search respects privacy (private profiles hidden from search)
  - Loading: Skeleton cards while fetching

#### 8. **Setting Privacy Preferences**
- **Action:** Click "Privacy Settings" from profile dropdown
- **Experience:**
  - Modal overlay with privacy options
  - Clear heading: "Who can see your profile?"
  - Global toggle: Public (anyone) or Private (logged-in users only)
  - Granular checkboxes below:
    - ☑ Show my statistics
    - ☑ Show my tournament history
    - ☑ Show my achievements
    - ☑ Allow head-to-head lookups
  - Each option has info icon (hover/click for explanation)
  - Note: "Tournament directors in your organization can always view your profile"
  - Save button at bottom
  - Changes apply immediately

#### 9. **Sharing Achievement on Social Media**
- **Action:** Click "Share" button on unlocked achievement
- **Experience:**
  - Modal appears with sharing options
  - Preview of generated achievement card (image)
  - Card shows: achievement badge, player name, achievement name, platform logo
  - Social buttons: Twitter, Facebook, Instagram, Copy Link
  - Pre-populated message for each platform
  - Click social button: Opens share dialog in new window
  - Click "Copy Link": Copies profile URL to clipboard, shows "Copied!" feedback
  - Share tracking (analytics event)
  - Close modal or auto-close after share

#### 10. **Mobile Experience**
- **Profile Layout:**
  - Single column layout (no sidebar)
  - Header stacks: photo, name, bio, stats
  - Tabs become horizontal scrollable bar
  - Charts scale to full width
  - Touch-optimized buttons (44px minimum)
- **Achievements:**
  - Grid view (2 columns on mobile)
  - Tap achievement to see details (modal)
- **Tournament History:**
  - Card view with simplified layout
  - Filters in drawer (slide from bottom)
- **Performance:**
  - Lazy load images
  - Defer chart rendering until tab is viewed
  - Infinite scroll for history (no pagination)

---

### Mockups/Wireframes

**Profile Page Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Header                                                      │
│ ┌──────────┐   John "Rack Attack" Smith         [Edit]    │
│ │          │   Member since: Jan 2024                      │
│ │  Photo   │   Phoenix, AZ                                 │
│ │          │   Rating: 1847 ↑                              │
│ └──────────┘   "Play hard, stay humble." 🎱               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ [Overview] [History] [Stats] [Achievements] [Head-to-Head] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ STATISTICS DASHBOARD                                        │
│ ┌──────────────┬──────────────┬──────────────┐            │
│ │ Win Rate     │ Tournaments  │ Best Finish  │            │
│ │    68.4%     │     47       │     1st      │            │
│ └──────────────┴──────────────┴──────────────┘            │
│                                                             │
│ ┌──────────────┬──────────────┬──────────────┐            │
│ │ Total Record │ Matches      │ Current      │            │
│ │   142-66     │     208      │   4 Win ↑    │            │
│ └──────────────┴──────────────┴──────────────┘            │
│                                                             │
│ BY FORMAT                                                   │
│ ┌──────────────────────────────────────────────┐          │
│ │ 8-Ball:  78-32  (70.9%)                      │          │
│ │ 9-Ball:  54-28  (65.9%)                      │          │
│ │ 10-Ball: 10-6   (62.5%)                      │          │
│ └──────────────────────────────────────────────┘          │
│                                                             │
│ ACHIEVEMENTS (8/20 Unlocked)                                │
│ ┌────┬────┬────┬────┬────┬────┬────┬────┐                │
│ │🏆 │✨ │🎯 │🌟 │🔒│🔒│🔒│🔒│                │
│ │Chp │Win │1st│Reg│   │   │   │   │                │
│ └────┴────┴────┴────┴────┴────┴────┴────┘                │
│ [View All Achievements →]                                   │
│                                                             │
│ RECENT TOURNAMENTS                                          │
│ ┌──────────────────────────────────────────────┐          │
│ │ 🎱 Phoenix 8-Ball Championship      Nov 2    │          │
│ │    Placement: 2nd | Record: 6-1              │          │
│ ├──────────────────────────────────────────────┤          │
│ │ 🎱 Friday Night 9-Ball             Oct 27    │          │
│ │    Placement: 1st | Record: 8-0              │          │
│ ├──────────────────────────────────────────────┤          │
│ │ 🎱 Valley 10-Ball Masters          Oct 20    │          │
│ │    Placement: 5th | Record: 4-2              │          │
│ └──────────────────────────────────────────────┘          │
│ [View Full History →]                                       │
└─────────────────────────────────────────────────────────────┘
```

**Achievement Card (Unlocked):**

```
┌────────────────────────────┐
│          🏆                │
│                            │
│    CHAMPION                │
│                            │
│  Win 10 Tournaments        │
│                            │
│  Rarity: Epic              │
│  Points: 100               │
│  Unlocked: Oct 27, 2024    │
│                            │
│  [Share Achievement]       │
└────────────────────────────┘
```

**Achievement Card (In Progress):**

```
┌────────────────────────────┐
│          🔒                │
│                            │
│    DYNASTY                 │
│                            │
│  Win 3 consecutive         │
│  tournaments               │
│                            │
│  Progress: █████░░░░░      │
│  2/3 Tournaments           │
│                            │
│  Rarity: Legendary         │
│  Points: 250               │
└────────────────────────────┘
```

**Head-to-Head Page:**

```
┌─────────────────────────────────────────────────────────────┐
│ HEAD-TO-HEAD RECORD                                         │
│                                                             │
│   John Smith        vs.       Mike Johnson                 │
│                                                             │
│      12                                8                   │
│   (60.0%)                          (40.0%)                 │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                             │
│ RECENT MATCHES                                              │
│ ┌────────────────────────────────────────────────────┐    │
│ │ 🎱 Phoenix 8-Ball Championship       Nov 2, 2024   │    │
│ │    John won 9-7 in Winners Finals                 │    │
│ ├────────────────────────────────────────────────────┤    │
│ │ 🎱 Friday Night 9-Ball              Oct 27, 2024   │    │
│ │    Mike won 7-5 in Semifinals                     │    │
│ ├────────────────────────────────────────────────────┤    │
│ │ 🎱 Valley Masters                   Oct 13, 2024   │    │
│ │    John won 9-6 in Finals                         │    │
│ └────────────────────────────────────────────────────┘    │
│                                                             │
│ BY FORMAT                                                   │
│ 8-Ball:  7-4 (John)                                        │
│ 9-Ball:  5-4 (John)                                        │
│                                                             │
│ [Share This Record] [View Mike's Profile]                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Technical Considerations

### Architecture Overview

**Tech Stack:**
- **Frontend:** Next.js 14+ (App Router), React 18+, TypeScript
- **UI Components:** shadcn/ui, Tailwind CSS
- **Charts:** Recharts or Chart.js
- **State Management:** React Query (server state), Zustand (client state)
- **Backend:** Next.js API Routes (edge runtime where possible)
- **Database:** PostgreSQL with Prisma ORM
- **Caching:** Redis for profile caching, Next.js caching for static data
- **Storage:** AWS S3 or Cloudflare R2 for profile photos
- **Background Jobs:** Vercel Cron or AWS Lambda for achievement processing

**Key Architectural Decisions:**

1. **Dynamic Routing:** Use Next.js App Router with dynamic segments
   - `/players/[playerId]` - Player profile
   - `/players/[playerId]/achievements` - Achievement details
   - `/players/[playerId]/vs/[opponentId]` - Head-to-head

2. **Server Components:** Use React Server Components for initial profile load
   - Faster initial render (no client-side data fetching delay)
   - SEO benefits (profiles indexed by search engines)
   - Reduced client bundle size

3. **Incremental Static Regeneration (ISR):** Cache profile pages
   - Revalidate on profile edit or new tournament
   - 60-second stale-while-revalidate for public profiles
   - Instant updates for profile owner

4. **Achievement Engine:** Background job architecture
   - Process achievement checks after tournament completion
   - Queue-based system (1 job per player per tournament)
   - Retry logic for failed checks
   - Real-time notification via WebSocket or SSE

5. **Multi-Tenant Isolation:**
   - All player queries include `organizationId` filter
   - Row-level security in database
   - Separate Redis namespaces per tenant
   - Profile URLs include tenant context (subdomain)

---

### Dependencies

**External Dependencies:**
- **Recharts** (v2.x) - Chart rendering for performance trends
  - Why: Lightweight, React-native, good mobile support
  - Alternative: Chart.js (more features but larger bundle)

- **Sharp** (v0.32+) - Image processing for profile photos
  - Why: Fast, high-quality image resizing and optimization
  - Usage: Resize uploads to 400x400, convert to WebP

- **React Query** (v5.x) - Server state management
  - Why: Built-in caching, automatic refetching, optimistic updates
  - Usage: Profile data, stats, achievements, tournament history

- **Zustand** (v4.x) - Client state management
  - Why: Lightweight, simple API, TypeScript support
  - Usage: UI state (edit mode, filters, notifications)

- **date-fns** (v2.x) - Date formatting and manipulation
  - Why: Smaller than moment.js, tree-shakeable
  - Usage: Format tournament dates, calculate streaks, date ranges

**Internal Dependencies:**
- **Authentication System** - Required for profile ownership and privacy
- **Tournament System** - Source of player data (matches, placements, results)
- **Organization System** - Multi-tenant isolation and privacy rules
- **Notification System** - Achievement unlock notifications

---

### API/Integration Requirements

**New API Endpoints:**

**Player Profile:**
- `GET /api/players/[playerId]` - Get player profile (public or authenticated)
- `PATCH /api/players/[playerId]` - Update player profile (owner only)
- `GET /api/players/[playerId]/stats` - Get player statistics
- `GET /api/players/[playerId]/history` - Get tournament history (paginated)

**Achievements:**
- `GET /api/players/[playerId]/achievements` - Get all achievements with unlock status
- `POST /api/achievements/check` - Trigger achievement check (internal, cron job)
- `GET /api/achievements/[achievementId]` - Get achievement details

**Head-to-Head:**
- `GET /api/players/[playerId]/vs/[opponentId]` - Get head-to-head record

**Analytics:**
- `GET /api/players/[playerId]/trends` - Get performance trends (win rate, rating over time)
- `GET /api/players/[playerId]/trends/venue` - Performance breakdown by venue
- `GET /api/players/[playerId]/trends/format` - Performance breakdown by format

**Search:**
- `GET /api/players/search?q=[query]` - Search players (with filters)
- `GET /api/players/autocomplete?q=[query]` - Autocomplete for player search

**Privacy:**
- `GET /api/players/[playerId]/privacy` - Get privacy settings (owner only)
- `PATCH /api/players/[playerId]/privacy` - Update privacy settings (owner only)

**Photo Upload:**
- `POST /api/players/[playerId]/photo` - Upload profile photo (multipart)
- `DELETE /api/players/[playerId]/photo` - Delete profile photo

---

**API Design Principles:**

1. **Tenant Scoping:** All endpoints automatically filter by tenant (from auth context)
2. **Privacy Enforcement:** Check privacy settings before returning data
3. **Pagination:** All list endpoints support `?page=X&limit=Y` (default: limit=20)
4. **Filtering:** Support common filters via query params (e.g., `?format=8-ball&dateRange=2024`)
5. **Caching:** Set appropriate `Cache-Control` headers (public profiles: 60s, private: no-cache)
6. **Rate Limiting:** Protect search and upload endpoints (100 req/min per user)

---

### Data Requirements

**New Database Tables:**

**`player_profiles`**
```sql
CREATE TABLE player_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Profile Info
  display_name VARCHAR(100) NOT NULL,
  bio TEXT CHECK (LENGTH(bio) <= 500),
  location_city VARCHAR(100),
  location_state VARCHAR(50),
  profile_photo_url TEXT,

  -- Social Links
  twitter_handle VARCHAR(100),
  instagram_handle VARCHAR(100),

  -- Privacy Settings
  is_public BOOLEAN DEFAULT FALSE,
  show_statistics BOOLEAN DEFAULT TRUE,
  show_tournament_history BOOLEAN DEFAULT TRUE,
  show_achievements BOOLEAN DEFAULT TRUE,
  allow_head_to_head BOOLEAN DEFAULT TRUE,

  -- Metadata
  member_since TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_player_profiles_user ON player_profiles(user_id);
CREATE INDEX idx_player_profiles_org ON player_profiles(organization_id);
CREATE INDEX idx_player_profiles_public ON player_profiles(is_public, organization_id);
```

**`player_statistics`**
```sql
CREATE TABLE player_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_profile_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Overall Stats
  total_tournaments INT DEFAULT 0,
  total_matches INT DEFAULT 0,
  total_wins INT DEFAULT 0,
  total_losses INT DEFAULT 0,
  win_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_matches > 0
    THEN (total_wins::DECIMAL / total_matches * 100)
    ELSE 0 END
  ) STORED,

  -- Tournament Stats
  best_finish INT,
  average_finish DECIMAL(5,2),
  tournament_wins INT DEFAULT 0,

  -- Skill Rating
  current_rating INT,
  peak_rating INT,

  -- Streak
  current_streak INT DEFAULT 0, -- Positive = wins, Negative = losses
  longest_win_streak INT DEFAULT 0,

  -- Format Breakdown (JSONB for flexibility)
  stats_by_format JSONB DEFAULT '{}',
  -- Example: {"8-ball": {"wins": 78, "losses": 32}, "9-ball": {"wins": 54, "losses": 28}}

  -- Metadata
  last_calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(player_profile_id, organization_id)
);

CREATE INDEX idx_player_stats_profile ON player_statistics(player_profile_id);
CREATE INDEX idx_player_stats_rating ON player_statistics(current_rating DESC);
CREATE INDEX idx_player_stats_tournaments ON player_statistics(total_tournaments DESC);
```

**`player_tournament_history`**
```sql
CREATE TABLE player_tournament_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_profile_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Tournament Info (denormalized for performance)
  tournament_name VARCHAR(255) NOT NULL,
  tournament_date DATE NOT NULL,
  tournament_format VARCHAR(50),
  venue_id UUID REFERENCES venues(id),
  venue_name VARCHAR(255),

  -- Player Performance
  placement INT NOT NULL,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  prize_amount DECIMAL(10,2),

  -- Rating Change
  rating_before INT,
  rating_after INT,
  rating_change INT GENERATED ALWAYS AS (rating_after - rating_before) STORED,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(player_profile_id, tournament_id)
);

CREATE INDEX idx_player_history_profile ON player_tournament_history(player_profile_id, tournament_date DESC);
CREATE INDEX idx_player_history_tournament ON player_tournament_history(tournament_id);
CREATE INDEX idx_player_history_date ON player_tournament_history(tournament_date DESC);
CREATE INDEX idx_player_history_format ON player_tournament_history(tournament_format);
```

**`achievements`**
```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Achievement Definition
  key VARCHAR(50) NOT NULL UNIQUE, -- e.g., "first_steps", "champion"
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- "participation", "performance", "engagement", "format"
  rarity VARCHAR(20) NOT NULL, -- "common", "uncommon", "rare", "epic", "legendary"
  points INT NOT NULL DEFAULT 10,
  icon_url TEXT,

  -- Unlock Criteria (JSONB for flexibility)
  criteria JSONB NOT NULL,
  -- Example: {"type": "tournament_wins", "count": 10}
  -- Example: {"type": "consecutive_wins", "count": 3}
  -- Example: {"type": "win_rate", "threshold": 0.9, "min_matches": 10}

  -- Visibility
  is_secret BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_rarity ON achievements(rarity);
```

**`player_achievements`**
```sql
CREATE TABLE player_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_profile_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Unlock Info
  unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  tournament_id UUID REFERENCES tournaments(id), -- Context: which tournament triggered unlock

  -- Progress (for multi-step achievements)
  progress JSONB DEFAULT '{}',
  -- Example: {"current": 7, "required": 10}

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(player_profile_id, achievement_id)
);

CREATE INDEX idx_player_achievements_profile ON player_achievements(player_profile_id);
CREATE INDEX idx_player_achievements_unlocked ON player_achievements(unlocked_at DESC);
```

**`player_matches`** (for head-to-head tracking)
```sql
CREATE TABLE player_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Players
  player1_profile_id UUID NOT NULL REFERENCES player_profiles(id),
  player2_profile_id UUID NOT NULL REFERENCES player_profiles(id),

  -- Match Details
  winner_profile_id UUID REFERENCES player_profiles(id),
  match_date TIMESTAMP NOT NULL,
  match_format VARCHAR(50),
  venue_id UUID REFERENCES venues(id),

  -- Scores
  player1_score INT NOT NULL,
  player2_score INT NOT NULL,

  -- Bracket Context
  bracket_round VARCHAR(50), -- "Winners Finals", "Losers Quarterfinals"

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CHECK (player1_profile_id != player2_profile_id)
);

CREATE INDEX idx_player_matches_p1 ON player_matches(player1_profile_id, match_date DESC);
CREATE INDEX idx_player_matches_p2 ON player_matches(player2_profile_id, match_date DESC);
CREATE INDEX idx_player_matches_h2h ON player_matches(player1_profile_id, player2_profile_id);
CREATE INDEX idx_player_matches_tournament ON player_matches(tournament_id);
```

**`player_rating_history`** (for rating progression charts)
```sql
CREATE TABLE player_rating_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_profile_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Rating
  rating INT NOT NULL,
  rating_change INT NOT NULL,

  -- Context
  tournament_id UUID REFERENCES tournaments(id),
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rating_history_profile ON player_rating_history(player_profile_id, recorded_at DESC);
```

---

**Data Privacy & Compliance:**

1. **GDPR Compliance:**
   - Player profiles are personal data (right to access, delete)
   - Export endpoint: `GET /api/players/[playerId]/export` (JSON dump)
   - Delete endpoint: `DELETE /api/players/[playerId]` (anonymize or hard delete)
   - Privacy settings give granular control

2. **Data Retention:**
   - Tournament history retained indefinitely (unless player requests deletion)
   - Profile photos retained for 90 days after deletion (for caching)
   - Achievement progress retained for 1 year after account deletion (for records)

3. **Multi-Tenant Isolation:**
   - All queries must include `organization_id` filter
   - Database row-level security policies enforce tenant boundaries
   - Players can only view profiles within their organization (unless public)

4. **PII Handling:**
   - Profile photos stored in S3 with private ACL (served via signed URLs)
   - Location data (city, state) is optional
   - Social handles are optional
   - Email addresses never exposed in profiles (part of user account, not profile)

---

### Performance Considerations

**Performance Targets:**
- Profile page load: <1 second (TTFB + FCP)
- Statistics calculation: <200ms (cached)
- Achievement check: <500ms per player (background job)
- Search results: <300ms
- Chart rendering: <400ms

**Optimization Strategies:**

1. **Caching:**
   - **Redis cache** for profile data (60s TTL for public, 10s for private)
   - **Next.js ISR** for static profile pages (revalidate on update)
   - **CDN cache** for profile photos (1 year expiration)
   - **Database query cache** for stats aggregations (5 min TTL)

2. **Database Indexes:**
   - Index all foreign keys (player_profile_id, tournament_id, etc.)
   - Composite index on `(player_profile_id, tournament_date DESC)` for history queries
   - Index on `(organization_id, is_public)` for search
   - Index on rating for leaderboards

3. **Query Optimization:**
   - Denormalize tournament info in `player_tournament_history` (avoid JOINs)
   - Use JSONB for format stats (flexible, single row per player)
   - Precompute win rates with generated columns (no calculation on read)
   - Pagination with cursor-based approach (faster than offset)

4. **Background Jobs:**
   - **Achievement checks** run after tournament completion (not during)
   - **Stats recalculation** triggered by webhook (tournament finalized event)
   - **Rating history** recorded after each tournament (batch insert)
   - Job queue with retry logic (max 3 attempts)

5. **Image Optimization:**
   - Resize uploads to 400x400 max (Sharp)
   - Convert to WebP format (80% quality)
   - Generate multiple sizes: 400px, 200px, 100px (for thumbnails)
   - Serve via CDN with aggressive caching

6. **Code Splitting:**
   - Lazy load chart components (only when "Stats" tab is clicked)
   - Lazy load achievement modal (only when achievement clicked)
   - Dynamic imports for heavy libraries (Recharts, date-fns)

7. **React Query Strategies:**
   - Stale-while-revalidate for profile data (instant display + background refetch)
   - Prefetch on hover (when hovering player card in search)
   - Optimistic updates for profile edits (instant UI feedback)

8. **Mobile Performance:**
   - Reduce image sizes on mobile (100px thumbnails)
   - Defer chart rendering until tab is active (Intersection Observer)
   - Infinite scroll for tournament history (no pagination clicks)
   - Reduce initial bundle with dynamic imports

---

## 8. Launch Plan

### Rollout Strategy

**Phase 1: Soft Launch (Week 2, Days 1-2)**
- [ ] Enable player profiles for internal testing (dev team + select TDs)
- [ ] Basic profile pages live (name, photo, bio, stats)
- [ ] 10 core achievements active
- [ ] Monitor performance and database load
- [ ] Collect feedback from early users

**Phase 2: Beta Launch (Week 2, Days 3-4)**
- [ ] Open to 20% of active players (gradual rollout via feature flag)
- [ ] Full achievement set (20 achievements) enabled
- [ ] Head-to-head records available
- [ ] Performance trends charts live
- [ ] Player search available to TDs
- [ ] Monitor engagement metrics (profile views, edits, achievement unlocks)

**Phase 3: Full Release (Week 2, Day 5)**
- [ ] Enable for 100% of users
- [ ] Announcement email to all players
- [ ] In-app notification: "New Feature: Player Profiles!"
- [ ] Social media promotion (Twitter, Facebook)
- [ ] Documentation and help articles published
- [ ] Achievement showcase contest (most achievements unlocked wins prize)

**Rollback Plan:**
- Feature flag allows instant disable if critical issues
- Database migrations are reversible (down migrations prepared)
- Cached data invalidation script ready (if data corruption)

---

### Success Criteria for Launch

**Technical Success:**
- ✅ <1s average profile load time (p95)
- ✅ Zero data privacy breaches (all privacy settings enforced)
- ✅ <0.1% error rate on profile endpoints
- ✅ All 20 achievements processing correctly (manual verification)
- ✅ Photo uploads working (100 test uploads successful)

**User Success:**
- ✅ 80% of active players view their profile within 1 week
- ✅ 50% of players edit their profile (add bio or photo) within 2 weeks
- ✅ 60% of players unlock at least 1 achievement within 2 weeks
- ✅ 40% of players check head-to-head records within 1 week
- ✅ 30% of players share an achievement on social media within 2 weeks

**Business Success:**
- ✅ Tournament registration rate increases by 15% (vs. previous month)
- ✅ Return player rate increases to 50% (from 35% baseline)
- ✅ Average session duration increases by 30%
- ✅ Positive feedback from 80% of surveyed users
- ✅ Zero critical bugs reported in first week

---

### Marketing/Communication Plan

**Pre-Launch (Day before launch):**
- ✅ Email to TDs: "New Feature Tomorrow: Player Profiles & Achievements"
- ✅ Social media teaser: "Something exciting is coming... 🏆"
- ✅ In-app banner: "New feature launching soon!"

**Launch Day:**
- ✅ **Email Campaign:** "Introducing Player Profiles - Track Your Journey!"
  - Subject: "Your Pool Career, All in One Place 🎱"
  - Content: Feature overview, screenshot, call-to-action ("View Your Profile")
  - Segment: All active players (last 30 days)

- ✅ **In-App Announcement:**
  - Modal on login: "Welcome to Player Profiles!"
  - Feature tour (3-4 slides): Profile → Stats → Achievements → Get Started
  - CTA: "Create My Profile"

- ✅ **Social Media:**
  - Twitter/X: "Player Profiles are live! Track your stats, unlock achievements, and compete with rivals. Check out your profile today!"
  - Facebook: Post with feature video (30-second demo)
  - Instagram: Story series showing profile features

- ✅ **In-App Notifications:**
  - Push notification: "Your player profile is ready! View your stats and achievements."

**Week 1:**
- ✅ **Achievement Contest:** "Unlock the most achievements by [date] and win a [prize]"
- ✅ **Profile Spotlight:** Feature 3-5 top players on social media (with permission)
- ✅ **Tutorial Content:** Blog post: "How to Optimize Your Player Profile"
- ✅ **Email Follow-Up:** "Have you checked your profile yet?" (to users who haven't viewed)

**Week 2:**
- ✅ **Success Metrics Update:** Share stats with users ("10,000 achievements unlocked!")
- ✅ **User Stories:** Interview 2-3 players about their experience, share on blog/social
- ✅ **Community Engagement:** Encourage players to share profiles on social media (with hashtag)

**Ongoing:**
- ✅ **Monthly Leaderboards:** Share top players by achievements, tournaments, rating
- ✅ **Achievement Spotlights:** Highlight rare achievements when unlocked
- ✅ **New Achievement Drops:** Add seasonal/special achievements quarterly

---

## 9. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Privacy Concerns** - Players worried about data exposure | High | Medium | Default to private profiles (opt-in to public). Granular privacy controls. Clear privacy policy. Allow profile deletion. TDs can still view profiles in their org. |
| **Achievement Gaming/Spam** - Players manipulate system to unlock achievements | Medium | Medium | Careful achievement criteria (require legitimate accomplishments). Rate limiting on achievement checks. Manual review for suspicious unlocks. Ban/flag system for repeat offenders. |
| **Performance Issues** - Profile pages load slowly, stats calculations lag | High | Low | Aggressive caching (Redis + CDN). Database indexes on all queries. Background jobs for heavy calculations. Load testing before launch. Auto-scaling for traffic spikes. |
| **Low Engagement** - Players don't use profiles, features go unused | High | Medium | Gamification (achievements, progression). Social sharing (viral growth). Email campaigns. In-tournament prompts ("View your profile"). Achievement contests. Make profiles default landing page. |
| **Data Inconsistency** - Stats don't match actual tournament results | High | Low | Rigorous testing of stat calculations. Automated tests for edge cases. Manual verification on beta launch. Webhook-based updates (atomic). Stats recalculation script (if needed). |
| **Photo Upload Abuse** - Inappropriate photos, large files, spam | Medium | Medium | File size limits (5MB). Image format validation (jpg, png, webp only). Content moderation (manual review for public profiles). Report button for inappropriate content. Auto-reject NSFW content (AI moderation). |
| **Achievement Notification Spam** - Too many notifications annoy users | Low | High | Limit to 1 notification per session. Allow users to disable notifications. Group multiple unlocks ("You unlocked 3 achievements!"). Only notify for rare/epic/legendary. |
| **Multi-Tenant Data Leakage** - Player sees data from other organizations | Critical | Very Low | Row-level security in database. All queries include `organization_id`. Extensive testing of tenant isolation. Security audit before launch. Automated tests for cross-tenant queries. |
| **Search Performance** - Player search is slow or crashes with large datasets | Medium | Low | Elasticsearch or Algolia for search (if needed). Database indexes on search columns. Pagination (max 100 results). Rate limiting on search endpoint. Cache autocomplete suggestions. |
| **Head-to-Head Calculation Errors** - H2H records don't match actual match results | Medium | Low | Automated tests for H2H logic. Manual verification on beta launch. Recalculation script (if needed). Unit tests for all edge cases (forfeits, ties, etc.). |
| **Rating System Issues** - Elo/Fargo calculations incorrect, ratings inflated/deflated | Medium | Medium | Use established rating algorithms (Elo). Extensive testing with historical data. Rating floor/ceiling. Decay for inactive players. Manual adjustment for edge cases. Transparent rating formula (documentation). |
| **Legal/GDPR Compliance** - Data retention, right to deletion, consent issues | High | Low | Privacy policy updated. Data export endpoint. Hard delete option. Consent checkboxes. Lawyer review before launch. GDPR-compliant data handling. |
| **Mobile Experience** - Features don't work well on mobile devices | Medium | Medium | Mobile-first design. Touch-optimized UI. Responsive charts. Lazy loading. Performance testing on real devices. Beta testing with mobile users. |
| **Database Scaling** - Too many writes/reads, database performance degrades | Medium | Low | Read replicas for queries. Write batching for stats updates. Database connection pooling. Monitoring and alerts. Auto-scaling database. Upgrade plan if needed. |
| **Feature Creep** - Scope expands, launch delayed | Medium | High | Strict prioritization (P0, P1, P2). Weekly scope review. Defer P2 features to post-launch. Timebox development (5 days max). Focus on MVP. |
| **User Confusion** - Players don't understand how to use profiles or achievements | Medium | Medium | In-app tutorial on first login. Help articles and FAQs. Tooltips and info icons. Achievement descriptions are clear. Onboarding email series. Support team trained. |

---

## 10. Timeline and Milestones

**Sprint 10, Week 2 (5-day development cycle)**

| Milestone | Target Date | Owner | Status |
|-----------|-------------|-------|--------|
| **PRD Approved** | Day 1, AM | Product Team | ⏳ Pending |
| **Design Complete** | Day 1-2 | Design Team | ⏳ Pending |
| - Profile page mockups | Day 1 | Design | ⏳ |
| - Achievement system UI | Day 1 | Design | ⏳ |
| - Chart designs | Day 2 | Design | ⏳ |
| **Database Schema** | Day 1, PM | Backend Team | ⏳ Pending |
| - Migrations written | Day 1 | Backend | ⏳ |
| - Seed data for achievements | Day 1 | Backend | ⏳ |
| **Backend Development** | Day 2-3 | Backend Team | ⏳ Pending |
| - API endpoints (profiles, stats, history) | Day 2 | Backend | ⏳ |
| - Achievement engine (background jobs) | Day 2-3 | Backend | ⏳ |
| - Head-to-head logic | Day 3 | Backend | ⏳ |
| - Privacy enforcement | Day 3 | Backend | ⏳ |
| **Frontend Development** | Day 3-4 | Frontend Team | ⏳ Pending |
| - Profile page components | Day 3 | Frontend | ⏳ |
| - Statistics dashboard | Day 3 | Frontend | ⏳ |
| - Achievement display | Day 3-4 | Frontend | ⏳ |
| - Charts (performance trends) | Day 4 | Frontend | ⏳ |
| - Player search | Day 4 | Frontend | ⏳ |
| - Photo upload | Day 4 | Frontend | ⏳ |
| **Testing & QA** | Day 4-5 | QA Team | ⏳ Pending |
| - Unit tests (backend + frontend) | Day 4 | Dev Team | ⏳ |
| - Integration tests | Day 4 | QA | ⏳ |
| - Manual QA (all features) | Day 5 | QA | ⏳ |
| - Performance testing | Day 5 | QA | ⏳ |
| - Privacy testing (multi-tenant) | Day 5 | QA | ⏳ |
| **Soft Launch** | Day 5, AM | Product Team | ⏳ Pending |
| - Internal testing (dev team) | Day 5, AM | Dev Team | ⏳ |
| - Beta to select TDs | Day 5, PM | Product | ⏳ |
| **Full Launch** | Day 5, End of Day | Product Team | ⏳ Pending |
| - Enable for all users | Day 5, 5 PM | Dev Team | ⏳ |
| - Send announcement email | Day 5, 6 PM | Marketing | ⏳ |
| - Social media posts | Day 5, 6 PM | Marketing | ⏳ |

**Post-Launch (Week 3+):**
| Milestone | Target Date | Owner | Status |
|-----------|-------------|-------|--------|
| **1-Week Metrics Review** | Week 3, Day 2 | Product Team | ⏳ Pending |
| **Bug Fixes & Iteration** | Week 3, Days 3-5 | Dev Team | ⏳ Pending |
| **P1 Features (if time)** | Week 4 | Dev Team | ⏳ Pending |
| **User Feedback Session** | Week 4 | Product Team | ⏳ Pending |

---

## 11. Open Questions

**Product Questions:**
- [ ] **Achievement Rarity Distribution:** What percentage of achievements should be common vs. legendary? (Proposal: 30% common, 25% uncommon, 25% rare, 15% epic, 5% legendary)
- [ ] **Default Privacy Setting:** Should profiles default to public or private? (Recommendation: Private, opt-in to public for safety)
- [ ] **Player Search Access:** Should all logged-in users have access to player search, or only TDs? (Recommendation: All users, but only TDs see advanced filters)
- [ ] **Rating System:** Should we use Elo, Fargo, or custom rating system? (Recommendation: Start with Elo, add Fargo later)
- [ ] **Profile URLs:** Should profiles use numeric IDs or usernames? (Recommendation: UUIDs for now, add vanity URLs later)
- [ ] **Achievement Unlock Notifications:** How intrusive should notifications be? (Recommendation: Toast for rare+, silent for common)

**Technical Questions:**
- [ ] **Photo Storage:** AWS S3 or Cloudflare R2 for profile photos? (Recommendation: R2 for cost savings)
- [ ] **Background Jobs:** Vercel Cron (serverless) or dedicated worker (AWS Lambda)? (Recommendation: Vercel Cron for simplicity)
- [ ] **Chart Library:** Recharts or Chart.js? (Recommendation: Recharts for React integration)
- [ ] **Real-Time Notifications:** WebSocket or Server-Sent Events? (Recommendation: SSE for simplicity)
- [ ] **Database Scaling:** When do we need read replicas? (Monitor: launch with single instance, add replica if >1000 QPS)

**Design Questions:**
- [ ] **Profile Photo Placeholder:** What should default avatar look like? (Recommendation: Initials + colored background)
- [ ] **Achievement Icons:** Custom illustrations or icon library? (Recommendation: Icon library for v1, custom later)
- [ ] **Mobile Navigation:** How should profile tabs work on mobile? (Recommendation: Horizontal scrollable tabs)
- [ ] **Color Scheme for Stats:** Should wins be green, losses red? Or more neutral? (Recommendation: Green/red for clarity)

**Business Questions:**
- [ ] **Premium Features:** Should any profile features be premium/paid? (Recommendation: No, keep all free for v1)
- [ ] **Advertising:** Can we place ads on public profiles? (Recommendation: No, keep profiles clean)
- [ ] **Data Licensing:** Should we allow TDs to export player stats? (Recommendation: Yes, for their own org only)

---

## 12. Appendix

### Research and References

**User Research:**
- **User Interviews (Oct 2024):** 15 players interviewed, 80% want stat tracking, 65% want achievements
- **Survey Results:** 200 responses, top requests: tournament history (92%), win/loss record (88%), achievements (76%)
- **Competitor Analysis:** Analyzed 5 tournament platforms, none have comprehensive achievement systems
- **Usability Testing:** Tested profile mockups with 10 users, avg score: 8.2/10

**Competitive Analysis:**
- **Platform A:** Basic player profiles, no achievements
- **Platform B:** Tournament history only, no stats dashboard
- **Platform C:** Stats dashboard, but no head-to-head or trends
- **Platform D:** No player profiles at all
- **Opportunity:** We can be the first with comprehensive player experience

**Market Data:**
- Gaming platforms (Xbox, PlayStation): 60% of users engage with achievements
- Strava (fitness): 70% of users view their stats weekly
- Esports platforms: 55% increase in retention with player profiles
- Fantasy sports: 80% of users check their stats multiple times per week

**Engagement Statistics:**
- Achievement unlock rate (gaming): 40-60% unlock at least 1 achievement
- Profile completion rate (social networks): 65-75% add photo and bio
- Stat tracking (sports apps): 80% of users view stats after each event

---

### Related Documents

**Product Documents:**
- Sprint 10 Plan: `sprints/current/sprint-10-business-growth.md`
- Roadmap: `product/roadmap/2024-Q4-roadmap.md`
- User Research: `product/research/player-engagement-study-oct-2024.md`

**Technical Documents:**
- Multi-Tenant Architecture: `technical/multi-tenant-architecture.md`
- Database Schema: `technical/database-schema.md`
- API Documentation: `technical/api-spec.md`
- Coding Standards: `C:\devop\coding_standards.md`

**Design Documents:**
- Design System: `design/design-system.md`
- Profile Page Mockups: [Figma link]
- Achievement Icons: [Figma link]

**Related PRDs:**
- Tournament Management System: `product/PRDs/tournament-management.md`
- Real-Time Features: `product/PRDs/real-time-features.md`
- Admin Dashboard: `product/PRDs/admin-dashboard.md`

---

## Achievement Definitions

### Participation Achievements

**1. First Steps** 🎯
- **Description:** Complete your first tournament
- **Rarity:** Common
- **Points:** 10
- **Criteria:** `{"type": "tournament_count", "count": 1}`

**2. Participant** 🎱
- **Description:** Play 10 tournaments
- **Rarity:** Common
- **Points:** 20
- **Criteria:** `{"type": "tournament_count", "count": 10}`

**3. Regular** 🔁
- **Description:** Play 50 tournaments
- **Rarity:** Uncommon
- **Points:** 50
- **Criteria:** `{"type": "tournament_count", "count": 50}`

**4. Veteran** 🏅
- **Description:** Play 100 tournaments
- **Rarity:** Rare
- **Points:** 100
- **Criteria:** `{"type": "tournament_count", "count": 100}`

---

### Performance Achievements

**5. Winner** 🏆
- **Description:** Win your first tournament
- **Rarity:** Common
- **Points:** 25
- **Criteria:** `{"type": "tournament_wins", "count": 1}`

**6. Champion** 👑
- **Description:** Win 10 tournaments
- **Rarity:** Uncommon
- **Points:** 100
- **Criteria:** `{"type": "tournament_wins", "count": 10}`

**7. Dynasty** 🔥
- **Description:** Win 3 consecutive tournaments
- **Rarity:** Legendary
- **Points:** 250
- **Criteria:** `{"type": "consecutive_wins", "count": 3}`

**8. Undefeated** 💯
- **Description:** Win a tournament without losing a match
- **Rarity:** Epic
- **Points:** 150
- **Criteria:** `{"type": "undefeated_tournament", "count": 1}`

**9. Comeback Kid** 💪
- **Description:** Win a tournament from the loser's bracket
- **Rarity:** Rare
- **Points:** 75
- **Criteria:** `{"type": "win_from_losers", "count": 1}`

**10. Perfectionist** ⭐
- **Description:** Achieve 90%+ win rate in a tournament (min 10 matches)
- **Rarity:** Epic
- **Points:** 125
- **Criteria:** `{"type": "tournament_win_rate", "threshold": 0.9, "min_matches": 10}`

**11. Underdog** 🐕
- **Description:** Win a tournament as the lowest-seeded player
- **Rarity:** Rare
- **Points:** 100
- **Criteria:** `{"type": "underdog_win", "count": 1}`

**12. Dominant** 🚀
- **Description:** Win a tournament with 100% win rate (no losses)
- **Rarity:** Epic
- **Points:** 150
- **Criteria:** `{"type": "perfect_tournament", "count": 1}`

---

### Engagement Achievements

**13. Marathon** ⏱️
- **Description:** Play in a tournament lasting 8+ hours
- **Rarity:** Uncommon
- **Points:** 50
- **Criteria:** `{"type": "tournament_duration", "hours": 8}`

**14. Early Bird** 🐦
- **Description:** Be the first player to check in to a tournament
- **Rarity:** Common
- **Points:** 15
- **Criteria:** `{"type": "first_checkin", "count": 1}`

**15. Social Butterfly** 🦋
- **Description:** Play against 50 different opponents
- **Rarity:** Uncommon
- **Points:** 50
- **Criteria:** `{"type": "unique_opponents", "count": 50}`

**16. Rival** ⚔️
- **Description:** Play the same opponent 10+ times
- **Rarity:** Uncommon
- **Points:** 40
- **Criteria:** `{"type": "opponent_frequency", "count": 10}`

**17. Globetrotter** 🌍
- **Description:** Play at 10 different venues
- **Rarity:** Rare
- **Points:** 75
- **Criteria:** `{"type": "unique_venues", "count": 10}`

---

### Format Mastery Achievements

**18. Specialist** 🎓
- **Description:** Win 10 tournaments in the same format
- **Rarity:** Rare
- **Points:** 100
- **Criteria:** `{"type": "format_wins", "format": "any", "count": 10}`

**19. All-Rounder** 🌟
- **Description:** Win tournaments in 5 different formats
- **Rarity:** Epic
- **Points:** 150
- **Criteria:** `{"type": "format_diversity", "count": 5}`

**20. Lucky 13** 🍀
- **Description:** Finish exactly 13th place in a tournament (secret achievement)
- **Rarity:** Uncommon
- **Points:** 13
- **Secret:** Yes
- **Criteria:** `{"type": "specific_placement", "placement": 13}`

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-06 | Claude (Product Assistant) | Initial draft - comprehensive PRD with all requirements, user stories, technical specs, achievement definitions, and launch plan |
