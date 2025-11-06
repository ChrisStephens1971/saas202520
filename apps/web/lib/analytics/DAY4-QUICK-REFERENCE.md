# Day 4 Quick Reference Guide
## Export, Predictions, and Scheduled Reports

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd apps/web
npm install  # Installs exceljs@^4.4.0
```

### 2. Configure Email (Optional)
Create `.env` file:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@tournament.com
```

### 3. Start Workers
```bash
npm run workers
```

### 4. Run Examples
```bash
tsx lib/analytics/services/day4-usage-examples.ts
```

---

## 📊 Export Service

### Export to CSV
```typescript
import * as ExportService from '@/lib/analytics/services/export-service';

const csv = ExportService.exportToCSV(data, 'filename', {
  customHeaders: {
    date: 'Date',
    amount: 'Amount (USD)'
  }
});
```

### Export to Excel
```typescript
const buffer = await ExportService.exportToExcel(exportData, 'report');
// Write to file or send as download
```

### Export to PDF
```typescript
const blob = await ExportService.exportToPDF(exportData, {
  title: 'Monthly Report',
  orientation: 'portrait'
});
```

### Queue Background Export
```typescript
const jobId = await ExportService.queueExportJob('tenant-001', 'revenue', {
  userId: 'user-123',
  email: 'user@example.com',
  format: 'excel'
});

// Check status
const status = await ExportService.getExportStatus(jobId);
```

---

## 🔮 Predictive Models

### Revenue Forecasting
```typescript
import * as PredictiveModels from '@/lib/analytics/services/predictive-models';

// Predict next 6 months
const predictions = await PredictiveModels.predictRevenue('tenant-001', 6);

predictions.forEach(pred => {
  console.log(`${pred.monthLabel}: $${pred.predictedMRR}`);
  console.log(`Confidence: ${pred.confidence} (${pred.accuracy}%)`);
});
```

### User Growth Forecasting
```typescript
const predictions = await PredictiveModels.predictUserGrowth('tenant-001', 6);

predictions.forEach(pred => {
  console.log(`${pred.monthLabel}: ${pred.predictedUsers} users`);
  console.log(`Growth Rate: ${pred.growthRate.toFixed(1)}%`);
});
```

### Calculate Trendline
```typescript
const data = [10000, 10500, 11200, 11800, 12500, 13100];
const trendline = PredictiveModels.calculateTrendline(data);

console.log(trendline.equation); // "y = 520.00x + 9500.00"
console.log(`Accuracy: ${(trendline.rSquared * 100).toFixed(1)}%`);
```

---

## 📅 Scheduled Reports

### Create Daily Report
```typescript
import * as ScheduledReportsService from '@/lib/analytics/services/scheduled-reports-service';

const report = await ScheduledReportsService.createScheduledReport({
  tenantId: 'tenant-001',
  name: 'Daily Revenue Report',
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
    tournaments: true,
    summary: true,
  },
  dateRange: { type: 'last7days' },
  createdBy: 'user-123',
});
```

### Create Weekly Report
```typescript
const report = await ScheduledReportsService.createScheduledReport({
  // ... same as above
  schedule: {
    frequency: 'weekly',
    dayOfWeek: 1, // Monday
    hour: 9,
    minute: 0,
    timezone: 'America/New_York',
  },
  format: 'excel',
});
```

### List Reports
```typescript
const reports = await ScheduledReportsService.getScheduledReports('tenant-001');
```

### Update Report
```typescript
await ScheduledReportsService.updateScheduledReport('report-id', {
  enabled: false,
  description: 'Updated description',
});
```

### Get Report History
```typescript
const history = await ScheduledReportsService.getReportHistory('report-id', 10);
```

---

## 📧 Email Service

### Send Report Email
```typescript
import * as EmailService from '@/lib/analytics/services/email-service';

await EmailService.sendReportEmail(['user@example.com'], {
  organizationName: 'My Organization',
  reportName: 'Weekly Report',
  reportFormat: 'pdf',
  dateRange: { start: new Date(), end: new Date() },
  fileBuffer: pdfBuffer,
  filename: 'report.pdf',
  summary: {
    mrr: 15000,
    totalRevenue: 45000,
    activeUsers: 350,
    totalTournaments: 25,
  },
});
```

### Send Export Notification
```typescript
await EmailService.sendExportNotification(
  'user@example.com',
  'https://s3.amazonaws.com/...',
  '24 hours'
);
```

---

## 🌐 API Routes

### Export API

**Queue Export Job**
```bash
POST /api/analytics/export
{
  "tenantId": "tenant-001",
  "exportType": "revenue",
  "format": "excel"
}
```

**Check Export Status**
```bash
GET /api/analytics/export/{jobId}
```

### Predictions API

**Get Revenue Forecast**
```bash
GET /api/analytics/predictions?type=revenue&tenantId=tenant-001&months=6
```

**Get User Growth Forecast**
```bash
GET /api/analytics/predictions?type=users&tenantId=tenant-001&months=6
```

### Scheduled Reports API

**List Reports**
```bash
GET /api/analytics/reports?tenantId=tenant-001
```

