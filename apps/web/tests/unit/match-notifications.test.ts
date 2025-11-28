/**
 * Unit tests for match notification triggers
 * Sprint 4 - NOTIFY-004, NOTIFY-005
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  notifyMatchReady,
  notifyMatchCompleted,
  sendCheckInReminder,
  sendBulkCheckInReminders,
  notifyTournamentStarting,
} from '@/lib/match-notifications';
import { prisma } from '@/lib/prisma';
import * as notificationService from '@/lib/notification-service';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    match: {
      findUnique: vi.fn(),
    },
    player: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    tournament: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock notification service
vi.mock('@/lib/notification-service', () => ({
  sendNotificationWithTemplate: vi.fn().mockResolvedValue({
    email: { success: true },
    sms: { success: true },
    inApp: { success: true },
  }),
  createInAppNotification: vi.fn().mockResolvedValue({ success: true }),
}));

describe('match-notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notifyMatchReady', () => {
    it('should send notifications to both players when match is ready', async () => {
      const mockMatch = {
        id: 'match-123',
        tournamentId: 'tournament-123',
        playerAId: 'player-a',
        playerBId: 'player-b',
        tableId: 'table-1',
        tournament: {
          orgId: 'org-123',
          name: 'Test Tournament',
          organization: { id: 'org-123', name: 'Test Org' },
        },
        playerA: {
          id: 'player-a',
          name: 'Alice',
          email: 'alice@example.com',
          phone: '+1234567890',
        },
        playerB: {
          id: 'player-b',
          name: 'Bob',
          email: 'bob@example.com',
          phone: '+0987654321',
        },
        table: {
          id: 'table-1',
          label: 'Table 1',
        },
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(mockMatch as never);

      await notifyMatchReady('match-123');

      // Verify in-app notifications sent to both players
      expect(notificationService.createInAppNotification).toHaveBeenCalledTimes(2);
      expect(notificationService.createInAppNotification).toHaveBeenCalledWith(
        'org-123',
        'player-a',
        expect.stringContaining('Table 1'),
        'tournament-123'
      );
      expect(notificationService.createInAppNotification).toHaveBeenCalledWith(
        'org-123',
        'player-b',
        expect.stringContaining('Table 1'),
        'tournament-123'
      );
    });

    it('should skip notification if match is not ready', async () => {
      const mockMatch = {
        id: 'match-123',
        playerA: null,
        playerB: null,
        table: null,
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(mockMatch as never);

      await notifyMatchReady('match-123');

      // No notifications should be sent
      expect(notificationService.createInAppNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyMatchCompleted', () => {
    it('should send notifications to both players when match is completed', async () => {
      const mockMatch = {
        id: 'match-123',
        tournamentId: 'tournament-123',
        playerAId: 'player-a',
        playerBId: 'player-b',
        winnerId: 'player-a',
        score: { playerA: 9, playerB: 7 },
        tournament: {
          orgId: 'org-123',
          name: 'Test Tournament',
          organization: { id: 'org-123', name: 'Test Org' },
        },
        playerA: {
          id: 'player-a',
          name: 'Alice',
          email: 'alice@example.com',
          phone: '+1234567890',
        },
        playerB: {
          id: 'player-b',
          name: 'Bob',
          email: 'bob@example.com',
          phone: '+0987654321',
        },
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(mockMatch as never);

      await notifyMatchCompleted('match-123');

      // Verify template-based notifications sent to both players
      expect(notificationService.sendNotificationWithTemplate).toHaveBeenCalledTimes(2);

      // Winner notification
      expect(notificationService.sendNotificationWithTemplate).toHaveBeenCalledWith(
        'org-123',
        'player-a',
        'match_completed',
        expect.objectContaining({
          playerName: 'Alice',
          matchOpponent: 'Bob',
          score: '9-7',
        }),
        ['email', 'sms', 'in_app'],
        'tournament-123'
      );

      // Loser notification
      expect(notificationService.sendNotificationWithTemplate).toHaveBeenCalledWith(
        'org-123',
        'player-b',
        'match_completed',
        expect.objectContaining({
          playerName: 'Bob',
          matchOpponent: 'Alice',
          score: '9-7',
        }),
        ['email', 'sms', 'in_app'],
        'tournament-123'
      );
    });
  });

  describe('sendCheckInReminder', () => {
    it('should send check-in reminder to registered player', async () => {
      const mockPlayer = {
        id: 'player-123',
        name: 'Alice',
        email: 'alice@example.com',
        phone: '+1234567890',
        status: 'registered',
        tournament: {
          orgId: 'org-123',
          name: 'Test Tournament',
          organization: { id: 'org-123', name: 'Test Org' },
        },
      };

      vi.mocked(prisma.player.findUnique).mockResolvedValueOnce(mockPlayer as never);

      await sendCheckInReminder('player-123', 'tournament-123');

      // Verify in-app notification
      expect(notificationService.createInAppNotification).toHaveBeenCalledWith(
        'org-123',
        'player-123',
        expect.stringContaining('check in'),
        'tournament-123'
      );

      // Verify template notification sent
      expect(notificationService.sendNotificationWithTemplate).toHaveBeenCalledWith(
        'org-123',
        'player-123',
        'tournament_reminder',
        expect.objectContaining({
          playerName: 'Alice',
          tournamentName: 'Test Tournament',
          customMessage: expect.stringContaining('check in'),
        }),
        ['email', 'sms'],
        'tournament-123'
      );
    });

    it('should skip reminder for already checked-in player', async () => {
      const mockPlayer = {
        id: 'player-123',
        status: 'checked_in', // Already checked in
        tournament: { orgId: 'org-123' },
      };

      vi.mocked(prisma.player.findUnique).mockResolvedValueOnce(mockPlayer as never);

      await sendCheckInReminder('player-123', 'tournament-123');

      // No notifications should be sent
      expect(notificationService.createInAppNotification).not.toHaveBeenCalled();
      expect(notificationService.sendNotificationWithTemplate).not.toHaveBeenCalled();
    });
  });

  describe('sendBulkCheckInReminders', () => {
    it('should send reminders to all registered players', async () => {
      const mockPlayers = [
        { id: 'player-1', status: 'registered' },
        { id: 'player-2', status: 'registered' },
        { id: 'player-3', status: 'registered' },
      ];

      vi.mocked(prisma.player.findMany).mockResolvedValueOnce(mockPlayers as never);

      // Mock findUnique for each player
      vi.mocked(prisma.player.findUnique)
        .mockResolvedValueOnce({
          id: 'player-1',
          name: 'Alice',
          email: 'alice@example.com',
          status: 'registered',
          tournament: {
            orgId: 'org-123',
            name: 'Test Tournament',
            organization: {},
          },
        } as never)
        .mockResolvedValueOnce({
          id: 'player-2',
          name: 'Bob',
          email: 'bob@example.com',
          status: 'registered',
          tournament: {
            orgId: 'org-123',
            name: 'Test Tournament',
            organization: {},
          },
        } as never)
        .mockResolvedValueOnce({
          id: 'player-3',
          name: 'Charlie',
          email: 'charlie@example.com',
          status: 'registered',
          tournament: {
            orgId: 'org-123',
            name: 'Test Tournament',
            organization: {},
          },
        } as never);

      await sendBulkCheckInReminders('tournament-123');

      // Verify findMany was called with correct filters
      expect(prisma.player.findMany).toHaveBeenCalledWith({
        where: {
          tournamentId: 'tournament-123',
          status: 'registered',
        },
      });

      // Verify notifications sent to all players (3 in-app + 3 email + 3 SMS = 9 total)
      expect(notificationService.createInAppNotification).toHaveBeenCalledTimes(3);
    });
  });

  describe('notifyTournamentStarting', () => {
    it('should send notifications to all checked-in players', async () => {
      const mockTournament = {
        id: 'tournament-123',
        orgId: 'org-123',
        name: 'Test Tournament',
        organization: { id: 'org-123', name: 'Test Org' },
        players: [
          {
            id: 'player-1',
            name: 'Alice',
            email: 'alice@example.com',
            phone: '+1111111111',
            status: 'checked_in',
          },
          {
            id: 'player-2',
            name: 'Bob',
            email: 'bob@example.com',
            phone: '+2222222222',
            status: 'checked_in',
          },
        ],
      };

      vi.mocked(prisma.tournament.findUnique).mockResolvedValueOnce(mockTournament as never);

      await notifyTournamentStarting('tournament-123');

      // Verify in-app notifications sent to all checked-in players
      expect(notificationService.createInAppNotification).toHaveBeenCalledTimes(2);

      // Verify template notifications sent
      expect(notificationService.sendNotificationWithTemplate).toHaveBeenCalledTimes(2);
    });
  });
});
