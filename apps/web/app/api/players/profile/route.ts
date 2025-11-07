/**
 * PUT /api/players/profile
 * Update current user's player profile
 *
 * Sprint 10 Week 2 - Player Profile API Endpoints
 * Multi-tenant: Enforces tenant isolation via session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { updatePlayerProfile } from '@/lib/player-profiles/services/player-profile-service';
import { PlayerProfileError } from '@/lib/player-profiles/types';

/**
 * Validation schema for profile update request
 */
const UpdateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  photoUrl: z.string().url().optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  socialLinks: z.object({
    twitter: z.string().url().optional(),
    facebook: z.string().url().optional(),
    instagram: z.string().url().optional(),
    website: z.string().url().optional(),
    linkedin: z.string().url().optional(),
  }).optional(),
});

/**
 * Update current user's player profile
 * Users can only update their own profile
 *
 * Request body:
 * - bio?: string (max 500 characters)
 * - photoUrl?: string (valid URL or null)
 * - location?: string (max 100 characters or null)
 * - skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
 * - socialLinks?: { twitter?, facebook?, instagram?, website?, linkedin? }
 *
 * @param request - Next.js request with JSON body
 * @returns Updated profile or error response
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant ID from session (multi-tenant isolation)
    const tenantId = session.user.orgId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No organization context' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Users can only update their own profile
    const playerId = session.user.id;

    // Filter out null values and convert to UpdateProfileRequest type
    const profileData = {
      ...(updateData.bio !== undefined && { bio: updateData.bio }),
      ...(updateData.photoUrl !== undefined && updateData.photoUrl !== null && { photoUrl: updateData.photoUrl }),
      ...(updateData.location !== undefined && updateData.location !== null && { location: updateData.location }),
      ...(updateData.skillLevel !== undefined && { skillLevel: updateData.skillLevel }),
      ...(updateData.socialLinks !== undefined && { socialLinks: updateData.socialLinks }),
    };

    // Update profile using service layer
    const updatedProfile = await updatePlayerProfile(
      playerId,
      tenantId,
      profileData
    );

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: {
          profile: updatedProfile,
        },
        message: 'Profile updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle known errors from service layer
    if (error instanceof PlayerProfileError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    // Handle unexpected errors
    console.error('[PUT /api/players/profile] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Disable static optimization for dynamic routes
export const dynamic = 'force-dynamic';
