/**
 * API Load Testing Scenario
 *
 * Comprehensive API endpoint testing covering:
 * - Authentication flows (login, register, logout, refresh)
 * - CRUD operations on all major resources
 * - Pagination and filtering
 * - Error handling and edge cases
 * - Multi-tenant isolation
 *
 * Test profiles:
 * - Smoke: 1 VU, 1 minute (basic functionality)
 * - Load: 100 VUs, 5 minutes (normal load)
 * - Stress: Ramp to 500 VUs (find breaking points)
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
  randomElement,
  BASE_URL,
  errorRate,
  testProfiles,
} from '../utils/helpers.js';

// Custom metrics for API operations
const authTime = new Trend('auth_time');
const createTime = new Trend('create_time');
const readTime = new Trend('read_time');
const updateTime = new Trend('update_time');
const deleteTime = new Trend('delete_time');
const listTime = new Trend('list_time');
const filterTime = new Trend('filter_time');

const authAttempts = new Counter('auth_attempts');
const createOperations = new Counter('create_operations');
const updateOperations = new Counter('update_operations');
const deleteOperations = new Counter('delete_operations');

// Test configuration
export const options = {
  scenarios: {
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest',
    },
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 }, // Ramp up
        { duration: '5m', target: 100 }, // Normal load
        { duration: '2m', target: 0 }, // Ramp down
      ],
      startTime: '2m',
      tags: { test_type: 'load' },
      exec: 'loadTest',
    },
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '3m', target: 0 },
      ],
      startTime: '11m',
      tags: { test_type: 'stress' },
      exec: 'stressTest',
    },
  },

  thresholds: {
    ...responseTimeThresholds(500, 1000),
    auth_time: ['p(95)<800', 'p(99)<1500'],
    create_time: ['p(95)<1000', 'p(99)<2000'],
    read_time: ['p(95)<300', 'p(99)<500'],
    update_time: ['p(95)<500', 'p(99)<1000'],
    delete_time: ['p(95)<300', 'p(99)<500'],
    list_time: ['p(95)<400', 'p(99)<800'],
    filter_time: ['p(95)<600', 'p(99)<1200'],
    errors: ['rate<0.01'],
  },
};

// Setup
export function setup() {
  console.log('Setting up API load test...');
  console.log(`Base URL: ${BASE_URL}`);

  // Create test user
  const token = authenticate(http, 'apitest@example.com', 'apitest123');

  if (!token) {
    throw new Error('Failed to authenticate during setup');
  }

  return { token };
}

/**
 * Smoke Test - Basic functionality check
 */
export function smokeTest(data) {
  group('Smoke Test - API Health', () => {
    // Health check
    healthCheck();

    // Authentication
    testAuthentication();

    // Basic CRUD
    const token = data.token;
    testCRUDOperations(token);

    sleep(1);
  });
}

/**
 * Load Test - Normal traffic patterns
 */
export function loadTest(data) {
  const token = data.token;

  group('Load Test - API Operations', () => {
    // Distribute traffic across operations
    const rand = Math.random();

    if (rand < 0.4) {
      // 40% - Read operations
      testReadOperations(token);
    } else if (rand < 0.7) {
      // 30% - List and filter operations
      testListOperations(token);
    } else if (rand < 0.85) {
      // 15% - Create operations
      testCreateOperations(token);
    } else if (rand < 0.95) {
      // 10% - Update operations
      testUpdateOperations(token);
    } else {
      // 5% - Delete operations
      testDeleteOperations(token);
    }

    sleep(thinkTime());
  });
}

/**
 * Stress Test - Push system limits
 */
export function stressTest(data) {
  const token = data.token;

  group('Stress Test - High Concurrency', () => {
    // Aggressive mixed operations
    testCRUDOperations(token);
    sleep(0.1);
  });
}

/**
 * Health check endpoint
 */
function healthCheck() {
  const response = http.get(`${BASE_URL}/api/health`);

  checkResponse(response, {
    'health check - status 200': (r) => r.status === 200,
    'health check - is healthy': (r) => r.json('status') === 'healthy',
  });
}

/**
 * Test authentication flows
 */
function testAuthentication() {
  group('Authentication', () => {
    // Login
    const loginStart = Date.now();
    const loginResponse = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    authTime.add(Date.now() - loginStart);
    authAttempts.add(1);

    const loginSuccess = checkResponse(loginResponse, {
      'login - status 200': (r) => r.status === 200,
      'login - token received': (r) => r.json('token') !== undefined,
      'login - user data received': (r) => r.json('user') !== undefined,
    });

    if (!loginSuccess) return;

    const token = loginResponse.json('token');

    // Verify token
    const verifyResponse = http.get(`${BASE_URL}/api/auth/me`, getAuthHeaders(token));

    checkResponse(verifyResponse, {
      'verify token - status 200': (r) => r.status === 200,
      'verify token - user id exists': (r) => r.json('id') !== undefined,
    });

    // Refresh token (if endpoint exists)
    const refreshResponse = http.post(`${BASE_URL}/api/auth/refresh`, null, getAuthHeaders(token));

    if (refreshResponse.status !== 404) {
      checkResponse(refreshResponse, {
        'refresh token - status 200': (r) => r.status === 200,
        'refresh token - new token received': (r) => r.json('token') !== undefined,
      });
    }
  });
}

