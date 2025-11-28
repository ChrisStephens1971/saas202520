/**
 * Day 4 Usage Examples
 * Sprint 10 Week 1 Day 4 - Export, Predictions, and Scheduled Reports
 *
 * Complete examples demonstrating all Day 4 functionality:
 * - Export Service (CSV, Excel, PDF)
 * - Predictive Models (Revenue & User Growth Forecasting)
 * - Scheduled Reports (Configuration & Delivery)
 * - Email Service (Report Delivery)
 *
 * Run these examples to test the implementation.
 */

import { subDays, startOfMonth } from 'date-fns';

// Import services
import * as ExportService from './export-service';
import * as PredictiveModels from './predictive-models';
import * as ScheduledReportsService from './scheduled-reports-service';
import * as EmailService from './email-service';

// ============================================================================
// EXAMPLE 1: EXPORT ANALYTICS DATA
// ============================================================================

/**
 * Example: Export revenue data to CSV
 */
export async function example1_ExportToCSV() {
  console.log('\n=== Example 1: Export to CSV ===\n');

  // Sample data
  const revenueData = [
    { date: '2025-01-01', amount: 5000, type: 'Subscription', source: 'Stripe' },
    { date: '2025-01-02', amount: 3000, type: 'Subscription', source: 'Stripe' },
    { date: '2025-01-03', amount: 1500, type: 'One-time', source: 'PayPal' },
    { date: '2025-01-04', amount: 4500, type: 'Subscription', source: 'Stripe' },
    { date: '2025-01-05', amount: 2000, type: 'Subscription', source: 'Stripe' },
  ];

  // Export to CSV
  const csv = ExportService.exportToCSV(revenueData, 'revenue-export', {
    tenantId: 'tenant-001',
    dateRange: {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-05'),
    },
    customHeaders: {
      date: 'Date',
      amount: 'Amount (USD)',
      type: 'Payment Type',
      source: 'Payment Source',
    },
  });

  console.log('CSV Output (first 500 chars):');
  console.log(csv.substring(0, 500));
  console.log('\n✓ CSV export successful\n');

  return csv;
}

/**
 * Example: Export analytics to Excel
 */
export async function example2_ExportToExcel() {
  console.log('\n=== Example 2: Export to Excel ===\n');

  // Prepare export data
  const exportData: ExportService.AnalyticsExportData = {
    tenantId: 'tenant-001',
    organizationName: 'Demo Tournament Organization',
    dateRange: {
      start: subDays(new Date(), 30),
      end: new Date(),
    },
    revenue: {
      summary: {
        mrr: 15000,
        arr: 180000,
        totalRevenue: 45000,
        growth: 12.5,
      },
      breakdown: [
        {
          date: new Date('2025-01-01'),
          amount: 5000,
          type: 'Subscription',
          source: 'Stripe',
        },
        {
          date: new Date('2025-01-02'),
          amount: 3000,
          type: 'Subscription',
          source: 'Stripe',
        },
        {
          date: new Date('2025-01-03'),
          amount: 1500,
          type: 'One-time',
          source: 'PayPal',
        },
      ],
    },
    users: {
      summary: {
        total: 500,
        active: 350,
        new: 50,
        churn: 30,
      },
      cohorts: [
        {
          cohort: startOfMonth(new Date()),
          size: 50,
          retention: 70,
          revenue: 5000,
        },
        {
          cohort: startOfMonth(subDays(new Date(), 30)),
          size: 45,
          retention: 65,
          revenue: 4500,
        },
      ],
    },
    tournaments: {
      summary: {
        total: 25,
        completed: 20,
        completionRate: 80,
        avgPlayers: 16,
      },
      details: [
        {
          date: new Date('2025-01-10'),
          format: 'Standard',
          players: 16,
          revenue: 320,
          status: 'Completed',
        },
        {
          date: new Date('2025-01-11'),
          format: 'Commander',
          players: 12,
          revenue: 240,
          status: 'Completed',
        },
      ],
    },
  };

  // Export to Excel
  const buffer = await ExportService.exportToExcel(exportData, 'analytics-report');

  console.log(`✓ Excel export successful (${buffer.length} bytes)\n`);

  return buffer;
}

/**
 * Example: Export analytics to PDF
 */
