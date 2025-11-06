/**
 * Tournament Load Testing Scenario
 *
 * Tests the tournament management features under various load conditions:
 * - Normal load: 100 concurrent users, 10 req/s, 5 minutes
 * - Peak load: 500 concurrent users, 50 req/s, 10 minutes
 * - Stress test: Ramp to 1000 users, find breaking point
 *
 * Operations tested:
 * - List tournaments
 * - View tournament details
 * - Create tournaments
 * - Update tournaments
 * - Register players
 * - View brackets
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import {
  authenticate,
  getAuthHeaders,
  generateTournamentData,
  generatePlayerData,
  checkResponse,
  responseTimeThresholds,
  paginationParams,
  thinkTime,
  BASE_URL,
  errorRate,
} from '../utils/helpers.js';

// Custom metrics
const tournamentCreationTime = new Trend('tournament_creation_time');
const tournamentListTime = new Trend('tournament_list_time');
const tournamentDetailsTime = new Trend('tournament_details_time');
const tournamentUpdateTime = new Trend('tournament_update_time');
const playerRegistrationTime = new Trend('player_registration_time');
const bracketViewTime = new Trend('bracket_view_time');
const tournamentCreations = new Counter('tournament_creations');
const playerRegistrations = new Counter('player_registrations');

// Test configuration
export const options = {
  // Choose test scenario via environment variable
  // k6 run -e SCENARIO=normal tournament-load.js
  scenarios: {
    normal_load: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 150,
      stages: [
        { duration: '1m', target: 10 },  // Ramp up to 10 req/s
        { duration: '5m', target: 10 },  // Sustain 10 req/s
        { duration: '1m', target: 0 },   // Ramp down
      ],
      tags: { scenario: 'normal' },
      exec: 'normalLoad',
    },
    peak_load: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 600,
      stages: [
        { duration: '2m', target: 20 },  // Ramp up to 20 req/s
        { duration: '3m', target: 50 },  // Ramp to 50 req/s
        { duration: '10m', target: 50 }, // Sustain 50 req/s
        { duration: '2m', target: 0 },   // Ramp down
      ],
      startTime: '8m', // Start after normal load finishes
      tags: { scenario: 'peak' },
      exec: 'peakLoad',
    },
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // Normal load
        { duration: '5m', target: 100 },
        { duration: '2m', target: 300 },   // Increased load
        { duration: '5m', target: 300 },
        { duration: '2m', target: 500 },   // High load
        { duration: '5m', target: 500 },
        { duration: '2m', target: 1000 },  // Stress load
        { duration: '5m', target: 1000 },
        { duration: '5m', target: 0 },     // Recovery
      ],
      startTime: '25m', // Start after peak load finishes
      tags: { scenario: 'stress' },
      exec: 'stressTest',
    },
  },

  // Performance thresholds
  thresholds: {
    ...responseTimeThresholds(500, 1000),
    'tournament_creation_time': ['p(95)<1000', 'p(99)<2000'],
    'tournament_list_time': ['p(95)<300', 'p(99)<500'],
    'tournament_details_time': ['p(95)<300', 'p(99)<500'],
    'tournament_update_time': ['p(95)<500', 'p(99)<1000'],
    'player_registration_time': ['p(95)<500', 'p(99)<1000'],
    'bracket_view_time': ['p(95)<400', 'p(99)<800'],
    'errors': ['rate<0.01'], // Less than 1% error rate
  },
};

// Setup function - runs once before all VUs
export function setup() {
  console.log('Setting up tournament load test...');
  console.log(`Base URL: ${BASE_URL}`);

  // Create a test user for authentication
  const token = authenticate(http, 'loadtest@example.com', 'loadtest123');

  if (!token) {
    throw new Error('Failed to authenticate during setup');
  }

  return { token };
}

/**
 * Normal Load Scenario
 * Simulates typical usage patterns
 */
export function normalLoad(data) {
  const token = data.token;

  group('Normal Load - Tournament Operations', () => {
    // 60% of users browse tournaments
    if (Math.random() < 0.6) {
      browseTournaments(token);
      sleep(thinkTime());
    }

    // 25% of users view tournament details
    if (Math.random() < 0.25) {
      const tournamentId = viewRandomTournament(token);
      if (tournamentId) {
        sleep(thinkTime());
        viewBracket(token, tournamentId);
      }
      sleep(thinkTime());
    }

    // 10% of users create tournaments
    if (Math.random() < 0.1) {
      createTournament(token);
      sleep(thinkTime());
    }

    // 5% of users register players
    if (Math.random() < 0.05) {
      const tournamentId = viewRandomTournament(token);
      if (tournamentId) {
        registerPlayer(token, tournamentId);
      }
      sleep(thinkTime());
    }
  });
}

/**
 * Peak Load Scenario
 * Simulates high-traffic periods (e.g., tournament registration opening)
 */
export function peakLoad(data) {
  const token = data.token;

  group('Peak Load - High Traffic', () => {
    // Higher concurrency, shorter think times
    browseTournaments(token);
    sleep(1); // Reduced think time

    if (Math.random() < 0.5) {
      const tournamentId = viewRandomTournament(token);
      if (tournamentId) {
        sleep(0.5);
        registerPlayer(token, tournamentId);
      }
    }
  });
}

/**
 * Stress Test Scenario
 * Tests system limits and breaking points
 */
