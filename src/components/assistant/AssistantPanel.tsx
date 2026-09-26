import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu,
  X,
  ShieldCheck,
  Power,
  MapPin,
  Clock,
  CheckCircle2,
  Star,
  Navigation,
  Key,
  Phone,
  AlertTriangle,
  LogOut,
  Car,
  RefreshCw,
  ExternalLink,
  XCircle,
  Radio,
  Flag,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { api } from '../../lib/api';
import { AssistantTaskMap } from '../maps/AssistantTaskMap';
import { AssistantDrawer, AssistantSection } from './AssistantDrawer';
import { NewOrderModal } from './NewOrderModal';
import { AssistantOrdersView } from './AssistantOrdersView';
import { AssistantEarningsView } from './AssistantEarningsView';
import { AssistantLocationView } from './AssistantLocationView';
import { AssistantProfileView } from './AssistantProfileView';
import { AssistantSupportView } from './AssistantSupportView';
import { AssistantNotificationsView } from './AssistantNotificationsView';
import {
  startNewOrderAlert,
  stopAlert,
  hasOrderBeenAlerted,
  requestNotificationPermission
} from '../../lib/assistantAlertService';
import { normalizeBookingStatus, isDemoBookingRecord } from '../../lib/firestoreBookings';
import { Booking } from '../../types';

export interface EstimatedRouteDetails {
  distanceText: string;
  distanceKm: number;
  durationText: string;
  durationMinutes: number;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  calculatedAt: string;
  isFallback: boolean;
}

