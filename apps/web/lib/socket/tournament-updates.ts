/**
 * Tournament Real-Time Update Handlers
 * Sprint 9 - Real-Time Features
 *
 * Server-side utilities to emit Socket.io events when tournament data changes
 */

import { emitToTournament, emitToUser, getIO } from './server';
import {
  SocketEvent,
  TournamentUpdatedPayload,
  MatchStartedPayload,
  MatchCompletedPayload,
  ChipsAwardedPayload,
  PlayerJoinedPayload,
  PlayerEliminatedPayload,
  BracketAdvancedPayload,
  NotificationPayload,
} from './events';

/**
 * Emit tournament updated event to all connected clients in the tournament room
 */
export function notifyTournamentUpdated(
  tournamentId: string,
  tournament: {
    id: string;
    name: string;
    status: string;
    currentRound?: number;
    totalRounds?: number;
  }
): void {
  const payload = {
    tournamentId: tournament.id,
    name: tournament.name,
    status: tournament.status,
    currentRound: tournament.currentRound,
    totalRounds: tournament.totalRounds,
    timestamp: new Date().toISOString(),
  } as any;

  emitToTournament(tournamentId, SocketEvent.TOURNAMENT_UPDATED, payload);
  console.log(`[Socket] Tournament updated: ${tournamentId}`);
}

/**
 * Emit match started event
 */
export function notifyMatchStarted(
  tournamentId: string,
  match: {
    id: string;
    round: number;
    matchNumber: number;
    player1Id: string;
    player1Name: string;
    player2Id: string;
    player2Name: string;
    tableNumber?: number;
  }
): void {
  const payload = {
    tournamentId,
    matchId: match.id,
    round: match.round,
    matchNumber: match.matchNumber,
    player1: {
      playerId: match.player1Id,
      playerName: match.player1Name,
    },
    player2: {
      playerId: match.player2Id,
      playerName: match.player2Name,
    },
    tableNumber: match.tableNumber,
    startedAt: new Date().toISOString(),
  } as any;

  emitToTournament(tournamentId, SocketEvent.MATCH_STARTED, payload);

  // Also notify individual players
  emitToUser(match.player1Id, SocketEvent.NOTIFICATION, {
    type: 'match_started',
    title: 'Match Started',
    message: `Your match against ${match.player2Name} has started${match.tableNumber ? ` at Table ${match.tableNumber}` : ''}`,
    tournamentId,
    timestamp: new Date().toISOString(),
  } as any);

  emitToUser(match.player2Id, SocketEvent.NOTIFICATION, {
    type: 'match_started',
    title: 'Match Started',
    message: `Your match against ${match.player1Name} has started${match.tableNumber ? ` at Table ${match.tableNumber}` : ''}`,
    tournamentId,
    timestamp: new Date().toISOString(),
  } as any);

  console.log(`[Socket] Match started: ${match.id} in tournament ${tournamentId}`);
}

/**
 * Emit match completed event
 */
export function notifyMatchCompleted(
  tournamentId: string,
  match: {
    id: string;
    round: number;
    matchNumber: number;
    player1Id: string;
    player1Name: string;
    player1Score: number;
    player1IsWinner: boolean;
    player2Id: string;
    player2Name: string;
    player2Score: number;
    player2IsWinner: boolean;
  }
): void {
  const payload = {
    tournamentId,
    matchId: match.id,
    round: match.round,
    matchNumber: match.matchNumber,
    player1: {
      playerId: match.player1Id,
      playerName: match.player1Name,
      score: match.player1Score,
      isWinner: match.player1IsWinner,
    },
    player2: {
      playerId: match.player2Id,
      playerName: match.player2Name,
      score: match.player2Score,
      isWinner: match.player2IsWinner,
    },
    completedAt: new Date().toISOString(),
  } as any;

  emitToTournament(tournamentId, SocketEvent.MATCH_COMPLETED, payload);

  // Notify winner
  const winnerId = match.player1IsWinner ? match.player1Id : match.player2Id;
  const winnerName = match.player1IsWinner ? match.player1Name : match.player2Name;
  const loserId = match.player1IsWinner ? match.player2Id : match.player1Id;
  const loserName = match.player1IsWinner ? match.player2Name : match.player1Name;

  emitToUser(winnerId, SocketEvent.NOTIFICATION, {
    type: 'match_won',
    title: 'Match Won!',
    message: `You defeated ${loserName}! Congratulations!`,
    tournamentId,
    timestamp: new Date().toISOString(),
  } as any);

  emitToUser(loserId, SocketEvent.NOTIFICATION, {
    type: 'match_lost',
    title: 'Match Complete',
    message: `Match against ${winnerName} has ended.`,
    tournamentId,
    timestamp: new Date().toISOString(),
  } as any);

  console.log(`[Socket] Match completed: ${match.id} in tournament ${tournamentId}`);
}

/**
 * Emit chips awarded event
 */
