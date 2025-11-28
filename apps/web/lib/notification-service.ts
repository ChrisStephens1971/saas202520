/**
 * Notification Service
 * Handles in-app, email, and SMS notifications with rate limiting
 * Sprint 4 - NOTIFY-001, NOTIFY-002, NOTIFY-003, NOTIFY-006, NOTIFY-008
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import {
  renderEmailTemplate,
  renderSMSTemplate,
  renderInAppTemplate,
  type NotificationTemplateType,
  type TemplateVariable,
} from '@/lib/notification-templates';

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationInput {
  orgId: string;
  tournamentId?: string;
  playerId?: string;
  type: 'in_app' | 'email' | 'sms';
  channel: 'in_app' | 'email' | 'sms_twilio';
  recipient: string; // Email address or phone number
  subject?: string; // For email notifications
  message: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
  rateLimited?: boolean;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Rate limits per notification type
const rateLimiters = {
  email: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 emails per minute per org
    analytics: true,
    prefix: '@upstash/ratelimit/email',
  }),
  sms: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 SMS per minute per org
    analytics: true,
    prefix: '@upstash/ratelimit/sms',
  }),
};

// ============================================================================
// SMS DEDUPLICATION (NOTIFY-006)
// ============================================================================

/**
 * Check if SMS was recently sent to prevent duplicates within 2-minute window
 * Returns true if duplicate, false if okay to send
 */
async function checkSMSDuplicate(recipient: string, message: string): Promise<boolean> {
  try {
    // Create deduplication key from recipient + message hash
    const messageHash = Buffer.from(message).toString('base64').substring(0, 32);
    const dedupeKey = `sms:dedupe:${recipient}:${messageHash}`;

    // Check if key exists in Redis
    const existing = await redis.get(dedupeKey);

    if (existing) {
      // Duplicate detected within 2-minute window
      return true;
    }

    // Set key with 2-minute TTL (120 seconds)
    await redis.set(dedupeKey, '1', { ex: 120 });

    // Not a duplicate
    return false;
  } catch (error) {
    // If Redis fails, allow the SMS to proceed (fail open)
    console.error('SMS deduplication check failed:', error);
    return false;
  }
}

// ============================================================================
// TWILIO SETUP
// ============================================================================

function getTwilioClient(accountSid: string, authToken: string) {
  return twilio(accountSid, authToken);
}

// ============================================================================
// NODEMAILER SETUP
// ============================================================================

