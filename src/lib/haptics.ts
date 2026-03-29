/**
 * Haptic feedback utility for Elite Growth Logbook.
 * Uses the Web Vibration API to simulate iOS Taptic Engine patterns.
 */
export const haptics = {
  /**
   * Light tap for single increments or subtle feedback.
   */
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium thud for successful actions or reaching targets.
   */
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  },

  /**
   * Heavy impact for errors or critical warnings.
   */
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([40, 20, 40]);
    }
  },

  /**
   * Success pattern: two quick pulses.
   */
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([15, 30, 15]);
    }
  },

  /**
   * Warning pattern: three quick pulses.
   */
  warning: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 40, 20, 40, 20]);
    }
  },

  /**
   * Pulse for eccentric (descent) phase.
   */
  pulse: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },

  /**
   * Sharp tap for concentric (ascent) phase.
   */
  sharpTap: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  }
};
