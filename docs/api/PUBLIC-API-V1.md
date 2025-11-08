# Public API v1 Documentation

## Overview

The Tournament Platform Public API v1 provides programmatic access to tournament data, player statistics, leaderboards, and venue information. All endpoints require API key authentication and enforce tenant isolation.

**Base URL**: `https://your-domain.com/api/v1`

## Authentication

### API Key Authentication

All API requests must include an API key in the Authorization header using Bearer token format.

```http
Authorization: Bearer YOUR_API_KEY
```

### Error Responses

**401 Unauthorized**
```json
{
  "error": "Missing API key"
}
```

**401 Unauthorized**
```json
{
  "error": "Invalid API key"
}
```

**401 Unauthorized**
```json
{
  "error": "API key has expired"
}
```

### Security Features
- API keys are hashed using bcrypt
- Keys can have expiration dates
- Keys can be activated/deactivated
- Rate limiting enforced per tier
- Tenant data isolation

## Endpoints

### Tournaments

#### List Tournaments
```http
GET /api/v1/tournaments
```

**Query Parameters:**
- `status` (string): Filter by tournament status (registration, active, completed, cancelled)
- `format` (string): Filter by tournament format (single_elimination, double_elimination, etc.)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "clx123...",
      "name": "Spring Championship 2025",
      "format": "single_elimination",
      "status": "active",
      "start_date": "2025-03-15T10:00:00Z",
      "player_count": 32,
      "venue_id": "venue123"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

#### Get Tournament Details
```http
GET /api/v1/tournaments/{tournamentId}
```

**Response:**
```json
{
  "data": {
    "id": "clx123...",
    "name": "Spring Championship 2025",
    "slug": "spring-championship-2025",
    "format": "single_elimination",
    "game_type": "8-ball",
    "status": "active",
    "race_to_wins": 3,
    "max_players": 32,
    "player_count": 32,
    "match_count": 31,
    "completed_match_count": 15,
    "start_date": "2025-03-15T10:00:00Z",
    "description": "Annual spring tournament",
    "venue": {
      "id": "venue123",
      "name": "Downtown Billiards"
    }
  }
}
```

#### Get Tournament Bracket
```http
GET /api/v1/tournaments/{tournamentId}/bracket
```

**Response:**
```json
{
  "data": {
    "winnersBracket": [
      {
        "round": 1,
        "name": "Round 1",
        "matches": [
          {
            "matchId": "match123",
            "playerA": {
              "id": "player1",
              "name": "John Doe",
              "seed": 1
            },
            "playerB": {
              "id": "player2",
              "name": "Jane Smith",
              "seed": 16
            },
            "score": {
              "playerA": 3,
              "playerB": 1
            },
            "status": "completed",
            "winner": {
              "id": "player1",
              "name": "John Doe"
            }
          }
        ]
      }
    ],
    "losersBracket": []
  }
}
```

#### Get Tournament Matches
```http
GET /api/v1/tournaments/{tournamentId}/matches
```

**Query Parameters:**
- `status` (string): Filter by match status
- `page`, `limit`: Pagination

#### Get Tournament Players
```http
GET /api/v1/tournaments/{tournamentId}/players
```

**Query Parameters:**
- `page`, `limit`: Pagination

### Matches

#### List Matches
```http
GET /api/v1/matches
```

**Query Parameters:**
- `tournament_id` (string): Filter by tournament
- `status` (string): Filter by match status
- `player_id` (string): Filter by player participation
- `page`, `limit`: Pagination

#### Get Match Details
```http
GET /api/v1/matches/{matchId}
```

**Response:**
```json
{
  "data": {
    "id": "match123",
    "tournament_id": "clx123...",
    "round": 2,
    "table_number": 5,
    "state": "completed",
    "player_a": {
      "id": "player1",
      "name": "John Doe"
    },
    "player_b": {
      "id": "player2",
      "name": "Jane Smith"
    },
    "score": {
      "player_a": 3,
      "player_b": 1
    },
    "winner_id": "player1",
    "started_at": "2025-03-15T14:30:00Z",
    "completed_at": "2025-03-15T15:45:00Z"
  }
}
```

### Players

#### List Players
```http
GET /api/v1/players
```

**Query Parameters:**
- `search` (string): Search by name
- `page`, `limit`: Pagination

#### Get Player Profile
```http
GET /api/v1/players/{playerId}
```

**Response:**
```json
{
  "data": {
    "id": "player123",
    "name": "John Doe",
    "skill_level": 7,
    "wins": 45,
    "losses": 23,
    "win_rate": 66.18,
    "tournaments_played": 12,
    "tournaments_won": 3,
    "total_prize_money": 5000.00,
    "achievements": [
      {
        "id": "ach1",
        "name": "First Tournament Win",
        "earned_at": "2024-01-15T00:00:00Z"
      }
    ]
  }
}
```

