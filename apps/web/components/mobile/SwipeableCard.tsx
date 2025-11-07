'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { triggerHaptic } from '@/lib/pwa/haptics';
import { cn } from '@/lib/utils';

export interface SwipeAction {
  icon?: React.ReactNode;
  label: string;
  color: string;
  onAction: () => void;
  haptic?: 'light' | 'medium' | 'heavy';
}

export interface SwipeableCardProps {
  children: React.ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Percentage (0-1) of card width to trigger action
  disabled?: boolean;
  className?: string;
  enableVerticalSwipe?: boolean;
}

/**
 * SwipeableCard Component
 *
 * A card with swipe gesture support for navigation and actions.
 * Features:
 * - Swipe left/right for actions (delete, archive, etc.)
 * - Swipe up for details
 * - Swipe down to refresh
 * - Spring animations with framer-motion
 * - Threshold detection (30% swipe = action)
 * - Visual feedback with color overlay
 *
 * Accessibility:
 * - Alternative buttons for actions (non-swipe)
 * - Screen reader announcements
 * - Keyboard navigation support
 */
export function SwipeableCard({
  children,
  leftAction,
  rightAction,
  onSwipeUp,
  onSwipeDown,
  threshold = 0.3,
  disabled = false,
  className,
  enableVerticalSwipe = false
}: SwipeableCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [actionTriggered, setActionTriggered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Motion values for drag
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Transform values for action indicators
  const leftActionOpacity = useTransform(x, [0, 100], [0, 1]);
  const rightActionOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragStart = () => {
    if (disabled) return;
    setIsDragging(true);
    setActionTriggered(false);
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled || !cardRef.current) return;

    const cardWidth = cardRef.current.offsetWidth;
    const swipeThreshold = cardWidth * threshold;
    const dragDistance = Math.abs(info.offset.x);

    // Trigger haptic feedback when crossing threshold
    if (dragDistance > swipeThreshold && !actionTriggered) {
      if (info.offset.x > 0 && leftAction) {
        triggerHaptic(leftAction.haptic || 'medium');
        setActionTriggered(true);
      } else if (info.offset.x < 0 && rightAction) {
        triggerHaptic(rightAction.haptic || 'medium');
        setActionTriggered(true);
      }
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled || !cardRef.current) return;

    const cardWidth = cardRef.current.offsetWidth;
    const cardHeight = cardRef.current.offsetHeight;
    const swipeThreshold = cardWidth * threshold;
    const verticalThreshold = cardHeight * 0.2;

    setIsDragging(false);

    // Check horizontal swipe
    if (Math.abs(info.offset.x) > swipeThreshold) {
      if (info.offset.x > 0 && leftAction) {
        // Swipe right
        leftAction.onAction();
        triggerHaptic('success');
      } else if (info.offset.x < 0 && rightAction) {
        // Swipe left
        rightAction.onAction();
        triggerHaptic('success');
      }
    }

    // Check vertical swipe
    if (enableVerticalSwipe) {
      if (info.offset.y < -verticalThreshold && onSwipeUp) {
        onSwipeUp();
        triggerHaptic('light');
      } else if (info.offset.y > verticalThreshold && onSwipeDown) {
        onSwipeDown();
        triggerHaptic('light');
      }
    }

    // Reset position
    x.set(0);
    y.set(0);
  };

  return (
    <div
      ref={cardRef}
      className={cn('relative overflow-hidden', className)}
      style={{
        touchAction: enableVerticalSwipe ? 'pan-y' : 'pan-x'
      }}
    >
      {/* Left Action Indicator */}
      {leftAction && (
        <motion.div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center justify-start px-6 z-0',
            'pointer-events-none'
          )}
          style={{
            opacity: leftActionOpacity,
            backgroundColor: leftAction.color
          }}
        >
          <div className="flex items-center gap-2 text-white">
            {leftAction.icon}
            <span className="font-medium">{leftAction.label}</span>
          </div>
        </motion.div>
      )}

      {/* Right Action Indicator */}
      {rightAction && (
        <motion.div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end px-6 z-0',
            'pointer-events-none'
          )}
          style={{
            opacity: rightActionOpacity,
            backgroundColor: rightAction.color
          }}
        >
          <div className="flex items-center gap-2 text-white">
            <span className="font-medium">{rightAction.label}</span>
            {rightAction.icon}
          </div>
        </motion.div>
      )}

      {/* Draggable Card Content */}
      <motion.div
        className={cn(
          'relative z-10 bg-white dark:bg-gray-800',
          isDragging && 'cursor-grabbing',
          !disabled && 'cursor-grab'
        )}
        style={{ x, y }}
        drag={disabled ? false : enableVerticalSwipe ? true : 'x'}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={{
          left: rightAction ? 0.2 : 0,
          right: leftAction ? 0.2 : 0,
          top: onSwipeUp ? 0.1 : 0,
          bottom: onSwipeDown ? 0.1 : 0
        }}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30
        }}
      >
        {children}
      </motion.div>

      {/* Screen Reader Actions */}
      <div className="sr-only">
        {leftAction && (
          <button
            onClick={leftAction.onAction}
            aria-label={leftAction.label}
          >
            {leftAction.label}
          </button>
        )}
        {rightAction && (
          <button
            onClick={rightAction.onAction}
            aria-label={rightAction.label}
          >
            {rightAction.label}
          </button>
        )}
      </div>
    </div>
  );
}

export default SwipeableCard;
