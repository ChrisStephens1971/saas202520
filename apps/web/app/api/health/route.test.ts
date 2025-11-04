/**
 * Unit tests for Health Check endpoint
 */

import { GET } from './route';

describe('/api/health', () => {
  it('should return 200 status', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('should return status field with "ok" value', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
  });

  it('should include timestamp in response', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty('timestamp');
    expect(typeof data.timestamp).toBe('string');
    // Verify it's a valid ISO date
    expect(() => new Date(data.timestamp)).not.toThrow();
  });

  it('should include service name', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty('service');
    expect(data.service).toBe('tournament-platform-api');
  });

  it('should NOT require tenant_id (public endpoint)', async () => {
    // This test verifies the endpoint works without tenant context
    const response = await GET();
    expect(response.status).toBe(200);

    // No tenant validation should be performed
    const data = await response.json();
    expect(data.status).toBe('ok');
  });
});
