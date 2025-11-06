/**
 * Export Service
 * Sprint 10 Week 1 Day 4 - Analytics Export
 *
 * Provides functionality to export analytics data in multiple formats:
 * - CSV: Lightweight, universal format
 * - Excel: Rich formatting with multiple sheets
 * - PDF: Professional reports with tables and charts
 *
 * Supports background processing for large exports via BullMQ.
 */

import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { addJob, getQueue } from '../jobs/queue';

const prisma = new PrismaClient();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Common export options
 */
export interface ExportOptions {
  tenantId: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  includeCharts?: boolean;
  customHeaders?: Record<string, string>;
  filters?: Record<string, any>;
}

/**
 * Excel-specific export options
 */
export interface ExcelExportOptions extends ExportOptions {
  includeFormatting?: boolean;
  includeCharts?: boolean;
  sheetNames?: {
    revenue?: string;
    users?: string;
    tournaments?: string;
  };
}

/**
 * PDF-specific export options
 */
export interface PDFExportOptions extends ExportOptions {
  orientation?: 'portrait' | 'landscape';
  includeLogo?: boolean;
  includeCharts?: boolean;
  pageSize?: 'a4' | 'letter';
  title?: string;
  subtitle?: string;
}

/**
 * Structured data for analytics export
 */
export interface AnalyticsExportData {
  tenantId: string;
  organizationName: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  revenue: {
    summary: {
      mrr: number;
      arr: number;
      totalRevenue: number;
      growth: number;
    };
    breakdown: Array<{
      date: Date;
      amount: number;
      type: string;
      source: string;
    }>;
  };
  users: {
    summary: {
      total: number;
      active: number;
      new: number;
      churn: number;
    };
    cohorts: Array<{
      cohort: Date;
      size: number;
      retention: number;
      revenue: number;
    }>;
  };
  tournaments: {
    summary: {
      total: number;
      completed: number;
      completionRate: number;
      avgPlayers: number;
    };
    details: Array<{
      date: Date;
      format: string;
      players: number;
      revenue: number;
      status: string;
    }>;
  };
}

/**
 * Export job options for background processing
 */
export interface ExportJobOptions {
  userId: string;
  email: string;
  format: 'csv' | 'excel' | 'pdf';
  uploadToS3?: boolean;
  notifyOnComplete?: boolean;
}

/**
 * Export job status
 */
