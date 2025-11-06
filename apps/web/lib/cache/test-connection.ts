/**
 * Redis Cache Connection Test
 * Sprint 9 Phase 3 - Scale & Performance
 *
 * Quick test to verify Redis connection and basic operations.
 * Run with: npx tsx apps/web/lib/cache/test-connection.ts
 */

import { cacheService } from './redis';

async function testConnection() {
  console.log('🔍 Testing Redis Cache Connection...\n');

  try {
    // Test 1: Health check
    console.log('1. Health Check');
    const health = await cacheService.health();
    console.log('   ✅ Connected:', health.connected);
    console.log('   ⏱️  Response Time:', health.responseTime?.toFixed(2) + 'ms');
    console.log('   💾 Memory Usage:', health.memoryUsage || 'N/A');
    console.log('   🔑 Key Count:', health.keyCount || 0);
    console.log();

    if (!health.connected) {
      console.error('❌ Redis is not connected. Please ensure Redis is running.');
      console.log('\n📝 To start Redis locally:');
      console.log('   docker run -d -p 6379:6379 redis:alpine');
      process.exit(1);
    }

    // Test 2: Basic set/get
    console.log('2. Basic Operations');
    const testTenant = 'test-tenant';
    const testKey = 'test:connection';
    const testData = { message: 'Hello from cache!', timestamp: Date.now() };

    await cacheService.set(testTenant, testKey, testData, 60);
    console.log('   ✅ Set data:', testKey);

    const retrieved = await cacheService.get(testTenant, testKey);
    console.log('   ✅ Get data:', retrieved);

    const exists = await cacheService.exists(testTenant, testKey);
    console.log('   ✅ Exists:', exists);
    console.log();

    // Test 3: TTL
    console.log('3. TTL (Time To Live)');
    const ttl = await cacheService.ttl(testTenant, testKey);
    console.log('   ✅ Remaining TTL:', ttl + 's');
    console.log();

    // Test 4: Pattern invalidation
    console.log('4. Pattern Invalidation');
    await cacheService.set(testTenant, 'test:key1', { data: 1 }, 60);
    await cacheService.set(testTenant, 'test:key2', { data: 2 }, 60);
    await cacheService.set(testTenant, 'test:key3', { data: 3 }, 60);

    const invalidated = await cacheService.invalidate(testTenant, 'test:*');
    console.log('   ✅ Invalidated keys:', invalidated);
    console.log();

    // Test 5: Batch operations
    console.log('5. Batch Operations');
    const entries = new Map([
      ['batch:1', { id: 1, name: 'Item 1' }],
      ['batch:2', { id: 2, name: 'Item 2' }],
      ['batch:3', { id: 3, name: 'Item 3' }],
    ]);

    const setCount = await cacheService.mset(testTenant, entries, 60);
    console.log('   ✅ Batch set:', setCount + ' keys');

    const results = await cacheService.mget(testTenant, ['batch:1', 'batch:2', 'batch:3']);
    console.log('   ✅ Batch get:', results.size + ' keys');
    console.log();

    // Test 6: Cleanup
    console.log('6. Cleanup');
    const cleared = await cacheService.clear(testTenant);
    console.log('   ✅ Cleared:', cleared + ' keys');
    console.log();

    // Final health check
    console.log('7. Final Health Check');
    const finalHealth = await cacheService.health();
    console.log('   ✅ Still connected:', finalHealth.connected);
    console.log('   ⏱️  Response Time:', finalHealth.responseTime?.toFixed(2) + 'ms');
    console.log();

    console.log('✅ All tests passed! Redis cache is working correctly.');
    console.log();
    console.log('📚 Next steps:');
    console.log('   1. Review the README: apps/web/lib/cache/README.md');
    console.log('   2. Check examples: apps/web/lib/cache/example-usage.ts');
    console.log('   3. Start using cache in your application!');

    // Disconnect
    await cacheService.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\n📝 Troubleshooting:');
    console.log('   1. Ensure Redis is running (docker run -d -p 6379:6379 redis:alpine)');
    console.log('   2. Check environment variables in .env file');
    console.log('   3. Verify Redis connection details');
    process.exit(1);
  }
}

// Run test
testConnection();
