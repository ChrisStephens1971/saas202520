'use client';

import React, { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { triggerHaptic, HapticFeedbackType } from '@/lib/pwa/haptics';

export interface TouchOptimizedButtonProps {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  hapticType?: HapticFeedbackType;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  ariaLabel?: string;
  type?: 'button' | 'submit' | 'reset';
}

interface RippleEffect {
  id: number;
  x: number;
  y: number;
}

const variantStyles = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md active:shadow-lg',
  secondary:
    'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white shadow-md active:shadow-lg',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md active:shadow-lg',
  ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm min-h-[44px]',
  md: 'px-6 py-3 text-base min-h-[48px]',
  lg: 'px-8 py-4 text-lg min-h-[56px]',
};

/**
 * TouchOptimizedButton Component
 *
 * A button optimized for touch interfaces with haptic feedback.
 * Features:
 * - WCAG 2.1 compliant touch targets (≥44x44px)
 * - Haptic feedback on press
 * - Visual ripple effect
 * - Loading states
 * - Multiple variants and sizes
 * - Icon support
 * - Full-width option
 *
 * Accessibility:
 * - Proper ARIA labels
 * - Disabled state management
 * - Keyboard navigation
 * - Screen reader support
 */
export function TouchOptimizedButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  className,
  hapticType = 'light',
  icon,
  iconPosition = 'left',
  ariaLabel,
  type = 'button',
}: TouchOptimizedButtonProps) {
  const isDisabled = disabled || loading;
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<RippleEffect[]>([]);

  const handlePress = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
      if (isDisabled) return;

      // Trigger haptic feedback
      triggerHaptic(hapticType);

      // Create ripple effect
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

      const newRipple: RippleEffect = {
        id: Date.now(),
        x,
        y,
      };

      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);

      // Call onClick handler
      if (onClick) {
        onClick(e);
      }
    },
    [isDisabled, hapticType, onClick]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (isDisabled) return;

      if (e.key === 'Enter' || e.key === ' ') {
        triggerHaptic(hapticType);
      }
    },
    [isDisabled, hapticType]
  );

  const MotionButton = motion.button;

  return (
    <MotionButton
      type={type}
      disabled={isDisabled}
      onClick={handlePress}
      onKeyDown={handleKeyPress}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      animate={{
        scale: isPressed ? 0.95 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 overflow-hidden',
        'font-medium rounded-lg',
        'transition-all duration-200',
        'focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-blue-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'touch-manipulation select-none',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      style={{
        minWidth: '44px',
        minHeight: '44px',
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {/* Content */}
      {loading && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}

      {!loading && icon && iconPosition === 'left' && <span aria-hidden="true">{icon}</span>}

      <span>{children}</span>

      {!loading && icon && iconPosition === 'right' && <span aria-hidden="true">{icon}</span>}

      {/* Ripple Effect */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute pointer-events-none rounded-full bg-white/30"
            style={{
              left: ripple.x,
              top: ripple.y,
            }}
            initial={{
              width: 0,
              height: 0,
              x: 0,
              y: 0,
              opacity: 1,
            }}
            animate={{
              width: 200,
              height: 200,
              x: -100,
              y: -100,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.6,
              ease: 'easeOut',
            }}
          />
        ))}
      </AnimatePresence>

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
    </MotionButton>
  );
}

export default TouchOptimizedButton;
