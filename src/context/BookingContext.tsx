import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Booking, InAppNotification, PricingConfig, NotificationPreferences } from '../types';
import { api } from '../lib/api';
import { auth } from '../lib/firebase';
import {
  saveBookingToFirestore,
  updateBookingInFirestore,
  updateAssistantLiveLocationInFirestore,
  subscribeToRealtimeBookings,
  subscribeToBookingLiveLocation,
  isDemoBookingRecord,
  normalizeBookingStatus
} from '../lib/firestoreBookings';
import { useAuth } from './AuthContext';
import {
  getPushPermission,
  requestPushPermission,
  sendOneHourPushReminder,
  checkAndDispatchUpcomingReminders,
  isOneHourReminderSent,
  resetOneHourReminder,
  PushPermissionStatus,
  getNotificationPreferences,
  saveNotificationPreferences,
  getStoredFcmToken,
  registerFcmPushToken,
  unregisterFcmPushToken,
  initFcmForegroundListener,
  sendBookingUpdatePushNotification
} from '../lib/pushNotificationService';

interface BookingContextType {
  bookings: Booking[];
  activeBooking: Booking | null;
  notifications: InAppNotification[];
  pricing: PricingConfig | null;
  isLoading: boolean;
  liveEtaMinutes: number;
  liveDistanceKm: number;
  liveAssistantCoords: { lat: number; lng: number } | null;
  pushPermission: PushPermissionStatus;
  fcmToken: string | null;
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  requestPushNotificationPermission: () => Promise<PushPermissionStatus>;
  sendTestBookingPush: () => Promise<{ success: boolean; pushSent: boolean; message: string }>;
  triggerOneHourReminderTest: (bookingId?: string) => Promise<{ success: boolean; pushSent: boolean; message: string }>;
  isReminderSentForBooking: (bookingId: string) => boolean;
  refreshBookings: () => Promise<void>;
  createBooking: (bookingData: Partial<Booking>) => Promise<Booking>;
  acceptBooking: (
    bookingId: string,
    assistantId?: string,
    assistantDetails?: {
      assistantUid?: string;
      assistantName?: string;
      assistantPhone?: string;
      assistantPhoto?: string;
      assistantRating?: number;
    }
  ) => Promise<void>;
  rejectBooking: (bookingId: string, assistantId?: string) => Promise<void>;
  startAssistance: (bookingId: string) => Promise<void>;
  updateAssistantLiveLocation: (
    bookingId: string,
    coords: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      heading?: number | null;
      speed?: number | null;
      address?: string;
    }
  ) => Promise<void>;
  verifyStartOtp: (bookingId: string, otp: string) => Promise<boolean>;
  extendBooking: (bookingId: string, extraHours: number) => Promise<void>;
  completeBooking: (bookingId: string) => Promise<void>;
  cancelBooking: (bookingId: string, reason: string) => Promise<void>;
  rateBooking: (
    bookingId: string,
    stars: number,
    comment?: string,
    tags?: string[],
    tipAmount?: number,
    tipPaymentMethod?: string
  ) => Promise<void>;
  completedFeedbackBooking: Booking | null;
  setCompletedFeedbackBooking: (booking: Booking | null) => void;
  dismissFeedbackModal: (bookingId: string) => void;
  setActiveBooking: (booking: Booking | null) => void;
  markNotificationRead: (id: string) => void;
  addNotification: (title: string, message: string, type?: InAppNotification['type'], bookingId?: string) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