export interface ExportJobStatus {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number; // 0-100
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Export data to CSV format
 *
 * @param data - Array of objects to export
 * @param filename - Name of the CSV file
 * @param options - Export options
 * @returns CSV string
 */
export function exportToCSV(
  data: any[],
  filename: string,
  options?: Partial<ExportOptions>
): string {
  if (!data || data.length === 0) {
    throw new Error('No data provided for CSV export');
  }

  console.log(`[Export] Generating CSV: ${filename}`);

  // Extract headers from first object
  const headers = Object.keys(data[0]);

  // Apply custom headers if provided
  const displayHeaders = options?.customHeaders
    ? headers.map((h) => options.customHeaders![h] || h)
    : headers;

  // Build CSV rows
  const rows: string[] = [];

  // Add header row
  rows.push(displayHeaders.map(escapeCSVValue).join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      return escapeCSVValue(formatCSVValue(value));
    });
    rows.push(values.join(','));
  }

  const csv = rows.join('\n');

  console.log(`[Export] CSV generated: ${rows.length} rows`);

  return csv;
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: string): string {
  if (typeof value !== 'string') {
    value = String(value);
  }

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Format value for CSV output
 */
function formatCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return format(value, 'yyyy-MM-dd HH:mm:ss');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

// ============================================================================
// EXCEL EXPORT
// ============================================================================

/**
 * Export data to Excel format with multiple sheets
 *
 * @param data - Structured analytics data
 * @param filename - Name of the Excel file
 * @param options - Excel export options
 * @returns Excel buffer
 */
export async function exportToExcel(
  data: AnalyticsExportData,
  filename: string,
  options?: ExcelExportOptions
): Promise<Buffer> {
  console.log(`[Export] Generating Excel: ${filename}`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tournament Analytics';
  workbook.created = new Date();

  const sheetNames = options?.sheetNames || {
    revenue: 'Revenue',
    users: 'Users',
    tournaments: 'Tournaments',
  };

  // ========== Revenue Sheet ==========
  const revenueSheet = workbook.addWorksheet(sheetNames.revenue || 'Revenue');

  // Add title
  revenueSheet.addRow([`Revenue Report - ${data.organizationName}`]);
  revenueSheet.addRow([
    `Period: ${format(data.dateRange.start, 'MMM dd, yyyy')} - ${format(
      data.dateRange.end,
      'MMM dd, yyyy'
    )}`,
  ]);
  revenueSheet.addRow([]); // Blank row

  // Summary section
  revenueSheet.addRow(['Summary']);
  revenueSheet.addRow(['MRR', data.revenue.summary.mrr]);
  revenueSheet.addRow(['ARR', data.revenue.summary.arr]);
  revenueSheet.addRow(['Total Revenue', data.revenue.summary.totalRevenue]);
  revenueSheet.addRow(['Growth Rate', `${data.revenue.summary.growth.toFixed(1)}%`]);
  revenueSheet.addRow([]); // Blank row

  // Revenue breakdown table
  revenueSheet.addRow(['Date', 'Amount', 'Type', 'Source']);

  const revenueHeaderRow = revenueSheet.lastRow;
  if (revenueHeaderRow) {
    revenueHeaderRow.font = { bold: true };
    revenueHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    revenueHeaderRow.font = { ...revenueHeaderRow.font, color: { argb: 'FFFFFFFF' } };
  }

  for (const item of data.revenue.breakdown) {
    revenueSheet.addRow([
      format(item.date, 'yyyy-MM-dd'),
      item.amount,
      item.type,
      item.source,
    ]);
  }

  // Format currency columns
  revenueSheet.getColumn(2).numFmt = '$#,##0.00';
  revenueSheet.getColumn(2).width = 15;
  revenueSheet.getColumn(3).width = 20;
  revenueSheet.getColumn(4).width = 20;

  // ========== Users Sheet ==========
  const usersSheet = workbook.addWorksheet(sheetNames.users || 'Users');

  // Add title
  usersSheet.addRow([`User Analytics - ${data.organizationName}`]);
  usersSheet.addRow([
    `Period: ${format(data.dateRange.start, 'MMM dd, yyyy')} - ${format(
      data.dateRange.end,
      'MMM dd, yyyy'
    )}`,
  ]);
  usersSheet.addRow([]);

  // Summary section
  usersSheet.addRow(['Summary']);
  usersSheet.addRow(['Total Users', data.users.summary.total]);
  usersSheet.addRow(['Active Users', data.users.summary.active]);
  usersSheet.addRow(['New Users', data.users.summary.new]);
  usersSheet.addRow(['Churn Rate', `${data.users.summary.churn.toFixed(1)}%`]);
  usersSheet.addRow([]);

  // Cohort table
  usersSheet.addRow(['Cohort', 'Size', 'Retention Rate', 'Revenue']);

  const usersHeaderRow = usersSheet.lastRow;
  if (usersHeaderRow) {
    usersHeaderRow.font = { bold: true };
    usersHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' },
    };
    usersHeaderRow.font = { ...usersHeaderRow.font, color: { argb: 'FFFFFFFF' } };
  }

  for (const cohort of data.users.cohorts) {
    usersSheet.addRow([
      format(cohort.cohort, 'MMM yyyy'),
      cohort.size,
      `${cohort.retention.toFixed(1)}%`,
      cohort.revenue,
    ]);
  }

  usersSheet.getColumn(2).width = 12;
  usersSheet.getColumn(3).width = 18;
  usersSheet.getColumn(4).width = 15;
  usersSheet.getColumn(4).numFmt = '$#,##0.00';

  // ========== Tournaments Sheet ==========
  const tournamentsSheet = workbook.addWorksheet(sheetNames.tournaments || 'Tournaments');

  // Add title
  tournamentsSheet.addRow([`Tournament Analytics - ${data.organizationName}`]);
  tournamentsSheet.addRow([
    `Period: ${format(data.dateRange.start, 'MMM dd, yyyy')} - ${format(
      data.dateRange.end,
      'MMM dd, yyyy'
    )}`,
  ]);
  tournamentsSheet.addRow([]);

  // Summary section
  tournamentsSheet.addRow(['Summary']);
  tournamentsSheet.addRow(['Total Tournaments', data.tournaments.summary.total]);
  tournamentsSheet.addRow(['Completed', data.tournaments.summary.completed]);
  tournamentsSheet.addRow([
    'Completion Rate',
    `${data.tournaments.summary.completionRate.toFixed(1)}%`,
  ]);
  tournamentsSheet.addRow(['Avg Players', data.tournaments.summary.avgPlayers.toFixed(1)]);
  tournamentsSheet.addRow([]);

  // Tournament details table
  tournamentsSheet.addRow(['Date', 'Format', 'Players', 'Revenue', 'Status']);

  const tournamentsHeaderRow = tournamentsSheet.lastRow;
  if (tournamentsHeaderRow) {
    tournamentsHeaderRow.font = { bold: true };
    tournamentsHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' },
    };
    tournamentsHeaderRow.font = { ...tournamentsHeaderRow.font, color: { argb: 'FFFFFFFF' } };
  }

  for (const tournament of data.tournaments.details) {
    tournamentsSheet.addRow([
      format(tournament.date, 'yyyy-MM-dd'),
      tournament.format,
      tournament.players,
      tournament.revenue,
      tournament.status,
    ]);
  }

  tournamentsSheet.getColumn(2).width = 20;
  tournamentsSheet.getColumn(3).width = 12;
  tournamentsSheet.getColumn(4).width = 15;
  tournamentsSheet.getColumn(4).numFmt = '$#,##0.00';
  tournamentsSheet.getColumn(5).width = 15;

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  console.log(`[Export] Excel generated: ${filename}`);

  return Buffer.from(buffer);
}

