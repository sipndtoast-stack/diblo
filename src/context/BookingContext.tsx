import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Booking, InAppNotification, PricingConfig } from '../types';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import {
  getPushPermission,
  requestPushPermission,
  sendOneHourPushReminder,
  checkAndDispatchUpcomingReminders,
  isOneHourReminderSent,
  resetOneHourReminder,
  PushPermissionStatus
} from '../lib/pushNotificationService';

interface BookingContextType {
  bookings: Booking[];
  activeBooking: Booking | null;
  notifications: InAppNotification[];
  pricing: PricingConfig | null;
  isLoading: boolean;
  liveEtaMinutes: number;
  liveDistanceKm: number;
  liveAssistantCoords: { lat: number; lng: number };
  pushPermission: PushPermissionStatus;
  requestPushNotificationPermission: () => Promise<PushPermissionStatus>;
  triggerOneHourReminderTest: (bookingId?: string) => Promise<{ success: boolean; pushSent: boolean; message: string }>;
  isReminderSentForBooking: (bookingId: string) => boolean;
  refreshBookings: () => Promise<void>;
  createBooking: (bookingData: Partial<Booking>) => Promise<Booking>;
  acceptBooking: (bookingId: string, assistantId?: string) => Promise<void>;
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

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, currentRole } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<InAppNotification[]>([
    {
      id: 'notif-1',
      userId: 'user-c-1',
      title: 'Assistant Assigned',
      message: 'Rajesh Sharma is assigned to your Senior Citizen Assistance booking.',
      type: 'BOOKING',
      bookingId: 'bk-101',
      isRead: false,
      createdAt: new Date().toISOString()
    }
  ]);

  // Automated Push Notification Reminders state
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus>(() => getPushPermission());

  const requestPushNotificationPermission = async (): Promise<PushPermissionStatus> => {
    const status = await requestPushPermission();
    setPushPermission(status);
    return status;
  };

  const isReminderSentForBooking = (bookingId: string): boolean => {
    return isOneHourReminderSent(bookingId);
  };

  const triggerOneHourReminderTest = async (
    bookingId?: string
  ): Promise<{ success: boolean; pushSent: boolean; message: string }> => {
    // Find matching booking or select/fallback to first customer booking
    let targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking) {
      targetBooking = bookings.find(
        (b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED'
      ) || bookings[0];
    }

    if (!targetBooking) {
      targetBooking = {
        id: 'bk-test-reminder',
        bookingNumber: 'DBL-2026-TEST',
        customerId: currentUser?.id || 'cust-1',
        customerName: currentUser?.name || 'Customer',
        customerPhone: '9820123456',
        serviceId: 'senior-citizen-assistance',
        serviceName: 'Senior Citizen Assistance',
        serviceIcon: 'HeartHandshake',
        location: {
          address: 'Carter Road, Bandra West, Mumbai',
          area: 'Bandra West',
          lat: 19.0607,
          lng: 72.8258
        },
        dateType: 'TODAY',
        scheduledDate: new Date().toISOString().split('T')[0],
        startTime: '11:00 AM',
        bookedHours: 2,
        additionalHours: 0,
        totalHours: 2,
        hourlyRate: 149,
        baseAmount: 298,
        discountAmount: 0,
        taxAmount: 15,
        totalAmount: 313,
        genderPreference: 'ANY',
        status: 'ASSIGNED',
        assistantId: 'asst-1',
        assistantName: 'Rajesh Sharma',
        assistantPhone: '9820554433',
        startOtp: '4821',
        paymentStatus: 'PAID',
        createdAt: new Date().toISOString()
      };
    }

    // Reset so the test reminder triggers cleanly
    resetOneHourReminder(targetBooking.id);

    // Send push reminder
    const result = await sendOneHourPushReminder(targetBooking, true);

    // Add In-App Notification Toast
    addNotification(
      `⏰ 1-Hour Reminder: ${targetBooking.serviceName}`,
      `Your assistance session starts in 1 hour at ${targetBooking.startTime} in ${targetBooking.location.area || 'Mumbai'}. ${targetBooking.assistantName || 'Your assistant'} is preparing for dispatch.`,
      'BOOKING',
      targetBooking.id
    );

    return result;
  };

  // Automated periodic check for 1-hour session reminders (runs every 30s)
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

    // Initial check on mount/bookings change
    runAutomatedReminders();

    // 30-second interval check
    const reminderInterval = setInterval(runAutomatedReminders, 30000);
    return () => clearInterval(reminderInterval);
  }, [bookings]);

  // Live tracking simulation states
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number>(7);
  const [liveDistanceKm, setLiveDistanceKm] = useState<number>(1.8);
  const [liveAssistantCoords, setLiveAssistantCoords] = useState<{ lat: number; lng: number }>({
    lat: 19.0550,
    lng: 72.8310
  });

  // Post-booking feedback modal state
  const [completedFeedbackBooking, setCompletedFeedbackBooking] = useState<Booking | null>(null);
  const dismissedBookingFeedbackIds = useRef<Set<string>>(new Set());

  const dismissFeedbackModal = (bookingId: string) => {
    dismissedBookingFeedbackIds.current.add(bookingId);
    setCompletedFeedbackBooking((prev) => (prev?.id === bookingId ? null : prev));
  };

  const refreshBookings = async () => {
    try {
      const data = await api.getBookings();
      const safeData = Array.isArray(data) ? data : [];
      setBookings(safeData);
      const active = safeData.find(
        (b) =>
          b.status !== 'COMPLETED' &&
          b.status !== 'CANCELLED' &&
          (currentRole === 'ADMIN' ||
            currentRole === 'OPERATIONS' ||
            (currentRole === 'CUSTOMER' && (b.customerId === 'cust-1' || !b.customerId)) ||
            (currentRole === 'ASSISTANT' && b.assistantId === 'asst-1'))
      );
      if (active && (!activeBooking || activeBooking.id === active.id)) {
        setActiveBooking(active);
      } else if (!active && activeBooking && activeBooking.status !== 'COMPLETED') {
        const prevNowCompleted = safeData.find((b) => b.id === activeBooking.id && b.status === 'COMPLETED');
        if (prevNowCompleted) {
          setActiveBooking(prevNowCompleted);
        }
      }

      // Automatically trigger feedback modal when any customer booking is COMPLETED and unrated
      if (currentRole === 'CUSTOMER') {
        const justCompleted = safeData.find(
          (b) =>
            b.status === 'COMPLETED' &&
            !b.rating &&
            (b.customerId === 'cust-1' || !b.customerId) &&
            !dismissedBookingFeedbackIds.current.has(b.id)
        );
        if (justCompleted && !completedFeedbackBooking) {
          setCompletedFeedbackBooking(justCompleted);
        }
      }
    } catch (e) {
      console.error('Failed to fetch bookings', e);
    }
  };

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [bookingsData, pricingData] = await Promise.all([
          api.getBookings(),
          api.getPricing()
        ]);
        const safeBookings = Array.isArray(bookingsData) ? bookingsData : [];
        setBookings(safeBookings);
        setPricing(pricingData);

        // Find primary active booking
        const active = safeBookings.find(
          (b) => b.status === 'ON_THE_WAY' || b.status === 'IN_PROGRESS' || b.status === 'ASSIGNED' || b.status === 'ACCEPTED'
        );
        if (active) setActiveBooking(active);
      } catch (err) {
        console.error('Failed to load booking context data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Poll server every 5 seconds for status changes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshBookings();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentRole]);

  // Live Location Movement Simulation for active booking
  useEffect(() => {
    if (!activeBooking) return;

    if (activeBooking.status === 'ON_THE_WAY') {
      const destLat = activeBooking.location.lat || 19.0607;
      const destLng = activeBooking.location.lng || 72.8258;

      const movementTimer = setInterval(() => {
        setLiveAssistantCoords((prev) => {
          const dLat = (destLat - prev.lat) * 0.08;
          const dLng = (destLng - prev.lng) * 0.08;
          const nextLat = prev.lat + dLat;
          const nextLng = prev.lng + dLng;

          const dist = Math.sqrt(Math.pow((destLat - nextLat) * 111, 2) + Math.pow((destLng - nextLng) * 111, 2));
          const roundedDist = Math.max(0.05, Number(dist.toFixed(2)));
          setLiveDistanceKm(roundedDist);
          setLiveEtaMinutes(Math.max(1, Math.ceil(roundedDist * 4)));

          if (roundedDist < 0.1) {
            // Arrived
            api.arriveBooking(activeBooking.id).then(() => {
              addNotification(
                'Assistant Arrived!',
                `${activeBooking.assistantName || 'Your assistant'} has reached your location. Share the Start OTP to begin.`,
                'ASSISTANT',
                activeBooking.id
              );
              refreshBookings();
            });
          }

          return { lat: nextLat, lng: nextLng };
        });
      }, 3000);

      return () => clearInterval(movementTimer);
    }
  }, [activeBooking?.status, activeBooking?.id]);

  // In-Progress Service Timer Tick
  useEffect(() => {
    if (activeBooking && activeBooking.status === 'IN_PROGRESS') {
      const timer = setInterval(() => {
        setActiveBooking((prev) => {
          if (!prev || prev.status !== 'IN_PROGRESS') return prev;
          const currentElapsed = (prev.timerElapsedSeconds || 0) + 1;
          return { ...prev, timerElapsedSeconds: currentElapsed };
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeBooking?.status]);

  const addNotification = (title: string, message: string, type: InAppNotification['type'] = 'BOOKING', bookingId?: string) => {
    const newNotif: InAppNotification = {
      id: `notif-${Date.now()}`,
      userId: currentUser?.id || 'guest',
      title,
      message,
      type,
      bookingId,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const createBooking = async (bookingData: Partial<Booking>): Promise<Booking> => {
    const created = await api.createBooking(bookingData);
    await refreshBookings();
    setActiveBooking(created);
    addNotification(
      'Booking Created',
      `Searching for nearby Diblo assistants for ${created.serviceName}...`,
      'BOOKING',
      created.id
    );
    return created;
  };

  const acceptBooking = async (bookingId: string, assistantId?: string) => {
    await api.acceptBooking(bookingId, assistantId);
    await refreshBookings();
    addNotification('Booking Accepted', 'Assistant has confirmed your booking and is on the way!', 'ASSISTANT', bookingId);
  };

  const verifyStartOtp = async (bookingId: string, otp: string): Promise<boolean> => {
    try {
      const res = await api.verifyBookingOtp(bookingId, otp);
      if (res.success) {
        await refreshBookings();
        addNotification('Task Started', 'OTP verified successfully. Your Diblo assistant has started the task!', 'BOOKING', bookingId);
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
    addNotification('Booking Extended', `Added ${extraHours} more hour(s) to your active booking.`, 'BOOKING', bookingId);
  };

  const completeBooking = async (bookingId: string) => {
    await api.completeBooking(bookingId);
    const updatedBookings = await api.getBookings();
    const safeUpdated = Array.isArray(updatedBookings) ? updatedBookings : [];
    setBookings(safeUpdated);
    const completed = safeUpdated.find((b) => b.id === bookingId);
    if (completed) {
      setActiveBooking(completed);
      if (!completed.rating && !dismissedBookingFeedbackIds.current.has(completed.id)) {
        setCompletedFeedbackBooking(completed);
      }
    }
    addNotification('Task Completed', 'Your task has been completed successfully. Please rate your assistant and leave a tip!', 'BOOKING', bookingId);
  };

  const cancelBooking = async (bookingId: string, reason: string) => {
    await api.cancelBooking(bookingId, reason);
    await refreshBookings();
    addNotification('Booking Cancelled', `Booking was cancelled: ${reason}`, 'BOOKING', bookingId);
  };

  const rateBooking = async (
    bookingId: string,
    stars: number,
    comment?: string,
    tags?: string[],
    tipAmount?: number,
    tipPaymentMethod?: string
  ) => {
    await api.rateBooking(bookingId, {
      stars,
      comment,
      feedbackTags: tags,
      tipAmount: tipAmount || 0,
      tipPaymentMethod
    });
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
        requestPushNotificationPermission,
        triggerOneHourReminderTest,
        isReminderSentForBooking,
        completedFeedbackBooking,
        setCompletedFeedbackBooking,
        dismissFeedbackModal,
        refreshBookings,
        createBooking,
        acceptBooking,
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
