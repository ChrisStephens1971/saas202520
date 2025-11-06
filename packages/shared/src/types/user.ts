/**
 * User Management Types
 * Sprint 9 Phase 2 - Admin Dashboard
 */

export enum UserRole {
  ADMIN = 'admin',
  ORGANIZER = 'organizer',
  PLAYER = 'player',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  PENDING = 'pending',
}

export enum Permission {
  // Admin permissions
  ADMIN_FULL_ACCESS = 'admin:*',
  USERS_VIEW = 'users:view',
  USERS_EDIT = 'users:edit',
  USERS_DELETE = 'users:delete',
  USERS_BAN = 'users:ban',
  USERS_SUSPEND = 'users:suspend',
  ROLES_MANAGE = 'roles:manage',

  // Tournament permissions
  TOURNAMENTS_VIEW_ALL = 'tournaments:view:all',
  TOURNAMENTS_VIEW_OWN = 'tournaments:view:own',
  TOURNAMENTS_CREATE = 'tournaments:create',
  TOURNAMENTS_EDIT_ALL = 'tournaments:edit:all',
  TOURNAMENTS_EDIT_OWN = 'tournaments:edit:own',
  TOURNAMENTS_DELETE_ALL = 'tournaments:delete:all',
  TOURNAMENTS_DELETE_OWN = 'tournaments:delete:own',

  // Organization permissions
  ORGANIZATIONS_VIEW = 'organizations:view',
  ORGANIZATIONS_EDIT = 'organizations:edit',
  ORGANIZATIONS_MANAGE_MEMBERS = 'organizations:manage:members',

  // Player permissions
  PROFILE_VIEW_OWN = 'profile:view:own',
  PROFILE_EDIT_OWN = 'profile:edit:own',
  TOURNAMENTS_REGISTER = 'tournaments:register',
}

export type RolePermissions = {
  [key in UserRole]: Permission[];
};

export const ROLE_PERMISSIONS: RolePermissions = {
  [UserRole.ADMIN]: [Permission.ADMIN_FULL_ACCESS],
  [UserRole.ORGANIZER]: [
    Permission.TOURNAMENTS_VIEW_ALL,
    Permission.TOURNAMENTS_CREATE,
    Permission.TOURNAMENTS_EDIT_OWN,
    Permission.TOURNAMENTS_DELETE_OWN,
    Permission.ORGANIZATIONS_VIEW,
    Permission.ORGANIZATIONS_MANAGE_MEMBERS,
    Permission.PROFILE_VIEW_OWN,
    Permission.PROFILE_EDIT_OWN,
  ],
  [UserRole.PLAYER]: [
    Permission.TOURNAMENTS_VIEW_OWN,
    Permission.PROFILE_VIEW_OWN,
    Permission.PROFILE_EDIT_OWN,
    Permission.TOURNAMENTS_REGISTER,
  ],
};

export interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  bannedAt: Date | null;
  bannedBy: string | null;
  banReason: string | null;
  suspendedUntil: Date | null;
  suspensionReason: string | null;
}

export interface UserWithActivity extends User {
  totalTournaments: number;
  totalMatches: number;
  totalWins: number;
  lastActivityAt: Date | null;
  organizationCount: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

export interface UserModerationAction {
  id: string;
  userId: string;
  actionType: 'warn' | 'suspend' | 'ban' | 'unban' | 'unsuspend';
  reason: string;
  performedBy: string;
  performedAt: Date;
  expiresAt: Date | null;
  metadata: Record<string, any>;
}

export interface UserSearchFilters {
  query?: string;
  role?: UserRole;
  status?: UserStatus;
  organizationId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface UserListResponse {
  users: UserWithActivity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserDetailResponse {
  user: UserWithActivity;
  organizations: {
    id: string;
    name: string;
    role: string;
    joinedAt: Date;
  }[];
  recentActivity: UserActivity[];
  moderationHistory: UserModerationAction[];
  tournaments: {
    id: string;
    name: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
  }[];
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  image?: string;
}

export interface ModerationRequest {
  action: 'warn' | 'suspend' | 'ban' | 'unban' | 'unsuspend';
  reason: string;
  duration?: number; // Duration in days for suspensions
  notifyUser?: boolean;
}

export interface BulkUserOperation {
  userIds: string[];
  operation: 'delete' | 'suspend' | 'activate' | 'change_role';
  operationData?: {
    role?: UserRole;
    suspensionDuration?: number;
    reason?: string;
  };
}

// Permission checking utilities
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];

  // Admin has all permissions
  if (rolePermissions.includes(Permission.ADMIN_FULL_ACCESS)) {
    return true;
  }

  return rolePermissions.includes(permission);
}

export function canAccessResource(
  role: UserRole,
  permission: Permission,
  userId: string,
  resourceOwnerId?: string
): boolean {
  // Check if user has the permission
  if (!hasPermission(role, permission)) {
    return false;
  }

  // If permission is "own" scoped, check ownership
  if (permission.includes(':own') && resourceOwnerId) {
    return userId === resourceOwnerId;
  }

  return true;
}
