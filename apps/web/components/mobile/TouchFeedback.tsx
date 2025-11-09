'use client';

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic, HapticFeedbackType } from '@/lib/pwa/haptics';
import { cn } from '@/lib/utils';

export interface TouchFeedbackProps {
  children: React.ReactNode;
  onPress?: (e: React.MouseEvent | React.TouchEvent) => void;
  onLongPress?: (e: React.MouseEvent | React.TouchEvent) => void;
  hapticType?: HapticFeedbackType;
  disabled?: boolean;
  className?: string;
  pressScale?: number;
  showRipple?: boolean;
  longPressDuration?: number;
  preventDefault?: boolean;
}

interface RippleEffect {
  id: number;
  x: number;
  y: number;
}

/**
 * TouchFeedback Component
 *
 * Provides visual and haptic feedback for touch interactions.
 * Features:
 * - Visual ripple effect on tap
 * - Haptic feedback (vibration)
 * - Scale animation on press
 * - Long-press detection
 * - Disabled state handling
 *
 * Accessibility:
 * - WCAG 2.1 compliant touch targets (≥44x44px)
 * - Non-haptic visual feedback
 * - Screen reader support
 * - Keyboard navigation
 */
export function TouchFeedback({
  children,
  onPress,
  onLongPress,
  hapticType = 'light',
  disabled = false,
  className,
  pressScale = 0.95,
  showRipple = true,
  longPressDuration = 500,
  preventDefault = true
}: TouchFeedbackProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<RippleEffect[]>();
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handlePressStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      if (preventDefault) {
        e.preventDefault();
      }

      setIsPressed(true);

      // Trigger haptic feedback
      triggerHaptic(hapticType);

      // Create ripple effect
      if (showRipple) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = 'touches' in e
          ? e.touches[0].clientX - rect.left
          : e.clientX - rect.left;
        const y = 'touches' in e
          ? e.touches[0].clientY - rect.top
          : e.clientY - rect.top;

        const newRipple: RippleEffect = {
          id: Date.now(),
          x,
          y
        };

        setRipples((prev) => [...(prev || []), newRipple]);

        // Remove ripple after animation
        setTimeout(() => {
          setRipples((prev) => prev?.filter((r) => r.id !== newRipple.id));
        }, 600);
      }

      // Start long-press timer
      if (onLongPress) {
        const timer = setTimeout(() => {
          onLongPress(e);
          triggerHaptic('medium');
          setIsPressed(false);
        }, longPressDuration);
        setLongPressTimer(timer);
      }
    },
    [disabled, hapticType, showRipple, onLongPress, longPressDuration, preventDefault]
  );

  const handlePressEnd = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      setIsPressed(false);

      // Cancel long-press timer
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);

        // Only trigger onPress if long-press wasn't activated
        if (onPress) {
          onPress(e);
        }
      } else if (onPress && !onLongPress) {
        onPress(e);
      }
    },
    [disabled, longPressTimer, onPress, onLongPress]
  );

  const handlePressCancel = useCallback(() => {
    setIsPressed(false);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (onPress) {
          triggerHaptic(hapticType);
          // Cast keyboard event to match onPress handler signature
          onPress(e as unknown as React.MouseEvent | React.TouchEvent);
        }
      }
    },
    [disabled, onPress, hapticType]
  );

  return (
    <motion.div
      className={cn(
        'relative inline-block cursor-pointer select-none',
        'touch-manipulation', // Prevent touch delays
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      style={{
        minWidth: '44px',
        minHeight: '44px',
        WebkitTapHighlightColor: 'transparent' // Remove default tap highlight
      }}
      animate={{
        scale: isPressed ? pressScale : 1
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30
      }}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressCancel}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressCancel}
      onKeyDown={handleKeyPress}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-disabled={disabled}
      aria-pressed={isPressed}
    >
      {children}

      {/* Ripple Effect */}
      {showRipple && (
        <AnimatePresence>
          {ripples?.map((ripple) => (
            <motion.span
              key={ripple.id}
              className="absolute pointer-events-none rounded-full bg-white/30"
              style={{
                left: ripple.x,
                top: ripple.y
              }}
              initial={{
                width: 0,
                height: 0,
                x: 0,
                y: 0,
                opacity: 1
              }}
              animate={{
                width: 200,
                height: 200,
                x: -100,
                y: -100,
                opacity: 0
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.6,
                ease: 'easeOut'
              }}
            />
          ))}
        </AnimatePresence>
      )}

      {/* Press State Overlay */}
      <AnimatePresence>
        {isPressed && (
          <motion.div
            className="absolute inset-0 bg-black/10 rounded-[inherit] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default TouchFeedback;