function isActiveBookingStatus(status: string | undefined): boolean {
  const norm = normalizeBookingStatus(status);
  return norm === 'pending' || norm === 'accepted' || norm === 'on_the_way' || norm === 'arrived' || norm === 'in_progress';
}

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, currentRole, customerProfile, assistantProfile, staffUser, updateCustomerProfile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  // Automated Push Notification & Firebase Cloud Messaging (FCM) state
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus>(() => getPushPermission());
  const [fcmToken, setFcmToken] = useState<string | null>(() => getStoredFcmToken());
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(() =>
    customerProfile?.notificationPreferences || getNotificationPreferences()
  );

  // Real live tracking state (driven ONLY by actual assistant GPS coordinates from Firebase, never simulated)
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number>(0);
  const [liveDistanceKm, setLiveDistanceKm] = useState<number>(0);
  const [liveAssistantCoords, setLiveAssistantCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Track previous booking statuses so real-time listener can notify customer on status changes
  const prevBookingStatusesRef = useRef<Map<string, string>>(new Map());

  // Post-booking feedback modal state
  const [completedFeedbackBooking, setCompletedFeedbackBooking] = useState<Booking | null>(null);
  const dismissedBookingFeedbackIds = useRef<Set<string>>(new Set());

  const dismissFeedbackModal = (bookingId: string) => {
    dismissedBookingFeedbackIds.current.add(bookingId);
    setCompletedFeedbackBooking((prev) => (prev?.id === bookingId ? null : prev));
  };

  const addNotification = useCallback(
    (title: string, message: string, type: InAppNotification['type'] = 'BOOKING', bookingId?: string) => {
      const newNotif: InAppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: currentUser?.id || 'user',
        title,
        message,
        type,
        bookingId,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      setNotifications((prev) => [newNotif, ...prev]);
    },
    [currentUser?.id]
  );

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  // Sync preferences when customerProfile loads
  useEffect(() => {
    if (customerProfile?.notificationPreferences) {
      setNotificationPreferences((prev) => ({
        ...prev,
        ...customerProfile.notificationPreferences
      }));
    }
    if (customerProfile?.fcmToken && !fcmToken) {
      setFcmToken(customerProfile.fcmToken);
    }
  }, [customerProfile?.id]);

  // Register FCM token and listen for foreground FCM messages when pushEnabled is active
  useEffect(() => {
    if (!notificationPreferences.pushEnabled) return;

    registerFcmPushToken({
      customerId: customerProfile?.id || currentUser?.id,
      phone: customerProfile?.phone || currentUser?.phone,
      requestBrowserPermission: false
    }).then(({ token, permission }) => {
      if (token) setFcmToken(token);
      setPushPermission(permission);
    });

    const unsubscribeForeground = initFcmForegroundListener((payload) => {
      addNotification(payload.title, payload.body, payload.type || 'BOOKING', payload.bookingId);
    });

    return () => {
      unsubscribeForeground();
    };
  }, [notificationPreferences.pushEnabled, customerProfile?.id, currentUser?.id, addNotification]);

  const updateNotificationPreferences = async (updates: Partial<NotificationPreferences>): Promise<void> => {
    const nextPrefs: NotificationPreferences = {
      ...notificationPreferences,
      ...updates
    };
    setNotificationPreferences(nextPrefs);

    const custId = customerProfile?.id || currentUser?.id || '';
    const custPhone = customerProfile?.phone || currentUser?.phone;

    await saveNotificationPreferences(nextPrefs, custId, custPhone);

    if (updates.pushEnabled === true) {
      const { token, permission } = await registerFcmPushToken({
        customerId: custId,
        phone: custPhone,
        requestBrowserPermission: true
      });
      setFcmToken(token);
      setPushPermission(permission);
      updateCustomerProfile({
        notificationPreferences: nextPrefs,
        ...(token ? { fcmToken: token, fcmTokenUpdatedAt: new Date().toISOString() } : {})
      });
    } else if (updates.pushEnabled === false) {
      await unregisterFcmPushToken();
      setFcmToken(null);
      updateCustomerProfile({
        notificationPreferences: nextPrefs,
        fcmToken: undefined
      });
    } else {
      updateCustomerProfile({
        notificationPreferences: nextPrefs
      });
    }
  };

  const requestPushNotificationPermission = async (): Promise<PushPermissionStatus> => {
    const status = await requestPushPermission();
    setPushPermission(status);
    const { token } = await registerFcmPushToken({
      customerId: customerProfile?.id || currentUser?.id,
      phone: customerProfile?.phone || currentUser?.phone,
      requestBrowserPermission: false
    });
    if (token) setFcmToken(token);
    await updateNotificationPreferences({ pushEnabled: true });
    return status;
  };

  const sendTestBookingPush = async (): Promise<{ success: boolean; pushSent: boolean; message: string }> => {
    const targetBooking = activeBooking || bookings[0];
    if (!targetBooking) {
      return {
        success: false,
        pushSent: false,
        message: 'Create a booking first to send a booking update notification.'
      };
    }

    const res = await sendBookingUpdatePushNotification(targetBooking, 'ON_THE_WAY', {
      customerId: customerProfile?.id || currentUser?.id,
      phone: customerProfile?.phone || currentUser?.phone,
      force: true
    });

    addNotification(res.title, res.body, 'BOOKING', targetBooking.id);
    return {
      success: res.success,
      pushSent: res.pushSent,
      message: res.body
    };
  };

  const isReminderSentForBooking = (bookingId: string): boolean => {
    return isOneHourReminderSent(bookingId);
  };

  const triggerOneHourReminderTest = async (
    bookingId?: string
  ): Promise<{ success: boolean; pushSent: boolean; message: string }> => {
    let targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking) {
      targetBooking =
        bookings.find((b) => {
          const norm = normalizeBookingStatus(b.status);
          return norm !== 'completed' && norm !== 'cancelled' && norm !== 'rejected';
        }) || bookings[0];
    }

    if (!targetBooking) {
      return {
        success: false,
        pushSent: false,
        message: 'No active booking found to send reminder for.'
      };
    }

    resetOneHourReminder(targetBooking.id);
    const result = await sendOneHourPushReminder(targetBooking, true);

    addNotification(
      `⏰ 1-Hour Reminder: ${targetBooking.serviceName}`,
      `Your assistance session starts in 1 hour at ${targetBooking.startTime} in ${targetBooking.location?.area || 'Mumbai'}.`,
      'BOOKING',
      targetBooking.id
    );

    return result;
  };

  // Automated periodic check for 1-hour session reminders
  useEffect(() => {
    if (bookings.length === 0) return;

    const runAutomatedReminders = async () => {
      try {
        await checkAndDispatchUpcomingReminders(bookings, (title, message, bookingId) => {
          addNotification(title, message, 'BOOKING', bookingId);
        });
      } catch (err) {
        console.debug('[Push Reminders] Periodic reminder check error:', err);
      }
    };

    runAutomatedReminders();
    const reminderInterval = setInterval(runAutomatedReminders, 30000);
    return () => clearInterval(reminderInterval);
  }, [bookings, addNotification]);

  // Apply incoming booking list and detect real-time status transitions
  const applyMergedBookings = useCallback(
    (incomingList: Booking[]) => {
      const cleanList = incomingList.filter((b) => !isDemoBookingRecord(b));

      // Filter by current customer when in CUSTOMER role so a customer only sees their own bookings
      const filteredForRole = cleanList.filter((b) => {
        if (currentRole === 'CUSTOMER') {
          const myPhone = (customerProfile?.phone || currentUser?.phone || '').replace(/\D/g, '').slice(-10);
          const recPhone = (b.customerPhone || '').replace(/\D/g, '').slice(-10);
          const myCustId = customerProfile?.id || '';
          const myUid = auth.currentUser?.uid || currentUser?.id || '';
          if (myCustId && b.customerId === myCustId) return true;
          if (myUid && (b.customerUid === myUid || b.customerId === myUid)) return true;
          if (myPhone && recPhone && myPhone === recPhone) return true;
          return false;
        }
        return true;
      });

      // Detect real-time transitions for notifications
      filteredForRole.forEach((b) => {
        const norm = normalizeBookingStatus(b.status);
        const prevNorm = prevBookingStatusesRef.current.get(b.id);
        if (prevNorm && prevNorm !== norm && currentRole === 'CUSTOMER') {
          if (norm === 'accepted') {
            addNotification(
              'Assistant Assigned',
              `${b.assistantName || 'A Diblo Assistant'} has accepted your ${b.serviceName} request!`,
              'ASSISTANT',
              b.id
            );
            sendBookingUpdatePushNotification(b, 'ACCEPTED').catch(() => {});
          } else if (norm === 'in_progress' || norm === 'on_the_way') {
            addNotification(
              'Assistance in Progress',
              `${b.assistantName || 'Your assistant'} has started your assistance request. Live tracking is active.`,
              'ASSISTANT',
              b.id
            );
            sendBookingUpdatePushNotification(b, 'STARTED').catch(() => {});
          } else if (norm === 'completed') {
            addNotification(
              'Request Completed',
              `Your ${b.serviceName} request has been completed. Please rate your experience!`,
              'BOOKING',
              b.id
            );
            sendBookingUpdatePushNotification(b, 'COMPLETED').catch(() => {});
            if (!b.rating && !dismissedBookingFeedbackIds.current.has(b.id)) {
              setCompletedFeedbackBooking(b);
            }
          } else if (norm === 'rejected') {
            addNotification(
              'Request Update',
              `The previous assistant was unavailable. Let us know if you would like to re-dispatch.`,
              'BOOKING',
              b.id
            );
          }
        }
        prevBookingStatusesRef.current.set(b.id, norm);
      });

      setBookings(filteredForRole);

      setActiveBooking((prevActive) => {
        if (prevActive) {
          const updatedSame = filteredForRole.find((b) => b.id === prevActive.id);
          if (updatedSame && isActiveBookingStatus(updatedSame.status)) {
            return updatedSame;
          }
        }
        const nextActive = filteredForRole.find((b) => isActiveBookingStatus(b.status));
        return nextActive || null;
      });
    },
    [currentRole, customerProfile?.id, customerProfile?.phone, currentUser?.id, currentUser?.phone, addNotification]
  );

  const refreshBookings = useCallback(async () => {
    try {
      const params: { customerId?: string; assistantId?: string } = {};
      if (currentRole === 'CUSTOMER' && customerProfile?.id) {
        params.customerId = customerProfile.id;
      }
      const data = await api.getBookings(params);
      const safeData = Array.isArray(data) ? data.filter((b) => !isDemoBookingRecord(b)) : [];
      applyMergedBookings(safeData);
    } catch (e) {
      console.error('Failed to fetch bookings', e);
    }
  }, [currentRole, customerProfile?.id, applyMergedBookings]);

  // Initial load of pricing and bookings
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [bookingsData, pricingData] = await Promise.all([api.getBookings(), api.getPricing()]);
        if (!isMounted) return;
        setPricing(pricingData);
        const safeBookings = Array.isArray(bookingsData) ? bookingsData.filter((b) => !isDemoBookingRecord(b)) : [];
        applyMergedBookings(safeBookings);
      } catch (err) {
        console.error('Failed to load booking context data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [applyMergedBookings]);

  // Real-time Firestore listener for bookings (Customer Portal & Assistant Portal)
  useEffect(() => {
    const assistantId = staffUser?.eplId || assistantProfile?.id || 'asst-1';
    const assistantPhone = staffUser?.number || assistantProfile?.phone || currentUser?.phone;
    const customerId = customerProfile?.id || (currentUser?.phone ? `cust-${currentUser.phone.replace(/\D/g, '').slice(-10)}` : undefined);
    const customerPhone = customerProfile?.phone || currentUser?.phone;

    const unsubscribe = subscribeToRealtimeBookings(
      {
        role: currentRole,
        customerId,
        customerPhone,
        customerName: customerProfile?.name || currentUser?.name,
        assistantId,
        assistantPhone,
        assistantName: staffUser?.name || assistantProfile?.name || currentUser?.name
      },
      (firestoreList) => {
        if (firestoreList.length > 0) {
          applyMergedBookings(firestoreList);
        } else {
          // Also sync with backend API if Firestore returned empty (or all were cancelled/completed)
          refreshBookings();
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [
    currentRole,
    customerProfile?.id,
    customerProfile?.phone,
    customerProfile?.name,
    assistantProfile?.id,
    assistantProfile?.phone,
    assistantProfile?.name,
    staffUser?.eplId,
    staffUser?.number,
    staffUser?.name,
    currentUser?.phone,
    currentUser?.name,
    applyMergedBookings,
    refreshBookings
  ]);

  // Subscribe to real-time live assistant GPS coordinates in Firestore for the active booking
  useEffect(() => {
    if (!activeBooking?.id) {
      setLiveAssistantCoords(null);
      setLiveDistanceKm(0);
      setLiveEtaMinutes(0);
      return;
    }

    // Seed from existing real assistantLocation on the booking if available
    if (
      activeBooking.assistantLocation &&
      (activeBooking.assistantLocation.latitude !== undefined || activeBooking.assistantLocation.lat !== undefined)
    ) {
      const initLat = Number(activeBooking.assistantLocation.latitude ?? activeBooking.assistantLocation.lat);
      const initLng = Number(activeBooking.assistantLocation.longitude ?? activeBooking.assistantLocation.lng);
      if (!Number.isNaN(initLat) && !Number.isNaN(initLng)) {
        setLiveAssistantCoords({ lat: initLat, lng: initLng });
      }
    } else {
      setLiveAssistantCoords(null);
    }

    const unsubLive = subscribeToBookingLiveLocation(activeBooking.id, (loc, updatedBooking) => {
      setLiveAssistantCoords({ lat: loc.latitude, lng: loc.longitude });
      if (updatedBooking) {
        setActiveBooking((prev) => (prev && prev.id === updatedBooking.id ? { ...prev, ...updatedBooking } : prev));
      }

      const pickupLat = activeBooking.pickupLocation?.lat ?? activeBooking.location?.lat;
      const pickupLng = activeBooking.pickupLocation?.lng ?? activeBooking.location?.lng;
      if (pickupLat && pickupLng) {
        api
          .getRoute(loc.latitude, loc.longitude, pickupLat, pickupLng, 'TWO_WHEELER')
          .then((routeRes) => {
            if (routeRes && routeRes.success) {
              setLiveDistanceKm(routeRes.distanceKm);
              setLiveEtaMinutes(routeRes.durationMinutes);
            }
          })
          .catch(() => {});
      }
    });

    return () => {
      unsubLive();
    };
  }, [activeBooking?.id, activeBooking?.location?.lat, activeBooking?.location?.lng]);

  // In-Progress Service Timer Tick
  useEffect(() => {
    const norm = normalizeBookingStatus(activeBooking?.status);
    if (activeBooking && norm === 'in_progress') {
      const timer = setInterval(() => {
        setActiveBooking((prev) => {
          if (!prev || normalizeBookingStatus(prev.status) !== 'in_progress') return prev;
          const currentElapsed = (prev.timerElapsedSeconds || 0) + 1;
          return { ...prev, timerElapsedSeconds: currentElapsed };
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeBooking?.status, activeBooking?.id]);

  const createBooking = async (bookingData: Partial<Booking>): Promise<Booking> => {
    const cleanPhone = (bookingData.customerPhone || customerProfile?.phone || currentUser?.phone || '').replace(/\D/g, '').slice(-10);
    const resolvedCustomerId =
      bookingData.customerId || customerProfile?.id || (cleanPhone ? `cust-${cleanPhone}` : currentUser?.id || `cust-${Date.now()}`);
    const resolvedCustomerUid = auth.currentUser?.uid || bookingData.customerUid || currentUser?.id || resolvedCustomerId;

    const enrichedPayload: Partial<Booking> = {
      ...bookingData,
      customerId: resolvedCustomerId,
      customerUid: resolvedCustomerUid,
      customerName: bookingData.customerName || customerProfile?.name || currentUser?.name || 'Customer',
      customerPhone: cleanPhone || bookingData.customerPhone || '',
      status: 'pending'
    };

    const created = await api.createBooking(enrichedPayload);
    const finalBooking: Booking = {
      ...enrichedPayload,
      ...created,
      id: created.id || `bk-${Date.now()}`,
      requestId: created.requestId || created.bookingNumber || `REQ-${Date.now()}`,
      bookingNumber: created.bookingNumber || created.requestId || `DBL-${Date.now()}`,
      customerId: resolvedCustomerId,
      customerUid: resolvedCustomerUid,
      status: 'pending',
      createdAt: created.createdAt || new Date().toISOString()
    } as Booking;

    // Immediately write to Firestore so Assistant Portal's real-time onSnapshot listener receives it without refresh
    await saveBookingToFirestore(finalBooking);

    prevBookingStatusesRef.current.set(finalBooking.id, 'pending');
    setBookings((prev) => [finalBooking, ...prev.filter((b) => b.id !== finalBooking.id)]);
    setActiveBooking(finalBooking);

    addNotification(
      'Booking Request Sent',
      `Your request (${finalBooking.bookingNumber}) for ${finalBooking.serviceName} has been sent to available assistants.`,
      'BOOKING',
      finalBooking.id
    );
    sendBookingUpdatePushNotification(finalBooking, 'CREATED').catch(() => {});
    return finalBooking;
  };

  const acceptBooking = async (
    bookingId: string,
    assistantId?: string,
    assistantDetails?: {
      assistantUid?: string;
      assistantName?: string;
      assistantPhone?: string;
      assistantPhoto?: string;
      assistantRating?: number;
    }
  ) => {
    const resolvedAsstId = assistantId || staffUser?.eplId || assistantProfile?.id || 'asst-1';
    const resolvedDetails = {
      assistantUid: assistantDetails?.assistantUid || auth.currentUser?.uid || resolvedAsstId,
      assistantName: assistantDetails?.assistantName || staffUser?.name || assistantProfile?.name || 'Rajesh Sharma',
      assistantPhone: assistantDetails?.assistantPhone || staffUser?.number || assistantProfile?.phone || '9820554433',
      assistantPhoto:
        assistantDetails?.assistantPhoto ||
        assistantProfile?.photo ||
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
      assistantRating: assistantDetails?.assistantRating || assistantProfile?.rating || 4.95
    };

    const acceptedAt = new Date().toISOString();
    await Promise.all([
      api.acceptBooking(bookingId, resolvedAsstId, resolvedDetails),
      updateBookingInFirestore(bookingId, {
        status: 'accepted',
        assistantId: resolvedAsstId,
        ...resolvedDetails,
        acceptedAt
      })
    ]);

    await refreshBookings();
  };

  const rejectBooking = async (bookingId: string, assistantId?: string) => {
    const resolvedAsstId = assistantId || staffUser?.eplId || assistantProfile?.id || 'asst-1';
    const rejectedAt = new Date().toISOString();
    await Promise.all([
      api.rejectBooking(bookingId, resolvedAsstId),
      updateBookingInFirestore(bookingId, {
        status: 'rejected',
        rejectedAt
      })
    ]);
    await refreshBookings();
  };

  const startAssistance = async (bookingId: string) => {
    const startedAt = new Date().toISOString();
    await Promise.all([
      api.startBookingAssistance(bookingId),
      updateBookingInFirestore(bookingId, {
        status: 'in_progress',
        startedAt
      })
    ]);
    await refreshBookings();
  };

  const updateAssistantLiveLocation = async (
    bookingId: string,
    coords: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      heading?: number | null;
      speed?: number | null;
      address?: string;
    }
  ) => {
    setLiveAssistantCoords({ lat: coords.latitude, lng: coords.longitude });
    await Promise.all([
      updateAssistantLiveLocationInFirestore(bookingId, coords),
      api.updateBookingAssistantLocation(bookingId, coords)
    ]);
  };

  const verifyStartOtp = async (bookingId: string, otp: string): Promise<boolean> => {
    try {
      const res = await api.verifyBookingOtp(bookingId, otp);
      if (res.success) {
        await updateBookingInFirestore(bookingId, {
          status: 'in_progress',
          startedAt: new Date().toISOString()
        });
        await refreshBookings();
        const target = bookings.find((b) => b.id === bookingId) || activeBooking || { id: bookingId };
        addNotification(
          'Assistance in Progress',
          'OTP verified! Your Diblo assistant has started the assistance session.',
          'BOOKING',
          bookingId
        );
        sendBookingUpdatePushNotification(target as any, 'STARTED').catch(() => {});
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const extendBooking = async (bookingId: string, extraHours: number) => {
    await api.extendBookingHours(bookingId, extraHours);
    await refreshBookings();
    const target = bookings.find((b) => b.id === bookingId) || activeBooking || { id: bookingId };
    addNotification('Booking Extended', `Added ${extraHours} more hour(s) to your active booking.`, 'BOOKING', bookingId);
    sendBookingUpdatePushNotification(target as any, 'EXTENDED').catch(() => {});
  };

  const completeBooking = async (bookingId: string) => {
    const completedAt = new Date().toISOString();
    await Promise.all([
      api.completeBooking(bookingId),
      updateBookingInFirestore(bookingId, {
        status: 'completed',
        completedAt
      })
    ]);
    await refreshBookings();
  };

  const cancelBooking = async (bookingId: string, reason: string) => {
    const cancelledAt = new Date().toISOString();
    await Promise.all([
      api.cancelBooking(bookingId, reason),
      updateBookingInFirestore(bookingId, {
        status: 'cancelled',
        cancellationReason: reason,
        cancelledAt
      })
    ]);
    await refreshBookings();
    const target = bookings.find((b) => b.id === bookingId) || activeBooking || { id: bookingId, cancellationReason: reason };
    addNotification('Booking Cancelled', `Booking was cancelled: ${reason}`, 'BOOKING', bookingId);
    sendBookingUpdatePushNotification({ ...(target as any), cancellationReason: reason }, 'CANCELLED').catch(() => {});
  };

  const rateBooking = async (
    bookingId: string,
    stars: number,
    comment?: string,
    tags?: string[],
    tipAmount?: number,
    tipPaymentMethod?: string
  ) => {
    const ratingObj = {
      stars,
      comment,
      customerFeedbackTags: tags,
      tipAmount: tipAmount || 0,
      createdAt: new Date().toISOString()
    };
    await Promise.all([
      api.rateBooking(bookingId, {
        stars,
        comment,
        feedbackTags: tags,
        tipAmount: tipAmount || 0,
        tipPaymentMethod
      }),
      updateBookingInFirestore(bookingId, {
        rating: ratingObj,
        tipAmount: tipAmount || 0,
        tipPaymentMethod
      })
    ]);
    dismissedBookingFeedbackIds.current.add(bookingId);
    setCompletedFeedbackBooking(null);
    await refreshBookings();
    addNotification(
      'Rating & Tip Submitted',
      tipAmount && tipAmount > 0
        ? `Thank you! Your ${stars}★ rating and ₹${tipAmount} tip have been delivered to your assistant.`
        : 'Thank you for your rating! It helps maintain quality at Diblo.',
      'SUPPORT',
      bookingId
    );
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
        activeBooking,
        notifications,
        pricing,
        isLoading,
        liveEtaMinutes,
        liveDistanceKm,
        liveAssistantCoords,
        pushPermission,
        fcmToken,
        notificationPreferences,
        updateNotificationPreferences,
        requestPushNotificationPermission,
        sendTestBookingPush,
        triggerOneHourReminderTest,
        isReminderSentForBooking,
        completedFeedbackBooking,
        setCompletedFeedbackBooking,
        dismissFeedbackModal,
        refreshBookings,
        createBooking,
        acceptBooking,
        rejectBooking,
        startAssistance,
        updateAssistantLiveLocation,
        verifyStartOtp,
        extendBooking,
        completeBooking,
        cancelBooking,
        rateBooking,
        setActiveBooking,
        markNotificationRead,
        addNotification
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBooking must be used within a BookingProvider');
  return context;
};