export const AssistantPanel: React.FC = () => {
  const { assistantProfile, staffUser, updateAssistantProfile, logoutStaff } = useAuth();
  const {
    bookings,
    refreshBookings,
    acceptBooking,
    rejectBooking,
    startAssistance,
    updateAssistantLiveLocation,
    verifyStartOtp,
    completeBooking,
    notifications,
    markNotificationRead
  } = useBooking();

  const assistantId = staffUser?.eplId || assistantProfile?.id || 'asst-1';

  // Navigation & Drawer State
  const [currentSection, setCurrentSection] = useState<AssistantSection>('HOME');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Online / Offline State
  const [isOnline, setIsOnline] = useState<boolean>(assistantProfile?.isOnline ?? true);
  const [isTogglingOnline, setIsTogglingOnline] = useState<boolean>(false);

  // New Order Popup & Alert State
  const [popupOrder, setPopupOrder] = useState<Booking | null>(null);
  const [isAcceptingOrder, setIsAcceptingOrder] = useState<boolean>(false);
  const [rejectedOrderIds, setRejectedOrderIds] = useState<Set<string>>(new Set());

  // OTP Verification Modal State
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Location & Google Routes API State
  const [assistantGpsCoords, setAssistantGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<'granted' | 'prompt' | 'denied'>('prompt');
  const [isRefreshingGps, setIsRefreshingGps] = useState<boolean>(false);
  const [isLiveTrackingActive, setIsLiveTrackingActive] = useState<boolean>(false);
  const [routeEstimate, setRouteEstimate] = useState<EstimatedRouteDetails | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mapFocusTrigger, setMapFocusTrigger] = useState<number>(0);

  const watchIdRef = useRef<number | null>(null);

  // Filter out any demo records
  const realBookings = bookings.filter((b) => !isDemoBookingRecord(b));

  // Identify current active task assigned to this assistant
  const activeTask = realBookings.find((b) => {
    const norm = normalizeBookingStatus(b.status);
    return (
      b.assistantId === assistantId &&
      (norm === 'accepted' || norm === 'on_the_way' || norm === 'arrived' || norm === 'in_progress')
    );
  });

  const activeTaskNormStatus = normalizeBookingStatus(activeTask?.status);
  const isAssistanceInProgress =
    activeTaskNormStatus === 'in_progress' ||
    activeTaskNormStatus === 'on_the_way' ||
    activeTaskNormStatus === 'arrived';

  // Available new incoming requests in real time from Firebase
  const incomingRequests = realBookings.filter((b) => {
    const norm = normalizeBookingStatus(b.status);
    return (
      !rejectedOrderIds.has(b.id) &&
      norm === 'pending' &&
      (!b.assistantId || b.assistantId === assistantId)
    );
  });

  // Stop active Geolocation watch helper
  const stopLiveGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveTrackingActive(false);
  }, []);

  // Fetch single GPS snapshot (only when explicitly requested or when active assistance starts)
  const refreshGpsLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    setIsRefreshingGps(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 10000
          });
        });
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setAssistantGpsCoords(coords);
        setGpsPermissionStatus('granted');
        return coords;
      }
    } catch (err: any) {
      if (err?.code === 1) {
        setGpsPermissionStatus('denied');
      }
    } finally {
      setIsRefreshingGps(false);
    }
    return null;
  }, []);

  // Request browser notification permission on mount (do NOT auto-start GPS tracking until assistance starts)
  useEffect(() => {
    requestNotificationPermission().catch(() => {});
    return () => {
      stopLiveGpsTracking();
    };
  }, [stopLiveGpsTracking]);

  // Start / Stop real live location tracking ONLY when assistance is in_progress
  useEffect(() => {
    if (!activeTask || !isAssistanceInProgress) {
      stopLiveGpsTracking();
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsPermissionStatus('denied');
      return;
    }

    // Clear any previous watch before starting for activeTask.id
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsLiveTrackingActive(true);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsPermissionStatus('granted');
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setAssistantGpsCoords({ lat, lng });

        updateAssistantLiveLocation(activeTask.id, {
          latitude: lat,
          longitude: lng,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed
        }).catch((e) => {
          console.debug('Live location update error:', e);
        });
      },
      (err) => {
        if (err.code === 1) {
          setGpsPermissionStatus('denied');
          setIsLiveTrackingActive(false);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeTask?.id, isAssistanceInProgress, stopLiveGpsTracking, updateAssistantLiveLocation]);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Auto-detect New Order from Firebase for Popup & Sound/Browser/Vibration Alert
  useEffect(() => {
    if (!isOnline || activeTask) {
      if (popupOrder) {
        stopAlert();
        setPopupOrder(null);
      }
      return;
    }

    const newCandidate = incomingRequests.find((b) => !rejectedOrderIds.has(b.id));

    if (newCandidate) {
      if (!popupOrder || popupOrder.id !== newCandidate.id) {
        setPopupOrder(newCandidate);
        if (!hasOrderBeenAlerted(newCandidate.id)) {
          startNewOrderAlert({
            id: newCandidate.id,
            customerName: newCandidate.customerName,
            serviceName: newCandidate.serviceName,
            location: newCandidate.location,
            totalAmount: newCandidate.totalAmount
          });
        }
      }
    } else {
      if (popupOrder) {
        stopAlert();
        setPopupOrder(null);
      }
    }
  }, [isOnline, activeTask, incomingRequests, rejectedOrderIds, popupOrder]);

  /**
   * Google Routes API Calculator
   */
  const calculateRouteToCustomer = useCallback(
    async (targetLocation?: { lat: number; lng: number }): Promise<EstimatedRouteDetails | null> => {
      setIsCalculatingRoute(true);
      setRouteError(null);

      try {
        let originLat = assistantGpsCoords?.lat || assistantProfile?.currentLocation?.lat;
        let originLng = assistantGpsCoords?.lng || assistantProfile?.currentLocation?.lng;

        const destLat =
          targetLocation?.lat ??
          activeTask?.pickupLocation?.lat ??
          activeTask?.location?.latitude ??
          activeTask?.location?.lat;
        const destLng =
          targetLocation?.lng ??
          activeTask?.pickupLocation?.lng ??
          activeTask?.location?.longitude ??
          activeTask?.location?.lng;

        if (
          typeof destLat !== 'number' ||
          typeof destLng !== 'number' ||
          isNaN(destLat) ||
          isNaN(destLng)
        ) {
          setRouteError('Customer pickup coordinates are not available.');
          return null;
        }

        // If assistant doesn't have live GPS yet, calculate route between pickup and destination if destination exists
        if (typeof originLat !== 'number' || typeof originLng !== 'number') {
          if (activeTask?.destinationLocation?.lat && activeTask?.destinationLocation?.lng) {
            const route = await api.getRoute(
              destLat,
              destLng,
              activeTask.destinationLocation.lat,
              activeTask.destinationLocation.lng,
              'DRIVE'
            );
            if (route && route.success) {
              const estimate: EstimatedRouteDetails = {
                distanceText: route.distanceText,
                distanceKm: route.distanceKm,
                durationText: route.durationText,
                durationMinutes: route.durationMinutes,
                originLat: destLat,
                originLng: destLng,
                destLat: activeTask.destinationLocation.lat,
                destLng: activeTask.destinationLocation.lng,
                calculatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isFallback: route.isFallback
              };
              setRouteEstimate(estimate);
              return estimate;
            }
          }
          return null;
        }

        const route = await api.getRoute(originLat, originLng, destLat, destLng, 'DRIVE');

        if (route && route.success) {
          const estimate: EstimatedRouteDetails = {
            distanceText: route.distanceText,
            distanceKm: route.distanceKm,
            durationText: route.durationText,
            durationMinutes: route.durationMinutes,
            originLat,
            originLng,
            destLat,
            destLng,
            calculatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isFallback: route.isFallback
          };
          setRouteEstimate(estimate);
          return estimate;
        } else {
          setRouteError('Could not calculate driving route via Google Routes API.');
          return null;
        }
      } catch (err) {
        console.error('Error calculating route to customer:', err);
        setRouteError('Failed to fetch route estimate.');
        return null;
      } finally {
        setIsCalculatingRoute(false);
      }
    },
    [
      assistantGpsCoords,
      assistantProfile?.currentLocation?.lat,
      assistantProfile?.currentLocation?.lng,
      activeTask?.pickupLocation?.lat,
      activeTask?.pickupLocation?.lng,
      activeTask?.location?.latitude,
      activeTask?.location?.lat,
      activeTask?.location?.longitude,
      activeTask?.location?.lng,
      activeTask?.destinationLocation?.lat,
      activeTask?.destinationLocation?.lng
    ]
  );

  // Automatically calculate route whenever active task or GPS changes
  useEffect(() => {
    if (activeTask) {
      const destLat =
        activeTask.pickupLocation?.lat ||
        activeTask.location?.latitude ||
        activeTask.location?.lat;
      const destLng =
        activeTask.pickupLocation?.lng ||
        activeTask.location?.longitude ||
        activeTask.location?.lng;
      if (typeof destLat === 'number' && typeof destLng === 'number') {
        calculateRouteToCustomer({ lat: destLat, lng: destLng });
      }
    } else {
      setRouteEstimate(null);
    }
  }, [activeTask?.id, activeTask?.status, assistantGpsCoords?.lat, assistantGpsCoords?.lng, calculateRouteToCustomer]);

  // Handle Online / Offline Switch
  const handleToggleOnline = async () => {
    if (isTogglingOnline) return;
    setIsTogglingOnline(true);
    try {
      const res = await api.toggleAssistantOnline(assistantId);
      setIsOnline(res.isOnline);
      updateAssistantProfile({ isOnline: res.isOnline });
      if (!res.isOnline) {
        stopAlert();
        setPopupOrder(null);
      }
    } catch (e) {
      console.error('Failed to toggle online status:', e);
    } finally {
      setIsTogglingOnline(false);
    }
  };

  // Handle Order Accept (from Popup or List) -> updates Firebase status = 'accepted'
  const handleAcceptOrder = async (orderId: string) => {
    setIsAcceptingOrder(true);
    stopAlert();
    try {
      await acceptBooking(orderId, assistantId, {
        assistantName: staffUser?.name || assistantProfile?.name || 'Rajesh Sharma',
        assistantPhone: staffUser?.number || assistantProfile?.phone || '9820554433',
        assistantPhoto:
          assistantProfile?.photo ||
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
        assistantRating: assistantProfile?.rating || 4.95
      });

      setPopupOrder(null);
      setCurrentSection('HOME');
    } catch (e) {
      console.error('Failed to accept order:', e);
    } finally {
      setIsAcceptingOrder(false);
    }
  };

  // Handle Order Reject -> updates Firebase status = 'rejected'
  const handleRejectOrder = async (orderId: string) => {
    stopAlert();
    setPopupOrder(null);
    setRejectedOrderIds((prev) => new Set([...prev, orderId]));
    try {
      await rejectBooking(orderId, assistantId);
    } catch (e) {
      console.debug('Reject booking sync error:', e);
    }
  };

  // Start Assistance -> updates Firebase status = 'in_progress' and starts live location tracking
  const handleStartAssistance = async (orderId: string) => {
    try {
      // Request browser location permission and push initial coordinates when starting assistance
      const coords = await refreshGpsLocation();
      await startAssistance(orderId);
      if (coords) {
        await updateAssistantLiveLocation(orderId, {
          latitude: coords.lat,
          longitude: coords.lng
        });
      }
    } catch (e) {
      console.error('Failed to start assistance:', e);
    }
  };

  // Optional OTP verification modal handler
  const handleVerifyOtpSubmit = async () => {
    if (!activeTask || !enteredOtp) return;
    setIsVerifying(true);
    setOtpError('');
    try {
      const success = await verifyStartOtp(activeTask.id, enteredOtp);
      if (success) {
        setShowOtpModal(false);
        setEnteredOtp('');
        const coords = await refreshGpsLocation();
        if (coords) {
          await updateAssistantLiveLocation(activeTask.id, {
            latitude: coords.lat,
            longitude: coords.lng
          });
        }
      } else {
        setOtpError('Invalid OTP. Please ask customer for the 4-digit code.');
      }
    } catch {
      setOtpError('Verification failed. Please check network.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Complete Request -> updates Firebase status = 'completed' and stops active location tracking
  const handleCompleteTask = async (orderId: string) => {
    try {
      stopLiveGpsTracking();
      await completeBooking(orderId);
    } catch (e) {
      console.error('Failed to complete booking:', e);
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-[#14213D] pb-24 md:pb-16">
      {/* Side Menu Drawer */}
      <AssistantDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeSection={currentSection}
        onSelectSection={(sec) => setCurrentSection(sec)}
        assistantProfile={assistantProfile}
        isOnline={isOnline}
        unreadNotificationsCount={unreadNotificationsCount}
        newOrdersCount={incomingRequests.length}
        onLogout={() => logoutStaff()}
      />

      {/* New Assistance Request Popup Alert Modal */}
      <NewOrderModal
        order={popupOrder}
        onAccept={handleAcceptOrder}
        onReject={handleRejectOrder}
        isAccepting={isAcceptingOrder}
        distanceText={
          popupOrder?.estimatedDistance ||
          routeEstimate?.distanceText ||
          'Nearby'
        }
      />

      {/* Top Assistant Header with Hamburger & Online/Offline Control */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-3">
          {/* Hamburger Menu & Profile Identity */}
          <div className="flex items-center gap-3">
            <button
              id="assistant-open-drawer-btn"
              type="button"
              onClick={() => setIsDrawerOpen((prev) => !prev)}
              aria-expanded={isDrawerOpen}
              aria-controls="assistant-drawer-container"
              className="p-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-[#14213D] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shadow-2xs relative"
              aria-label={isDrawerOpen ? 'Close Assistant Navigation Drawer' : 'Open Assistant Navigation Drawer'}
            >
              {isDrawerOpen ? (
                <X className="w-5 h-5 text-[#14213D]" />
              ) : (
                <Menu className="w-5 h-5 text-[#14213D]" />
              )}
              {unreadNotificationsCount > 0 && !isDrawerOpen && (
                <span
                  id="assistant-drawer-unread-badge"
                  className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"
                />
              )}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  id="assistant-header-avatar"
                  src={
                    assistantProfile?.photo ||
                    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80'
                  }
                  alt={assistantProfile?.name || 'Assistant'}
                  className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shadow-2xs"
                />
                <span
                  id="assistant-header-status-indicator"
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                    isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    id="assistant-header-name"
                    className="font-extrabold text-sm sm:text-base text-[#14213D] leading-tight"
                  >
                    {staffUser?.name || assistantProfile?.name || 'Rajesh Sharma'}
                  </span>
                  <span
                    id="assistant-header-verified-pill"
                    className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded flex items-center gap-0.5"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span className="hidden sm:inline">Police Verified</span>
                  </span>
                </div>
                <div id="assistant-header-badge-id" className="text-[11px] text-gray-500 font-mono">
                  Badge: DIBLO-MUM-{assistantId.slice(-4).toUpperCase() || '7721'} • Mumbai West
                </div>
              </div>
            </div>
          </div>

          {/* Prominent ONLINE / OFFLINE Switch Control & Quick Logout */}
          <div className="flex items-center gap-2">
            <button
              id="assistant-toggle-online-btn"
              type="button"
              onClick={handleToggleOnline}
              disabled={isTogglingOnline}
              className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-md min-h-[48px] active:scale-95 disabled:opacity-75 ${
                isOnline
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <Power className={`w-4 h-4 ${isOnline ? 'text-emerald-200' : 'text-gray-500'}`} />
              <div className="text-left leading-tight">
                <div>{isAssistanceInProgress ? 'Assistance in Progress' : isOnline ? "You're Online" : 'OFFLINE'}</div>
                <div className="text-[9px] font-medium opacity-90 hidden sm:block">
                  {isAssistanceInProgress
                    ? 'Live GPS Tracking Active'
                    : isOnline
                    ? 'Receiving Requests'
                    : 'Requests Paused'}
                </div>
              </div>
            </button>

            <button
              id="assistant-header-logout-btn"
              type="button"
              onClick={() => logoutStaff()}
              className="hidden sm:flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-2xs min-h-[48px]"
              title="Log out of Assistance"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Render Specific Section if Navigated via Drawer */}
        {currentSection === 'MY_ORDERS' && (
          <AssistantOrdersView
            mode="MY_ORDERS"
            bookings={realBookings}
            assistantId={assistantId}
            onAcceptOrder={handleAcceptOrder}
            onRejectOrder={handleRejectOrder}
            onSelectActiveOrder={() => {
              setCurrentSection('HOME');
            }}
            isAcceptingId={isAcceptingOrder ? popupOrder?.id : null}
          />
        )}

        {currentSection === 'NEW_ORDERS' && (
          <AssistantOrdersView
            mode="NEW_ORDERS"
            bookings={realBookings}
            assistantId={assistantId}
            onAcceptOrder={handleAcceptOrder}
            onRejectOrder={handleRejectOrder}
            onSelectActiveOrder={() => {
              setCurrentSection('HOME');
            }}
            isAcceptingId={isAcceptingOrder ? popupOrder?.id : null}
          />
        )}

        {currentSection === 'EARNINGS' && (
          <AssistantEarningsView
            mode="EARNINGS"
            assistantProfile={assistantProfile}
            bookings={realBookings}
          />
        )}

        {currentSection === 'PAYMENTS' && (
          <AssistantEarningsView
            mode="PAYMENTS"
            assistantProfile={assistantProfile}
            bookings={realBookings}
          />
        )}

        {currentSection === 'NOTIFICATIONS' && (
          <AssistantNotificationsView
            notifications={notifications}
            onMarkRead={markNotificationRead}
            onMarkAllRead={() => {
              notifications.forEach((n) => markNotificationRead(n.id));
            }}
          />
        )}

        {currentSection === 'MY_LOCATION' && (
          <AssistantLocationView
            gpsCoords={assistantGpsCoords}
            onRefreshLocation={refreshGpsLocation}
            isRefreshing={isRefreshingGps}
            permissionStatus={gpsPermissionStatus}
            address={
              activeTask?.location?.address ||
              assistantProfile?.currentLocation?.address ||
              'Carter Road, Bandra West'
            }
            area={
              activeTask?.location?.area ||
              assistantProfile?.currentLocation?.area ||
              'Bandra West, Mumbai'
            }
          />
        )}

        {currentSection === 'MY_PROFILE' && (
          <AssistantProfileView mode="MY_PROFILE" assistantProfile={assistantProfile} />
        )}

        {currentSection === 'DOCUMENTS' && (
          <AssistantProfileView mode="DOCUMENTS" assistantProfile={assistantProfile} />
        )}

        {currentSection === 'HELP_SUPPORT' && <AssistantSupportView />}

        {/* HOME SECTION (DEFAULT) */}
        {currentSection === 'HOME' && (
          <div className="space-y-6">
            {/* Status / Duty Indicator Banner (Section 10: "You're Online" vs "Assistance in Progress") */}
            <div
              className={`p-4 rounded-3xl border flex items-center justify-between gap-3 ${
                isAssistanceInProgress
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-md'
                  : isOnline
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-gray-100/80 border-gray-200 text-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    isAssistanceInProgress
                      ? 'bg-white/20 text-white'
                      : isOnline
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-400 text-white'
                  }`}
                >
                  <Radio className={`w-5 h-5 ${isOnline || isAssistanceInProgress ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <div className="font-black text-sm sm:text-base">
                    {isAssistanceInProgress
                      ? 'Assistance in Progress'
                      : isOnline
                      ? "You're Online"
                      : 'OFFLINE • New requests are paused'}
                  </div>
                  <div
                    className={`text-xs mt-0.5 ${
                      isAssistanceInProgress ? 'text-emerald-100' : 'text-gray-500'
                    }`}
                  >
                    {isAssistanceInProgress
                      ? isLiveTrackingActive
                        ? 'Live GPS location tracking is active and syncing to the customer map in real time.'
                        : 'Active request in progress. Enable location access to broadcast live GPS.'
                      : activeTask
                      ? 'Request accepted. Click "Start Assistance" below when ready to begin live tracking.'
                      : isOnline
                      ? 'Connected to Firebase real-time dispatch. New customer requests will alert immediately.'
                      : 'Switch to Online whenever you are ready to accept customer requests.'}
                  </div>
                </div>
              </div>

              {!activeTask && (
                <button
                  type="button"
                  onClick={handleToggleOnline}
                  className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-[#14213D] shadow-2xs hover:bg-gray-50"
                >
                  Change Status
                </button>
              )}
            </div>

            {/* Location Permission Denied Warning (Section 16) */}
            {gpsPermissionStatus === 'denied' && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm font-bold leading-relaxed">
                    Location permission is required to provide live tracking. Please enable location access in your browser/device settings.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={refreshGpsLocation}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 self-start sm:self-auto"
                >
                  Retry Location Access
                </button>
              </div>
            )}

            {/* Quick Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-1">
                <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                  Today's Earnings
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600">
                  ₹{assistantProfile?.earnings?.today || 1490}
                </div>
                <div className="text-[10px] text-gray-500">Fixed rate hourly payout</div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-1">
                <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                  Completed Tasks
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#14213D]">
                  {assistantProfile?.completedTasksCount || 342}
                </div>
                <div className="text-[10px] text-gray-500">100% On-Time Record</div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-1">
                <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                  Customer Rating
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-500 flex items-center gap-1">
                  <span>{assistantProfile?.rating || 4.9}</span>
                  <Star className="w-4 h-4 fill-amber-500" />
                </div>
                <div className="text-[10px] text-gray-500">Top Rated Assistant</div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-1">
                <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                  Weekly Payout
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#14213D]">
                  ₹{assistantProfile?.earnings?.week || 8450}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold">Auto-transfers Monday</div>
              </div>
            </div>

            {/* ACTIVE TASK SECTION (IF ANY) */}
            {activeTask ? (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-[#F42F73] shadow-lg space-y-6 animate-in fade-in duration-200">
                {/* Step-by-Step Flow Status Header */}
                <div className="border-b border-gray-100 pb-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="bg-[#FFF0F5] text-[#F42F73] text-xs font-black px-3 py-1 rounded-full uppercase inline-block border border-[#F42F73]/20">
                      STATUS: {activeTaskNormStatus === 'in_progress' ? 'IN PROGRESS' : activeTask.status.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-400">
                      {activeTask.bookingNumber || activeTask.requestId || activeTask.id}
                    </span>
                  </div>

                  {/* Flow Progress Steps: PENDING -> ACCEPTED -> IN PROGRESS -> COMPLETED */}
                  <div className="hidden sm:flex items-center justify-between text-[11px] font-bold pt-2 px-1 text-gray-400">
                    <div
                      className={
                        ['accepted', 'on_the_way', 'arrived', 'in_progress', 'completed'].includes(
                          activeTaskNormStatus
                        )
                          ? 'text-emerald-600'
                          : ''
                      }
                    >
                      1. ACCEPTED
                    </div>
                    <span>&rarr;</span>
                    <div
                      className={
                        ['in_progress', 'on_the_way', 'arrived', 'completed'].includes(activeTaskNormStatus)
                          ? 'text-emerald-600'
                          : ''
                      }
                    >
                      2. ASSISTANCE IN PROGRESS (LIVE GPS)
                    </div>
                    <span>&rarr;</span>
                    <div className={activeTaskNormStatus === 'completed' ? 'text-emerald-600' : ''}>
                      3. COMPLETED
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-[#14213D] pt-1">
                    {activeTask.serviceName}
                  </h3>
                </div>

                {/* Primary Action Controls for Booking Status Lifecycle */}
                <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
                      {activeTaskNormStatus === 'accepted'
                        ? 'Step 1: Start Assistance & Live Tracking'
                        : 'Step 2: Assistance in Progress'}
                    </span>
                    {isLiveTrackingActive && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Broadcasting Live GPS
                      </span>
                    )}
                  </div>

                  {/* Action 1: When status === 'accepted' -> Start Assistance (sets status = 'in_progress' & starts live GPS) */}
                  {activeTaskNormStatus === 'accepted' && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => handleStartAssistance(activeTask.id)}
                        className="flex-1 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all min-h-[54px] cursor-pointer"
                      >
                        <Navigation className="w-5 h-5" />
                        <span>START ASSISTANCE (BEGIN LIVE TRACKING)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowOtpModal(true)}
                        className="py-4 px-5 rounded-2xl bg-white hover:bg-gray-50 text-[#14213D] border border-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[54px] cursor-pointer"
                      >
                        <Key className="w-4 h-4 text-[#F42F73]" />
                        <span>Verify Start OTP</span>
                      </button>
                    </div>
                  )}

                  {/* Action 2: When status === 'in_progress' (or on_the_way / arrived) -> Complete Request */}
                  {isAssistanceInProgress && (
                    <button
                      type="button"
                      onClick={() => handleCompleteTask(activeTask.id)}
                      className="w-full py-4 px-6 rounded-2xl bg-[#14213D] hover:bg-[#1E293B] active:bg-black text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all min-h-[54px] cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>COMPLETE REQUEST</span>
                    </button>
                  )}
                </div>

                {/* Customer Details Box with Pickup, Destination, Instructions & Call Button */}
                <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Assigned Request Details
                      </div>
                      <div className="text-base font-extrabold text-[#14213D] mt-0.5">
                        {activeTask.customerName}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        Mobile: +91 {activeTask.customerPhone} • Scheduled: {activeTask.scheduledDate} at{' '}
                        {activeTask.startTime}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-gray-200/80 flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[#14213D] block">Pickup Location:</span>
                          <span className="text-gray-600">
                            {activeTask.pickupLocation?.address || activeTask.location?.address}
                          </span>
                        </div>
                      </div>

                      {activeTask.destinationLocation?.address && (
                        <div className="bg-white p-2.5 rounded-xl border border-gray-200/80 flex items-start gap-2">
                          <Flag className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[#14213D] block">Destination:</span>
                            <span className="text-gray-600">{activeTask.destinationLocation.address}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {(activeTask.instructions || activeTask.description) && (
                      <div className="text-xs text-[#F42F73] font-semibold bg-[#FFF0F5] p-2.5 rounded-xl border border-[#F42F73]/20 flex items-start gap-2">
                        <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          Customer Instructions: "{activeTask.instructions || activeTask.description}"
                        </span>
                      </div>
                    )}
                  </div>

                  {activeTask.customerPhone && (
                    <a
                      href={`tel:${activeTask.customerPhone}`}
                      className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#14213D] hover:bg-[#1E293B] active:bg-black text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[48px] shadow-sm shrink-0"
                    >
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span>CALL CUSTOMER</span>
                    </a>
                  )}
                </div>

                {/* Real Google Map & Google Routes Navigation */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#F42F73]/10 text-[#F42F73] flex items-center justify-center shrink-0">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Real-Time Google Map & Route Navigation
                        </div>
                        <h4 className="text-sm font-bold text-[#14213D]">
                          {activeTask.location?.address} ({activeTask.location?.area || 'Mumbai'})
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => calculateRouteToCustomer()}
                        disabled={isCalculatingRoute}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#14213D] rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-[36px]"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 text-[#F42F73] ${isCalculatingRoute ? 'animate-spin' : ''}`}
                        />
                        <span>Recalculate</span>
                      </button>

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${
                          activeTask.location?.latitude || activeTask.location?.lat || 19.0596
                        },${
                          activeTask.location?.longitude || activeTask.location?.lng || 72.8295
                        }&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[#14213D] hover:bg-[#1E293B] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-[36px]"
                      >
                        <span>START NAVIGATION</span>
                        <ExternalLink className="w-3 h-3 text-[#F42F73]" />
                      </a>
                    </div>
                  </div>

                  {(routeEstimate || activeTask.estimatedDistance) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#FFF0F5] p-3 rounded-xl border border-[#F42F73]/20">
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Route Distance</div>
                        <div className="text-lg font-black text-[#14213D]">
                          {routeEstimate?.distanceText || activeTask.estimatedDistance}
                        </div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Est. Travel Time</div>
                        <div className="text-lg font-black text-[#14213D]">
                          {routeEstimate?.durationText || activeTask.estimatedDuration || '12 mins'}
                        </div>
                      </div>
                    </div>
                  )}

                  {routeError && (
                    <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                      {routeError}
                    </div>
                  )}

                  {/* Interactive Real Google Map */}
                  <AssistantTaskMap
                    assistantLocation={
                      assistantGpsCoords
                        ? {
                            lat: assistantGpsCoords.lat,
                            lng: assistantGpsCoords.lng,
                            address: 'Your Live GPS Position',
                            area: activeTask.location?.area || 'Mumbai'
                          }
                        : null
                    }
                    customerLocation={{
                      lat: activeTask.location?.latitude || activeTask.location?.lat || 19.0596,
                      lng: activeTask.location?.longitude || activeTask.location?.lng || 72.8295,
                      address: activeTask.location?.address || 'Pickup Location',
                      area: activeTask.location?.area || 'Mumbai',
                      landmark: activeTask.location?.landmark
                    }}
                    destinationLocation={
                      activeTask.destinationLocation?.address
                        ? {
                            lat: activeTask.destinationLocation.lat || 19.055,
                            lng: activeTask.destinationLocation.lng || 72.831,
                            address: activeTask.destinationLocation.address,
                            area: activeTask.destinationLocation.area || 'Mumbai'
                          }
                        : null
                    }
                    customerName={activeTask.customerName}
                    assistantName={staffUser?.name || assistantProfile?.name || 'Assistant'}
                    serviceName={activeTask.serviceName}
                    bookingNumber={activeTask.bookingNumber || activeTask.requestId}
                    bookingStatus={activeTask.status}
                    height="280px"
                    externalRouteInfo={
                      routeEstimate
                        ? {
                            distanceText: routeEstimate.distanceText,
                            durationText: routeEstimate.durationText,
                            isFallback: routeEstimate.isFallback
                          }
                        : null
                    }
                    assistantCoordinates={assistantGpsCoords}
                    focusTrigger={mapFocusTrigger}
                    onFocusMap={() => setMapFocusTrigger(Date.now())}
                  />
                </div>
              </div>
            ) : null}

            {/* Nearby Assistance Requests Feed (Available to accept in real time) */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#14213D]">
                    New Customer Assistance Requests
                  </h3>
                  <p className="text-xs text-gray-500">
                    Real-time pending requests from Firebase — no page refresh needed
                  </p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-full">
                  {incomingRequests.length} Pending
                </span>
              </div>

              {incomingRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 space-y-1">
                  <div>No pending customer requests waiting in the queue right now.</div>
                  <div>New bookings created in the Customer Portal will appear here automatically in real time.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 sm:p-5 rounded-3xl border border-gray-200 hover:border-[#F42F73] transition-all bg-gray-50/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 font-mono">
                            {req.bookingNumber || req.requestId || req.id}
                          </span>
                          <h4 className="font-bold text-sm sm:text-base text-[#14213D] mt-0.5">
                            {req.serviceName}
                          </h4>
                          <div className="text-xs text-gray-600 mt-0.5">
                            Customer: <strong className="text-[#14213D]">{req.customerName}</strong>
                            {req.customerPhone ? ` (+91 ${req.customerPhone})` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-black text-emerald-600">₹{req.totalAmount}</div>
                          <div className="text-[10px] text-gray-400">
                            {req.totalHours || req.bookedHours || 2} hrs
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1.5 bg-white p-3 rounded-2xl border border-gray-200/70">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Pickup:</strong> {req.location?.address} ({req.location?.area || 'Mumbai'})
                          </span>
                        </div>
                        {req.destinationLocation?.address && (
                          <div className="flex items-start gap-1.5">
                            <Flag className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>Destination:</strong> {req.destinationLocation.address}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>
                            <strong>Date & Time:</strong> {req.scheduledDate} at {req.startTime}
                          </span>
                        </div>
                        {(req.instructions || req.description) && (
                          <div className="flex items-start gap-1.5 pt-1 border-t border-gray-100">
                            <FileText className="w-3.5 h-3.5 text-[#F42F73] shrink-0 mt-0.5" />
                            <span>
                              <strong>Request Details:</strong> {req.instructions || req.description}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleRejectOrder(req.id)}
                          disabled={isAcceptingOrder}
                          className="py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black transition-colors flex items-center justify-center gap-1.5 min-h-[46px] cursor-pointer"
                        >
                          <XCircle className="w-4 h-4 text-gray-500" />
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAcceptOrder(req.id)}
                          disabled={isAcceptingOrder}
                          className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-sm min-h-[46px] disabled:opacity-75 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Accept Request</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Start OTP Modal */}
      {showOtpModal && activeTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#14213D]">Enter Customer Start OTP</h3>
              <p className="text-xs text-gray-500 mt-1">
                Ask <strong>{activeTask.customerName}</strong> for the 4-digit code shown on their DIBLO screen.
              </p>
              <div className="text-[11px] text-[#F42F73] font-bold mt-1 bg-[#FFF0F5] py-1 rounded">
                (Customer OTP: {activeTask.startOtp || '4821'})
              </div>
            </div>

            <input
              type="text"
              maxLength={4}
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value)}
              placeholder="4-digit OTP"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-center text-2xl font-mono font-bold tracking-widest text-[#14213D] focus:outline-none focus:border-[#F42F73]"
            />

            {otpError && <div className="text-xs text-red-500 font-semibold">{otpError}</div>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleVerifyOtpSubmit}
                disabled={isVerifying || enteredOtp.length < 4}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all min-h-[48px] disabled:opacity-50"
              >
                {isVerifying ? 'Verifying...' : 'Verify & Start'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpError('');
                }}
                className="px-5 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold min-h-[48px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
