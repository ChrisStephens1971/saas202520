/**
 * Privacy Controls Service
 * Sprint 10 Week 2 - Day 4: Search & Settings
 *
 * Manages player privacy settings and visibility controls.
 * Ensures proper access control for profile data.
 *
 * @module privacy-service
 */

import { PrismaClient } from '@prisma/client';
import { PrivacySettings, UpdateSettingsRequest, PlayerProfileError } from '../types';

const prisma = new PrismaClient();

// ============================================================================
// VISIBILITY CHECKS
// ============================================================================

/**
 * Check if a viewer can see a player's profile
 *
 * @param playerId - Target player ID
 * @param viewerId - Viewer player ID (optional)
 * @param tenantId - Tenant ID
 * @returns Visibility permissions object
 */
export async function checkProfileVisibility(
  playerId: string,
  viewerId: string | undefined,
  tenantId: string
): Promise<{
  canViewProfile: boolean;
  canViewStats: boolean;
  canViewHistory: boolean;
  canViewAchievements: boolean;
  canViewLocation: boolean;
  reason?: string;
}> {
  try {
    // Get player's privacy settings
    const profile = await prisma.playerProfile.findFirst({
      where: {
        playerId,
        tenantId,
      },
    });

    if (!profile) {
      return {
        canViewProfile: false,
        canViewStats: false,
        canViewHistory: false,
        canViewAchievements: false,
        canViewLocation: false,
        reason: 'Profile not found',
      };
    }

    const privacySettings = profile.privacySettings as PrivacySettings;
    const isOwner = viewerId === playerId;

    // Owner can always see everything
    if (isOwner) {
      return {
        canViewProfile: true,
        canViewStats: true,
        canViewHistory: true,
        canViewAchievements: true,
        canViewLocation: true,
      };
    }

    // Check profile visibility
    if (!privacySettings.profilePublic) {
      return {
        canViewProfile: false,
        canViewStats: false,
        canViewHistory: false,
        canViewAchievements: false,
        canViewLocation: false,
        reason: 'Profile is private',
      };
    }

    // Profile is public, check individual settings
    return {
      canViewProfile: true,
      canViewStats: privacySettings.showStats !== false,
      canViewHistory: privacySettings.showHistory !== false,
      canViewAchievements: privacySettings.showAchievements !== false,
      canViewLocation: privacySettings.showLocation !== false,
    };
  } catch (error) {
    console.error('[checkProfileVisibility] Error:', error);
    return {
      canViewProfile: false,
      canViewStats: false,
      canViewHistory: false,
      canViewAchievements: false,
      canViewLocation: false,
      reason: 'Error checking visibility',
    };
  }
}

/**
 * Check if a specific field is visible
 *
 * @param playerId - Target player ID
 * @param viewerId - Viewer player ID (optional)
 * @param tenantId - Tenant ID
 * @param field - Field name to check
 * @returns True if field is visible
 */
export async function canViewField(
  playerId: string,
  viewerId: string | undefined,
  tenantId: string,
  field: 'stats' | 'history' | 'achievements' | 'location'
): Promise<boolean> {
  const visibility = await checkProfileVisibility(playerId, viewerId, tenantId);

  switch (field) {
    case 'stats':
      return visibility.canViewStats;
    case 'history':
      return visibility.canViewHistory;
    case 'achievements':
      return visibility.canViewAchievements;
    case 'location':
      return visibility.canViewLocation;
    default:
      return false;
  }
}

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

/**
 * Get player privacy settings
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @returns Privacy settings
 */
export async function getPlayerSettings(playerId: string, tenantId: string): Promise<PrivacySettings> {
  try {
    const profile = await prisma.playerProfile.findFirst({
      where: {
        playerId,
        tenantId,
      },
    });

    if (!profile) {
      // Return default settings if profile doesn't exist
      return {
        profilePublic: true,
        showStats: true,
        showHistory: true,
        showAchievements: true,
        showLocation: true,
      };
    }

    return profile.privacySettings as PrivacySettings;
  } catch (error) {
    console.error('[getPlayerSettings] Error:', error);
    throw new PlayerProfileError('Failed to get player settings', 'GET_SETTINGS_ERROR');
  }
}

/**
 * Update player privacy and notification settings
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @param request - Settings update request
 * @returns Updated profile
 */
