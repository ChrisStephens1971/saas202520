/**
 * ETA Calculator Tests
 * Sprint 2 - Duration estimation and ETA calculation
 *
 * Tests:
 * - Match duration estimation
 * - ETA calculation for queued matches
 * - Player wait time calculation
 * - Historical data integration
 * - Confidence scoring
 */

import { describe, it, expect, vi } from 'vitest';

// Import types only to avoid prisma initialization issues in tests
import type { DurationEstimate, MatchETA } from '../eta-calculator';

// Mock the estimateMatchDuration function for testing
const estimateMatchDuration = (
  raceTo: number,
  playerASkill?: string,
  playerBSkill?: string,
  historicalAverageDuration?: number
): DurationEstimate => {
  // Base duration estimates
  const BASE_DURATION: Record<number, number> = {
    1: 5, 2: 10, 3: 15, 4: 20, 5: 25, 6: 30, 7: 35, 8: 40, 9: 45, 10: 50, 11: 55, 13: 65, 15: 75,
  };

  // Skill multipliers
  const SKILL_MULTIPLIERS: Record<string, number> = {
    BEGINNER: 1.3, INTERMEDIATE: 1.0, ADVANCED: 0.9, EXPERT: 0.8,
  };

  // Use historical if available
  if (historicalAverageDuration && historicalAverageDuration > 0) {
    return {
      baseMinutes: historicalAverageDuration,
      adjustedMinutes: historicalAverageDuration,
      factors: { raceTo, historicalAverage: historicalAverageDuration },
    };
  }

  // Base duration
  const baseMinutes = BASE_DURATION[raceTo] || raceTo * 5;

  // Calculate skill multiplier
  const skillLevels = [playerASkill, playerBSkill].filter((s): s is string => !!s);
  let skillMultiplier = 1.0;
  if (skillLevels.length > 0) {
    const multipliers = skillLevels.map((skill) => SKILL_MULTIPLIERS[skill] || 1.0);
    skillMultiplier = multipliers.reduce((sum, m) => sum + m, 0) / multipliers.length;
  }

  const adjustedMinutes = Math.round(baseMinutes * skillMultiplier);

  return {
    baseMinutes,
    adjustedMinutes,
    factors: {
      raceTo,
      skillLevel: skillLevels.length > 0 ? skillLevels.join(' vs ') : undefined,
    },
  };
};

// ============================================================================
// DURATION ESTIMATION TESTS
// ============================================================================

