'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import TouchFeedback from './TouchFeedback';
import { HapticFeedbackType } from '@/lib/pwa/haptics';

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
}

const variantStyles = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md active:shadow-lg',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white shadow-md active:shadow-lg',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md active:shadow-lg',
  ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm min-h-[44px]',
  md: 'px-6 py-3 text-base min-h-[48px]',
  lg: 'px-8 py-4 text-lg min-h-[56px]'
};

/**
 * TouchOptimizedButton Component
 *
 * A button optimized for touch interfaces with haptic feedback.
 * Features:
 * - WCAG 2.1 compliant touch targets (≥44x44px)
 * - Haptic feedback on press
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
  ariaLabel
}: TouchOptimizedButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchFeedback
      onPress={onClick}
      disabled={isDisabled}
      hapticType={hapticType}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'font-medium rounded-lg',
        'transition-all duration-200',
        'focus:outline-none focus:ring-4 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
    >
      <button
        disabled={isDisabled}
        className="flex items-center justify-center gap-2 w-full h-full"
        aria-label={ariaLabel}
        aria-busy={loading}
        type="button"
      >
        {loading && (
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        )}

        {!loading && icon && iconPosition === 'left' && (
          <span aria-hidden="true">{icon}</span>
        )}

        <span>{children}</span>

        {!loading && icon && iconPosition === 'right' && (
          <span aria-hidden="true">{icon}</span>
        )}
      </button>
    </TouchFeedback>
  );
}

export default TouchOptimizedButton;
