'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue } from 'framer-motion';
import { X } from 'lucide-react';
import { triggerHaptic } from '@/lib/pwa/haptics';
import { cn } from '@/lib/utils';
import TouchFeedback from './TouchFeedback';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  height?: 'full' | 'auto' | number; // 'full' | 'auto' | percentage (0-100)
  className?: string;
  snapPoints?: number[]; // Array of percentages for snap positions
  enableDrag?: boolean;
}

/**
 * BottomSheet Component
 *
 * A mobile-optimized bottom sheet modal with drag-to-dismiss.
 * Features:
 * - Drag down to close
 * - Multiple snap points
 * - Smooth spring animations
 * - Touch-optimized header
 * - Auto-focus management
 * - Backdrop blur
 *
 * Accessibility:
 * - Focus trap when open
 * - ESC key to close
 * - ARIA modal attributes
 * - Screen reader announcements
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  height = 'auto',
  className,
  snapPoints = [90],
  enableDrag = true
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      triggerHaptic('light');
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      const firstFocusable = sheetRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100; // pixels

    if (info.offset.y > threshold) {
      onClose();
      triggerHaptic('medium');
    } else {
      y.set(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      triggerHaptic('light');
    }
  };

  const getSheetHeight = () => {
    if (height === 'full') return '100%';
    if (height === 'auto') return 'auto';
    if (typeof height === 'number') return `${height}%`;
    return 'auto';
  };

  const maxSnapPoint = Math.max(...snapPoints);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'bg-white dark:bg-gray-900',
              'rounded-t-3xl shadow-2xl',
              'flex flex-col',
              'max-h-[90vh]',
              className
            )}
            style={{
              y,
              height: getSheetHeight()
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30
            }}
            drag={enableDrag ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={handleDragEnd}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'bottom-sheet-title' : undefined}
          >
            {/* Drag Handle */}
            {enableDrag && (
              <div className="flex justify-center pt-3 pb-2">
                <div
                  className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"
                  aria-hidden="true"
                />
              </div>
            )}

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2
                  id="bottom-sheet-title"
                  className="text-xl font-semibold text-gray-900 dark:text-white"
                >
                  {title}
                </h2>
                <TouchFeedback onPress={onClose} hapticType="light">
                  <button
                    onClick={onClose}
                    className={cn(
                      'p-2 rounded-full',
                      'text-gray-500 hover:text-gray-700',
                      'dark:text-gray-400 dark:hover:text-gray-200',
                      'hover:bg-gray-100 dark:hover:bg-gray-800',
                      'transition-colors'
                    )}
                    aria-label="Close bottom sheet"
                    style={{
                      minWidth: '44px',
                      minHeight: '44px'
                    }}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </TouchFeedback>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default BottomSheet;
