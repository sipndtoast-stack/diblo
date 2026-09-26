import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, ensureFirebaseAuthSession } from './firebase';
import { Booking, BookingStatus, AssistantLiveLocation } from '../types';

const DEMO_BOOKING_IDS = new Set(['bk-101', 'bk-102', 'bk-103', 'bk-test-reminder', 'bk-fcm-test']);
const DEMO_CUSTOMER_IDS = new Set(['cust-1', 'user-c-1']);

export function isDemoBookingRecord(b: Partial<Booking> | null | undefined): boolean {
  if (!b) return true;
  if (b.id && DEMO_BOOKING_IDS.has(b.id)) return true;
  if (b.customerId && DEMO_CUSTOMER_IDS.has(b.customerId)) return true;
  if (b.customerName && b.customerName.trim().toLowerCase() === 'aarav mehta') return true;
  return false;
}

/**
 * Normalize booking status for comparisons while preserving real-time lifecycle states:
 * pending -> accepted -> in_progress -> completed | rejected | cancelled
 */
export function normalizeBookingStatus(status: BookingStatus | string | undefined): string {
  const s = String(status || 'pending').trim().toLowerCase();
  if (s === 'searching' || s === 'pending') return 'pending';
  if (s === 'scheduled') return 'scheduled';
  if (s === 'assigned' || s === 'accepted') return 'accepted';
  if (s === 'on_the_way') return 'on_the_way';
  if (s === 'arrived') return 'arrived';
  if (s === 'otp_verified' || s === 'in_progress') return 'in_progress';
  if (s === 'completed') return 'completed';
  if (s === 'rejected') return 'rejected';
  if (s === 'cancelled') return 'cancelled';
  return s;
}

/**
 * Categorize booking for Customer "My Requests":
 * - UPCOMING: pending, accepted, scheduled
 * - ACTIVE: on_the_way (assistant on the way), arrived, in_progress
 * - COMPLETED: completed (plus cancelled/rejected in history if needed)
 */
export function getCustomerRequestTabCategory(status: BookingStatus | string | undefined): 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'OTHER' {
  const norm = normalizeBookingStatus(status);
  if (norm === 'pending' || norm === 'accepted' || norm === 'scheduled') {
    return 'UPCOMING';
  }
  if (norm === 'on_the_way' || norm === 'arrived' || norm === 'in_progress') {
    return 'ACTIVE';
  }
  if (norm === 'completed') {
    return 'COMPLETED';
  }
  return 'OTHER';
}

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const copy: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      copy[k] = v;
    }
  }
  return copy;
}

/**
 * Save a newly created customer booking directly to Firestore /bookings/{bookingId}
 */
export async function saveBookingToFirestore(booking: Booking): Promise<void> {
  try {
    if (!auth.currentUser) {
      await ensureFirebaseAuthSession({
        id: booking.customerId,
        name: booking.customerName,
        phone: booking.customerPhone,
        role: 'CUSTOMER'
      });
    }

    const bookingRef = doc(db, 'bookings', booking.id);
    const payload = cleanUndefined({
      ...booking,
      requestId: booking.requestId || booking.bookingNumber || booking.id,
      bookingNumber: booking.bookingNumber || booking.requestId || booking.id,
      customerUid: auth.currentUser?.uid || booking.customerUid || booking.customerId,
      pickupLocation: booking.pickupLocation || booking.location,
      destinationLocation: booking.destinationLocation || null,
      description: booking.description || booking.instructions || '',
      instructions: booking.instructions || booking.description || '',
      estimatedDistance: booking.estimatedDistance || (booking.estimatedDistanceKm ? `${booking.estimatedDistanceKm} km` : '2.4 km'),
      estimatedDuration: booking.estimatedDuration || (booking.estimatedDurationMinutes ? `${booking.estimatedDurationMinutes} mins` : `${booking.totalHours || 2} hrs`),
      status: booking.status || 'pending',
      createdAt: booking.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
      serverUpdatedAt: serverTimestamp()
    });

    await setDoc(bookingRef, payload, { merge: true });
  } catch (err) {
    console.warn('[FirestoreBookings] saveBookingToFirestore warning:', err);
  }
}

/**
 * Update a booking's status and fields in Firestore /bookings/{bookingId}
 */
export async function updateBookingInFirestore(
  bookingId: string,
  updates: Partial<Booking> & Record<string, any>
): Promise<void> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const payload = cleanUndefined({
      ...updates,
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: serverTimestamp()
    });
    await setDoc(bookingRef, payload, { merge: true });
  } catch (err) {
    console.warn('[FirestoreBookings] updateBookingInFirestore warning:', err);
  }
}

/**
 * Update assistant's live GPS location in Firestore:
 * Writes to /bookings/{bookingId}/assistantLocation/live AND updates /bookings/{bookingId}.assistantLocation
 */
export async function updateAssistantLiveLocationInFirestore(
  bookingId: string,
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number | null;
    speed?: number | null;
    address?: string;
  }
): Promise<void> {
  const nowIso = new Date().toISOString();
  const locData: AssistantLiveLocation & Record<string, any> = cleanUndefined({
    lat: location.latitude,
    lng: location.longitude,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy ?? 10,
    heading: location.heading ?? null,
    speed: location.speed ?? null,
    address: location.address || '',
    timestamp: nowIso
  });

  try {
    const liveDocRef = doc(db, 'bookings', bookingId, 'assistantLocation', 'live');
    await setDoc(
      liveDocRef,
      {
        ...locData,
        serverTimestamp: serverTimestamp()
      },
      { merge: true }
    );
  } catch (err) {
    console.debug('[FirestoreBookings] subcollection live location write notice:', err);
  }

  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      assistantLocation: locData,
      updatedAt: nowIso,
      serverUpdatedAt: serverTimestamp()
    });
  } catch (err) {
    console.debug('[FirestoreBookings] booking assistantLocation field write notice:', err);
  }
}

