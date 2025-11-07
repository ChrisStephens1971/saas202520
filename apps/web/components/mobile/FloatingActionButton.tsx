'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface FABAction {
  icon: string;
  label: string;
  onClick: () => void;
  ariaLabel: string;
}

interface FABProps {
  className?: string;
}

export default function FloatingActionButton({ className = '' }: FABProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [action, setAction] = useState<FABAction | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Define context-aware actions based on current page
  useEffect(() => {
    let currentAction: FABAction | null = null;

    if (pathname.startsWith('/tournaments')) {
      if (pathname === '/tournaments') {
        currentAction = {
          icon: '➕',
          label: 'New Tournament',
          ariaLabel: 'Create new tournament',
          onClick: () => router.push('/tournaments/create'),
        };
      } else if (pathname.includes('/bracket')) {
        currentAction = {
          icon: '🎯',
          label: 'Record Score',
          ariaLabel: 'Record match score',
          onClick: () => {
            // Extract tournament ID from path and open scoring modal
            const tournamentId = pathname.split('/')[2];
            router.push(`/scoring/${tournamentId}`);
          },
        };
      }
    } else if (pathname.startsWith('/scoring')) {
      currentAction = {
        icon: '📝',
        label: 'Quick Score',
        ariaLabel: 'Quick score entry',
        onClick: () => {
          // Trigger quick score modal
          window.dispatchEvent(new CustomEvent('openQuickScore'));
        },
      };
    } else if (pathname.startsWith('/leaderboard')) {
      currentAction = {
        icon: '🔄',
        label: 'Refresh',
        ariaLabel: 'Refresh leaderboard',
        onClick: () => {
          window.location.reload();
        },
      };
    }

    setAction(currentAction);
  }, [pathname, router]);

  // Hide FAB on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  if (!action) {
    return null;
  }

  const handleClick = () => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }

    action.onClick();
  };

  return (
    <button
      onClick={handleClick}
      aria-label={action.ariaLabel}
      className={`fixed z-40 transition-all duration-300 ease-in-out ${
        isVisible
          ? 'bottom-20 opacity-100 translate-y-0'
          : 'bottom-16 opacity-0 translate-y-4'
      } right-4 w-14 h-14 bg-blue-600 dark:bg-blue-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 flex items-center justify-center md:hidden ${className}`}
      style={{
        marginBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <span className="text-2xl" aria-hidden="true">
        {action.icon}
      </span>
      <span className="sr-only">{action.label}</span>
    </button>
  );
}
