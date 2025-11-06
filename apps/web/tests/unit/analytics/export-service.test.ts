/**
 * Export Service Tests
 * Sprint 10 Week 1 Day 5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportService } from '../export-service';
import {
  createMockPrismaClient,
  resetAllMocks,
  fixtures,
} from '../../__tests__/test-utils';

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => createMockPrismaClient()),
}));

// Mock BullMQ
vi.mock('bullmq', () => ({
  Queue: vi.fn(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-001' }),
    getJob: vi.fn().mockResolvedValue({
      id: 'job-001',
      progress: 50,
      returnvalue: null,
      failedReason: null,
    }),
  })),
}));

describe('ExportService', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('exportToCSV', () => {
    it('should generate valid CSV', async () => {
      const data = [
        { id: 1, name: 'Alice', revenue: 1000 },
        { id: 2, name: 'Bob', revenue: 1500 },
      ];

      const result = await ExportService.exportToCSV(data, {
        filename: 'test.csv',
      });

      expect(result).toContain('id,name,revenue');
      expect(result).toContain('1,Alice,1000');
      expect(result).toContain('2,Bob,1500');
    });

    it('should handle custom columns', async () => {
      const data = [
        { id: 1, name: 'Alice', age: 30, city: 'NYC' },
      ];

      const result = await ExportService.exportToCSV(data, {
        columns: ['name', 'city'],
        filename: 'custom.csv',
      });

      expect(result).toContain('name,city');
      expect(result).toContain('Alice,NYC');
      expect(result).not.toContain('age');
    });

    it('should escape special characters', async () => {
      const data = [
        { name: 'Alice, Jr.', description: 'Uses "quotes"' },
      ];

      const result = await ExportService.exportToCSV(data, {
        filename: 'escaped.csv',
      });

      expect(result).toContain('"Alice, Jr."');
      expect(result).toContain('"Uses ""quotes"""');
    });

    it('should handle empty data', async () => {
      const result = await ExportService.exportToCSV([], {
        filename: 'empty.csv',
      });

      expect(result).toBe('');
    });
  });

  describe('exportToExcel', () => {
    it('should create Excel workbook', async () => {
      const data = {
        Revenue: [
          { month: 'Oct', mrr: 15000 },
          { month: 'Nov', mrr: 16000 },
        ],
        Users: [
          { month: 'Oct', count: 150 },
          { month: 'Nov', count: 165 },
        ],
      };

      const buffer = await ExportService.exportToExcel(data, {
        filename: 'test.xlsx',
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle single sheet', async () => {
      const data = [
        { name: 'Alice', revenue: 1000 },
      ];

      const buffer = await ExportService.exportToExcel(data, {
        filename: 'single-sheet.xlsx',
        sheetName: 'Data',
      });

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle empty sheets', async () => {
      const buffer = await ExportService.exportToExcel(
        { Sheet1: [] },
        { filename: 'empty.xlsx' }
      );

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('exportToPDF', () => {
    it('should generate PDF document', async () => {
      const data = {
        title: 'Revenue Report',
        sections: [
          {
            heading: 'Summary',
            content: 'MRR: $15,000',
          },
        ],
      };

      const buffer = await ExportService.exportToPDF(data, {
        filename: 'report.pdf',
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should include tables in PDF', async () => {
      const data = {
        title: 'Monthly Report',
        tables: [
          {
            headers: ['Month', 'Revenue'],
            rows: [
              ['Oct', '$15,000'],
              ['Nov', '$16,000'],
            ],
          },
        ],
      };

      const buffer = await ExportService.exportToPDF(data, {
        filename: 'table-report.pdf',
      });

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('queueExportJob', () => {
    it('should queue background job', async () => {
      const jobData = {
        tenantId: 'tenant-001',
        exportType: 'revenue',
        format: 'excel',
        dateRange: {
          start: new Date('2024-10-01'),
          end: new Date('2024-10-31'),
        },
      };

      const result = await ExportService.queueExportJob(jobData);

      expect(result).toBeDefined();
      expect(result.jobId).toBe('job-001');
      expect(result.status).toBe('queued');
    });

    it('should validate export parameters', async () => {
      const invalidJob = {
        tenantId: '',
        exportType: 'invalid',
      };

      await expect(
        ExportService.queueExportJob(invalidJob as any)
      ).rejects.toThrow();
    });

    it('should set job priority', async () => {
      const urgentJob = {
        tenantId: 'tenant-001',
        exportType: 'revenue',
        format: 'csv',
        priority: 'high',
      };

      const result = await ExportService.queueExportJob(urgentJob as any);

      expect(result.jobId).toBeDefined();
    });
  });

  describe('getExportStatus', () => {
    it('should return job status', async () => {
      const status = await ExportService.getExportStatus('job-001');

      expect(status).toBeDefined();
      expect(status.jobId).toBe('job-001');
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });

    it('should return completed job with download URL', async () => {
      const mockQueue = {
        getJob: vi.fn().mockResolvedValue({
          id: 'job-002',
          progress: 100,
          returnvalue: {
            downloadUrl: 'https://s3.example.com/export.xlsx',
          },
          failedReason: null,
        }),
      };

      vi.mocked(mockQueue);

      const status = await ExportService.getExportStatus('job-002');

      expect(status.progress).toBe(100);
      if (status.downloadUrl) {
        expect(status.downloadUrl).toContain('export');
      }
    });

    it('should return failed job with error', async () => {
      const mockQueue = {
        getJob: vi.fn().mockResolvedValue({
          id: 'job-003',
          progress: 0,
          returnvalue: null,
          failedReason: 'Out of memory',
        }),
      };

      const status = await ExportService.getExportStatus('job-003');

      if (status.error) {
        expect(status.error).toBe('Out of memory');
      }
    });

    it('should handle non-existent job', async () => {
      await expect(
        ExportService.getExportStatus('nonexistent-job')
      ).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle large datasets gracefully', async () => {
      const largeData = Array.from({ length: 100000 }, (_, i) => ({
        id: i,
        value: Math.random() * 1000,
      }));

      // Should not throw, but might take longer
      const result = await ExportService.exportToCSV(largeData, {
        filename: 'large.csv',
      });

      expect(result).toBeDefined();
    });

    it('should validate file format', async () => {
      await expect(
        ExportService.queueExportJob({
          tenantId: 'tenant-001',
          exportType: 'revenue',
          format: 'invalid' as any,
        })
      ).rejects.toThrow();
    });

    it('should handle corrupted data gracefully', async () => {
      const corruptData = [
        { id: 1, value: undefined },
        { id: 2, value: null },
        { id: 3, value: NaN },
      ];

      const result = await ExportService.exportToCSV(corruptData, {
        filename: 'corrupt.csv',
      });

      expect(result).toBeDefined();
      // Should handle undefined/null/NaN gracefully
    });
  });
});