export function stressTest(data) {
  const token = data.token;

  group('Stress Test - System Limits', () => {
    // Mix of all operations with minimal think time
    const operations = [
      () => browseTournaments(token),
      () => viewRandomTournament(token),
      () => createTournament(token),
      () => viewBracket(token, 'test-tournament-id'),
    ];

    // Execute random operation
    const operation = operations[Math.floor(Math.random() * operations.length)];
    operation();

    sleep(0.1); // Minimal delay for stress testing
  });
}

/**
 * Browse tournaments list
 */
function browseTournaments(token) {
  const page = Math.floor(Math.random() * 5) + 1; // Random page 1-5
  const response = http.get(
    `${BASE_URL}/api/tournaments${paginationParams(page, 20)}`,
    getAuthHeaders(token)
  );

  tournamentListTime.add(response.timings.duration);

  checkResponse(response, {
    'browse tournaments - status 200': (r) => r.status === 200,
    'browse tournaments - has data': (r) => r.json('data') !== undefined,
    'browse tournaments - has pagination': (r) => r.json('pagination') !== undefined,
  });

  return response;
}

/**
 * View random tournament details
 * Returns tournament ID if successful
 */
function viewRandomTournament(token) {
  // First get list of tournaments
  const listResponse = http.get(
    `${BASE_URL}/api/tournaments${paginationParams(1, 10)}`,
    getAuthHeaders(token)
  );

  if (listResponse.status !== 200) {
    return null;
  }

  const tournaments = listResponse.json('data');
  if (!tournaments || tournaments.length === 0) {
    return null;
  }

  // Pick a random tournament
  const tournament = tournaments[Math.floor(Math.random() * tournaments.length)];
  const tournamentId = tournament.id;

  // View its details
  const response = http.get(
    `${BASE_URL}/api/tournaments/${tournamentId}`,
    getAuthHeaders(token)
  );

  tournamentDetailsTime.add(response.timings.duration);

  checkResponse(response, {
    'view tournament - status 200': (r) => r.status === 200,
    'view tournament - has id': (r) => r.json('id') !== undefined,
    'view tournament - has name': (r) => r.json('name') !== undefined,
  });

  return tournamentId;
}

/**
 * Create a new tournament
 */
function createTournament(token) {
  const tournamentData = generateTournamentData();

  const response = http.post(
    `${BASE_URL}/api/tournaments`,
    JSON.stringify(tournamentData),
    getAuthHeaders(token)
  );

  tournamentCreationTime.add(response.timings.duration);

  const success = checkResponse(response, {
    'create tournament - status 201': (r) => r.status === 201,
    'create tournament - has id': (r) => r.json('id') !== undefined,
    'create tournament - name matches': (r) => r.json('name') === tournamentData.name,
  });

  if (success) {
    tournamentCreations.add(1);
  }

  return response;
}

/**
 * Update tournament details
 */
function updateTournament(token, tournamentId) {
  const updateData = {
    description: `Updated at ${Date.now()}`,
    status: 'in_progress',
  };

  const response = http.patch(
    `${BASE_URL}/api/tournaments/${tournamentId}`,
    JSON.stringify(updateData),
    getAuthHeaders(token)
  );

  tournamentUpdateTime.add(response.timings.duration);

  checkResponse(response, {
    'update tournament - status 200': (r) => r.status === 200,
    'update tournament - description updated': (r) =>
      r.json('description') === updateData.description,
  });

  return response;
}

/**
 * Register a player for a tournament
 */
function registerPlayer(token, tournamentId) {
  const playerData = generatePlayerData();

  const response = http.post(
    `${BASE_URL}/api/tournaments/${tournamentId}/players`,
    JSON.stringify(playerData),
    getAuthHeaders(token)
  );

  playerRegistrationTime.add(response.timings.duration);

  const success = checkResponse(response, {
    'register player - status 201': (r) => r.status === 201,
    'register player - has player id': (r) => r.json('playerId') !== undefined,
  });

  if (success) {
    playerRegistrations.add(1);
  }

  return response;
}

/**
 * View tournament bracket
 */
function viewBracket(token, tournamentId) {
  const response = http.get(
    `${BASE_URL}/api/tournaments/${tournamentId}/bracket`,
    getAuthHeaders(token)
  );

  bracketViewTime.add(response.timings.duration);

  checkResponse(response, {
    'view bracket - status 200': (r) => r.status === 200,
    'view bracket - has rounds': (r) => r.json('rounds') !== undefined,
  });

  return response;
}

// Handle test summary
export function handleSummary(data) {
  console.log('\n========================================');
  console.log('Tournament Load Test Summary');
  console.log('========================================\n');

  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
  console.log(`Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`);

  console.log('Response Times:');
  console.log(`  Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  console.log(`  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
  console.log(`  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`);

  console.log('Tournament Operations:');
  console.log(`  Tournaments Created: ${data.metrics.tournament_creations.values.count}`);
  console.log(`  Players Registered: ${data.metrics.player_registrations.values.count}`);
  console.log(`  List Time (P95): ${data.metrics.tournament_list_time.values['p(95)'].toFixed(2)}ms`);
  console.log(`  Details Time (P95): ${data.metrics.tournament_details_time.values['p(95)'].toFixed(2)}ms`);
  console.log(`  Creation Time (P95): ${data.metrics.tournament_creation_time.values['p(95)'].toFixed(2)}ms`);

  return {
    'stdout': '', // Suppress default output
    'summary.json': JSON.stringify(data, null, 2),
  };
}
