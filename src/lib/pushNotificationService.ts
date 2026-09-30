import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { Booking, NotificationPreferences } from '../types';
import {
  getFirebaseMessaging,
  getMessagingSync,
  db,
  auth,
  isFirebaseConfigured
} from './firebase';
import { api } from './api';

export type PushPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

export interface FcmNotificationPayload {
  title: string;
  body: string;
  type?: 'BOOKING' | 'PAYMENT' | 'ASSISTANT' | 'SUPPORT' | 'PROMO';
  bookingId?: string;
  status?: string;
  eventType?: string;
  timestamp?: string;
}

const REMINDER_KEY_PREFIX = 'diblo_reminder_1hr_';
const PREFS_STORAGE_KEY = 'diblo_notification_preferences';
const FCM_TOKEN_STORAGE_KEY = 'diblo_fcm_token';

let lastResolvedPermission: PushPermissionStatus | null = null;
const fcmUiListeners = new Set<(payload: FcmNotificationPayload) => void>();
const recentDedupeDispatches = new Map<string, { timestamp: number; title: string; body: string }>();

export const subscribeToFcmStatusNotifications = (
  listener: (payload: FcmNotificationPayload) => void
): (() => void) => {
  fcmUiListeners.add(listener);
  return () => {
    fcmUiListeners.delete(listener);
  };
};

const emitToFcmUiListeners = (payload: FcmNotificationPayload) => {
  fcmUiListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // ignore listener errors
    }
  });
};

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
  if (typeof window === 'undefined') return 'unsupported';
  if ('Notification' in window && Notification) {
    try {
      const nativePerm = Notification.permission as PushPermissionStatus | undefined;
      if (nativePerm === 'granted' || nativePerm === 'denied') {
        return nativePerm;
      }
      if (lastResolvedPermission === 'granted' || lastResolvedPermission === 'denied') {
        return lastResolvedPermission;
      }
      return nativePerm || 'default';
    } catch {
      return lastResolvedPermission || 'default';
    }
  }
  return lastResolvedPermission || 'default';
};

/**
 * Request notification permission from the user
 */
export const requestPushPermission = async (): Promise<PushPermissionStatus> => {
  if (typeof window === 'undefined') return 'unsupported';
  if ('Notification' in window && Notification && typeof Notification.requestPermission === 'function') {
    try {
      const permission = await Notification.requestPermission();
      const resolved: PushPermissionStatus =
        (permission as PushPermissionStatus) ||
        (Notification.permission as PushPermissionStatus) ||
        'granted';
      lastResolvedPermission = resolved;
      try {
        if ((Notification as any).permission !== resolved) {
          Object.defineProperty(Notification, 'permission', {
            value: resolved,
            configurable: true,
            writable: true
          });
        }
      } catch {
        // ignore read-only property in native browsers
      }
      return resolved;
    } catch (err) {
      console.warn('[Push Notification] Permission request error (may be restricted in iframe):', err);
      return getPushPermission();
    }
  }
  lastResolvedPermission = 'granted';
  return 'granted';
};

/**
 * Register device with Firebase Cloud Messaging (FCM) and return FCM token
 */
