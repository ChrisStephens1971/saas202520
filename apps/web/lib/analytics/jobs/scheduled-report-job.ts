/**
 * Scheduled Report Job
 * Sprint 10 Week 1 - Background Jobs
 *
 * BullMQ job processor for generating and delivering scheduled reports.
 * Handles recurring reports (daily, weekly, monthly) sent via email.
 */

import { Job } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { ScheduledReportJobData } from './queue';
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  generateFilename,
  type AnalyticsExportData,
} from '../services/export-service';
import { format } from 'date-fns';

/**
 * Process a scheduled report job
 *
 * Generates reports on a recurring schedule and delivers them via email.
 * Supports daily, weekly, and monthly reports.
 *
 * @param job - BullMQ job instance
 * @returns Job result with delivery information
 */
export async function processScheduledReportJob(
  job: Job<ScheduledReportJobData>
): Promise<{
  success: boolean;
  reportId: string;
  recipients: string[];
  deliveryMethod: string;
  error?: string;
}> {
  const { reportId, tenantId, reportType, recipients, parameters } = job.data;

  console.log(`[ScheduledReportJob] Starting job ${job.id}`, {
    reportId,
    tenantId,
    reportType,
    recipients,
  });

  // Update job progress
  await job.updateProgress(0);

  try {
    // Step 1: Fetch scheduled report configuration (10% progress)
    console.log('[ScheduledReportJob] Fetching report configuration...');
    const report = await prisma.scheduledReport.findUnique({
      where: { id: reportId },
      include: {
        tenant: {
          select: { name: true },
        },
      },
    });

    if (!report) {
      throw new Error(`Scheduled report ${reportId} not found`);
    }

    if (report.tenantId !== tenantId) {
      throw new Error(`Report ${reportId} does not belong to tenant ${tenantId}`);
    }

    if (!report.isActive) {
      console.log(`[ScheduledReportJob] Report ${reportId} is disabled, skipping`);
      return {
        success: true,
        reportId,
        recipients,
        deliveryMethod: 'skipped',
      };
    }

    await job.updateProgress(10);

    // Step 2: Determine date range based on schedule (20% progress)
    console.log('[ScheduledReportJob] Calculating date range...');
    const dateRange = calculateDateRange(report.frequency);

    await job.updateProgress(20);

    // Step 3: Fetch analytics data (50% progress)
    console.log('[ScheduledReportJob] Fetching analytics data...');
    const analyticsData = await fetchAnalyticsDataForReport(
      tenantId,
      reportType,
      dateRange.start,
      dateRange.end,
      report.tenant.name
    );

    await job.updateProgress(50);

    // Step 4: Generate report file (70% progress)
    console.log('[ScheduledReportJob] Generating report file...');
    const format = (parameters?.format as 'csv' | 'excel' | 'pdf') || 'pdf'; // Default to PDF
    const filename = generateFilename(reportType as any, format, tenantId);

    let reportFile: Buffer | string;
    let mimeType: string;

    switch (format) {
      case 'csv':
        const csvData = convertToCSVFormat(analyticsData, reportType);
        reportFile = exportToCSV(csvData, filename);
        mimeType = 'text/csv';
        break;

      case 'excel':
        reportFile = await exportToExcel(analyticsData, filename);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;

      case 'pdf':
        const pdfBlob = await exportToPDF(analyticsData, {
          tenantId,
          dateRange,
          title: `${reportType.toUpperCase()} Report`,
          subtitle: `${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`,
        });
        reportFile = Buffer.from(await pdfBlob.arrayBuffer());
        mimeType = 'application/pdf';
        break;

      default:
        throw new Error(`Unknown format: ${format}`);
    }

    await job.updateProgress(70);

    // Step 5: Send report via email (90% progress)
    console.log('[ScheduledReportJob] Sending report via email...');
    await sendReportEmail({
      recipients,
      subject: `${reportType.toUpperCase()} Report - ${format(dateRange.start, 'MMM dd, yyyy')}`,
      body: generateEmailBody(reportType, dateRange, analyticsData),
      attachment: {
        filename,
        content: reportFile,
        mimeType,
      },
      organizationName: report.tenant.name,
    });

    await job.updateProgress(90);

    // Step 6: Update report execution record (100% progress)
    console.log('[ScheduledReportJob] Creating execution record...');
    // TODO: Add ReportExecution model to prisma/schema.prisma
    // Model should include: reportId, executedAt, status, recipientCount, fileSize, metadata
    // await prisma.reportExecution.create({
    //   data: {
    //     reportId,
    //     executedAt: new Date(),
    //     status: 'completed',
    //     recipientCount: recipients.length,
    //     fileSize: Buffer.isBuffer(reportFile) ? reportFile.length : Buffer.byteLength(reportFile),
    //     metadata: {
    //       jobId: job.id,
    //       dateRange: {
    //         start: dateRange.start.toISOString(),
    //         end: dateRange.end.toISOString(),
    //       },
    //       format,
    //     } as any,
    //   },
    // });
    console.log('[ScheduledReportJob] Report execution record skipped (model not yet in schema)');

    await job.updateProgress(100);

    const result = {
      success: true,
      reportId,
      recipients,
      deliveryMethod: 'email',
    };

    console.log(`[ScheduledReportJob] Job ${job.id} completed`, result);

    return result;
  } catch (error) {
    console.error(`[ScheduledReportJob] Job ${job.id} failed:`, error);

    // Create failed execution record
    // TODO: Uncomment when ReportExecution model is added to schema
    // try {
    //   await prisma.reportExecution.create({
    //     data: {
    //       reportId,
    //       executedAt: new Date(),
    //       status: 'failed',
    //       recipientCount: recipients.length,
    //       fileSize: 0,
    //       metadata: {
    //         jobId: job.id,
    //         error: error instanceof Error ? error.message : 'Unknown error',
    //       } as any,
    //     },
    //   });
    // } catch (dbError) {
    //   console.error('[ScheduledReportJob] Failed to create error record:', dbError);
    // }
    console.log('[ScheduledReportJob] Failed execution record creation skipped (model not yet in schema)');

    // Re-throw to mark job as failed in BullMQ
    throw error;
  }
}

