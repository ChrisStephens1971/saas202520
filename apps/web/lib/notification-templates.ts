/**
 * Notification Template System
 * Sprint 4 - NOTIFY-008
 *
 * Provides template rendering for email and SMS notifications
 * with variable interpolation and customization.
 */

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export type NotificationTemplateType =
  | 'match_completed'
  | 'match_upcoming'
  | 'tournament_registration'
  | 'tournament_reminder'
  | 'payment_received'
  | 'payment_failed'
  | 'custom';

export interface TemplateVariable {
  playerName?: string;
  tournamentName?: string;
  matchOpponent?: string;
  matchTime?: string;
  matchLocation?: string;
  score?: string;
  paymentAmount?: string;
  paymentStatus?: string;
  customMessage?: string;
  actionUrl?: string;
  [key: string]: string | undefined;
}

export interface NotificationTemplate {
  id: string;
  orgId: string;
  type: NotificationTemplateType;
  name: string;
  description?: string;
  emailSubject?: string;
  emailBody?: string;
  smsBody?: string;
  inAppTitle?: string;
  inAppBody?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RenderedTemplate {
  subject?: string;
  body: string;
}

// ============================================================================
// DEFAULT TEMPLATES
// ============================================================================

const DEFAULT_TEMPLATES: Record<
  NotificationTemplateType,
  {
    emailSubject: string;
    emailBody: string;
    smsBody: string;
    inAppTitle: string;
    inAppBody: string;
  }
> = {
  match_completed: {
    emailSubject: 'Match Result - {{tournamentName}}',
    emailBody: `
      <h1>Match Completed</h1>
      <p>Hi {{playerName}},</p>
      <p>Your match against <strong>{{matchOpponent}}</strong> has been completed.</p>
      <p><strong>Final Score:</strong> {{score}}</p>
      <p>View full results and standings at: <a href="{{actionUrl}}">{{actionUrl}}</a></p>
      <p>Good game!</p>
    `,
    smsBody: 'Match vs {{matchOpponent}} completed. Score: {{score}}. View results: {{actionUrl}}',
    inAppTitle: 'Match Completed',
    inAppBody: 'Your match against {{matchOpponent}} has been completed. Score: {{score}}',
  },

  match_upcoming: {
    emailSubject: 'Upcoming Match - {{tournamentName}}',
    emailBody: `
      <h1>Upcoming Match</h1>
      <p>Hi {{playerName}},</p>
      <p>You have an upcoming match against <strong>{{matchOpponent}}</strong>.</p>
      <p><strong>Time:</strong> {{matchTime}}</p>
      <p><strong>Location:</strong> {{matchLocation}}</p>
      <p>View match details: <a href="{{actionUrl}}">{{actionUrl}}</a></p>
      <p>Good luck!</p>
    `,
    smsBody:
      'Upcoming match vs {{matchOpponent}} at {{matchTime}}. Location: {{matchLocation}}. Details: {{actionUrl}}',
    inAppTitle: 'Upcoming Match',
    inAppBody: 'Match vs {{matchOpponent}} at {{matchTime}}. Location: {{matchLocation}}',
  },

  tournament_registration: {
    emailSubject: 'Registration Confirmed - {{tournamentName}}',
    emailBody: `
      <h1>Registration Confirmed</h1>
      <p>Hi {{playerName}},</p>
      <p>You are now registered for <strong>{{tournamentName}}</strong>!</p>
      <p>Check your schedule and bracket: <a href="{{actionUrl}}">{{actionUrl}}</a></p>
      <p>See you at the tournament!</p>
    `,
    smsBody: 'Registered for {{tournamentName}}! View details: {{actionUrl}}',
    inAppTitle: 'Registration Confirmed',
    inAppBody: 'You are now registered for {{tournamentName}}',
  },

  tournament_reminder: {
    emailSubject: 'Tournament Reminder - {{tournamentName}}',
    emailBody: `
      <h1>Tournament Reminder</h1>
      <p>Hi {{playerName}},</p>
      <p><strong>{{tournamentName}}</strong> starts soon!</p>
      <p>{{customMessage}}</p>
      <p>View tournament details: <a href="{{actionUrl}}">{{actionUrl}}</a></p>
    `,
    smsBody: '{{tournamentName}} reminder: {{customMessage}}. Details: {{actionUrl}}',
    inAppTitle: 'Tournament Reminder',
    inAppBody: '{{tournamentName}}: {{customMessage}}',
  },

  payment_received: {
    emailSubject: 'Payment Received - {{tournamentName}}',
    emailBody: `
      <h1>Payment Received</h1>
      <p>Hi {{playerName}},</p>
      <p>We've received your payment of <strong>{{paymentAmount}}</strong> for {{tournamentName}}.</p>
      <p>Thank you for your payment!</p>
      <p>View receipt: <a href="{{actionUrl}}">{{actionUrl}}</a></p>
    `,
    smsBody: 'Payment of {{paymentAmount}} received for {{tournamentName}}. Receipt: {{actionUrl}}',
    inAppTitle: 'Payment Received',
    inAppBody: 'Payment of {{paymentAmount}} received for {{tournamentName}}',
  },

  payment_failed: {
    emailSubject: 'Payment Issue - {{tournamentName}}',
    emailBody: `
      <h1>Payment Issue</h1>
      <p>Hi {{playerName}},</p>
      <p>There was an issue processing your payment of <strong>{{paymentAmount}}</strong> for {{tournamentName}}.</p>
      <p>Status: {{paymentStatus}}</p>
      <p>Please update your payment method: <a href="{{actionUrl}}">{{actionUrl}}</a></p>
    `,
    smsBody: 'Payment issue for {{tournamentName}}. Please update payment: {{actionUrl}}',
    inAppTitle: 'Payment Issue',
    inAppBody: 'Payment of {{paymentAmount}} failed. Please update payment method.',
  },

  custom: {
    emailSubject: 'Notification - {{tournamentName}}',
    emailBody: '<p>{{customMessage}}</p>',
    smsBody: '{{customMessage}}',
    inAppTitle: 'Notification',
    inAppBody: '{{customMessage}}',
  },
};

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * Interpolate variables into a template string
 */
function interpolate(template: string, variables: TemplateVariable): string {
  let result = template;

  // Replace {{variable}} with values
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
  }

