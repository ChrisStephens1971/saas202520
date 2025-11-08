# Tournament Bracket Visualization

## Overview

The Tournament Bracket Visualization feature provides real-time, interactive bracket displays for single and double elimination tournaments. This feature allows users to view tournament progress, match results, and participant advancement through rounds.

## Features

### Single Elimination Brackets
- Linear progression from first round to finals
- Clear winner path visualization
- Match status indicators (pending, in progress, completed)

### Double Elimination Brackets
- Separate winners and losers brackets
- Second-chance progression tracking
- Grand finals representation

### Match Cards Display
- Player names with seed numbers
- Current scores (for completed matches)
- Winner highlighting (green background + checkmark)
- Status-based color coding:
  - **Green border**: Completed match
  - **Blue border**: In progress match
  - **Gray border**: Pending match

### Real-time Updates
- Fetches data from bracket API endpoint
- Loading states with spinner
- Error states with retry functionality
- Empty state messaging

## User Guide

### Accessing Brackets

**For Admin Users:**
1. Navigate to Admin Dashboard
2. Go to Tournaments section
3. Click on a tournament name
4. Scroll to "Tournament Bracket" section
5. Bracket displays automatically for single/double elimination formats

### Reading the Bracket

#### Match Information
Each match card shows:
- **Top**: Player A name + seed (if applicable)
- **Middle**: "vs" separator
- **Bottom**: Player B name + seed (if applicable)
- **Right side**: Scores (once match is completed)
- **Footer**: Match status

#### Understanding Status
- **Pending**: Match has not started (players may be "TBD")
- **In Progress**: Match is currently being played
- **Final**: Match is completed, winner determined

#### Winner Identification
- Winner's row has green background
- Green checkmark (✓) appears next to winner's name
- Winner's score appears in bold

### Bracket Layout

**Round Organization:**
- Rounds display left to right
- First round on the left
- Finals on the right
- Each round shows its name (e.g., "Quarterfinals", "Semifinals", "Finals")

**Double Elimination:**
- Winners Bracket displayed first (top)
- Losers Bracket displayed below
- Clear section headers distinguish the two brackets

### Responsive Design
- Horizontal scrolling for wide brackets
- Touch-friendly on mobile devices
- Consistent card sizing across devices

## Technical Details

### Component Location
```
apps/web/components/TournamentBracket.tsx
```

### Usage
```tsx
import TournamentBracket from '@/components/TournamentBracket';

<TournamentBracket tournamentId="clx123..." />
```

### API Integration
- **Endpoint**: `GET /api/v1/tournaments/{tournamentId}/bracket`
- **Response**: BracketStructure object containing:
  - `winnersBracket`: Array of rounds with matches
  - `losersBracket`: Optional array for double elimination
  - Match details: players, scores, status, winners

### Data Structure
```typescript
interface BracketStructure {
  winnersBracket: BracketRound[];
  losersBracket?: BracketRound[];
}

interface BracketRound {
  round: number;
  name: string;
  matches: BracketMatchNode[];
}

interface BracketMatchNode {
  matchId: string;
  playerA: { id: string; name: string; seed?: number } | null;
  playerB: { id: string; name: string; seed?: number } | null;
  score: { playerA: number; playerB: number };
  status: 'pending' | 'in_progress' | 'completed';
  winner: { id: string; name: string } | null;
}
```

## Integration Points

### Admin Dashboard
- Location: `apps/web/app/admin/tournaments/[id]/page.tsx`
- Displays for tournament formats: `single_elimination`, `double_elimination`
- Positioned after tournament description, before timeline

### Styling
- Dark theme support (uses theme-aware classes)
- Wrapped in white background card for contrast
- Responsive spacing with proper margins

## Common Use Cases

### Monitoring Tournament Progress
Admins can quickly view:
- How many matches remain
- Which matches are in progress
- Current round status
- Participant advancement

### Broadcasting/Display
Suitable for:
- Large screen displays at venues
- Live streaming overlays (with additional styling)
- Tournament announcements
- Results publication

### Player Information
Players can see:
- Their current opponent
- Their bracket position
- Potential future opponents
- Tournament path to finals

## Limitations & Future Enhancements

### Current Limitations
- Read-only display (no score entry from bracket)
- No bracket export/print functionality
- No zoom/pan controls for large brackets
- Connectors are static (no animated transitions)

### Planned Enhancements
- Click match card to edit score (admin only)
- Export bracket as image/PDF
- Zoom controls for tournaments with many participants
- Animated transitions when matches complete
- Real-time WebSocket updates (currently requires refresh)

## Troubleshooting

### Bracket Not Displaying
- **Check**: Tournament format is single or double elimination
- **Check**: Tournament has started (bracket generated)
- **Check**: API endpoint returns valid bracket data

### "No bracket data available yet" Message
- Bracket may not be generated until tournament starts
- Check tournament status (should be 'active' or later)
- Verify participants are registered

### Loading Spinner Persists
- Check network connection
- Verify API endpoint is accessible
- Check browser console for errors
- Try the "Retry" button if error displays

### Layout Issues
- Enable horizontal scrolling for large brackets
- Check viewport width (minimum 320px recommended)
- Verify CSS classes are loaded

## Related Documentation

- API Documentation: `docs/api/PUBLIC-API-V1.md`
- Admin Dashboard Guide: `docs/admin/ADMIN-DASHBOARD.md`
- Tournament Management: `docs/features/TOURNAMENT-MANAGEMENT.md`

## Support

For issues or feature requests related to bracket visualization:
1. Check existing GitHub issues
2. Verify using latest codebase version
3. Include tournament ID and format when reporting issues
4. Provide browser/device information for layout issues

---

**Last Updated**: 2025-11-08
**Feature Version**: 1.0
**Component**: TournamentBracket.tsx
**Status**: ✅ Production Ready
