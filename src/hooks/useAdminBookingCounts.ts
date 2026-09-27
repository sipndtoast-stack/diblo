import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import {
  db,
  auth,
  ensureFirebaseAuthSession,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { Booking } from '../types';
import {
  getCustomerRequestTabCategory,
  isDemoBookingRecord
} from '../lib/firestoreBookings';

export interface AdminBookingCounts {
  upcomingCount: number;
  activeCount: number;
  completedCount: number;
  totalBookingsCount: number;
  bookings: Booking[];
  isLoading: boolean;
}

/**
 * Custom hook that subscribes in real-time to Firestore `/bookings` for the
 * Admin Panel and computes live counts for 'Upcoming', 'Active', and 'Completed' bookings.
 */
export function useAdminBookingCounts(): AdminBookingCounts {
  const { staffUser, currentUser } = useAuth();
  const { bookings: contextBookings } = useBooking();

  const [firestoreBookings, setFirestoreBookings] = useState<Booking[]>([]);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;
    let unsubscribe: (() => void) | null = null;

    setIsSubscribing(true);

    (async () => {
      let uid = auth.currentUser?.uid;
      const currentEmail = auth.currentUser?.email || '';
      const isAdminEmail =
        currentEmail.startsWith('diblo.admin.') ||
        currentEmail.startsWith('diblo.operations.') ||
        currentEmail === 'sipndtoast@gmail.com' ||
        currentEmail === 'admin@diblo.in';
      if (!uid || !isAdminEmail) {
        uid =
          (await ensureFirebaseAuthSession({
            id: staffUser?.eplId || currentUser?.id || 'ADMIN-MUM',
            name: staffUser?.name || currentUser?.name || 'Operations Admin',
            phone: staffUser?.number || currentUser?.phone,
            role: 'ADMIN'
          })) || uid;
      }

      if (isCancelled) return;

      if (!uid) {
        setIsSubscribing(false);
        return;
      }

      const bookingsCol = collection(db, 'bookings');
      const qAllBookings = query(bookingsCol);

      unsubscribe = onSnapshot(
        qAllBookings,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (isCancelled) return;
          const records: Booking[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Booking;
            const record: Booking = {
              ...data,
              id: docSnap.id || data.id
            };
            if (!isDemoBookingRecord(record)) {
              records.push(record);
            }
          });
          setFirestoreBookings(records);
          setIsSubscribing(false);
        },
        (error) => {
          setIsSubscribing(false);
          console.debug('[useAdminBookingCounts] Firestore listener notice:', error?.message || error);
        }
      );
    })();

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [staffUser?.eplId, staffUser?.name, staffUser?.number, staffUser?.email, currentUser?.id, currentUser?.name, currentUser?.phone, currentUser?.email]);

  return useMemo(() => {
    const mergedMap = new Map<string, Booking>();

    contextBookings.forEach((b) => {
      if (b?.id && !isDemoBookingRecord(b)) {
        mergedMap.set(b.id, b);
      }
    });

    firestoreBookings.forEach((b) => {
      if (b?.id && !isDemoBookingRecord(b)) {
        mergedMap.set(b.id, b);
      }
    });

    let upcomingCount = 0;
    let activeCount = 0;
    let completedCount = 0;

    const allBookings = Array.from(mergedMap.values());
    allBookings.forEach((booking) => {
      const category = getCustomerRequestTabCategory(booking.status);
      if (category === 'UPCOMING') {
        upcomingCount += 1;
      } else if (category === 'ACTIVE') {
        activeCount += 1;
      } else if (category === 'COMPLETED') {
        completedCount += 1;
      }
    });

    return {
      upcomingCount,
      activeCount,
      completedCount,
      totalBookingsCount: allBookings.length,
      bookings: allBookings,
      isLoading: isSubscribing
    };
  }, [contextBookings, firestoreBookings, isSubscribing]);
}