/**
 * Subscribe to real-time bookings in Firestore for Customer, Assistant, or Admin
 */
export function subscribeToRealtimeBookings(
  params: {
    role: 'CUSTOMER' | 'ASSISTANT' | 'ADMIN' | 'OPERATIONS';
    customerId?: string;
    customerPhone?: string;
    customerName?: string;
    assistantId?: string;
    assistantPhone?: string;
    assistantName?: string;
  },
  onBookingsUpdate: (bookings: Booking[]) => void
): Unsubscribe {
  let isCancelled = false;
  let innerUnsub: Unsubscribe | null = null;

  (async () => {
    const uid = await ensureFirebaseAuthSession({
      id:
        params.role === 'CUSTOMER'
          ? params.customerPhone || params.customerId || 'customer'
          : params.assistantId || params.assistantPhone || params.role.toLowerCase(),
      name: params.role === 'CUSTOMER' ? params.customerName : params.assistantName,
      phone: params.role === 'CUSTOMER' ? params.customerPhone : params.assistantPhone,
      role: params.role,
      customerId: params.customerId,
      assistantId: params.assistantId
    });

    if (isCancelled) return;

    const bookingsCol = collection(db, 'bookings');
    const qRef =
      params.role === 'CUSTOMER' && uid
        ? query(bookingsCol, where('customerUid', '==', uid))
        : query(bookingsCol);

    innerUnsub = onSnapshot(
      qRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('diblo-firebase-connection', {
              detail: { connected: !snapshot.metadata.fromCache || navigator.onLine }
            })
          );
        }
        const list: Booking[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Booking;
          const record: Booking = {
            ...data,
            id: docSnap.id || data.id
          };
          if (isDemoBookingRecord(record)) return;

          if (params.role === 'CUSTOMER') {
            const cleanCustPhone = (params.customerPhone || '').replace(/\D/g, '').slice(-10);
            const recPhone = (record.customerPhone || '').replace(/\D/g, '').slice(-10);
            const matchesId = params.customerId && record.customerId === params.customerId;
            const matchesPhone = cleanCustPhone && recPhone === cleanCustPhone;
            const matchesUid = uid && record.customerUid === uid;
            if (matchesUid || matchesId || matchesPhone) {
              list.push(record);
            }
          } else if (params.role === 'ASSISTANT') {
            const normStatus = normalizeBookingStatus(record.status);
            const isPending = normStatus === 'pending';
            const matchesAssistant =
              !params.assistantId ||
              record.assistantId === params.assistantId ||
              (uid && record.assistantUid === uid) ||
              (params.assistantPhone &&
                record.assistantPhone &&
                record.assistantPhone.replace(/\D/g, '').slice(-10) ===
                  params.assistantPhone.replace(/\D/g, '').slice(-10));
            const wasRejectedByMe =
              params.assistantId &&
              Array.isArray(record.rejectedByAssistantIds) &&
              record.rejectedByAssistantIds.includes(params.assistantId);

            if ((isPending && !wasRejectedByMe) || matchesAssistant) {
              list.push(record);
            }
          } else {
            list.push(record);
          }
        });

        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        onBookingsUpdate(list);
      },
      (err) => {
        console.debug('[FirestoreBookings] Real-time listener notice:', err.message);
      }
    );
  })();

  return () => {
    isCancelled = true;
    if (innerUnsub) {
      innerUnsub();
    }
  };
}

/**
 * Subscribe to real-time live assistant location for a specific booking
 */
export function subscribeToBookingLiveLocation(
  bookingId: string,
  onLocationUpdate: (location: AssistantLiveLocation, booking?: Booking) => void
): Unsubscribe {
  const bookingRef = doc(db, 'bookings', bookingId);
  const liveLocRef = doc(db, 'bookings', bookingId, 'assistantLocation', 'live');

  const unsubBooking = onSnapshot(
    bookingRef,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Booking;
      if (data.assistantLocation && (data.assistantLocation.latitude !== undefined || data.assistantLocation.lat !== undefined)) {
        const lat = Number(data.assistantLocation.latitude ?? data.assistantLocation.lat);
        const lng = Number(data.assistantLocation.longitude ?? data.assistantLocation.lng);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          onLocationUpdate(
            {
              lat,
              lng,
              latitude: lat,
              longitude: lng,
              accuracy: data.assistantLocation.accuracy,
              heading: data.assistantLocation.heading,
              address: data.assistantLocation.address,
              timestamp: data.assistantLocation.timestamp || data.updatedAt || new Date().toISOString()
            },
            { ...data, id: snap.id }
          );
        }
      }
    },
    () => {}
  );

  const unsubLive = onSnapshot(
    liveLocRef,
    (snap) => {
      if (!snap.exists()) return;
      const loc = snap.data() as AssistantLiveLocation;
      const lat = Number(loc.latitude ?? loc.lat);
      const lng = Number(loc.longitude ?? loc.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        onLocationUpdate({
          lat,
          lng,
          latitude: lat,
          longitude: lng,
          accuracy: loc.accuracy,
          heading: loc.heading,
          speed: loc.speed,
          address: loc.address,
          timestamp: loc.timestamp || new Date().toISOString()
        });
      }
    },
    () => {}
  );

  return () => {
    unsubBooking();
    unsubLive();
  };
}
