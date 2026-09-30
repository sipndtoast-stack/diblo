import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  runTransaction,
  arrayUnion,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, ensureFirebaseAuthSession } from './firebase';
import { Booking, BookingStatus, AssistantLiveLocation, AssistantProfile } from '../types';

export const PARALLEL_REQUEST_WINDOW_MS = 15000; // 15-second countdown window
export const DEFAULT_SERVICE_RADIUS_KM = 15; // Diblo configured Mumbai service radius (km)
export const MAX_DISPATCH_RETRIES = 2; // Up to 3 total waves (initial + 2 retries)

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
 * Haversine distance in kilometers between two GPS coordinates
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Normalize booking status for comparisons while preserving real-time lifecycle states:
 * SEARCHING -> REQUEST_SENT -> ASSIGNED -> IN_PROGRESS -> COMPLETED | CANCELLED
 */
export function normalizeBookingStatus(status: BookingStatus | string | undefined): string {
  const s = String(status || 'pending').trim().toLowerCase();
  if (s === 'searching' || s === 'request_sent' || s === 'pending') return 'pending';
  if (s === 'no_assistant_available') return 'no_assistant_available';
  if (s === 'upcoming' || s === 'confirmed') return 'upcoming';
  if (s === 'scheduled') return 'scheduled';
  if (s === 'assigned' || s === 'accepted') return 'accepted';
  if (s === 'on_the_way') return 'on_the_way';
  if (s === 'arrived') return 'arrived';
  if (s === 'active' || s === 'ongoing' || s === 'started' || s === 'in-progress') return 'active';
  if (s === 'otp_verified' || s === 'in_progress') return 'in_progress';
  if (s === 'completed' || s === 'done' || s === 'finished') return 'completed';
  if (s === 'rejected') return 'rejected';
  if (s === 'cancelled') return 'cancelled';
  return s;
}

/**
 * Categorize booking for Customer "My Requests":
 * - UPCOMING: upcoming, pending, searching, request_sent, accepted, assigned, scheduled, confirmed, no_assistant_available
 * - ACTIVE: active, on_the_way (assistant on the way), arrived, in_progress
 * - COMPLETED: completed (plus done/finished)
 */