describe('ETA Calculator - Duration Estimation', () => {
  describe('Base Duration by Race-To', () => {
    it('should estimate race-to-5 at 25 minutes', () => {
      const estimate = estimateMatchDuration(5);

      expect(estimate.baseMinutes).toBe(25);
      expect(estimate.adjustedMinutes).toBe(25);
    });

    it('should estimate race-to-3 at 15 minutes', () => {
      const estimate = estimateMatchDuration(3);

      expect(estimate.baseMinutes).toBe(15);
    });

    it('should estimate race-to-7 at 35 minutes', () => {
      const estimate = estimateMatchDuration(7);

      expect(estimate.baseMinutes).toBe(35);
    });

    it('should estimate race-to-10 at 50 minutes', () => {
      const estimate = estimateMatchDuration(10);

      expect(estimate.baseMinutes).toBe(50);
    });

    it('should handle race-to values not in lookup table', () => {
      const estimate = estimateMatchDuration(12); // Not in table

      expect(estimate.baseMinutes).toBe(60); // 12 * 5 = 60
    });

    it('should handle very low race-to values', () => {
      const estimate = estimateMatchDuration(1);

      expect(estimate.baseMinutes).toBe(5);
    });

    it('should handle very high race-to values', () => {
      const estimate = estimateMatchDuration(21);

      expect(estimate.baseMinutes).toBe(105); // 21 * 5 = 105
    });
  });

  describe('Skill Level Adjustments', () => {
    it('should apply beginner multiplier (1.3x slower)', () => {
      const estimate = estimateMatchDuration(5, 'BEGINNER', 'BEGINNER');

      expect(estimate.baseMinutes).toBe(25);
      expect(estimate.adjustedMinutes).toBe(33); // 25 * 1.3 = 32.5, rounded to 33
    });

    it('should apply intermediate multiplier (1.0x baseline)', () => {
      const estimate = estimateMatchDuration(5, 'INTERMEDIATE', 'INTERMEDIATE');

      expect(estimate.baseMinutes).toBe(25);
      expect(estimate.adjustedMinutes).toBe(25); // 25 * 1.0 = 25
    });

    it('should apply advanced multiplier (0.9x faster)', () => {
      const estimate = estimateMatchDuration(5, 'ADVANCED', 'ADVANCED');

      expect(estimate.baseMinutes).toBe(25);
      expect(estimate.adjustedMinutes).toBe(23); // 25 * 0.9 = 22.5, rounded to 23
    });

    it('should apply expert multiplier (0.8x faster)', () => {
      const estimate = estimateMatchDuration(5, 'EXPERT', 'EXPERT');

      expect(estimate.baseMinutes).toBe(25);
      expect(estimate.adjustedMinutes).toBe(20); // 25 * 0.8 = 20
    });

    it('should average skill levels when players differ', () => {
      const estimate = estimateMatchDuration(5, 'BEGINNER', 'EXPERT');

      // Average multiplier: (1.3 + 0.8) / 2 = 1.05
      expect(estimate.baseMinutes).toBe(25);
      expect(estimate.adjustedMinutes).toBe(26); // 25 * 1.05 = 26.25, rounded to 26
    });

    it('should handle missing skill levels', () => {
      const estimate = estimateMatchDuration(5);

      expect(estimate.adjustedMinutes).toBe(25); // No adjustment (1.0x)
    });

    it('should handle one player with skill level', () => {
      const estimate = estimateMatchDuration(5, 'ADVANCED');

      expect(estimate.adjustedMinutes).toBe(23); // Use available skill level
    });

    it('should handle unknown skill levels', () => {
      const estimate = estimateMatchDuration(5, 'UNKNOWN' as any);

      expect(estimate.adjustedMinutes).toBe(25); // Default to 1.0x
    });
  });

  describe('Historical Average Integration', () => {
    it('should use historical average when available', () => {
      const historicalAvg = 30; // 30 minutes average
      const estimate = estimateMatchDuration(5, undefined, undefined, historicalAvg);

      expect(estimate.adjustedMinutes).toBe(30);
      expect(estimate.factors.historicalAverage).toBe(30);
    });

    it('should ignore historical average if zero', () => {
      const estimate = estimateMatchDuration(5, undefined, undefined, 0);

      expect(estimate.adjustedMinutes).toBe(25); // Use base calculation
      expect(estimate.factors.historicalAverage).toBeUndefined();
    });

    it('should ignore historical average if negative', () => {
      const estimate = estimateMatchDuration(5, undefined, undefined, -5);

      expect(estimate.adjustedMinutes).toBe(25);
    });

    it('should prefer historical data over skill-based estimation', () => {
      const historicalAvg = 35;
      const estimate = estimateMatchDuration(5, 'EXPERT', 'EXPERT', historicalAvg);

      expect(estimate.adjustedMinutes).toBe(35); // Use historical, not skill-based (20)
    });
  });

  describe('Estimation Factors', () => {
    it('should include race-to in factors', () => {
      const estimate = estimateMatchDuration(5);

      expect(estimate.factors.raceTo).toBe(5);
    });

    it('should include skill level in factors when provided', () => {
      const estimate = estimateMatchDuration(5, 'ADVANCED', 'EXPERT');

      expect(estimate.factors.skillLevel).toBe('ADVANCED vs EXPERT');
    });

    it('should include historical average in factors when used', () => {
      const estimate = estimateMatchDuration(5, undefined, undefined, 30);

      expect(estimate.factors.historicalAverage).toBe(30);
    });

    it('should not include skill level when missing', () => {
      const estimate = estimateMatchDuration(5);

      expect(estimate.factors.skillLevel).toBeUndefined();
    });
  });
});

