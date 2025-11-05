/**
 * Vitest Test Setup
 * Global setup and teardown for integration tests
 */

import { beforeAll, afterAll } from 'vitest';

// Load environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/tournament_test';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_testing';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-key';
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  // Additional global setup can go here
});

afterAll(async () => {
  console.log('✅ Test environment cleanup complete');
});
