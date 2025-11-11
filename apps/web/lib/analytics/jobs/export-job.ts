/**
 * Analytics Export Job
 * Sprint 10 Week 1 - Background Jobs
 *
 * BullMQ job processor for exporting analytics data.
 * Handles CSV, Excel, and PDF export generation with progress tracking.
 */

import { Job } from 'bullmq';
import { prisma } from '@/lib/prisma';
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  generateFilename,
  type AnalyticsExportData,
  type ExportJobOptions,
} from '../services/export-service';
import { ExportJobData } from './queue';
import { format } from 'date-fns';

/**
 * Process an export job
 *
 * Handles different export formats:
 * - csv: Lightweight CSV export
 * - excel: Rich Excel workbook with multiple sheets
 * - pdf: Professional PDF report
 *
 * @param job - BullMQ job instance
 * @returns Job result with download information
 */
export async function processExportJob(
  job: Job<ExportJobData>
): Promise<{
  success: boolean;
  format: string;
  filename: string;
  size?: number;
  downloadUrl?: string;
  error?: string;
}> {
  const { tenantId, exportType, format: exportFormat, dateRange, userId } = job.data;

  console.log(`[ExportJob] Starting job ${job.id}`, {
    tenantId,
    exportType,
    format: exportFormat,
    dateRange,
    userId,
  });

  // Update job progress
  await job.updateProgress(0);

  try {
    // Step 1: Fetch organization name (10% progress)
    console.log('[ExportJob] Fetching organization info...');
    const organization = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    if (!organization) {
      throw new Error(`Organization ${tenantId} not found`);
    }

    await job.updateProgress(10);

    // Step 2: Fetch analytics data (40% progress)
    console.log('[ExportJob] Fetching analytics data...');
    const analyticsData = await fetchAnalyticsData(
      tenantId,
      exportType,
      new Date(dateRange.start),
      new Date(dateRange.end)
    );

    const data: AnalyticsExportData = {
      tenantId,
      organizationName: organization.name,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end),
      },
      ...analyticsData,
    };

    await job.updateProgress(50);

    // Step 3: Generate export file (80% progress)
    console.log(`[ExportJob] Generating ${exportFormat} export...`);
    const filename = generateFilename(exportType, exportFormat, tenantId);
    let fileBuffer: Buffer | string;
    let fileSize = 0;

    switch (exportFormat) {
      case 'csv':
        // For CSV, convert analytics data to flat array format
        const csvData = convertToCSVFormat(data, exportType);
        fileBuffer = exportToCSV(csvData, filename);
        fileSize = Buffer.byteLength(fileBuffer, 'utf8');
        break;

      case 'excel':
        fileBuffer = await exportToExcel(data, filename);
        fileSize = fileBuffer.length;
        break;

      case 'pdf':
        const pdfBlob = await exportToPDF(data);
        fileBuffer = Buffer.from(await pdfBlob.arrayBuffer());
        fileSize = fileBuffer.length;
        break;

      default:
        throw new Error(`Unknown export format: ${exportFormat}`);
    }

    await job.updateProgress(80);

    // Step 4: Store export file (90% progress)
    console.log('[ExportJob] Storing export file...');

    // TODO: Upload to S3/Azure Blob Storage for production
    // For now, we'll store file path in local temp directory or return base64
    const downloadUrl = await storeExportFile(fileBuffer, filename, tenantId);

    await job.updateProgress(90);

    // Step 5: Create export record in database (100% progress)
    console.log('[ExportJob] Creating export record...');
    // TODO: Add AnalyticsExport model to prisma/schema.prisma
    // Model should include: orgId, userId, exportType, format, filename, fileSize, status, downloadUrl, dateRange, metadata
    // await prisma.analyticsExport.create({
    //   data: {
    //     orgId: tenantId,
    //     userId,
    //     exportType,
    //     format: exportFormat,
    //     filename,
    //     fileSize,
    //     status: 'completed',
    //     downloadUrl,
    //     dateRange: {
    //       start: dateRange.start,
    //       end: dateRange.end,
    //     } as any,
    //     metadata: {
    //       jobId: job.id,
    //       generatedAt: new Date().toISOString(),
    //     } as any,
    //   },
    // });
    console.log('[ExportJob] Export record creation skipped (model not yet in schema)');

    await job.updateProgress(100);

    const result = {
      success: true,
      format: exportFormat,
      filename,
      size: fileSize,
      downloadUrl,
    };

    console.log(`[ExportJob] Job ${job.id} completed`, result);

    return result;
  } catch (error) {
    console.error(`[ExportJob] Job ${job.id} failed:`, error);

    // Create failed export record
    // TODO: Uncomment when AnalyticsExport model is added to schema
    // try {
    //   await prisma.analyticsExport.create({
    //     data: {
    //       orgId: tenantId,
    //       userId,
    //       exportType,
    //       format: exportFormat,
    //       filename: generateFilename(exportType, exportFormat, tenantId),
    //       fileSize: 0,
    //       status: 'failed',
    //       dateRange: {
    //         start: dateRange.start,
    //         end: dateRange.end,
    //       } as any,
    //       metadata: {
    //         jobId: job.id,
    //         error: error instanceof Error ? error.message : 'Unknown error',
    //       } as any,
    //     },
    //   });
    // } catch (dbError) {
    //   console.error('[ExportJob] Failed to create error record:', dbError);
    // }
    console.log('[ExportJob] Failed export record creation skipped (model not yet in schema)');

    // Re-throw to mark job as failed in BullMQ
    throw error;
  }
}