export function getCustomerRequestTabCategory(status: BookingStatus | string | undefined): 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'OTHER' {
  const norm = normalizeBookingStatus(status);
  if (
    norm === 'upcoming' ||
    norm === 'pending' ||
    norm === 'accepted' ||
    norm === 'scheduled' ||
    norm === 'no_assistant_available'
  ) {
    return 'UPCOMING';
  }
  if (
    norm === 'active' ||
    norm === 'on_the_way' ||
    norm === 'arrived' ||
    norm === 'in_progress'
  ) {
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
 * Find ALL eligible nearby assistants in Firestore simultaneously:
 * - ONLINE (isOnline === true)
 * - AVAILABLE (not suspended/rejected)
 * - Not currently assigned to another trip (!activeBookingId)
 * - Have valid/live location
 * - Within Diblo's configured service radius (default 15km)
 */
export async function findEligibleNearbyAssistantsInFirestore(params: {
  pickupLat: number;
  pickupLng: number;
  radiusKm?: number;
  excludedAssistantIds?: string[];
  fallbackAssistants?: AssistantProfile[];
}): Promise<{ candidateAssistantIds: string[]; nearbyAssistants: AssistantProfile[] }> {
  const radiusKm = params.radiusKm || DEFAULT_SERVICE_RADIUS_KM;
  const excluded = new Set(params.excludedAssistantIds || []);
  let assistantsList: AssistantProfile[] = [];

  try {
    const snap = await getDocs(collection(db, 'assistants'));
    if (!snap.empty) {
      snap.forEach((d) => {
        assistantsList.push({ ...(d.data() as AssistantProfile), id: d.id });
      });
    }
  } catch (err) {
    console.debug('[FirestoreBookings] getDocs(assistants) fallback notice:', err);
  }

  if (assistantsList.length === 0 && Array.isArray(params.fallbackAssistants)) {
    assistantsList = [...params.fallbackAssistants];
  }

  const eligible: { assistant: AssistantProfile; distanceKm: number }[] = [];

  for (const asst of assistantsList) {
    if (!asst || !asst.id) continue;
    if (excluded.has(asst.id)) continue;
    if (asst.isOnline === false) continue;
    if (asst.verificationStatus === 'SUSPENDED' || asst.verificationStatus === 'REJECTED') continue;
    if (asst.activeBookingId) continue;

    const lat = Number(asst.currentLocation?.lat);
    const lng = Number(asst.currentLocation?.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

    const distanceKm = calculateHaversineDistanceKm(params.pickupLat, params.pickupLng, lat, lng);
    if (distanceKm <= radiusKm) {
      eligible.push({ assistant: asst, distanceKm });
    }
  }

  eligible.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    candidateAssistantIds: eligible.map((e) => e.assistant.id),
    nearbyAssistants: eligible.map((e) => e.assistant)
  };
}

/**
 * Save a newly created customer booking directly to Firestore /bookings/{bookingId}
 * with parallel trip matching dispatch fields
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

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const expiresMs = booking.requestExpiresAtMs || nowMs + PARALLEL_REQUEST_WINDOW_MS;
    const expiresIso = booking.requestExpiresAt || new Date(expiresMs).toISOString();

    const bookingRef = doc(db, 'bookings', booking.id);
    const payload = cleanUndefined({
      ...booking,
      bookingId: booking.id,
      requestId: booking.requestId || booking.bookingNumber || booking.id,
      bookingNumber: booking.bookingNumber || booking.requestId || booking.id,
      customerUid: auth.currentUser?.uid || booking.customerUid || booking.customerId,
      pickupLocation: booking.pickupLocation || booking.location,
      destinationLocation: booking.destinationLocation || null,
      description: booking.description || booking.instructions || '',
      instructions: booking.instructions || booking.description || '',
      estimatedDistance: booking.estimatedDistance || (booking.estimatedDistanceKm ? `${booking.estimatedDistanceKm} km` : '2.4 km'),
      estimatedDuration: booking.estimatedDuration || (booking.estimatedDurationMinutes ? `${booking.estimatedDurationMinutes} mins` : `${booking.totalHours || 2} hrs`),
      status: booking.status || 'REQUEST_SENT',
      bookingStatus: booking.bookingStatus || booking.status || 'REQUEST_SENT',
      candidateAssistantIds: booking.candidateAssistantIds || [],
      candidateAssistantsCount: booking.candidateAssistantsCount ?? (booking.candidateAssistantIds?.length || 0),
      requestSentAt: booking.requestSentAt || nowIso,
      requestSentAtMs: booking.requestSentAtMs || nowMs,
      requestExpiresAt: expiresIso,
      requestExpiresAtMs: expiresMs,
      assignedAssistantId: booking.assignedAssistantId ?? booking.assistantId ?? null,
      assignedAt: booking.assignedAt ?? booking.acceptedAt ?? null,
      declinedAssistantIds: booking.declinedAssistantIds || [],
      expiredAssistantIds: booking.expiredAssistantIds || [],
      dispatchRetryCount: booking.dispatchRetryCount ?? 0,
      maxDispatchRetries: booking.maxDispatchRetries ?? MAX_DISPATCH_RETRIES,
      serviceRadiusKm: booking.serviceRadiusKm ?? DEFAULT_SERVICE_RADIUS_KM,
      createdAt: booking.createdAt || nowIso,
      updatedAt: nowIso,
      serverCreatedAt: serverTimestamp(),
      serverUpdatedAt: serverTimestamp()
    });

    await setDoc(bookingRef, payload, { merge: true });
  } catch (err) {
    console.warn('[FirestoreBookings] saveBookingToFirestore warning:', err);
  }
}

export interface AtomicAcceptResult {
  success: boolean;
  code: 'ASSIGNED' | 'ALREADY_ASSIGNED' | 'REQUEST_EXPIRED' | 'CANCELLED' | 'ERROR';
  message: string;
  booking?: Booking;
}

/**
 * Atomic First-Accept-Wins Transaction in Firestore:
 * Locks the booking immediately so two assistants can NEVER receive the same trip.
 */
export async function acceptBookingAtomicallyInFirestore(
  bookingId: string,
  assistantId: string,
  assistantDetails: {
    assistantUid?: string;
    assistantName?: string;
    assistantPhone?: string;
    assistantPhoto?: string;
    assistantRating?: number;
  }
): Promise<AtomicAcceptResult> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(bookingRef);
      if (!snap.exists()) {
        throw new Error('BOOKING_NOT_FOUND');
      }

      const data = snap.data() as Booking;
      const currentStatus = String(data.bookingStatus || data.status || 'pending').toUpperCase();
      const currentNorm = normalizeBookingStatus(data.status);
      const currentAssigned = data.assignedAssistantId || data.assistantId;

      // 1. Check if cancelled
      if (currentNorm === 'cancelled' || currentStatus === 'CANCELLED') {
        return {
          success: false,
          code: 'CANCELLED' as const,
          message: 'This trip request was cancelled by the customer.',
          booking: { ...data, id: snap.id }
        };
      }

      // 2. Check if already assigned to another assistant (FIRST ACCEPT WINS!)
      if (
        (currentAssigned && currentAssigned !== assistantId) ||
        ((currentNorm === 'accepted' ||
          currentNorm === 'on_the_way' ||
          currentNorm === 'arrived' ||
          currentNorm === 'in_progress' ||
          currentStatus === 'ASSIGNED' ||
          currentStatus === 'ACCEPTED') &&
          currentAssigned !== assistantId)
      ) {
        return {
          success: false,
          code: 'ALREADY_ASSIGNED' as const,
          message: 'This trip has already been accepted by another assistant.',
          booking: { ...data, id: snap.id }
        };
      }

      // 3. Check if 15-second server request window expired
      const nowMs = Date.now();
      const expiresAtMs =
        data.requestExpiresAtMs ||
        (data.requestExpiresAt ? new Date(data.requestExpiresAt).getTime() : 0);
      const expiredForMe =
        Array.isArray(data.expiredAssistantIds) && data.expiredAssistantIds.includes(assistantId);

      if (expiredForMe || (expiresAtMs > 0 && nowMs > expiresAtMs + 2000)) {
        return {
          success: false,
          code: 'REQUEST_EXPIRED' as const,
          message: 'The 15-second request window for this trip has expired.',
          booking: { ...data, id: snap.id }
        };
      }

      // 4. Lock and assign to this assistant atomically
      const nowIso = new Date(nowMs).toISOString();
      const updates: Record<string, any> = cleanUndefined({
        status: 'ASSIGNED',
        bookingStatus: 'ASSIGNED',
        assignedAssistantId: assistantId,
        assistantId: assistantId,
        assistantUid: assistantDetails.assistantUid || auth.currentUser?.uid || assistantId,
        assistantName: assistantDetails.assistantName,
        assistantPhone: assistantDetails.assistantPhone,
        assistantPhoto: assistantDetails.assistantPhoto,
        assistantRating: assistantDetails.assistantRating,
        assignedAt: nowIso,
        acceptedAt: nowIso,
        updatedAt: nowIso,
        serverAssignedAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp()
      });

      transaction.update(bookingRef, updates);

      return {
        success: true,
        code: 'ASSIGNED' as const,
        message: 'Trip assigned to you!',
        booking: { ...data, ...updates, id: snap.id } as Booking
      };
    });

    return result;
  } catch (err: any) {
    console.warn('[FirestoreBookings] acceptBookingAtomicallyInFirestore notice:', err);
    return {
      success: false,
      code: 'ERROR',
      message: err?.message || 'Could not lock booking in Firestore'
    };
  }
}

