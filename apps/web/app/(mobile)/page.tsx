'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Users, Calendar, Settings, Plus, Heart, Share } from 'lucide-react';
import {
  TouchFeedback,
  SwipeableCard,
  BottomSheet,
  TouchOptimizedButton,
  triggerHaptic,
} from '@/components/mobile';

/**
 * Mobile Home Page
 *
 * Showcase and testing page for mobile UI components.
 * Demonstrates all touch-optimized components with interactive examples.
 */
export default function MobileHomePage() {
  const router = useRouter();
  const [showSheet, setShowSheet] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const demoCards = [
    {
      id: 'tournaments',
      title: 'Tournaments',
      icon: <Trophy className="w-6 h-6" />,
      description: 'View and manage tournaments',
      path: '/tournaments',
    },
    {
      id: 'scoring',
      title: 'Score Match',
      icon: <Plus className="w-6 h-6" />,
      description: 'Touch-optimized scorer',
      path: '/scoring',
    },
    {
      id: 'players',
      title: 'Players',
      icon: <Users className="w-6 h-6" />,
      description: 'Player profiles and stats',
      path: '/players',
    },
    {
      id: 'schedule',
      title: 'Schedule',
      icon: <Calendar className="w-6 h-6" />,
      description: 'Upcoming matches and events',
      path: '/schedule',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pool Tournaments</h1>
            <TouchFeedback onPress={() => router.push('/settings')}>
              <div className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
            </TouchFeedback>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Touch-optimized mobile interface
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <TouchFeedback onPress={() => triggerHaptic('light')}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">12</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Tournaments</div>
            </div>
          </TouchFeedback>

          <TouchFeedback onPress={() => triggerHaptic('light')}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">48</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Players</div>
            </div>
          </TouchFeedback>
        </div>

        {/* Navigation Cards with Swipe Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quick Access</h2>
          <div className="space-y-3">
            {demoCards.map((card) => (
              <SwipeableCard
                key={card.id}
                leftAction={{
                  icon: <Heart className="w-5 h-5" />,
                  label: 'Favorite',
                  color: '#ef4444',
                  onAction: () => {
                    triggerHaptic('success');
                  },
                  haptic: 'medium',
                }}
                rightAction={{
                  icon: <Share className="w-5 h-5" />,
                  label: 'Share',
                  color: '#3b82f6',
                  onAction: () => {
                    triggerHaptic('success');
                  },
                  haptic: 'medium',
                }}
              >
                <TouchFeedback
                  onPress={() => {
                    setSelectedDemo(card.id);
                    setShowSheet(true);
                  }}
                  hapticType="light"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        {card.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {card.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </TouchFeedback>
              </SwipeableCard>
            ))}
          </div>
        </div>

        {/* Component Demonstrations */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Component Examples
          </h2>

          {/* Button Variants */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Touch-Optimized Buttons
            </h3>

            <TouchOptimizedButton
              fullWidth
              variant="primary"
              size="lg"
              onClick={() => triggerHaptic('medium')}
              icon={<Plus className="w-5 h-5" />}
            >
              Primary Action
            </TouchOptimizedButton>

            <TouchOptimizedButton
              fullWidth
              variant="secondary"
              size="md"
              onClick={() => triggerHaptic('light')}
            >
              Secondary Action
            </TouchOptimizedButton>

            <div className="grid grid-cols-2 gap-2">
              <TouchOptimizedButton
                fullWidth
                variant="success"
                size="sm"
                onClick={() => triggerHaptic('success')}
              >
                Success
              </TouchOptimizedButton>

              <TouchOptimizedButton
                fullWidth
                variant="danger"
                size="sm"
                onClick={() => triggerHaptic('error')}
              >
                Danger
              </TouchOptimizedButton>
            </div>
          </div>

          {/* Touch Feedback Demo */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm mt-3">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              Touch Feedback Examples
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <TouchFeedback onPress={() => {}} hapticType="light">
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 text-center">
                  <div className="text-2xl">👆</div>
                  <div className="text-xs mt-1 text-gray-700 dark:text-gray-300">Light</div>
                </div>
              </TouchFeedback>

              <TouchFeedback onPress={() => {}} hapticType="medium">
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 text-center">
                  <div className="text-2xl">👆</div>
                  <div className="text-xs mt-1 text-gray-700 dark:text-gray-300">Medium</div>
                </div>
              </TouchFeedback>

              <TouchFeedback onPress={() => {}} hapticType="heavy">
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 text-center">
                  <div className="text-2xl">👆</div>
                  <div className="text-xs mt-1 text-gray-700 dark:text-gray-300">Heavy</div>
                </div>
              </TouchFeedback>
            </div>
          </div>

          {/* Swipe Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mt-3">
            <div className="text-sm text-blue-900 dark:text-blue-300">
              <div className="font-medium mb-2">💡 Pro Tips:</div>
              <ul className="space-y-1 text-xs">
                <li>• Swipe cards left/right to see actions</li>
                <li>• Long-press for additional options</li>
                <li>• All buttons provide haptic feedback</li>
                <li>• Works best on touch devices</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet Demo */}
      <BottomSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        title={demoCards.find((c) => c.id === selectedDemo)?.title || 'Details'}
        height={60}
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {demoCards.find((c) => c.id === selectedDemo)?.description}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
              <div className="font-medium text-gray-900 dark:text-white">Active</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Updated</div>
              <div className="font-medium text-gray-900 dark:text-white">Just now</div>
            </div>
          </div>

          <div className="space-y-2">
            <TouchOptimizedButton
              fullWidth
              variant="primary"
              onClick={() => {
                const path = demoCards.find((c) => c.id === selectedDemo)?.path;
                if (path) router.push(path);
              }}
            >
              Open
            </TouchOptimizedButton>
            <TouchOptimizedButton fullWidth variant="secondary" onClick={() => setShowSheet(false)}>
              Close
            </TouchOptimizedButton>
          </div>
        </div>
      </BottomSheet>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-20">
        <TouchOptimizedButton
          variant="primary"
          size="lg"
          onClick={() => {
            triggerHaptic('medium');
            router.push('/scoring');
          }}
          icon={<Plus className="w-7 h-7" />}
          className="rounded-full shadow-2xl w-16 h-16 p-0"
          ariaLabel="Start new match"
        />
      </div>
    </div>
  );
}
