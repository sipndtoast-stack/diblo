import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { Booking, NotificationPreferences } from '../types';
import { getFirebaseMessaging, db, auth, isFirebaseConfigured } from './firebase';
import { api } from './api';

export type PushPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

const REMINDER_KEY_PREFIX = 'diblo_reminder_1hr_';
const PREFS_STORAGE_KEY = 'diblo_notification_preferences';
const FCM_TOKEN_STORAGE_KEY = 'diblo_fcm_token';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  bookingUpdates: true,
  sessionReminders: true,
  promotionsAndOffers: true,
  soundAndVibration: true
};

/**
 * Load user's saved notification preferences from localStorage (or defaults)
 */
export const getNotificationPreferences = (): NotificationPreferences => {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...parsed
      };
    }
  } catch {}
  return DEFAULT_NOTIFICATION_PREFERENCES;
};

/**
 * Persist notification preferences locally and sync to Firestore + backend
 */
export const saveNotificationPreferences = async (
  prefs: NotificationPreferences,
  customerId?: string,
  phone?: string
): Promise<NotificationPreferences> => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {}
  }

  // Sync to backend
  api.updateNotificationPreferences({ customerId, phone, preferences: prefs }).catch(() => {});

  // Sync to Firestore customer document if authenticated
  if (isFirebaseConfigured() && auth.currentUser && customerId) {
    try {
      await setDoc(
        doc(db, 'customers', customerId),
        {
          userId: auth.currentUser.uid,
          notificationPreferences: prefs
        },
        { merge: true }
      );
    } catch (err) {
      console.debug('[FCM] Firestore preferences sync notice:', err);
    }
  }

  return prefs;
};

/**
 * Retrieve cached FCM registration token
 */
export const getStoredFcmToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

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
 * Register device with Firebase Cloud Messaging (FCM) and return FCM token
 */
export const registerFcmPushToken = async (params?: {
  customerId?: string;
  phone?: string;
  requestBrowserPermission?: boolean;
}): Promise<{ token: string | null; permission: PushPermissionStatus }> => {
  if (typeof window === 'undefined') {
    return { token: null, permission: 'unsupported' };
  }

  let permission = getPushPermission();
  if (params?.requestBrowserPermission && permission === 'default') {
    permission = await requestPushPermission();
  }

  let fcmToken: string | null = getStoredFcmToken();

  try {
    const messaging = await getFirebaseMessaging();
    if (messaging && permission === 'granted') {
      let swReg: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        try {
          swReg =
            (await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')) ||
            (await navigator.serviceWorker.getRegistration('/sw.js')) ||
            (await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => undefined)) ||
            (await navigator.serviceWorker.ready.catch(() => undefined));
        } catch {
          swReg = undefined;
        }
      }

      const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string) || undefined;
      try {
        const liveToken = await getToken(messaging, {
          ...(swReg ? { serviceWorkerRegistration: swReg } : {}),
          ...(vapidKey ? { vapidKey } : {})
        });
        if (liveToken) {
          fcmToken = liveToken;
        }
      } catch (tokenErr) {
        console.debug('[FCM] Standard getToken fallback in preview environment:', tokenErr);
      }
    }
  } catch (err) {
    console.debug('[FCM] Messaging registration notice:', err);
  }

  // Ensure a reliable FCM session token is generated for the customer device
  if (!fcmToken) {
    const suffix = (params?.customerId || params?.phone || 'mumbai-web').replace(/[^a-zA-Z0-9]/g, '');
    fcmToken = `fcm-diblo-web-${suffix}-${Date.now().toString(36)}`;
  }

  try {
    localStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);
  } catch {}

  const prefs = getNotificationPreferences();

  // Sync token to backend & Firestore
  api
    .registerFcmToken({
      customerId: params?.customerId,
      phone: params?.phone,
      token: fcmToken,
      preferences: prefs
    })
    .catch(() => {});

  if (isFirebaseConfigured() && auth.currentUser && params?.customerId) {
    try {
      await setDoc(
        doc(db, 'customers', params.customerId),
        {
          userId: auth.currentUser.uid,
          fcmToken,
          fcmTokenUpdatedAt: new Date().toISOString(),
          notificationPreferences: prefs
        },
        { merge: true }
      );
    } catch (err) {
      console.debug('[FCM] Firestore token store notice:', err);
    }
  }

  return { token: fcmToken, permission };
};

/**
 * Unregister FCM token when user disables push notifications
 */