#### Get Player Tournament History
```http
GET /api/v1/players/{playerId}/history
```

**Query Parameters:**
- `page`, `limit`: Pagination

#### Get Player Statistics
```http
GET /api/v1/players/{playerId}/stats
```

**Query Parameters:**
- `period` (string): Time period (all_time, year, month)
- `game_type` (string): Filter by game type

### Leaderboards

#### Get Global Leaderboards
```http
GET /api/v1/leaderboards
```

**Query Parameters:**
- `type` (string): Leaderboard type (win-rate, tournaments, prize-money, achievements)
- `game_type` (string): Filter by game type
- `limit` (number): Max entries (default: 10, max: 100)

**Response:**
```json
{
  "data": {
    "type": "win-rate",
    "entries": [
      {
        "rank": 1,
        "player_id": "player123",
        "player_name": "John Doe",
        "value": 75.5,
        "wins": 45,
        "losses": 15
      }
    ],
    "updated_at": "2025-03-15T16:00:00Z",
    "total_players": 150
  }
}
```

#### Get Format-Specific Leaderboard
```http
GET /api/v1/leaderboards/format/{format}
```

**Path Parameters:**
- `format` (string): Tournament format

#### Get Venue-Specific Leaderboard
```http
GET /api/v1/leaderboards/venue/{venueId}
```

### Venues

#### List Venues
```http
GET /api/v1/venues
```

**Query Parameters:**
- `page`, `limit`: Pagination

**Response:**
```json
{
  "data": [
    {
      "id": "venue123",
      "name": "Downtown Billiards",
      "address": "123 Main St, City, State 12345",
      "table_count": 12,
      "phone": "(555) 123-4567",
      "email": "info@downtownbilliards.com"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

#### Get Venue Details
```http
GET /api/v1/venues/{venueId}
```

#### Get Venue Tournaments
```http
GET /api/v1/venues/{venueId}/tournaments
```

**Query Parameters:**
- `status` (string): Filter by tournament status
- `page`, `limit`: Pagination

### Webhooks

#### Test Webhook
```http
POST /api/v1/webhooks/{webhookId}/test
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "statusText": "OK",
  "duration": "245ms",
  "responseBody": "OK",
  "headers": {
    "x-webhook-signature": "sha256=...",
    "x-webhook-event": "test.webhook",
    "x-webhook-delivery-id": "test_1234567890"
  }
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable error message"
  }
}
```

### Common HTTP Status Codes
- `200 OK`: Request successful
- `400 Bad Request`: Invalid query parameters or request body
- `401 Unauthorized`: Missing or invalid API key
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

Rate limits are enforced based on API key tier:

- **Free Tier**: 100 requests/hour
- **Basic Tier**: 1,000 requests/hour
- **Pro Tier**: 10,000 requests/hour
- **Enterprise Tier**: Custom limits

Rate limit headers included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1710518400
```

## Pagination

All list endpoints support pagination:

**Request:**
```http
GET /api/v1/tournaments?page=2&limit=20
```

**Response Meta:**
```json
{
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

## Multi-Tenant Isolation

- All data is tenant-scoped based on API key
- You can only access data belonging to your organization
- API key determines tenant context automatically
- No cross-tenant data leakage

## Best Practices

1. **Cache Responses**: Cache data when appropriate to reduce API calls
2. **Use Pagination**: Don't request all data at once
3. **Handle Errors**: Implement proper error handling and retry logic
4. **Monitor Rate Limits**: Check rate limit headers and throttle requests
5. **Secure Keys**: Never expose API keys in client-side code
6. **Use Webhooks**: For real-time updates, use webhooks instead of polling

## Code Examples

### JavaScript/TypeScript
```typescript
const API_KEY = 'your_api_key';
const BASE_URL = 'https://your-domain.com/api/v1';

async function getTournaments() {
  const response = await fetch(`${BASE_URL}/tournaments`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
}
```

### Python
```python
import requests

API_KEY = 'your_api_key'
BASE_URL = 'https://your-domain.com/api/v1'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json',
}

response = requests.get(f'{BASE_URL}/tournaments', headers=headers)
response.raise_for_status()
data = response.json()
```

### cURL
```bash
curl -X GET "https://your-domain.com/api/v1/tournaments" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

## Support

For API support:
- **Documentation**: This file and inline endpoint documentation
- **Issues**: GitHub Issues
- **Email**: api-support@your-domain.com

## Changelog

### v1.0.0 (2025-11-08)
- Initial public API release
- Authentication middleware with bcrypt validation
- 17 endpoints across 5 resource categories
- Rate limiting and tenant isolation
- Webhook testing endpoint

---

**Last Updated**: 2025-11-08
**API Version**: 1.0.0
**Authentication**: API Key (Bearer Token)
**Base URL**: `/api/v1`
**Status**: ✅ Production Ready
