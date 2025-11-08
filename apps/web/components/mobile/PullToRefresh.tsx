'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  className?: string;
}

export default function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  className = '',
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [_touchStart, setTouchStart] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at top of page
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        setTouchStart(startY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing || startY === 0) return;

      currentY = e.touches[0].clientY;
      const distance = currentY - startY;

      // Only pull down
      if (distance > 0 && window.scrollY === 0) {
        // Add resistance
        const resistedDistance = Math.min(distance / 2, threshold * 1.5);
        setPullDistance(resistedDistance);

        // Prevent page scroll
        if (resistedDistance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > threshold && !isRefreshing) {
        setIsRefreshing(true);

        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(20);
        }

        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }

      setTouchStart(0);
    };

    container.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  const refreshProgress = Math.min((pullDistance / threshold) * 100, 100);
  const showRefreshIndicator = pullDistance > 0 || isRefreshing;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Refresh Indicator */}
      {showRefreshIndicator && (
        <div
          className="absolute top-0 left-0 right-0 z-50 flex justify-center items-center transition-all duration-200"
          style={{
            transform: `translateY(${isRefreshing ? '60px' : `${pullDistance}px`})`,
            opacity: isRefreshing ? 1 : Math.min(pullDistance / threshold, 1),
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg p-3">
            {isRefreshing ? (
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400 transition-transform"
                style={{
                  transform: `rotate(${refreshProgress * 3.6}deg)`,
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: `translateY(${isRefreshing ? '60px' : '0'})`,
          transition: isRefreshing ? 'transform 0.2s' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
