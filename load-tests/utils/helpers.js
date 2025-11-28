/**
 * Load Testing Utility Helpers
 * Common functions for k6 load tests
 */

import { check } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');

/**
 * Base configuration for API requests
 */
export const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
export const WS_URL = __ENV.WS_URL || 'ws://localhost:3001';

/**
 * Authentication helper
 * Authenticates a user and returns the auth token
 *
 * @param {object} http - k6 http module
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {string} Authentication token
 */
export function authenticate(http, email = 'test@example.com', password = 'password123') {
  const payload = JSON.stringify({
    email,
    password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(`${BASE_URL}/api/auth/login`, payload, params);

  const success = check(response, {
    'authentication successful': (r) => r.status === 200,
    'auth token received': (r) => r.json('token') !== undefined,
  });

  if (!success) {
    errorRate.add(1);
    console.error('Authentication failed:', response.status, response.body);
    return null;
  }

  return response.json('token');
}

/**
 * Create authenticated request headers
 *
 * @param {string} token - Authentication token
 * @returns {object} Headers object
 */
export function getAuthHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

/**
 * Generate random tournament data
 *
 * @returns {object} Tournament data
 */
export function generateTournamentData() {
  const tournamentTypes = ['single_elimination', 'double_elimination', 'round_robin'];
  const gameTypes = ['8-ball', '9-ball', '10-ball', 'straight'];

  return {
    name: `Tournament ${Date.now()}-${Math.random().toString(36).substring(7)}`,
    description: 'Load test tournament',
    type: tournamentTypes[Math.floor(Math.random() * tournamentTypes.length)],
    gameType: gameTypes[Math.floor(Math.random() * gameTypes.length)],
    maxParticipants: 16,
    startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
  };
}

/**
 * Generate random player data
 *
 * @returns {object} Player data
 */
export function generatePlayerData() {
  return {
    name: `Player ${Date.now()}-${Math.random().toString(36).substring(7)}`,
    email: `player-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
    skillLevel: Math.floor(Math.random() * 7) + 1, // 1-7
  };
}

/**
 * Generate random match result data
 *
 * @param {string} matchId - Match ID
 * @returns {object} Match result data
 */
export function generateMatchResult(matchId) {
  const player1Score = Math.floor(Math.random() * 10);
  const player2Score = Math.floor(Math.random() * 10);

  return {
    matchId,
    player1Score,
    player2Score,
    winnerId: player1Score > player2Score ? 'player1' : 'player2',
    duration: Math.floor(Math.random() * 3600) + 600, // 10-60 minutes
  };
}

/**
 * Check response and record errors
 *
 * @param {object} response - HTTP response
 * @param {object} checks - Check conditions
 * @returns {boolean} Check result
 */
export function checkResponse(response, checks) {
  const result = check(response, checks);

  if (!result) {
    errorRate.add(1);
  }

  return result;
}

/**
 * Standard response time checks
 *
 * @param {number} p95Threshold - 95th percentile threshold in ms
 * @param {number} p99Threshold - 99th percentile threshold in ms
 * @returns {object} Threshold configuration
 */
export function responseTimeThresholds(p95Threshold = 500, p99Threshold = 1000) {
  return {
    http_req_duration: [`p(95)<${p95Threshold}`, `p(99)<${p99Threshold}`],
    http_req_failed: ['rate<0.01'], // Less than 1% error rate
  };
}

/**
 * Create pagination parameters
 *
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {string} Query string
 */
export function paginationParams(page = 1, limit = 20) {
  return `?page=${page}&limit=${limit}`;
}

/**
 * Sleep with random jitter
 * Helps simulate more realistic user behavior
 *
 * @param {number} min - Minimum sleep time in seconds
 * @param {number} max - Maximum sleep time in seconds
 */
export function sleepWithJitter(min = 1, max = 3) {
  const sleepDuration = min + Math.random() * (max - min);
  return sleepDuration;
}

/**
 * Generate realistic user think time
 * Simulates time user spends reading/thinking between actions
 *
 * @returns {number} Think time in seconds
 */
export function thinkTime() {
  // 70% of users: 1-3 seconds
  // 20% of users: 3-5 seconds
  // 10% of users: 5-10 seconds
  const rand = Math.random();

  if (rand < 0.7) {
    return 1 + Math.random() * 2; // 1-3s
  } else if (rand < 0.9) {
    return 3 + Math.random() * 2; // 3-5s
  } else {
    return 5 + Math.random() * 5; // 5-10s
  }
}

/**
 * Create test data cleanup helper
 *
 * @param {object} http - k6 http module
 * @param {string} token - Auth token
 * @param {string} resourceType - Type of resource to cleanup
 * @param {string} resourceId - Resource ID
 */
export function cleanup(http, token, resourceType, resourceId) {
  const response = http.del(
    `${BASE_URL}/api/${resourceType}/${resourceId}`,
    null,
    getAuthHeaders(token)
  );

  // Don't fail the test if cleanup fails, just log it
  if (response.status !== 200 && response.status !== 204) {
    console.warn(`Cleanup failed for ${resourceType}/${resourceId}: ${response.status}`);
  }
}

/**
 * Random selection helper
 *
 * @param {Array} array - Array to select from
 * @returns {*} Random element
 */
export function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Format test summary
 *
 * @param {object} data - Test data
 * @returns {string} Formatted summary
 */
export function formatSummary(data) {
  return `
Test Summary:
- Total Requests: ${data.http_reqs.count}
- Failed Requests: ${data.http_req_failed.rate * 100}%
- Average Duration: ${data.http_req_duration.avg.toFixed(2)}ms
- P95 Duration: ${data.http_req_duration['p(95)'].toFixed(2)}ms
- P99 Duration: ${data.http_req_duration['p(99)'].toFixed(2)}ms
- Error Rate: ${(errorRate.value * 100).toFixed(2)}%
`;
}

// Export common test options presets
export const testProfiles = {
  smoke: {
    vus: 1,
    duration: '1m',
  },
  load: {
    stages: [
      { duration: '2m', target: 100 }, // Ramp up to 100 users
      { duration: '5m', target: 100 }, // Stay at 100 users
      { duration: '2m', target: 0 }, // Ramp down
    ],
  },
  stress: {
    stages: [
      { duration: '2m', target: 100 }, // Below normal load
      { duration: '5m', target: 100 },
      { duration: '2m', target: 200 }, // Normal load
      { duration: '5m', target: 200 },
      { duration: '2m', target: 300 }, // Around breaking point
      { duration: '5m', target: 300 },
      { duration: '2m', target: 400 }, // Beyond breaking point
      { duration: '5m', target: 400 },
      { duration: '10m', target: 0 }, // Scale down recovery
    ],
  },
  spike: {
    stages: [
      { duration: '10s', target: 100 }, // Quick ramp to normal
      { duration: '1m', target: 100 },
      { duration: '10s', target: 1400 }, // Spike to extreme load
      { duration: '3m', target: 1400 },
      { duration: '10s', target: 100 }, // Quick drop
      { duration: '3m', target: 100 },
      { duration: '10s', target: 0 },
    ],
  },
  soak: {
    stages: [
      { duration: '2m', target: 400 }, // Ramp up
      { duration: '3h56m', target: 400 }, // Stay for ~4 hours total
      { duration: '2m', target: 0 }, // Ramp down
    ],
  },
};