export async function example3_ExportToPDF() {
  console.log('\n=== Example 3: Export to PDF ===\n');

  // Use same data as Excel example
  const exportData: ExportService.AnalyticsExportData = {
    tenantId: 'tenant-001',
    organizationName: 'Demo Tournament Organization',
    dateRange: {
      start: subDays(new Date(), 30),
      end: new Date(),
    },
    revenue: {
      summary: {
        mrr: 15000,
        arr: 180000,
        totalRevenue: 45000,
        growth: 12.5,
      },
      breakdown: [
        {
          date: new Date('2025-01-01'),
          amount: 5000,
          type: 'Subscription',
          source: 'Stripe',
        },
        {
          date: new Date('2025-01-02'),
          amount: 3000,
          type: 'Subscription',
          source: 'Stripe',
        },
      ],
    },
    users: {
      summary: {
        total: 500,
        active: 350,
        new: 50,
        churn: 30,
      },
      cohorts: [
        {
          cohort: startOfMonth(new Date()),
          size: 50,
          retention: 70,
          revenue: 5000,
        },
      ],
    },
    tournaments: {
      summary: {
        total: 25,
        completed: 20,
        completionRate: 80,
        avgPlayers: 16,
      },
      details: [],
    },
  };

  // Export to PDF
  const pdfBlob = await ExportService.exportToPDF(exportData, {
    tenantId: exportData.tenantId,
    dateRange: exportData.dateRange,
    orientation: 'portrait',
    title: 'Monthly Analytics Report',
    subtitle: 'January 2025',
  });

  console.log(`✓ PDF export successful (${pdfBlob.size} bytes)\n`);

  return pdfBlob;
}

/**
 * Example: Queue large export job
 */
export async function example4_QueueExportJob() {
  console.log('\n=== Example 4: Queue Export Job ===\n');

  const jobId = await ExportService.queueExportJob('tenant-001', 'revenue', {
    userId: 'user-123',
    email: 'user@example.com',
    format: 'excel',
    uploadToS3: true,
    notifyOnComplete: true,
  });

  console.log(`✓ Export job queued: ${jobId}\n`);

  // Check job status
  const status = await ExportService.getExportStatus(jobId);
  console.log('Job status:', status);
  console.log();

  return jobId;
}

// ============================================================================
// EXAMPLE 2: PREDICTIVE ANALYTICS
// ============================================================================

/**
 * Example: Revenue forecasting
 */
export async function example5_PredictRevenue() {
  console.log('\n=== Example 5: Revenue Forecasting ===\n');

  try {
    // Predict next 6 months
    const predictions = await PredictiveModels.predictRevenue('tenant-001', 6);

    console.log('Revenue Predictions:');
    console.log('-------------------');

    for (const pred of predictions) {
      console.log(
        `${pred.monthLabel}: $${pred.predictedMRR.toLocaleString()} (${
          pred.confidence
        } confidence, ${pred.accuracy}% accuracy)`
      );
      console.log(
        `  Range: $${pred.confidenceInterval.low.toLocaleString()} - $${pred.confidenceInterval.high.toLocaleString()}`
      );
    }

    console.log('\n✓ Revenue forecast complete\n');

    return predictions;
  } catch {
    console.error('❌ Revenue forecast failed');
    console.log('Note: This requires historical revenue data. Run seed-test-data.ts first.\n');
    throw new Error('Revenue forecast failed - requires historical data');
  }
}

/**
 * Example: User growth forecasting
 */
export async function example6_PredictUserGrowth() {
  console.log('\n=== Example 6: User Growth Forecasting ===\n');

  try {
    // Predict next 6 months
    const predictions = await PredictiveModels.predictUserGrowth('tenant-001', 6);

    console.log('User Growth Predictions:');
    console.log('-----------------------');

    for (const pred of predictions) {
      console.log(
        `${pred.monthLabel}: ${pred.predictedUsers.toLocaleString()} users (${
          pred.confidence
        } confidence)`
      );
      console.log(`  Active: ${pred.predictedActive.toLocaleString()}`);
      console.log(`  Churn Rate: ${pred.predictedChurn.toFixed(1)}%`);
      console.log(`  Growth Rate: ${pred.growthRate.toFixed(1)}%`);
    }

    console.log('\n✓ User growth forecast complete\n');

    return predictions;
  } catch {
    console.error('❌ User growth forecast failed');
    console.log('Note: This requires historical user data. Run seed-test-data.ts first.\n');
    throw new Error('User growth forecast failed - requires historical data');
  }
}

