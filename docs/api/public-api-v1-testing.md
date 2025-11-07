# Public API v1 - Testing Guide

Sprint 10 Week 3 - Public API & Webhooks

## Overview

This guide provides example curl commands for testing all public API v1 endpoints.

**Base URL:** `http://localhost:3000/api/v1` (development)

**Authentication:** All endpoints require an API key (to be implemented by Agent 1)
```bash
-H "Authorization: Bearer YOUR_API_KEY_HERE"
```

## Tournaments Endpoints

### 1. List Tournaments
```bash
# Get all tournaments (paginated)
curl -X GET "http://localhost:3000/api/v1/tournaments?page=1&limit=20&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"

# Filter by status
curl -X GET "http://localhost:3000/api/v1/tournaments?status=active&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"

# Filter by format
curl -X GET "http://localhost:3000/api/v1/tournaments?format=single_elimination&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"

# Combined filters
curl -X GET "http://localhost:3000/api/v1/tournaments?page=1&limit=10&status=completed&format=double_elimination&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "data": [
    {
      "id": "clx1234567890",
      "name": "Summer Championship 2024",
      "format": "single_elimination",
      "status": "active",
      "startDate": "2024-06-15T18:00:00.000Z",
      "playerCount": 32,
      "description": "Annual summer tournament"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. Get Tournament Details
```bash
# Get single tournament
curl -X GET "http://localhost:3000/api/v1/tournaments/TOURNAMENT_ID?orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "data": {
    "id": "clx1234567890",
    "name": "Summer Championship 2024",
    "description": "Annual summer tournament for advanced players",
    "format": "single_elimination",
    "status": "active",
    "startDate": "2024-06-15T18:00:00.000Z",
    "completedDate": null,
    "playerCount": 32,
    "matchCount": 31,
    "currentRound": 3,
    "createdAt": "2024-06-01T10:00:00.000Z"
  }
}
```

### 3. Get Tournament Matches
```bash
# Get all matches in tournament
curl -X GET "http://localhost:3000/api/v1/tournaments/TOURNAMENT_ID/matches?orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"

# Filter by round
curl -X GET "http://localhost:3000/api/v1/tournaments/TOURNAMENT_ID/matches?round=1&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"

# Filter by status
curl -X GET "http://localhost:3000/api/v1/tournaments/TOURNAMENT_ID/matches?status=completed&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "data": [
    {
      "id": "match123",
      "round": 1,
      "bracket": "winners",
      "position": 1,
      "playerA": {
        "id": "player1",
        "name": "John Smith"
      },
      "playerB": {
        "id": "player2",
        "name": "Jane Doe"
      },
      "status": "completed",
      "score": {
        "playerA": 5,
        "playerB": 3
      },
      "winner": {
        "id": "player1",
        "name": "John Smith"
      },
      "table": "Table 1",
      "startedAt": "2024-06-15T18:30:00.000Z",
      "completedAt": "2024-06-15T19:15:00.000Z"
    }
  ]
}
```

### 4. Get Tournament Players
```bash
# Get all players in tournament
curl -X GET "http://localhost:3000/api/v1/tournaments/TOURNAMENT_ID/players?orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"

# Filter by status
curl -X GET "http://localhost:3000/api/v1/tournaments/TOURNAMENT_ID/players?status=checked_in&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "data": [
    {
      "id": "player1",
      "name": "John Smith",
      "seed": 1,
      "status": "checked_in",
      "checkedInAt": "2024-06-15T17:45:00.000Z",
      "wins": 3,
      "losses": 0,
      "chipCount": 15,
      "standing": 1
    }
  ]
}
```

### 5. Get Tournament Bracket
```bash
# Get complete bracket structure
curl -X GET "http://localhost:3000/api/v1/tournaments/TOURNAMENT_ID/bracket?orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "data": {
    "tournamentId": "clx1234567890",
    "format": "double_elimination",
    "winnersBracket": [
      {
        "round": 1,
        "name": "Round 1",
        "matches": [
          {
            "matchId": "match1",
            "round": 1,
            "position": 1,
            "playerA": {
              "id": "player1",
              "name": "John Smith",
              "seed": 1
            },
            "playerB": {
              "id": "player16",
              "name": "Bob Johnson",
              "seed": 16
            },
            "winner": {
              "id": "player1",
              "name": "John Smith"
            },
            "score": {
              "playerA": 5,
              "playerB": 2
            },
            "status": "completed"
          }
        ]
      }
    ],
    "losersBracket": [
      {
        "round": 1,
        "name": "Round 1",
        "matches": []
      }
    ]
  }
}
```

## Players Endpoints

### 6. List Players
```bash
# Get all players (paginated)
curl -X GET "http://localhost:3000/api/v1/players?page=1&limit=20&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"

