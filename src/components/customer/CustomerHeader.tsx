import React, { useState } from 'react';
import {
  MapPin,
  Shield,
  Phone,
  Bell,
  User,
  AlertTriangle,
  ChevronDown,
  Menu,
  X,
  Clock,
  HelpCircle,
  Sparkles,
  Loader2,
  ExternalLink,
  Navigation,
  CheckCircle2,
  Radio,
  Heart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { api } from '../../lib/api';
import { EmergencyAlert } from '../../types';
import { CustomerDrawer } from './CustomerDrawer';

interface CustomerHeaderProps {
  onOpenBooking: () => void;
  onSelectTab: (tab: any) => void;
  activeTab: string;
  onOpenLogout: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({ onOpenBooking, onSelectTab, activeTab, onOpenLogout }) => {
  const { currentUser, customerProfile, favoriteAssistantIds } = useAuth();
  const { activeBooking, pushPermission, requestPushNotificationPermission, addNotification } = useBooking();
  const [selectedArea, setSelectedArea] = useState('Bandra West, Mumbai');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Emergency SOS distress state
  const [isDispatchingSos, setIsDispatchingSos] = useState(false);
  const [activeSosAlert, setActiveSosAlert] = useState<EmergencyAlert | null>(null);
  const [sosStatusMessage, setSosStatusMessage] = useState<string | null>(null);

  const mumbaiAreas = [
    'Bandra West, Mumbai',
    'Andheri West, Mumbai',
    'Powai, Mumbai',
    'Colaba & South Mumbai',
    'Dadar & Prabhadevi',
    'Juhu, Mumbai',
    'Thane West',
    'Lower Parel, Mumbai'
  ];

  const handleTabClick = (tab: 'HOME' | 'BOOKINGS' | 'ACTIVITY' | 'FAVORITES' | 'PROFILE' | 'SUPPORT') => {
    onSelectTab(tab);
    setIsDrawerOpen(false);
  };

  const playDistressChirp = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio context restricted or not supported
    }
  };

  const handleTriggerEmergencySos = async () => {
    setIsDispatchingSos(true);
    setSosStatusMessage('Acquiring high-accuracy GPS coordinates...');
    setShowSosModal(true);

    const dispatchAlert = async (lat: number, lng: number, accuracy: number, isFallback = false) => {
      try {
        playDistressChirp();

        // Attempt reverse geocoding for human-readable landmark
        let resolvedAddress = isFallback
          ? `${selectedArea} (Fallback Grid)`
          : `Mumbai Live GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

        try {
          const geoRes = await api.reverseGeocode(lat, lng);
          if (geoRes && geoRes.formattedAddress) {
            resolvedAddress = geoRes.formattedAddress;
          }
        } catch {
          // Keep default address
        }

        const res = await api.triggerEmergencySos({
          location: {
            lat,
            lng,
            accuracy,
            address: resolvedAddress
          },
          bookingId: activeBooking?.id,
          serviceName: activeBooking?.serviceName,
          triggerSource: 'CUSTOMER_HEADER_SOS',
          userId: currentUser?.id,
          userName: currentUser?.name || 'Customer',
          userPhone: currentUser?.phone || '9820123456',
          userRole: currentUser?.role || 'CUSTOMER'
        });

        if (res.success && res.alert) {
          setActiveSosAlert(res.alert);
          setSosStatusMessage(
            `Distress alert broadcasted to Admin Panel. Ref: ${res.alert.alertNumber}`
          );
          addNotification(
            '🚨 Emergency SOS Dispatched',
            `Distress alert sent to Admin safety team with live GPS: Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}.`,
            'SUPPORT',
            activeBooking?.id
          );
        } else {
          setSosStatusMessage(res.error || 'Failed to dispatch distress alert. Please call helpline directly.');
        }
      } catch (err: any) {
        setSosStatusMessage(err.message || 'Distress broadcast error. Please use direct emergency calling.');
      } finally {
        setIsDispatchingSos(false);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          dispatchAlert(pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.accuracy), false);
        },
        (err) => {
          console.warn('[Emergency SOS] Geolocation error, using Mumbai default:', err.message);
          // Fallback coordinates (Bandra West, Mumbai)
          dispatchAlert(19.0607, 72.8258, 45, true);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    } else {
      dispatchAlert(19.0607, 72.8258, 45, true);
    }
  };

  const handleCancelEmergencyAlert = async () => {
    if (!activeSosAlert) {
      setShowSosModal(false);
      return;
    }
    try {
      await api.resolveEmergencyAlert(activeSosAlert.id, 'User marked false alarm / cancelled from CustomerHeader', currentUser?.name);
      setActiveSosAlert(null);
      setSosStatusMessage(null);
      setShowSosModal(false);
      addNotification('SOS Alert Resolved', 'Emergency alert was marked resolved / cancelled.', 'SUPPORT');
    } catch {
      setActiveSosAlert(null);
      setShowSosModal(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all">
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo, Sidebar Drawer Toggle & Location */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Hamburger Drawer Toggle Button (Visible on all screen sizes, matching AssistantPanel) */}
          <button
            id="customer-header-menu-btn"
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="p-2 sm:p-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-[#14213D] transition-all min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center shadow-2xs relative cursor-pointer"
            aria-label={isDrawerOpen ? 'Close Navigation Drawer' : 'Open Navigation Drawer'}
            title="Open Sidebar Menu"
          >
            {isDrawerOpen ? (
              <X className="w-5 h-5 text-[#14213D]" />
            ) : (
              <Menu className="w-5 h-5 text-[#14213D]" />
            )}
            {activeBooking && !isDrawerOpen && (
              <span
                id="customer-header-active-badge"
                className="absolute -top-1 -right-1 w-3 h-3 bg-[#10B981] rounded-full border-2 border-white animate-pulse"
              />
            )}
          </button>

          <div
            onClick={() => handleTabClick('HOME')}
            className="cursor-pointer flex items-baseline gap-1 select-none py-1 lg:hidden"
          >
            <span className="text-2xl sm:text-3xl font-black text-[#F42F73] tracking-tighter lowercase">
              diblo
            </span>
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider bg-[#FFF0F5] text-[#F42F73] px-1.5 py-0.5 rounded ml-1 hidden xs:inline-block">
              Mumbai
            </span>
          </div>

          {/* Location Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
              className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold text-[#14213D] transition-colors min-h-[36px]"
              aria-label="Select Operating Zone"
            >
              <MapPin className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
              <span className="max-w-[100px] sm:max-w-[150px] md:max-w-[180px] truncate text-left">{selectedArea}</span>
              <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
            </button>

            {isLocationDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  Select Mumbai Operating Zone
                </div>
                {mumbaiAreas.map((area) => (
                  <button
                    key={area}
                    onClick={() => {
                      setSelectedArea(area);
                      setIsLocationDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-[#FFF0F5] hover:text-[#F42F73] transition-colors flex items-center justify-between ${
                      selectedArea === area ? 'text-[#F42F73] font-bold bg-[#FFF0F5]/50' : 'text-gray-700'
                    }`}
                  >
                    <span>{area}</span>
                    {selectedArea === area && <span className="text-[#F42F73] text-xs font-bold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>


        {/* Right CTA & Emergency Safety Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Active Booking Floating Chip (If booking in progress) */}
          {activeBooking && (
            <button
              onClick={() => onSelectTab('ACTIVITY')}
              className="hidden sm:flex items-center gap-2 bg-[#FFF0F5] border border-[#F42F73]/30 text-[#F42F73] px-3 py-1.5 rounded-full text-xs font-bold animate-pulse min-h-[36px]"
            >
              <span className="w-2 h-2 rounded-full bg-[#F42F73]" />
              <span className="hidden md:inline">Live: </span>
              <span>{activeBooking.status.replace('_', ' ')}</span>
            </button>
          )}

          {/* 1-Hour Session Push Reminders Quick Button */}
          <button
            onClick={() => {
              if (pushPermission !== 'granted') {
                requestPushNotificationPermission();
              }
              onSelectTab('BOOKINGS');
            }}
            className={`hidden sm:flex items-center justify-center p-2 rounded-full border transition-all active:scale-95 min-h-[38px] min-w-[38px] cursor-pointer ${
              pushPermission === 'granted'
                ? 'bg-rose-50 text-[#F42F73] border-rose-200 hover:bg-rose-100'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:text-[#F42F73] hover:bg-rose-50'
            }`}
            title={
              pushPermission === 'granted'
                ? '1-Hour Session Reminders Active: Click to view Bookings'
                : 'Enable 1-Hour Session Push Reminders'
            }
            aria-label="1-Hour Session Reminders"
            id="header-push-reminders-btn"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* SOS Safety Button in Header */}
          <button
            onClick={handleTriggerEmergencySos}
            disabled={isDispatchingSos}
            className={`flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 min-h-[38px] min-w-[38px] cursor-pointer ${
              activeSosAlert
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-2 ring-red-400 animate-pulse'
                : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
            }`}
            title="Emergency Safety & SOS"
            aria-label="Emergency SOS"
            id="header-sos-btn"
          >
            {isDispatchingSos ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-red-600" />
            ) : (
              <AlertTriangle className={`w-4 h-4 shrink-0 ${activeSosAlert ? 'text-white' : 'text-red-600'}`} />
            )}
            <span className="hidden sm:inline">{activeSosAlert ? 'SOS Active' : 'SOS Desk'}</span>
          </button>

          {/* In-App PWA Install Quick Button */}
          <PWAInstallButton className="hidden md:inline-flex" />

          {/* Book Assistant Primary CTA */}
          <button
            onClick={onOpenBooking}
            className="bg-[#F42F73] hover:bg-[#D81B60] text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold shadow-md shadow-[#F42F73]/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 min-h-[38px] whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 hidden xs:inline" />
            <span>Book Assistant</span>
          </button>

          {/* User Avatar Circle */}
          <button
            onClick={() => onSelectTab('PROFILE')}
            className="w-9 h-9 rounded-full bg-[#14213D] text-white text-xs font-bold flex items-center justify-center hover:ring-2 hover:ring-[#F42F73] transition-all shrink-0 min-w-[36px] min-h-[36px] overflow-hidden cursor-pointer shadow-xs border border-gray-100"
            title="My Profile"
            aria-label="User Profile"
          >
            {customerProfile?.avatar || currentUser?.avatar ? (
              <img
                src={customerProfile?.avatar || currentUser?.avatar}
                alt="Profile"
                className="w-full h-full object-cover rounded-full"
              />
            ) : currentUser?.name ? (
              currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
            ) : (
              'CU'
            )}
          </button>

          {/* Mobile Menu Hamburger Button (Hidden on Desktop) */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ml-0.5 cursor-pointer"
            aria-label="Open Menu"
            title="Menu"
          >
            {isDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Customer Sidebar Menu Drawer (Full-featured sidebar like AssistantPanel) */}
      <CustomerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab as any}
        onSelectTab={(tab) => {
          handleTabClick(tab);
        }}
        onOpenBooking={() => {
          setIsDrawerOpen(false);
          onOpenBooking();
        }}
        onTriggerSos={() => {
          setIsDrawerOpen(false);
          handleTriggerEmergencySos();
        }}
        onOpenLogout={onOpenLogout}
        selectedArea={selectedArea}
        onSelectArea={(area) => {
          setSelectedArea(area);
        }}
        mumbaiAreas={mumbaiAreas}
      />

      {/* Floating 'Emergency SOS' Button */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          id="floating-emergency-sos-btn"
          onClick={handleTriggerEmergencySos}
          disabled={isDispatchingSos}
          className={`group relative flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-2xl transition-all duration-200 border-2 active:scale-95 cursor-pointer select-none ${
            activeSosAlert
              ? 'bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white border-red-300 ring-4 ring-red-500/40 shadow-red-700/50'
              : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white border-white/40 shadow-red-600/40 hover:shadow-red-600/70 hover:scale-105'
          }`}
          title="Press to send Emergency SOS Distress Alert with live GPS to Admin Panel"
          aria-label="Emergency SOS Distress Alert"
        >
          {/* Pulsing ring halo */}
          <span className="absolute -inset-1 rounded-full bg-red-500/40 animate-ping pointer-events-none opacity-80" />

          {isDispatchingSos ? (
            <Loader2 className="w-5 h-5 animate-spin shrink-0 text-white" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-white animate-pulse" />
          )}

          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] tracking-wider uppercase font-extrabold text-rose-200">
              {activeSosAlert ? 'Distress Active' : 'Urgent'}
            </span>
            <span className="text-xs sm:text-sm font-black tracking-wide uppercase">
              {isDispatchingSos ? 'Locating GPS...' : 'Emergency SOS'}
            </span>
          </div>

          <span className="hidden md:inline-flex items-center gap-1 text-[9px] font-black uppercase bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20">
            <MapPin className="w-2.5 h-2.5 text-rose-300" />
            GPS
          </span>
        </button>
      </div>

      {/* SOS Emergency Modal & Live Distress Broadcast */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full text-center space-y-4 shadow-2xl border border-red-200 animate-in fade-in zoom-in duration-200">
            {/* Header Badge */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-black uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 animate-pulse text-red-600" />
                <span>{activeSosAlert ? 'Distress Broadcast Active' : 'Emergency Safety Desk'}</span>
              </span>
              <button
                onClick={() => setShowSosModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Icon & Title */}
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              {isDispatchingSos ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <AlertTriangle className="w-7 h-7 animate-bounce" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-black text-[#14213D]">
                {activeSosAlert ? 'Distress Signal Transmitted' : 'Emergency SOS Alert'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {activeSosAlert
                  ? 'Your current GPS coordinates have been immediately dispatched to the Diblo Admin safety desk.'
                  : 'Press below to immediately broadcast your live GPS location to Diblo Admin Panel and control room.'}
              </p>
            </div>

            {/* Status / Error feedback */}
            {sosStatusMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="font-medium">{sosStatusMessage}</div>
              </div>
            )}

            {/* Live GPS Coordinates card if alert is active */}
            {activeSosAlert && (
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-400 font-mono text-[10px] font-bold">
                  <span>REF: {activeSosAlert.alertNumber}</span>
                  <span className="text-red-600 font-bold uppercase animate-pulse">● Live Alert</span>
                </div>
                <div className="flex items-start gap-2 text-gray-800">
                  <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[#14213D]">{activeSosAlert.address || selectedArea}</div>
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                      Lat: {activeSosAlert.lat.toFixed(6)}, Lng: {activeSosAlert.lng.toFixed(6)} (±{activeSosAlert.accuracy || 15}m)
                    </div>
                  </div>
                </div>

                <a
                  href={`https://www.google.com/maps?q=${activeSosAlert.lat},${activeSosAlert.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                  <span>View Coordinates on Google Maps</span>
                </a>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              {!activeSosAlert && (
                <button
                  onClick={handleTriggerEmergencySos}
                  disabled={isDispatchingSos}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 min-h-[46px] transition-all active:scale-98"
                >
                  {isDispatchingSos ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span>Send Distress Alert With GPS</span>
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href="tel:8291919829"
                  className="py-3 px-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 min-h-[44px] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Diblo Helpline</span>
                </a>
                <a
                  href="tel:112"
                  className="py-3 px-3 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 min-h-[44px] transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Call Police (112)</span>
                </a>
              </div>

              {activeSosAlert && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleTriggerEmergencySos}
                    disabled={isDispatchingSos}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
                  >
                    Update GPS Location
                  </button>
                  <button
                    onClick={handleCancelEmergencyAlert}
                    className="flex-1 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
                  >
                    Cancel / False Alarm
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowSosModal(false)}
                className="w-full py-2 text-xs text-gray-500 font-semibold hover:text-gray-800"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
