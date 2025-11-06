/**
 * Email Service
 * Sprint 10 Week 1 Day 4 - Email Delivery
 *
 * Provides email functionality for sending analytics reports.
 * Uses nodemailer to send professional HTML emails with attachments.
 *
 * Supports:
 * - Report delivery with PDF/Excel attachments
 * - Export ready notifications with download links
 * - Professional HTML templates
 * - SMTP configuration from environment variables
 */

import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import type { ReportFormat } from './scheduled-reports-service';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Email configuration
 */
interface EmailConfig {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
  }>;
}

/**
 * Report email data
 */
export interface ReportEmailData {
  organizationName: string;
  reportName: string;
  reportFormat: ReportFormat;
  dateRange: {
    start: Date;
    end: Date;
  };
  fileBuffer?: Buffer;
  filename?: string;
  downloadUrl?: string;
  summary?: {
    mrr?: number;
    totalRevenue?: number;
    activeUsers?: number;
    totalTournaments?: number;
  };
}

// ============================================================================
// EMAIL TRANSPORTER
// ============================================================================

/**
 * Create nodemailer transporter
 *
 * Uses SMTP configuration from environment variables:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASSWORD
 * - SMTP_FROM (sender email)
 */
function createTransporter() {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  // For development, use ethereal email (fake SMTP)
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    console.log('[Email] Using ethereal email for development');
    // Note: In real usage, you'd create ethereal account dynamically
    // For now, just log and use standard config
  }

  return nodemailer.createTransporter(config);
}

// ============================================================================
// SEND EMAILS
// ============================================================================

/**
 * Send analytics report email
 *
 * Sends a professionally formatted email with the analytics report attached.
 *
 * @param recipients - List of recipient email addresses
 * @param reportData - Report data and metadata
 * @returns Success status
 */
