// Authentication and Authorization for Sync Service
// Validates JWT tokens and enforces room access control

import jwt from 'jsonwebtoken';
import type { IncomingMessage } from 'http';
import crypto from 'crypto';

const JWT_SECRET = process.env.AUTH_SECRET || 'dev-secret-change-in-production';

export interface TokenPayload {
  userId: string;
  orgId: string;
  orgSlug: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RoomAccessToken {
  tournamentId: string;
  orgId: string;
  userId: string;
  permissions: ('read' | 'write' | 'admin')[];
  exp: number;
}

/**
 * Verify JWT token from Authorization header or query parameter
 */
export function verifyToken(request: IncomingMessage): TokenPayload | null {
  try {
    // Try Authorization header first
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    }

    // Fallback to query parameter (for WebSocket connections from browsers)
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const tokenParam = url.searchParams.get('token');
    if (tokenParam) {
      return jwt.verify(tokenParam, JWT_SECRET) as TokenPayload;
    }

    return null;
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return null;
  }
}

/**
 * Generate a signed room access token
 * This prevents clients from accessing arbitrary tournaments
 */
export function generateRoomToken(
  tournamentId: string,
  orgId: string,
  userId: string,
  permissions: ('read' | 'write' | 'admin')[] = ['read', 'write'],
  expiresIn: string = '24h'
): string {
  const payload: RoomAccessToken = {
    tournamentId,
    orgId,
    userId,
    permissions,
    exp: Math.floor(Date.now() / 1000) + parseExpiration(expiresIn),
  };

  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Verify room access token and check permissions
 */
export function verifyRoomToken(token: string, tournamentId: string): RoomAccessToken | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as RoomAccessToken;

    // Verify the token is for the correct tournament
    if (payload.tournamentId !== tournamentId) {
      console.warn('[Auth] Room token tournament mismatch');
      return null;
    }

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.warn('[Auth] Room token expired');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('[Auth] Room token verification failed:', error);
    return null;
  }
}

/**
 * Parse expiration string to seconds
 */
function parseExpiration(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60; // Default 24 hours

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return value * (multipliers[unit as keyof typeof multipliers] || 1);
}

/**
 * Generate a secure, unguessable room identifier
 */
export function generateSecureRoomId(tournamentId: string, orgId: string): string {
  // Combine tournament ID + org ID + random suffix to prevent enumeration
  const suffix = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .createHash('sha256')
    .update(`${tournamentId}:${orgId}:${suffix}`)
    .digest('hex')
    .substring(0, 16);

  return `${tournamentId}-${hash}`;
}

/**
 * Extract tournament ID from secure room identifier
 */
export function extractTournamentId(secureRoomId: string): string | null {
  const parts = secureRoomId.split('-');
  if (parts.length < 2) return null;

  // Tournament ID is everything before the last part (hash)
  parts.pop(); // Remove hash
  return parts.join('-');
}

/**
 * Validate that a user has access to a specific tournament
 */
export async function validateTournamentAccess(
  tournamentId: string,
  orgId: string,
  userId: string
): Promise<boolean> {
  // TODO: Query database to verify:
  // 1. Tournament exists
  // 2. Tournament belongs to the user's organization
  // 3. User has permission to access this tournament

  // For now, just verify orgId matches (simplified)
  // In production, this should query Prisma
  console.log(`[Auth] Validating access: tournament=${tournamentId}, org=${orgId}, user=${userId}`);

  // Placeholder validation
  return true; // TODO: Implement real validation with Prisma
}

/**
 * Check if a user has a specific permission for a room
 */
export function hasPermission(
  roomToken: RoomAccessToken | null,
  permission: 'read' | 'write' | 'admin'
): boolean {
  if (!roomToken) return false;
  return roomToken.permissions.includes(permission) || roomToken.permissions.includes('admin');
}