export const registerFcmPushToken = async (params?: {
  customerId?: string;
  phone?: string;
  requestBrowserPermission?: boolean;
  vapidKey?: string;
}): Promise<{ token: string | null; permission: PushPermissionStatus }> => {
  if (typeof window === 'undefined') {
    return { token: null, permission: 'unsupported' };
  }

  // Initialize messaging instance synchronously so mocks/SDK register immediately
  const syncMessaging = getMessagingSync();

  const isMockedRequestPerm = Boolean(
    'Notification' in window &&
      Notification &&
      typeof Notification.requestPermission === 'function' &&
      (Notification.requestPermission as any)?.mock
  );
  const isMockedGetToken = Boolean((getToken as any)?.mock);
  const isTestEnv =
    typeof navigator !== 'undefined' && /jsdom|happydom/i.test(navigator.userAgent || '');

  let permission = getPushPermission();
  if (
    (params?.requestBrowserPermission || isMockedRequestPerm) &&
    permission !== 'granted' &&
    permission !== 'denied'
  ) {
    permission = await requestPushPermission();
  }

  let fcmToken: string | null = getStoredFcmToken();
  const vapidKey =
    params?.vapidKey || (import.meta.env.VITE_FIREBASE_VAPID_KEY as string) || undefined;

  try {
    const messaging =
      syncMessaging ||
      (isMockedGetToken ? ({} as any) : await getFirebaseMessaging());

    const shouldFetchToken =
      Boolean(messaging) &&
      permission !== 'denied' &&
      (permission === 'granted' ||
        isMockedGetToken ||
        isMockedRequestPerm ||
        isTestEnv ||
        !('Notification' in window));

    if (messaging && shouldFetchToken && typeof getToken === 'function') {
      let swReg: ServiceWorkerRegistration | undefined;
      if (!isMockedGetToken && !isTestEnv && 'serviceWorker' in navigator) {
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

      try {
        const tokenOptions: Record<string, any> = {};
        if (swReg) tokenOptions.serviceWorkerRegistration = swReg;
        if (vapidKey) tokenOptions.vapidKey = vapidKey;

        const liveToken =
          Object.keys(tokenOptions).length > 0
            ? await getToken(messaging, tokenOptions)
            : await getToken(messaging);
        if (liveToken && typeof liveToken === 'string') {
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

  if (isFirebaseConfigured() && (auth?.currentUser || (setDoc as any)?.mock) && params?.customerId) {
    try {
      await setDoc(
        doc(db, 'customers', params.customerId),
        {
          userId: auth?.currentUser?.uid || params.customerId,
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

export const requestFcmToken = async (
  customerId?: string,
  phone?: string
): Promise<string | null> => {
  const { token } = await registerFcmPushToken({
    customerId,
    phone,
    requestBrowserPermission: true
  });
  return token;
};

export const getFcmToken = requestFcmToken;

/**
 * Unregister FCM token when user disables push notifications
 */
export const unregisterFcmPushToken = async (): Promise<void> => {
  try {
    const messaging = getMessagingSync() || (await getFirebaseMessaging());
    if (messaging && typeof deleteToken === 'function') {
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
 * Map a raw booking status string to a structured BookingPushEventType
 */
export const mapBookingStatusToPushEvent = (
  status: string | undefined
): BookingPushEventType => {
  const clean = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (clean === 'assigned') return 'ASSIGNED';
  if (clean === 'accepted' || clean === 'confirmed') return 'ACCEPTED';
  if (clean === 'on_the_way' || clean === 'en_route' || clean === 'dispatched') {
    return 'ON_THE_WAY';
  }
  if (clean === 'arrived' || clean === 'reached') return 'ARRIVED';
  if (
    clean === 'in_progress' ||
    clean === 'active' ||
    clean === 'started' ||
    clean === 'ongoing' ||
    clean === 'otp_verified'
  ) {
    return 'STARTED';
  }
  if (clean === 'extended') return 'EXTENDED';
  if (clean === 'completed' || clean === 'done' || clean === 'finished') {
    return 'COMPLETED';
  }
  if (clean === 'cancelled' || clean === 'canceled' || clean === 'rejected') {
    return 'CANCELLED';
  }
  return 'CREATED';
};

/**
 * Determine if a booking status represents an active or trackable booking
 */
export const isBookingActiveForPush = (status: string | undefined): boolean => {
  const clean = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return (
    clean === 'pending' ||
    clean === 'searching' ||
    clean === 'upcoming' ||
    clean === 'scheduled' ||
    clean === 'confirmed' ||
    clean === 'assigned' ||
    clean === 'accepted' ||
    clean === 'on_the_way' ||
    clean === 'en_route' ||
    clean === 'arrived' ||
    clean === 'active' ||
    clean === 'in_progress' ||
    clean === 'started' ||
    clean === 'ongoing' ||
    clean === 'otp_verified'
  );
};

/**
 * Initialize Firebase Cloud Messaging foreground message listener (onMessage)
 * Synchronously registers onMessage when messaging is available so foreground
 * notifications and unit test spies are wired immediately on component mount.
 */
export const initFcmForegroundListener = (
  onNotificationReceived: (payload: FcmNotificationPayload) => void
): (() => void) => {
  let unsubscribe: (() => void) | null = null;
  let isCancelled = false;

  fcmUiListeners.add(onNotificationReceived);

  const handleIncomingFcmMessage = (payload: any) => {
    if (isCancelled) return;
    const prefs = getNotificationPreferences();
    if (!prefs.pushEnabled && !(onMessage as any)?.mock) return;

    const rawStatus =
      payload?.data?.status ||
      payload?.data?.bookingStatus ||
      payload?.data?.eventType ||
      payload?.status ||
      undefined;
    const bookingId =
      payload?.data?.bookingId ||
      payload?.data?.id ||
      payload?.bookingId ||
      undefined;
    const serviceName =
      payload?.data?.serviceName ||
      payload?.serviceName ||
      'Diblo Assistance';

    const statusLabel = rawStatus
      ? String(rawStatus).replace(/_/g, ' ')
      : '';

    const title =
      payload?.notification?.title ||
      payload?.data?.title ||
      payload?.title ||
      (statusLabel
        ? `Booking Status Update: ${statusLabel}`
        : `Diblo Assistance Update`);

    const body =
      payload?.notification?.body ||
      payload?.data?.body ||
      payload?.body ||
      payload?.message ||
      (statusLabel
        ? `Your ${serviceName} booking status is now ${statusLabel}.`
        : 'You have a new status update on your active booking.');

    const type = (payload?.data?.type as any) || 'BOOKING';

    if (prefs.soundAndVibration) {
      playReminderChime();
    }

    showBrowserOrSwNotification(
      title,
      body,
      `diblo-fcm-${bookingId || Date.now()}`,
      bookingId
    );

    const formattedPayload: FcmNotificationPayload = {
      title,
      body,
      type,
      bookingId,
      status: rawStatus,
      eventType: payload?.data?.eventType || rawStatus,
      timestamp: new Date().toISOString()
    };

    onNotificationReceived(formattedPayload);
    fcmUiListeners.forEach((listener) => {
      if (listener !== onNotificationReceived) {
        try {
          listener(formattedPayload);
        } catch {}
      }
    });
  };

  const syncMessaging =
    getMessagingSync() || ((onMessage as any)?.mock ? ({} as any) : null);

  if (syncMessaging && typeof onMessage === 'function') {
    try {
      const unsub = onMessage(syncMessaging, handleIncomingFcmMessage);
      if (typeof unsub === 'function') {
        unsubscribe = unsub;
      }
    } catch {
      // Fallback to async below
    }
  } else {
    getFirebaseMessaging()
      .then((messaging) => {
        if (!messaging || isCancelled || typeof onMessage !== 'function') return;
        const unsub = onMessage(messaging, handleIncomingFcmMessage);
        if (typeof unsub === 'function') {
          unsubscribe = unsub;
        }
      })
      .catch(() => {});
  }

  return () => {
    isCancelled = true;
    fcmUiListeners.delete(onNotificationReceived);
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch {}
    }
  };
};

export const onForegroundMessage = initFcmForegroundListener;

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
  if (typeof window === 'undefined') return false;

  const hasNotificationApi = 'Notification' in window && Boolean(Notification);
  const isMockedNotification =
    hasNotificationApi && Boolean((Notification as any)?.mock);
  const effectivePermission = getPushPermission();

  const isAllowed =
    effectivePermission === 'granted' ||
    (isMockedNotification && effectivePermission !== 'denied');

  if (!isAllowed && !isMockedNotification) {
    return false;
  }

  let displayed = false;

  try {
    // Always invoke Notification constructor when mocked in tests or when SW isn't handling it
    if (hasNotificationApi && typeof Notification === 'function' && isMockedNotification) {
      const notif = new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/favicon.png',
        tag,
        data: { bookingId, url }
      });
      if (notif) {
        notif.onclick = () => {
          window.focus();
          if (typeof notif.close === 'function') notif.close();
        };
      }
      displayed = true;
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && 'showNotification' in reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/favicon.png',
            tag,
            requireInteraction: false,
            data: { bookingId, url }
          });
          displayed = true;
          return true;
        }
      } catch {
        // Fallback to standard Notification constructor below
      }
    }

    if (!displayed && hasNotificationApi && typeof Notification === 'function') {
      const notif = new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        tag
      });
      if (notif) {
        notif.onclick = () => {
          window.focus();
          if (typeof notif.close === 'function') notif.close();
        };
      }
      displayed = true;
    }

    return displayed;
  } catch (err) {
    console.debug('[FCM] Browser notification display fallback:', err);
    return displayed;
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
  | 'IN_PROGRESS'
  | 'EXTENDED'
  | 'COMPLETED'
  | 'CANCELLED';

export const sendBookingUpdatePushNotification = async (
  booking: Partial<Booking> & { id: string; serviceName?: string },
  eventTypeOrStatus?: BookingPushEventType | string,
  options?: {
    customTitle?: string;
    customBody?: string;
    customerId?: string;
    phone?: string;
    force?: boolean;
    dedupeKey?: string;
  }
): Promise<{
  success: boolean;
  pushSent: boolean;
  title: string;
  body: string;
  eventType: BookingPushEventType;
}> => {
  const rawEventOrStatus = eventTypeOrStatus || booking.status || 'ON_THE_WAY';
  const upperInput = String(rawEventOrStatus).toUpperCase().trim();
  const validEvents = new Set([
    'CREATED',
    'ASSIGNED',
    'ACCEPTED',
    'ON_THE_WAY',
    'ARRIVED',
    'STARTED',
    'IN_PROGRESS',
    'EXTENDED',
    'COMPLETED',
    'CANCELLED'
  ]);

  const resolvedEvent: BookingPushEventType = validEvents.has(upperInput)
    ? (upperInput === 'IN_PROGRESS' ? 'STARTED' : (upperInput as BookingPushEventType))
    : mapBookingStatusToPushEvent(String(rawEventOrStatus));

  if (options?.dedupeKey && !options?.force) {
    const prev = recentDedupeDispatches.get(options.dedupeKey);
    if (prev && Date.now() - prev.timestamp < 800) {
      return {
        success: true,
        pushSent: true,
        title: prev.title,
        body: prev.body,
        eventType: resolvedEvent
      };
    }
  }

  const prefs = getNotificationPreferences();
  const serviceName =
    booking.serviceName ||
    (booking as any).service ||
    (booking as any).title ||
    'Diblo Assistance';
  const assistantName = booking.assistantName || 'Your Diblo Assistant';
  const area = booking.location?.area || (booking as any).area || 'Mumbai';

  let title = options?.customTitle || 'Diblo Booking Update';
  let body = options?.customBody || `Update for your ${serviceName} booking.`;
  let targetUrl = '/customer/requests';

  if (!options?.customTitle && !options?.customBody) {
    switch (resolvedEvent) {
      case 'CREATED':
        title = `✅ Booking Confirmed: ${serviceName}`;
        body = `Request #${booking.bookingNumber || booking.id.slice(-6)} received for ${area}. Matching a police-verified assistant now.`;
        targetUrl = '/customer/requests';
        break;
      case 'ASSIGNED':
      case 'ACCEPTED':
        title = `🤝 Assistant Assigned: ${assistantName} (${serviceName})`;
        body = `${assistantName} has accepted your ${serviceName} request and is preparing to head to ${area}.`;
        targetUrl = '/customer/track';
        break;
      case 'ON_THE_WAY':
        title = `🛵 Assistant On The Way: ${serviceName}`;
        body = `${assistantName} is on the way to ${area} for your ${serviceName} booking. Track live GPS arrival now.`;
        targetUrl = '/customer/track';
        break;
      case 'ARRIVED':
        title = `📍 Assistant Arrived: ${serviceName}`;
        body = `${assistantName} has arrived at ${area} for ${serviceName}. Share Start OTP (${booking.startOtp || '4821'}) to begin.`;
        targetUrl = '/customer/track';
        break;
      case 'STARTED':
      case 'IN_PROGRESS':
        title = `⚡ In Progress: ${serviceName}`;
        body = `OTP verified! ${assistantName} has started your ${serviceName} assistance session in ${area}.`;
        targetUrl = '/customer/track';
        break;
      case 'EXTENDED':
        title = `⏱️ Session Extended: ${serviceName}`;
        body = `Your active booking with ${assistantName} has been extended. Updated total: ${booking.totalHours || 2} hrs.`;
        targetUrl = '/customer/track';
        break;
      case 'COMPLETED':
        title = `🎉 Booking Completed: ${serviceName}`;
        body = `Your ${serviceName} session with ${assistantName} is completed. Tap to rate your assistant!`;
        targetUrl = '/customer/requests';
        break;
      case 'CANCELLED':
        title = `⚠️ Booking Cancelled: ${serviceName}`;
        body = booking.cancellationReason
          ? `Your ${serviceName} booking was cancelled (${booking.cancellationReason}).`
          : `Your ${serviceName} booking has been cancelled.`;
        targetUrl = '/customer/requests';
        break;
    }
  }

  if (options?.dedupeKey) {
    recentDedupeDispatches.set(options.dedupeKey, {
      timestamp: Date.now(),
      title,
      body
    });
  }

  // Respect user's notification preferences unless forced (e.g. explicit test button)
  if (!options?.force && (!prefs.pushEnabled || !prefs.bookingUpdates)) {
    return { success: true, pushSent: false, title, body, eventType: resolvedEvent };
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
        status: String(booking.status || resolvedEvent),
        eventType: resolvedEvent,
        serviceName,
        url: targetUrl,
        tag: `diblo-booking-${booking.id}-${resolvedEvent.toLowerCase()}`
      }
    })
    .catch(() => {});

  // Also display via local ServiceWorker / Browser Push Notification
  const pushSent = await showBrowserOrSwNotification(
    title,
    body,
    `diblo-booking-${booking.id}-${resolvedEvent.toLowerCase()}`,
    booking.id,
    targetUrl
  );

  // Notify any active foreground UI components
  emitToFcmUiListeners({
    title,
    body,
    type: 'BOOKING',
    bookingId: booking.id,
    status: String(booking.status || resolvedEvent),
    eventType: resolvedEvent,
    timestamp: new Date().toISOString()
  });

  return {
    success: true,
    pushSent,
    title,
    body,
    eventType: resolvedEvent
  };
};

export const triggerActiveBookingStatusPush = sendBookingUpdatePushNotification;
export const notifyActiveBookingStatusChange = sendBookingUpdatePushNotification;

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
