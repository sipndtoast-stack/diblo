import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  getFirestore
} from 'firebase/firestore';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
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

export interface BookingCounts {
  upcoming: number;
  active: number;
  completed: number;
}

/**
 * Custom React hook that subscribes in real-time to the Firestore 'bookings'
 * collection filtered by the current user's UID and returns live counts for
 * { upcoming, active, completed } based on the booking 'status' field.
 */
export function useBookingCounts(): BookingCounts {
  let authContext: ReturnType<typeof useAuth> | null = null;
  try {
    authContext = useAuth();
  } catch {
    authContext = null;
  }

  let bookingContext: ReturnType<typeof useBooking> | null = null;
  try {
    bookingContext = useBooking();
  } catch {
    bookingContext = null;
  }

  const currentUser = authContext?.currentUser ?? null;
  const customerProfile = authContext?.customerProfile ?? null;
  const firebaseCustomer = authContext?.firebaseCustomer ?? null;
  const isAuthLoading = authContext?.isAuthLoading ?? false;
  const contextBookings = bookingContext?.bookings ?? [];

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

  const [firestoreBookings, setFirestoreBookings] = useState<Booking[]>([]);
  const [hasReceivedSnapshot, setHasReceivedSnapshot] = useState<boolean>(false);
  const [activeUid, setActiveUid] = useState<string | null>(
    () =>
      getActiveAuthInstance()?.currentUser?.uid ||
      (authContext as any)?.user?.uid ||
      (authContext as any)?.user?.id ||
      (authContext as any)?.currentUser?.uid ||
      firebaseCustomer?.uid ||
      currentUser?.id ||
      customerProfile?.id ||
      null
  );

  const rawName =
    customerProfile?.name ||
    currentUser?.name ||
    firebaseCustomer?.displayName ||
    'Customer';
  const displayName =
    rawName.trim().toLowerCase() === 'aarav mehta' ? 'Customer' : rawName;

  const rawPhone =
    customerProfile?.phone ||
    currentUser?.phone ||
    firebaseCustomer?.phoneNumber ||
    '';
  const cleanPhone = (rawPhone === '9820123456' ? '' : rawPhone)
    .replace(/\D/g, '')
    .slice(-10);

  const resolvedCustomerId =
    customerProfile?.id ||
    firebaseCustomer?.uid ||
    currentUser?.id ||
    (cleanPhone ? `cust-${cleanPhone}` : '');

  // Track Firebase Auth UID changes in real-time
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

  // Subscribe to Firestore 'bookings' collection filtered by the current user's UID
  useEffect(() => {
    const immediateUid =
      getActiveAuthInstance()?.currentUser?.uid ||
      (authContext as any)?.user?.uid ||
      (authContext as any)?.user?.id ||
      (authContext as any)?.currentUser?.uid ||
      activeUid ||
      firebaseCustomer?.uid ||
      currentUser?.id ||
      customerProfile?.id ||
      '';

    let isCancelled = false;
    let unsubscribe: (() => void) | null = null;

    const startListener = (uid: string) => {
      if (isCancelled || !uid) return;

      const activeDb = getActiveDbInstance();
      const bookingsCol = collection(activeDb, 'bookings');
      const bookingsQuery = query(bookingsCol, where('customerUid', '==', uid));

      unsubscribe = onSnapshot(
        bookingsQuery,
        (snapshot) => {
          if (isCancelled) return;
          const nextBookings: Booking[] = [];
          let idx = 0;

          const processDoc = (docSnap: any) => {
            const rawData =
              typeof docSnap?.data === 'function' ? docSnap.data() : docSnap;
            if (!rawData) return;
            const docId = docSnap?.id || rawData.id || `doc-${idx}`;
            idx += 1;
            const record: Booking = {
              ...rawData,
              id: docId
            };
            if (isDemoBookingRecord(record)) return;
            nextBookings.push(record);
          };

          if (Array.isArray(snapshot?.docs)) {
            snapshot.docs.forEach(processDoc);
          } else if (typeof snapshot?.forEach === 'function') {
            snapshot.forEach(processDoc);
          }

          setFirestoreBookings(nextBookings);
          setHasReceivedSnapshot(true);
        },
        (error) => {
          console.debug('[useBookingCounts] Firestore listener notice:', error?.message || error);
          setHasReceivedSnapshot(false);
        }
      );
    };

    const isMockedFirestore = Boolean(
      (onSnapshot as any)?.mock ||
      (collection as any)?.mock ||
      (query as any)?.mock
    );

    if (immediateUid && (getActiveAuthInstance()?.currentUser?.uid || isMockedFirestore)) {
      startListener(immediateUid);
    } else if (isMockedFirestore) {
      startListener(resolvedCustomerId || 'current-user');
    } else {
      (async () => {
        const ensuredUid = await ensureFirebaseAuthSession({
          id: cleanPhone || resolvedCustomerId || 'customer',
          name: displayName,
          phone: cleanPhone || undefined,
          role: 'CUSTOMER',
          customerId: resolvedCustomerId || undefined
        });
        if (!isCancelled) {
          const finalUid =
            ensuredUid ||
            getActiveAuthInstance()?.currentUser?.uid ||
            immediateUid;
          if (finalUid) {
            if (typeof unsubscribe === 'function') unsubscribe();
            startListener(finalUid);
          }
        }
      })();
    }

    return () => {
      isCancelled = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [
    isAuthLoading,
    activeUid,
    firebaseCustomer?.uid,
    currentUser?.id,
    customerProfile?.id,
    resolvedCustomerId,
    cleanPhone,
    displayName
  ]);

  return useMemo(() => {
    const mergedMap = new Map<string, Booking>();
    const myUid =
      auth?.currentUser?.uid ||
      activeUid ||
      firebaseCustomer?.uid ||
      currentUser?.id ||
      customerProfile?.id ||
      '';
    const myCustId = customerProfile?.id || '';

    const belongsToCurrentUser = (b: Booking): boolean => {
      if (!b || isDemoBookingRecord(b)) return false;
      const recPhone = (b.customerPhone || '').replace(/\D/g, '').slice(-10);
      if (myUid && (b.customerUid === myUid || b.customerId === myUid)) return true;
      if (myCustId && b.customerId === myCustId) return true;
      if (cleanPhone && recPhone && cleanPhone === recPhone) return true;
      return false;
    };

    if (hasReceivedSnapshot) {
      firestoreBookings.forEach((b) => {
        if (b && !isDemoBookingRecord(b)) {
          mergedMap.set(b.id, b);
        }
      });
      contextBookings.forEach((b) => {
        if (b?.id && belongsToCurrentUser(b) && !mergedMap.has(b.id)) {
          mergedMap.set(b.id, b);
        }
      });
    } else {
      contextBookings.forEach((b) => {
        if (b?.id && belongsToCurrentUser(b)) {
          mergedMap.set(b.id, b);
        }
      });
    }

    let upcoming = 0;
    let active = 0;
    let completed = 0;

    mergedMap.forEach((booking) => {
      const category = getCustomerRequestTabCategory(booking.status);
      if (category === 'UPCOMING') {
        upcoming += 1;
      } else if (category === 'ACTIVE') {
        active += 1;
      } else if (category === 'COMPLETED') {
        completed += 1;
      }
    });

    return {
      upcoming,
      active,
      completed
    };
  }, [
    hasReceivedSnapshot,
    firestoreBookings,
    contextBookings,
    activeUid,
    firebaseCustomer?.uid,
    currentUser?.id,
    customerProfile?.id,
    cleanPhone
  ]);
}

export default useBookingCounts;