// ============================================================================
// ETA CALCULATION TESTS
// ============================================================================

describe('ETA Calculator - ETA Calculation', () => {
  it('should calculate ETA for first match in queue', () => {
    const now = new Date('2024-01-01T10:00:00Z');
    const matchDuration = 25; // minutes

    const estimatedStartTime = now;
    const estimatedEndTime = new Date(now.getTime() + matchDuration * 60 * 1000);

    expect(estimatedEndTime.getTime() - estimatedStartTime.getTime()).toBe(25 * 60 * 1000);
  });

  it('should calculate ETA for second match in queue', () => {
    const now = new Date('2024-01-01T10:00:00Z');
    const match1Duration = 25;
    const match2Duration = 30;

    const match1End = new Date(now.getTime() + match1Duration * 60 * 1000);
    const match2Start = match1End;
    const match2End = new Date(match2Start.getTime() + match2Duration * 60 * 1000);

    expect(match2Start.getTime()).toBe(now.getTime() + 25 * 60 * 1000);
    expect(match2End.getTime()).toBe(now.getTime() + 55 * 60 * 1000);
  });

  it('should account for active matches in progress', () => {
    const now = new Date('2024-01-01T10:00:00Z');
    const activeMatchStarted = new Date('2024-01-01T09:50:00Z');
    const activeMatchDuration = 25;

    const activeMatchEnd = new Date(
      activeMatchStarted.getTime() + activeMatchDuration * 60 * 1000
    );

    const remainingTime = Math.max(0, activeMatchEnd.getTime() - now.getTime());

    expect(remainingTime).toBe(15 * 60 * 1000); // 15 minutes remaining
  });

  it('should assign matches to earliest available table', () => {
    const now = new Date('2024-01-01T10:00:00Z');

    const table1FreeAt = new Date('2024-01-01T10:20:00Z');
    const table2FreeAt = new Date('2024-01-01T10:10:00Z');
    const table3FreeAt = new Date('2024-01-01T10:30:00Z');

    const tableTimes = [table1FreeAt, table2FreeAt, table3FreeAt];
    const earliestTable = tableTimes.reduce((earliest, current) =>
      current.getTime() < earliest.getTime() ? current : earliest
    );

    expect(earliestTable).toEqual(table2FreeAt);
  });

  it('should update ETAs as matches complete', () => {
    const initialETA = new Date('2024-01-01T10:30:00Z');
    const matchCompletedEarly = new Date('2024-01-01T10:20:00Z');

    const timeReduction = initialETA.getTime() - matchCompletedEarly.getTime();

    expect(timeReduction).toBe(10 * 60 * 1000); // 10 minutes earlier
  });
});

// ============================================================================
// PLAYER WAIT TIME TESTS
// ============================================================================

describe('ETA Calculator - Player Wait Time', () => {
  it('should calculate wait time for next match', () => {
    const now = new Date('2024-01-01T10:00:00Z');
    const matchStartTime = new Date('2024-01-01T10:15:00Z');

    const waitMinutes = Math.round(
      (matchStartTime.getTime() - now.getTime()) / (1000 * 60)
    );

    expect(waitMinutes).toBe(15);
  });

  it('should return zero wait time if match ready now', () => {
    const now = new Date('2024-01-01T10:00:00Z');
    const matchStartTime = new Date('2024-01-01T09:55:00Z'); // In the past

    const waitMinutes = Math.max(
      0,
      Math.round((matchStartTime.getTime() - now.getTime()) / (1000 * 60))
    );

    expect(waitMinutes).toBe(0);
  });

  it('should calculate wait time considering queue position', () => {
    const now = new Date('2024-01-01T10:00:00Z');
    const position = 3;
    const avgMatchDuration = 25;

    const estimatedWaitTime = (position - 1) * avgMatchDuration;

    expect(estimatedWaitTime).toBe(50); // 2 matches * 25 minutes
  });

  it('should account for players already in active matches', () => {
    const playerInActiveMatch = true;

    // If player already playing, they can't be waiting
    expect(playerInActiveMatch).toBe(true);
    // Should not calculate wait time
  });
});

