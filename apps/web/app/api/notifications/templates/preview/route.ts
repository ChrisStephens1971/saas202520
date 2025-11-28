/**
 * POST /api/notifications/templates/preview
 * Preview a notification template with sample variables
 * Sprint 4 - NOTIFY-008
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getTemplatePreview,
  validateTemplateVariables,
  type NotificationTemplateType,
  type TemplateVariable,
} from '@/lib/notification-templates';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      templateType,
      channel,
      variables,
    }: {
      templateType: NotificationTemplateType;
      channel: 'email' | 'sms' | 'in_app';
      variables: TemplateVariable;
    } = body;

    if (!templateType || !channel || !variables) {
      return NextResponse.json(
        { error: 'Missing required fields: templateType, channel, variables' },
        { status: 400 }
      );
    }

    // Validate variables
    const validation = validateTemplateVariables(templateType, variables);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Missing required template variables',
          missingVariables: validation.missingVariables,
        },
        { status: 400 }
      );
    }

    // Get preview
    const preview = getTemplatePreview(templateType, channel, variables);

    return NextResponse.json(
      {
        success: true,
        templateType,
        channel,
        preview,
        validation,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error previewing template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
