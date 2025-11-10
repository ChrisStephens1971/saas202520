/**
 * Scheduled Reports Service
 * Sprint 10 Week 1 Day 4 - Report Scheduling
 *
 * Manages scheduled analytics reports configuration.
 * Allows users to set up recurring reports (daily, weekly, monthly)
 * to be automatically generated and emailed.
 *
 * Reports are stored in the database and processed by background jobs.
 */

import { PrismaClient } from '@prisma/client';
import { validateCronExpression } from '../jobs/scheduler';

const prisma = new PrismaClient();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Report schedule configuration
 */
export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  cronExpression?: string; // For custom schedules
  dayOfWeek?: number; // 0-6 (Sunday-Saturday) for weekly
  dayOfMonth?: number; // 1-31 for monthly
  hour: number; // 0-23
  minute: number; // 0-59
  timezone: string; // e.g., 'America/New_York'
}

/**
 * Report recipients
 */
export interface ReportRecipients {
  to: string[]; // Primary recipients
  cc?: string[]; // CC recipients
  bcc?: string[]; // BCC recipients
}

/**
 * Report format options
 */
export type ReportFormat = 'csv' | 'excel' | 'pdf';

/**
 * Report sections to include
 */
export interface ReportSections {
  revenue: boolean;
  users: boolean;
  cohorts: boolean;
  tournaments: boolean;
  predictions?: boolean;
  summary: boolean;
}

/**
 * Complete report configuration
 */