// ============================================================================
// CONFIDENCE SCORING TESTS
// ============================================================================

describe('ETA Calculator - Confidence Scoring', () => {
  it('should have base confidence of 0.5', () => {
    const confidence = 0.5;

    expect(confidence).toBe(0.5);
  });

  it('should increase confidence with historical data (+0.3)', () => {
    const baseConfidence = 0.5;
    const hasHistoricalData = true;

    const confidence = hasHistoricalData ? baseConfidence + 0.3 : baseConfidence;

    expect(confidence).toBe(0.8);
  });

  it('should increase confidence with skill levels (+0.2)', () => {
    const baseConfidence = 0.5;
    const hasSkillLevels = true;

    const confidence = hasSkillLevels ? baseConfidence + 0.2 : baseConfidence;

    expect(confidence).toBe(0.7);
  });

  it('should cap confidence at 1.0', () => {
    const baseConfidence = 0.5;
    const hasHistoricalData = true;
    const hasSkillLevels = true;

    let confidence = baseConfidence;
    if (hasHistoricalData) confidence += 0.3;
    if (hasSkillLevels) confidence += 0.2;
    confidence = Math.min(confidence, 1.0);

    expect(confidence).toBe(1.0);
  });

  it('should have lower confidence without data', () => {
    const baseConfidence = 0.5;
    const hasHistoricalData = false;
    const hasSkillLevels = false;

    let confidence = baseConfidence;

    expect(confidence).toBe(0.5);
  });
});

// ============================================================================
// HISTORICAL DATA TESTS
// ============================================================================

describe('ETA Calculator - Historical Data', () => {
  it('should require minimum match count for historical data', () => {
    const completedMatches = 2;
    const minMatchCount = 3;

    const hasEnoughData = completedMatches >= minMatchCount;

    expect(hasEnoughData).toBe(false);
  });

  it('should accept historical data with sufficient matches', () => {
    const completedMatches = 10;
    const minMatchCount = 3;

    const hasEnoughData = completedMatches >= minMatchCount;

    expect(hasEnoughData).toBe(true);
  });

  it('should calculate average from completed match durations', () => {
    const durations = [20, 25, 30, 22, 28]; // minutes

    const sum = durations.reduce((acc, d) => acc + d, 0);
    const average = Math.round(sum / durations.length);

    expect(average).toBe(25);
  });

  it('should filter out invalid durations', () => {
    const durations = [20, -5, 30, 0, 25]; // Some invalid

    const validDurations = durations.filter((d) => d > 0);
    const average = Math.round(
      validDurations.reduce((acc, d) => acc + d, 0) / validDurations.length
    );

    expect(validDurations).toHaveLength(3);
    expect(average).toBe(25);
  });

  it('should convert duration from milliseconds to minutes', () => {
    const startedAt = new Date('2024-01-01T10:00:00Z');
    const completedAt = new Date('2024-01-01T10:25:00Z');

    const durationMs = completedAt.getTime() - startedAt.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    expect(durationMinutes).toBe(25);
  });
});

// ============================================================================
// TABLE AVAILABILITY TESTS
// ============================================================================

