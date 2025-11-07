import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Mock Prisma client - replace with actual import when database is connected
// import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/settings
 * Fetch system settings for the organization
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify admin role
    // const session = await getServerSession();
    // if (!session || !isAdmin(session.user)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // const orgId = session.user.orgId;

    // Fetch settings from database
    // const settings = await prisma.systemSettings.findUnique({
    //   where: { orgId },
    // });

    // Mock response for now
    const settings = {
      siteName: 'Tournament Platform',
      siteDescription: 'Professional tournament management',
      timezone: 'America/New_York',
      language: 'en',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpFromEmail: '',
      smtpFromName: 'Tournament Platform',
      sessionTimeout: 60,
      require2FA: false,
      passwordMinLength: 8,
      passwordRequireSpecialChar: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      cacheTTL: 3600,
      rateLimit: 60,
      enableEmailNotifications: true,
      enableSmsNotifications: true,
      enablePushNotifications: false,
      features: {
        liveScoring: true,
        notifications: true,
        payments: false,
        analytics: true,
        multiTournament: false,
        apiAccess: false,
        advancedFormats: true,
        kioskMode: false,
        twoFactorAuth: false,
        customBranding: false,
      },
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/settings
 * Update system settings
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get session and verify admin role
    // const session = await getServerSession();
    // if (!session || !isAdmin(session.user)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // const orgId = session.user.orgId;
    const body = await request.json();

    // Validate and sanitize input
    const allowedFields = [
      'siteName',
      'siteDescription',
      'timezone',
      'language',
      'smtpHost',
      'smtpPort',
      'smtpUser',
      'smtpPassword',
      'smtpFromEmail',
      'smtpFromName',
      'sessionTimeout',
      'require2FA',
      'passwordMinLength',
      'passwordRequireSpecialChar',
      'maxLoginAttempts',
      'lockoutDuration',
      'cacheTTL',
      'rateLimit',
      'enableEmailNotifications',
      'enableSmsNotifications',
      'enablePushNotifications',
      'features',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Encrypt sensitive fields (e.g., smtpPassword)
    // if (updateData.smtpPassword) {
    //   updateData.smtpPassword = await encrypt(updateData.smtpPassword);
    // }

    // Update settings in database
    // const settings = await prisma.systemSettings.upsert({
    //   where: { orgId },
    //   update: updateData,
    //   create: {
    //     orgId,
    //     ...updateData,
    //   },
    // });

    // Create audit log
    // await prisma.auditLog.create({
    //   data: {
    //     orgId,
    //     userId: session.user.id,
    //     userName: session.user.name,
    //     action: 'update',
    //     resource: 'settings',
    //     changes: {
    //       before: previousSettings,
    //       after: updateData,
    //     },
    //     ipAddress: request.headers.get('x-forwarded-for') || request.ip,
    //     userAgent: request.headers.get('user-agent'),
    //   },
    // });

    // Mock response
    const settings = {
      ...updateData,
      // Return complete settings object
    };

    return NextResponse.json({ settings, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// Helper function to check admin role
// function isAdmin(user: any): boolean {
//   return user.role === 'owner' || user.role === 'td';
// }