  // Remove any remaining unmatched variables
  result = result.replace(/\{\{[^}]+\}\}/g, '');

  return result.trim();
}

/**
 * Render email template with variables
 */
export function renderEmailTemplate(
  type: NotificationTemplateType,
  variables: TemplateVariable,
  customTemplate?: { subject?: string; body?: string }
): RenderedTemplate {
  const defaultTemplate = DEFAULT_TEMPLATES[type];

  const subject = interpolate(customTemplate?.subject || defaultTemplate.emailSubject, variables);

  const body = interpolate(customTemplate?.body || defaultTemplate.emailBody, variables);

  return { subject, body };
}

/**
 * Render SMS template with variables
 */
export function renderSMSTemplate(
  type: NotificationTemplateType,
  variables: TemplateVariable,
  customTemplate?: string
): RenderedTemplate {
  const defaultTemplate = DEFAULT_TEMPLATES[type];

  const body = interpolate(customTemplate || defaultTemplate.smsBody, variables);

  // SMS character limit: 160 chars (standard), 306 chars (extended)
  const maxLength = 306;
  const truncatedBody = body.length > maxLength ? body.substring(0, maxLength - 3) + '...' : body;

  return { body: truncatedBody };
}

/**
 * Render in-app notification template with variables
 */
export function renderInAppTemplate(
  type: NotificationTemplateType,
  variables: TemplateVariable,
  customTemplate?: { title?: string; body?: string }
): { title: string; body: string } {
  const defaultTemplate = DEFAULT_TEMPLATES[type];

  const title = interpolate(customTemplate?.title || defaultTemplate.inAppTitle, variables);

  const body = interpolate(customTemplate?.body || defaultTemplate.inAppBody, variables);

  return { title, body };
}

// ============================================================================
// TEMPLATE VALIDATION
// ============================================================================

/**
 * Validate template variables
 */
export function validateTemplateVariables(
  type: NotificationTemplateType,
  variables: TemplateVariable
): { valid: boolean; missingVariables: string[] } {
  const requiredVars: Record<NotificationTemplateType, string[]> = {
    match_completed: ['playerName', 'matchOpponent', 'score'],
    match_upcoming: ['playerName', 'matchOpponent', 'matchTime', 'matchLocation'],
    tournament_registration: ['playerName', 'tournamentName'],
    tournament_reminder: ['playerName', 'tournamentName', 'customMessage'],
    payment_received: ['playerName', 'tournamentName', 'paymentAmount'],
    payment_failed: ['playerName', 'tournamentName', 'paymentAmount', 'paymentStatus'],
    custom: ['customMessage'],
  };

  const required = requiredVars[type] || [];
  const missingVariables = required.filter((key) => !variables[key]);

  return {
    valid: missingVariables.length === 0,
    missingVariables,
  };
}

/**
 * Get preview of rendered template
 */
export function getTemplatePreview(
  type: NotificationTemplateType,
  channel: 'email' | 'sms' | 'in_app',
  variables: TemplateVariable
): RenderedTemplate | { title: string; body: string } {
  if (channel === 'email') {
    return renderEmailTemplate(type, variables);
  } else if (channel === 'sms') {
    return renderSMSTemplate(type, variables);
  } else {
    return renderInAppTemplate(type, variables);
  }
}

// ============================================================================
// TEMPLATE CUSTOMIZATION
// ============================================================================

/**
 * Save custom template for organization
 */
export async function saveCustomTemplate(
  orgId: string,
  type: NotificationTemplateType,
  name: string,
  template: {
    emailSubject?: string;
    emailBody?: string;
    smsBody?: string;
    inAppTitle?: string;
    inAppBody?: string;
  }
): Promise<NotificationTemplate> {
  // This would typically save to database
  // For now, return mock data
  return {
    id: `template-${Date.now()}`,
    orgId,
    type,
    name,
    emailSubject: template.emailSubject,
    emailBody: template.emailBody,
    smsBody: template.smsBody,
    inAppTitle: template.inAppTitle,
    inAppBody: template.inAppBody,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get organization's custom templates
 */
export async function getCustomTemplates(
  _orgId: string,
  _type?: NotificationTemplateType
): Promise<NotificationTemplate[]> {
  // This would typically fetch from database
  // For now, return empty array
  return [];
}

/**
 * Get default template for reference
 */
export function getDefaultTemplate(type: NotificationTemplateType) {
  return DEFAULT_TEMPLATES[type];
}
