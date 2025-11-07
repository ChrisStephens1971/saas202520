#!/bin/bash
# Player API Endpoints Test Script
# Sprint 10 Week 2 - Player Data Retrieval API
#
# Usage: ./test-player-endpoints.sh [BASE_URL]
# Example: ./test-player-endpoints.sh http://localhost:3000

BASE_URL="${1:-http://localhost:3000}"
PLAYER_ID="${2:-player-123}"

echo "============================================"
echo "Player API Endpoints Test Script"
echo "============================================"
echo "Base URL: $BASE_URL"
echo "Player ID: $PLAYER_ID"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
  local name="$1"
  local method="$2"
  local url="$3"
  local data="$4"
  local expected_status="$5"

  echo -e "${YELLOW}Testing: $name${NC}"
  echo "  Method: $method"
  echo "  URL: $url"

  if [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$url")
  else
    response=$(curl -s -w "\n%{http_code}" "$url")
  fi

  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$status_code" = "$expected_status" ]; then
    echo -e "  ${GREEN}✓ PASSED${NC} (Status: $status_code)"
    ((PASSED++))
  else
    echo -e "  ${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
    echo "  Response: $body"
    ((FAILED++))
  fi

  echo ""
}

echo "============================================"
echo "Test 1: POST /api/players/search"
echo "============================================"

test_endpoint \
  "Search players - valid request" \
  "POST" \
  "$BASE_URL/api/players/search" \
  '{"limit": 20, "offset": 0}' \
  "200"

test_endpoint \
  "Search players - with filters" \
  "POST" \
  "$BASE_URL/api/players/search" \
  '{"skillLevel": ["INTERMEDIATE"], "location": "New York", "limit": 10}' \
  "200"

test_endpoint \
  "Search players - invalid skill level" \
  "POST" \
  "$BASE_URL/api/players/search" \
  '{"skillLevel": ["INVALID_LEVEL"]}' \
  "400"

test_endpoint \
  "Search players - limit too high" \
  "POST" \
  "$BASE_URL/api/players/search" \
  '{"limit": 150}' \
  "400"

echo "============================================"
echo "Test 2: GET /api/players/[id]/statistics"
echo "============================================"

test_endpoint \
  "Get statistics - valid player" \
  "GET" \
  "$BASE_URL/api/players/$PLAYER_ID/statistics" \
  "" \
  "200"

test_endpoint \
  "Get statistics - with recalculation" \
  "GET" \
  "$BASE_URL/api/players/$PLAYER_ID/statistics?recalculate=true" \
  "" \
  "200"

test_endpoint \
  "Get statistics - non-existent player" \
  "GET" \
  "$BASE_URL/api/players/nonexistent-player/statistics" \
  "" \
  "404"

echo "============================================"
echo "Test 3: GET /api/players/[id]/matches"
echo "============================================"

test_endpoint \
  "Get matches - valid player" \
  "GET" \
  "$BASE_URL/api/players/$PLAYER_ID/matches" \
  "" \
  "200"

test_endpoint \
  "Get matches - with pagination" \
  "GET" \
  "$BASE_URL/api/players/$PLAYER_ID/matches?limit=10&offset=0" \
  "" \
  "200"

test_endpoint \
  "Get matches - filter by status" \
  "GET" \
  "$BASE_URL/api/players/$PLAYER_ID/matches?status=completed" \
  "" \
  "200"

test_endpoint \
  "Get matches - limit too high" \
  "GET" \
  "$BASE_URL/api/players/$PLAYER_ID/matches?limit=150" \
  "" \
  "400"

test_endpoint \
  "Get matches - non-existent player" \
  "GET" \
  "$BASE_URL/api/players/nonexistent-player/matches" \
  "" \
  "404"

echo "============================================"
echo "Test Summary"
echo "============================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
