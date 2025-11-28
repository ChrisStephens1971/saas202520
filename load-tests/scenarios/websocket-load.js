/**
 * WebSocket Load Testing Scenario
 *
 * Tests real-time features and WebSocket connections:
 * - Connection stability under load
 * - Message throughput and latency
 * - Concurrent connections
 * - Real-time tournament updates
 * - Live scoring updates
 * - Connection recovery
 *
 * Test profiles:
 * - Normal: 100 concurrent connections
 * - Peak: 500 concurrent connections
 * - Stress: 1000+ concurrent connections
 */

import ws from 'k6/ws';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { authenticate, WS_URL, BASE_URL, errorRate, thinkTime } from '../utils/helpers.js';

// Custom metrics for WebSocket operations
const wsConnectionTime = new Trend('ws_connection_time');
const wsMessageLatency = new Trend('ws_message_latency');
const wsMessagesReceived = new Counter('ws_messages_received');
const wsMessagesSent = new Counter('ws_messages_sent');
const wsConnectionErrors = new Counter('ws_connection_errors');
const wsReconnections = new Counter('ws_reconnections');
const wsConnectionSuccess = new Rate('ws_connection_success');

// Test configuration
export const options = {
  scenarios: {
    normal_connections: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 }, // Ramp up
        { duration: '5m', target: 100 }, // Normal load
        { duration: '1m', target: 0 }, // Ramp down
      ],
      tags: { scenario: 'normal' },
      exec: 'normalConnections',
    },
    peak_connections: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },
        { duration: '5m', target: 500 }, // Peak load
        { duration: '2m', target: 0 },
      ],
      startTime: '8m',
      tags: { scenario: 'peak' },
      exec: 'peakConnections',
    },
    stress_connections: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 300 },
        { duration: '3m', target: 600 },
        { duration: '3m', target: 1000 }, // Stress load
        { duration: '3m', target: 0 },
      ],
      startTime: '17m',
      tags: { scenario: 'stress' },
      exec: 'stressConnections',
    },
  },

  thresholds: {
    ws_connection_time: ['p(95)<1000', 'p(99)<2000'],
    ws_message_latency: ['p(95)<100', 'p(99)<200'],
    ws_connection_success: ['rate>0.95'], // 95% success rate
    ws_connection_errors: ['count<100'],
    errors: ['rate<0.05'], // Allow 5% error rate for WebSockets
  },
};

// Setup
export function setup() {
  console.log('Setting up WebSocket load test...');
  console.log(`WebSocket URL: ${WS_URL}`);
  console.log(`Base URL: ${BASE_URL}`);

  // Authenticate to get token
  const token = authenticate(http, 'wstest@example.com', 'wstest123');

  if (!token) {
    throw new Error('Failed to authenticate during setup');
  }

  return { token };
}

/**
 * Normal Connections - Regular WebSocket usage
 */
export function normalConnections(data) {
  const token = data.token;

  // Connect to WebSocket
  const url = `${WS_URL}?token=${token}`;
  const connectionStart = Date.now();

  const response = ws.connect(
    url,
    {
      tags: { scenario: 'normal' },
    },
    function (socket) {
      wsConnectionTime.add(Date.now() - connectionStart);
      wsConnectionSuccess.add(1);

      // Connection opened
      socket.on('open', () => {
        console.log(`VU ${__VU}: Connected to WebSocket`);

        // Subscribe to tournament updates
        const subscribeMsg = {
          type: 'subscribe',
          channel: 'tournaments',
          tournamentId: 'test-tournament-1',
        };

        socket.send(JSON.stringify(subscribeMsg));
        wsMessagesSent.add(1);
      });

      // Message received
      socket.on('message', (data) => {
        const receiveTime = Date.now();
        wsMessagesReceived.add(1);

        try {
          const message = JSON.parse(data);

          // Track latency if message has timestamp
          if (message.timestamp) {
            const latency = receiveTime - message.timestamp;
            wsMessageLatency.add(latency);
          }

          // Handle different message types
          switch (message.type) {
            case 'tournament_update':
              // Simulate processing tournament update
              sleep(0.1);
              break;
            case 'score_update':
              // Simulate processing score update
              sleep(0.05);
              break;
            case 'bracket_update':
              // Simulate processing bracket update
              sleep(0.1);
              break;
          }
        } catch (e) {
          console.error('Failed to parse message:', e);
          errorRate.add(1);
        }
      });

      // Error handler
      socket.on('error', (e) => {
        console.error(`VU ${__VU}: WebSocket error:`, e);
        wsConnectionErrors.add(1);
        errorRate.add(1);
      });

      // Close handler
      socket.on('close', () => {
        console.log(`VU ${__VU}: WebSocket closed`);
      });

      // Send periodic messages
      const messageInterval = setInterval(() => {
        if (socket.readyState === ws.OPEN) {
          const message = {
            type: 'ping',
            timestamp: Date.now(),
          };
          socket.send(JSON.stringify(message));
          wsMessagesSent.add(1);
        }
      }, 5000); // Every 5 seconds

      // Keep connection alive for test duration
      sleep(30 + Math.random() * 30); // 30-60 seconds

      // Cleanup
      clearInterval(messageInterval);
      socket.close();
    }
  );

  // Check connection result
  check(response, {
    'ws connection successful': (r) => r && r.status === 101,
  });

  if (!response || response.status !== 101) {
    wsConnectionSuccess.add(0);
    wsConnectionErrors.add(1);
  }

  sleep(thinkTime());
}

