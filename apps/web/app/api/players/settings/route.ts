/**
 * Player Settings API Endpoint
 * Sprint 10 Week 2: Player Profiles & Enhanced Experience
 *
 * GET /api/players/settings - Get current user's settings
 * PUT /api/players/settings - Update current user's settings
 *
 * Multi-tenant with privacy and notification preferences
 */

import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth'; // TODO: Uncomment when auth is connected
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Note: PrivacySettingsSchema defined but not used directly (fields validated via UpdateSettingsSchema)

const NotificationCategoriesSchema = z.object({
  tournaments: z.boolean().optional(),
  matches: z.boolean().optional(),
  achievements: z.boolean().optional(),
  social: z.boolean().optional(),
});

const NotificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
  categories: NotificationCategoriesSchema.optional(),
});

const UpdateSettingsSchema = z.object({
  // Privacy settings
  isProfilePublic: z.boolean().optional(),
  showStatistics: z.boolean().optional(),
  showAchievements: z.boolean().optional(),
  showHistory: z.boolean().optional(),

  // Notification preferences
  emailNotifications: NotificationPreferencesSchema.optional(),
  pushNotifications: NotificationPreferencesSchema.optional(),
  smsNotifications: NotificationPreferencesSchema.optional(),

  // Display preferences
  theme: z.enum(['LIGHT', 'DARK', 'AUTO']).optional(),
  language: z.string().min(2).max(10).optional(),
  timezone: z.string().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current user and tenant from session
 * TODO: Replace with actual session handling when auth is connected
 */
async function getCurrentUser(): Promise<{ userId: string; tenantId: string; playerId: string }> {
  // const session = await getServerSession();
  // if (!session?.user?.id || !session?.user?.orgId) {
  //   throw new Error('Unauthorized');
  // }
  // return {
  //   userId: session.user.id,
  //   tenantId: session.user.orgId,
  //   playerId: session.user.playerId, // Assuming user has associated player
  // };

  // Mock user for development
  return {
    userId: 'user_123',
    tenantId: 'org_123',
    playerId: 'player_123',
  };
}

/**
 * Get or create default settings for a player
 */
async function getOrCreateSettings(playerId: string, tenantId: string) {
  let settings = await prisma.playerSettings.findFirst({
    where: {
      playerId,
      tenantId,
    },
  });

  // Create default settings if none exist
  if (!settings) {
    settings = await prisma.playerSettings.create({
      data: {
        playerId,
        tenantId,
        isProfilePublic: true,
        showStatistics: true,
        showAchievements: true,
        showHistory: true,
        emailNotifications: {
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
        pushNotifications: {
          email: false,
          sms: false,
          push: true,
          categories: {
            tournaments: true,
            matches: true,
            achievements: true,
            social: false,
          },
        },
        smsNotifications: {
          email: false,
          sms: true,
          push: false,
          categories: {
            tournaments: false,
            matches: true,
            achievements: false,
            social: false,
          },
        },
        theme: 'LIGHT',
        language: 'en',
        timezone: null,
      },
    });
  }

  return settings;
}

// ============================================================================
// GET HANDLER - Fetch Current User's Settings
// ============================================================================

export async function GET() {
  try {
    // Get current user from session
    const { playerId, tenantId } = await getCurrentUser();

    // Fetch or create settings
    const settings = await getOrCreateSettings(playerId, tenantId);

    // Format response
    return NextResponse.json({
      settings: {
        // Privacy settings
        privacy: {
          isProfilePublic: settings.isProfilePublic,
          showStatistics: settings.showStatistics,
          showAchievements: settings.showAchievements,
          showHistory: settings.showHistory,
        },

        // Notification preferences
        notifications: {
          email: settings.emailNotifications,
          push: settings.pushNotifications,
          sms: settings.smsNotifications,
        },

        // Display preferences
        display: {
          theme: settings.theme,
          language: settings.language,
          timezone: settings.timezone,
        },

        // Metadata
        metadata: {
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/players/settings] Error:', error);

    // Handle unauthorized errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to view settings',
        },
        { status: 401 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Failed to fetch settings',
        message: 'An unexpected error occurred while fetching settings',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT HANDLER - Update Current User's Settings
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    // Get current user from session
    const { playerId, tenantId } = await getCurrentUser();

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          message: 'One or more fields contain invalid values',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Ensure settings exist
    await getOrCreateSettings(playerId, tenantId);

    // Build update object
    const updateFields: Record<string, unknown> = {};

    // Privacy settings
    if (updateData.isProfilePublic !== undefined) {
      updateFields.isProfilePublic = updateData.isProfilePublic;
    }
    if (updateData.showStatistics !== undefined) {
      updateFields.showStatistics = updateData.showStatistics;
    }
    if (updateData.showAchievements !== undefined) {
      updateFields.showAchievements = updateData.showAchievements;
    }
    if (updateData.showHistory !== undefined) {
      updateFields.showHistory = updateData.showHistory;
    }

    // Notification preferences
    if (updateData.emailNotifications !== undefined) {
      updateFields.emailNotifications = updateData.emailNotifications;
    }
    if (updateData.pushNotifications !== undefined) {
      updateFields.pushNotifications = updateData.pushNotifications;
    }
    if (updateData.smsNotifications !== undefined) {
      updateFields.smsNotifications = updateData.smsNotifications;
    }

    // Display preferences
    if (updateData.theme !== undefined) {
      updateFields.theme = updateData.theme;
    }
    if (updateData.language !== undefined) {
      updateFields.language = updateData.language;
    }
    if (updateData.timezone !== undefined) {
      updateFields.timezone = updateData.timezone;
    }

    // Update settings in database
    const updatedSettings = await prisma.playerSettings.update({
      where: {
        playerId,
      },
      data: updateFields,
    });

    // Format response
    return NextResponse.json({
      settings: {
        // Privacy settings
        privacy: {
          isProfilePublic: updatedSettings.isProfilePublic,
          showStatistics: updatedSettings.showStatistics,
          showAchievements: updatedSettings.showAchievements,
          showHistory: updatedSettings.showHistory,
        },

        // Notification preferences
        notifications: {
          email: updatedSettings.emailNotifications,
          push: updatedSettings.pushNotifications,
          sms: updatedSettings.smsNotifications,
        },

        // Display preferences
        display: {
          theme: updatedSettings.theme,
          language: updatedSettings.language,
          timezone: updatedSettings.timezone,
        },

        // Metadata
        metadata: {
          createdAt: updatedSettings.createdAt,
          updatedAt: updatedSettings.updatedAt,
        },
      },
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('[PUT /api/players/settings] Error:', error);

    // Handle unauthorized errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to update settings',
        },
        { status: 401 }
      );
    }

    // Handle Prisma errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'Settings already exist for this player',
        },
        { status: 409 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Failed to update settings',
        message: 'An unexpected error occurred while updating settings',
      },
      { status: 500 }
    );
  }
}
