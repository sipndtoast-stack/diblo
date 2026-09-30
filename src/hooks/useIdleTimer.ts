import { useEffect, useRef, useCallback } from 'react';

export const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
export const LAST_ACTIVITY_STORAGE_KEY = 'diblo_last_activity_timestamp';

export interface UseIdleTimerOptions {
  /** Idle timeout in milliseconds (defaults to 15 minutes = 900,000 ms) */
  timeoutMs?: number;
  /** Callback fired when the user has been inactive for timeoutMs */
  onIdle: () => void;
  /** Whether the idle timer should be active (e.g., when customer is authenticated) */
  enabled?: boolean;
}

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
  'pointerdown'
];

/**
 * Custom 'idle-timer' hook using global window event listeners to detect user inactivity.
 * Automatically triggers `onIdle` (e.g. customer logout & redirect to login screen)
 * if the application is left inactive for 15 minutes (900,000 ms).
 */
export function useIdleTimer({
  timeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
  onIdle,
  enabled = true
}: UseIdleTimerOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const clearExistingTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const triggerIdleLogout = useCallback(() => {
    clearExistingTimer();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
      }
    } catch {}
    onIdleRef.current();
  }, [clearExistingTimer]);

  const resetTimer = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    const now = Date.now();
    lastActivityRef.current = now;

    try {
      if (window.localStorage) {
        window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(now));
      }
    } catch {}

    clearExistingTimer();
    timerRef.current = setTimeout(() => {
      triggerIdleLogout();
    }, timeoutMs);
  }, [enabled, timeoutMs, clearExistingTimer, triggerIdleLogout]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      clearExistingTimer();
      return;
    }

    // Check if already expired while tab was closed or backgrounded
    try {
      const savedTs = window.localStorage?.getItem(LAST_ACTIVITY_STORAGE_KEY);
      if (savedTs) {
        const elapsed = Date.now() - Number(savedTs);
        if (!Number.isNaN(elapsed) && elapsed >= timeoutMs) {
          triggerIdleLogout();
          return;
        }
      }
    } catch {}

    // Initialize timer on mount/enable
    resetTimer();

    const handleUserActivity = () => {
      resetTimer();
    };

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      try {
        const savedTs = window.localStorage?.getItem(LAST_ACTIVITY_STORAGE_KEY);
        const lastActive = savedTs ? Number(savedTs) : lastActivityRef.current;
        if (Date.now() - lastActive >= timeoutMs) {
          triggerIdleLogout();
          return;
        }
      } catch {}
      resetTimer();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });
    window.addEventListener('focus', handleVisibilityOrFocus, { passive: true });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    }

    return () => {
      clearExistingTimer();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      }
    };
  }, [enabled, timeoutMs, resetTimer, clearExistingTimer, triggerIdleLogout]);

  return {
    resetIdleTimer: resetTimer,
    getLastActivityTime: () => lastActivityRef.current
  };
}

export default useIdleTimer;
