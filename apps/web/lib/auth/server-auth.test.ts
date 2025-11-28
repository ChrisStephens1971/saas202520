import { describe, it, expect, vi } from 'vitest';
import { ensureOrgAccess, getOrgIdFromSession } from './server-auth';

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

import { auth } from '@/auth';

describe('Server Auth Helpers', () => {
  it('getOrgIdFromSession should return orgId if session exists', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { orgId: 'org-123' },
    } as any);

    const orgId = await getOrgIdFromSession();
    expect(orgId).toBe('org-123');
  });

  // Note: We can't easily test the redirect in unit tests without more mocking,
  // but we can test the happy path.

  it('ensureOrgAccess should return orgId if matches', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { orgId: 'org-123' },
    } as any);

    const result = await ensureOrgAccess('org-123');
    expect(result).toBe('org-123');
  });

  it('ensureOrgAccess should throw if orgId does not match', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { orgId: 'org-123' },
    } as any);

    await expect(ensureOrgAccess('org-456')).rejects.toThrow('Forbidden');
  });
});
