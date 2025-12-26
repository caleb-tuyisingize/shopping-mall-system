import { useEffect, useRef } from 'react';

/**
 * Custom hook for automatic logout after inactivity
 * @param {Function} onLogout - Callback function to execute on logout
 * @param {boolean} enabled - Whether the idle logout is enabled
 * @param {number} timeoutMinutes - Minutes of inactivity before logout (default: 10)
 */
export const useIdleLogout = (onLogout, enabled = true, timeoutMinutes = 10) => {
  const timeoutRef = useRef(null);
  const timeoutMs = timeoutMinutes * 60 * 1000; // Convert to milliseconds

  const resetTimer = () => {
    if (!enabled) return;

    // Clear existing timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timer
    timeoutRef.current = setTimeout(() => {
      if (onLogout) {
        onLogout();
      }
    }, timeoutMs);
  };

  useEffect(() => {
    if (!enabled) {
      // Clean up if disabled
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, timeoutMs, onLogout]);
};