function getEmailTransporter() {
  // Use environment variables for SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ============================================================================
// CORE NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Send a notification (in-app, email, or SMS)
 */
export async function sendNotification(input: NotificationInput): Promise<NotificationResult> {
  try {
    // Create notification record (status: pending)
    const notification = await prisma.notification.create({
      data: {
        orgId: input.orgId,
        tournamentId: input.tournamentId,
        playerId: input.playerId,
        type: input.type,
        channel: input.channel,
        recipient: input.recipient,
        subject: input.subject,
        message: input.message,
        status: 'pending',
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    // Route to appropriate channel
    let result: NotificationResult;
    switch (input.channel) {
      case 'in_app':
        result = await sendInAppNotification(notification.id);
        break;
      case 'email':
        result = await sendEmailNotification(notification.id, input);
        break;
      case 'sms_twilio':
        result = await sendSMSNotification(notification.id, input);
        break;
      default:
        throw new Error(`Unknown notification channel: ${input.channel}`);
    }

    // Update notification status
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: result.success ? 'sent' : 'failed',
        sentAt: result.success ? new Date() : null,
        errorMessage: result.error,
      },
    });

    return {
      ...result,
      notificationId: notification.id,
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send in-app notification (just mark as sent, no external delivery)
 */
async function sendInAppNotification(notificationId: string): Promise<NotificationResult> {
  // In-app notifications are "sent" immediately (stored in database)
  // The frontend will poll or use websockets to retrieve them
  return {
    success: true,
    notificationId,
  };
}

/**
 * Send email notification with rate limiting
 */
async function sendEmailNotification(
  notificationId: string,
  input: NotificationInput
): Promise<NotificationResult> {
  try {
    // Check rate limit
    const { success: rateLimitOk } = await rateLimiters.email.limit(input.orgId);
    if (!rateLimitOk) {
      return {
        success: false,
        error: 'Rate limit exceeded for email notifications',
        rateLimited: true,
      };
    }

    // Get email transporter
    const transporter = getEmailTransporter();

    // Send email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Tournament Platform" <noreply@tournament.com>',
      to: input.recipient,
      subject: input.subject || 'Tournament Update',
      text: input.message,
      html: `<p>${input.message.replace(/\n/g, '<br>')}</p>`,
    });

    console.log('Email sent:', info.messageId);

    return {
      success: true,
      notificationId,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send SMS notification via Twilio with rate limiting
 */
async function sendSMSNotification(
  notificationId: string,
  input: NotificationInput
): Promise<NotificationResult> {
  try {
    // Check rate limit
    const { success: rateLimitOk } = await rateLimiters.sms.limit(input.orgId);
    if (!rateLimitOk) {
      return {
        success: false,
        error: 'Rate limit exceeded for SMS notifications',
        rateLimited: true,
      };
    }

    // Check for duplicate SMS within 2-minute window (NOTIFY-006)
    const isDuplicate = await checkSMSDuplicate(input.recipient, input.message);
    if (isDuplicate) {
      return {
        success: false,
        error: 'Duplicate SMS detected within 2-minute window',
        rateLimited: false,
      };
    }

    // Get organization Twilio credentials
    const org = await prisma.organization.findUnique({
      where: { id: input.orgId },
      select: {
        twilioAccountSid: true,
        twilioAuthToken: true,
        twilioPhoneNumber: true,
      },
    });

    if (!org?.twilioAccountSid || !org.twilioAuthToken || !org.twilioPhoneNumber) {
      return {
        success: false,
        error: 'Twilio not configured for this organization',
      };
    }

    // Check if player has opted out
    if (input.playerId) {
      const preference = await prisma.notificationPreference.findUnique({
        where: { playerId: input.playerId },
      });

      if (preference && !preference.sms) {
        return {
          success: false,
          error: 'Player has opted out of SMS notifications',
        };
      }

      if (preference && !preference.sms) {
        return {
          success: false,
          error: 'SMS notifications disabled for this player',
        };
      }

      // Check quiet hours
      if (preference && preference.quietHoursStart && preference.quietHoursEnd) {
        const now = new Date();
        const currentHour = now.getHours();
        const quietStart = parseInt(preference.quietHoursStart.split(':')[0]);
        const quietEnd = parseInt(preference.quietHoursEnd.split(':')[0]);

        // Simple check (doesn't handle cross-midnight ranges perfectly)
        if (currentHour >= quietStart || currentHour < quietEnd) {
          return {
            success: false,
            error: 'Cannot send SMS during quiet hours',
          };
        }
      }
    }

    // Initialize Twilio client
    const client = getTwilioClient(org.twilioAccountSid, org.twilioAuthToken);

    // Send SMS
    const message = await client.messages.create({
      body: input.message,
      from: org.twilioPhoneNumber,
      to: input.recipient,
    });

    console.log('SMS sent:', message.sid);

    // Update notification with Twilio SID
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        metadata: {
          twilioSid: message.sid,
          twilioStatus: message.status,
        },
      },
    });

    return {
      success: true,
      notificationId,
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Send email using a template
 */
export async function sendEmailWithTemplate(
  orgId: string,
  recipient: string,
  templateName: string,
  templateData: Record<string, string>,
  tournamentId?: string,
  playerId?: string
): Promise<NotificationResult> {
  const template = await getEmailTemplate(templateName, templateData);

  return sendNotification({
    orgId,
    tournamentId,
    playerId,
    type: 'email',
    channel: 'email',
    recipient,
    subject: template.subject,
    message: template.text,
    metadata: {
      templateName,
      templateData,
    },
  });
}

/**
 * Send SMS to a player
 */
export async function sendSMSToPlayer(
  orgId: string,
  playerId: string,
  message: string,
  tournamentId?: string
): Promise<NotificationResult> {
  // Get player phone number
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { phone: true },
  });

  if (!player?.phone) {
    return {
      success: false,
      error: 'Player has no phone number',
    };
  }

  return sendNotification({
    orgId,
    tournamentId,
    playerId,
    type: 'sms',
    channel: 'sms_twilio',
    recipient: player.phone,
    message,
  });
}

/**
 * Create in-app notification for a player
 */
export async function createInAppNotification(
  orgId: string,
  playerId: string,
  message: string,
  tournamentId?: string
): Promise<NotificationResult> {
  return sendNotification({
    orgId,
    tournamentId,
    playerId,
    type: 'in_app',
    channel: 'in_app',
    recipient: playerId, // For in-app, recipient is the player ID
    message,
  });
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

async function getEmailTemplate(
  templateName: string,
  data: Record<string, string>
): Promise<EmailTemplate> {
  // Simple template engine (replace {{variable}} with data)
  const replacePlaceholders = (text: string) => {
    return Object.entries(data).reduce(
      (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, 'g'), value),
      text
    );
  };

  // Load template based on name
  // In a real app, these would be stored in database or files
  const templates: Record<string, EmailTemplate> = {
    'match-ready': {
      subject: 'Your Match is Ready - {{tournamentName}}',
      text: `Hi {{playerName}},\n\nYour match is ready at {{tableName}}.\n\nOpponent: {{opponentName}}\n\nGood luck!\n\n- Tournament Platform`,
      html: `<p>Hi {{playerName}},</p><p>Your match is ready at <strong>{{tableName}}</strong>.</p><p>Opponent: {{opponentName}}</p><p>Good luck!</p><p>- Tournament Platform</p>`,
    },
    'match-completed': {
      subject: 'Match Result - {{tournamentName}}',
      text: `Hi {{playerName}},\n\nYour match has been completed.\n\nResult: {{result}}\nFinal Score: {{score}}\n\n- Tournament Platform`,
      html: `<p>Hi {{playerName}},</p><p>Your match has been completed.</p><p><strong>Result:</strong> {{result}}<br><strong>Final Score:</strong> {{score}}</p><p>- Tournament Platform</p>`,
    },
    'tournament-starting': {
      subject: 'Tournament Starting Soon - {{tournamentName}}',
      text: `Hi {{playerName}},\n\nThe tournament "{{tournamentName}}" is starting soon.\n\nPlease check in at the front desk.\n\n- Tournament Platform`,
      html: `<p>Hi {{playerName}},</p><p>The tournament <strong>{{tournamentName}}</strong> is starting soon.</p><p>Please check in at the front desk.</p><p>- Tournament Platform</p>`,
    },
  };

  const template = templates[templateName];
  if (!template) {
    throw new Error(`Email template not found: ${templateName}`);
  }

  return {
    subject: replacePlaceholders(template.subject),
    text: replacePlaceholders(template.text),
    html: replacePlaceholders(template.html),
  };
}

// ============================================================================
// PREFERENCE MANAGEMENT
// ============================================================================

/**
 * Handle SMS opt-out (STOP command)
 */
export async function handleSMSOptOut(playerId: string): Promise<void> {
  await prisma.notificationPreference.upsert({
    where: { playerId },
    create: {
      playerId,
      sms: false,
    },
    update: {
      sms: false,
    },
  });
}

/**
 * Handle SMS opt-in (START command)
 */
export async function handleSMSOptIn(playerId: string): Promise<void> {
  await prisma.notificationPreference.upsert({
    where: { playerId },
    create: {
      playerId,
      sms: true,
    },
    update: {
      sms: true,
    },
  });
}

/**
 * Get notification preferences for a player
 */
export async function getNotificationPreferences(playerId: string) {
  return prisma.notificationPreference.findUnique({
    where: { playerId },
  });
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  playerId: string,
  preferences: {
    smsEnabled?: boolean;
    emailEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
  }
) {
  return prisma.notificationPreference.upsert({
    where: { playerId },
    create: {
      playerId,
      ...preferences,
    },
    update: preferences,
  });
}

// ============================================================================
// TEMPLATE-BASED NOTIFICATIONS (NOTIFY-008)
// ============================================================================

/**
 * Send notification using template system
 */
export async function sendNotificationWithTemplate(
  orgId: string,
  playerId: string,
  templateType: NotificationTemplateType,
  variables: TemplateVariable,
  channels: ('email' | 'sms' | 'in_app')[],
  tournamentId?: string
): Promise<{ email?: NotificationResult; sms?: NotificationResult; inApp?: NotificationResult }> {
  const results: {
    email?: NotificationResult;
    sms?: NotificationResult;
    inApp?: NotificationResult;
  } = {};

  // Get player details
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { email: true, phone: true },
  });

  if (!player) {
    throw new Error('Player not found');
  }

  // Send email notification
  if (channels.includes('email') && player.email) {
    const emailTemplate = renderEmailTemplate(templateType, variables);
    results.email = await sendNotification({
      orgId,
      tournamentId,
      playerId,
      type: 'email',
      channel: 'email',
      recipient: player.email,
      subject: emailTemplate.subject,
      message: emailTemplate.body,
      metadata: { templateType, variables },
    });
  }

  // Send SMS notification
  if (channels.includes('sms') && player.phone) {
    const smsTemplate = renderSMSTemplate(templateType, variables);
    results.sms = await sendNotification({
      orgId,
      tournamentId,
      playerId,
      type: 'sms',
      channel: 'sms_twilio',
      recipient: player.phone,
      message: smsTemplate.body,
      metadata: { templateType, variables },
    });
  }

  // Send in-app notification
  if (channels.includes('in_app')) {
    const inAppTemplate = renderInAppTemplate(templateType, variables);
    results.inApp = await sendNotification({
      orgId,
      tournamentId,
      playerId,
      type: 'in_app',
      channel: 'in_app',
      recipient: playerId,
      subject: inAppTemplate.title,
      message: inAppTemplate.body,
      metadata: { templateType, variables },
    });
  }

  return results;
}