**Create Report**
```bash
POST /api/analytics/reports
{
  "tenantId": "tenant-001",
  "name": "Daily Report",
  "schedule": { "frequency": "daily", "hour": 8, "minute": 0 },
  "recipients": { "to": ["admin@example.com"] },
  "format": "pdf",
  "sections": { "revenue": true, "users": true }
}
```

**Update Report**
```bash
PATCH /api/analytics/reports/{id}
{
  "enabled": false
}
```

**Delete Report**
```bash
DELETE /api/analytics/reports/{id}
```

**Get Report History**
```bash
GET /api/analytics/reports/{id}/history?limit=10
```

---

## 🔧 Troubleshooting

### Export Issues

**Problem:** "No data provided for CSV export"
- **Solution:** Ensure data array is not empty

**Problem:** Excel export fails
- **Solution:** Check exceljs is installed: `npm list exceljs`

**Problem:** PDF tables are cut off
- **Solution:** Limit rows per page or use landscape orientation

### Prediction Issues

**Problem:** "Insufficient historical data"
- **Solution:** Need minimum 3 months of data. Run seed-test-data.ts

**Problem:** Low accuracy (<60%)
- **Solution:** Check data quality, ensure consistent patterns

**Problem:** Predictions not cached
- **Solution:** Verify Redis is running and cache-manager is working

### Email Issues

**Problem:** Email not configured
- **Solution:** Set SMTP_USER, SMTP_PASSWORD environment variables

**Problem:** Email fails to send
- **Solution:** Check SMTP credentials, firewall, port (587/465)

**Problem:** Attachments too large
- **Solution:** Use download links instead of attachments

### Scheduled Report Issues

**Problem:** Reports not running
- **Solution:** Check workers are running: `npm run workers`

**Problem:** Invalid cron expression
- **Solution:** Use cron validator or preset frequencies

**Problem:** Report delivery failed
- **Solution:** Check report history for error message

---

## 📁 File Structure

```
apps/web/lib/analytics/
├── services/
│   ├── export-service.ts           # CSV, Excel, PDF exports
│   ├── predictive-models.ts        # Forecasting models
│   ├── scheduled-reports-service.ts # Report configuration
│   ├── email-service.ts            # Email delivery
│   └── day4-usage-examples.ts      # Examples
├── jobs/
│   ├── report-generation-job.ts    # Background reports
│   ├── scheduler.ts                # Cron scheduling (updated)
│   └── queue.ts                    # BullMQ queue
└── DAY4-IMPLEMENTATION-REPORT.md   # Full documentation

apps/web/app/api/analytics/
├── export/
│   ├── route.ts                    # POST /export
│   └── [jobId]/route.ts            # GET /export/{id}
├── predictions/
│   └── route.ts                    # GET /predictions
└── reports/
    ├── route.ts                    # GET, POST /reports
    └── [id]/
        ├── route.ts                # GET, PATCH, DELETE
        └── history/route.ts        # GET /history
```

---

## ⚡ Performance Tips

1. **Large Exports:** Use background jobs for >10K rows
2. **Predictions:** Cache enabled by default (1 hour TTL)
3. **Reports:** Limit sections to reduce generation time
4. **Email:** Use download links for files >5MB
5. **Queue:** Scale workers horizontally if needed

---

## 🔐 Security Checklist

- ✅ All API routes require authentication
- ✅ Tenant isolation enforced
- ✅ SMTP credentials in environment variables
- ✅ Download links expire after 24 hours
- ✅ Email recipients validated
- ✅ Input validation on all endpoints

---

## 📚 Additional Resources

- **Full Documentation:** `DAY4-IMPLEMENTATION-REPORT.md`
- **Usage Examples:** `day4-usage-examples.ts`
- **API Contracts:** See individual route files
- **TypeScript Types:** Exported from each service file

---

## 🎯 Common Use Cases

### 1. Monthly Executive Report
```typescript
// Create monthly report with predictions
const report = await ScheduledReportsService.createScheduledReport({
  name: 'Monthly Executive Report',
  schedule: { frequency: 'monthly', dayOfMonth: 1, hour: 9 },
  format: 'pdf',
  sections: {
    revenue: true,
    users: true,
    tournaments: true,
    predictions: true,
    summary: true
  },
  dateRange: { type: 'lastMonth' },
});
```

### 2. On-Demand Data Export
```typescript
// Generate immediate CSV export
const data = await fetchRevenueData('tenant-001');
const csv = ExportService.exportToCSV(data, 'revenue-export');
// Download or save CSV
```

### 3. Revenue Forecasting Dashboard
```typescript
// Get predictions for chart
const predictions = await PredictiveModels.predictRevenue('tenant-001', 12);
// Render chart with predictions
```

### 4. Automated Weekly Summary
```typescript
// Weekly report to stakeholders
const report = await ScheduledReportsService.createScheduledReport({
  name: 'Weekly Summary',
  schedule: { frequency: 'weekly', dayOfWeek: 1, hour: 8 },
  recipients: {
    to: ['team@example.com'],
    cc: ['executives@example.com']
  },
  format: 'excel',
  sections: { revenue: true, users: true, tournaments: true },
});
```

---

**Need Help?** See `DAY4-IMPLEMENTATION-REPORT.md` for detailed documentation.
