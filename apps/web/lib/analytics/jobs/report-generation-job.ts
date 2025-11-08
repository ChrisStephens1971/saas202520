/**
 * Report Generation Job
 * Sprint 10 Week 1 Day 4 - Background Report Processing
 *
 * Background job processor for generating and delivering scheduled reports.
 * Handles:
 * - Fetching analytics data
 * - Generating reports in requested format (CSV, Excel, PDF)
 * - Sending via email
 * - Logging delivery status
 *
 * Integrates with BullMQ queue system for reliable processing.
 */

import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { subDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter } from 'date-fns';
import type { ScheduledReportJobData } from './queue';
import * as ScheduledReportsService from '../services/scheduled-reports-service';
import * as AnalyticsService from '../services/analytics-service';
import * as ExportService from '../services/export-service';
import * as EmailService from '../services/email-service';

const prisma = new PrismaClient();

// ============================================================================
// JOB PROCESSOR
// ============================================================================

/**
 * Process a scheduled report job
 *
 * Main entry point for report generation background job.
 * Called by BullMQ worker when a scheduled-report job is dequeued.
 *
 * @param job - BullMQ job instance
 * @returns Success status
 */
export async function processReportJob(
  job: Job<ScheduledReportJobData>
): Promise<{ success: boolean; deliveryId?: string }> {
  const { reportId, tenantId, reportType: _reportType, recipients } = job.data;

  console.log(`[ReportJob] Processing report job: ${reportId}`);

  try {
    // Update job progress
    await job.updateProgress(10);

    // Get report configuration
    const reportConfig = await ScheduledReportsService.getScheduledReport(reportId);

    if (!reportConfig.enabled) {
      console.log(`[ReportJob] Report ${reportId} is disabled, skipping`);
      return { success: false };
    }

    await job.updateProgress(20);

    // Determine date range
    const dateRange = calculateDateRange(reportConfig.dateRange);

    console.log(
      `[ReportJob] Fetching analytics data for ${reportConfig.name} (${dateRange.start.toISOString()} - ${dateRange.end.toISOString()})`
    );

    await job.updateProgress(30);

    // Fetch analytics data based on sections
    const analyticsData = await fetchAnalyticsData(
      tenantId,
      reportConfig.sections,
      dateRange
    );

    await job.updateProgress(50);

    // Get organization name
    const organization = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const organizationName = organization?.name || 'Unknown Organization';

    // Generate report in requested format
    console.log(
      `[ReportJob] Generating ${reportConfig.format} report for ${reportConfig.name}`
    );

    let fileBuffer: Buffer | undefined;
    let filename: string | undefined;

    if (reportConfig.format === 'csv') {
      // Generate CSV
      const csvData = prepareCSVData(analyticsData);
      const csv = ExportService.exportToCSV(csvData, reportConfig.name);
      fileBuffer = Buffer.from(csv, 'utf-8');
      filename = ExportService.generateFilename('revenue', 'csv', tenantId);
    } else if (reportConfig.format === 'excel') {
      // Generate Excel
      const exportData = prepareExportData(
        analyticsData,
        organizationName,
        dateRange
      );
      fileBuffer = await ExportService.exportToExcel(exportData, reportConfig.name);
      filename = ExportService.generateFilename('revenue', 'excel', tenantId);
    } else if (reportConfig.format === 'pdf') {
      // Generate PDF
      const exportData = prepareExportData(
        analyticsData,
        organizationName,
        dateRange
      );
      const pdfBlob = await ExportService.exportToPDF(exportData, {
        title: reportConfig.name,
        subtitle: `${organizationName} - Analytics Report`,
      });
      fileBuffer = Buffer.from(await pdfBlob.arrayBuffer());
      filename = ExportService.generateFilename('revenue', 'pdf', tenantId);
    }

    await job.updateProgress(70);

    // Create delivery record
    const delivery = await ScheduledReportsService.recordReportDelivery({
      reportId,
      tenantId,
      status: 'processing',
      format: reportConfig.format,
      recipients: reportConfig.recipients.to,
      fileSize: fileBuffer?.length,
    });

    await job.updateProgress(80);

    // Send email
    console.log(
      `[ReportJob] Sending report email to ${reportConfig.recipients.to.length} recipients`
    );

    const reportEmailData: EmailService.ReportEmailData = {
      organizationName,
      reportName: reportConfig.name,
      reportFormat: reportConfig.format,
      dateRange,
      fileBuffer,
      filename,
      summary: {
        mrr: analyticsData.revenue?.current?.mrr,
        totalRevenue: analyticsData.revenue?.current?.totalRevenue,
        activeUsers: analyticsData.users?.summary?.active,
        totalTournaments: analyticsData.tournaments?.summary?.total,
      },
    };

    await EmailService.sendReportEmail(reportConfig.recipients.to, reportEmailData);

    await job.updateProgress(90);

    // Update delivery status to sent
    await ScheduledReportsService.updateDeliveryStatus(delivery.id, 'sent');

    // Update report last run time
    await ScheduledReportsService.updateReportLastRun(reportId);

    await job.updateProgress(100);

    console.log(`[ReportJob] Report job completed successfully: ${reportId}`);

    return { success: true, deliveryId: delivery.id };
  } catch (error) {
    console.error(`[ReportJob] Report job failed: ${reportId}`, error);

    // Record failure
    try {
      const delivery = await ScheduledReportsService.recordReportDelivery({
        reportId,
        tenantId,
        status: 'failed',
        format: 'pdf', // Default
        recipients: recipients || [],
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      await ScheduledReportsService.updateDeliveryStatus(delivery.id, 'failed', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (recordError) {
      console.error('[ReportJob] Failed to record delivery failure:', recordError);
    }

    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate date range based on report configuration
 */
function calculateDateRange(
  dateRangeConfig?: {
    type: 'last7days' | 'last30days' | 'lastMonth' | 'lastQuarter' | 'custom';
    customStart?: Date;
    customEnd?: Date;
  }
): { start: Date; end: Date } {
  const now = new Date();

  if (!dateRangeConfig || dateRangeConfig.type === 'last30days') {
    return {
      start: subDays(now, 30),
      end: now,
    };
  }

  switch (dateRangeConfig.type) {
    case 'last7days':
      return {
        start: subDays(now, 7),
        end: now,
      };

    case 'lastMonth': {
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    }

    case 'lastQuarter': {
      const lastQuarter = subMonths(now, 3);
      return {
        start: startOfQuarter(lastQuarter),
        end: endOfQuarter(lastQuarter),
      };
    }

    case 'custom':
      if (!dateRangeConfig.customStart || !dateRangeConfig.customEnd) {
        throw new Error('Custom date range requires customStart and customEnd');
      }
      return {
        start: dateRangeConfig.customStart,
        end: dateRangeConfig.customEnd,
      };

    default:
      return {
        start: subDays(now, 30),
        end: now,
      };
  }
}

/**
 * Fetch analytics data based on report sections
 */
async function fetchAnalyticsData(
  tenantId: string,
  sections: ScheduledReportsService.ReportSections,
  dateRange: { start: Date; end: Date }
): Promise<{
  revenue?: AnalyticsService.RevenueAnalytics;
  users?: any;
  cohorts?: AnalyticsService.CohortAnalytics;
  tournaments?: AnalyticsService.TournamentAnalytics;
}> {
  const data: any = {};

  const promises: Promise<void>[] = [];

  if (sections.revenue) {
    promises.push(
      AnalyticsService.getRevenueAnalytics(tenantId, {
        startDate: dateRange.end,
        includeComparison: true,
      }).then((result) => {
        data.revenue = result;
      })
    );
  }

  if (sections.cohorts) {
    promises.push(
      AnalyticsService.getCohortAnalytics(tenantId, {
        includeComparison: true,
      }).then((result) => {
        data.cohorts = result;
      })
    );
  }

  if (sections.tournaments) {
    promises.push(
      AnalyticsService.getTournamentAnalytics(tenantId, {
        startDate: dateRange.end,
        includeComparison: true,
      }).then((result) => {
        data.tournaments = result;
      })
    );
  }

  if (sections.users || sections.summary) {
    // User data is part of cohorts
    if (!sections.cohorts) {
      promises.push(
        AnalyticsService.getCohortAnalytics(tenantId).then((result) => {
          data.users = {
            summary: {
              total: result.cohorts[0]?.cohortSize || 0,
              active: Math.round(
                (result.cohorts[0]?.cohortSize || 0) *
                  ((result.cohorts[0]?.metrics.month1Retention || 0) / 100)
              ),
              new: result.cohorts[0]?.cohortSize || 0,
              churn: 100 - (result.cohorts[0]?.metrics.month1Retention || 0),
            },
          };
        })
      );
    } else {
      // Will be extracted from cohorts data
      data.users = {};
    }
  }

  await Promise.all(promises);

  // If users data not populated but cohorts available, extract it
  if (sections.users && !data.users?.summary && data.cohorts) {
    const latestCohort = data.cohorts.cohorts[0];
    if (latestCohort) {
      data.users = {
        summary: {
          total: latestCohort.cohortSize,
          active: Math.round(
            latestCohort.cohortSize * (latestCohort.metrics.month1Retention / 100)
          ),
          new: latestCohort.cohortSize,
          churn: 100 - latestCohort.metrics.month1Retention,
        },
      };
    }
  }

  return data;
}

/**
 * Prepare data for CSV export
 */
function prepareCSVData(analyticsData: any): any[] {
  const rows: any[] = [];

  // Revenue data
  if (analyticsData.revenue?.breakdown) {
    for (const item of analyticsData.revenue.breakdown) {
      rows.push({
        Type: 'Revenue',
        Date: item.date,
        Category: item.type,
        Source: item.source,
        Amount: item.amount,
      });
    }
  }

  // Tournament data
  if (analyticsData.tournaments?.details) {
    for (const tournament of analyticsData.tournaments.details) {
      rows.push({
        Type: 'Tournament',
        Date: tournament.date,
        Format: tournament.format,
        Players: tournament.players,
        Revenue: tournament.revenue,
        Status: tournament.status,
      });
    }
  }

  // User cohorts
  if (analyticsData.cohorts?.cohorts) {
    for (const cohort of analyticsData.cohorts.cohorts) {
      rows.push({
        Type: 'User Cohort',
        Cohort: cohort.cohort,
        Size: cohort.cohortSize,
        'Retention Rate': cohort.metrics.month1Retention,
        Revenue: cohort.revenue.ltv,
      });
    }
  }

  return rows;
}

/**
 * Prepare data for Excel/PDF export
 */
function prepareExportData(
  analyticsData: any,
  organizationName: string,
  dateRange: { start: Date; end: Date }
): ExportService.AnalyticsExportData {
  return {
    tenantId: analyticsData.revenue?.current?.tenantId || 'unknown',
    organizationName,
    dateRange,
    revenue: {
      summary: {
        mrr: analyticsData.revenue?.current?.mrr || 0,
        arr: analyticsData.revenue?.current?.arr || 0,
        totalRevenue: analyticsData.revenue?.current?.totalRevenue || 0,
        growth: analyticsData.revenue?.growth?.revenueGrowth || 0,
      },
      breakdown: analyticsData.revenue?.breakdown?.bySource || [],
    },
    users: {
      summary: {
        total: analyticsData.users?.summary?.total || 0,
        active: analyticsData.users?.summary?.active || 0,
        new: analyticsData.users?.summary?.new || 0,
        churn: analyticsData.users?.summary?.churn || 0,
      },
      cohorts:
        analyticsData.cohorts?.cohorts?.map((c: any) => ({
          cohort: c.cohort,
          size: c.cohortSize,
          retention: c.metrics.month1Retention,
          revenue: c.revenue.ltv,
        })) || [],
    },
    tournaments: {
      summary: {
        total: analyticsData.tournaments?.metrics?.totalTournaments || 0,
        completed: analyticsData.tournaments?.metrics?.completedTournaments || 0,
        completionRate: analyticsData.tournaments?.metrics?.completionRate || 0,
        avgPlayers: analyticsData.tournaments?.metrics?.avgPlayers || 0,
      },
      details: [], // Would need to fetch from database if needed
    },
  };
}

/**
 * Schedule reports due to run
 *
 * Called by the scheduler to check for and queue reports that should run now.
 * This function is triggered by cron on a regular schedule (e.g., every hour).
 */
export async function scheduleReports(): Promise<void> {
  console.log('[ReportJob] Checking for reports due to run...');

  try {
    const reportsDue = await ScheduledReportsService.getReportsDueToRun();

    console.log(`[ReportJob] Found ${reportsDue.length} reports due to run`);

    for (const report of reportsDue) {
      console.log(`[ReportJob] Queueing report: ${report.name} (${report.id})`);

      // Queue the report job
      const { addJob } = await import('./queue');

      await addJob('scheduled-report', {
        reportId: report.id!,
        tenantId: report.tenantId,
        reportType: 'scheduled',
        recipients: report.recipients.to,
      });
    }

    console.log('[ReportJob] Report scheduling complete');
  } catch (error) {
    console.error('[ReportJob] Error scheduling reports:', error);
    throw error;
  }
}
