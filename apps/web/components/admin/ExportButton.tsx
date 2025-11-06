/**
 * ExportButton Component
 * Sprint 9 Phase 2 - Admin Analytics Dashboard
 *
 * Export analytics data in multiple formats:
 * - CSV: Simple data export for spreadsheets
 * - Excel (XLSX): Formatted workbook with multiple sheets
 * - PNG: Chart image export (using canvas)
 * - PDF: Full report with charts and data
 */

'use client';

import { useState } from 'react';

export type ExportFormat = 'csv' | 'xlsx' | 'png' | 'pdf';

interface ExportButtonProps {
  data: any[];
  filename: string;
  formats?: ExportFormat[];
  onExport?: (format: ExportFormat) => void;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({
  data,
  filename,
  formats = ['csv', 'xlsx'],
  onExport,
  disabled = false,
  className = '',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Convert data to CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Convert data to Excel (XLSX)
  const exportToExcel = async (data: any[], filename: string) => {
    try {
      // Dynamic import to reduce bundle size
      const XLSX = await import('xlsx');

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Create worksheet from data
      const ws = XLSX.utils.json_to_sheet(data);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Analytics Data');

      // Generate Excel file
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Make sure the xlsx library is installed.');
    }
  };

  // Export chart as PNG
  const exportChartToPNG = async (chartId: string, filename: string) => {
    try {
      // Find chart element
      const chartElement = document.querySelector(`#${chartId}`);
      if (!chartElement) {
        alert('Chart not found');
        return;
      }

      // Use html2canvas to capture chart
      const html2canvas = await import('html2canvas');
      const canvas = await html2canvas.default(chartElement as HTMLElement);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.png`;
        link.click();
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error exporting chart to PNG:', error);
      alert('Failed to export chart. Make sure html2canvas is installed.');
    }
  };

  // Export to PDF
  const exportToPDF = async (data: any[], filename: string) => {
    try {
      // Dynamic import to reduce bundle size
      const { jsPDF } = await import('jspdf');
      const autoTable = await import('jspdf-autotable');

      // Create PDF
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text('Analytics Report', 14, 20);

      // Add date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

      // Add table
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);
        const rows = data.map(row => headers.map(header => row[header]));

        (doc as any).autoTable({
          head: [headers],
          body: rows,
          startY: 35,
          theme: 'striped',
          headStyles: { fillColor: [147, 51, 234] }, // purple-600
        });
      }

      // Save PDF
      doc.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export to PDF. Make sure jspdf and jspdf-autotable are installed.');
    }
  };

  // Handle export
  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setShowDropdown(false);

    try {
      // Call custom export handler if provided
      if (onExport) {
        onExport(format);
        return;
      }

      // Default export handlers
      switch (format) {
        case 'csv':
          exportToCSV(data, filename);
          break;
        case 'xlsx':
          await exportToExcel(data, filename);
          break;
        case 'png':
          await exportChartToPNG('analytics-chart', filename);
          break;
        case 'pdf':
          await exportToPDF(data, filename);
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  // Format labels
  const formatLabels: Record<ExportFormat, string> = {
    csv: 'Export as CSV',
    xlsx: 'Export as Excel',
    png: 'Export as PNG',
    pdf: 'Export as PDF',
  };

  // Icons
  const formatIcons: Record<ExportFormat, React.ReactNode> = {
    csv: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    xlsx: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    png: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    pdf: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  };

  // Single format - direct button
  if (formats.length === 1) {
    const format = formats[0];
    return (
      <button
        onClick={() => handleExport(format)}
        disabled={disabled || isExporting}
        className={`flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {formatIcons[format]}
        {isExporting ? 'Exporting...' : formatLabels[format]}
      </button>
    );
  }

  // Multiple formats - dropdown
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled || isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {isExporting ? 'Exporting...' : 'Export Data'}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && !isExporting && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-white/20 overflow-hidden z-20">
            {formats.map(format => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-white/10 transition-colors"
              >
                {formatIcons[format]}
                <span>{formatLabels[format]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Quick export helper functions
 */
export const exportHelpers = {
  // Export metrics summary
  exportMetricsSummary: (metrics: Record<string, any>, filename: string) => {
    const data = Object.entries(metrics).map(([key, value]) => ({
      Metric: key,
      Value: value,
    }));

    const button = document.createElement('button');
    button.onclick = () => {
      const csvContent = [
        'Metric,Value',
        ...data.map(row => `${row.Metric},${row.Value}`)
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    };

    button.click();
  },
};
