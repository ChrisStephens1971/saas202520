/**
 * Integration Tests: Chip Format System
 * Tests complete workflows with real database
 * Sprint 4 - CHIP-001, CHIP-002, CHIP-003
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { awardChips, adjustChips, getChipStandings, getChipStats } from '@/lib/chip-tracker';
import { assignNextMatch, getQueueStats } from '@/lib/chip-format-engine';
import { applyFinalsCutoff } from '@/lib/finals-cutoff';
import type { ChipConfig } from '@/lib/chip-tracker';

describe('Chip Format Integration Tests', () => {
  let testTournamentId: string;
  let testOrgId: string;
  const testPlayerIds: string[] = [];

  const chipConfig: ChipConfig = {
    winnerChips: 3,
    loserChips: 1,
    qualificationRounds: 5,
    finalsCount: 4,
    pairingStrategy: 'random',
    allowDuplicatePairings: false,
    tiebreaker: 'head_to_head',
  };

  beforeAll(async () => {
    console.log('🧪 Setting up chip format integration tests...');

    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Chip Format Test Org',
        slug: `chip-test-${Date.now()}`,
      },
    });
    testOrgId = org.id;

    // Create test tournament
    const tournament = await prisma.tournament.create({
      data: {
        name: 'Chip Format Integration Test',
        orgId: testOrgId,
        format: 'chip_format',
        startDate: new Date(),
        status: 'active',
        chipConfig: chipConfig as unknown as Record<string, unknown>,
      },
    });
    testTournamentId = tournament.id;

    // Create 8 test players
    for (let i = 1; i <= 8; i++) {
      const player = await prisma.player.create({
        data: {
          name: `Test Player ${i}`,
          tournamentId: testTournamentId,
          chipCount: 0,
          matchesPlayed: 0,
          chipHistory: [],
          rating: 1500,
          rank: i,
          wins: 0,
          losses: 0,
          active: true,
        },
      });
      testPlayerIds.push(player.id);
    }

    console.log(`✅ Created tournament ${testTournamentId} with 8 players`);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.match.deleteMany({ where: { tournamentId: testTournamentId } });
    await prisma.player.deleteMany({ where: { tournamentId: testTournamentId } });
    await prisma.tournament.delete({ where: { id: testTournamentId } });
    await prisma.organization.delete({ where: { id: testOrgId } });
    await prisma.$disconnect();
    console.log('✅ Cleanup complete');
  });

  beforeEach(async () => {
    // Reset player chips before each test
    await prisma.player.updateMany({
      where: { tournamentId: testTournamentId },
      data: {
        chipCount: 0,
        matchesPlayed: 0,
        chipHistory: [],
      },
    });
  });

  describe('Chip Tracking Flow', () => {
    it('should award chips after match completion', async () => {
      const [winnerId, loserId] = testPlayerIds;

      // Create a match
      const match = await prisma.match.create({
        data: {
          tournamentId: testTournamentId,
          playerAId: winnerId,
          playerBId: loserId,
          state: 'completed',
          score: { playerA: 9, playerB: 5, raceTo: 9, games: [] },
          winnerId,
        },
      });

      // Award chips
      const result = await awardChips(match.id, winnerId, loserId, chipConfig);

      expect(result.winner.chipCount).toBe(3);
      expect(result.loser.chipCount).toBe(1);
      expect(result.winner.matchesPlayed).toBe(1);
      expect(result.loser.matchesPlayed).toBe(1);

      // Verify in database
      const winner = await prisma.player.findUnique({ where: { id: winnerId } });
      expect(winner?.chipCount).toBe(3);
    });

    it('should accumulate chips across multiple matches', async () => {
      const [player1, player2, player3] = testPlayerIds;

      // Match 1: Player1 beats Player2
      const match1 = await prisma.match.create({
        data: {
          tournamentId: testTournamentId,
          playerAId: player1,
          playerBId: player2,
          state: 'completed',
          score: { playerA: 9, playerB: 7, raceTo: 9, games: [] },
          winnerId: player1,
        },
      });
      await awardChips(match1.id, player1, player2, chipConfig);

      // Match 2: Player1 beats Player3
      const match2 = await prisma.match.create({
        data: {
          tournamentId: testTournamentId,
          playerAId: player1,
          playerBId: player3,
          state: 'completed',
          score: { playerA: 9, playerB: 6, raceTo: 9, games: [] },
          winnerId: player1,
        },
      });
      await awardChips(match2.id, player1, player3, chipConfig);

      // Player 1 should have 6 chips (3 + 3)
      const player = await prisma.player.findUnique({ where: { id: player1 } });
      expect(player?.chipCount).toBe(6);
      expect(player?.matchesPlayed).toBe(2);
    });

    it('should handle manual chip adjustments', async () => {
      const playerId = testPlayerIds[0];

      // Give player some chips first
      await prisma.player.update({
        where: { id: playerId },
        data: { chipCount: 10 },
      });

      // Adjust chips (penalty)
      await adjustChips(playerId, -3, 'Late arrival penalty');

      const player = await prisma.player.findUnique({ where: { id: playerId } });
      expect(player?.chipCount).toBe(7);
    });
  });

  describe('Chip Standings', () => {
    it('should rank players by chip count', async () => {
      // Set different chip counts
      await prisma.player.update({
        where: { id: testPlayerIds[0] },
        data: { chipCount: 12 },
      });
      await prisma.player.update({
        where: { id: testPlayerIds[1] },
        data: { chipCount: 9 },
      });
      await prisma.player.update({
        where: { id: testPlayerIds[2] },
        data: { chipCount: 15 },
      });

      const standings = await getChipStandings(testTournamentId);

      expect(standings).toHaveLength(8);
      expect(standings[0].chipCount).toBe(15); // Highest
      expect(standings[0].rank).toBe(1);
      expect(standings[1].chipCount).toBe(12);
      expect(standings[1].rank).toBe(2);
      expect(standings[2].chipCount).toBe(9);
      expect(standings[2].rank).toBe(3);
    });

    it('should calculate chip statistics', async () => {
      // Set chip counts for all players
      for (let i = 0; i < testPlayerIds.length; i++) {
        await prisma.player.update({
          where: { id: testPlayerIds[i] },
          data: { chipCount: (i + 1) * 3, matchesPlayed: 2 },
        });
      }

      const stats = await getChipStats(testTournamentId);

      expect(stats.totalPlayers).toBe(8);
      expect(stats.averageChips).toBe(13.5); // (3+6+9+12+15+18+21+24) / 8
      expect(stats.maxChips).toBe(24);
      expect(stats.minChips).toBe(3);
    });
  });

  describe('Queue Management', () => {
    it('should assign matches from queue', async () => {
      // Mark players as available (no active matches)
      const assignment = await assignNextMatch(testTournamentId, chipConfig);

      expect(assignment).toBeDefined();
      expect(assignment?.match).toBeDefined();
      expect(assignment?.match.playerAId).toBeDefined();
      expect(assignment?.match.playerBId).toBeDefined();
      expect(assignment?.match.state).toBe('pending');
    });

    it('should track queue statistics', async () => {
      const stats = await getQueueStats(testTournamentId);

      expect(stats).toBeDefined();
      expect(stats.playersInQueue).toBeGreaterThan(0);
      expect(stats.totalPlayers).toBe(8);
    });

    it('should not pair players already in active matches', async () => {
      // Create an active match
      await prisma.match.create({
        data: {
          tournamentId: testTournamentId,
          playerAId: testPlayerIds[0],
          playerBId: testPlayerIds[1],
          state: 'active',
          score: { playerA: 3, playerB: 2, raceTo: 9, games: [] },
        },
      });

      const assignment = await assignNextMatch(testTournamentId, chipConfig);

      // Should assign remaining players, not the ones in active match
      expect(assignment?.match.playerAId).not.toBe(testPlayerIds[0]);
      expect(assignment?.match.playerAId).not.toBe(testPlayerIds[1]);
      expect(assignment?.match.playerBId).not.toBe(testPlayerIds[0]);
      expect(assignment?.match.playerBId).not.toBe(testPlayerIds[1]);
    });
  });

  describe('Finals Cutoff', () => {
    it('should select top N players for finals', async () => {
      // Set chip counts to create clear top 4
      const chipCounts = [20, 18, 15, 12, 10, 8, 5, 3];
      for (let i = 0; i < testPlayerIds.length; i++) {
        await prisma.player.update({
          where: { id: testPlayerIds[i] },
          data: {
            chipCount: chipCounts[i],
            matchesPlayed: 5,
          },
        });
      }

      const result = await applyFinalsCutoff(testTournamentId, chipConfig);

      expect(result.finalists).toHaveLength(4);
      expect(result.eliminated).toHaveLength(4);
      expect(result.finalists[0].chipCount).toBe(20);
      expect(result.finalists[3].chipCount).toBe(12); // 4th place
      expect(result.eliminated[0].chipCount).toBe(10); // 5th place
    });

    it('should handle ties at cutoff line', async () => {
      // Create a tie at 4th place (both have 12 chips)
      const chipCounts = [20, 18, 15, 12, 12, 8, 5, 3];
      for (let i = 0; i < testPlayerIds.length; i++) {
        await prisma.player.update({
          where: { id: testPlayerIds[i] },
          data: {
            chipCount: chipCounts[i],
            matchesPlayed: 5,
          },
        });
      }

      const result = await applyFinalsCutoff(testTournamentId, chipConfig);

      // Should still select exactly 4 finalists
      expect(result.finalists).toHaveLength(4);
      // Should have tiebreaker information
      expect(result.tiebreakers).toBeDefined();
    });
  });

  describe('Complete Tournament Flow', () => {
    it('should run a complete chip format tournament', async () => {
      console.log('\n🎯 Running complete tournament flow...\n');

      // Round 1: Assign 4 matches (8 players)
      const round1Matches = [];
      for (let i = 0; i < 4; i++) {
        const assignment = await assignNextMatch(testTournamentId, chipConfig);
        if (assignment) {
          round1Matches.push(assignment.match);
          console.log(`Match ${i + 1}: ${assignment.playerA.name} vs ${assignment.playerB.name}`);
        }
      }

      expect(round1Matches).toHaveLength(4);

      // Complete round 1 matches
      for (const match of round1Matches) {
        await prisma.match.update({
          where: { id: match.id },
          data: {
            state: 'completed',
            winnerId: match.playerAId, // Player A wins
            score: { playerA: 9, playerB: 7, raceTo: 9, games: [] },
          },
        });
        await awardChips(match.id, match.playerAId, match.playerBId, chipConfig);
      }

      // Check standings after round 1
      const standings1 = await getChipStandings(testTournamentId);
      console.log('\n📊 Standings after Round 1:');
      standings1.slice(0, 4).forEach((s) => {
        console.log(`  ${s.rank}. ${s.playerName}: ${s.chipCount} chips`);
      });

      // Winners should have 3 chips, losers 1 chip
      const winners = standings1.filter((s) => s.chipCount === 3);
      expect(winners).toHaveLength(4);

      // Round 2: Assign more matches
      const round2Matches = [];
      for (let i = 0; i < 4; i++) {
        const assignment = await assignNextMatch(testTournamentId, chipConfig);
        if (assignment) {
          round2Matches.push(assignment.match);
        }
      }

      expect(round2Matches.length).toBeGreaterThan(0);

      // Complete round 2
      for (const match of round2Matches) {
        await prisma.match.update({
          where: { id: match.id },
          data: {
            state: 'completed',
            winnerId: match.playerAId,
            score: { playerA: 9, playerB: 6, raceTo: 9, games: [] },
          },
        });
        await awardChips(match.id, match.playerAId, match.playerBId, chipConfig);
      }

      // Final standings
      const finalStandings = await getChipStandings(testTournamentId);
      console.log('\n📊 Final Standings:');
      finalStandings.forEach((s) => {
        console.log(`  ${s.rank}. ${s.playerName}: ${s.chipCount} chips (${s.matchesPlayed} matches)`);
      });

      // Apply finals cutoff
      const finalsResult = await applyFinalsCutoff(testTournamentId, chipConfig);
      console.log(`\n✅ Finalists: ${finalsResult.finalists.length}`);
      console.log(`❌ Eliminated: ${finalsResult.eliminated.length}`);

      expect(finalsResult.finalists).toHaveLength(4);
      expect(finalsResult.eliminated).toHaveLength(4);

      // Verify tournament statistics
      const stats = await getChipStats(testTournamentId);
      console.log(`\n📈 Tournament Stats:`);
      console.log(`   Total Players: ${stats.totalPlayers}`);
      console.log(`   Average Chips: ${stats.averageChips.toFixed(1)}`);
      console.log(`   Max Chips: ${stats.maxChips}`);
      console.log(`   Min Chips: ${stats.minChips}`);

      expect(stats.totalPlayers).toBe(8);
      expect(stats.maxChips).toBeGreaterThan(0);
    });
  });
});
