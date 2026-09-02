import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Booking, InAppNotification, PricingConfig } from '../types';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface BookingContextType {
  bookings: Booking[];
  activeBooking: Booking | null;
  notifications: InAppNotification[];
  pricing: PricingConfig | null;
  isLoading: boolean;
  liveEtaMinutes: number;
  liveDistanceKm: number;
  liveAssistantCoords: { lat: number; lng: number };
  refreshBookings: () => Promise<void>;
  createBooking: (bookingData: Partial<Booking>) => Promise<Booking>;
  acceptBooking: (bookingId: string, assistantId?: string) => Promise<void>;
  verifyStartOtp: (bookingId: string, otp: string) => Promise<boolean>;
  extendBooking: (bookingId: string, extraHours: number) => Promise<void>;
  completeBooking: (bookingId: string) => Promise<void>;
  cancelBooking: (bookingId: string, reason: string) => Promise<void>;
  rateBooking: (bookingId: string, stars: number, comment?: string, tags?: string[]) => Promise<void>;
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

  // Live tracking simulation states
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number>(7);
  const [liveDistanceKm, setLiveDistanceKm] = useState<number>(1.8);
  const [liveAssistantCoords, setLiveAssistantCoords] = useState<{ lat: number; lng: number }>({
    lat: 19.0550,
    lng: 72.8310
  });

  const refreshBookings = async () => {
    try {
      const data = await api.getBookings();
      setBookings(data);
      const active = data.find(
        (b) =>
          b.status !== 'COMPLETED' &&
          b.status !== 'CANCELLED' &&
          (currentRole === 'ADMIN' ||
            currentRole === 'OPERATIONS' ||
            (currentRole === 'CUSTOMER' && b.customerId === 'cust-1') ||
            (currentRole === 'ASSISTANT' && b.assistantId === 'asst-1'))
      );
      if (active && (!activeBooking || activeBooking.id === active.id)) {
        setActiveBooking(active);
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
        setBookings(bookingsData);
        setPricing(pricingData);

        // Find primary active booking
        const active = bookingsData.find(
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
    await refreshBookings();
    addNotification('Task Completed', 'Your task has been completed successfully. Please rate your assistant!', 'BOOKING', bookingId);
  };

  const cancelBooking = async (bookingId: string, reason: string) => {
    await api.cancelBooking(bookingId, reason);
    await refreshBookings();
    addNotification('Booking Cancelled', `Booking was cancelled: ${reason}`, 'BOOKING', bookingId);
  };

  const rateBooking = async (bookingId: string, stars: number, comment?: string, tags?: string[]) => {
    await api.rateBooking(bookingId, { stars, comment, feedbackTags: tags });
    await refreshBookings();
    addNotification('Rating Submitted', 'Thank you for your feedback! It helps maintain quality at Diblo.', 'SUPPORT', bookingId);
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
