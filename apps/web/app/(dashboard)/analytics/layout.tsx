/**
 * Analytics Layout
 * Layout wrapper for analytics pages
 */

import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics Dashboard | Tournament Platform',
  description: 'View detailed analytics for your tournament platform',
};

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
