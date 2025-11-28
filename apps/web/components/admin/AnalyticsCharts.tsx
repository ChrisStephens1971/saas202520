/**
 * AnalyticsCharts Component
 * Sprint 9 Phase 2 - Admin Analytics Dashboard
 *
 * Comprehensive chart components using Recharts v3.3.0:
 * - Line Chart: User growth, tournament trends
 * - Bar Chart: Matches per day, tournaments by type
 * - Pie Chart: User roles distribution, tournament status
 * - Area Chart: Revenue over time, engagement metrics
 */

'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Common chart colors
const CHART_COLORS = {
  primary: '#9333ea', // purple-600
  secondary: '#3b82f6', // blue-500
  success: '#10b981', // green-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  info: '#06b6d4', // cyan-500
};

const PIE_COLORS = [
  '#9333ea', // purple-600
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
];

// Custom tooltip style
const customTooltipStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  padding: '12px',
};

/**
 * User Growth Line Chart
 */
interface UserGrowthData {
  date: string;
  users: number;
  activeUsers?: number;
}

interface UserGrowthChartProps {
  data: UserGrowthData[];
  title?: string;
  showActiveUsers?: boolean;
}

export function UserGrowthChart({
  data,
  title = 'User Growth',
  showActiveUsers = false,
}: UserGrowthChartProps) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="date" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip contentStyle={customTooltipStyle} />
          <Legend />
          <Line
            type="monotone"
            dataKey="users"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS.primary, r: 4 }}
            activeDot={{ r: 6 }}
            name="Total Users"
          />
          {showActiveUsers && (
            <Line
              type="monotone"
              dataKey="activeUsers"
              stroke={CHART_COLORS.success}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.success, r: 4 }}
              activeDot={{ r: 6 }}
              name="Active Users"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Tournament Activity Bar Chart
 */
interface TournamentActivityData {
  date: string;
  created: number;
  completed: number;
  active?: number;
}

interface TournamentActivityChartProps {
  data: TournamentActivityData[];
  title?: string;
}

export function TournamentActivityChart({
  data,
  title = 'Tournament Activity',
}: TournamentActivityChartProps) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="date" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip contentStyle={customTooltipStyle} />
          <Legend />
          <Bar dataKey="created" fill={CHART_COLORS.primary} name="Created" />
          <Bar dataKey="completed" fill={CHART_COLORS.success} name="Completed" />
          {data[0]?.active !== undefined && (
            <Bar dataKey="active" fill={CHART_COLORS.info} name="Active" />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Match Completion Rates Pie Chart
 */
interface MatchStatusData {
  name: string;
  value: number;
}

interface MatchCompletionChartProps {
  data: MatchStatusData[];
  title?: string;
}

export function MatchCompletionChart({
  data,
  title = 'Match Status Distribution',
}: MatchCompletionChartProps) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data as any}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={customTooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Revenue Trends Area Chart
 */
interface RevenueData {
  date: string;
  revenue: number;
  subscriptions?: number;
  tournaments?: number;
}

interface RevenueTrendsChartProps {
  data: RevenueData[];
  title?: string;
  showBreakdown?: boolean;
}

export function RevenueTrendsChart({
  data,
  title = 'Revenue Trends',
  showBreakdown = false,
}: RevenueTrendsChartProps) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSubscriptions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.8} />
              <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="date" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip contentStyle={customTooltipStyle} />
          <Legend />
          {showBreakdown ? (
            <>
              <Area
                type="monotone"
                dataKey="subscriptions"
                stackId="1"
                stroke={CHART_COLORS.success}
                fill="url(#colorSubscriptions)"
                name="Subscriptions"
              />
              <Area
                type="monotone"
                dataKey="tournaments"
                stackId="1"
                stroke={CHART_COLORS.primary}
                fill="url(#colorRevenue)"
                name="Tournaments"
              />
            </>
          ) : (
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={CHART_COLORS.primary}
              fill="url(#colorRevenue)"
              name="Revenue"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Engagement Metrics Multi-Line Chart
 */
interface EngagementData {
  date: string;
  dau: number; // Daily Active Users
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
}

interface EngagementChartProps {
  data: EngagementData[];
  title?: string;
}

export function EngagementChart({ data, title = 'User Engagement' }: EngagementChartProps) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="date" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip contentStyle={customTooltipStyle} />
          <Legend />
          <Line
            type="monotone"
            dataKey="dau"
            stroke={CHART_COLORS.success}
            strokeWidth={2}
            name="Daily Active"
          />
          <Line
            type="monotone"
            dataKey="wau"
            stroke={CHART_COLORS.info}
            strokeWidth={2}
            name="Weekly Active"
          />
          <Line
            type="monotone"
            dataKey="mau"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            name="Monthly Active"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Tournament Format Distribution Pie Chart
 */
interface FormatDistributionData {
  format: string;
  count: number;
}

interface FormatDistributionChartProps {
  data: FormatDistributionData[];
  title?: string;
}

export function FormatDistributionChart({
  data,
  title = 'Tournament Format Distribution',
}: FormatDistributionChartProps) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data as any}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ format, percent }) => `${format}: ${((percent as number) * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={customTooltipStyle} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * System Performance Metrics Line Chart
 */
interface PerformanceData {
  timestamp: string;
  responseTime: number;
  errorRate: number;
  throughput?: number;
}

interface PerformanceChartProps {
  data: PerformanceData[];
  title?: string;
  metric?: 'responseTime' | 'errorRate' | 'throughput';
}

export function PerformanceChart({
  data,
  title = 'System Performance',
  metric = 'responseTime',
}: PerformanceChartProps) {
  const metricConfig = {
    responseTime: {
      name: 'Response Time (ms)',
      color: CHART_COLORS.primary,
    },
    errorRate: {
      name: 'Error Rate (%)',
      color: CHART_COLORS.danger,
    },
    throughput: {
      name: 'Throughput (req/s)',
      color: CHART_COLORS.success,
    },
  };

  const config = metricConfig[metric];

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="timestamp" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip contentStyle={customTooltipStyle} />
          <Legend />
          <Line
            type="monotone"
            dataKey={metric}
            stroke={config.color}
            strokeWidth={2}
            name={config.name}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * User Role Distribution Pie Chart
 */
interface RoleDistributionData {
  role: string;
  count: number;
}

interface RoleDistributionChartProps {
  data: RoleDistributionData[];
  title?: string;
}

export function RoleDistributionChart({
  data,
  title = 'User Role Distribution',
}: RoleDistributionChartProps) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data as any}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ role, percent }) => `${role}: ${((percent as number) * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={customTooltipStyle} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Matches Per Day Bar Chart
 */
interface MatchesPerDayData {
  date: string;
  matches: number;
  completed: number;
}

interface MatchesPerDayChartProps {
  data: MatchesPerDayData[];
  title?: string;
}

export function MatchesPerDayChart({ data, title = 'Matches Per Day' }: MatchesPerDayChartProps) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="date" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip contentStyle={customTooltipStyle} />
          <Legend />
          <Bar dataKey="matches" fill={CHART_COLORS.primary} name="Total Matches" />
          <Bar dataKey="completed" fill={CHART_COLORS.success} name="Completed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