export async function sendReportEmail(
  recipients: string[],
  reportData: ReportEmailData
): Promise<boolean> {
  console.log(
    `[Email] Sending ${reportData.reportFormat} report to ${recipients.length} recipients`
  );

  try {
    const transporter = createTransporter();

    // Generate email HTML
    const html = generateReportEmailHTML(reportData);
    const text = generateReportEmailText(reportData);

    // Prepare email config
    const emailConfig: EmailConfig = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@tournament.com',
      to: recipients,
      subject: `${reportData.reportName} - ${reportData.organizationName}`,
      html,
      text,
    };

    // Add attachment if file buffer provided
    if (reportData.fileBuffer && reportData.filename) {
      emailConfig.attachments = [
        {
          filename: reportData.filename,
          content: reportData.fileBuffer,
        },
      ];
    }

    // Send email
    const info = await transporter.sendMail(emailConfig);

    console.log(`[Email] Report email sent: ${info.messageId}`);

    return true;
  } catch (error) {
    console.error('[Email] Failed to send report email:', error);
    throw new Error(
      `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Send export ready notification
 *
 * Notifies user that their export is ready for download.
 * Includes download link with expiration notice.
 *
 * @param email - Recipient email address
 * @param downloadUrl - S3 signed URL or download link
 * @param expiresIn - Expiration time (e.g., '24 hours')
 * @returns Success status
 */
export async function sendExportNotification(
  email: string,
  downloadUrl: string,
  expiresIn: string
): Promise<boolean> {
  console.log(`[Email] Sending export notification to ${email}`);

  try {
    const transporter = createTransporter();

    const html = generateExportNotificationHTML(downloadUrl, expiresIn);
    const text = generateExportNotificationText(downloadUrl, expiresIn);

    const emailConfig: EmailConfig = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@tournament.com',
      to: [email],
      subject: 'Your Analytics Export is Ready',
      html,
      text,
    };

    const info = await transporter.sendMail(emailConfig);

    console.log(`[Email] Export notification sent: ${info.messageId}`);

    return true;
  } catch (error) {
    console.error('[Email] Failed to send export notification:', error);
    throw new Error(
      `Failed to send notification: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// ============================================================================
// HTML EMAIL TEMPLATES
// ============================================================================

/**
 * Generate HTML email for report delivery
 */
function generateReportEmailHTML(reportData: ReportEmailData): string {
  const { organizationName, reportName, dateRange, reportFormat, downloadUrl, summary } =
    reportData;

  const dateRangeStr = `${format(dateRange.start, 'MMM dd, yyyy')} - ${format(
    dateRange.end,
    'MMM dd, yyyy'
  )}`;

  let summarySection = '';
  if (summary) {
    summarySection = `
      <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
        <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Quick Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${
            summary.mrr
              ? `<tr>
            <td style="padding: 8px 0; color: #666;">Monthly Recurring Revenue:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">$${summary.mrr.toLocaleString()}</td>
          </tr>`
              : ''
          }
          ${
            summary.totalRevenue
              ? `<tr>
            <td style="padding: 8px 0; color: #666;">Total Revenue:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">$${summary.totalRevenue.toLocaleString()}</td>
          </tr>`
              : ''
          }
          ${
            summary.activeUsers
              ? `<tr>
            <td style="padding: 8px 0; color: #666;">Active Users:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">${summary.activeUsers.toLocaleString()}</td>
          </tr>`
              : ''
          }
          ${
            summary.totalTournaments
              ? `<tr>
            <td style="padding: 8px 0; color: #666;">Total Tournaments:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">${summary.totalTournaments.toLocaleString()}</td>
          </tr>`
              : ''
          }
        </table>
      </div>
    `;
  }

  let downloadSection = '';
  if (downloadUrl) {
    downloadSection = `
      <div style="margin: 30px 0; text-align: center;">
        <a href="${downloadUrl}"
           style="display: inline-block; padding: 12px 30px; background-color: #4472C4; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Download Report
        </a>
        <p style="margin-top: 10px; color: #999; font-size: 12px;">
          Link expires in 24 hours
        </p>
      </div>
    `;
  } else {
    downloadSection = `
      <p style="margin: 20px 0; color: #666;">
        The report is attached to this email as a ${reportFormat.toUpperCase()} file.
      </p>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${reportName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background-color: #4472C4; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">${reportName}</h1>
          <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
            ${organizationName}
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">
            Your scheduled analytics report is ready.
          </p>

          <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #4472C4; border-radius: 4px;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              <strong>Report Period:</strong> ${dateRangeStr}
            </p>
          </div>

          ${summarySection}

          ${downloadSection}

          <div style="margin: 40px 0 0 0; padding: 20px 0; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; color: #999; font-size: 12px;">
              This is an automated report from Tournament Analytics.
              <br>
              Generated on ${format(new Date(), 'MMM dd, yyyy at h:mm a')}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
          <p style="margin: 0; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} Tournament Analytics. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text version of report email
 */
function generateReportEmailText(reportData: ReportEmailData): string {
  const { organizationName, reportName, dateRange, reportFormat } = reportData;

  const dateRangeStr = `${format(dateRange.start, 'MMM dd, yyyy')} - ${format(
    dateRange.end,
    'MMM dd, yyyy'
  )}`;

  return `
${reportName}
${organizationName}

Your scheduled analytics report is ready.

Report Period: ${dateRangeStr}
Format: ${reportFormat.toUpperCase()}

${reportData.downloadUrl ? `Download: ${reportData.downloadUrl}` : 'The report is attached to this email.'}

---
This is an automated report from Tournament Analytics.
Generated on ${format(new Date(), 'MMM dd, yyyy at h:mm a')}
  `.trim();
}

/**
 * Generate HTML email for export notification
 */
function generateExportNotificationHTML(downloadUrl: string, expiresIn: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Export is Ready</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background-color: #70AD47; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">Export Ready!</h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">
            Your analytics export has been generated and is ready for download.
          </p>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${downloadUrl}"
               style="display: inline-block; padding: 15px 40px; background-color: #70AD47; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Download Export
            </a>
          </div>

          <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Important:</strong> This download link will expire in ${expiresIn}.
            </p>
          </div>

          <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">
            If you have any questions or need assistance, please contact support.
          </p>

          <div style="margin: 40px 0 0 0; padding: 20px 0; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; color: #999; font-size: 12px;">
              This is an automated notification from Tournament Analytics.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
          <p style="margin: 0; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} Tournament Analytics. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text version of export notification
 */
function generateExportNotificationText(downloadUrl: string, expiresIn: string): string {
  return `
Your Export is Ready!

Your analytics export has been generated and is ready for download.

Download: ${downloadUrl}

IMPORTANT: This download link will expire in ${expiresIn}.

---
This is an automated notification from Tournament Analytics.
  `.trim();
}

/**
 * Verify email configuration
 *
 * Checks that all required environment variables are set.
 *
 * @returns Configuration status
 */
export function verifyEmailConfig(): {
  configured: boolean;
  missing: string[];
} {
  const required = ['SMTP_USER', 'SMTP_PASSWORD'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  return {
    configured: missing.length === 0,
    missing,
  };
}