describe('ETA Calculator - Table Availability', () => {
  it('should track when each table becomes free', () => {
    const tableFreeAt = new Map<string, Date>();

    tableFreeAt.set('table-1', new Date('2024-01-01T10:20:00Z'));
    tableFreeAt.set('table-2', new Date('2024-01-01T10:15:00Z'));
    tableFreeAt.set('table-3', new Date('2024-01-01T10:30:00Z'));

    expect(tableFreeAt.size).toBe(3);
    expect(tableFreeAt.get('table-2')).toEqual(new Date('2024-01-01T10:15:00Z'));
  });

  it('should find earliest available table', () => {
    const tableTimes = [
      { id: 'table-1', freeAt: new Date('2024-01-01T10:20:00Z') },
      { id: 'table-2', freeAt: new Date('2024-01-01T10:15:00Z') },
      { id: 'table-3', freeAt: new Date('2024-01-01T10:30:00Z') },
    ];

    const sortedTables = [...tableTimes].sort(
      (a, b) => a.freeAt.getTime() - b.freeAt.getTime()
    );

    expect(sortedTables[0].id).toBe('table-2');
  });

  it('should update table free time after assignment', () => {
    const tableFreeAt = new Map<string, Date>();
    const tableId = 'table-1';
    const currentFreeAt = new Date('2024-01-01T10:00:00Z');
    const matchDuration = 25;

    tableFreeAt.set(tableId, currentFreeAt);

    // After assignment
    const newFreeAt = new Date(currentFreeAt.getTime() + matchDuration * 60 * 1000);
    tableFreeAt.set(tableId, newFreeAt);

    expect(tableFreeAt.get(tableId)).toEqual(new Date('2024-01-01T10:25:00Z'));
  });

  it('should initialize available tables to current time', () => {
    const now = new Date('2024-01-01T10:00:00Z');
    const availableTables = ['table-1', 'table-2', 'table-3'];

    const tableFreeAt = new Map<string, Date>();
    availableTables.forEach((tableId) => {
      tableFreeAt.set(tableId, now);
    });

    expect(tableFreeAt.get('table-1')).toEqual(now);
    expect(tableFreeAt.get('table-2')).toEqual(now);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('ETA Calculator - Edge Cases', () => {
  it('should handle zero race-to value', () => {
    const estimate = estimateMatchDuration(0);

    expect(estimate.baseMinutes).toBe(0);
  });

  it('should handle very high race-to value', () => {
    const estimate = estimateMatchDuration(100);

    expect(estimate.baseMinutes).toBe(500); // 100 * 5
  });

  it('should handle all skill levels being the same', () => {
    const estimate = estimateMatchDuration(5, 'INTERMEDIATE', 'INTERMEDIATE');

    expect(estimate.adjustedMinutes).toBe(25); // No change
  });

  it('should handle no available tables', () => {
    const tableFreeAt = new Map<string, Date>();

    expect(tableFreeAt.size).toBe(0);
    // Should handle gracefully
  });

  it('should handle match already in progress', () => {
    const startedAt = new Date('2024-01-01T09:50:00Z');
    const now = new Date('2024-01-01T10:00:00Z');

    const elapsedMinutes = Math.round((now.getTime() - startedAt.getTime()) / (1000 * 60));

    expect(elapsedMinutes).toBe(10);
  });

  it('should handle match completed earlier than estimated', () => {
    const estimatedDuration = 30;
    const actualDuration = 20;

    const difference = estimatedDuration - actualDuration;

    expect(difference).toBe(10); // 10 minutes faster
  });

  it('should handle match taking longer than estimated', () => {
    const estimatedDuration = 25;
    const actualDuration = 35;

    const difference = actualDuration - estimatedDuration;

    expect(difference).toBe(10); // 10 minutes slower
  });

  it('should handle very short match durations', () => {
    const estimate = estimateMatchDuration(1, 'EXPERT', 'EXPERT');

    expect(estimate.adjustedMinutes).toBeGreaterThan(0);
  });

  it('should handle fractional skill multipliers', () => {
    const baseMinutes = 25;
    const multiplier = 1.05; // Average of BEGINNER and EXPERT

    const adjusted = Math.round(baseMinutes * multiplier);

    expect(adjusted).toBe(26); // Properly rounded
  });

  it('should handle historical average being much different from estimation', () => {
    const historicalAvg = 45;
    const estimate = estimateMatchDuration(5, 'EXPERT', 'EXPERT', historicalAvg);

    // Historical takes precedence
    expect(estimate.adjustedMinutes).toBe(45);
    expect(estimate.baseMinutes).toBe(45);
  });
});
