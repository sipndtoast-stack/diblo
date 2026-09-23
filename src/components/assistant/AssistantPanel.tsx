import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu,
  X,
  ShieldCheck,
  Power,
  MapPin,
  Clock,
  CheckCircle2,
  DollarSign,
  Star,
  Navigation,
  Key,
  Phone,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  LogOut,
  Car,
  RefreshCw,
  Loader2,
  ExternalLink,
  Compass,
  Sparkles,
  Zap,
  Package,
  CreditCard,
  Bell,
  User,
  FileText,
  HelpCircle,
  XCircle,
  Radio
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
  const { assistantProfile, updateAssistantProfile, logoutStaff } = useAuth();
  const {
    bookings,
    refreshBookings,
    verifyStartOtp,
    completeBooking,
    notifications,
    markNotificationRead
  } = useBooking();

  const assistantId = assistantProfile?.id || 'asst-1';

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
  const [routeEstimate, setRouteEstimate] = useState<EstimatedRouteDetails | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mapFocusTrigger, setMapFocusTrigger] = useState<number>(0);

  // Identify current active task assigned to this assistant
  const activeTask = bookings.find(
    (b) =>
      b.assistantId === assistantId &&
      b.status !== 'COMPLETED' &&
      b.status !== 'CANCELLED'
  );

  const activeTaskHourlyRate = activeTask?.hourlyRate || 149;
  const activeTaskEstimatedDuration = activeTask?.totalHours || activeTask?.bookedHours || 2;
  const activeTaskEstimatedEarnings =
    activeTask?.totalAmount || activeTaskHourlyRate * activeTaskEstimatedDuration;

  // Available new incoming requests in Mumbai West queue
  const incomingRequests = bookings.filter(
    (b) =>
      !rejectedOrderIds.has(b.id) &&
      (b.status === 'SEARCHING' || (b.status === 'ASSIGNED' && b.assistantId === assistantId))
  );

  // Fetch / update live GPS location
  const refreshGpsLocation = useCallback(async (): Promise<{ lat: number; lng: number }> => {
    setIsRefreshingGps(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 7000,
            maximumAge: 30000
          });
        });
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setAssistantGpsCoords(coords);
        setGpsPermissionStatus('granted');
        return coords;
      }
    } catch {
      setGpsPermissionStatus('denied');
    } finally {
      setIsRefreshingGps(false);
    }
    const fallback = {
      lat: assistantProfile?.currentLocation?.lat || 19.0596,
      lng: assistantProfile?.currentLocation?.lng || 72.8295
    };
    setAssistantGpsCoords(fallback);
    return fallback;
  }, [assistantProfile?.currentLocation?.lat, assistantProfile?.currentLocation?.lng]);

  // Initial location and notification permission setup
  useEffect(() => {
    refreshGpsLocation();
    requestNotificationPermission().catch(() => {});
  }, [refreshGpsLocation]);

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

  // Auto-detect New Order for Popup & Sound Alert
  useEffect(() => {
    // Only trigger new order alert if assistant is ONLINE and has no active task in progress
    if (!isOnline || activeTask) {
      if (popupOrder) {
        stopAlert();
        setPopupOrder(null);
      }
      return;
    }

    // Find the first unassigned or assigned new order not rejected
    const newCandidate = incomingRequests.find((b) => !rejectedOrderIds.has(b.id));

    if (newCandidate) {
      if (!popupOrder || popupOrder.id !== newCandidate.id) {
        setPopupOrder(newCandidate);
        // Trigger alert service (chime sound, vibration, PWA notification)
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
        let originLat = assistantGpsCoords?.lat || assistantProfile?.currentLocation?.lat || 19.0596;
        let originLng = assistantGpsCoords?.lng || assistantProfile?.currentLocation?.lng || 72.8295;

        // Try getting fresh coordinates if not yet acquired
        if (!assistantGpsCoords) {
          const fresh = await refreshGpsLocation();
          originLat = fresh.lat;
          originLng = fresh.lng;
        }

        const destLat =
          targetLocation?.lat ??
          activeTask?.location?.latitude ??
          activeTask?.location?.lat;
        const destLng =
          targetLocation?.lng ??
          activeTask?.location?.longitude ??
          activeTask?.location?.lng;

        if (
          typeof destLat !== 'number' ||
          typeof destLng !== 'number' ||
          isNaN(destLat) ||
          isNaN(destLng)
        ) {
          setRouteError('Customer service coordinates are not available.');
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
      activeTask?.location?.latitude,
      activeTask?.location?.lat,
      activeTask?.location?.longitude,
      activeTask?.location?.lng,
      refreshGpsLocation
    ]
  );

  // Automatically calculate route whenever active task appears
  useEffect(() => {
    if (activeTask) {
      const destLat = activeTask.location?.latitude || activeTask.location?.lat;
      const destLng = activeTask.location?.longitude || activeTask.location?.lng;
      if (typeof destLat === 'number' && typeof destLng === 'number') {
        if (
          !routeEstimate ||
          routeEstimate.destLat !== destLat ||
          routeEstimate.destLng !== destLng
        ) {
          calculateRouteToCustomer({ lat: destLat, lng: destLng });
        }
      }
    } else {
      setRouteEstimate(null);
    }
  }, [activeTask?.id, activeTask?.status, calculateRouteToCustomer]);

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

  // Handle Order Accept (from Popup or List)
  const handleAcceptOrder = async (orderId: string) => {
    setIsAcceptingOrder(true);
    stopAlert();
    try {
      const targetBooking = bookings.find((b) => b.id === orderId);
      await api.acceptBooking(orderId, assistantId);
      await refreshBookings();

      setPopupOrder(null);
      setCurrentSection('HOME'); // Take assistant directly to active order workflow

      // Trigger route calculation
      const targetLat = targetBooking?.location?.latitude || targetBooking?.location?.lat;
      const targetLng = targetBooking?.location?.longitude || targetBooking?.location?.lng;
      if (typeof targetLat === 'number' && typeof targetLng === 'number') {
        await calculateRouteToCustomer({ lat: targetLat, lng: targetLng });
      } else {
        await calculateRouteToCustomer();
      }
    } catch (e) {
      console.error('Failed to accept order:', e);
    } finally {
      setIsAcceptingOrder(false);
    }
  };

  // Handle Order Reject
  const handleRejectOrder = async (orderId: string) => {
    stopAlert();
    setPopupOrder(null);
    setRejectedOrderIds((prev) => new Set([...prev, orderId]));
    try {
      await api.rejectBooking(orderId, assistantId);
      await refreshBookings();
    } catch (e) {
      console.debug('Reject booking sync error:', e);
    }
  };

  // Step 1 Action: Go to Customer / Start Route
  const handleStartRoute = async (orderId: string) => {
    try {
      await api.startRouteBooking(orderId);
      await refreshBookings();
      // Recalculate route as assistant starts travelling
      calculateRouteToCustomer();
    } catch (e) {
      console.error('Failed to start route:', e);
    }
  };

  // Step 2 Action: Mark Arrived
  const handleArrived = async (orderId: string) => {
    try {
      await api.arriveBooking(orderId);
      await refreshBookings();
      setShowOtpModal(true);
    } catch (e) {
      console.error('Failed to mark arrival:', e);
    }
  };

  // Step 3 Action: Verify Customer Start OTP
  const handleVerifyOtpSubmit = async () => {
    if (!activeTask || !enteredOtp) return;
    setIsVerifying(true);
    setOtpError('');
    try {
      const success = await verifyStartOtp(activeTask.id, enteredOtp);
      if (success) {
        setShowOtpModal(false);
        setEnteredOtp('');
        await refreshBookings();
      } else {
        setOtpError('Invalid OTP. Please ask customer for the 4-digit code.');
      }
    } catch (e) {
      setOtpError('Verification failed. Please check network.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 4 Action: Complete Task
  const handleCompleteTask = async (orderId: string) => {
    try {
      await completeBooking(orderId);
      await refreshBookings();
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

      {/* New Order Popup Alert Modal (Primary Feature) */}
      <NewOrderModal
        order={popupOrder}
        onAccept={handleAcceptOrder}
        onReject={handleRejectOrder}
        isAccepting={isAcceptingOrder}
        distanceText={routeEstimate?.distanceText || '1.8 km'}
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
                <span id="assistant-drawer-unread-badge" className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
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
                  <span id="assistant-header-name" className="font-extrabold text-sm sm:text-base text-[#14213D] leading-tight">
                    {assistantProfile?.name || 'Rajesh Sharma'}
                  </span>
                  <span id="assistant-header-verified-pill" className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded flex items-center gap-0.5">
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
                <div>{isOnline ? 'ONLINE' : 'OFFLINE'}</div>
                <div className="text-[9px] font-medium opacity-90 hidden sm:block">
                  {isOnline ? 'Receiving Orders' : 'Orders Paused'}
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
            bookings={bookings}
            assistantId={assistantId}
            onAcceptOrder={handleAcceptOrder}
            onSelectActiveOrder={(order) => {
              setCurrentSection('HOME');
            }}
            isAcceptingId={isAcceptingOrder ? popupOrder?.id : null}
          />
        )}

        {currentSection === 'NEW_ORDERS' && (
          <AssistantOrdersView
            mode="NEW_ORDERS"
            bookings={bookings}
            assistantId={assistantId}
            onAcceptOrder={handleAcceptOrder}
            onSelectActiveOrder={(order) => {
              setCurrentSection('HOME');
            }}
            isAcceptingId={isAcceptingOrder ? popupOrder?.id : null}
          />
        )}

        {currentSection === 'EARNINGS' && (
          <AssistantEarningsView
            mode="EARNINGS"
            assistantProfile={assistantProfile}
            bookings={bookings}
          />
        )}

        {currentSection === 'PAYMENTS' && (
          <AssistantEarningsView
            mode="PAYMENTS"
            assistantProfile={assistantProfile}
            bookings={bookings}
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
            address={activeTask?.location?.address || assistantProfile?.currentLocation?.address || 'Carter Road, Bandra West'}
            area={activeTask?.location?.area || assistantProfile?.currentLocation?.area || 'Bandra West, Mumbai'}
          />
        )}

        {currentSection === 'MY_PROFILE' && (
          <AssistantProfileView
            mode="MY_PROFILE"
            assistantProfile={assistantProfile}
          />
        )}

        {currentSection === 'DOCUMENTS' && (
          <AssistantProfileView
            mode="DOCUMENTS"
            assistantProfile={assistantProfile}
          />
        )}

        {currentSection === 'HELP_SUPPORT' && (
          <AssistantSupportView />
        )}

        {/* HOME SECTION (DEFAULT) */}
        {currentSection === 'HOME' && (
          <div className="space-y-6">
            {/* Status / Duty Indicator Banner */}
            <div
              className={`p-4 rounded-3xl border flex items-center justify-between gap-3 ${
                isOnline
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-gray-100/80 border-gray-200 text-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    isOnline ? 'bg-emerald-500 text-white' : 'bg-gray-400 text-white'
                  }`}
                >
                  <Radio className={`w-5 h-5 ${isOnline ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <div className="font-black text-sm">
                    {isOnline ? 'ONLINE • You can receive orders' : 'OFFLINE • New orders are paused'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {activeTask
                      ? 'Active order in progress below. Complete current assignment safely.'
                      : isOnline
                      ? 'Radar active in Bandra & Mumbai West. New orders will alert automatically.'
                      : 'Switch to ONLINE whenever you are ready to accept customer bookings.'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleOnline}
                className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-[#14213D] shadow-2xs hover:bg-gray-50"
              >
                Change Status
              </button>
            </div>

            {/* Quick Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-1">
                <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Today's Earnings</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600">
                  ₹{assistantProfile?.earnings?.today || 1490}
                </div>
                <div className="text-[10px] text-gray-500">Fixed rate hourly payout</div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-1">
                <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Completed Tasks</div>
                <div className="text-xl sm:text-2xl font-black text-[#14213D]">
                  {assistantProfile?.completedTasksCount || 342}
                </div>
                <div className="text-[10px] text-gray-500">100% On-Time Record</div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-1">
                <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Customer Rating</div>
                <div className="text-xl sm:text-2xl font-black text-amber-500 flex items-center gap-1">
                  <span>{assistantProfile?.rating || 4.9}</span>
                  <Star className="w-4 h-4 fill-amber-500" />
                </div>
                <div className="text-[10px] text-gray-500">Top Rated Assistant</div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-1">
                <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Weekly Payout</div>
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
                      CURRENT STATUS: {activeTask.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-400">
                      {activeTask.bookingNumber || activeTask.id}
                    </span>
                  </div>

                  {/* Flow Progress Steps: NEW -> ACCEPTED -> ON THE WAY -> ARRIVED -> SERVICE STARTED -> COMPLETED */}
                  <div className="hidden sm:flex items-center justify-between text-[11px] font-bold pt-2 px-1 text-gray-400">
                    <div className={['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(activeTask.status) ? 'text-emerald-600' : ''}>
                      1. ACCEPTED
                    </div>
                    <span>&rarr;</span>
                    <div className={['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(activeTask.status) ? 'text-emerald-600' : ''}>
                      2. ON THE WAY
                    </div>
                    <span>&rarr;</span>
                    <div className={['ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(activeTask.status) ? 'text-emerald-600' : ''}>
                      3. ARRIVED
                    </div>
                    <span>&rarr;</span>
                    <div className={['IN_PROGRESS', 'COMPLETED'].includes(activeTask.status) ? 'text-emerald-600' : ''}>
                      4. SERVICE STARTED
                    </div>
                    <span>&rarr;</span>
                    <div className={activeTask.status === 'COMPLETED' ? 'text-emerald-600' : ''}>
                      5. COMPLETED
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-[#14213D] pt-1">
                    {activeTask.serviceName}
                  </h3>
                </div>

                {/* Primary Single Next Action Banner (Clean & Obvious) */}
                <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-5 space-y-3 shadow-sm">
                  <div className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
                    Primary Next Action Step
                  </div>

                  {/* Action 1: If ACCEPTED -> GO TO CUSTOMER */}
                  {activeTask.status === 'ACCEPTED' && (
                    <button
                      type="button"
                      onClick={() => handleStartRoute(activeTask.id)}
                      className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all min-h-[56px]"
                    >
                      <Navigation className="w-5 h-5" />
                      <span>GO TO CUSTOMER</span>
                    </button>
                  )}

                  {/* Action 2: If ON_THE_WAY -> I HAVE ARRIVED */}
                  {activeTask.status === 'ON_THE_WAY' && (
                    <button
                      type="button"
                      onClick={() => handleArrived(activeTask.id)}
                      className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-all min-h-[56px]"
                    >
                      <MapPin className="w-5 h-5" />
                      <span>I HAVE ARRIVED</span>
                    </button>
                  )}

                  {/* Action 3: If ARRIVED -> START SERVICE */}
                  {activeTask.status === 'ARRIVED' && (
                    <button
                      type="button"
                      onClick={() => setShowOtpModal(true)}
                      className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all min-h-[56px]"
                    >
                      <Key className="w-5 h-5" />
                      <span>START SERVICE (ENTER OTP)</span>
                    </button>
                  )}

                  {/* Action 4: If IN_PROGRESS -> COMPLETE ORDER */}
                  {activeTask.status === 'IN_PROGRESS' && (
                    <button
                      type="button"
                      onClick={() => handleCompleteTask(activeTask.id)}
                      className="w-full py-4 px-6 rounded-2xl bg-[#14213D] hover:bg-[#1E293B] active:bg-black text-white font-black text-base flex items-center justify-center gap-2 shadow-lg transition-all min-h-[56px]"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>COMPLETE ORDER</span>
                    </button>
                  )}
                </div>

                {/* Customer Details Box with Large Call Button */}
                <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer Details</div>
                    <div className="text-base font-extrabold text-[#14213D] mt-0.5">
                      {activeTask.customerName}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Contact: +91 {activeTask.customerPhone}
                    </div>
                    {activeTask.instructions && (
                      <div className="text-xs text-[#F42F73] font-semibold mt-2 bg-[#FFF0F5] p-2.5 rounded-xl border border-[#F42F73]/20">
                        Customer Note: "{activeTask.instructions}"
                      </div>
                    )}
                  </div>

                  <a
                    href={`tel:${activeTask.customerPhone}`}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#14213D] hover:bg-[#1E293B] active:bg-black text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[48px] shadow-sm"
                  >
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>CALL CUSTOMER</span>
                  </a>
                </div>

                {/* Service Location & Google Routes Estimate */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#F42F73]/10 text-[#F42F73] flex items-center justify-center shrink-0">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Google Routes Distance & Time
                        </div>
                        <h4 className="text-sm font-bold text-[#14213D]">
                          {activeTask.location.address} ({activeTask.location.area || 'Mumbai'})
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
                        <RefreshCw className={`w-3.5 h-3.5 text-[#F42F73] ${isCalculatingRoute ? 'animate-spin' : ''}`} />
                        <span>Recalculate</span>
                      </button>

                      {routeEstimate && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${routeEstimate.originLat},${routeEstimate.originLng}&destination=${routeEstimate.destLat},${routeEstimate.destLng}&travelmode=driving`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#14213D] hover:bg-[#1E293B] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-[36px]"
                        >
                          <span>NAVIGATE</span>
                          <ExternalLink className="w-3 h-3 text-[#F42F73]" />
                        </a>
                      )}
                    </div>
                  </div>

                  {routeEstimate && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#FFF0F5] p-3 rounded-xl border border-[#F42F73]/20">
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Driving Distance</div>
                        <div className="text-lg font-black text-[#14213D]">{routeEstimate.distanceText}</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Est. Travel Time</div>
                        <div className="text-lg font-black text-[#14213D]">{routeEstimate.durationText}</div>
                      </div>
                    </div>
                  )}

                  {/* Interactive Map */}
                  <AssistantTaskMap
                    customerLocation={{
                      lat: activeTask.location.latitude || activeTask.location.lat || 19.0596,
                      lng: activeTask.location.longitude || activeTask.location.lng || 72.8295,
                      address: activeTask.location.address,
                      area: activeTask.location.area,
                      landmark: activeTask.location.landmark
                    }}
                    serviceName={activeTask.serviceName}
                    bookingNumber={activeTask.bookingNumber}
                    height="260px"
                    externalRouteInfo={
                      routeEstimate
                        ? {
                            distanceText: routeEstimate.distanceText,
                            durationText: routeEstimate.durationText,
                            isFallback: routeEstimate.isFallback
                          }
                        : null
                    }
                    assistantCoordinates={
                      routeEstimate
                        ? { lat: routeEstimate.originLat, lng: routeEstimate.originLng }
                        : assistantGpsCoords
                    }
                    focusTrigger={mapFocusTrigger}
                    onFocusMap={() => setMapFocusTrigger(Date.now())}
                  />
                </div>
              </div>
            ) : null}

            {/* Nearby Assistance Requests Feed (Available to accept) */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#14213D]">Nearby Assistance Requests</h3>
                  <p className="text-xs text-gray-500">Tap ACCEPT to pick up the booking and report to location</p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-full">
                  {incomingRequests.length} Available
                </span>
              </div>

              {incomingRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 space-y-1">
                  <div>No new requests waiting in your queue right now.</div>
                  <div>Stay ONLINE to receive automated dispatch alerts!</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 sm:p-5 rounded-3xl border border-gray-200 hover:border-[#F42F73] transition-all bg-gray-50/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 font-mono">{req.bookingNumber}</span>
                          <h4 className="font-bold text-sm text-[#14213D] mt-0.5">{req.serviceName}</h4>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-black text-emerald-600">₹{req.totalAmount}</div>
                          <div className="text-[10px] text-gray-400">{req.totalHours} hrs</div>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
                          <span className="truncate">{req.location.address} ({req.location.area})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{req.scheduledDate} at {req.startTime}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAcceptOrder(req.id)}
                        disabled={isAcceptingOrder}
                        className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-sm min-h-[46px] disabled:opacity-75"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ACCEPT ORDER</span>
                      </button>
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

            {otpError && (
              <div className="text-xs text-red-500 font-semibold">{otpError}</div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleVerifyOtpSubmit}
                disabled={isVerifying || enteredOtp.length < 4}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all min-h-[48px] disabled:opacity-50"
              >
                {isVerifying ? 'Verifying...' : 'Verify & Start Task'}
              </button>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="px-4 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-bold text-xs min-h-[48px]"
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