# Search by name
curl -X GET "http://localhost:3000/api/v1/players?search=john&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"

# Filter by skill level
curl -X GET "http://localhost:3000/api/v1/players?skillLevel=ADVANCED&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"

# Combined
curl -X GET "http://localhost:3000/api/v1/players?search=smith&skillLevel=EXPERT&page=1&limit=10&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "data": [
    {
      "id": "player1",
      "name": "John Smith",
      "skillLevel": "ADVANCED",
      "winRate": 68.5,
      "tournamentsPlayed": 24,
      "photoUrl": "https://example.com/photos/player1.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 7. Get Player Profile
```bash
# Get player profile
curl -X GET "http://localhost:3000/api/v1/players/PLAYER_ID?orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "data": {
    "id": "player1",
    "name": "John Smith",
    "bio": "Professional pool player with 10 years of experience",
    "photoUrl": "https://example.com/photos/player1.jpg",
    "skillLevel": "ADVANCED",
    "location": "New York, NY",
    "socialLinks": {
      "twitter": "@johnsmith",
      "instagram": "@johnsmith_pool"
    },
    "careerStats": {
      "totalTournaments": 24,
      "totalMatches": 156,
      "totalWins": 107,
      "totalLosses": 49,
      "winRate": 68.59,
      "totalPrizeWon": 5400.00
    },
    "joinedAt": "2023-01-15T10:00:00.000Z",
    "lastActive": "2024-06-15T19:30:00.000Z"
  }
}
```

**Error (Private Profile):**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "This player profile is private"
  },
  "timestamp": "2024-06-15T20:00:00.000Z"
}
```

### 8. Get Player History
```bash
# Get player tournament history
curl -X GET "http://localhost:3000/api/v1/players/PLAYER_ID/history?page=1&limit=20&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"

