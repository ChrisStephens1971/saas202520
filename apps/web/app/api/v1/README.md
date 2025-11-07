# Public API v1 - Routes Index

## Implemented Endpoints (Agent 2)

### Tournaments (5 endpoints)
- `GET /api/v1/tournaments` - List tournaments with pagination
- `GET /api/v1/tournaments/:id` - Get tournament details
- `GET /api/v1/tournaments/:id/matches` - List tournament matches
- `GET /api/v1/tournaments/:id/players` - List tournament players
- `GET /api/v1/tournaments/:id/bracket` - Get tournament bracket

### Players (4 endpoints)
- `GET /api/v1/players` - List players with pagination
- `GET /api/v1/players/:id` - Get player profile
- `GET /api/v1/players/:id/history` - Get player tournament history
- `GET /api/v1/players/:id/stats` - Get player statistics

### Matches (2 endpoints)
- `GET /api/v1/matches` - List matches with pagination
- `GET /api/v1/matches/:id` - Get match details

## Pre-existing Endpoints

### Leaderboards
- `GET /api/v1/leaderboards` - Get leaderboards
- `GET /api/v1/leaderboards/format/:format` - Get format-specific leaderboard
- `GET /api/v1/leaderboards/venue/:id` - Get venue-specific leaderboard

### Venues
- `GET /api/v1/venues` - List venues
- `GET /api/v1/venues/:id` - Get venue details
- `GET /api/v1/venues/:id/tournaments` - Get venue tournaments

### Webhooks
- `POST /api/v1/webhooks/:id/test` - Test webhook (Agent 3)

## Documentation

- **Testing Guide:** `/docs/api/public-api-v1-testing.md`
- **Implementation Summary:** `/docs/api/AGENT-2-IMPLEMENTATION-SUMMARY.md`
- **Type Definitions:** `/apps/web/lib/api/types/public-api.types.ts`
- **Validation Schemas:** `/apps/web/lib/api/validation/public-api.validation.ts`
- **Helper Functions:** `/apps/web/lib/api/public-api-helpers.ts`

## Authentication

All endpoints require API key authentication (implemented by Agent 1).
Currently using placeholder `orgId` query parameter for testing.

## Rate Limiting

Rate limiting headers included in all responses:
- `X-RateLimit-Limit`: Requests allowed per window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Reset timestamp
