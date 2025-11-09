/**
 * Console Layout
 * Sprint 2 - TD Console
 *
 * Layout wrapper for all console pages
 * Optimized for Tournament Director workflows
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | TD Console',
    default: 'TD Console',
  },
  description: 'Tournament Director Console - Manage tournaments in real-time',
};

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="console-layout">
      {children}
    </div>
  );
}
