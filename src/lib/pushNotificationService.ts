import { Booking } from '../types';

export type PushPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

const REMINDER_KEY_PREFIX = 'diblo_reminder_1hr_';

/**
 * Check if the browser natively supports the Web Notification API
 */
export const isPushSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Get current notification permission state
 */
export const getPushPermission = (): PushPermissionStatus => {
  if (!isPushSupported()) return 'unsupported';
  try {
    return Notification.permission as PushPermissionStatus;
  } catch {
    return 'unsupported';
  }
};

/**
 * Request notification permission from the user
 */
export const requestPushPermission = async (): Promise<PushPermissionStatus> => {
  if (!isPushSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission as PushPermissionStatus;
  } catch (err) {
    console.warn('[Push Notification] Permission request error (may be restricted in iframe):', err);
    return getPushPermission();
  }
};

/**
 * Synthesizes a gentle dual-tone notification chime using Web Audio API
 */
export const playReminderChime = (): void => {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First tone (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second tone (A5 - 880 Hz) - slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.debug('[Push Notification] Audio chime play avoided:', err);
  }
};

/**
 * Parse a booking's scheduled date and time into a valid Date object.
 * Handles both 12-hour (e.g. "10:00 AM", "02:30 PM") and 24-hour (e.g. "14:00") formats,
 * as well as relative "TODAY" / "TOMORROW" date types.
 */
export const parseBookingScheduledDate = (dateStr: string, timeStr: string, dateType?: string): Date | null => {
  try {
    let baseDate = new Date();

    if (dateType === 'TOMORROW') {
      baseDate.setDate(baseDate.getDate() + 1);
    } else if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      baseDate = new Date(year, month - 1, day);
    }

    if (!timeStr) {
      baseDate.setHours(10, 0, 0, 0);
      return baseDate;
    }

    const cleanTime = timeStr.trim();
    const isAmPm = /am|pm/i.test(cleanTime);

    let hours = 0;
    let minutes = 0;

    if (isAmPm) {
      const match = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        const meridian = match[3].toUpperCase();
        if (meridian === 'PM' && hours < 12) hours += 12;
        if (meridian === 'AM' && hours === 12) hours = 0;
      } else {
        hours = 10;
      }
    } else {
      const match = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
      } else {
        hours = 10;
      }
    }

    baseDate.setHours(hours, minutes, 0, 0);
    return baseDate;
  } catch (e) {
    console.warn('[Push Notification] Date parsing error for booking:', e);
    return null;
  }
};

/**
 * Calculates remaining minutes until booking session start
 */
export const getTimeUntilBookingStart = (
  booking: Booking,
  nowDate: Date = new Date()
): { minutes: number; formatted: string; isWithinOneHour: boolean; isPast: boolean } => {
  const scheduledDate = parseBookingScheduledDate(
    booking.scheduledDate,
    booking.startTime,
    booking.dateType
  );

  if (!scheduledDate) {
    return { minutes: 9999, formatted: 'Upcoming', isWithinOneHour: false, isPast: false };
  }

  const diffMs = scheduledDate.getTime() - nowDate.getTime();
  const minutes = Math.round(diffMs / (1000 * 60));

  let formatted = '';
  if (minutes < 0) {
    formatted = `${Math.abs(minutes)}m ago`;
  } else if (minutes === 0) {
    formatted = 'Starting now';
  } else if (minutes < 60) {
    formatted = `${minutes} min${minutes === 1 ? '' : 's'}`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    formatted = remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
  }

  return {
    minutes,
    formatted,
    // 1-hour window: 0 to 60 minutes before start
    isWithinOneHour: minutes >= 0 && minutes <= 60,
    isPast: minutes < 0
  };
};

/**
 * Checks if a 1-hour reminder has already been sent for a specific booking
 */
export const isOneHourReminderSent = (bookingId: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return !!localStorage.getItem(`${REMINDER_KEY_PREFIX}${bookingId}`);
  } catch {
    return false;
  }
};

/**
 * Mark a 1-hour reminder as sent
 */
export const markOneHourReminderSent = (bookingId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${REMINDER_KEY_PREFIX}${bookingId}`,
      JSON.stringify({ sentAt: new Date().toISOString() })
    );
  } catch (err) {
    console.warn('[Push Notification] Error saving reminder sent status:', err);
  }
};

/**
 * Reset reminder status for testing or re-dispatch
 */
export const resetOneHourReminder = (bookingId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${REMINDER_KEY_PREFIX}${bookingId}`);
  } catch {}
};

/**
 * Dispatches the 1-hour reminder notification (Web Notification + Audio chime + device vibration)
 */
export const sendOneHourPushReminder = async (
  booking: Booking,
  isTest = false
): Promise<{ success: boolean; pushSent: boolean; message: string }> => {
  const assistantName = booking.assistantName || 'Your Diblo Assistant';
  const serviceTitle = booking.serviceName || 'Assistance Session';
  const area = booking.location?.area || 'your Mumbai address';
  const time = booking.startTime || '10:00 AM';

  const notificationTitle = isTest
    ? `⏰ [TEST REMINDER] 1 Hour Until Session Starts`
    : `⏰ 1-Hour Reminder: ${serviceTitle}`;

  const notificationBody = `Your Diblo assistance session starts in 1 hour at ${time} in ${area}. ${assistantName} is preparing for dispatch.`;

  // Play audio chime and vibrate device
  playReminderChime();
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch {}
  }

  let pushSent = false;

  // Attempt Web Push Notification if browser permits
  if (isPushSupported() && Notification.permission === 'granted') {
    try {
      // Try service worker first for mobile/PWA push support
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(notificationTitle, {
          body: notificationBody,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `diblo-reminder-1hr-${booking.id}`,
          requireInteraction: true,
          data: { bookingId: booking.id, url: '/?tab=BOOKINGS' }
        });
        pushSent = true;
      } else {
        // Fallback to standard Window Notification constructor
        const notif = new Notification(notificationTitle, {
          body: notificationBody,
          icon: '/favicon.ico',
          tag: `diblo-reminder-1hr-${booking.id}`
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
        pushSent = true;
      }
    } catch (pushErr) {
      console.warn('[Push Notification] Browser Notification error:', pushErr);
    }
  }

  // Mark reminder as sent in local storage
  markOneHourReminderSent(booking.id);

  return {
    success: true,
    pushSent,
    message: notificationBody
  };
};

/**
 * Scans all bookings and triggers automated 1-hour reminders for those within the 60-minute window
 */
export const checkAndDispatchUpcomingReminders = async (
  bookings: Booking[],
  onTriggerInApp?: (title: string, message: string, bookingId: string) => void
): Promise<string[]> => {
  const triggeredBookingIds: string[] = [];
  const now = new Date();

  for (const booking of bookings) {
    // Only check active/scheduled upcoming bookings
    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      continue;
    }

    // Skip if already reminded
    if (isOneHourReminderSent(booking.id)) {
      continue;
    }

    const { minutes, isWithinOneHour } = getTimeUntilBookingStart(booking, now);

    // Trigger if within 1 hour before scheduled start
    if (isWithinOneHour && minutes >= 0) {
      const result = await sendOneHourPushReminder(booking, false);
      triggeredBookingIds.push(booking.id);

      if (onTriggerInApp) {
        onTriggerInApp(
          `⏰ Session Starts in 1 Hour`,
          `Your ${booking.serviceName} session starts at ${booking.startTime}. Your verified assistant is preparing for dispatch.`,
          booking.id
        );
      }
    }
  }

  return triggeredBookingIds;
};