// ============================================================================
// PDF EXPORT
// ============================================================================

/**
 * Export data to PDF format
 *
 * @param data - Structured analytics data
 * @param options - PDF export options
 * @returns PDF blob
 */
export async function exportToPDF(
  data: AnalyticsExportData,
  options?: PDFExportOptions
): Promise<Blob> {
  console.log(`[Export] Generating PDF report`);

  const doc = new jsPDF({
    orientation: options?.orientation || 'portrait',
    unit: 'mm',
    format: options?.pageSize || 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // ========== Header ==========
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(options?.title || 'Analytics Report', pageWidth / 2, yPos, {
    align: 'center',
  });
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.organizationName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  doc.setFontSize(10);
  doc.text(
    `${format(data.dateRange.start, 'MMM dd, yyyy')} - ${format(
      data.dateRange.end,
      'MMM dd, yyyy'
    )}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );
  yPos += 15;

  // ========== Revenue Section ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Revenue Summary', 15, yPos);
  yPos += 10;

  // Revenue summary table
  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: [
      ['MRR', `$${data.revenue.summary.mrr.toLocaleString()}`],
      ['ARR', `$${data.revenue.summary.arr.toLocaleString()}`],
      ['Total Revenue', `$${data.revenue.summary.totalRevenue.toLocaleString()}`],
      ['Growth Rate', `${data.revenue.summary.growth.toFixed(1)}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [68, 114, 196] },
    margin: { left: 15, right: 15 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Revenue breakdown table (limited rows)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Revenue Breakdown (Last 10)', 15, yPos);
  yPos += 7;

  const revenueRows = data.revenue.breakdown.slice(0, 10).map((item) => [
    format(item.date, 'yyyy-MM-dd'),
    item.type,
    item.source,
    `$${item.amount.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Date', 'Type', 'Source', 'Amount']],
    body: revenueRows,
    theme: 'grid',
    headStyles: { fillColor: [68, 114, 196] },
    margin: { left: 15, right: 15 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }

  // ========== Users Section ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('User Analytics', 15, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: [
      ['Total Users', data.users.summary.total.toLocaleString()],
      ['Active Users', data.users.summary.active.toLocaleString()],
      ['New Users', data.users.summary.new.toLocaleString()],
      ['Churn Rate', `${data.users.summary.churn.toFixed(1)}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [112, 173, 71] },
    margin: { left: 15, right: 15 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }

  // ========== Tournaments Section ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Tournament Analytics', 15, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: [
      ['Total Tournaments', data.tournaments.summary.total.toLocaleString()],
      ['Completed', data.tournaments.summary.completed.toLocaleString()],
      [
        'Completion Rate',
        `${data.tournaments.summary.completionRate.toFixed(1)}%`,
      ],
      ['Avg Players', data.tournaments.summary.avgPlayers.toFixed(1)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [255, 192, 0] },
    margin: { left: 15, right: 15 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`,
      15,
      pageHeight - 10
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
  }

  const pdfBlob = doc.output('blob');

  console.log(`[Export] PDF generated successfully`);

  return pdfBlob;
}

// ============================================================================
// BACKGROUND EXPORT JOBS
// ============================================================================

/**
 * Queue an export job for background processing
 *
 * Use this for large datasets that may take a while to process.
 *
 * @param tenantId - Organization ID
 * @param exportType - Type of data to export
 * @param options - Export job options
 * @returns Job ID for tracking
 */
export async function queueExportJob(
  tenantId: string,
  exportType: 'revenue' | 'tournaments' | 'users',
  options: ExportJobOptions
): Promise<string> {
  console.log(
    `[Export] Queueing ${options.format} export job for tenant ${tenantId}`
  );

  const job = await addJob('export', {
    tenantId,
    exportType,
    format: options.format,
    dateRange: {
      start: new Date().toISOString(),
      end: new Date().toISOString(),
    },
    userId: options.userId,
  });

  console.log(`[Export] Export job queued: ${job.id}`);

  return job.id || 'unknown';
}

/**
 * Get the status of an export job
 *
 * @param jobId - Job ID from queueExportJob
 * @returns Export job status
 */
export async function getExportStatus(jobId: string): Promise<ExportJobStatus> {
  const queue = getQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    throw new Error(`Export job ${jobId} not found`);
  }

  const state = await job.getState();
  const progress = job.progress as number;

  const status: ExportJobStatus = {
    jobId: job.id || 'unknown',
    status: state === 'completed' || state === 'failed' ? state : state === 'active' ? 'active' : 'waiting',
    progress: typeof progress === 'number' ? progress : 0,
    createdAt: new Date(job.timestamp),
  };

  // Add download URL if completed
  if (state === 'completed' && job.returnvalue?.downloadUrl) {
    status.downloadUrl = job.returnvalue.downloadUrl;
    status.completedAt = new Date(job.finishedOn || Date.now());
  }

  // Add error if failed
  if (state === 'failed' && job.failedReason) {
    status.error = job.failedReason;
  }

  return status;
}

/**
 * Generate download filename
 */
export function generateFilename(
  type: 'revenue' | 'users' | 'tournaments',
  format: 'csv' | 'excel' | 'pdf',
  tenantId: string
): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
  const extension = format === 'excel' ? 'xlsx' : format;
  return `analytics-${type}-${tenantId}-${timestamp}.${extension}`;
}