export function notifyChipsAwarded(
  tournamentId: string,
  playerId: string,
  playerName: string,
  chipsAwarded: number,
  newTotal: number,
  reason: string
): void {
  const payload = {
    tournamentId,
    playerId,
    playerName,
    chipsAwarded,
    newTotal,
    reason,
    timestamp: new Date().toISOString(),
  } as any;

  emitToTournament(tournamentId, SocketEvent.CHIPS_AWARDED, payload);

  // Notify the player
  emitToUser(playerId, SocketEvent.NOTIFICATION, {
    type: 'chips_awarded',
    title: 'Chips Awarded',
    message: `You earned ${chipsAwarded} chips! ${reason}`,
    tournamentId,
    timestamp: new Date().toISOString(),
  } as any);

  console.log(
    `[Socket] Chips awarded: ${chipsAwarded} to ${playerId} in tournament ${tournamentId}`
  );
}

/**
 * Emit player joined event
 */
export function notifyPlayerJoined(
  tournamentId: string,
  playerId: string,
  playerName: string
): void {
  const payload = {
    tournamentId,
    playerId,
    playerName,
    timestamp: new Date().toISOString(),
  } as any;

  emitToTournament(tournamentId, SocketEvent.PLAYER_JOINED, payload);
  console.log(`[Socket] Player joined: ${playerId} in tournament ${tournamentId}`);
}

/**
 * Emit player eliminated event
 */
export function notifyPlayerEliminated(
  tournamentId: string,
  playerId: string,
  playerName: string,
  finalRank: number
): void {
  const payload = {
    tournamentId,
    playerId,
    playerName,
    finalRank,
    timestamp: new Date().toISOString(),
  } as any;

  emitToTournament(tournamentId, SocketEvent.PLAYER_ELIMINATED, payload);

  // Notify the eliminated player
  emitToUser(playerId, SocketEvent.NOTIFICATION, {
    type: 'eliminated',
    title: 'Tournament Over',
    message: `You finished in ${getOrdinal(finalRank)} place. Thanks for playing!`,
    tournamentId,
    timestamp: new Date().toISOString(),
  } as any);

  console.log(`[Socket] Player eliminated: ${playerId} in tournament ${tournamentId}`);
}

/**
 * Emit bracket advanced event (when round completes)
 */
export function notifyBracketAdvanced(
  tournamentId: string,
  round: number,
  advancingPlayers: Array<{ playerId: string; playerName: string }>
): void {
  const payload = {
    tournamentId,
    round,
    advancingPlayers,
    timestamp: new Date().toISOString(),
  } as any;

  emitToTournament(tournamentId, SocketEvent.BRACKET_ADVANCED, payload);

  // Notify each advancing player
  advancingPlayers.forEach((player) => {
    emitToUser(player.playerId, SocketEvent.NOTIFICATION, {
      type: 'round_advanced',
      title: 'Round Complete',
      message: `You've advanced to Round ${round + 1}!`,
      tournamentId,
      timestamp: new Date().toISOString(),
    } as any);
  });

  console.log(`[Socket] Bracket advanced to round ${round + 1} in tournament ${tournamentId}`);
}

/**
 * Emit tournament started event
 */
export function notifyTournamentStarted(tournamentId: string, tournamentName: string): void {
  emitToTournament(tournamentId, SocketEvent.TOURNAMENT_UPDATED, {
    tournamentId,
    name: tournamentName,
    status: 'in_progress',
    currentRound: 1,
    timestamp: new Date().toISOString(),
  } as any);

  console.log(`[Socket] Tournament started: ${tournamentId}`);
}

/**
 * Emit tournament completed event
 */
export function notifyTournamentCompleted(
  tournamentId: string,
  tournamentName: string,
  winnerId: string,
  _winnerName: string
): void {
  emitToTournament(tournamentId, SocketEvent.TOURNAMENT_UPDATED, {
    tournamentId,
    name: tournamentName,
    status: 'completed',
    timestamp: new Date().toISOString(),
  } as any);

  // Notify winner
  emitToUser(winnerId, SocketEvent.NOTIFICATION, {
    type: 'tournament_won',
    title: 'Champion!',
    message: `Congratulations! You won ${tournamentName}!`,
    tournamentId,
    timestamp: new Date().toISOString(),
  } as any);

  console.log(`[Socket] Tournament completed: ${tournamentId}, winner: ${winnerId}`);
}

/**
 * Send custom notification to specific user
 */
export function sendNotificationToUser(
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    tournamentId?: string;
    actionUrl?: string;
  }
): void {
  const payload = {
    ...notification,
    timestamp: new Date().toISOString(),
  } as any;

  emitToUser(userId, SocketEvent.NOTIFICATION, payload);
  console.log(`[Socket] Notification sent to user: ${userId}`);
}

/**
 * Send custom notification to all users in tournament
 */
export function sendNotificationToTournament(
  tournamentId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
  }
): void {
  const payload = {
    ...notification,
    tournamentId,
    timestamp: new Date().toISOString(),
  } as any;

  emitToTournament(tournamentId, SocketEvent.NOTIFICATION, payload);
  console.log(`[Socket] Notification sent to tournament: ${tournamentId}`);
}

/**
 * Helper function to get ordinal string (1st, 2nd, 3rd, etc.)
 */
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Check if Socket.io server is available
 */
export function isSocketServerAvailable(): boolean {
  return getIO() !== null;
}