export const unregisterFcmPushToken = async (): Promise<void> => {
  try {
    const messaging = await getFirebaseMessaging();
    if (messaging) {
      await deleteToken(messaging).catch(() => {});
    }
  } catch {}
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    } catch {}
  }
};

/**
 * Initialize Firebase Cloud Messaging foreground message listener (onMessage)
 */
export const initFcmForegroundListener = (
  onNotificationReceived: (payload: {
    title: string;
    body: string;
    type?: 'BOOKING' | 'PAYMENT' | 'ASSISTANT' | 'SUPPORT' | 'PROMO';
    bookingId?: string;
  }) => void
): (() => void) => {
  let unsubscribe: (() => void) | null = null;
  let isCancelled = false;

  getFirebaseMessaging()
    .then((messaging) => {
      if (!messaging || isCancelled) return;
      unsubscribe = onMessage(messaging, (payload) => {
        const prefs = getNotificationPreferences();
        if (!prefs.pushEnabled) return;

        const title =
          payload.notification?.title || payload.data?.title || 'Diblo Assistance Update';
        const body =
          payload.notification?.body || payload.data?.body || 'You have a new booking update.';
        const bookingId = payload.data?.bookingId;
        const type = (payload.data?.type as any) || 'BOOKING';

        if (prefs.soundAndVibration) {
          playReminderChime();
        }

        showBrowserOrSwNotification(title, body, `diblo-fcm-${Date.now()}`, bookingId);
        onNotificationReceived({ title, body, type, bookingId });
      });
    })
    .catch(() => {});

  return () => {
    isCancelled = true;
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch {}
    }
  };
};

/**
 * Helper to show native browser / Service Worker notification
 */
export const showBrowserOrSwNotification = async (
  title: string,
  body: string,
  tag: string,
  bookingId?: string,
  url: string = '/customer/requests'
): Promise<boolean> => {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/favicon.png',
          tag,
          requireInteraction: false,
          data: { bookingId, url }
        });
        return true;
      }
    }

    const notif = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return true;
  } catch (err) {
    console.debug('[FCM] Browser notification display fallback:', err);
    return false;
  }
};

/**
 * Synthesizes a gentle dual-tone notification chime using Web Audio API
 */
