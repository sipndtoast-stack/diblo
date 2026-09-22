import React, { useState, useEffect, useCallback } from 'react';
import {
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
  Award,
  TrendingUp,
  UserCheck,
  Lock,
  ArrowRight,
  Sparkles,
  LogOut,
  Car,
  RefreshCw,
  Loader2,
  ExternalLink,
  Compass
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { api } from '../../lib/api';
import { MapView } from '../common/MapView';
import { AssistantTaskMap } from '../maps/AssistantTaskMap';

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
  const { assistantProfile, updateAssistantProfile, logoutStaff, staffUser } = useAuth();
  const { bookings, refreshBookings, verifyStartOtp, completeBooking } = useBooking();

  const [isOnline, setIsOnline] = useState<boolean>(assistantProfile?.isOnline ?? true);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TASKS' | 'EARNINGS' | 'PROFILE'>('DASHBOARD');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Google Routes API estimate state
  const [routeEstimate, setRouteEstimate] = useState<EstimatedRouteDetails | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [assistantGpsCoords, setAssistantGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapFocusTrigger, setMapFocusTrigger] = useState<number>(0);

  // Active assistant's current task
  const activeTask = bookings.find(
    (b) =>
      b.assistantId === (assistantProfile?.id || 'asst-1') &&
      b.status !== 'COMPLETED' &&
      b.status !== 'CANCELLED'
  );

  const activeTaskHourlyRate = activeTask?.hourlyRate || 149;
  const activeTaskEstimatedDuration = activeTask?.totalHours || activeTask?.bookedHours || 1;
  const activeTaskEstimatedEarnings = activeTaskHourlyRate * activeTaskEstimatedDuration;

  // Unassigned bookings in assistant's operating area waiting for pickup
  const incomingRequests = bookings.filter(
    (b) => b.status === 'SEARCHING' || (b.status === 'ASSIGNED' && b.assistantId === (assistantProfile?.id || 'asst-1'))
  );

  /**
   * Helper function that utilizes the Google Routes API to calculate and display
   * the estimated distance and travel time from the assistant's current location
   * to the customer's service location once a request is accepted.
   */
  const calculateRouteToCustomer = useCallback(
    async (targetLocation?: { lat: number; lng: number }): Promise<EstimatedRouteDetails | null> => {
      setIsCalculatingRoute(true);
      setRouteError(null);

      try {
        // 1. Determine assistant's current coordinates (via Geolocation or profile fallback)
        let originLat = assistantGpsCoords?.lat || assistantProfile?.currentLocation?.lat || 19.0596;
        let originLng = assistantGpsCoords?.lng || assistantProfile?.currentLocation?.lng || 72.8295;

        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 30000
              });
            });
            originLat = position.coords.latitude;
            originLng = position.coords.longitude;
            setAssistantGpsCoords({ lat: originLat, lng: originLng });
          } catch {
            // If GPS permission is denied or timed out, use assistant profile coordinate
          }
        }

        // 2. Determine destination coordinates from customer service location
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

        // 3. Call Google Routes API via secure proxy endpoint
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
      activeTask?.location?.lng
    ]
  );

  // Automatically calculate route once active task is present if not yet computed
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

  const handleToggleOnline = async () => {
    if (!assistantProfile) return;
    try {
      const res = await api.toggleAssistantOnline(assistantProfile.id);
      setIsOnline(res.isOnline);
      updateAssistantProfile({ isOnline: res.isOnline });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptTask = async (bookingId: string) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    await api.acceptBooking(bookingId, assistantProfile?.id || 'asst-1');
    await refreshBookings();

    // Automatically trigger Google Routes API to calculate and display estimated distance and travel time
    const targetLat = targetBooking?.location?.latitude || targetBooking?.location?.lat;
    const targetLng = targetBooking?.location?.longitude || targetBooking?.location?.lng;

    if (typeof targetLat === 'number' && typeof targetLng === 'number') {
      await calculateRouteToCustomer({ lat: targetLat, lng: targetLng });
    } else {
      await calculateRouteToCustomer();
    }
  };

  const handleStartRoute = async (bookingId: string) => {
    // In our backend flow, accept sets status to ACCEPTED / ON_THE_WAY
    await api.updateAssistantStatus(assistantProfile?.id || 'asst-1', { status: 'ON_THE_WAY' });
    await refreshBookings();
  };

  const handleArrived = async (bookingId: string) => {
    await api.arriveBooking(bookingId);
    await refreshBookings();
    setShowOtpModal(true);
  };

  const handleVerifyOtpSubmit = async () => {
    if (!activeTask || !enteredOtp) return;
    setIsVerifying(true);
    setOtpError('');
    try {
      const success = await verifyStartOtp(activeTask.id, enteredOtp);
      if (success) {
        setShowOtpModal(false);
        setEnteredOtp('');
      } else {
        setOtpError('Invalid OTP. Please ask customer for the 4-digit code.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCompleteTask = async (bookingId: string) => {
    await completeBooking(bookingId);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-[#14213D] pb-24 md:pb-16">
      {/* Top Assistant Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={
                assistantProfile?.photo ||
                'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80'
              }
              alt="Assistant"
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-[#14213D]">{assistantProfile?.name || 'Rajesh Sharma'}</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Police Verified</span>
                </span>
              </div>
              <div className="text-[11px] text-gray-500">
                Badge: DIBLO-MUM-7721 • Mumbai West
              </div>
            </div>
          </div>

          {/* Online / Offline Switch & Logout */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleOnline}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full font-bold text-xs transition-all shadow-sm ${
                isOnline
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </button>

            <button
              onClick={() => logoutStaff()}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-full text-xs font-bold transition-all shadow-xs"
              title="Log out of Staff Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-1">
            <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Today's Earnings</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600">₹{assistantProfile?.earnings?.today || 1490}</div>
            <div className="text-[10px] text-gray-500">Fixed rate ₹120/hr payout</div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-1">
            <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Completed Tasks</div>
            <div className="text-xl sm:text-2xl font-black text-[#14213D]">{assistantProfile?.completedTasksCount || 342}</div>
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
            <div className="text-xl sm:text-2xl font-black text-[#14213D]">₹{assistantProfile?.earnings?.week || 8450}</div>
            <div className="text-[10px] text-emerald-600 font-semibold">Auto-transfers every Monday</div>
          </div>
        </div>

        {/* ACTIVE TASK SECTION */}
        {activeTask ? (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-[#F42F73] shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <span className="bg-[#FFF0F5] text-[#F42F73] text-xs font-black px-2.5 py-1 rounded-full uppercase inline-block">
                  ACTIVE ASSISTANCE: {activeTask.status.replace('_', ' ')}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-[#14213D] mt-2">{activeTask.serviceName}</h3>
                
                {/* Service Location Information & Real-Time Distance / ETA Badges */}
                <div className="mt-2 space-y-2">
                  <div className="text-xs text-gray-600 flex items-start gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <MapPin className="w-4 h-4 text-[#F42F73] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#14213D]">Service Location: </span>
                      <span className="text-gray-700">{activeTask.location.address}</span>
                      {activeTask.location.area && (
                        <span className="text-gray-400 font-medium"> ({activeTask.location.area})</span>
                      )}
                    </div>
                  </div>

                  {/* Calculated Distance (km) & Estimated Travel Time (min) prominently placed right near location info */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {isCalculatingRoute ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                        <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                        <span>Calculating route from your location...</span>
                      </div>
                    ) : routeEstimate ? (
                      <>
                        {/* Distance Badge */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF0F5] border border-[#F42F73]/30 text-[#F42F73] shadow-2xs">
                          <Compass className="w-4 h-4 text-[#F42F73]" />
                          <span className="text-[11px] font-bold text-gray-500 uppercase">Distance:</span>
                          <span className="text-xs font-black text-[#14213D]">
                            {routeEstimate.distanceText}
                          </span>
                        </div>

                        {/* Travel Time Badge */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 shadow-2xs">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-[11px] font-bold text-gray-500 uppercase">Est. Travel Time:</span>
                          <span className="text-xs font-black text-[#14213D]">
                            {routeEstimate.durationText}
                          </span>
                        </div>

                        {/* Quick Refresh Icon */}
                        <button
                          type="button"
                          onClick={() => calculateRouteToCustomer()}
                          disabled={isCalculatingRoute}
                          title="Recalculate route from current GPS"
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => calculateRouteToCustomer()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all"
                      >
                        <Compass className="w-3.5 h-3.5 text-[#F42F73]" />
                        <span>Calculate distance & travel time</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 sm:p-4 text-left sm:text-right shadow-2xs shrink-0 min-w-[200px]">
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center sm:justify-end gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Estimated Task Earnings</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-0.5">
                  ₹{activeTaskEstimatedEarnings.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-gray-600 font-medium mt-1 flex items-center sm:justify-end gap-1.5">
                  <span className="font-semibold text-gray-700">₹{activeTaskHourlyRate}/hr</span>
                  <span className="text-gray-400">&times;</span>
                  <span>{activeTaskEstimatedDuration} {activeTaskEstimatedDuration === 1 ? 'hr' : 'hrs'} est. duration</span>
                </div>
              </div>
            </div>

            {/* Task Compensation & Duration Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hourly Rate</div>
                <div className="text-base sm:text-lg font-black text-[#14213D] mt-0.5">₹{activeTaskHourlyRate}/hr</div>
                <div className="text-[10px] text-gray-500">Base assistant compensation</div>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estimated Duration</div>
                <div className="text-base sm:text-lg font-black text-[#14213D] mt-0.5">
                  {activeTaskEstimatedDuration} {activeTaskEstimatedDuration === 1 ? 'Hour' : 'Hours'}
                </div>
                <div className="text-[10px] text-gray-500">Scheduled service duration</div>
              </div>

              <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200">
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Estimated Earnings</span>
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">
                  ₹{activeTaskEstimatedEarnings.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">
                  ₹{activeTaskHourlyRate} &times; {activeTaskEstimatedDuration} {activeTaskEstimatedDuration === 1 ? 'hr' : 'hrs'} calculated
                </div>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase">Customer Information</div>
                <div className="text-base font-bold text-[#14213D] mt-0.5">{activeTask.customerName}</div>
                <div className="text-xs text-gray-600">+91 {activeTask.customerPhone}</div>
                {activeTask.instructions && (
                  <div className="text-xs text-[#F42F73] font-semibold mt-1 bg-[#FFF0F5] p-2 rounded-xl border border-[#F42F73]/20">
                    Note: "{activeTask.instructions}"
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${activeTask.customerPhone}`}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#14213D] hover:bg-[#1E293B] text-white text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <Phone className="w-3.5 h-3.5 text-[#F42F73]" />
                  <span>Call Customer</span>
                </a>
              </div>
            </div>

            {/* Google Routes API Live Travel & Distance Estimate */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#F42F73]/10 text-[#F42F73] flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Google Routes API Live Estimate</span>
                      {routeEstimate && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                          REAL-TIME
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-[#14213D] leading-tight">
                      Estimated Distance & Transit Time to Customer
                    </h4>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Focus Map Button */}
                  <button
                    type="button"
                    onClick={() => setMapFocusTrigger(Date.now())}
                    className="px-3 py-1.5 bg-white hover:bg-gray-100 text-[#14213D] border border-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 min-h-[36px] transition-all self-start sm:self-auto active:scale-95 shadow-2xs"
                    title="Automatically adjust zoom and center map to show both assistant and customer"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#F42F73]" />
                    <span>Focus Map</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => calculateRouteToCustomer()}
                    disabled={isCalculatingRoute}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#14213D] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 min-h-[36px] transition-all self-start sm:self-auto active:scale-95 disabled:opacity-60"
                    title="Recalculate route using current GPS position"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#F42F73] ${isCalculatingRoute ? 'animate-spin' : ''}`} />
                    <span>{isCalculatingRoute ? 'Calculating...' : 'Recalculate Route'}</span>
                  </button>

                  {routeEstimate && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${routeEstimate.originLat},${routeEstimate.originLng}&destination=${routeEstimate.destLat},${routeEstimate.destLng}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#14213D] hover:bg-[#1E293B] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 min-h-[36px] transition-all self-start sm:self-auto"
                    >
                      <span>Navigate in Maps</span>
                      <ExternalLink className="w-3 h-3 text-[#F42F73]" />
                    </a>
                  )}
                </div>
              </div>

              {isCalculatingRoute ? (
                <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-gray-600">
                  <Loader2 className="w-4 h-4 text-[#F42F73] animate-spin" />
                  <span>Calculating driving distance and travel time from your location via Google Routes API...</span>
                </div>
              ) : routeEstimate ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Distance Card */}
                  <div className="bg-[#FFF0F5] p-3.5 rounded-xl border border-[#F42F73]/20 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F42F73] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[#F42F73] uppercase tracking-wider">
                        Estimated Driving Distance
                      </div>
                      <div className="text-xl font-black text-[#14213D] leading-tight">
                        {routeEstimate.distanceText}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Distance from current coordinates to service doorstep
                      </div>
                    </div>
                  </div>

                  {/* Travel Time Card */}
                  <div className="bg-[#EFF6FF] p-3.5 rounded-xl border border-[#3B82F6]/20 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#3B82F6] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider">
                        Estimated Travel Time
                      </div>
                      <div className="text-xl font-black text-[#14213D] leading-tight">
                        {routeEstimate.durationText}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Live traffic estimate &bull; Calculated at {routeEstimate.calculatedAt}
                      </div>
                    </div>
                  </div>
                </div>
              ) : routeError ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{routeError}</span>
                  </div>
                  <button
                    onClick={() => calculateRouteToCustomer()}
                    className="text-xs font-bold text-[#F42F73] hover:underline shrink-0"
                  >
                    Retry Calculation
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 flex items-center justify-between">
                  <span>Press "Recalculate Route" to get live travel time from your current GPS position.</span>
                  <button
                    onClick={() => calculateRouteToCustomer()}
                    className="text-xs font-bold text-[#F42F73] hover:underline ml-2 shrink-0"
                  >
                    Calculate Now
                  </button>
                </div>
              )}
            </div>

            {/* Google Maps Customer Location & Routes API Navigation */}
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
              assistantCoordinates={
                routeEstimate
                  ? { lat: routeEstimate.originLat, lng: routeEstimate.originLng }
                  : assistantGpsCoords || (assistantProfile?.currentLocation ? {
                      lat: assistantProfile.currentLocation.lat,
                      lng: assistantProfile.currentLocation.lng
                    } : null)
              }
              focusTrigger={mapFocusTrigger}
              onFocusMap={() => setMapFocusTrigger(Date.now())}
            />

            {/* Assistant Workflow Action Step Buttons */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Action Step</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Step 1: On the way */}
                {(activeTask.status === 'ASSIGNED' || activeTask.status === 'ACCEPTED') && (
                  <button
                    onClick={() => handleStartRoute(activeTask.id)}
                    className="py-4 px-6 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#F42F73]/20 transition-all min-h-[48px]"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Start Navigation to Customer</span>
                  </button>
                )}

                {/* Step 2: Mark Arrived */}
                {activeTask.status === 'ON_THE_WAY' && (
                  <button
                    onClick={() => handleArrived(activeTask.id)}
                    className="py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all min-h-[48px]"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>I Have Arrived at Location</span>
                  </button>
                )}

                {/* Step 3: Enter Start OTP */}
                {activeTask.status === 'ARRIVED' && (
                  <button
                    onClick={() => setShowOtpModal(true)}
                    className="py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all min-h-[48px]"
                  >
                    <Key className="w-4 h-4" />
                    <span>Enter Customer Start OTP</span>
                  </button>
                )}

                {/* Step 4: In Progress Timer & Complete */}
                {activeTask.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleCompleteTask(activeTask.id)}
                    className="py-4 px-6 rounded-2xl bg-[#14213D] hover:bg-[#1E293B] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all min-h-[48px]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Complete Assistance Task</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Incoming Assistance Tasks Queue (Available in Mumbai) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#14213D]">Nearby Assistance Requests</h3>
              <p className="text-xs text-gray-500">Tap accept to pick up the booking and report to customer location</p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {incomingRequests.length} Available
            </span>
          </div>

          {incomingRequests.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400 space-y-1">
              <div>No new requests in your immediate vicinity right now.</div>
              <div>Stay online to receive automated dispatch notifications!</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 sm:p-5 rounded-2xl border border-gray-200 hover:border-[#F42F73] transition-all bg-gray-50/50 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 font-mono">{req.bookingNumber}</span>
                      <h4 className="font-bold text-sm text-[#14213D] mt-0.5">{req.serviceName}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-[#F42F73]">₹{req.totalAmount}</div>
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
                    onClick={() => handleAcceptTask(req.id)}
                    disabled={isCalculatingRoute}
                    className="w-full py-2.5 rounded-xl bg-[#F42F73] hover:bg-[#D81B60] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs min-h-[44px] disabled:opacity-80"
                  >
                    {isCalculatingRoute ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Accepting & Calculating Route...</span>
                      </>
                    ) : (
                      <>
                        <span>Accept Task Booking</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assistant Completed Task History */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#14213D]">Recent Completed Tasks</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bookings
              .filter((b) => b.status === 'COMPLETED')
              .slice(0, 4)
              .map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-[#14213D]">{b.serviceName}</div>
                    <div className="text-gray-500 mt-0.5">{b.customerName} • {b.location.area}, Mumbai</div>
                    <div className="text-[10px] text-gray-400">{b.scheduledDate} ({b.totalHours} hrs)</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-emerald-600">₹{b.totalAmount}</div>
                    <div className="text-[10px] text-amber-500 font-bold flex items-center justify-end gap-0.5 mt-0.5">
                      <Star className="w-3 h-3 fill-amber-500" />
                      <span>{b.rating?.stars || 5.0}★</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </main>

      {/* Start OTP Modal */}
      {showOtpModal && activeTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#14213D]">Enter Customer Start OTP</h3>
              <p className="text-xs text-gray-500 mt-1">
                Ask <strong>{activeTask.customerName}</strong> for the 4-digit security code shown on their Diblo screen.
              </p>
              <div className="text-[11px] text-[#F42F73] font-bold mt-1 bg-[#FFF0F5] py-1 rounded">
                (Customer OTP: {activeTask.startOtp || '5829'})
              </div>
            </div>

            <input
              type="text"
              maxLength={4}
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value)}
              placeholder="4-digit OTP"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-xl font-mono font-bold tracking-widest text-[#14213D] focus:outline-none focus:border-[#F42F73]"
            />

            {otpError && (
              <div className="text-xs text-red-500 font-semibold">{otpError}</div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleVerifyOtpSubmit}
                disabled={isVerifying || enteredOtp.length < 4}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
              >
                {isVerifying ? 'Verifying...' : 'Verify & Start Task'}
              </button>
              <button
                onClick={() => setShowOtpModal(false)}
                className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-xs"
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
