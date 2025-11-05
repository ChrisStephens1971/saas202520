/**
 * Unit tests for notification template system
 * Sprint 4 - NOTIFY-008
 */

import { describe, it, expect } from 'vitest';
import {
  renderEmailTemplate,
  renderSMSTemplate,
  renderInAppTemplate,
  validateTemplateVariables,
  getTemplatePreview,
  getDefaultTemplate,
} from '@/lib/notification-templates';

describe('notification-templates', () => {
  describe('renderEmailTemplate', () => {
    it('should render match_completed template with variables', () => {
      const result = renderEmailTemplate('match_completed', {
        playerName: 'John Doe',
        matchOpponent: 'Jane Smith',
        score: '9-7',
        tournamentName: 'Friday Night 9-Ball',
        actionUrl: 'https://example.com/matches/123',
      });

      expect(result.subject).toContain('Friday Night 9-Ball');
      expect(result.body).toContain('John Doe');
      expect(result.body).toContain('Jane Smith');
      expect(result.body).toContain('9-7');
      expect(result.body).toContain('https://example.com/matches/123');
    });

    it('should render match_upcoming template with variables', () => {
      const result = renderEmailTemplate('match_upcoming', {
        playerName: 'John Doe',
        matchOpponent: 'Bob Wilson',
        matchTime: '7:30 PM',
        matchLocation: 'Table 5',
        tournamentName: 'Saturday Tournament',
        actionUrl: 'https://example.com/matches/456',
      });

      expect(result.subject).toContain('Saturday Tournament');
      expect(result.body).toContain('John Doe');
      expect(result.body).toContain('Bob Wilson');
      expect(result.body).toContain('7:30 PM');
      expect(result.body).toContain('Table 5');
    });

    it('should handle custom email template', () => {
      const result = renderEmailTemplate(
        'match_completed',
        {
          playerName: 'John Doe',
          matchOpponent: 'Jane Smith',
          score: '9-7',
        },
        {
          subject: 'Custom: {{playerName}} vs {{matchOpponent}}',
          body: '<p>Score: {{score}}</p>',
        }
      );

      expect(result.subject).toBe('Custom: John Doe vs Jane Smith');
      expect(result.body).toBe('<p>Score: 9-7</p>');
    });

    it('should remove unmatched variables', () => {
      const result = renderEmailTemplate('match_completed', {
        playerName: 'John Doe',
      });

      expect(result.body).not.toContain('{{matchOpponent}}');
      expect(result.body).not.toContain('{{score}}');
    });

    it('should render payment_received template', () => {
      const result = renderEmailTemplate('payment_received', {
        playerName: 'John Doe',
        tournamentName: 'Friday Night 9-Ball',
        paymentAmount: '$50.00',
        actionUrl: 'https://example.com/receipts/789',
      });

      expect(result.subject).toContain('Payment Received');
      expect(result.body).toContain('$50.00');
      expect(result.body).toContain('Friday Night 9-Ball');
    });
  });

  describe('renderSMSTemplate', () => {
    it('should render match_completed SMS template', () => {
      const result = renderSMSTemplate('match_completed', {
        matchOpponent: 'Jane Smith',
        score: '9-7',
        actionUrl: 'https://example.com/m/123',
      });

      expect(result.body).toContain('Jane Smith');
      expect(result.body).toContain('9-7');
      expect(result.body).toContain('https://example.com/m/123');
    });

    it('should truncate long SMS messages to 306 characters', () => {
      const longMessage = 'A'.repeat(400);
      const result = renderSMSTemplate('custom', {
        customMessage: longMessage,
      });

      expect(result.body.length).toBeLessThanOrEqual(306);
      expect(result.body).toContain('...');
    });

    it('should handle custom SMS template', () => {
      const result = renderSMSTemplate(
        'match_completed',
        {
          matchOpponent: 'Jane Smith',
          score: '9-7',
        },
        'Match result: {{score}} vs {{matchOpponent}}'
      );

      expect(result.body).toBe('Match result: 9-7 vs Jane Smith');
    });

    it('should render match_upcoming SMS template', () => {
      const result = renderSMSTemplate('match_upcoming', {
        matchOpponent: 'Bob Wilson',
        matchTime: '7:30 PM',
        matchLocation: 'Table 5',
        actionUrl: 'https://example.com/m/456',
      });

      expect(result.body).toContain('Bob Wilson');
      expect(result.body).toContain('7:30 PM');
      expect(result.body).toContain('Table 5');
    });

    it('should not truncate messages under 306 characters', () => {
      const result = renderSMSTemplate('match_completed', {
        matchOpponent: 'Jane',
        score: '9-7',
        actionUrl: 'https://ex.co/123',
      });

      expect(result.body.length).toBeLessThan(306);
      expect(result.body).not.toContain('...');
    });
  });

  describe('renderInAppTemplate', () => {
    it('should render match_completed in-app template', () => {
      const result = renderInAppTemplate('match_completed', {
        matchOpponent: 'Jane Smith',
        score: '9-7',
      });

      expect(result.title).toBe('Match Completed');
      expect(result.body).toContain('Jane Smith');
      expect(result.body).toContain('9-7');
    });

    it('should render tournament_registration in-app template', () => {
      const result = renderInAppTemplate('tournament_registration', {
        playerName: 'John Doe',
        tournamentName: 'Friday Night 9-Ball',
      });

      expect(result.title).toBe('Registration Confirmed');
      expect(result.body).toContain('Friday Night 9-Ball');
    });

    it('should handle custom in-app template', () => {
      const result = renderInAppTemplate(
        'match_completed',
        {
          matchOpponent: 'Jane Smith',
          score: '9-7',
        },
        {
          title: 'Game Over: {{score}}',
          body: 'You played {{matchOpponent}}',
        }
      );

      expect(result.title).toBe('Game Over: 9-7');
      expect(result.body).toBe('You played Jane Smith');
    });

    it('should render payment_failed in-app template', () => {
      const result = renderInAppTemplate('payment_failed', {
        paymentAmount: '$50.00',
      });

      expect(result.title).toBe('Payment Issue');
      expect(result.body).toContain('$50.00');
    });
  });

  describe('validateTemplateVariables', () => {
    it('should validate match_completed variables', () => {
      const result = validateTemplateVariables('match_completed', {
        playerName: 'John Doe',
        matchOpponent: 'Jane Smith',
        score: '9-7',
      });

      expect(result.valid).toBe(true);
      expect(result.missingVariables).toHaveLength(0);
    });

    it('should detect missing required variables', () => {
      const result = validateTemplateVariables('match_completed', {
        playerName: 'John Doe',
      });

      expect(result.valid).toBe(false);
      expect(result.missingVariables).toContain('matchOpponent');
      expect(result.missingVariables).toContain('score');
    });

    it('should validate match_upcoming variables', () => {
      const result = validateTemplateVariables('match_upcoming', {
        playerName: 'John Doe',
        matchOpponent: 'Bob Wilson',
        matchTime: '7:30 PM',
        matchLocation: 'Table 5',
      });

      expect(result.valid).toBe(true);
      expect(result.missingVariables).toHaveLength(0);
    });

    it('should validate tournament_registration variables', () => {
      const result = validateTemplateVariables('tournament_registration', {
        playerName: 'John Doe',
        tournamentName: 'Friday Night 9-Ball',
      });

      expect(result.valid).toBe(true);
      expect(result.missingVariables).toHaveLength(0);
    });

    it('should validate custom template variables', () => {
      const result = validateTemplateVariables('custom', {
        customMessage: 'Hello world',
      });

      expect(result.valid).toBe(true);
    });

    it('should detect missing custom message', () => {
      const result = validateTemplateVariables('custom', {});

      expect(result.valid).toBe(false);
      expect(result.missingVariables).toContain('customMessage');
    });

    it('should validate payment templates', () => {
      const receivedResult = validateTemplateVariables('payment_received', {
        playerName: 'John Doe',
        tournamentName: 'Friday Night 9-Ball',
        paymentAmount: '$50.00',
      });

      expect(receivedResult.valid).toBe(true);

      const failedResult = validateTemplateVariables('payment_failed', {
        playerName: 'John Doe',
        tournamentName: 'Friday Night 9-Ball',
        paymentAmount: '$50.00',
        paymentStatus: 'Card declined',
      });

      expect(failedResult.valid).toBe(true);
    });
  });

  describe('getTemplatePreview', () => {
    it('should get email preview', () => {
      const result = getTemplatePreview('match_completed', 'email', {
        playerName: 'John Doe',
        matchOpponent: 'Jane Smith',
        score: '9-7',
        tournamentName: 'Friday Night 9-Ball',
      });

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');
    });

    it('should get SMS preview', () => {
      const result = getTemplatePreview('match_completed', 'sms', {
        matchOpponent: 'Jane Smith',
        score: '9-7',
      });

      expect(result).toHaveProperty('body');
      expect(result).not.toHaveProperty('subject');
    });

    it('should get in-app preview', () => {
      const result = getTemplatePreview('match_completed', 'in_app', {
        matchOpponent: 'Jane Smith',
        score: '9-7',
      });

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('body');
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return default match_completed template', () => {
      const template = getDefaultTemplate('match_completed');

      expect(template).toHaveProperty('emailSubject');
      expect(template).toHaveProperty('emailBody');
      expect(template).toHaveProperty('smsBody');
      expect(template).toHaveProperty('inAppTitle');
      expect(template).toHaveProperty('inAppBody');
    });

    it('should return default tournament_registration template', () => {
      const template = getDefaultTemplate('tournament_registration');

      expect(template.emailSubject).toContain('Registration Confirmed');
      expect(template.inAppTitle).toBe('Registration Confirmed');
    });

    it('should return default payment templates', () => {
      const receivedTemplate = getDefaultTemplate('payment_received');
      expect(receivedTemplate.emailSubject).toContain('Payment Received');

      const failedTemplate = getDefaultTemplate('payment_failed');
      expect(failedTemplate.emailSubject).toContain('Payment Issue');
    });
  });

  describe('template content validation', () => {
    it('should have all required placeholders in match templates', () => {
      const matchCompleted = getDefaultTemplate('match_completed');
      expect(matchCompleted.emailBody).toContain('{{playerName}}');
      expect(matchCompleted.emailBody).toContain('{{matchOpponent}}');
      expect(matchCompleted.smsBody).toContain('{{score}}');

      const matchUpcoming = getDefaultTemplate('match_upcoming');
      expect(matchUpcoming.emailBody).toContain('{{matchTime}}');
      expect(matchUpcoming.emailBody).toContain('{{matchLocation}}');
    });

    it('should have consistent formatting across channels', () => {
      const template = getDefaultTemplate('match_completed');

      // All channels should mention the opponent
      expect(template.emailBody).toContain('matchOpponent');
      expect(template.smsBody).toContain('matchOpponent');
      expect(template.inAppBody).toContain('matchOpponent');
    });

    it('should include action URLs where appropriate', () => {
      const matchCompleted = getDefaultTemplate('match_completed');
      expect(matchCompleted.emailBody).toContain('{{actionUrl}}');
      expect(matchCompleted.smsBody).toContain('{{actionUrl}}');

      const payment = getDefaultTemplate('payment_received');
      expect(payment.emailBody).toContain('{{actionUrl}}');
    });
  });
});