/**
 * Example: Calculate trendline
 */
export function example7_CalculateTrendline() {
  console.log('\n=== Example 7: Calculate Trendline ===\n');

  // Sample revenue data (12 months)
  const revenueData = [
    10000, 10500, 11200, 11800, 12500, 13100, 13800, 14500, 15200, 15900, 16700, 17500,
  ];

  const trendline = PredictiveModels.calculateTrendline(revenueData);

  console.log('Trendline Analysis:');
  console.log('------------------');
  console.log(`Equation: ${trendline.equation}`);
  console.log(`R² (accuracy): ${(trendline.rSquared * 100).toFixed(1)}%`);
  console.log(`Slope: ${trendline.slope.toFixed(2)} (monthly growth)`);
  console.log(`Intercept: ${trendline.intercept.toFixed(2)} (starting value)`);
  console.log('\n✓ Trendline calculated\n');

  return trendline;
}

// ============================================================================
// EXAMPLE 3: SCHEDULED REPORTS
// ============================================================================

/**
 * Example: Create daily report
 */
export async function example8_CreateDailyReport() {
  console.log('\n=== Example 8: Create Daily Report ===\n');

  const reportConfig: ScheduledReportsService.ReportConfig = {
    tenantId: 'tenant-001',
    name: 'Daily Revenue Report',
    description: 'Daily summary of revenue and user metrics',
    enabled: true,
    schedule: {
      frequency: 'daily',
      hour: 8,
      minute: 0,
      timezone: 'America/New_York',
    },
    recipients: {
      to: ['admin@example.com'],
      cc: ['finance@example.com'],
    },
    format: 'pdf',
    sections: {
      revenue: true,
      users: true,
      cohorts: false,
      tournaments: true,
      predictions: false,
      summary: true,
    },
    dateRange: {
      type: 'last7days',
    },
    createdBy: 'user-123',
  };

  const report = await ScheduledReportsService.createScheduledReport(reportConfig);

  console.log('Report created:');
  console.log(`  ID: ${report.id}`);
  console.log(`  Name: ${report.name}`);
  console.log(
    `  Schedule: ${report.schedule.frequency} at ${report.schedule.hour}:${String(report.schedule.minute).padStart(2, '0')}`
  );
  console.log(`  Next run: ${report.nextRunAt?.toISOString()}`);
  console.log('\n✓ Daily report created\n');

  return report;
}

/**
 * Example: Create weekly report
 */
export async function example9_CreateWeeklyReport() {
  console.log('\n=== Example 9: Create Weekly Report ===\n');

  const reportConfig: ScheduledReportsService.ReportConfig = {
    tenantId: 'tenant-001',
    name: 'Weekly Performance Report',
    description: 'Comprehensive weekly analytics report',
    enabled: true,
    schedule: {
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      hour: 9,
      minute: 0,
      timezone: 'America/New_York',
    },
    recipients: {
      to: ['management@example.com'],
    },
    format: 'excel',
    sections: {
      revenue: true,
      users: true,
      cohorts: true,
      tournaments: true,
      predictions: true,
      summary: true,
    },
    dateRange: {
      type: 'last30days',
    },
    createdBy: 'user-123',
  };

  const report = await ScheduledReportsService.createScheduledReport(reportConfig);

  console.log('Report created:');
  console.log(`  ID: ${report.id}`);
  console.log(`  Name: ${report.name}`);
  console.log(`  Schedule: ${report.schedule.frequency} on day ${report.schedule.dayOfWeek}`);
  console.log(`  Format: ${report.format}`);
  console.log('\n✓ Weekly report created\n');

  return report;
}

/**
 * Example: List scheduled reports
 */
export async function example10_ListReports() {
  console.log('\n=== Example 10: List Scheduled Reports ===\n');

  const reports = await ScheduledReportsService.getScheduledReports('tenant-001');

  console.log(`Found ${reports.length} scheduled reports:`);
  console.log();

  for (const report of reports) {
    console.log(`- ${report.name}`);
    console.log(`  ID: ${report.id}`);
    console.log(`  Enabled: ${report.enabled ? 'Yes' : 'No'}`);
    console.log(`  Format: ${report.format}`);
    console.log(`  Recipients: ${report.recipients.to.join(', ')}`);
    console.log();
  }

  console.log('✓ Reports listed\n');

  return reports;
}