/**
 * Calculate date range based on schedule
 */
function calculateDateRange(schedule: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;

  switch (schedule) {
    case 'daily':
      // Yesterday
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      break;

    case 'weekly':
      // Last 7 days
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      break;

    case 'monthly':
      // Last 30 days
      start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0, 0);
      break;

    default:
      // Default to last 7 days
      console.warn(`[ScheduledReportJob] Unknown schedule: ${schedule}, defaulting to weekly`);
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
  }

  return { start, end };
}

/**
 * Fetch analytics data for report
 */
async function fetchAnalyticsDataForReport(
  tenantId: string,
  reportType: string,
  startDate: Date,
  endDate: Date,
  organizationName: string
): Promise<AnalyticsExportData> {
  console.log(`[ScheduledReportJob] Fetching ${reportType} data for ${tenantId}`);

  // Revenue data
  const revenueData = await prisma.revenueAggregate.findMany({
    where: {
      tenantId,
      periodStart: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      periodStart: 'asc',
    },
  });

  const revenueSummary = revenueData.reduce(
    (acc, item) => ({
      mrr: acc.mrr + Number(item.mrr || 0),
      arr: acc.arr + Number(item.arr || 0),
      totalRevenue: acc.totalRevenue + Number(item.totalRevenue || 0),
      growth: 0, // growthRate doesn't exist in schema
    }),
    { mrr: 0, arr: 0, totalRevenue: 0, growth: 0 }
  );

  // Users/Cohort data
  const cohortData = await prisma.userCohort.findMany({
    where: {
      tenantId,
      cohortMonth: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      cohortMonth: 'asc',
    },
  });

  const usersSummary = cohortData.reduce(
    (acc, cohort) => ({
      total: acc.total + cohort.cohortSize,
      active: acc.active + cohort.retainedUsers,
      new: acc.new + cohort.cohortSize,
      churn: 0, // churnRate doesn't exist in UserCohort schema
    }),
    { total: 0, active: 0, new: 0, churn: 0 }
  );

  // Tournament data
  const tournamentData = await prisma.tournamentAggregate.findMany({
    where: {
      tenantId,
      periodStart: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      periodStart: 'asc',
    },
  });

  const tournamentSummary = tournamentData.reduce(
    (acc, item) => ({
      total: acc.total + (item.tournamentCount || 0),
      completed: acc.completed + (item.completedCount || 0),
      completionRate: Number(item.completionRate || 0),
      avgPlayers: (acc.avgPlayers + Number(item.avgPlayers || 0)) / 2,
    }),
    { total: 0, completed: 0, completionRate: 0, avgPlayers: 0 }
  );

  return {
    tenantId,
    organizationName,
    dateRange: {
      start: startDate,
      end: endDate,
    },
    revenue: {
      summary: revenueSummary,
      breakdown: revenueData.map((item) => ({
        date: item.periodStart,
        amount: Number(item.totalRevenue || 0),
        type: item.periodType,
        source: 'tournaments',
      })),
    },
    users: {
      summary: usersSummary,
      cohorts: cohortData.map((cohort) => ({
        cohort: cohort.cohortMonth,
        size: cohort.cohortSize,
        retention: Number(cohort.retentionRate || 0),
        revenue: Number(cohort.revenue || 0),
      })),
    },
    tournaments: {
      summary: tournamentSummary,
      details: tournamentData.map((item) => ({
        date: item.periodStart,
        format: 'mixed',
        players: item.totalPlayers || 0,
        revenue: Number(item.revenue || 0),
        status: 'completed',
      })),
    },
  };
}

/**
 * Convert analytics data to flat CSV format
 */