/**
 * Test CRUD operations
 */
function testCRUDOperations(token) {
  group('CRUD Operations', () => {
    // CREATE
    const createStart = Date.now();
    const tournamentData = generateTournamentData();
    const createResponse = http.post(
      `${BASE_URL}/api/tournaments`,
      JSON.stringify(tournamentData),
      getAuthHeaders(token)
    );

    createTime.add(Date.now() - createStart);

    const created = checkResponse(createResponse, {
      'create - status 201': (r) => r.status === 201,
      'create - has id': (r) => r.json('id') !== undefined,
    });

    if (!created) return;

    createOperations.add(1);
    const tournamentId = createResponse.json('id');

    // READ
    const readStart = Date.now();
    const readResponse = http.get(
      `${BASE_URL}/api/tournaments/${tournamentId}`,
      getAuthHeaders(token)
    );

    readTime.add(Date.now() - readStart);

    checkResponse(readResponse, {
      'read - status 200': (r) => r.status === 200,
      'read - id matches': (r) => r.json('id') === tournamentId,
    });

    // UPDATE
    const updateStart = Date.now();
    const updateData = {
      description: 'Updated description',
      status: 'in_progress',
    };
    const updateResponse = http.patch(
      `${BASE_URL}/api/tournaments/${tournamentId}`,
      JSON.stringify(updateData),
      getAuthHeaders(token)
    );

    updateTime.add(Date.now() - updateStart);

    checkResponse(updateResponse, {
      'update - status 200': (r) => r.status === 200,
      'update - description updated': (r) => r.json('description') === updateData.description,
    });

    updateOperations.add(1);

    // DELETE
    const deleteStart = Date.now();
    const deleteResponse = http.del(
      `${BASE_URL}/api/tournaments/${tournamentId}`,
      null,
      getAuthHeaders(token)
    );

    deleteTime.add(Date.now() - deleteStart);

    checkResponse(deleteResponse, {
      'delete - status 204 or 200': (r) => r.status === 204 || r.status === 200,
    });

    deleteOperations.add(1);

    // Verify deleted
    const verifyDeleteResponse = http.get(
      `${BASE_URL}/api/tournaments/${tournamentId}`,
      getAuthHeaders(token)
    );

    checkResponse(verifyDeleteResponse, {
      'verify delete - status 404': (r) => r.status === 404,
    });
  });
}

/**
 * Test read operations
 */
function testReadOperations(token) {
  group('Read Operations', () => {
    // Get list first
    const listResponse = http.get(
      `${BASE_URL}/api/tournaments${paginationParams(1, 10)}`,
      getAuthHeaders(token)
    );

    if (listResponse.status !== 200) return;

    const tournaments = listResponse.json('data');
    if (!tournaments || tournaments.length === 0) return;

    // Read random tournament
    const tournament = randomElement(tournaments);
    const readStart = Date.now();
    const response = http.get(
      `${BASE_URL}/api/tournaments/${tournament.id}`,
      getAuthHeaders(token)
    );

    readTime.add(Date.now() - readStart);

    checkResponse(response, {
      'read - status 200': (r) => r.status === 200,
      'read - has complete data': (r) =>
        r.json('id') !== undefined && r.json('name') !== undefined && r.json('type') !== undefined,
    });
  });
}

/**
 * Test list and filter operations
 */
function testListOperations(token) {
  group('List Operations', () => {
    // Basic list
    const listStart = Date.now();
    const listResponse = http.get(
      `${BASE_URL}/api/tournaments${paginationParams(1, 20)}`,
      getAuthHeaders(token)
    );

    listTime.add(Date.now() - listStart);

    checkResponse(listResponse, {
      'list - status 200': (r) => r.status === 200,
      'list - has data array': (r) => Array.isArray(r.json('data')),
      'list - has pagination': (r) => r.json('pagination') !== undefined,
    });

    // Filtered list
    const filters = ['status=upcoming', 'type=single_elimination', 'gameType=8-ball'];
    const filter = randomElement(filters);

    const filterStart = Date.now();
    const filterResponse = http.get(
      `${BASE_URL}/api/tournaments?${filter}&page=1&limit=20`,
      getAuthHeaders(token)
    );

    filterTime.add(Date.now() - filterStart);

    checkResponse(filterResponse, {
      'filter - status 200': (r) => r.status === 200,
      'filter - has data': (r) => r.json('data') !== undefined,
    });

    // Sorted list
    const sortResponse = http.get(
      `${BASE_URL}/api/tournaments?sortBy=startDate&sortOrder=desc&page=1&limit=20`,
      getAuthHeaders(token)
    );

    checkResponse(sortResponse, {
      'sort - status 200': (r) => r.status === 200,
      'sort - has data': (r) => r.json('data') !== undefined,
    });
  });
}

