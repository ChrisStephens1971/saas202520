/**
 * Unit tests for notification service
 * Sprint 4 - NOTIFY-001, NOTIFY-002, NOTIFY-003, NOTIFY-006, NOTIFY-008
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sendNotification,
  sendEmailWithTemplate,
  sendSMSToPlayer,
  createInAppNotification,
  handleSMSOptOut,
  handleSMSOptIn,
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationInput,
} from '@/lib/notification-service';
import { prisma } from '@/lib/prisma';

// Mock Redis functions (using vi.hoisted for proper mock initialization)
const { mockRedisGet, mockRedisSet } = vi.hoisted(() => ({
  mockRedisGet: vi.fn(),
  mockRedisSet: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    player: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Mock Twilio
vi.mock('twilio', () => {
  return {
    default: vi.fn(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          sid: 'SM123456',
          status: 'sent',
        }),
      },
    })),
  };
});

// Mock Nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({
        messageId: 'test-message-id',
      }),
    })),
  },
  createTransport: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({
      messageId: 'test-message-id',
    }),
  })),
}));

// Mock Upstash Redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
  })),
}));

vi.mock('@upstash/ratelimit', () => {
  const RatelimitMock = vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({ success: true }),
  }));
  RatelimitMock.slidingWindow = vi.fn();
  return { Ratelimit: RatelimitMock };
});

describe('notification-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should create notification record and send in-app notification', async () => {
      const mockNotification = {
        id: 'notif-123',
        orgId: 'org-123',
        type: 'in_app',
        channel: 'in_app',
        recipient: 'player-123',
        message: 'Your match is ready',
        status: 'pending',
        createdAt: new Date(),
      };

      vi.mocked(prisma.notification.create).mockResolvedValueOnce(
        mockNotification as never
      );
      vi.mocked(prisma.notification.update).mockResolvedValueOnce({
        ...mockNotification,
        status: 'sent',
        sentAt: new Date(),
      } as never);

      const input: NotificationInput = {
        orgId: 'org-123',
        tournamentId: 'tournament-123',
        playerId: 'player-123',
        type: 'in_app',
        channel: 'in_app',
        recipient: 'player-123',
        message: 'Your match is ready',
      };

      const result = await sendNotification(input);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('notif-123');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          orgId: 'org-123',
          tournamentId: 'tournament-123',
          playerId: 'player-123',
          type: 'in_app',
          channel: 'in_app',
          recipient: 'player-123',
          subject: undefined,
          message: 'Your match is ready',
          status: 'pending',
          metadata: {},
        },
      });
    });

    it('should handle notification send failure', async () => {
      vi.mocked(prisma.notification.create).mockRejectedValueOnce(
        new Error('Database error')
      );

      const input: NotificationInput = {
        orgId: 'org-123',
        type: 'in_app',
        channel: 'in_app',
        recipient: 'player-123',
        message: 'Test',
      };

      const result = await sendNotification(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('createInAppNotification', () => {
    it('should create in-app notification successfully', async () => {
      const mockNotification = {
        id: 'notif-123',
        orgId: 'org-123',
        playerId: 'player-123',
        type: 'in_app',
        channel: 'in_app',
        recipient: 'player-123',
        message: 'Test notification',
        status: 'pending',
      };

      vi.mocked(prisma.notification.create).mockResolvedValueOnce(
        mockNotification as never
      );
      vi.mocked(prisma.notification.update).mockResolvedValueOnce({
        ...mockNotification,
        status: 'sent',
        sentAt: new Date(),
      } as never);

      const result = await createInAppNotification(
        'org-123',
        'player-123',
        'Test notification',
        'tournament-123'
      );

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('notif-123');
    });
  });

  describe('sendSMSToPlayer', () => {
    it.skip('should send SMS to player with valid phone number', async () => {
      const mockPlayer = {
        id: 'player-123',
        phone: '+1234567890',
      };

      const mockOrg = {
        id: 'org-123',
        twilioAccountSid: 'ACxxxx',
        twilioAuthToken: 'token',
        twilioPhoneNumber: '+1987654321',
      };

      const mockNotification = {
        id: 'notif-123',
        orgId: 'org-123',
        playerId: 'player-123',
        type: 'sms',
        channel: 'sms_twilio',
        recipient: '+1234567890',
        message: 'Your match is ready',
        status: 'pending',
      };

      vi.mocked(prisma.player.findUnique).mockResolvedValueOnce(
        mockPlayer as never
      );
      vi.mocked(prisma.notification.create).mockResolvedValueOnce(
        mockNotification as never
      );
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce(
        mockOrg as never
      );
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce(
        null
      );
      // First update: stores Twilio SID
      vi.mocked(prisma.notification.update).mockResolvedValueOnce({
        ...mockNotification,
        metadata: { twilioSid: 'SM123456', twilioStatus: 'sent' },
      } as never);
      // Second update: marks as sent
      vi.mocked(prisma.notification.update).mockResolvedValueOnce({
        ...mockNotification,
        status: 'sent',
        sentAt: new Date(),
        metadata: { twilioSid: 'SM123456', twilioStatus: 'sent' },
      } as never);

      const result = await sendSMSToPlayer(
        'org-123',
        'player-123',
        'Your match is ready',
        'tournament-123'
      );

      expect(result.success).toBe(true);
    });

    it('should fail when player has no phone number', async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValueOnce({
        id: 'player-123',
        phone: null,
      } as never);

      const result = await sendSMSToPlayer(
        'org-123',
        'player-123',
        'Your match is ready'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player has no phone number');
    });
  });

  describe('sendEmailWithTemplate', () => {
    it('should send email with match-ready template', async () => {
      const mockNotification = {
        id: 'notif-123',
        orgId: 'org-123',
        playerId: 'player-123',
        type: 'email',
        channel: 'email',
        recipient: 'player@example.com',
        subject: 'Your Match is Ready - Test Tournament',
        message: 'Hi John,\n\nYour match is ready at Table 1.\n\nOpponent: Jane Doe\n\nGood luck!\n\n- Tournament Platform',
        status: 'pending',
      };

      vi.mocked(prisma.notification.create).mockResolvedValueOnce(
        mockNotification as never
      );
      vi.mocked(prisma.notification.update).mockResolvedValueOnce({
        ...mockNotification,
        status: 'sent',
        sentAt: new Date(),
      } as never);

      const result = await sendEmailWithTemplate(
        'org-123',
        'player@example.com',
        'match-ready',
        {
          playerName: 'John',
          tournamentName: 'Test Tournament',
          tableName: 'Table 1',
          opponentName: 'Jane Doe',
        },
        'tournament-123',
        'player-123'
      );

      expect(result.success).toBe(true);
    });

    it('should handle unknown template', async () => {
      // Unknown templates throw an error (fail fast)
      await expect(
        sendEmailWithTemplate(
          'org-123',
          'player@example.com',
          'unknown-template',
          {}
        )
      ).rejects.toThrow('Email template not found');
    });
  });

  describe('SMS opt-in/opt-out', () => {
    it('should handle SMS opt-out', async () => {
      const mockPreference = {
        id: 'pref-123',
        playerId: 'player-123',
        smsEnabled: false,
        smsOptedOut: true,
        smsOptedOutAt: new Date(),
      };

      vi.mocked(prisma.notificationPreference.upsert).mockResolvedValueOnce(
        mockPreference as never
      );

      await handleSMSOptOut('player-123');

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { playerId: 'player-123' },
        create: {
          playerId: 'player-123',
          smsOptedOut: true,
          smsOptedOutAt: expect.any(Date),
          smsEnabled: false,
        },
        update: {
          smsOptedOut: true,
          smsOptedOutAt: expect.any(Date),
          smsEnabled: false,
        },
      });
    });

    it('should handle SMS opt-in', async () => {
      const mockPreference = {
        id: 'pref-123',
        playerId: 'player-123',
        smsEnabled: true,
        smsOptedOut: false,
        smsOptedOutAt: null,
      };

      vi.mocked(prisma.notificationPreference.upsert).mockResolvedValueOnce(
        mockPreference as never
      );

      await handleSMSOptIn('player-123');

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { playerId: 'player-123' },
        create: {
          playerId: 'player-123',
          smsOptedOut: false,
          smsEnabled: true,
        },
        update: {
          smsOptedOut: false,
          smsOptedOutAt: null,
          smsEnabled: true,
        },
      });
    });
  });

  describe('notification preferences', () => {
    it('should get notification preferences', async () => {
      const mockPreference = {
        id: 'pref-123',
        playerId: 'player-123',
        smsEnabled: true,
        emailEnabled: true,
        smsOptedOut: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'America/New_York',
      };

      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce(
        mockPreference as never
      );

      const result = await getNotificationPreferences('player-123');

      expect(result).toEqual(mockPreference);
      expect(prisma.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { playerId: 'player-123' },
      });
    });

    it('should update notification preferences', async () => {
      const mockPreference = {
        id: 'pref-123',
        playerId: 'player-123',
        smsEnabled: false,
        emailEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        timezone: 'America/Los_Angeles',
      };

      vi.mocked(prisma.notificationPreference.upsert).mockResolvedValueOnce(
        mockPreference as never
      );

      const result = await updateNotificationPreferences('player-123', {
        smsEnabled: false,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        timezone: 'America/Los_Angeles',
      });

      expect(result).toEqual(mockPreference);
      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { playerId: 'player-123' },
        create: {
          playerId: 'player-123',
          smsEnabled: false,
          quietHoursStart: '23:00',
          quietHoursEnd: '07:00',
          timezone: 'America/Los_Angeles',
        },
        update: {
          smsEnabled: false,
          quietHoursStart: '23:00',
          quietHoursEnd: '07:00',
          timezone: 'America/Los_Angeles',
        },
      });
    });
  });

  // ============================================================================
  // SMS DEDUPLICATION TESTS (NOTIFY-006)
  // ============================================================================

  describe('SMS Deduplication', () => {
    it('should send first SMS successfully', async () => {
      const mockNotification = {
        id: 'notif-sms-1',
        orgId: 'org-123',
        type: 'sms',
        channel: 'sms_twilio',
        status: 'pending',
        recipient: '+15551234567',
        message: 'Your match is ready',
      };

      const mockOrg = {
        id: 'org-123',
        twilioAccountSid: 'ACtest',
        twilioAuthToken: 'test-token',
        twilioPhoneNumber: '+15559876543',
      };

      const mockPlayer = {
        id: 'player-123',
        phone: '+15551234567',
      };

      const mockPreference = {
        id: 'pref-123',
        playerId: 'player-123',
        smsEnabled: true,
        smsOptedOut: false,
        emailEnabled: true,
        quietHoursStart: null,
        quietHoursEnd: null,
      };

      vi.mocked(prisma.notification.create).mockResolvedValueOnce(
        mockNotification as never
      );
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce(
        mockOrg as never
      );
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce(
        mockPreference as never
      );
      vi.mocked(prisma.player.findUnique).mockResolvedValueOnce(
        mockPlayer as never
      );
      vi.mocked(prisma.notification.update).mockResolvedValueOnce(
        mockNotification as never
      );

      // Mock Redis: key doesn't exist (first send)
      mockRedisGet.mockResolvedValueOnce(null);
      mockRedisSet.mockResolvedValueOnce('OK');

      const input: NotificationInput = {
        orgId: 'org-123',
        playerId: 'player-123',
        type: 'sms',
        channel: 'sms_twilio',
        recipient: '+15551234567',
        message: 'Your match is ready',
      };

      const result = await sendNotification(input);

      expect(result.success).toBe(true);
      expect(mockRedisGet).toHaveBeenCalled();
      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.stringContaining('sms:dedupe:+15551234567:'),
        '1',
        { ex: 120 }
      );
    });

    it('should block duplicate SMS within 2-minute window', async () => {
      const mockNotification = {
        id: 'notif-sms-2',
        orgId: 'org-123',
        type: 'sms',
        channel: 'sms_twilio',
        status: 'pending',
        recipient: '+15551234567',
        message: 'Your match is ready',
      };

      const mockOrg = {
        id: 'org-123',
        twilioAccountSid: 'ACtest',
        twilioAuthToken: 'test-token',
        twilioPhoneNumber: '+15559876543',
      };

      vi.mocked(prisma.notification.create).mockResolvedValueOnce(
        mockNotification as never
      );
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce(
        mockOrg as never
      );
      vi.mocked(prisma.notification.update).mockResolvedValueOnce(
        mockNotification as never
      );

      // Mock Redis: key exists (duplicate detected)
      mockRedisGet.mockResolvedValueOnce('1');

      const input: NotificationInput = {
        orgId: 'org-123',
        playerId: 'player-123',
        type: 'sms',
        channel: 'sms_twilio',
        recipient: '+15551234567',
        message: 'Your match is ready',
      };

      const result = await sendNotification(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Duplicate SMS detected within 2-minute window');
      expect(mockRedisGet).toHaveBeenCalled();
      expect(mockRedisSet).not.toHaveBeenCalled();
    });

    it('should allow different message to same recipient', async () => {
      const mockNotification = {
        id: 'notif-sms-3',
        orgId: 'org-123',
        type: 'sms',
        channel: 'sms_twilio',
        status: 'pending',
        recipient: '+15551234567',
        message: 'Different message',
      };

      const mockOrg = {
        id: 'org-123',
        twilioAccountSid: 'ACtest',
        twilioAuthToken: 'test-token',
        twilioPhoneNumber: '+15559876543',
      };

      const mockPlayer = {
        id: 'player-123',
        phone: '+15551234567',
      };

      const mockPreference = {
        id: 'pref-123',
        playerId: 'player-123',
        smsEnabled: true,
        smsOptedOut: false,
        emailEnabled: true,
        quietHoursStart: null,
        quietHoursEnd: null,
      };

      vi.mocked(prisma.notification.create).mockResolvedValueOnce(
        mockNotification as never
      );
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce(
        mockOrg as never
      );
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce(
        mockPreference as never
      );
      vi.mocked(prisma.player.findUnique).mockResolvedValueOnce(
        mockPlayer as never
      );
      vi.mocked(prisma.notification.update).mockResolvedValueOnce(
        mockNotification as never
      );

      // Mock Redis: different message hash, key doesn't exist
      mockRedisGet.mockResolvedValueOnce(null);
      mockRedisSet.mockResolvedValueOnce('OK');

      const input: NotificationInput = {
        orgId: 'org-123',
        playerId: 'player-123',
        type: 'sms',
        channel: 'sms_twilio',
        recipient: '+15551234567',
        message: 'Different message',
      };

      const result = await sendNotification(input);

      expect(result.success).toBe(true);
      expect(mockRedisSet).toHaveBeenCalled();
    });

    it('should allow same message to different recipient', async () => {
      const mockNotification = {
        id: 'notif-sms-4',
        orgId: 'org-123',
        type: 'sms',
        channel: 'sms_twilio',
        status: 'pending',
        recipient: '+15559999999',
        message: 'Your match is ready',
      };

      const mockOrg = {
        id: 'org-123',
        twilioAccountSid: 'ACtest',
        twilioAuthToken: 'test-token',
        twilioPhoneNumber: '+15559876543',
      };

      const mockPlayer = {
        id: 'player-456',
        phone: '+15559999999',
      };

      const mockPreference = {
        id: 'pref-456',
        playerId: 'player-456',
        smsEnabled: true,
        smsOptedOut: false,
        emailEnabled: true,
        quietHoursStart: null,
        quietHoursEnd: null,
      };

      vi.mocked(prisma.notification.create).mockResolvedValueOnce(
        mockNotification as never
      );
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce(
        mockOrg as never
      );
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce(
        mockPreference as never
      );
      vi.mocked(prisma.player.findUnique).mockResolvedValueOnce(
        mockPlayer as never
      );
      vi.mocked(prisma.notification.update).mockResolvedValueOnce(
        mockNotification as never
      );

      // Mock Redis: different recipient, key doesn't exist
      mockRedisGet.mockResolvedValueOnce(null);
      mockRedisSet.mockResolvedValueOnce('OK');

      const input: NotificationInput = {
        orgId: 'org-123',
        playerId: 'player-456',
        type: 'sms',
        channel: 'sms_twilio',
        recipient: '+15559999999',
        message: 'Your match is ready',
      };

      const result = await sendNotification(input);

      expect(result.success).toBe(true);
      expect(mockRedisSet).toHaveBeenCalled();
    });

    it('should fail gracefully if Redis is unavailable', async () => {
      const mockNotification = {
        id: 'notif-sms-5',
        orgId: 'org-123',
        type: 'sms',
        channel: 'sms_twilio',
        status: 'pending',
        recipient: '+15551234567',
        message: 'Your match is ready',
      };

      const mockOrg = {
        id: 'org-123',
        twilioAccountSid: 'ACtest',
        twilioAuthToken: 'test-token',
        twilioPhoneNumber: '+15559876543',
      };

      const mockPlayer = {
        id: 'player-123',
        phone: '+15551234567',
      };

      const mockPreference = {
        id: 'pref-123',
        playerId: 'player-123',
        smsEnabled: true,
        smsOptedOut: false,
        emailEnabled: true,
        quietHoursStart: null,
        quietHoursEnd: null,
      };

      vi.mocked(prisma.notification.create).mockResolvedValueOnce(
        mockNotification as never
      );
      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce(
        mockOrg as never
      );
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce(
        mockPreference as never
      );
      vi.mocked(prisma.player.findUnique).mockResolvedValueOnce(
        mockPlayer as never
      );
      vi.mocked(prisma.notification.update).mockResolvedValueOnce(
        mockNotification as never
      );

      // Mock Redis failure - should fail open and allow SMS
      mockRedisGet.mockRejectedValueOnce(new Error('Redis connection failed'));
      mockRedisSet.mockResolvedValueOnce('OK');

      const input: NotificationInput = {
        orgId: 'org-123',
        playerId: 'player-123',
        type: 'sms',
        channel: 'sms_twilio',
        recipient: '+15551234567',
        message: 'Your match is ready',
      };

      const result = await sendNotification(input);

      // Should succeed despite Redis failure (fail open)
      expect(result.success).toBe(true);
    });
  });
});
