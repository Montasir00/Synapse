/**
 * Haptic Feedback Utility
 * Provides subtle physical feedback for mobile users.
 * Silently fails if device does not support Vibration API.
 */
export const haptics = {
  /** Subtle 10ms 'thump' for successful light actions (toggling a task) */
  light: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  /** 20ms pulse for medium actions (saving a form) */
  medium: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  },

  /** Two short 10ms pulses for destructive/heavy actions (deleting) */
  heavy: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  /** Error sequence: short-long-short */
  error: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([10, 30, 40, 30, 10]);
    }
  }
};