export interface ReportConfig {
  id?: string;
  tenantId: string;
  name: string;
  description?: string;
  enabled: boolean;
  schedule: ReportSchedule;
  recipients: ReportRecipients;
  format: ReportFormat;
  sections: ReportSections;
  dateRange?: {
    type: 'last7days' | 'last30days' | 'lastMonth' | 'lastQuarter' | 'custom';
    customStart?: Date;
    customEnd?: Date;
  };
  createdBy: string; // User ID
  createdAt?: Date;
  updatedAt?: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

/**
 * Report delivery record
 */
export interface ReportDelivery {
  id: string;
  reportId: string;
  tenantId: string;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  format: ReportFormat;
  recipients: string[];
  deliveredAt?: Date;
  errorMessage?: string;
  downloadUrl?: string;
  fileSize?: number;
  createdAt: Date;
}

// ============================================================================
// REPORT CONFIGURATION MANAGEMENT
// ============================================================================

/**
 * Create a new scheduled report
 *
 * @param config - Report configuration
 * @returns Created report config with ID
 */
export async function createScheduledReport(
  config: ReportConfig
): Promise<ReportConfig> {
  console.log(`[Reports] Creating scheduled report: ${config.name}`);

  // Validate schedule
  const cronExpression = generateCronExpression(config.schedule);
  if (!validateCronExpression(cronExpression)) {
    throw new Error(`Invalid cron expression: ${cronExpression}`);
  }

  // Calculate next run time
  const nextRunAt = calculateNextRunTime(config.schedule);

  // Store in database
  const report = await prisma.scheduledReport.create({
    data: {
      tenantId: config.tenantId,
      name: config.name,
      description: config.description,
      enabled: config.enabled,
      schedule: JSON.stringify(config.schedule),
      recipients: JSON.stringify(config.recipients),
      format: config.format,
      sections: JSON.stringify(config.sections),
      dateRange: config.dateRange ? JSON.stringify(config.dateRange) : null,
      createdBy: config.createdBy,
      nextRunAt,
    },
  });

  console.log(`[Reports] Scheduled report created: ${report.id}`);

  return {
    ...config,
    id: report.id,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    nextRunAt: report.nextRunAt || undefined,
  };
}

/**
 * Update an existing scheduled report
 *
 * @param reportId - Report ID
 * @param config - Partial report configuration to update
 * @returns Updated report config
 */
export async function updateScheduledReport(
  reportId: string,
  config: Partial<ReportConfig>
): Promise<ReportConfig> {
  console.log(`[Reports] Updating scheduled report: ${reportId}`);

  // Get existing report
  const existing = await prisma.scheduledReport.findUnique({
    where: { id: reportId },
  });

  if (!existing) {
    throw new Error(`Report ${reportId} not found`);
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {};

  if (config.name !== undefined) updateData.name = config.name;
  if (config.description !== undefined) updateData.description = config.description;
  if (config.enabled !== undefined) updateData.enabled = config.enabled;
  if (config.format !== undefined) updateData.format = config.format;

  if (config.schedule) {
    const cronExpression = generateCronExpression(config.schedule);
    if (!validateCronExpression(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }
    updateData.schedule = JSON.stringify(config.schedule);
    updateData.nextRunAt = calculateNextRunTime(config.schedule);
  }

  if (config.recipients) {
    updateData.recipients = JSON.stringify(config.recipients);
  }

  if (config.sections) {
    updateData.sections = JSON.stringify(config.sections);
  }

  if (config.dateRange) {
    updateData.dateRange = JSON.stringify(config.dateRange);
  }

  // Update in database
  const updated = await prisma.scheduledReport.update({
    where: { id: reportId },
    data: updateData,
  });

  console.log(`[Reports] Scheduled report updated: ${reportId}`);

  return parseReportRecord(updated);
}

/**
 * Delete a scheduled report (soft delete)
 *
 * @param reportId - Report ID
 */
export async function deleteScheduledReport(reportId: string): Promise<void> {
  console.log(`[Reports] Deleting scheduled report: ${reportId}`);

  await prisma.scheduledReport.update({
    where: { id: reportId },
    data: {
      enabled: false,
      deletedAt: new Date(),
    },
  });

  console.log(`[Reports] Scheduled report deleted: ${reportId}`);
}

/**
 * Get all scheduled reports for a tenant
 *
 * @param tenantId - Organization ID
 * @param includeDisabled - Include disabled reports
 * @returns Array of report configs
 */
export async function getScheduledReports(
  tenantId: string,
  includeDisabled: boolean = false
): Promise<ReportConfig[]> {
  const where: {
    tenantId: string;
    deletedAt: null;
    enabled?: boolean;
  } = {
    tenantId,
    deletedAt: null,
  };

  if (!includeDisabled) {
    where.enabled = true;
  }

  const reports = await prisma.scheduledReport.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return reports.map(parseReportRecord);
}

/**
 * Get a single scheduled report by ID
 *
 * @param reportId - Report ID
 * @returns Report config
 */
export async function getScheduledReport(reportId: string): Promise<ReportConfig> {
  const report = await prisma.scheduledReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error(`Report ${reportId} not found`);
  }

  return parseReportRecord(report);
}

// ============================================================================
// REPORT DELIVERY HISTORY
// ============================================================================

/**
 * Get report delivery history
 *
 * @param reportId - Report ID
 * @param limit - Maximum number of records to return
 * @returns Array of delivery records
 */
export async function getReportHistory(
  reportId: string,
  limit: number = 10
): Promise<ReportDelivery[]> {
  const deliveries = await (prisma as any).reportDelivery.findMany({
    where: { reportId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return deliveries.map((d) => ({
    id: d.id,
    reportId: d.reportId,
    tenantId: d.tenantId,
    status: d.status as 'pending' | 'processing' | 'sent' | 'failed',
    format: d.format as ReportFormat,
    recipients: JSON.parse(d.recipients || '[]'),
    deliveredAt: d.deliveredAt || undefined,
    errorMessage: d.errorMessage || undefined,
    downloadUrl: d.downloadUrl || undefined,
    fileSize: d.fileSize || undefined,
    createdAt: d.createdAt,
  }));
}

/**
 * Record a report delivery
 *
 * @param delivery - Delivery record
 * @returns Created delivery record
 */
export async function recordReportDelivery(
  delivery: Omit<ReportDelivery, 'id' | 'createdAt'>
): Promise<ReportDelivery> {
  const record = await (prisma as any).reportDelivery.create({
    data: {
      reportId: delivery.reportId,
      tenantId: delivery.tenantId,
      status: delivery.status,
      format: delivery.format,
      recipients: JSON.stringify(delivery.recipients),
      deliveredAt: delivery.deliveredAt,
      errorMessage: delivery.errorMessage,
      downloadUrl: delivery.downloadUrl,
      fileSize: delivery.fileSize,
    },
  });

  return {
    id: record.id,
    reportId: record.reportId,
    tenantId: record.tenantId,
    status: record.status as 'pending' | 'processing' | 'sent' | 'failed',
    format: record.format as ReportFormat,
    recipients: JSON.parse(record.recipients || '[]'),
    deliveredAt: record.deliveredAt || undefined,
    errorMessage: record.errorMessage || undefined,
    downloadUrl: record.downloadUrl || undefined,
    fileSize: record.fileSize || undefined,
    createdAt: record.createdAt,
  };
}

/**
 * Update report delivery status
 *
 * @param deliveryId - Delivery record ID
 * @param status - New status
 * @param data - Additional data to update
 */
export async function updateDeliveryStatus(
  deliveryId: string,
  status: 'pending' | 'processing' | 'sent' | 'failed',
  data?: {
    errorMessage?: string;
    downloadUrl?: string;
    fileSize?: number;
  }
): Promise<void> {
  await (prisma as any).reportDelivery.update({
    where: { id: deliveryId },
    data: {
      status,
      deliveredAt: status === 'sent' ? new Date() : undefined,
      errorMessage: data?.errorMessage,
      downloadUrl: data?.downloadUrl,
      fileSize: data?.fileSize,
    },
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate cron expression from schedule configuration
 */
function generateCronExpression(schedule: ReportSchedule): string {
  const { minute, hour } = schedule;

  switch (schedule.frequency) {
    case 'daily':
      return `${minute} ${hour} * * *`;

    case 'weekly': {
      const dayOfWeek = schedule.dayOfWeek || 1; // Default Monday
      return `${minute} ${hour} * * ${dayOfWeek}`;
    }

    case 'monthly': {
      const dayOfMonth = schedule.dayOfMonth || 1; // Default 1st
      return `${minute} ${hour} ${dayOfMonth} * *`;
    }

    case 'custom':
      if (!schedule.cronExpression) {
        throw new Error('Custom schedule requires cronExpression');
      }
      return schedule.cronExpression;

    default:
      throw new Error(`Unknown frequency: ${schedule.frequency}`);
  }
}

/**
 * Calculate next run time based on schedule
 *
 * Simplified calculation - returns a date in the near future.
 * In production, use a proper cron parser like 'cron-parser'.
 */
function calculateNextRunTime(schedule: ReportSchedule): Date {
  const now = new Date();
  const nextRun = new Date(now);

  nextRun.setHours(schedule.hour, schedule.minute, 0, 0);

  // If time has passed today, move to next occurrence
  if (nextRun <= now) {
    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      default:
        nextRun.setDate(nextRun.getDate() + 1);
    }
  }

  return nextRun;
}

/**
 * Parse database record to ReportConfig
 */
function parseReportRecord(record: {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  enabled: boolean;
  schedule: string;
  recipients: string;
  format: string;
  sections: string;
  dateRange: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
}): ReportConfig {
  return {
    id: record.id,
    tenantId: record.tenantId,
    name: record.name,
    description: record.description || undefined,
    enabled: record.enabled,
    schedule: JSON.parse(record.schedule),
    recipients: JSON.parse(record.recipients),
    format: record.format,
    sections: JSON.parse(record.sections),
    dateRange: record.dateRange ? JSON.parse(record.dateRange) : undefined,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastRunAt: record.lastRunAt || undefined,
    nextRunAt: record.nextRunAt || undefined,
  };
}

/**
 * Get reports due to run
 *
 * Used by the scheduler to find reports that need to be generated.
 *
 * @returns Array of report configs that should run now
 */
export async function getReportsDueToRun(): Promise<ReportConfig[]> {
  const now = new Date();

  const reports = await prisma.scheduledReport.findMany({
    where: {
      enabled: true,
      deletedAt: null,
      OR: [
        { nextRunAt: { lte: now } },
        { nextRunAt: null }, // Never run before
      ],
    },
  });

  return reports.map(parseReportRecord);
}

/**
 * Update report last run time
 *
 * @param reportId - Report ID
 */
export async function updateReportLastRun(reportId: string): Promise<void> {
  const report = await prisma.scheduledReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error(`Report ${reportId} not found`);
  }

  const schedule = JSON.parse((report as any).schedule) as ReportSchedule;
  const nextRunAt = calculateNextRunTime(schedule);

  await prisma.scheduledReport.update({
    where: { id: reportId },
    data: {
      lastRunAt: new Date(),
      nextRunAt,
    },
  });
}
