/**
 * Haptic Feedback Utility
 *
 * Provides cross-platform haptic feedback using the Vibration API.
 * Gracefully degrades on devices without haptic support.
 */

export type HapticFeedbackType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

export interface HapticPattern {
  vibrate: number[];
  description: string;
}

/**
 * Haptic feedback patterns
 * Format: [vibrate, pause, vibrate, pause, ...]
 */
const HAPTIC_PATTERNS: Record<HapticFeedbackType, HapticPattern> = {
  light: {
    vibrate: [10],
    description: 'Light tap feedback',
  },
  medium: {
    vibrate: [20],
    description: 'Medium tap feedback',
  },
  heavy: {
    vibrate: [40],
    description: 'Heavy tap feedback',
  },
  success: {
    vibrate: [10, 50, 10],
    description: 'Success confirmation',
  },
  warning: {
    vibrate: [20, 100, 20, 100, 20],
    description: 'Warning alert',
  },
  error: {
    vibrate: [50, 100, 50],
    description: 'Error alert',
  },
  selection: {
    vibrate: [5],
    description: 'Selection change',
  },
};

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return typeof window !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Check if user has enabled haptics in preferences
 */
export function isHapticEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  const preference = localStorage.getItem('haptic-enabled');
  // Default to true if not set
  return preference !== 'false';
}

/**
 * Set user's haptic preference
 */
export function setHapticEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('haptic-enabled', enabled.toString());
}

/**
 * Trigger haptic feedback
 */
export function triggerHaptic(type: HapticFeedbackType = 'light'): void {
  // Check if haptics are supported and enabled
  if (!isHapticSupported() || !isHapticEnabled()) {
    return;
  }

  const pattern = HAPTIC_PATTERNS[type];

  try {
    navigator.vibrate(pattern.vibrate);
  } catch (error) {
    console.warn('Haptic feedback failed:', error);
  }
}

/**
 * Cancel any ongoing haptic feedback
 */
export function cancelHaptic(): void {
  if (!isHapticSupported()) return;

  try {
    navigator.vibrate(0);
  } catch (error) {
    console.warn('Cancel haptic failed:', error);
  }
}

/**
 * Create a custom haptic pattern
 */
export function triggerCustomHaptic(pattern: number[]): void {
  if (!isHapticSupported() || !isHapticEnabled()) {
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    console.warn('Custom haptic feedback failed:', error);
  }
}

/**
 * Haptic feedback for game events
 */
export const gameHaptics = {
  scorePoint: () => triggerHaptic('light'),
  winGame: () => triggerHaptic('success'),
  loseGame: () => triggerHaptic('medium'),
  winMatch: () => triggerCustomHaptic([50, 100, 50, 100, 100]),
  loseMatch: () => triggerHaptic('error'),
  undo: () => triggerHaptic('medium'),
  buttonPress: () => triggerHaptic('light'),
  swipe: () => triggerHaptic('selection'),
  refresh: () => triggerHaptic('medium'),
  error: () => triggerHaptic('error'),
  warning: () => triggerHaptic('warning'),
};

/**
 * React hook for haptic feedback
 */
export function useHaptic() {
  const supported = isHapticSupported();
  const enabled = isHapticEnabled();

  return {
    supported,
    enabled,
    trigger: triggerHaptic,
    cancel: cancelHaptic,
    setEnabled: setHapticEnabled,
    game: gameHaptics,
  };
}