# Filter completed only
curl -X GET "http://localhost:3000/api/v1/players/PLAYER_ID/history?status=completed&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "data": [
    {
      "tournamentId": "tourn1",
      "tournamentName": "Summer Championship 2024",
      "format": "single_elimination",
      "status": "completed",
      "placement": 3,
      "wins": 4,
      "losses": 1,
      "startDate": "2024-06-15T18:00:00.000Z",
      "completedDate": "2024-06-15T22:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 24,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 9. Get Player Stats
```bash
# Get detailed player statistics
curl -X GET "http://localhost:3000/api/v1/players/PLAYER_ID/stats?orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "data": {
    "playerId": "player1",
    "overallStats": {
      "totalTournaments": 24,
      "totalMatches": 156,
      "totalWins": 107,
      "totalLosses": 49,
      "winRate": 68.59,
      "averageFinish": 3.5
    },
    "streaks": {
      "currentStreak": 5,
      "longestWinStreak": 12
    },
    "performanceByFormat": [
      {
        "format": "single_elimination",
        "tournaments": 15,
        "wins": 68,
        "losses": 25,
        "winRate": 73.12
      },
      {
        "format": "double_elimination",
        "tournaments": 9,
        "wins": 39,
        "losses": 24,
        "winRate": 61.90
      }
    ],
    "rankings": {
      "globalRank": 42,
      "venueRank": 5
    },
    "recentPerformance": {
      "last10Matches": {
        "wins": 7,
        "losses": 3,
        "winRate": 70.0
      },
      "last30Days": {
        "tournaments": 3,
        "wins": 15,
        "losses": 6
      }
    }
  }
}
```

## Matches Endpoints

### 10. List Matches
```bash
# Get all matches (paginated)
curl -X GET "http://localhost:3000/api/v1/matches?page=1&limit=20&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"

# Filter by status
curl -X GET "http://localhost:3000/api/v1/matches?status=in_progress&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"

# Filter by tournament
curl -X GET "http://localhost:3000/api/v1/matches?tournamentId=TOURNAMENT_ID&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"

# Combined
curl -X GET "http://localhost:3000/api/v1/matches?tournamentId=TOURNAMENT_ID&status=completed&page=1&limit=10&orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "data": [
    {
      "id": "match1",
      "tournamentId": "tourn1",
      "tournamentName": "Summer Championship 2024",
      "round": 2,
      "bracket": "winners",
      "playerA": {
        "id": "player1",
        "name": "John Smith"
      },
      "playerB": {
        "id": "player8",
        "name": "Mike Davis"
      },
      "status": "completed",
      "score": {
        "playerA": 5,
        "playerB": 4
      },
      "winner": {
        "id": "player1",
        "name": "John Smith"
      },
      "startedAt": "2024-06-15T19:00:00.000Z",
      "completedAt": "2024-06-15T19:45:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 11. Get Match Details
```bash
# Get single match details
curl -X GET "http://localhost:3000/api/v1/matches/MATCH_ID?orgId=YOUR_ORG_ID" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "data": {
    "id": "match1",
    "tournament": {
      "id": "tourn1",
      "name": "Summer Championship 2024",
      "format": "single_elimination"
    },
    "round": 2,
    "bracket": "winners",
    "position": 1,
    "playerA": {
      "id": "player1",
      "name": "John Smith",
      "seed": 1
    },
    "playerB": {
      "id": "player8",
      "name": "Mike Davis",
      "seed": 8
    },
    "status": "completed",
    "score": {
      "playerA": 5,
      "playerB": 4,
      "raceTo": 5,
      "games": [
        {
          "gameNumber": 1,
          "winner": "player1",
          "score": {
            "playerA": 1,
            "playerB": 0
          }
        },
        {
          "gameNumber": 2,
          "winner": "player8",
          "score": {
            "playerA": 0,
            "playerB": 1
          }
        }
      ]
    },
    "winner": {
      "id": "player1",
      "name": "John Smith"
    },
    "table": "Table 3",
    "startedAt": "2024-06-15T19:00:00.000Z",
    "completedAt": "2024-06-15T19:45:00.000Z",
    "durationMinutes": 45
  }
}
```

## Error Responses

### 400 - Validation Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": {
      "errors": [
        {
          "path": ["page"],
          "message": "Expected number, received string"
        }
      ]
    }
  },
  "timestamp": "2024-06-15T20:00:00.000Z"
}
```

### 401 - Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  },
  "timestamp": "2024-06-15T20:00:00.000Z"
}
```

### 403 - Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "This player profile is private"
  },
  "timestamp": "2024-06-15T20:00:00.000Z"
}
```

### 404 - Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Tournament not found"
  },
  "timestamp": "2024-06-15T20:00:00.000Z"
}
```

### 429 - Rate Limit Exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "retryAfter": 60
    }
  },
  "timestamp": "2024-06-15T20:00:00.000Z"
}
```

### 500 - Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error"
  },
  "timestamp": "2024-06-15T20:00:00.000Z"
}
```

## Rate Limit Headers

All responses include rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1718486400
```

## Testing Workflow

1. **Start development server:**
   ```bash
   cd /c/devop/saas202520
   npm run dev
   ```

2. **Get your organization ID:**
   - Log into the application
   - Navigate to settings or use browser dev tools to find `orgId`

3. **Test endpoints in order:**
   - Start with tournaments list
   - Get a tournament ID
   - Test tournament-specific endpoints
   - Test players and matches similarly

4. **Test error cases:**
   - Invalid IDs (400)
   - Non-existent resources (404)
   - Private profiles (403)

## Next Steps

- Agent 1 will implement API authentication middleware
- Add API key to all curl commands
- Test multi-tenant isolation
- Verify rate limiting works correctly
