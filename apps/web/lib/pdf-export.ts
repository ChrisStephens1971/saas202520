/**
 * PDF Export Utility
 * Sprint 8 - Advanced Features
 *
 * Generate PDF reports for tournaments using jsPDF
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

export interface TournamentData {
  id: string;
  name: string;
  format: string;
  status: string;
  startDate: string;
  endDate?: string;
  location?: string;
  description?: string;
}

export interface PlayerData {
  id: string;
  name: string;
  email?: string;
  totalChips: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winRate: number;
  rank: number;
}

export interface MatchData {
  id: string;
  matchNumber: number;
  player1: string;
  player2: string;
  winner?: string;
  player1Chips: number;
  player2Chips: number;
  startedAt: string;
  completedAt?: string;
  status: string;
}

export interface TournamentReportData {
  tournament: TournamentData;
  players: PlayerData[];
  matches: MatchData[];
  statistics: {
    totalPlayers: number;
    totalMatches: number;
    completedMatches: number;
    totalChipsAwarded: number;
    averageChipsPerPlayer: number;
    maxChips: number;
  };
}

/**
 * Generate a comprehensive tournament report PDF
 */
export function generateTournamentReportPDF(data: TournamentReportData): jsPDF {
  const doc = new jsPDF();

  // Set up fonts and colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue-600
  const textColor: [number, number, number] = [15, 23, 42]; // Slate-900
  const lightGray: [number, number, number] = [241, 245, 249]; // Slate-100

  let currentY = 20;

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Tournament Report', 105, currentY, { align: 'center' });
  currentY += 15;

  // Tournament Details Section
  doc.setFontSize(16);
  doc.setTextColor(...textColor);
  doc.text('Tournament Details', 14, currentY);
  currentY += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const tournamentDetails = [
    ['Tournament Name:', data.tournament.name],
    ['Format:', data.tournament.format],
    ['Status:', data.tournament.status],
    ['Start Date:', new Date(data.tournament.startDate).toLocaleString()],
  ];

  if (data.tournament.endDate) {
    tournamentDetails.push(['End Date:', new Date(data.tournament.endDate).toLocaleString()]);
  }

  if (data.tournament.location) {
    tournamentDetails.push(['Location:', data.tournament.location]);
  }

  tournamentDetails.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, currentY);
    currentY += 7;
  });

  currentY += 5;

  // Statistics Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Tournament Statistics', 14, currentY);
  currentY += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const stats = [
    ['Total Players:', data.statistics.totalPlayers.toString()],
    ['Total Matches:', data.statistics.totalMatches.toString()],
    ['Completed Matches:', data.statistics.completedMatches.toString()],
    ['Total Chips Awarded:', data.statistics.totalChipsAwarded.toLocaleString()],
    ['Average Chips/Player:', data.statistics.averageChipsPerPlayer.toFixed(0)],
    ['Highest Chip Count:', data.statistics.maxChips.toLocaleString()],
  ];

  stats.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, currentY);
    currentY += 7;
  });

  currentY += 10;

  // Player Leaderboard Table
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Player Leaderboard', 14, currentY);
  currentY += 5;

  const playerTableData = data.players
    .sort((a, b) => a.rank - b.rank)
    .map((player) => [
      player.rank.toString(),
      player.name,
      player.totalChips.toLocaleString(),
      player.matchesPlayed.toString(),
      player.matchesWon.toString(),
      player.matchesLost.toString(),
      `${(player.winRate * 100).toFixed(1)}%`,
    ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Rank', 'Player', 'Chips', 'Played', 'Won', 'Lost', 'Win Rate']],
    body: playerTableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }

  // Match History Table
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Match History', 14, currentY);
  currentY += 5;

  const matchTableData = data.matches
    .sort((a, b) => a.matchNumber - b.matchNumber)
    .slice(0, 50) // Limit to first 50 matches to avoid PDF being too large
    .map((match) => [
      match.matchNumber.toString(),
      match.player1,
      match.player2,
      match.winner || 'In Progress',
      match.player1Chips.toString(),
      match.player2Chips.toString(),
      match.status,
    ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Player 1', 'Player 2', 'Winner', 'P1 Chips', 'P2 Chips', 'Status']],
    body: matchTableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      105,
      285,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Generate a player performance report PDF
 */
export function generatePlayerReportPDF(
  player: PlayerData,
  matches: MatchData[],
  tournamentName: string
): jsPDF {
  const doc = new jsPDF();

  const primaryColor: [number, number, number] = [59, 130, 246];
  const textColor: [number, number, number] = [15, 23, 42];

  let currentY = 20;

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Player Performance Report', 105, currentY, { align: 'center' });
  currentY += 15;

  // Player Info
  doc.setFontSize(16);
  doc.setTextColor(...textColor);
  doc.text('Player Information', 14, currentY);
  currentY += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const playerInfo = [
    ['Player Name:', player.name],
    ['Tournament:', tournamentName],
    ['Overall Rank:', `#${player.rank}`],
    ['Email:', player.email || 'N/A'],
  ];

  playerInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, currentY);
    currentY += 7;
  });

  currentY += 10;

  // Performance Statistics
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance Statistics', 14, currentY);
  currentY += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const perfStats = [
    ['Total Chips:', player.totalChips.toLocaleString()],
    ['Matches Played:', player.matchesPlayed.toString()],
    ['Matches Won:', player.matchesWon.toString()],
    ['Matches Lost:', player.matchesLost.toString()],
    ['Win Rate:', `${(player.winRate * 100).toFixed(1)}%`],
  ];

  perfStats.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, currentY);
    currentY += 7;
  });

  currentY += 10;

  // Match History
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Match History', 14, currentY);
  currentY += 5;

  const matchTableData = matches.map((match) => [
    match.matchNumber.toString(),
    match.player1 === player.name ? match.player2 : match.player1,
    match.winner === player.name ? 'Won' : match.winner ? 'Lost' : 'In Progress',
    match.player1 === player.name ? match.player1Chips.toString() : match.player2Chips.toString(),
    match.status,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Match #', 'Opponent', 'Result', 'Chips Won', 'Status']],
    body: matchTableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
    105,
    285,
    { align: 'center' }
  );

  return doc;
}

/**
 * Download a PDF document
 */
export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

/**
 * Export tournament report as PDF
 */
export function exportTournamentReport(data: TournamentReportData): void {
  const doc = generateTournamentReportPDF(data);
  const filename = `tournament-${data.tournament.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
  downloadPDF(doc, filename);
}

/**
 * Export player report as PDF
 */
export function exportPlayerReport(
  player: PlayerData,
  matches: MatchData[],
  tournamentName: string
): void {
  const doc = generatePlayerReportPDF(player, matches, tournamentName);
  const filename = `player-${player.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
  downloadPDF(doc, filename);
}
