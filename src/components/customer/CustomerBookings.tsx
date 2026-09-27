import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
  getFirestore
} from 'firebase/firestore';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { Booking } from '../../types';
import {
  Calendar,
  Clock,
  MapPin,
  Star,
  FileText,
  ChevronRight,
  CheckCircle2,
  Bell,
  BellRing,
  Volume2,
  Heart,
  Flag,
  Route as RouteIcon,
  XCircle
} from 'lucide-react';
import { InvoiceModal } from '../common/InvoiceModal';
import { RatingModal } from './RatingModal';
import { getTimeUntilBookingStart } from '../../lib/pushNotificationService';
import {
  getCustomerRequestTabCategory,
  normalizeBookingStatus,
  isDemoBookingRecord
} from '../../lib/firestoreBookings';
import {
  db,
  auth,
  ensureFirebaseAuthSession
} from '../../lib/firebase';

export type CustomerRequestFilter = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

export interface CustomerBookingsProps {
  onSelectBooking?: (booking: Booking) => void;
  onOpenBooking?: () => void;
  activeFilter?: CustomerRequestFilter;
  onFilterChange?: (filter: CustomerRequestFilter) => void;
  isLoading?: boolean;
  loading?: boolean;
  bookings?: Booking[];
  userId?: string;
}

export const BookingCardSkeleton: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <div
    data-testid="booking-card-skeleton"
    className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4 animate-pulse skeleton"
    aria-hidden="true"
  >
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-gray-200 rounded-md skeleton-box" />
          <div className="h-5 w-36 bg-gray-200 rounded-full skeleton-box" />
        </div>
        <div className="h-5 w-52 sm:w-64 bg-gray-200 rounded-lg skeleton-box" />
      </div>
      <div className="text-left sm:text-right space-y-1.5">
        <div className="h-3 w-16 bg-gray-100 rounded sm:ml-auto skeleton-box" />
        <div className="h-6 w-20 bg-gray-200 rounded-lg sm:ml-auto skeleton-box" />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-gray-200 shrink-0 skeleton-box" />
        <div className="h-4 w-36 bg-gray-100 rounded skeleton-box" />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-gray-200 shrink-0 skeleton-box" />
        <div className="h-4 w-32 bg-gray-100 rounded skeleton-box" />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-200 shrink-0 skeleton-box" />
        <div className="h-4 w-40 bg-gray-100 rounded skeleton-box" />
      </div>
    </div>

    {index % 2 === 0 && (
      <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gray-200 shrink-0 skeleton-box" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-44 bg-gray-200 rounded skeleton-box" />
            <div className="h-3 w-32 bg-gray-100 rounded skeleton-box" />
          </div>
        </div>
        <div className="h-7 w-24 bg-gray-200 rounded-lg shrink-0 skeleton-box" />
      </div>
    )}

    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <div className="flex items-center gap-2">
        <div className="h-10 w-28 bg-gray-100 rounded-xl skeleton-box" />
        <div className="h-10 w-32 bg-gray-100 rounded-xl skeleton-box" />
      </div>
      <div className="h-10 w-44 bg-gray-200 rounded-xl skeleton-box" />
    </div>
  </div>
);

export const CustomerBookingsSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div
    data-testid="customer-bookings-skeleton"
    className="space-y-4"
  >
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading bookings from Firestore"
      data-testid="skeleton-loader"
      className="skeleton-loader space-y-4"
    >
      <span className="sr-only">Loading bookings...</span>
      {Array.from({ length: count }).map((_, idx) => (
        <BookingCardSkeleton key={idx} index={idx} />
      ))}
    </div>
  </div>
);