function convertToCSVFormat(
  data: AnalyticsExportData,
  reportType: string
): Record<string, unknown>[] {
  switch (reportType) {
    case 'revenue':
      return data.revenue.breakdown.map((item) => ({
        Date: format(item.date, 'yyyy-MM-dd'),
        Amount: item.amount,
        Type: item.type,
        Source: item.source,
      }));

    case 'users':
      return data.users.cohorts.map((cohort) => ({
        Cohort: format(cohort.cohort, 'MMM yyyy'),
        Size: cohort.size,
        'Retention Rate': `${cohort.retention.toFixed(1)}%`,
        Revenue: cohort.revenue,
      }));

    case 'tournaments':
      return data.tournaments.details.map((tournament) => ({
        Date: format(tournament.date, 'yyyy-MM-dd'),
        Format: tournament.format,
        Players: tournament.players,
        Revenue: tournament.revenue,
        Status: tournament.status,
      }));

    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

/**
 * Generate email body for report
 */
function generateEmailBody(
  reportType: string,
  dateRange: { start: Date; end: Date },
  data: AnalyticsExportData
): string {
  const periodText = `${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;

  let summary = '';

  switch (reportType) {
    case 'revenue':
      summary = `
Total Revenue: $${data.revenue.summary.totalRevenue.toLocaleString()}
MRR: $${data.revenue.summary.mrr.toLocaleString()}
ARR: $${data.revenue.summary.arr.toLocaleString()}
Growth Rate: ${data.revenue.summary.growth.toFixed(1)}%
      `;
      break;

    case 'users':
      summary = `
Total Users: ${data.users.summary.total.toLocaleString()}
Active Users: ${data.users.summary.active.toLocaleString()}
New Users: ${data.users.summary.new.toLocaleString()}
Churn Rate: ${data.users.summary.churn.toFixed(1)}%
      `;
      break;

    case 'tournaments':
      summary = `
Total Tournaments: ${data.tournaments.summary.total.toLocaleString()}
Completed: ${data.tournaments.summary.completed.toLocaleString()}
Completion Rate: ${data.tournaments.summary.completionRate.toFixed(1)}%
Avg Players: ${data.tournaments.summary.avgPlayers.toFixed(1)}
      `;
      break;
  }

  return `
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #333;">${reportType.toUpperCase()} Report</h1>
  <p style="color: #666; font-size: 14px;">${data.organizationName}</p>
  <p style="color: #666; font-size: 14px;">Period: ${periodText}</p>

  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h2 style="color: #333; margin-top: 0;">Summary</h2>
    <pre style="font-family: monospace; font-size: 13px; color: #333;">${summary}</pre>
  </div>

  <p style="color: #666; font-size: 14px;">
    The complete report is attached to this email.
  </p>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">
    This is an automated report from your Tournament Analytics platform.
  </p>
</body>
</html>
  `.trim();
}

/**
 * Send report via email
 */
async function sendReportEmail(params: {
  recipients: string[];
  subject: string;
  body: string;
  attachment: {
    filename: string;
    content: Buffer | string;
    mimeType: string;
  };
  organizationName: string;
}): Promise<void> {
  // TODO: Production implementation
  // - Integrate with email service (SendGrid, AWS SES, etc.)
  // - Use email templates
  // - Track email delivery status
  // - Handle bounces and complaints
  //
  // Example with SendGrid:
  // import sgMail from '@sendgrid/mail';
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  //
  // const msg = {
  //   to: params.recipients,
  //   from: 'reports@tournamentanalytics.com',
  //   subject: params.subject,
  //   html: params.body,
  //   attachments: [{
  //     content: Buffer.from(params.attachment.content).toString('base64'),
  //     filename: params.attachment.filename,
  //     type: params.attachment.mimeType,
  //     disposition: 'attachment',
  //   }],
  // };
  //
  // await sgMail.send(msg);

  console.log(
    `[ScheduledReportJob] Sending email to ${params.recipients.length} recipients:`,
    params.recipients
  );
  console.log(`[ScheduledReportJob] Subject: ${params.subject}`);
  console.log(
    `[ScheduledReportJob] Attachment: ${params.attachment.filename} (${
      Buffer.isBuffer(params.attachment.content)
        ? params.attachment.content.length
        : params.attachment.content.length
    } bytes)`
  );

  // For development: Log the email instead of sending
  console.log('[ScheduledReportJob] Email body (truncated):', params.body.substring(0, 200));
  console.log('[ScheduledReportJob] Email sent successfully (simulated)');
}

/**
 * Job processor with timing wrapper
 */
export function withTiming<T extends (...args: unknown[]) => Promise<unknown>>(
  processor: T
): T {
  return (async (...args: unknown[]) => {
    const startTime = Date.now();
    try {
      const result = await processor(...args);
      const duration = Date.now() - startTime;
      console.log(`[ScheduledReportJob] Completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[ScheduledReportJob] Failed after ${duration}ms`);
      throw error;
    }
  }) as T;
}

/**
 * Scheduled report job processor with timing
 */
export const timedScheduledReportProcessor = withTiming(processScheduledReportJob);

/**
 * Retry configuration for failed report jobs
 */
export const RETRY_CONFIG = {
  maxAttempts: 3,
  backoffDelay: 5000, // 5 seconds
  backoffType: 'exponential' as const,
};

/**
 * Job priorities
 */
export const JOB_PRIORITY = {
  HIGH: 1, // Immediate/manual execution
  NORMAL: 5, // Scheduled reports
  LOW: 10, // Background/maintenance
} as const;