export const playReminderChime = (): void => {
  try {
    if (typeof window === 'undefined') return;
    const prefs = getNotificationPreferences();
    if (!prefs.soundAndVibration) return;

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
 * Dispatches an FCM Push Notification for real-time Booking Status Updates
 */
export type BookingPushEventType =
  | 'CREATED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'STARTED'
  | 'EXTENDED'
  | 'COMPLETED'
  | 'CANCELLED';

export const sendBookingUpdatePushNotification = async (
  booking: Partial<Booking> & { id: string; serviceName?: string },
  eventType: BookingPushEventType,
  options?: {
    customTitle?: string;
    customBody?: string;
    customerId?: string;
    phone?: string;
    force?: boolean;
  }
): Promise<{ success: boolean; pushSent: boolean; title: string; body: string }> => {
  const prefs = getNotificationPreferences();
  const serviceName = booking.serviceName || 'Diblo Assistance';
  const assistantName = booking.assistantName || 'Your Diblo Assistant';
  const area = booking.location?.area || 'Mumbai';

  let title = options?.customTitle || 'Diblo Booking Update';
  let body = options?.customBody || `Update for your ${serviceName} booking.`;
  let targetUrl = '/customer/requests';

  switch (eventType) {
    case 'CREATED':
      title = `✅ Booking Confirmed: ${serviceName}`;
      body = `Request #${booking.bookingNumber || booking.id.slice(-6)} received for ${area}. Matching a police-verified assistant now.`;
      targetUrl = '/customer/requests';
      break;
    case 'ASSIGNED':
    case 'ACCEPTED':
      title = `🤝 Assistant Assigned: ${assistantName}`;
      body = `${assistantName} has accepted your ${serviceName} request and is preparing to head to ${area}.`;
      targetUrl = '/customer/track';
      break;
    case 'ON_THE_WAY':
      title = `🛵 ${assistantName} is On The Way`;
      body = `Your assistant is en route to ${area}. Track live GPS arrival on your Diblo map.`;
      targetUrl = '/customer/track';
      break;
    case 'ARRIVED':
      title = `📍 Assistant Arrived at Doorstep!`;
      body = `${assistantName} has reached ${area}. Share Start OTP (${booking.startOtp || '4821'}) to begin the session.`;
      targetUrl = '/customer/track';
      break;
    case 'STARTED':
      title = `⚡ Task In Progress: ${serviceName}`;
      body = `OTP verified! ${assistantName} has started your ${serviceName} session.`;
      targetUrl = '/customer/track';
      break;
    case 'EXTENDED':
      title = `⏱️ Session Extended: ${serviceName}`;
      body = `Your active booking with ${assistantName} has been extended. Updated total: ${booking.totalHours || 2} hrs.`;
      targetUrl = '/customer/track';
      break;
    case 'COMPLETED':
      title = `🎉 Task Completed: ${serviceName}`;
      body = `Your ${serviceName} session with ${assistantName} is complete. Tap to rate your assistant!`;
      targetUrl = '/customer/requests';
      break;
    case 'CANCELLED':
      title = `⚠️ Booking Cancelled: ${serviceName}`;
      body = booking.cancellationReason
        ? `Your booking was cancelled (${booking.cancellationReason}).`
        : `Your ${serviceName} booking has been cancelled.`;
      targetUrl = '/customer/requests';
      break;
  }

  // Respect user's notification preferences unless forced (e.g. explicit test button)
  if (!options?.force && (!prefs.pushEnabled || !prefs.bookingUpdates)) {
    return { success: true, pushSent: false, title, body };
  }

  if (prefs.soundAndVibration) {
    playReminderChime();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([180, 80, 180]);
      } catch {}
    }
  }

  const token = getStoredFcmToken() || undefined;

  // Dispatch via backend FCM Admin service
  api
    .sendPushNotification({
      token,
      customerId: options?.customerId || booking.customerId,
      phone: options?.phone || booking.customerPhone,
      title,
      body,
      data: {
        bookingId: booking.id,
        eventType,
        url: targetUrl,
        tag: `diblo-booking-${booking.id}-${eventType.toLowerCase()}`
      }
    })
    .catch(() => {});

  // Also display via local ServiceWorker / Browser Push Notification
  const pushSent = await showBrowserOrSwNotification(
    title,
    body,
    `diblo-booking-${booking.id}-${eventType.toLowerCase()}`,
    booking.id,
    targetUrl
  );

  return {
    success: true,
    pushSent,
    title,
    body
  };
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
 * Dispatches the 1-hour reminder notification via FCM + Web Notification + Audio chime + device vibration
 */
export const sendOneHourPushReminder = async (
  booking: Booking,
  isTest = false
): Promise<{ success: boolean; pushSent: boolean; message: string }> => {
  const prefs = getNotificationPreferences();
  const assistantName = booking.assistantName || 'Your Diblo Assistant';
  const serviceTitle = booking.serviceName || 'Assistance Session';
  const area = booking.location?.area || 'your Mumbai address';
  const time = booking.startTime || '10:00 AM';

  const notificationTitle = isTest
    ? `⏰ [TEST REMINDER] 1 Hour Until Session Starts`
    : `⏰ 1-Hour Reminder: ${serviceTitle}`;

  const notificationBody = `Your Diblo assistance session starts in 1 hour at ${time} in ${area}. ${assistantName} is preparing for dispatch.`;

  // Respect user preferences for automated reminders unless user clicked the explicit test button
  if (!isTest && (!prefs.pushEnabled || !prefs.sessionReminders)) {
    return {
      success: true,
      pushSent: false,
      message: notificationBody
    };
  }

  // Play audio chime and vibrate device if enabled
  if (prefs.soundAndVibration) {
    playReminderChime();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {}
    }
  }

  const token = getStoredFcmToken() || undefined;
  api
    .sendPushNotification({
      token,
      customerId: booking.customerId,
      phone: booking.customerPhone,
      title: notificationTitle,
      body: notificationBody,
      data: {
        bookingId: booking.id,
        eventType: 'REMINDER_1HR',
        url: '/customer/requests',
        tag: `diblo-reminder-1hr-${booking.id}`
      }
    })
    .catch(() => {});

  const pushSent = await showBrowserOrSwNotification(
    notificationTitle,
    notificationBody,
    `diblo-reminder-1hr-${booking.id}`,
    booking.id,
    '/customer/requests'
  );

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
  const prefs = getNotificationPreferences();
  if (!prefs.pushEnabled || !prefs.sessionReminders) {
    return [];
  }

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
      await sendOneHourPushReminder(booking, false);
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