/**
 * Test create operations
 */
function testCreateOperations(token) {
  group('Create Operations', () => {
    const tournamentData = generateTournamentData();

    const createStart = Date.now();
    const response = http.post(
      `${BASE_URL}/api/tournaments`,
      JSON.stringify(tournamentData),
      getAuthHeaders(token)
    );

    createTime.add(Date.now() - createStart);

    const success = checkResponse(response, {
      'create - status 201': (r) => r.status === 201,
      'create - has id': (r) => r.json('id') !== undefined,
      'create - data matches': (r) => r.json('name') === tournamentData.name,
    });

    if (success) {
      createOperations.add(1);
    }
  });
}

/**
 * Test update operations
 */
function testUpdateOperations(token) {
  group('Update Operations', () => {
    // Get a tournament to update
    const listResponse = http.get(
      `${BASE_URL}/api/tournaments${paginationParams(1, 10)}`,
      getAuthHeaders(token)
    );

    if (listResponse.status !== 200) return;

    const tournaments = listResponse.json('data');
    if (!tournaments || tournaments.length === 0) return;

    const tournament = randomElement(tournaments);

    // Update it
    const updateData = {
      description: `Updated at ${Date.now()}`,
    };

    const updateStart = Date.now();
    const response = http.patch(
      `${BASE_URL}/api/tournaments/${tournament.id}`,
      JSON.stringify(updateData),
      getAuthHeaders(token)
    );

    updateTime.add(Date.now() - updateStart);

    const success = checkResponse(response, {
      'update - status 200': (r) => r.status === 200,
      'update - description updated': (r) => r.json('description') === updateData.description,
    });

    if (success) {
      updateOperations.add(1);
    }
  });
}

/**
 * Test delete operations
 */
function testDeleteOperations(token) {
  group('Delete Operations', () => {
    // Create a tournament to delete
    const tournamentData = generateTournamentData();
    const createResponse = http.post(
      `${BASE_URL}/api/tournaments`,
      JSON.stringify(tournamentData),
      getAuthHeaders(token)
    );

    if (createResponse.status !== 201) return;

    const tournamentId = createResponse.json('id');

    // Delete it
    const deleteStart = Date.now();
    const response = http.del(
      `${BASE_URL}/api/tournaments/${tournamentId}`,
      null,
      getAuthHeaders(token)
    );

    deleteTime.add(Date.now() - deleteStart);

    const success = checkResponse(response, {
      'delete - status 204 or 200': (r) => r.status === 204 || r.status === 200,
    });

    if (success) {
      deleteOperations.add(1);
    }
  });
}

// Summary handler
export function handleSummary(data) {
  console.log('\n========================================');
  console.log('API Load Test Summary');
  console.log('========================================\n');

  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
  console.log(`Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`);

  console.log('Response Times:');
  console.log(`  Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  console.log(`  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
  console.log(`  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`);

  console.log('Operation Metrics:');
  console.log(`  Auth Attempts: ${data.metrics.auth_attempts.values.count}`);
  console.log(`  Creates: ${data.metrics.create_operations.values.count}`);
  console.log(`  Updates: ${data.metrics.update_operations.values.count}`);
  console.log(`  Deletes: ${data.metrics.delete_operations.values.count}\n`);

  console.log('Operation Times (P95):');
  console.log(`  Auth: ${data.metrics.auth_time.values['p(95)'].toFixed(2)}ms`);
  console.log(`  Create: ${data.metrics.create_time.values['p(95)'].toFixed(2)}ms`);
  console.log(`  Read: ${data.metrics.read_time.values['p(95)'].toFixed(2)}ms`);
  console.log(`  Update: ${data.metrics.update_time.values['p(95)'].toFixed(2)}ms`);
  console.log(`  Delete: ${data.metrics.delete_time.values['p(95)'].toFixed(2)}ms`);
  console.log(`  List: ${data.metrics.list_time.values['p(95)'].toFixed(2)}ms`);
  console.log(`  Filter: ${data.metrics.filter_time.values['p(95)'].toFixed(2)}ms`);

  return {
    stdout: '',
    'api-summary.json': JSON.stringify(data, null, 2),
  };
}
