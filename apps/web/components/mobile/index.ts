/**
 * Mobile UI Components
 *
 * Touch-optimized components with haptic feedback and swipe gestures.
 * Sprint 10 Week 4 - Agent 2: Mobile UI Components
 */

export { TouchFeedback } from './TouchFeedback';
export type { TouchFeedbackProps } from './TouchFeedback';

export { SwipeableCard } from './SwipeableCard';
export type { SwipeableCardProps, SwipeAction } from './SwipeableCard';

export { BottomSheet } from './BottomSheet';
export type { BottomSheetProps } from './BottomSheet';

export { TouchOptimizedButton } from './TouchOptimizedButton';
export type { TouchOptimizedButtonProps } from './TouchOptimizedButton';

// Re-export haptics utilities
export {
  triggerHaptic,
  cancelHaptic,
  triggerCustomHaptic,
  gameHaptics,
  useHaptic,
  isHapticSupported,
  isHapticEnabled,
  setHapticEnabled,
} from '@/lib/pwa/haptics';

export type { HapticFeedbackType } from '@/lib/pwa/haptics';
