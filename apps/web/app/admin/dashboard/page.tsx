/**
 * Admin Dashboard Home Page
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Overview dashboard showing:
 * - Key metrics (total users, tournaments, active matches)
 * - Quick links to main admin sections
 * - Recent activity
 */

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  Users,
  Trophy,
  Target,
  Circle,
  Zap,
  CheckCircle,
  TrendingUp,
  Settings,
  FileText,
  Home,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  href?: string;
}

function MetricCard({ title, value, icon: Icon, description, href }: MetricCardProps) {
  const content = (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {description && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        <Icon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

interface QuickLinkProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

function QuickLink({ title, description, icon: Icon, href }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-blue-500 hover:shadow-md dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-500"
    >
      <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500 mt-0.5" />
      <div>
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </Link>
  );
}

async function getAdminMetrics(orgId: string) {
  // Get counts for key metrics
  const [
    totalUsers,
    totalTournaments,
    activeTournaments,
    totalMatches,
    activeMatches,
    totalPlayers,
  ] = await Promise.all([
    prisma.organizationMember.count({
      where: { orgId },
    }),
    prisma.tournament.count({
      where: { orgId },
    }),
    prisma.tournament.count({
      where: {
        orgId,
        status: { in: ['registration', 'active'] },
      },
    }),
    prisma.match.count({
      where: {
        tournament: { orgId },
      },
    }),
    prisma.match.count({
      where: {
        tournament: { orgId },
        state: 'active',
      },
    }),
    prisma.player.count({
      where: {
        tournament: { orgId },
      },
    }),
  ]);

  return {
    totalUsers,
    totalTournaments,
    activeTournaments,
    totalMatches,
    activeMatches,
    totalPlayers,
  };
}

async function getRecentActivity(orgId: string) {
  // Get recent tournaments
  const recentTournaments = await prisma.tournament.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      name: true,
      status: true,
      format: true,
      createdAt: true,
    },
  });

  return { recentTournaments };
}

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user?.orgId) {
    return <div>No organization selected</div>;
  }

  const metrics = await getAdminMetrics(session.user.orgId);
  const activity = await getRecentActivity(session.user.orgId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          System metrics and quick access to admin functions
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers}
          icon={Users}
          description="Organization members"
          href="/admin/users"
        />
        <MetricCard
          title="Total Tournaments"
          value={metrics.totalTournaments}
          icon={Trophy}
          description={`${metrics.activeTournaments} active`}
          href="/admin/tournaments"
        />
        <MetricCard
          title="Total Players"
          value={metrics.totalPlayers}
          icon={Target}
          description="Across all tournaments"
        />
        <MetricCard
          title="Total Matches"
          value={metrics.totalMatches}
          icon={Circle}
          description={`${metrics.activeMatches} in progress`}
        />
        <MetricCard
          title="Active Tournaments"
          value={metrics.activeTournaments}
          icon={Zap}
          description="Currently running"
          href="/admin/tournaments?status=active"
        />
        <MetricCard
          title="System Status"
          value="✓"
          icon={CheckCircle}
          description="All systems operational"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            title="Manage Tournaments"
            description="View, edit, and configure tournaments"
            icon={Trophy}
            href="/admin/tournaments"
          />
          <QuickLink
            title="User Management"
            description="Add, remove, and manage user roles"
            icon={Users}
            href="/admin/users"
          />
          <QuickLink
            title="View Analytics"
            description="Reports, insights, and data analysis"
            icon={TrendingUp}
            href="/admin/analytics"
          />
          <QuickLink
            title="System Settings"
            description="Configure organization settings"
            icon={Settings}
            href="/admin/settings"
          />
          <QuickLink
            title="Audit Logs"
            description="View system activity and changes"
            icon={FileText}
            href="/admin/audit"
          />
          <QuickLink
            title="Back to Main"
            description="Return to main dashboard"
            icon={Home}
            href="/dashboard"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Recent Tournaments</h3>
        <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
          {activity.recentTournaments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p>No tournaments yet</p>
              <Link
                href="/tournaments/new"
                className="mt-4 inline-block text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Create your first tournament →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {activity.recentTournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/tournaments/${tournament.id}`}
                  className="block p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {tournament.name}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {tournament.format.replace('_', ' ')} •{' '}
                        {new Date(tournament.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`
                        rounded-full px-3 py-1 text-xs font-medium
                        ${
                          tournament.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : tournament.status === 'registration'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : tournament.status === 'completed'
                                ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }
                      `}
                    >
                      {tournament.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
