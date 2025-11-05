/**
 * PDF Generation Helper
 * Generates payout sheets and other PDF documents
 */

import PDFDocument from 'pdfkit';

interface PayoutSheetData {
  tournamentName: string;
  tournamentDate: string;
  organizationName: string;
  payouts: {
    placement: number;
    playerName: string;
    amount: number;
    status: string;
  }[];
  summary: {
    totalCollected: number;
    totalPayouts: number;
    houseTake: number;
  };
}

/**
 * Generate payout sheet PDF
 * Returns a Buffer that can be sent as HTTP response
 */
export function generatePayoutSheet(data: PayoutSheetData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];

      // Collect PDF chunks
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Tournament Payout Sheet', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Tournament: ${data.tournamentName}`);
      doc.text(`Organization: ${data.organizationName}`);
      doc.text(`Date: ${data.tournamentDate}`);
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      doc.moveDown();

      // Payouts Table Header
      doc.fontSize(14).text('Payouts', { underline: true });
      doc.moveDown(0.5);

      // Table headers
      const tableTop = doc.y;
      const colWidths = { placement: 80, name: 200, amount: 100, status: 100 };
      const tableLeft = 50;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Placement', tableLeft, tableTop, { width: colWidths.placement });
      doc.text('Player', tableLeft + colWidths.placement, tableTop, { width: colWidths.name });
      doc.text('Amount', tableLeft + colWidths.placement + colWidths.name, tableTop, { width: colWidths.amount });
      doc.text('Status', tableLeft + colWidths.placement + colWidths.name + colWidths.amount, tableTop, { width: colWidths.status });

      doc.moveDown();

      // Draw line under header
      doc.moveTo(tableLeft, doc.y)
         .lineTo(tableLeft + colWidths.placement + colWidths.name + colWidths.amount + colWidths.status, doc.y)
         .stroke();

      doc.moveDown(0.5);

      // Table rows
      doc.font('Helvetica');
      data.payouts.forEach((payout) => {
        const rowTop = doc.y;

        // Placement
        const placementSuffix = getPlacementSuffix(payout.placement);
        doc.text(`${payout.placement}${placementSuffix}`, tableLeft, rowTop, { width: colWidths.placement });

        // Player
        doc.text(payout.playerName || 'TBD', tableLeft + colWidths.placement, rowTop, { width: colWidths.name });

        // Amount
        const amountText = `$${(payout.amount / 100).toFixed(2)}`;
        doc.text(amountText, tableLeft + colWidths.placement + colWidths.name, rowTop, { width: colWidths.amount });

        // Status
        doc.text(payout.status.toUpperCase(), tableLeft + colWidths.placement + colWidths.name + colWidths.amount, rowTop, { width: colWidths.status });

        doc.moveDown(0.8);
      });

      // Draw line before summary
      doc.moveDown(0.5);
      doc.moveTo(tableLeft, doc.y)
         .lineTo(tableLeft + colWidths.placement + colWidths.name + colWidths.amount + colWidths.status, doc.y)
         .stroke();
      doc.moveDown();

      // Summary
      doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      doc.text(`Total Collected: $${(data.summary.totalCollected / 100).toFixed(2)}`);
      doc.text(`Total Payouts: $${(data.summary.totalPayouts / 100).toFixed(2)}`);
      doc.text(`House Take: $${(data.summary.houseTake / 100).toFixed(2)}`);

      // Footer
      doc.moveDown(3);
      doc.fontSize(8).fillColor('#666666').text(
        'This document is for recordkeeping purposes only. All amounts are in USD.',
        { align: 'center' }
      );

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function getPlacementSuffix(placement: number): string {
  if (placement === 1) return 'st';
  if (placement === 2) return 'nd';
  if (placement === 3) return 'rd';
  return 'th';
}