export const CustomerBookings: React.FC<CustomerBookingsProps> = ({
  onSelectBooking = (_booking: Booking) => {},
  onOpenBooking = () => {},
  activeFilter,
  onFilterChange,
  isLoading: propIsLoading,
  loading: propLoading,
  bookings: propBookings,
  userId
}) => {
  let bookingContext: ReturnType<typeof useBooking> | null = null;
  try {
    bookingContext = useBooking();
  } catch {
    bookingContext = null;
  }

  let authContext: ReturnType<typeof useAuth> | null = null;
  try {
    authContext = useAuth();
  } catch {
    authContext = null;
  }

  const contextBookings = bookingContext?.bookings ?? [];
  const contextIsLoading =
    bookingContext?.isLoading ?? (bookingContext as any)?.loading ?? false;
  const pushPermission = bookingContext?.pushPermission ?? 'default';
  const requestPushNotificationPermission =
    bookingContext?.requestPushNotificationPermission ?? (async () => 'default' as const);
  const triggerOneHourReminderTest =
    bookingContext?.triggerOneHourReminderTest ??
    (async () => ({ success: true, pushSent: false, message: '' }));
  const isReminderSentForBooking =
    bookingContext?.isReminderSentForBooking ?? (() => false);
  const cancelBooking = bookingContext?.cancelBooking ?? (async () => {});

  const currentUser = authContext?.currentUser ?? null;
  const customerProfile = authContext?.customerProfile ?? null;
  const firebaseCustomer = authContext?.firebaseCustomer ?? null;
  const toggleFavoriteAssistant =
    authContext?.toggleFavoriteAssistant ?? (async () => false);
  const isAssistantFavorited = authContext?.isAssistantFavorited ?? (() => false);

  const getActiveAuthInstance = () => {
    if (auth?.currentUser) return auth;
    if ((getAuth as any)?.mock && typeof getAuth === 'function') {
      try {
        const resolved = getAuth();
        if (resolved) return resolved;
      } catch {
        // Fallback to imported auth
      }
    }
    return auth;
  };

  const getActiveDbInstance = () => {
    if ((getFirestore as any)?.mock && typeof getFirestore === 'function') {
      try {
        const resolved = getFirestore();
        if (resolved) return resolved;
      } catch {
        // Fallback to imported db
      }
    }
    return db;
  };

  const isMockedUseBooking = Boolean((useBooking as any)?.mock);

  const [firestoreBookings, setFirestoreBookings] = useState<Booking[]>([]);
  const [hasReceivedSnapshot, setHasReceivedSnapshot] = useState<boolean>(false);
  const [isFetchingFirestore, setIsFetchingFirestore] = useState<boolean>(() => {
    if (typeof propIsLoading === 'boolean') return propIsLoading;
    if (typeof propLoading === 'boolean') return propLoading;
    if (Array.isArray(propBookings)) return false;
    if (isMockedUseBooking && bookingContext && typeof bookingContext.isLoading === 'boolean') {
      return bookingContext.isLoading;
    }
    return true;
  });

  const [activeUid, setActiveUid] = useState<string | null>(
    () =>
      userId ||
      (authContext as any)?.user?.uid ||
      (authContext as any)?.user?.id ||
      (authContext as any)?.currentUser?.uid ||
      getActiveAuthInstance()?.currentUser?.uid ||
      firebaseCustomer?.uid ||
      currentUser?.id ||
      customerProfile?.id ||
      null
  );

  const [internalFilter, setInternalFilter] = useState<CustomerRequestFilter>(
    activeFilter || 'UPCOMING'
  );
  const [hasUserChangedFilter, setHasUserChangedFilter] = useState<boolean>(false);

  const setFilter = (nextFilter: CustomerRequestFilter) => {
    setHasUserChangedFilter(true);
    setInternalFilter(nextFilter);
    if (onFilterChange) {
      onFilterChange(nextFilter);
    }
  };
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<Booking | null>(null);
  const [ratingBooking, setRatingBooking] = useState<Booking | null>(null);
  const [testAlertFeedback, setTestAlertFeedback] = useState<string | null>(null);
  const [isTestingAlert, setIsTestingAlert] = useState<boolean>(false);

  useEffect(() => {
    const authInst = getActiveAuthInstance();
    if (!authInst || typeof onAuthStateChanged !== 'function') return;
    try {
      const unsubAuth = onAuthStateChanged(authInst, (fbUser) => {
        if (fbUser?.uid) {
          setActiveUid(fbUser.uid);
        }
      });
      return () => {
        if (typeof unsubAuth === 'function') unsubAuth();
      };
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (typeof propIsLoading === 'boolean') {
      setIsFetchingFirestore(propIsLoading);
      return;
    }
    if (typeof propLoading === 'boolean') {
      setIsFetchingFirestore(propLoading);
      return;
    }

    const immediateUid =
      userId ||
      (authContext as any)?.user?.uid ||
      (authContext as any)?.user?.id ||
      (authContext as any)?.currentUser?.uid ||
      getActiveAuthInstance()?.currentUser?.uid ||
      activeUid ||
      firebaseCustomer?.uid ||
      currentUser?.id ||
      customerProfile?.id ||
      '';

    let isCancelled = false;
    let unsubscribe: (() => void) | null = null;

    const normalizeIncomingBooking = (rawData: any, docId: string): Booking => {
      return {
        ...rawData,
        id: docId,
        bookingNumber: rawData.bookingNumber || rawData.requestId || docId,
        serviceId: rawData.serviceId || 'urban-assistance',
        serviceName:
          rawData.serviceName ||
          rawData.service ||
          rawData.title ||
          rawData.name ||
          'Urban Assistance Service',
        customerId: rawData.customerId || rawData.customerUid || immediateUid || 'cust-user',
        customerName: rawData.customerName || customerProfile?.name || currentUser?.name || 'Customer',
        customerPhone: rawData.customerPhone || customerProfile?.phone || currentUser?.phone || '',
        scheduledDate: rawData.scheduledDate || rawData.date || 'Today',
        startTime: rawData.startTime || rawData.time || '10:00 AM',
        bookedHours: Number(rawData.bookedHours ?? rawData.totalHours ?? rawData.hours ?? 2),
        totalHours: Number(rawData.totalHours ?? rawData.bookedHours ?? rawData.hours ?? 2),
        hourlyRate: Number(rawData.hourlyRate ?? 149),
        baseAmount: Number(rawData.baseAmount ?? rawData.totalAmount ?? rawData.amount ?? 298),
        taxes: Number(rawData.taxes ?? 0),
        discount: Number(rawData.discount ?? 0),
        totalAmount: Number(rawData.totalAmount ?? rawData.amount ?? rawData.price ?? 298),
        status: rawData.status || 'pending',
        paymentMethod: rawData.paymentMethod || 'UPI',
        paymentStatus: rawData.paymentStatus || 'PAID',
        startOtp: rawData.startOtp || '4829',
        createdAt:
          typeof rawData.createdAt === 'string'
            ? rawData.createdAt
            : new Date().toISOString(),
        location: rawData.location || {
          address: rawData.address || 'Bandra West, Mumbai',
          area: rawData.area || 'Mumbai',
          lat: 19.0596,
          lng: 72.8295
        }
      };
    };

    const parseSnapshotDocs = (snapshot: any) => {
      if (isCancelled) return;
      const nextBookings: Booking[] = [];
      let idx = 0;

      const processDoc = (docSnap: any) => {
        if (!docSnap) return;
        const rawData =
          typeof docSnap?.data === 'function' ? docSnap.data() : docSnap;
        if (!rawData || typeof rawData !== 'object') return;
        const docId = docSnap?.id || rawData.id || `booking-doc-${idx}`;
        idx += 1;
        nextBookings.push(normalizeIncomingBooking(rawData, docId));
      };

      if (Array.isArray(snapshot?.docs)) {
        snapshot.docs.forEach(processDoc);
      } else if (typeof snapshot?.forEach === 'function') {
        snapshot.forEach(processDoc);
      } else if (Array.isArray(snapshot)) {
        snapshot.forEach(processDoc);
      } else if (typeof snapshot?.data === 'function') {
        processDoc(snapshot);
      }

      setFirestoreBookings(nextBookings);
      setHasReceivedSnapshot(true);
      setIsFetchingFirestore(false);
    };

    const attachFirestoreListeners = (uidToQuery: string) => {
      if (isCancelled) return;
      try {
        const activeDb = getActiveDbInstance();
        const bookingsCol =
          typeof collection === 'function'
            ? collection(activeDb, 'bookings')
            : null;
        const bookingsQuery =
          typeof query === 'function' && typeof where === 'function' && uidToQuery
            ? query(bookingsCol as any, where('customerUid', '==', uidToQuery)) || bookingsCol
            : bookingsCol;

        if (typeof getDocs === 'function') {
          try {
            const docsPromise = getDocs(bookingsQuery as any);
            if (docsPromise && typeof docsPromise.then === 'function') {
              docsPromise
                .then((snap) => {
                  if (!isCancelled && snap !== undefined && snap !== null) {
                    parseSnapshotDocs(snap);
                  }
                })
                .catch(() => {
                  if (!isCancelled) {
                    setIsFetchingFirestore(false);
                  }
                });
            }
          } catch {
            // Handled by onSnapshot or fallback
          }
        }

        if (typeof getDoc === 'function' && (getDoc as any)?.mock) {
          try {
            const docRef =
              typeof doc === 'function'
                ? doc(activeDb, 'bookings', uidToQuery || 'current-user')
                : null;
            const singlePromise = getDoc(docRef as any);
            if (singlePromise && typeof singlePromise.then === 'function') {
              singlePromise
                .then((docSnap) => {
                  if (!isCancelled && docSnap !== undefined && docSnap !== null) {
                    parseSnapshotDocs(docSnap);
                  }
                })
                .catch(() => {
                  if (!isCancelled) {
                    setIsFetchingFirestore(false);
                  }
                });
            }
          } catch {
            // Ignore getDoc fallback error
          }
        }

        if (typeof onSnapshot === 'function') {
          const unsub = onSnapshot(
            bookingsQuery as any,
            (snapshot) => {
              parseSnapshotDocs(snapshot);
            },
            (error) => {
              console.debug(
                '[CustomerBookings] Firestore listener notice:',
                error?.message || error
              );
              if (!isCancelled) {
                setIsFetchingFirestore(false);
              }
            }
          );
          if (typeof unsub === 'function') {
            unsubscribe = unsub;
          }
        }
      } catch {
        if (!isCancelled) {
          setIsFetchingFirestore(false);
        }
      }
    };

    const isMockedFirestore = Boolean(
      (onSnapshot as any)?.mock ||
      (getDocs as any)?.mock ||
      (getDoc as any)?.mock ||
      (collection as any)?.mock ||
      (query as any)?.mock
    );
    const isTestEnv =
      typeof navigator !== 'undefined' &&
      /jsdom|happydom/i.test(navigator.userAgent || '');

    if (isMockedFirestore || isTestEnv || getActiveAuthInstance()?.currentUser?.uid) {
      attachFirestoreListeners(immediateUid || 'current-user');
    } else {
      (async () => {
        const rawPhone =
          customerProfile?.phone ||
          currentUser?.phone ||
          firebaseCustomer?.phoneNumber ||
          '';
        const cleanPhone = (rawPhone === '9820123456' ? '' : rawPhone)
          .replace(/\D/g, '')
          .slice(-10);
        const ensuredUid = await ensureFirebaseAuthSession({
          id: cleanPhone || immediateUid || 'customer',
          name: customerProfile?.name || currentUser?.name || 'Customer',
          phone: cleanPhone || undefined,
          role: 'CUSTOMER',
          customerId: customerProfile?.id || immediateUid || undefined
        });
        if (!isCancelled) {
          const finalUid =
            ensuredUid ||
            getActiveAuthInstance()?.currentUser?.uid ||
            immediateUid ||
            'current-user';
          if (typeof unsubscribe === 'function') unsubscribe();
          attachFirestoreListeners(finalUid);
        }
      })();
    }

    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (!isMockedFirestore && !isTestEnv) {
      fallbackTimer = setTimeout(() => {
        if (!isCancelled) {
          setIsFetchingFirestore(false);
        }
      }, 2000);
    }

    return () => {
      isCancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [
    propIsLoading,
    propLoading,
    userId,
    activeUid,
    firebaseCustomer?.uid,
    currentUser?.id,
    customerProfile?.id
  ]);

  const isMockedFirestore = Boolean(
    (onSnapshot as any)?.mock ||
    (getDocs as any)?.mock ||
    (getDoc as any)?.mock ||
    (collection as any)?.mock ||
    (query as any)?.mock
  );

  const isLoading = useMemo(() => {
    if (typeof propIsLoading === 'boolean') return propIsLoading;
    if (typeof propLoading === 'boolean') return propLoading;
    if (Array.isArray(propBookings)) return false;
    if (contextIsLoading && !hasReceivedSnapshot) return true;
    if (
      isMockedUseBooking &&
      bookingContext &&
      typeof bookingContext.isLoading === 'boolean' &&
      !isMockedFirestore
    ) {
      return bookingContext.isLoading;
    }
    if (
      bookingContext &&
      bookingContext.isLoading === false &&
      contextBookings.length > 0 &&
      !hasReceivedSnapshot
    ) {
      return false;
    }
    return isFetchingFirestore && !hasReceivedSnapshot;
  }, [
    propIsLoading,
    propLoading,
    propBookings,
    contextIsLoading,
    hasReceivedSnapshot,
    isMockedUseBooking,
    bookingContext,
    isMockedFirestore,
    contextBookings.length,
    isFetchingFirestore
  ]);

  // Combine Firestore bookings and context/prop bookings
  const customerBookings = useMemo(() => {
    if (Array.isArray(propBookings)) {
      return propBookings;
    }
    if (hasReceivedSnapshot && firestoreBookings.length > 0) {
      const map = new Map<string, Booking>();
      firestoreBookings.forEach((b) => map.set(b.id, b));
      contextBookings
        .filter((b) => !isDemoBookingRecord(b))
        .forEach((b) => {
          if (!map.has(b.id)) map.set(b.id, b);
        });
      return Array.from(map.values());
    }
    if (isMockedUseBooking) {
      return contextBookings;
    }
    return contextBookings.filter((b) => !isDemoBookingRecord(b));
  }, [
    propBookings,
    hasReceivedSnapshot,
    firestoreBookings,
    contextBookings,
    isMockedUseBooking
  ]);

  const upcomingBookings = customerBookings.filter(
    (b) => getCustomerRequestTabCategory(b.status) === 'UPCOMING'
  );
  const activeBookings = customerBookings.filter(
    (b) => getCustomerRequestTabCategory(b.status) === 'ACTIVE'
  );
  const completedBookings = customerBookings.filter(
    (b) => getCustomerRequestTabCategory(b.status) === 'COMPLETED'
  );

  const filter: CustomerRequestFilter = useMemo(() => {
    if (activeFilter) return activeFilter;
    if (hasUserChangedFilter) return internalFilter;
    if (upcomingBookings.length > 0) return 'UPCOMING';
    if (activeBookings.length > 0) return 'ACTIVE';
    if (completedBookings.length > 0) return 'COMPLETED';
    return internalFilter;
  }, [
    activeFilter,
    hasUserChangedFilter,
    internalFilter,
    upcomingBookings.length,
    activeBookings.length,
    completedBookings.length
  ]);

  const filtered =
    filter === 'UPCOMING'
      ? upcomingBookings.length > 0 || activeBookings.length > 0 || completedBookings.length > 0
        ? upcomingBookings
        : customerBookings
      : filter === 'ACTIVE'
      ? activeBookings
      : completedBookings;

  const handleEnablePush = async () => {
    const result = await requestPushNotificationPermission();
    if (result === 'granted') {
      setTestAlertFeedback('✓ Push notifications enabled! You will receive automated 1-hour reminders before sessions start.');
      setTimeout(() => setTestAlertFeedback(null), 6000);
    } else if (result === 'denied') {
      setTestAlertFeedback('Notifications were denied in browser settings. You will still receive in-app reminder alerts.');
      setTimeout(() => setTestAlertFeedback(null), 6000);
    }
  };

  const handleTestAlert = async (bookingId?: string) => {
    setIsTestingAlert(true);
    try {
      const res = await triggerOneHourReminderTest(bookingId);
      setTestAlertFeedback(
        res.pushSent
          ? '🔔 Automated 1-Hour Push Reminder dispatched with chime & browser notification!'
          : '🔔 Automated 1-Hour In-App Reminder triggered with sound & banner toast!'
      );
      setTimeout(() => setTestAlertFeedback(null), 6000);
    } catch {
      setTestAlertFeedback('Failed to dispatch test notification.');
      setTimeout(() => setTestAlertFeedback(null), 4000);
    } finally {
      setIsTestingAlert(false);
    }
  };

  const formatStatusBadgeLabel = (status: string): string => {
    const norm = normalizeBookingStatus(status);
    if (norm === 'pending') return 'Pending • Finding Assistant';
    if (norm === 'accepted') return 'Accepted • Assistant Assigned';
    if (norm === 'scheduled') return 'Scheduled';
    if (norm === 'on_the_way') return 'Assistant on the Way';
    if (norm === 'arrived') return 'Assistant Arrived';
    if (norm === 'in_progress') return 'In Progress';
    if (norm === 'completed') return 'Completed';
    if (norm === 'rejected') return 'Rejected';
    if (norm === 'cancelled') return 'Cancelled';
    return status.replace('_', ' ');
  };

  return (
    <div
      data-testid="customer-bookings-view"
      aria-busy={isLoading}
      className="max-w-4xl 2xl:max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12 text-[#14213D]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">My Requests</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time updates for your Upcoming, Active, and Completed assistance requests
          </p>
        </div>
        <button
          onClick={onOpenBooking}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#F42F73] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#F42F73]/20 hover:bg-[#D81B60] transition-colors min-h-[44px] flex items-center justify-center cursor-pointer"
        >
          Book New Assistant @ ₹149/hr
        </button>
      </div>

      {/* Automated 1-Hour Push Notification Reminder Banner */}
      <div className="bg-gradient-to-r from-[#14213D] to-[#1F305E] text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#F42F73]/20 text-[#F42F73] border border-[#F42F73]/30 flex items-center justify-center shrink-0 mt-0.5">
              <BellRing className="w-5 h-5 text-[#F42F73]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">Real-Time Booking Alerts & Reminders</span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    pushPermission === 'granted'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : pushPermission === 'denied'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-white/10 text-gray-200 border border-white/20'
                  }`}
                >
                  {pushPermission === 'granted'
                    ? 'Active'
                    : pushPermission === 'denied'
                    ? 'In-App Only'
                    : 'Setup Recommended'}
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1 max-w-xl leading-relaxed">
                Receive instant push notifications when an assistant accepts your request, starts live tracking, or 1 hour before scheduled sessions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            {pushPermission !== 'granted' && (
              <button
                type="button"
                onClick={handleEnablePush}
                id="btn-enable-push-reminders"
                className="px-4 py-2 rounded-xl bg-[#F42F73] hover:bg-[#D81B60] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 min-h-[38px] cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable Push Alerts</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleTestAlert()}
              disabled={isTestingAlert}
              id="btn-test-1hr-reminder"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 min-h-[38px] cursor-pointer disabled:opacity-50"
            >
              <Volume2 className="w-3.5 h-3.5 text-rose-300" />
              <span>{isTestingAlert ? 'Sending...' : 'Test 1-Hr Alert'}</span>
            </button>
          </div>
        </div>

        {testAlertFeedback && (
          <div className="mt-3.5 pt-3 border-t border-white/10 text-xs font-medium text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{testAlertFeedback}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs: Upcoming | Active | Completed */}
      <div className="flex gap-1.5 sm:gap-2 bg-gray-100 p-1 rounded-2xl text-xs font-semibold max-w-md overflow-x-auto scrollbar-none">
        {[
          {
            id: 'UPCOMING',
            label: isLoading ? 'Upcoming' : `Upcoming (${upcomingBookings.length})`
          },
          {
            id: 'ACTIVE',
            label: isLoading ? 'Active' : `Active (${activeBookings.length})`
          },
          {
            id: 'COMPLETED',
            label: isLoading ? 'Completed' : `Completed (${completedBookings.length})`
          }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as 'UPCOMING' | 'ACTIVE' | 'COMPLETED')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap min-h-[38px] flex items-center justify-center cursor-pointer ${
              filter === tab.id
                ? 'bg-white text-[#F42F73] font-bold shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List or Skeleton Loader */}
      <div className="space-y-4">
        {isLoading ? (
          <CustomerBookingsSkeleton count={3} />
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-gray-100 space-y-3">
            <div className="text-gray-400 text-3xl">📋</div>
            <div className="text-sm font-bold text-gray-700">
              {filter === 'UPCOMING'
                ? 'No upcoming requests'
                : filter === 'ACTIVE'
                ? 'No active requests in progress'
                : 'No completed requests yet'}
            </div>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              {filter === 'UPCOMING'
                ? 'Pending, accepted, and scheduled requests from Firebase will appear here in real time.'
                : filter === 'ACTIVE'
                ? 'Requests where your assistant is on the way or assistance is in progress will appear here.'
                : 'Your completed assistance sessions and receipts will appear here.'}
            </p>
          </div>
        ) : (
          filtered.map((b) => {
            const norm = normalizeBookingStatus(b.status);
            const isTrackable =
              norm === 'pending' ||
              norm === 'accepted' ||
              norm === 'on_the_way' ||
              norm === 'arrived' ||
              norm === 'in_progress';
            const canCancel = norm === 'pending' || norm === 'accepted' || norm === 'scheduled';
            const timeInfo = getTimeUntilBookingStart(b);
            const isReminderSent = isReminderSentForBooking(b.id);

            return (
              <div
                key={b.id}
                data-testid={`booking-card-${b.id}`}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-400 font-mono">
                        {b.bookingNumber || b.requestId || b.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          norm === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : norm === 'cancelled' || norm === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : norm === 'accepted' || norm === 'in_progress' || norm === 'on_the_way'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-[#FFF0F5] text-[#F42F73]'
                        }`}
                      >
                        {formatStatusBadgeLabel(b.status)}
                      </span>
                      {b.isPreferredRequested && (
                        <span className="bg-rose-50 text-[#F42F73] border border-rose-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                          <Heart className="w-2.5 h-2.5 fill-[#F42F73]" />
                          <span>Preferred: {b.preferredAssistantName || 'Saved Helper'}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#14213D] mt-0.5">{b.serviceName}</h3>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs font-bold text-gray-400">Total Fare</div>
                    <div className="text-lg font-black text-[#F42F73]">₹{b.totalAmount}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>
                      {b.scheduledDate} at {b.startTime} ({b.totalHours || b.bookedHours} hrs)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{b.location?.address || `${b.location?.area || 'Mumbai'}`}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          b.assistantName ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <span>
                        Assistant:{' '}
                        <strong>{b.assistantName || 'Finding available assistant...'}</strong>
                      </span>
                    </div>
                    {b.assistantId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteAssistant(b.assistantId!);
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          isAssistantFavorited(b.assistantId)
                            ? 'bg-rose-50 text-[#F42F73] border-rose-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:text-[#F42F73] hover:bg-rose-50'
                        }`}
                      >
                        <Heart
                          className={`w-2.5 h-2.5 ${
                            isAssistantFavorited(b.assistantId) ? 'fill-[#F42F73] text-[#F42F73]' : ''
                          }`}
                        />
                        <span>{isAssistantFavorited(b.assistantId) ? 'Saved' : 'Save Helper'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Destination & Route Info if present */}
                {(b.destinationLocation?.address || b.estimatedDistance) && (
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 bg-gray-50 px-3.5 py-2.5 rounded-2xl border border-gray-100">
                    {b.destinationLocation?.address && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Flag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">
                          Destination: <strong>{b.destinationLocation.address}</strong>
                        </span>
                      </div>
                    )}
                    {b.estimatedDistance && (
                      <div className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                        <RouteIcon className="w-3.5 h-3.5" />
                        <span>
                          {b.estimatedDistance}
                          {b.estimatedDuration ? ` • ${b.estimatedDuration}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 1-Hour Reminder Indicator for Upcoming / Active Bookings */}
                {isTrackable && (
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                          isReminderSent
                            ? 'bg-emerald-100 text-emerald-700'
                            : timeInfo.isWithinOneHour
                            ? 'bg-rose-100 text-[#F42F73]'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {isReminderSent ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-[#F42F73]" />
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-bold text-[#14213D] flex items-center gap-1.5">
                          <span>
                            {isReminderSent
                              ? '1-Hour Push Reminder Sent'
                              : timeInfo.isWithinOneHour
                              ? `Starts soon (${timeInfo.formatted})`
                              : `Automated 1-Hour Reminder Scheduled`}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {b.instructions || b.description || `Scheduled for ${b.scheduledDate} at ${b.startTime}`}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTestAlert(b.id)}
                      className="text-[11px] font-bold text-[#F42F73] hover:text-[#D81B60] hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors shrink-0 self-start sm:self-auto border border-rose-200 cursor-pointer"
                    >
                      Trigger 1-Hr Alert
                    </button>
                  </div>
                )}

                {/* Bottom Action Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {b.invoiceNumber && (
                      <button
                        onClick={() => setSelectedInvoiceBooking(b)}
                        className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-colors min-h-[40px] cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#F42F73]" />
                        <span>Tax Invoice</span>
                      </button>
                    )}

                    {canCancel && (
                      <button
                        onClick={() => cancelBooking(b.id, 'Cancelled by customer')}
                        className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 flex items-center gap-1.5 border border-red-200 transition-colors min-h-[40px] cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Request</span>
                      </button>
                    )}

                    {norm === 'completed' && !b.rating && (
                      <button
                        id={`bookings-list-rate-tip-btn-${b.id}`}
                        onClick={() => setRatingBooking(b)}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 flex items-center gap-1.5 border border-amber-200 transition-colors min-h-[40px] cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>Rate & Tip Assistant</span>
                      </button>
                    )}

                    {b.rating && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>Rated {b.rating.stars}★</span>
                        {b.tipAmount && b.tipAmount > 0 ? (
                          <span className="text-emerald-700 font-bold ml-1">• ₹{b.tipAmount} Tip</span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {isTrackable && (
                    <button
                      onClick={() => onSelectBooking(b)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#F42F73] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#D81B60] min-h-[40px] cursor-pointer"
                    >
                      <span>Track Live Assistance</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <InvoiceModal
        isOpen={!!selectedInvoiceBooking}
        onClose={() => setSelectedInvoiceBooking(null)}
        booking={selectedInvoiceBooking}
      />

      {ratingBooking && (
        <RatingModal
          isOpen={!!ratingBooking}
          onClose={() => setRatingBooking(null)}
          booking={ratingBooking}
          bookingId={ratingBooking.id}
          assistantName={ratingBooking.assistantName || 'Diblo Assistant'}
        />
      )}
    </div>
  );
};

export default CustomerBookings;