export async function updatePlayerSettings(playerId: string, tenantId: string, request: UpdateSettingsRequest): Promise<any> {
  try {
    // Get existing profile or create new one
    let profile = await prisma.playerProfile.findFirst({
      where: {
        playerId,
        tenantId,
      },
    });

    if (!profile) {
      // Create profile with settings
      profile = await prisma.playerProfile.create({
        data: {
          playerId,
          tenantId,
          privacySettings: request.privacySettings || {
            profilePublic: true,
            showStats: true,
            showHistory: true,
            showAchievements: true,
            showLocation: true,
          },
          notificationPreferences: request.notificationPreferences || {
            email: true,
            sms: false,
            push: true,
            categories: {
              tournaments: true,
              matches: true,
              achievements: true,
              social: true,
            },
          },
        },
      });
    } else {
      // Update existing profile
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (request.privacySettings) {
        // Merge with existing privacy settings
        const currentSettings = (profile.privacySettings as PrivacySettings) || {} as PrivacySettings;
        updateData.privacySettings = {
          ...currentSettings,
          ...request.privacySettings,
        };
      }

      if (request.notificationPreferences) {
        // Merge with existing notification preferences
        const currentPreferences = (profile.notificationPreferences as NotificationPreferences) || {} as NotificationPreferences;
        updateData.notificationPreferences = {
          ...currentPreferences,
          ...request.notificationPreferences,
          categories: {
            ...(currentPreferences.categories || {}),
            ...(request.notificationPreferences.categories || {}),
          },
        };
      }

      profile = await prisma.playerProfile.update({
        where: {
          id: profile.id,
        },
        data: updateData,
      });
    }

    console.log(`[updatePlayerSettings] Updated settings for player ${playerId}`);

    return profile;
  } catch (error) {
    console.error('[updatePlayerSettings] Error:', error);
    throw new PlayerProfileError('Failed to update player settings', 'UPDATE_SETTINGS_ERROR');
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Set default privacy settings for a player
 * Used during initial profile creation
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @param isPublic - Whether profile should be public by default
 * @returns Created profile
 */
export async function setDefaultPrivacySettings(playerId: string, tenantId: string, isPublic: boolean = true): Promise<any> {
  try {
    const profile = await prisma.playerProfile.upsert({
      where: {
        playerId,
      },
      update: {},
      create: {
        playerId,
        tenantId,
        privacySettings: {
          profilePublic: isPublic,
          showStats: true,
          showHistory: true,
          showAchievements: true,
          showLocation: false, // Location private by default
        },
        notificationPreferences: {
          email: true,
          sms: false,
          push: true,
          categories: {
            tournaments: true,
            matches: true,
            achievements: true,
            social: true,
          },
        },
      },
    });

    return profile;
  } catch (error) {
    console.error('[setDefaultPrivacySettings] Error:', error);
    throw new PlayerProfileError('Failed to set default privacy settings', 'SET_DEFAULT_SETTINGS_ERROR');
  }
}

/**
 * Get all public profiles for a tenant
 * Used for player search and leaderboards
 *
 * @param tenantId - Tenant ID
 * @param limit - Maximum number of profiles to return
 * @returns Array of public profiles
 */
export async function getPublicProfiles(tenantId: string, limit: number = 100): Promise<any[]> {
  try {
    const profiles = await prisma.playerProfile.findMany({
      where: {
        tenantId,
        privacySettings: {
          path: ['profilePublic'],
          equals: true,
        },
      },
      take: limit,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return profiles;
  } catch (error) {
    console.error('[getPublicProfiles] Error:', error);
    return [];
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate privacy settings object
 *
 * @param settings - Privacy settings to validate
 * @returns Validation result
 */
export function validatePrivacySettings(settings: Partial<PrivacySettings>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that all boolean fields are actually booleans
  const booleanFields: (keyof PrivacySettings)[] = [
    'profilePublic',
    'showStats',
    'showHistory',
    'showAchievements',
    'showLocation',
  ];

  for (const field of booleanFields) {
    if (settings[field] !== undefined && typeof settings[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  }

  // Validate logic: if profile is private, other settings don't matter
  if (settings.profilePublic === false) {
    if (settings.showStats === true || settings.showHistory === true || settings.showAchievements === true) {
      errors.push('When profile is private, other visibility settings should be false');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize privacy settings to ensure consistency
 *
 * @param settings - Privacy settings to sanitize
 * @returns Sanitized settings
 */
export function sanitizePrivacySettings(settings: Partial<PrivacySettings>): PrivacySettings {
  const sanitized: PrivacySettings = {
    profilePublic: settings.profilePublic ?? true,
    showStats: settings.showStats ?? true,
    showHistory: settings.showHistory ?? true,
    showAchievements: settings.showAchievements ?? true,
    showLocation: settings.showLocation ?? false,
  };

  // If profile is private, force all other settings to false
  if (!sanitized.profilePublic) {
    sanitized.showStats = false;
    sanitized.showHistory = false;
    sanitized.showAchievements = false;
    sanitized.showLocation = false;
  }

  return sanitized;
}

// ============================================================================
// EXPORTS
// ============================================================================
// Functions are already exported above with 'export function ...'
