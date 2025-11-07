'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/mobile/BottomNav';
import FloatingActionButton from '@/components/mobile/FloatingActionButton';

interface MobileLayoutProps {
  children: ReactNode;
}

/**
 * Mobile Layout Component
 *
 * Provides mobile-specific layout with:
 * - Bottom navigation bar
 * - Floating action button
 * - Safe area insets for notched devices
 * - No top navigation on mobile (<768px)
 *
 * Sprint 10 Week 4 - Mobile Navigation & Performance
 */
export default function MobileLayout({ children }: MobileLayoutProps) {
  const pathname = usePathname();

  // Determine if we should show mobile UI
  // eslint-disable-next-line no-undef, @typescript-eslint/no-unused-vars
  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 768;

  // Paths where we don't show bottom nav (e.g., auth pages)
  const hideBottomNav = pathname.startsWith('/auth') || pathname.startsWith('/onboarding');

  return (
    <div className="mobile-layout">
      {/* Main content area with padding for bottom nav */}
      <main
        className={`min-h-screen ${!hideBottomNav ? 'pb-20 md:pb-0' : ''}`}
        style={{
          paddingBottom: !hideBottomNav ? 'calc(5rem + env(safe-area-inset-bottom))' : undefined,
        }}
      >
        {children}
      </main>

      {/* Bottom Navigation (Mobile only) */}
      {!hideBottomNav && <BottomNav />}

      {/* Floating Action Button (Mobile only) */}
      {!hideBottomNav && <FloatingActionButton />}

      <style jsx global>{`
        /* Mobile-specific styles */
        @media (max-width: 768px) {
          body {
            /* Safe area insets for notched devices */
            padding-top: env(safe-area-inset-top);
            padding-left: env(safe-area-inset-left);
            padding-right: env(safe-area-inset-right);
          }

          /* Hide desktop navigation */
          .desktop-nav {
            display: none;
          }

          /* Optimize touch targets */
          button,
          a {
            min-height: 44px;
            min-width: 44px;
          }

          /* Improve tap responsiveness */
          * {
            -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
            touch-action: manipulation;
          }

          /* Prevent text selection on double-tap */
          .no-select {
            -webkit-user-select: none;
            user-select: none;
          }
        }

        /* Tablet breakpoint */
        @media (min-width: 640px) and (max-width: 1024px) {
          /* Hybrid navigation for tablets */
          .mobile-layout {
            display: grid;
            grid-template-columns: 200px 1fr;
          }

          .desktop-nav {
            display: block;
          }

          /* Bottom nav visible but simplified */
          .bottom-nav {
            display: flex;
            justify-content: space-around;
          }
        }

        /* Desktop - hide mobile UI */
        @media (min-width: 1024px) {
          .bottom-nav,
          .floating-action-button {
            display: none;
          }

          .desktop-nav {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