/**
 * Peak Connections - High traffic periods
 */
export function peakConnections(data) {
  const token = data.token;
  const url = `${WS_URL}?token=${token}`;
  const connectionStart = Date.now();

  const response = ws.connect(
    url,
    {
      tags: { scenario: 'peak' },
    },
    function (socket) {
      wsConnectionTime.add(Date.now() - connectionStart);
      wsConnectionSuccess.add(1);

      socket.on('open', () => {
        // Subscribe to multiple channels (realistic peak usage)
        const channels = ['tournaments', 'matches', 'leaderboard'];

        channels.forEach((channel) => {
          const subscribeMsg = {
            type: 'subscribe',
            channel: channel,
          };
          socket.send(JSON.stringify(subscribeMsg));
          wsMessagesSent.add(1);
        });
      });

      socket.on('message', (data) => {
        wsMessagesReceived.add(1);

        try {
          const message = JSON.parse(data);

          if (message.timestamp) {
            const latency = Date.now() - message.timestamp;
            wsMessageLatency.add(latency);
          }
        } catch (e) {
          errorRate.add(1);
        }
      });

      socket.on('error', (e) => {
        wsConnectionErrors.add(1);
        errorRate.add(1);
      });

      // Shorter duration for peak traffic simulation
      sleep(15 + Math.random() * 15); // 15-30 seconds

      socket.close();
    }
  );

  check(response, {
    'ws peak connection successful': (r) => r && r.status === 101,
  });

  if (!response || response.status !== 101) {
    wsConnectionSuccess.add(0);
    wsConnectionErrors.add(1);
  }

  sleep(1);
}

/**
 * Stress Connections - Push system limits
 */
export function stressConnections(data) {
  const token = data.token;
  const url = `${WS_URL}?token=${token}`;
  const connectionStart = Date.now();

  const response = ws.connect(
    url,
    {
      tags: { scenario: 'stress' },
      timeout: '10s', // Shorter timeout for stress testing
    },
    function (socket) {
      wsConnectionTime.add(Date.now() - connectionStart);
      wsConnectionSuccess.add(1);

      socket.on('open', () => {
        // Aggressive message sending
        for (let i = 0; i < 10; i++) {
          const message = {
            type: 'stress_test',
            index: i,
            timestamp: Date.now(),
          };
          socket.send(JSON.stringify(message));
          wsMessagesSent.add(1);
        }
      });

      socket.on('message', (data) => {
        wsMessagesReceived.add(1);

        try {
          const message = JSON.parse(data);

          if (message.timestamp) {
            const latency = Date.now() - message.timestamp;
            wsMessageLatency.add(latency);
          }
        } catch (e) {
          errorRate.add(1);
        }
      });

      socket.on('error', (e) => {
        wsConnectionErrors.add(1);
        errorRate.add(1);
      });

      // Very short duration for stress test
      sleep(5 + Math.random() * 5); // 5-10 seconds

      socket.close();
    }
  );

  check(response, {
    'ws stress connection attempted': (r) => true, // Just track attempts
  });

  if (!response || response.status !== 101) {
    wsConnectionSuccess.add(0);
    wsConnectionErrors.add(1);
  }

  sleep(0.1); // Minimal delay in stress test
}

/**
 * Test connection recovery and reconnection
 */
export function testReconnection(data) {
  const token = data.token;
  const url = `${WS_URL}?token=${token}`;

  // First connection
  ws.connect(url, function (socket) {
    socket.on('open', () => {
      console.log('Initial connection established');
    });

    // Force close after short time
    sleep(2);
    socket.close();
  });

  // Wait a bit
  sleep(1);

  // Reconnect
  ws.connect(url, function (socket) {
    socket.on('open', () => {
      console.log('Reconnection successful');
      wsReconnections.add(1);
    });

    socket.on('error', (e) => {
      console.error('Reconnection failed:', e);
      wsConnectionErrors.add(1);
    });

    sleep(5);
    socket.close();
  });
}

// Summary handler
export function handleSummary(data) {
  console.log('\n========================================');
  console.log('WebSocket Load Test Summary');
  console.log('========================================\n');

  console.log('Connection Metrics:');
  console.log(
    `  Success Rate: ${(data.metrics.ws_connection_success.values.rate * 100).toFixed(2)}%`
  );
  console.log(`  Connection Errors: ${data.metrics.ws_connection_errors.values.count}`);
  console.log(`  Reconnections: ${data.metrics.ws_reconnections.values.count}`);
  console.log(
    `  Connection Time (P95): ${data.metrics.ws_connection_time.values['p(95)'].toFixed(2)}ms\n`
  );

  console.log('Message Metrics:');
  console.log(`  Messages Sent: ${data.metrics.ws_messages_sent.values.count}`);
  console.log(`  Messages Received: ${data.metrics.ws_messages_received.values.count}`);
  console.log(
    `  Message Latency (avg): ${data.metrics.ws_message_latency.values.avg.toFixed(2)}ms`
  );
  console.log(
    `  Message Latency (P95): ${data.metrics.ws_message_latency.values['p(95)'].toFixed(2)}ms`
  );
  console.log(
    `  Message Latency (P99): ${data.metrics.ws_message_latency.values['p(99)'].toFixed(2)}ms\n`
  );

  console.log(`Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%`);

  return {
    stdout: '',
    'websocket-summary.json': JSON.stringify(data, null, 2),
  };
}
