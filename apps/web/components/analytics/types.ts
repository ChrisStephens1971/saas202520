/**
 * Analytics Dashboard Types
 * TypeScript interfaces for all analytics components
 */

export interface KPIMetric {
  label: string;
  value: number;
  trend: number; // Percentage change from previous period
  previousValue: number;
  format: 'currency' | 'number' | 'percentage';
  icon: 'dollar' | 'users' | 'trophy' | 'chart';
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  transactions: number;
  paymentType?: string;
  tournamentFormat?: string;
}

export interface CohortData {
  cohortMonth: string;
  cohortSize: number;
  retentionByMonth: number[]; // Retention percentages for each month
  ltv: number;
  activePlayers?: number;
}

export interface TournamentActivityData {
  date: string;
  format: string;
  attendance: number;
  completionRate: number;
  revenue: number;
  dayOfWeek?: number;
  hourOfDay?: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset?: 'last7days' | 'last30days' | 'last90days' | 'custom';
}

export interface ChartContainerProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  onExport?: () => void;
  children: React.ReactNode;
}

export interface HeatmapCell {
  row: number;
  col: number;
  value: number;
  label?: string;
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  mrrTrend: number;
  arrTrend: number;
  paymentSuccessRate: number;
  revenueByType: { type: string; amount: number }[];
  revenueByFormat: { format: string; amount: number }[];
  revenueOverTime: RevenueDataPoint[];
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
  userGrowth: { date: string; count: number }[];
  cohortData: CohortData[];
}

export interface TournamentMetrics {
  activeTournaments: number;
  completedTournaments: number;
  averageAttendance: number;
  completionRate: number;
  completionRateTrend: number;
  attendanceByFormat: { format: string; attendance: number }[];
  activityHeatmap: HeatmapCell[];
}
