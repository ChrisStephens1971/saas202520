/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin Test Data Fixtures
 * Sprint 9 Phase 2 - Admin Dashboard Tests
 */

/**
 * Create test user with admin role
 */
export function createAdminUser(overrides?: Partial<any>) {
  return {
    id: overrides?.id || 'admin_user_123',
    name: overrides?.name || 'Admin User',
    email: overrides?.email || 'admin@saas202520.com',
    emailVerified: new Date(),
    image: null,
    password: null, // Hashed password would go here
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test user with organizer role
 */
export function createOrganizerUser(overrides?: Partial<any>) {
  return {
    id: overrides?.id || 'organizer_user_123',
    name: overrides?.name || 'Organizer User',
    email: overrides?.email || 'organizer@saas202520.com',
    emailVerified: new Date(),
    image: null,
    password: null,
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test user with player role
 */
export function createPlayerUser(overrides?: Partial<any>) {
  return {
    id: overrides?.id || 'player_user_123',
    name: overrides?.name || 'Player User',
    email: overrides?.email || 'player@saas202520.com',
    emailVerified: new Date(),
    image: null,
    password: null,
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create organization member with role
 */
export function createOrgMember(orgId: string, userId: string, role: string) {
  return {
    id: `member_${Math.floor(Math.random() * 10000)}`,
    orgId,
    userId,
    role, // owner, admin, td, scorekeeper, streamer
    createdAt: new Date(),
  };
}

/**
 * Create audit log entry
 */
export function createAuditLog(overrides?: Partial<any>) {
  return {
    id: overrides?.id || `audit_${Math.floor(Math.random() * 10000)}`,
    userId: overrides?.userId || 'admin_user_123',
    action: overrides?.action || 'tournament.created',
    resource: overrides?.resource || 'tournament',
    resourceId: overrides?.resourceId || 'tour_123',
    details: overrides?.details || { name: 'Test Tournament' },
    ipAddress: overrides?.ipAddress || '192.168.1.1',
    userAgent: overrides?.userAgent || 'Mozilla/5.0',
    timestamp: overrides?.timestamp || new Date(),
    ...overrides,
  };
}

/**
 * Create analytics data
 */
export function createAnalyticsData(overrides?: Partial<any>) {
  return {
    date: overrides?.date || new Date().toISOString().split('T')[0],
    totalUsers: overrides?.totalUsers || 150,
    activeUsers: overrides?.activeUsers || 85,
    totalTournaments: overrides?.totalTournaments || 45,
    activeTournaments: overrides?.activeTournaments || 12,
    totalRevenue: overrides?.totalRevenue || 125000, // cents
    avgTournamentSize: overrides?.avgTournamentSize || 24,
    ...overrides,
  };
}

/**
 * Create system settings
 */
export function createSystemSettings(overrides?: Partial<any>) {
  return {
    id: overrides?.id || 'settings_system',
    category: overrides?.category || 'general',
    key: overrides?.key || 'maintenance_mode',
    value: overrides?.value || false,
    description: overrides?.description || 'Enable maintenance mode',
    updatedBy: overrides?.updatedBy || 'admin_user_123',
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create feature flag
 */
export function createFeatureFlag(overrides?: Partial<any>) {
  return {
    id: overrides?.id || `flag_${Math.floor(Math.random() * 10000)}`,
    name: overrides?.name || 'enable_chip_format',
    enabled: overrides?.enabled ?? true,
    description: overrides?.description || 'Enable chip format tournaments',
    rolloutPercentage: overrides?.rolloutPercentage || 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create tournament for admin tests
 */
export function createAdminTournament(orgId: string, overrides?: Partial<any>) {
  return {
    id: overrides?.id || `tour_admin_${Math.floor(Math.random() * 10000)}`,
    orgId,
    name: overrides?.name || 'Admin Test Tournament',
    description: overrides?.description || 'Test tournament for admin tests',
    status: overrides?.status || 'registration',
    format: overrides?.format || 'single_elimination',
    sportConfigId: overrides?.sportConfigId || 'pool_8ball',
    sportConfigVersion: overrides?.sportConfigVersion || '1.0.0',
    createdBy: overrides?.createdBy || 'admin_user_123',
    createdAt: overrides?.createdAt || new Date(),
    startedAt: overrides?.startedAt || null,
    completedAt: overrides?.completedAt || null,
    ...overrides,
  };
}

/**
 * Create user management data
 */
export function createUserManagementData(overrides?: Partial<any>) {
  return {
    id: overrides?.id || `user_${Math.floor(Math.random() * 10000)}`,
    name: overrides?.name || 'Test User',
    email: overrides?.email || `user${Math.floor(Math.random() * 1000)}@example.com`,
    emailVerified: overrides?.emailVerified || new Date(),
    status: overrides?.status || 'active', // active, suspended, banned
    suspendedUntil: overrides?.suspendedUntil || null,
    bannedReason: overrides?.bannedReason || null,
    bannedAt: overrides?.bannedAt || null,
    bannedBy: overrides?.bannedBy || null,
    createdAt: overrides?.createdAt || new Date(),
    lastLoginAt: overrides?.lastLoginAt || new Date(),
    ...overrides,
  };
}

/**
 * Mock chart data for analytics
 */
export const mockChartData = {
  userGrowth: [
    { date: '2025-01-01', users: 100 },
    { date: '2025-01-02', users: 115 },
    { date: '2025-01-03', users: 130 },
    { date: '2025-01-04', users: 145 },
    { date: '2025-01-05', users: 150 },
  ],
  tournamentActivity: [
    { date: '2025-01-01', tournaments: 40 },
    { date: '2025-01-02', tournaments: 42 },
    { date: '2025-01-03', tournaments: 43 },
    { date: '2025-01-04', tournaments: 44 },
    { date: '2025-01-05', tournaments: 45 },
  ],
  revenueData: [
    { date: '2025-01-01', revenue: 100000 },
    { date: '2025-01-02', revenue: 105000 },
    { date: '2025-01-03', revenue: 110000 },
    { date: '2025-01-04', revenue: 120000 },
    { date: '2025-01-05', revenue: 125000 },
  ],
};

/**
 * Bulk operation test data
 */
export function createBulkOperationData(count: number, baseFn: (i: number) => any) {
  const items: any[] = [];
  for (let i = 0; i < count; i++) {
    items.push(baseFn(i));
  }
  return items;
}

/**
 * CSV export data sample
 */
export const csvExportSample = `Date,Action,User,Resource,Details
2025-01-05,tournament.created,admin@saas202520.com,tournament,"Tournament: Test Tournament 1"
2025-01-05,user.updated,admin@saas202520.com,user,"User role changed to admin"
2025-01-04,tournament.deleted,admin@saas202520.com,tournament,"Tournament: Old Tournament"
2025-01-04,settings.updated,admin@saas202520.com,settings,"maintenance_mode: false"
2025-01-03,user.banned,admin@saas202520.com,user,"User: bad@example.com"`;