/**
 * Assistant declines a parallel trip request:
 * Records this assistant in declinedAssistantIds / rejectedByAssistantIds WITHOUT cancelling the trip for other nearby assistants!
 */
export async function declineBookingForAssistantInFirestore(
  bookingId: string,
  assistantId: string
): Promise<void> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      declinedAssistantIds: arrayUnion(assistantId),
      rejectedByAssistantIds: arrayUnion(assistantId),
      rejectedAssistantIds: arrayUnion(assistantId),
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('[FirestoreBookings] declineBookingForAssistantInFirestore notice:', err);
  }
}

/**
 * Assistant's 15-second request window expired:
 * Records this assistant in expiredAssistantIds so they cannot accept the expired request,
 * while keeping the trip available for other assistants or retry waves.
 */
export async function expireBookingForAssistantInFirestore(
  bookingId: string,
  assistantId: string
): Promise<void> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      expiredAssistantIds: arrayUnion(assistantId),
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: serverTimestamp()
    });
  } catch (err) {
    console.debug('[FirestoreBookings] expireBookingForAssistantInFirestore notice:', err);
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
    const hasValidIdentity =
      params.role === 'CUSTOMER'
        ? Boolean(params.customerPhone || params.customerId || auth.currentUser?.uid)
        : Boolean(params.assistantId || params.assistantPhone || auth.currentUser?.uid);

    if (!hasValidIdentity) {
      return;
    }

    const uid =
      auth.currentUser?.uid ||
      (await ensureFirebaseAuthSession({
        id:
          params.role === 'CUSTOMER'
            ? params.customerPhone || params.customerId || ''
            : params.assistantId || params.assistantPhone || '',
        name: params.role === 'CUSTOMER' ? params.customerName : params.assistantName,
        phone: params.role === 'CUSTOMER' ? params.customerPhone : params.assistantPhone,
        role: params.role,
        customerId: params.customerId,
        assistantId: params.assistantId
      }));

    if (isCancelled) return;

    const bookingsCol = collection(db, 'bookings');

    if (params.role === 'CUSTOMER' && uid) {
      const byUidMap = new Map<string, Booking>();
      const byIdMap = new Map<string, Booking>();

      const emitMergedCustomerBookings = () => {
        const mergedMap = new Map<string, Booking>();
        byUidMap.forEach((v, k) => mergedMap.set(k, v));
        byIdMap.forEach((v, k) => mergedMap.set(k, v));
        const list = Array.from(mergedMap.values());
        list.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
        onBookingsUpdate(list);
      };

      const filterCustomerRecord = (docId: string, data: Booking): Booking | null => {
        const record: Booking = {
          ...data,
          id: docId || data.id
        };
        if (isDemoBookingRecord(record)) return null;
        const cleanCustPhone = (params.customerPhone || '').replace(/\D/g, '').slice(-10);
        const recPhone = (record.customerPhone || '').replace(/\D/g, '').slice(-10);
        const matchesId =
          (params.customerId && record.customerId === params.customerId) ||
          record.customerId === uid;
        const matchesPhone = Boolean(cleanCustPhone && recPhone === cleanCustPhone);
        const matchesUid = Boolean(uid && record.customerUid === uid);
        if (matchesUid || matchesId || matchesPhone) {
          return record;
        }
        return null;
      };

      const qByUid = query(bookingsCol, where('customerUid', '==', uid));
      const qById = query(bookingsCol, where('customerId', '==', uid));

      const unsubUid = onSnapshot(
        qByUid,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('diblo-firebase-connection', {
                detail: { connected: !snapshot.metadata.fromCache || navigator.onLine }
              })
            );
          }
          byUidMap.clear();
          snapshot.forEach((docSnap) => {
            const rec = filterCustomerRecord(docSnap.id, docSnap.data() as Booking);
            if (rec) byUidMap.set(rec.id, rec);
          });
          emitMergedCustomerBookings();
        },
        (err) => {
          console.debug('[FirestoreBookings] customerUid listener notice:', err.message);
        }
      );

      const unsubId = onSnapshot(
        qById,
        { includeMetadataChanges: true },
        (snapshot) => {
          byIdMap.clear();
          snapshot.forEach((docSnap) => {
            const rec = filterCustomerRecord(docSnap.id, docSnap.data() as Booking);
            if (rec) byIdMap.set(rec.id, rec);
          });
          emitMergedCustomerBookings();
        },
        (err) => {
          console.debug('[FirestoreBookings] customerId listener notice:', err.message);
        }
      );

      innerUnsub = () => {
        unsubUid();
        unsubId();
      };
      return;
    }

    const qRef = query(bookingsCol);

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
            const assignedId = record.assignedAssistantId || record.assistantId;
            const matchesAssistant =
              !params.assistantId ||
              assignedId === params.assistantId ||
              (uid && record.assistantUid === uid) ||
              (params.assistantPhone &&
                record.assistantPhone &&
                record.assistantPhone.replace(/\D/g, '').slice(-10) ===
                  params.assistantPhone.replace(/\D/g, '').slice(-10));
            const wasRejectedOrExpiredByMe =
              Boolean(
                params.assistantId &&
                  ((Array.isArray(record.declinedAssistantIds) &&
                    record.declinedAssistantIds.includes(params.assistantId)) ||
                    (Array.isArray(record.rejectedByAssistantIds) &&
                      record.rejectedByAssistantIds.includes(params.assistantId)) ||
                    (Array.isArray(record.rejectedAssistantIds) &&
                      record.rejectedAssistantIds.includes(params.assistantId)) ||
                    (Array.isArray(record.expiredAssistantIds) &&
                      record.expiredAssistantIds.includes(params.assistantId)))
              );

            // Also include recently accepted/assigned bookings so other assistants' screens
            // can detect in real-time that another assistant accepted the trip!
            const isRecentlyAssignedToOther =
              normStatus === 'accepted' && Boolean(assignedId && assignedId !== params.assistantId);

            if ((isPending && !wasRejectedOrExpiredByMe) || matchesAssistant || isRecentlyAssignedToOther) {
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
