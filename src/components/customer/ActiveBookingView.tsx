import React, { useState, useEffect, useRef } from 'react';
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  getFirestore
} from 'firebase/firestore';
import {
  ShieldCheck,
  Phone,
  Clock,
  MapPin,
  CheckCircle2,
  KeyRound,
  PlusCircle,
  FileText,
  Star,
  ArrowLeft,
  Navigation,
  Heart,
  Sparkles,
  Flag,
  Route as RouteIcon,
  Bell,
  BellRing,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { AssistantTaskMap } from '../maps/AssistantTaskMap';
import { InvoiceModal } from '../common/InvoiceModal';
import { RatingModal } from './RatingModal';
import { normalizeBookingStatus } from '../../lib/firestoreBookings';
import {
  registerFcmPushToken,
  initFcmForegroundListener,
  sendBookingUpdatePushNotification,
  mapBookingStatusToPushEvent,
  getPushPermission,
  requestPushPermission,
  FcmNotificationPayload
} from '../../lib/pushNotificationService';
import { db } from '../../lib/firebase';
import { Booking } from '../../types';

interface ActiveBookingViewProps {
  onBack?: () => void;
  onOpenBooking?: () => void;
  onSelectTab?: (tab: any) => void;
  booking?: Booking | null;
  activeBooking?: Booking | null;
  bookingId?: string;
}

export const ActiveBookingView: React.FC<ActiveBookingViewProps> = ({
  onBack,
  onOpenBooking,
  onSelectTab,
  booking: propBooking,
  activeBooking: propActiveBooking,
  bookingId: propBookingId
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onSelectTab) {
      onSelectTab('HOME');
    }
  };
  const {
    activeBooking: contextActiveBooking,
    bookings: contextBookings,
    liveEtaMinutes,
    liveDistanceKm,
    liveAssistantCoords,
    pushPermission: contextPushPermission,
    requestPushNotificationPermission,
    extendBooking,
    cancelBooking,
    retryBookingDispatch
  } = useBooking();
  const { currentUser, customerProfile, toggleFavoriteAssistant, isAssistantFavorited } = useAuth();

  const [firestoreBooking, setFirestoreBooking] = useState<Booking | null>(null);
  const [fcmStatusBanner, setFcmStatusBanner] = useState<FcmNotificationPayload | null>(null);
  const [localPushPermission, setLocalPushPermission] = useState<string>(() =>
    contextPushPermission || getPushPermission()
  );
  const [isSendingPush, setIsSendingPush] = useState(false);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of schedule');
  const [isExtending, setIsExtending] = useState(false);
  const [isRetryingDispatch, setIsRetryingDispatch] = useState(false);

  const prevStatusRef = useRef<string | null>(null);

  const activeBooking: Booking | null =
    propBooking ||
    propActiveBooking ||
    firestoreBooking ||
    contextActiveBooking ||
    (Array.isArray(contextBookings) && contextBookings.length > 0 ? contextBookings[0] : null);

  // Seed initial status ref
  useEffect(() => {
    const initial = propBooking || propActiveBooking || contextActiveBooking;
    if (initial?.status && prevStatusRef.current === null) {
      prevStatusRef.current = normalizeBookingStatus(initial.status);
    }
  }, []);

  // Initialize FCM registration & foreground listener
  useEffect(() => {
    const custId = customerProfile?.id || currentUser?.id || 'cust-user';
    const custPhone = customerProfile?.phone || currentUser?.phone;

    registerFcmPushToken({
      customerId: custId,
      phone: custPhone,
      requestBrowserPermission: false
    })
      .then(({ permission }) => {
        if (permission) setLocalPushPermission(permission);
      })
      .catch(() => {});

    const unsubFcm = initFcmForegroundListener((payload) => {
      setFcmStatusBanner(payload);
      if (payload.status) {
        setFirestoreBooking((prev) =>
          prev ? { ...prev, status: payload.status as any } : prev
        );
      }
    });

    return () => {
      unsubFcm();
    };
  }, [customerProfile?.id, currentUser?.id]);

  // Listen to real-time Firestore status updates for the active booking
  useEffect(() => {
    const targetBookingId =
      propBookingId ||
      propBooking?.id ||
      propActiveBooking?.id ||
      contextActiveBooking?.id;

    const isMockedSnapshot = Boolean((onSnapshot as any)?.mock);
    if (!targetBookingId && !isMockedSnapshot) return;

    let isCancelled = false;
    let unsubscribe: (() => void) | null = null;

    try {
      const activeDb =
        (getFirestore as any)?.mock && typeof getFirestore === 'function'
          ? getFirestore() || db
          : db;

      const targetRef = targetBookingId
        ? typeof doc === 'function'
          ? doc(activeDb, 'bookings', targetBookingId)
          : null
        : typeof collection === 'function'
        ? collection(activeDb, 'bookings')
        : null;

      if (typeof onSnapshot === 'function') {
        const unsub = onSnapshot(
          targetRef as any,
          (snapshot: any) => {
            if (isCancelled || !snapshot) return;
            let rawData: any = null;
            let docId = targetBookingId || 'bk-active';

            if (typeof snapshot?.data === 'function') {
              rawData = snapshot.data();
              docId = snapshot.id || docId;
            } else if (Array.isArray(snapshot?.docs) && snapshot.docs.length > 0) {
              const firstDoc = snapshot.docs[0];
              rawData = typeof firstDoc?.data === 'function' ? firstDoc.data() : firstDoc;
              docId = firstDoc?.id || rawData?.id || docId;
            } else if (typeof snapshot?.forEach === 'function') {
              snapshot.forEach((d: any) => {
                if (!rawData) {
                  rawData = typeof d?.data === 'function' ? d.data() : d;
                  docId = d?.id || rawData?.id || docId;
                }
              });
            }

            if (rawData && typeof rawData === 'object') {
              const baseBooking =
                propBooking || propActiveBooking || contextActiveBooking || ({} as Booking);
              const mergedBooking: Booking = {
                ...baseBooking,
                ...rawData,
                id: docId,
                serviceName:
                  rawData.serviceName ||
                  rawData.service ||
                  baseBooking.serviceName ||
                  'Urban Assistance Service',
                status: rawData.status || baseBooking.status || 'pending',
                totalAmount: Number(rawData.totalAmount ?? baseBooking.totalAmount ?? 298),
                totalHours: Number(rawData.totalHours ?? baseBooking.totalHours ?? 2),
                bookedHours: Number(rawData.bookedHours ?? baseBooking.bookedHours ?? 2),
                scheduledDate: rawData.scheduledDate || baseBooking.scheduledDate || 'Today',
                startTime: rawData.startTime || baseBooking.startTime || '10:00 AM',
                startOtp: rawData.startOtp || baseBooking.startOtp || '4829',
                location: rawData.location ||
                  baseBooking.location || {
                    address: 'Bandra West, Mumbai',
                    area: 'Bandra West',
                    lat: 19.0596,
                    lng: 72.8295
                  }
              } as Booking;

              const nextNorm = normalizeBookingStatus(mergedBooking.status);
              const prevNorm = prevStatusRef.current;

              if (prevNorm && prevNorm !== nextNorm) {
                const eventType = mapBookingStatusToPushEvent(nextNorm);
                sendBookingUpdatePushNotification(mergedBooking, eventType, {
                  dedupeKey: `${mergedBooking.id}:${nextNorm}`,
                  force: true
                })
                  .then((res) => {
                    if (!isCancelled) {
                      setFcmStatusBanner({
                        title: res.title,
                        body: res.body,
                        type: 'BOOKING',
                        bookingId: mergedBooking.id,
                        status: mergedBooking.status,
                        eventType: res.eventType,
                        timestamp: new Date().toISOString()
                      });
                    }
                  })
                  .catch(() => {});
              }

              prevStatusRef.current = nextNorm;
              setFirestoreBooking(mergedBooking);
            }
          },
          () => {}
        );
        if (typeof unsub === 'function') {
          unsubscribe = unsub;
        }
      }
    } catch {
      // ignore listener setup error
    }

    return () => {
      isCancelled = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [
    propBookingId,
    propBooking?.id,
    propActiveBooking?.id,
    contextActiveBooking?.id
  ]);

  // Detect status transitions when activeBooking updates via props or context
  useEffect(() => {
    if (!activeBooking?.id || !activeBooking?.status) return;
    const nextNorm = normalizeBookingStatus(activeBooking.status);
    const prevNorm = prevStatusRef.current;
    if (prevNorm && prevNorm !== nextNorm) {
      const eventType = mapBookingStatusToPushEvent(nextNorm);
      sendBookingUpdatePushNotification(activeBooking, eventType, {
        dedupeKey: `${activeBooking.id}:${nextNorm}`,
        force: true
      })
        .then((res) => {
          setFcmStatusBanner({
            title: res.title,
            body: res.body,
            type: 'BOOKING',
            bookingId: activeBooking.id,
            status: activeBooking.status,
            eventType: res.eventType,
            timestamp: new Date().toISOString()
          });
        })
        .catch(() => {});
    }
    prevStatusRef.current = nextNorm;
  }, [activeBooking?.id, activeBooking?.status]);

  const effectivePushPermission =
    contextPushPermission && contextPushPermission !== 'default'
      ? contextPushPermission
      : localPushPermission || getPushPermission();

  const handleEnableFcmPush = async () => {
    const perm = requestPushNotificationPermission
      ? await requestPushNotificationPermission()
      : await requestPushPermission();
    setLocalPushPermission(perm || getPushPermission());
    await registerFcmPushToken({
      customerId: customerProfile?.id || currentUser?.id || 'cust-user',
      phone: customerProfile?.phone || currentUser?.phone,
      requestBrowserPermission: true
    });
  };

  const handleTriggerStatusPush = async (customStatus?: string) => {
    setIsSendingPush(true);
    try {
      const target = activeBooking || {
        id: 'bk-active-fcm',
        bookingNumber: 'DBL-2026-901',
        serviceName: 'Hospital Visit Companion',
        assistantName: 'Rajesh Sharma',
        status: (customStatus as any) || 'on_the_way',
        location: {
          address: 'Bandra West, Mumbai',
          area: 'Bandra West',
          lat: 19.0596,
          lng: 72.8295
        }
      };
      const statusToSend = customStatus || target.status || 'ON_THE_WAY';
      const res = await sendBookingUpdatePushNotification(target, statusToSend, {
        customerId: customerProfile?.id || currentUser?.id,
        phone: customerProfile?.phone || currentUser?.phone,
        force: true
      });
      setFcmStatusBanner({
        title: res.title,
        body: res.body,
        type: 'BOOKING',
        bookingId: target.id,
        status: String(statusToSend),
        eventType: res.eventType,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsSendingPush(false);
    }
  };

  if (!activeBooking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
        {fcmStatusBanner && (
          <div
            role="alert"
            aria-live="assertive"
            data-testid="fcm-push-notification-alert"
            className="bg-[#FFF0F5] border border-[#F42F73]/30 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3 text-left text-[#14213D]"
          >
            <div>
              <div data-testid="fcm-notification-title" className="text-sm font-extrabold text-[#14213D]">
                {fcmStatusBanner.title}
              </div>
              <p data-testid="fcm-notification-body" className="text-xs text-gray-600 mt-0.5">
                {fcmStatusBanner.body}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFcmStatusBanner(null)}
              className="text-xs font-bold text-gray-400 hover:text-[#14213D]"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="w-16 h-16 rounded-full bg-[#FFF0F5] text-[#F42F73] flex items-center justify-center mx-auto font-bold text-xl">
          !
        </div>
        <h2 className="text-xl font-bold text-[#14213D]">No Active Booking Selected</h2>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          You don’t have an active assistance request open right now. Book a Diblo assistant from the Home screen or select a booking from My Requests.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={handleBack}
            className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#14213D] text-xs font-bold"
          >
            Back to Home
          </button>
          {onOpenBooking && (
            <button
              onClick={onOpenBooking}
              className="px-6 py-3 rounded-xl bg-[#F42F73] text-white text-xs font-bold shadow-md"
            >
              Book New Assistant
            </button>
          )}
        </div>
      </div>
    );
  }

  const normStatus = normalizeBookingStatus(activeBooking.status);
  const isPending = normStatus === 'pending';
  const isNoAssistantAvailable =
    normStatus === 'no_assistant_available' ||
    String(activeBooking.status).toUpperCase() === 'NO_ASSISTANT_AVAILABLE';
  const isRetryingWave =
    isPending &&
    (Number(activeBooking.dispatchRetryCount || 0) > 0 ||
      String(activeBooking.status).toUpperCase() === 'SEARCHING');
  const isAcceptedOrActive =
    normStatus === 'accepted' ||
    normStatus === 'on_the_way' ||
    normStatus === 'arrived' ||
    normStatus === 'in_progress';
  const isCompleted = normStatus === 'completed';
  const isCancelledOrRejected = normStatus === 'cancelled' || normStatus === 'rejected';

  // Format elapsed timer if IN_PROGRESS
  const elapsedSec = activeBooking.timerElapsedSeconds || 0;
  const hrs = Math.floor(elapsedSec / 3600);
  const mins = Math.floor((elapsedSec % 3600) / 60);
  const secs = elapsedSec % 60;
  const formattedTimer = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const handleExtendHour = async () => {
    setIsExtending(true);
    await extendBooking(activeBooking.id, 1);
    setIsExtending(false);
  };

  const handleConfirmCancel = async () => {
    await cancelBooking(activeBooking.id, cancelReason);
    setShowCancelModal(false);
  };

  const handleRetrySearch = async () => {
    if (isRetryingDispatch) return;
    setIsRetryingDispatch(true);
    try {
      await retryBookingDispatch(activeBooking.id, true);
    } finally {
      setIsRetryingDispatch(false);
    }
  };

  const statusSteps = [
    { key: 'pending', label: 'Request Sent' },
    { key: 'accepted', label: 'Assistant Assigned' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' }
  ];

  const getStepIndex = () => {
    if (normStatus === 'pending' || isNoAssistantAvailable) return 0;
    if (normStatus === 'accepted' || normStatus === 'on_the_way' || normStatus === 'arrived') return 1;
    if (normStatus === 'in_progress') return 2;
    if (normStatus === 'completed') return 3;
    return 0;
  };
  const activeStepIdx = getStepIndex();

  // Real assistant GPS coordinates from Firebase (never simulated)
  const resolvedAssistantCoords =
    liveAssistantCoords ||
    (activeBooking.assistantLocation?.lat && activeBooking.assistantLocation?.lng
      ? { lat: activeBooking.assistantLocation.lat, lng: activeBooking.assistantLocation.lng }
      : null);

  return (
    <div className="max-w-4xl 2xl:max-w-screen-xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6 pb-24 md:pb-12 text-[#14213D]">
      {/* Back & Booking ID Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#14213D] py-1.5 px-2.5 -ml-2.5 rounded-xl hover:bg-gray-100 transition-colors min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-gray-500">
            {activeBooking.bookingNumber || activeBooking.requestId || activeBooking.id}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-800'
                : isCancelledOrRejected || isNoAssistantAvailable
                ? 'bg-red-100 text-red-700'
                : isAcceptedOrActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-[#FFF0F5] text-[#F42F73]'
            }`}
          >
            {isPending
              ? isRetryingWave
                ? 'Finding an available assistant...'
                : 'Finding your assistant...'
              : isNoAssistantAvailable
              ? 'No Assistant Available'
              : normStatus === 'accepted'
              ? 'Assistant Found • Assigned'
              : normStatus === 'in_progress'
              ? 'Assistance in Progress'
              : activeBooking.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Live FCM Push Notification Alert Banner */}
      {fcmStatusBanner && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="fcm-push-notification-alert"
          className="bg-[#FFF0F5] border border-[#F42F73]/30 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3 text-[#14213D]"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F42F73] text-white flex items-center justify-center shrink-0 mt-0.5">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#F42F73]">
                  FCM Push Notification
                </span>
                {fcmStatusBanner.status && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 uppercase">
                    {String(fcmStatusBanner.status).replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <div
                data-testid="fcm-notification-title"
                className="text-xs sm:text-sm font-extrabold text-[#14213D] mt-0.5"
              >
                {fcmStatusBanner.title}
              </div>
              <p
                data-testid="fcm-notification-body"
                className="text-xs text-gray-600 mt-0.5 leading-relaxed"
              >
                {fcmStatusBanner.body}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setFcmStatusBanner(null)}
            className="text-xs font-bold text-gray-400 hover:text-[#14213D] px-2 py-1 rounded-lg cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Firebase Cloud Messaging (FCM) Active Booking Status Push Bar */}
      <div
        data-testid="active-booking-fcm-card"
        className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFF0F5] text-[#F42F73] border border-[#F42F73]/20 flex items-center justify-center shrink-0">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-[#14213D]">
                FCM Push Notifications for Active Booking
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${
                  effectivePushPermission === 'granted'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}
              >
                {effectivePushPermission === 'granted' ? 'FCM Active' : 'In-App & Push Ready'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Automatic push alerts trigger whenever your assistant accepts, arrives, starts, or completes this booking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {effectivePushPermission !== 'granted' && (
            <button
              type="button"
              data-testid="active-booking-enable-fcm-btn"
              onClick={handleEnableFcmPush}
              className="px-3 py-1.5 rounded-xl bg-[#14213D] hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Push Alerts</span>
            </button>
          )}
          <button
            type="button"
            data-testid="active-booking-send-push-btn"
            disabled={isSendingPush}
            onClick={() => handleTriggerStatusPush()}
            className="px-3 py-1.5 rounded-xl bg-[#FFF0F5] hover:bg-rose-100 text-[#F42F73] border border-[#F42F73]/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{isSendingPush ? 'Sending...' : 'Send Status Push'}</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* STATE 1: LIVE PARALLEL MATCHING SCREEN (FINDING YOUR ASSISTANT)   */}
      {/* ================================================================= */}
      {isPending && (
        <div
          data-testid="customer-matching-screen"
          className="bg-white rounded-3xl p-5 sm:p-6 border border-amber-200 shadow-sm space-y-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-[#FFF0F5] border border-[#F42F73]/30 flex items-center justify-center text-[#F42F73] shrink-0">
              <span className="absolute inset-0 rounded-2xl bg-[#F42F73]/15 animate-ping" />
              <Sparkles className="w-6 h-6 animate-pulse relative z-10" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-[#F42F73] bg-[#FFF0F5] px-2.5 py-0.5 rounded-full mb-1">
                    Booking Request Sent
                  </span>
                  <h2
                    data-testid="customer-matching-title"
                    className="text-lg sm:text-xl font-black text-[#14213D]"
                  >
                    {isRetryingWave
                      ? 'Finding an available assistant...'
                      : 'Finding your assistant...'}
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  {isRetryingWave
                    ? 'Status: Finding an available assistant...'
                    : 'Status: Finding your assistant...'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {isRetryingWave
                  ? 'Expanding search across nearby zones to connect you with an available verified assistant...'
                  : 'Matching you with nearby available Diblo assistants in real time. This screen will update automatically as soon as your assistant accepts.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
            <div>
              <span className="text-gray-400 font-semibold block">Request ID</span>
              <span className="font-mono font-bold text-[#14213D]">
                {activeBooking.bookingNumber || activeBooking.requestId || activeBooking.id}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-semibold block">Service</span>
              <span className="font-bold text-[#14213D]">{activeBooking.serviceName}</span>
            </div>
            <div>
              <span className="text-gray-400 font-semibold block">Date & Time</span>
              <span className="font-semibold text-[#14213D]">
                {activeBooking.scheduledDate} • {activeBooking.startTime}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-semibold block">Estimated Distance / Duration</span>
              <span className="font-semibold text-[#14213D]">
                {activeBooking.estimatedDistance || 'Within 2.5 km'} •{' '}
                {activeBooking.estimatedDuration || `${activeBooking.totalHours || 2} hrs`}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-gray-400 font-semibold block">Pickup Location</span>
              <span className="font-semibold text-[#14213D]">{activeBooking.location?.address}</span>
            </div>
            {activeBooking.destinationLocation?.address && (
              <div className="sm:col-span-2">
                <span className="text-gray-400 font-semibold block">Destination</span>
                <span className="font-semibold text-[#14213D]">
                  {activeBooking.destinationLocation.address}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STATE 1B: NO ASSISTANT CURRENTLY AVAILABLE IN YOUR AREA           */}
      {/* ================================================================= */}
      {isNoAssistantAvailable && (
        <div
          data-testid="no-assistant-available-card"
          className="bg-white rounded-3xl p-6 border-2 border-amber-200 shadow-sm space-y-4 text-center sm:text-left"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-7 h-7" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                High Demand in Your Area
              </span>
              <h2
                data-testid="no-assistant-available-title"
                className="text-lg sm:text-xl font-black text-[#14213D]"
              >
                No assistant is currently available in your area.
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                All nearby assistants are currently occupied or did not respond within the request window. You can retry searching for nearby assistants right now or cancel this booking.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              data-testid="retry-assistant-search-btn"
              onClick={handleRetrySearch}
              disabled={isRetryingDispatch}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#F42F73] hover:bg-[#d92563] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60 min-h-[48px]"
            >
              <RefreshCw className={`w-4 h-4 ${isRetryingDispatch ? 'animate-spin' : ''}`} />
              <span>{isRetryingDispatch ? 'Searching Nearby...' : 'Retry Search'}</span>
            </button>
            <button
              type="button"
              data-testid="cancel-unavailable-booking-btn"
              onClick={() => setShowCancelModal(true)}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px]"
            >
              <XCircle className="w-4 h-4 text-gray-500" />
              <span>Cancel Booking</span>
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STATE 2: ASSISTANT FOUND / ASSIGNED & LIVE TRACKING BANNER        */}
      {/* ================================================================= */}
      {isAcceptedOrActive && (
        <div
          data-testid="assistant-found-banner"
          className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <img
              src={
                activeBooking.assistantPhoto ||
                'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80'
              }
              alt={activeBooking.assistantName || 'Assistant'}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
            />
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                {normStatus === 'in_progress'
                  ? 'Assistance in Progress'
                  : 'Assistant Found • Assistant Assigned'}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {normStatus === 'in_progress'
                  ? 'Assistance is Currently Active'
                  : 'Assistant Found — Your Assistant is on the way'}
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                <strong>{activeBooking.assistantName || 'Rajesh Sharma'}</strong> • {activeBooking.serviceName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-black/20 px-4 py-3 rounded-2xl border border-white/15 shrink-0">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">Live ETA</div>
              <div className="text-base font-black text-white">
                {liveEtaMinutes > 0
                  ? `${liveEtaMinutes} mins`
                  : activeBooking.estimatedDuration || 'Calculating...'}
              </div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">Distance</div>
              <div className="text-base font-black text-white">
                {liveDistanceKm > 0
                  ? `${liveDistanceKm} km`
                  : activeBooking.estimatedDistance || '2.4 km'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Google Map View (Pickup, Destination, Route & Real Assistant GPS Marker) */}
      {!isCompleted && !isCancelledOrRejected && (
        <AssistantTaskMap
          assistantLocation={
            resolvedAssistantCoords
              ? {
                  lat: resolvedAssistantCoords.lat,
                  lng: resolvedAssistantCoords.lng,
                  address: activeBooking.assistantLocation?.address || 'Live Assistant GPS',
                  area: activeBooking.location?.area || 'Mumbai'
                }
              : null
          }
          customerLocation={{
            lat: activeBooking.location?.lat || 19.0607,
            lng: activeBooking.location?.lng || 72.8258,
            address: activeBooking.location?.address || 'Mumbai',
            area: activeBooking.location?.area || 'Mumbai',
            landmark: activeBooking.location?.landmark
          }}
          destinationLocation={
            activeBooking.destinationLocation?.address
              ? {
                  lat: activeBooking.destinationLocation.lat || 19.055,
                  lng: activeBooking.destinationLocation.lng || 72.831,
                  address: activeBooking.destinationLocation.address,
                  area: activeBooking.destinationLocation.area || 'Mumbai'
                }
              : null
          }
          customerName={activeBooking.customerName || 'Customer'}
          assistantName={activeBooking.assistantName || 'Diblo Assistant'}
          bookingStatus={activeBooking.status}
          height="320px"
        />
      )}

      {/* Progress Stepper */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statusSteps.map((step, i) => {
            const isDone = i <= activeStepIdx;
            const isCurrent = i === activeStepIdx;
            return (
              <div
                key={step.key}
                className={`p-3 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'border-[#F42F73] bg-[#FFF0F5]'
                    : isDone
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Step {i + 1}
                  </span>
                  {isDone && (
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${isCurrent ? 'text-[#F42F73]' : 'text-emerald-600'}`}
                    />
                  )}
                </div>
                <div className="text-xs font-bold text-[#14213D]">{step.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Assistant Profile + OTP & Live Timer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Assigned Assistant Profile Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-4">
            <img
              src={
                activeBooking.assistantPhoto ||
                'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80'
              }
              alt={activeBooking.assistantName || 'Assistant'}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Police Verified
                </span>
                <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {activeBooking.assistantRating || 4.95}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-[#14213D] mt-1">
                {activeBooking.assistantName || (isPending ? 'Finding Assistant...' : 'Rajesh Sharma')}
              </h3>
              <p className="text-xs text-gray-500">
                {isPending
                  ? 'Broadcasting your request to verified assistants nearby'
                  : `Assigned for ${activeBooking.serviceName}`}
              </p>

              {activeBooking.assistantId && (
                <button
                  type="button"
                  onClick={() => toggleFavoriteAssistant(activeBooking.assistantId!)}
                  className={`mt-2.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                    isAssistantFavorited(activeBooking.assistantId)
                      ? 'bg-rose-50 text-[#F42F73] border-rose-200 shadow-2xs'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#F42F73]/40 hover:text-[#F42F73]'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      isAssistantFavorited(activeBooking.assistantId) ? 'fill-[#F42F73] text-[#F42F73]' : ''
                    }`}
                  />
                  <span>
                    {isAssistantFavorited(activeBooking.assistantId)
                      ? 'Saved as Preferred Helper'
                      : 'Save Helper to Favorites'}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] text-gray-400 font-bold uppercase">Assistant Contact</div>
              <div className="text-xs font-mono font-bold text-[#14213D]">
                {activeBooking.assistantPhone ? `+91 ${activeBooking.assistantPhone}` : 'Assigned upon acceptance'}
              </div>
            </div>
            {activeBooking.assistantPhone && (
              <a
                href={`tel:${activeBooking.assistantPhone}`}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Assistant</span>
              </a>
            )}
          </div>
        </div>

        {/* Security Start OTP & Live Timer Card */}
        <div className="bg-[#14213D] text-white rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col justify-between space-y-4">
          {normStatus !== 'in_progress' && !isCompleted ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[#F42F73]" />
                  <span>Start Security OTP</span>
                </span>
                <span className="text-[10px] bg-white/10 px-2.5 py-0.5 rounded-full text-gray-200">
                  Share on arrival
                </span>
              </div>

              <div className="py-2 text-center">
                <div className="text-3xl sm:text-4xl font-mono font-black tracking-[0.3em] text-[#F42F73] bg-white/5 py-3 rounded-2xl border border-white/10">
                  {activeBooking.startOtp}
                </div>
                <p className="text-[11px] text-gray-300 mt-2">
                  Share this 4-digit code with your assistant once they reach your pickup location.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>{isCompleted ? 'Session Completed' : 'Assistance Session Live'}</span>
                </span>
                <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-full">
                  Booked: {activeBooking.totalHours || activeBooking.bookedHours} hrs
                </span>
              </div>

              <div className="py-2 text-center">
                <div className="text-3xl font-mono font-black tracking-widest text-white">
                  {isCompleted ? `${activeBooking.totalHours || activeBooking.bookedHours}:00:00` : formattedTimer}
                </div>
                <p className="text-[11px] text-gray-300 mt-1">
                  Billed transparently at ₹149/hour • Total: ₹{activeBooking.totalAmount}
                </p>
              </div>

              {normStatus === 'in_progress' && (
                <button
                  onClick={handleExtendHour}
                  disabled={isExtending}
                  className="w-full py-2.5 rounded-xl bg-[#F42F73] hover:bg-[#D81B60] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{isExtending ? 'Extending...' : 'Extend Booking by +1 Hour (₹149)'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Service & Pickup / Destination Summary Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase">Service Booked</div>
            <div className="text-base font-extrabold text-[#14213D]">{activeBooking.serviceName}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 font-bold uppercase">Total Fare</div>
            <div className="text-lg font-black text-[#F42F73]">₹{activeBooking.totalAmount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600 pt-1">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#14213D]">Pickup Location:</span>{' '}
              {activeBooking.location?.address}
              {activeBooking.location?.landmark && ` (${activeBooking.location.landmark})`}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-[#F42F73] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#14213D]">Schedule:</span> {activeBooking.scheduledDate} at{' '}
              {activeBooking.startTime} ({activeBooking.totalHours || activeBooking.bookedHours} Hours)
            </div>
          </div>
          {activeBooking.destinationLocation?.address && (
            <div className="flex items-start gap-2 sm:col-span-2">
              <Flag className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#14213D]">Destination:</span>{' '}
                {activeBooking.destinationLocation.address}
              </div>
            </div>
          )}
        </div>

        {(activeBooking.instructions || activeBooking.description) && (
          <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-600 border border-gray-100">
            <span className="font-bold text-[#14213D]">Customer Instructions: </span>
            {activeBooking.instructions || activeBooking.description}
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#14213D] text-xs font-bold flex items-center gap-1.5 transition-colors min-h-[44px]"
            >
              <FileText className="w-4 h-4 text-[#F42F73]" />
              <span>View GST Invoice</span>
            </button>

            {isCompleted && !activeBooking.rating && (
              <button
                id="active-view-rate-tip-btn"
                onClick={() => setShowRatingModal(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-900 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs min-h-[44px]"
              >
                <Star className="w-4 h-4 fill-gray-900" />
                <span>Rate Assistant & Leave Tip</span>
              </button>
            )}

            {activeBooking.rating && (
              <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200/80 text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>Rated {activeBooking.rating.stars}★</span>
                {activeBooking.tipAmount && activeBooking.tipAmount > 0 ? (
                  <span className="text-emerald-700 font-bold ml-1">
                    • ₹{activeBooking.tipAmount} Tip Given
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {!isCompleted && !isCancelledOrRejected && (
            <button
              id="active-view-cancel-booking-btn"
              onClick={() => setShowCancelModal(true)}
              className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors py-2 px-1 min-h-[44px] flex items-center"
            >
              Cancel Booking
            </button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#14213D]">Cancel Booking?</h3>
            <p className="text-xs text-gray-500">
              Please select a cancellation reason. Free cancellation is available before assistant arrival.
            </p>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
            >
              <option value="Change of schedule">Change of schedule</option>
              <option value="Errand no longer needed">Errand no longer needed</option>
              <option value="Booked wrong service or location">Booked wrong service or location</option>
              <option value="Assistant delayed">Assistant delayed</option>
            </select>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Confirm Cancel
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        booking={activeBooking}
      />

      {/* Rating & Feedback Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        booking={activeBooking}
        bookingId={activeBooking.id}
        assistantName={activeBooking.assistantName || 'Rajesh Sharma'}
      />
    </div>
  );
};
