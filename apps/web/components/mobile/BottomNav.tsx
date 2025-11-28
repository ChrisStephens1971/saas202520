'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Trophy, Target, BarChart3, User, Menu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavTab {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  activeIcon: LucideIcon;
}

const navTabs: NavTab[] = [
  {
    id: 'tournaments',
    label: 'Tournaments',
    icon: Trophy,
    activeIcon: Trophy,
    path: '/tournaments',
  },
  {
    id: 'scoring',
    label: 'Scoring',
    icon: Target,
    activeIcon: Target,
    path: '/scoring',
  },
  {
    id: 'leaderboard',
    label: 'Leaders',
    icon: BarChart3,
    activeIcon: BarChart3,
    path: '/leaderboard',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    activeIcon: User,
    path: '/profile',
  },
  {
    id: 'more',
    label: 'More',
    icon: Menu,
    activeIcon: Menu,
    path: '/more',
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('tournaments');

  useEffect(() => {
    // Determine active tab based on pathname
    const currentTab = navTabs.find((tab) => pathname.startsWith(tab.path));
    if (currentTab) {
      setActiveTab(currentTab.id);
    }
  }, [pathname]);

  const handleTabClick = (tab: NavTab) => {
    // Haptic feedback (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    setActiveTab(tab.id);
    router.push(tab.path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 md:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex justify-around items-center h-16">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = isActive ? tab.activeIcon : tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <IconComponent
                className={`w-6 h-6 mb-1 transition-transform duration-200 ${
                  isActive ? 'scale-110' : 'scale-100'
                }`}
                aria-hidden="true"
              />
              <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
