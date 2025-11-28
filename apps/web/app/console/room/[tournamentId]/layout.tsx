/**
 * Room View Layout
 * Sprint 2 - TD Console Room View
 *
 * Layout wrapper for room view with PWA metadata
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Room View - TD Console',
  description: 'Tournament Director Console - Real-time room management',
  manifest: '/manifest.json',
  themeColor: '#7c3aed',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TD Console',
  },
  icons: {
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RoomViewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