/**
 * Example: Update report
 */
export async function example11_UpdateReport(reportId: string) {
  console.log('\n=== Example 11: Update Report ===\n');

  const updatedReport = await ScheduledReportsService.updateScheduledReport(reportId, {
    enabled: false,
    description: 'Report temporarily disabled for testing',
  });

  console.log('Report updated:');
  console.log(`  ID: ${updatedReport.id}`);
  console.log(`  Enabled: ${updatedReport.enabled}`);
  console.log(`  Description: ${updatedReport.description}`);
  console.log('\n✓ Report updated\n');

  return updatedReport;
}

/**
 * Example: Get report history
 */
export async function example12_GetReportHistory(reportId: string) {
  console.log('\n=== Example 12: Get Report History ===\n');

  const history = await ScheduledReportsService.getReportHistory(reportId, 5);

  console.log(`Found ${history.length} delivery records:`);
  console.log();

  for (const delivery of history) {
    console.log(`- ${delivery.status.toUpperCase()}`);
    console.log(`  ID: ${delivery.id}`);
    console.log(`  Format: ${delivery.format}`);
    console.log(`  Recipients: ${delivery.recipients.join(', ')}`);
    console.log(`  Delivered: ${delivery.deliveredAt?.toISOString() || 'Pending'}`);
    if (delivery.errorMessage) {
      console.log(`  Error: ${delivery.errorMessage}`);
    }
    console.log();
  }

  console.log('✓ History retrieved\n');

  return history;
}

// ============================================================================
// EXAMPLE 4: EMAIL SERVICE
// ============================================================================

/**
 * Example: Send test report email (REQUIRES SMTP CONFIG)
 */
export async function example13_SendReportEmail() {
  console.log('\n=== Example 13: Send Report Email ===\n');

  // Check email configuration
  const emailConfig = EmailService.verifyEmailConfig();

  if (!emailConfig.configured) {
    console.log('❌ Email not configured. Missing:');
    emailConfig.missing.forEach((key) => console.log(`  - ${key}`));
    console.log('\nSet these environment variables to enable email:');
    console.log('  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM');
    console.log('\nSkipping email example.\n');
    return;
  }

  const reportData: EmailService.ReportEmailData = {
    organizationName: 'Demo Tournament Organization',
    reportName: 'Weekly Performance Report',
    reportFormat: 'pdf',
    dateRange: {
      start: subDays(new Date(), 7),
      end: new Date(),
    },
    summary: {
      mrr: 15000,
      totalRevenue: 45000,
      activeUsers: 350,
      totalTournaments: 25,
    },
  };

  try {
    await EmailService.sendReportEmail(['test@example.com'], reportData);
    console.log('✓ Report email sent successfully\n');
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    console.log('\nNote: Ensure SMTP configuration is correct.\n');
  }
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

/**
 * Run all examples sequentially
 */
export async function runAllExamples() {
  console.log('\n');
  console.log('════════════════════════════════════════════════════════════');
  console.log('  Day 4 Usage Examples - Sprint 10 Week 1');
  console.log('  Export, Predictions, and Scheduled Reports');
  console.log('════════════════════════════════════════════════════════════');

  try {
    // Export examples
    await example1_ExportToCSV();
    await example2_ExportToExcel();
    await example3_ExportToPDF();
    // await example4_QueueExportJob(); // Requires queue running

    // Predictive analytics examples
    try {
      await example5_PredictRevenue();
      await example6_PredictUserGrowth();
    } catch {
      console.log('Skipping prediction examples (requires historical data)\n');
    }
    example7_CalculateTrendline();

    // Scheduled reports examples
    const dailyReport = await example8_CreateDailyReport();
    const _weeklyReport = await example9_CreateWeeklyReport();
    await example10_ListReports();

    if (dailyReport.id) {
      await example11_UpdateReport(dailyReport.id);
      await example12_GetReportHistory(dailyReport.id);
    }

    // Email example (optional, requires SMTP)
    // await example13_SendReportEmail();

    console.log('════════════════════════════════════════════════════════════');
    console.log('  ✓ All examples completed successfully!');
    console.log('════════════════════════════════════════════════════════════');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    console.log('\n');
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