/**
 * Fetch analytics data for export
 */
async function fetchAnalyticsData(
  tenantId: string,
  exportType: 'revenue' | 'tournaments' | 'users',
  startDate: Date,
  endDate: Date
): Promise<Pick<AnalyticsExportData, 'revenue' | 'users' | 'tournaments'>> {
  console.log(`[ExportJob] Fetching ${exportType} data for ${tenantId}`);

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
  exportType: 'revenue' | 'tournaments' | 'users'
): Record<string, unknown>[] {
  switch (exportType) {
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
      throw new Error(`Unknown export type: ${exportType}`);
  }
}

/**
 * Store export file (placeholder for production storage)
 */
async function storeExportFile(
  fileBuffer: Buffer | string,
  filename: string,
  tenantId: string
): Promise<string> {
  // TODO: Production implementation
  // - Upload to S3/Azure Blob Storage
  // - Generate pre-signed URL for download
  // - Set expiration (e.g., 7 days)
  //
  // Example with AWS S3:
  // const s3 = new S3Client({ region: 'us-east-1' });
  // await s3.send(new PutObjectCommand({
  //   Bucket: 'exports',
  //   Key: `${tenantId}/${filename}`,
  //   Body: fileBuffer,
  //   ContentType: getMimeType(filename),
  // }));
  // const url = await getSignedUrl(s3, new GetObjectCommand({
  //   Bucket: 'exports',
  //   Key: `${tenantId}/${filename}`,
  // }), { expiresIn: 604800 }); // 7 days

  console.log(
    `[ExportJob] Storing file: ${filename} (${Buffer.isBuffer(fileBuffer) ? fileBuffer.length : fileBuffer.length} bytes)`
  );

  // For development: Return base64 data URL (not recommended for production)
  // In production, this should be replaced with actual cloud storage URL
  if (Buffer.isBuffer(fileBuffer)) {
    const base64 = fileBuffer.toString('base64');
    const mimeType = getMimeType(filename);
    return `data:${mimeType};base64,${base64}`;
  } else {
    // CSV string
    const base64 = Buffer.from(fileBuffer).toString('base64');
    return `data:text/csv;base64,${base64}`;
  }
}

/**
 * Get MIME type for file
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'csv':
      return 'text/csv';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
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
      console.log(`[ExportJob] Completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[ExportJob] Failed after ${duration}ms`);
      throw error;
    }
  }) as T;
}

/**
 * Export job processor with timing
 */
export const timedExportProcessor = withTiming(processExportJob);

/**
 * Retry configuration for failed export jobs
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
  HIGH: 1, // User-requested, immediate
  NORMAL: 5, // User-requested, scheduled
  LOW: 10, // Background, automated
} as const;
