/**
 * GET /api/notifications/templates
 * Get available notification templates
 * Sprint 4 - NOTIFY-008
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDefaultTemplate, type NotificationTemplateType } from '@/lib/notification-templates';

const AVAILABLE_TEMPLATES: NotificationTemplateType[] = [
  'match_completed',
  'match_upcoming',
  'tournament_registration',
  'tournament_reminder',
  'payment_received',
  'payment_failed',
  'custom',
];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as NotificationTemplateType | null;

    // If specific type requested, return just that template
    if (type) {
      if (!AVAILABLE_TEMPLATES.includes(type)) {
        return NextResponse.json({ error: `Invalid template type: ${type}` }, { status: 400 });
      }

      const template = getDefaultTemplate(type);
      return NextResponse.json(
        {
          type,
          template,
        },
        { status: 200 }
      );
    }

    // Return all available templates
    const templates = AVAILABLE_TEMPLATES.map((templateType) => ({
      type: templateType,
      name: formatTemplateName(templateType),
      description: getTemplateDescription(templateType),
      channels: ['email', 'sms', 'in_app'],
      requiredVariables: getRequiredVariables(templateType),
    }));

    return NextResponse.json(
      {
        templates,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
function formatTemplateName(type: NotificationTemplateType): string {
  const names: Record<NotificationTemplateType, string> = {
    match_completed: 'Match Completed',
    match_upcoming: 'Upcoming Match',
    tournament_registration: 'Tournament Registration',
    tournament_reminder: 'Tournament Reminder',
    payment_received: 'Payment Received',
    payment_failed: 'Payment Failed',
    custom: 'Custom Message',
  };
  return names[type];
}

function getTemplateDescription(type: NotificationTemplateType): string {
  const descriptions: Record<NotificationTemplateType, string> = {
    match_completed: 'Sent when a match is completed with final score',
    match_upcoming: 'Sent to notify players of upcoming matches',
    tournament_registration: 'Sent when a player registers for a tournament',
    tournament_reminder: 'Sent as a reminder before tournament starts',
    payment_received: 'Sent when a payment is successfully processed',
    payment_failed: 'Sent when a payment fails or requires attention',
    custom: 'Flexible template for custom notifications',
  };
  return descriptions[type];
}

function getRequiredVariables(type: NotificationTemplateType): string[] {
  const required: Record<NotificationTemplateType, string[]> = {
    match_completed: ['playerName', 'matchOpponent', 'score'],
    match_upcoming: ['playerName', 'matchOpponent', 'matchTime', 'matchLocation'],
    tournament_registration: ['playerName', 'tournamentName'],
    tournament_reminder: ['playerName', 'tournamentName', 'customMessage'],
    payment_received: ['playerName', 'tournamentName', 'paymentAmount'],
    payment_failed: ['playerName', 'tournamentName', 'paymentAmount', 'paymentStatus'],
    custom: ['customMessage'],
  };
  return required[type] || [];
}
