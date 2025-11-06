/**
 * Admin Navigation Component
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Sidebar navigation for admin section with:
 * - Dashboard, Tournaments, Users, Analytics, Settings, Audit Logs
 * - Active route highlighting
 * - Responsive collapsible sidebar
 * - User profile dropdown
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

interface NavItem {
  name: string;
  href: string;
  icon: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: '📊',
    description: 'Overview and metrics',
  },
  {
    name: 'Tournaments',
    href: '/admin/tournaments',
    icon: '🏆',
    description: 'Manage tournaments',
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: '👥',
    description: 'User management',
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: '📈',
    description: 'Reports and insights',
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: '⚙️',
    description: 'System configuration',
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit',
    icon: '📝',
    description: 'Activity history',
  },
];

export function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin' || pathname === '/admin/dashboard';
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside
      className={`
        ${collapsed ? 'w-20' : 'w-64'}
        border-r border-gray-200 bg-white transition-all duration-300
        dark:bg-gray-800 dark:border-gray-700
        flex flex-col
      `}
    >
      {/* Logo and Toggle */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        {!collapsed && (
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span className="font-bold text-gray-900 dark:text-white">Admin</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="text-xl">{collapsed ? '→' : '←'}</span>
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
                    transition-colors
                    ${
                      active
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }
                  `}
                  title={collapsed ? item.name : undefined}
                >
                  <span className="text-xl">{item.icon}</span>
                  {!collapsed && (
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      {!active && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.description}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`
              flex w-full items-center gap-3 rounded-lg px-3 py-2
              hover:bg-gray-100 dark:hover:bg-gray-700
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
              {user.name?.[0] || user.email?.[0] || 'A'}
            </div>
            {!collapsed && (
              <div className="flex-1 text-left text-sm">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
              </div>
            )}
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && !collapsed && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-gray-200 bg-white shadow-lg dark:bg-gray-800 dark:border-gray-700">
              <Link
                href="/dashboard"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-t-lg"
                onClick={() => setShowUserMenu(false)}
              >
                🏠 Main Dashboard
              </Link>
              <Link
                href="/tournaments"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                onClick={() => setShowUserMenu(false)}
              >
                🏆 Tournaments
              </Link>
              <hr className="border-gray-200 dark:border-gray-700" />
              <Link
                href="/api/auth/signout"
                className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-b-lg"
                onClick={() => setShowUserMenu(false)}
              >
                🚪 Sign Out
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
