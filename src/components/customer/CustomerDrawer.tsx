import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Home,
  Calendar,
  Navigation,
  User,
  Bell,
  CreditCard,
  HelpCircle,
  LogOut,
  X,
  MapPin,
  Sparkles,
  Phone,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle2,
  Activity,
  Heart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { Booking } from '../../types';
import { CustomerRequestFilter } from './CustomerBookings';
import {
  getCustomerRequestTabCategory,
  isDemoBookingRecord,
  subscribeToRealtimeBookings
} from '../../lib/firestoreBookings';

export type CustomerNavId =
  | 'HOME'
  | 'REQUESTS'
  | 'TRACK'
  | 'PROFILE'
  | 'NOTIFICATIONS'
  | 'PAYMENTS'
  | 'SUPPORT'
  | 'FAVORITES';

interface CustomerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  requestsFilter?: CustomerRequestFilter;
  onSelectTab: (tab: CustomerNavId) => void;
  onSelectRequestFilter?: (filter: CustomerRequestFilter) => void;
  onOpenBooking: () => void;
  onTriggerSos: () => void;
  onOpenLogout: () => void;
  selectedArea: string;
  onSelectArea: (area: string) => void;
  mumbaiAreas: string[];
}

export const CustomerDrawer: React.FC<CustomerDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  requestsFilter = 'UPCOMING',
  onSelectTab,
  onSelectRequestFilter,
  onOpenBooking,
  onTriggerSos,
  onOpenLogout,
  selectedArea,
  onSelectArea,
  mumbaiAreas
}) => {
  const { currentUser, customerProfile, firebaseCustomer, favoriteAssistantIds } = useAuth();
  const { bookings: contextBookings, activeBooking, notifications } = useBooking();
  const [realtimeFirebaseBookings, setRealtimeFirebaseBookings] = useState<Booking[]>([]);

  const isRequestsActive = activeTab === 'REQUESTS' || activeTab === 'BOOKINGS';
  const [isRequestsExpanded, setIsRequestsExpanded] = useState<boolean>(true);

  useEffect(() => {
    if (isRequestsActive) {
      setIsRequestsExpanded(true);
    }
  }, [isRequestsActive]);

  // Close sidebar on ESC key press (Desktop & Keyboard accessibility)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Prevent accidental background scroll/interaction when sidebar is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Real authenticated customer details (no demo fallback)
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
  const displayPhone = rawPhone === '9820123456' ? '' : rawPhone;

  const displayAvatar =
    customerProfile?.avatar ||
    currentUser?.avatar ||
    firebaseCustomer?.photoURL ||
    '';

  const initials =
    displayName && displayName !== 'Customer'
      ? displayName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : 'CU';

  // Subscribe directly to the current user's Firebase bookings for real-time request counts
  useEffect(() => {
    const cleanPhone = displayPhone.replace(/\D/g, '').slice(-10);
    const resolvedCustomerId =
      customerProfile?.id ||
      firebaseCustomer?.uid ||
      currentUser?.id ||
      (cleanPhone ? `cust-${cleanPhone}` : undefined);

    if (!resolvedCustomerId && !cleanPhone) {
      setRealtimeFirebaseBookings([]);
      return;
    }

    const unsubscribe = subscribeToRealtimeBookings(
      {
        role: 'CUSTOMER',
        customerId: resolvedCustomerId,
        customerPhone: cleanPhone || undefined,
        customerName: displayName
      },
      (liveBookings) => {
        setRealtimeFirebaseBookings(liveBookings);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [
    customerProfile?.id,
    firebaseCustomer?.uid,
    currentUser?.id,
    displayPhone,
    displayName
  ]);

  // Merge real-time Firebase bookings with context bookings for accurate, instant counts
  const { upcomingCount, activeCount, completedCount, totalRequestsCount } = useMemo(() => {
    const mergedMap = new Map<string, Booking>();
    const cleanMyPhone = displayPhone.replace(/\D/g, '').slice(-10);
    const myCustomerId = customerProfile?.id || '';
    const myUid = firebaseCustomer?.uid || currentUser?.id || '';

    const belongsToCurrentCustomer = (b: Booking): boolean => {
      if (isDemoBookingRecord(b)) return false;
      const recPhone = (b.customerPhone || '').replace(/\D/g, '').slice(-10);
      if (myUid && (b.customerUid === myUid || b.customerId === myUid)) return true;
      if (myCustomerId && b.customerId === myCustomerId) return true;
      if (cleanMyPhone && recPhone && cleanMyPhone === recPhone) return true;
      return false;
    };

    contextBookings.forEach((b) => {
      if (b?.id && belongsToCurrentCustomer(b)) {
        mergedMap.set(b.id, b);
      }
    });

    realtimeFirebaseBookings.forEach((b) => {
      if (b?.id && belongsToCurrentCustomer(b)) {
        mergedMap.set(b.id, b);
      }
    });

    let upcoming = 0;
    let active = 0;
    let completed = 0;

    mergedMap.forEach((booking) => {
      const category = getCustomerRequestTabCategory(booking.status);
      if (category === 'UPCOMING') upcoming += 1;
      else if (category === 'ACTIVE') active += 1;
      else if (category === 'COMPLETED') completed += 1;
    });

    return {
      upcomingCount: upcoming,
      activeCount: active,
      completedCount: completed,
      totalRequestsCount: upcoming + active + completed
    };
  }, [
    contextBookings,
    realtimeFirebaseBookings,
    displayPhone,
    customerProfile?.id,
    firebaseCustomer?.uid,
    currentUser?.id
  ]);

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const normalizeActiveTab = (tab: string): CustomerNavId => {
    if (tab === 'BOOKINGS' || tab === 'REQUESTS') return 'REQUESTS';
    if (tab === 'ACTIVITY' || tab === 'TRACK') return 'TRACK';
    if (tab === 'NOTIFICATIONS') return 'NOTIFICATIONS';
    if (tab === 'PAYMENTS') return 'PAYMENTS';
    if (tab === 'SUPPORT') return 'SUPPORT';
    if (tab === 'PROFILE') return 'PROFILE';
    if (tab === 'FAVORITES') return 'FAVORITES';
    return 'HOME';
  };

  const currentNav = normalizeActiveTab(activeTab);

  const handleSelectSubFilter = (filter: CustomerRequestFilter) => {
    if (onSelectRequestFilter) {
      onSelectRequestFilter(filter);
    } else {
      onSelectTab('REQUESTS');
    }
    onClose();
  };

  const drawerContent = (
    <div
      id="customer-drawer-overlay"
      className={`fixed inset-0 z-50 flex transition-all duration-300 ${
        isOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Subtle Dark Backdrop / Overlay: Clicking outside closes sidebar */}
      <div
        id="customer-drawer-backdrop"
        className={`fixed inset-0 bg-black/55 backdrop-blur-[1px] transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Sidebar Container (80-85% width on mobile, smooth drawer on desktop) */}
      <aside
        id="customer-drawer-container"
        role="dialog"
        aria-modal="true"
        aria-label="Customer Portal Navigation"
        className={`relative w-[82vw] max-w-[320px] sm:w-80 sm:max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Brand & Close Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#FFF0F5]/70 via-white to-white">
          <div
            onClick={() => {
              onSelectTab('HOME');
              onClose();
            }}
            className="flex items-baseline gap-1.5 select-none cursor-pointer"
          >
            <span className="text-2xl font-black text-[#F42F73] tracking-tighter lowercase">
              diblo
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#FFF0F5] text-[#F42F73] border border-rose-200 px-2 py-0.5 rounded-md">
              Mumbai
            </span>
          </div>

          <button
            id="customer-drawer-close-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Profile Summary Card */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/60">
          <div
            onClick={() => {
              onSelectTab('PROFILE');
              onClose();
            }}
            className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:border-rose-200 transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-full bg-[#14213D] text-white font-black text-sm flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-[#F42F73]/20">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : displayName && displayName !== 'Customer' ? (
                <span>{initials}</span>
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-[#14213D] truncate group-hover:text-[#F42F73] transition-colors">
                {displayName || 'Customer'}
              </div>
              <div className="text-xs text-gray-500 font-medium truncate">
                {displayPhone
                  ? displayPhone.startsWith('+91')
                    ? displayPhone
                    : `+91 ${displayPhone}`
                  : 'Verified Customer'}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#F42F73] transition-colors shrink-0" />
          </div>
        </div>

        {/* Scrollable Navigation Content */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-5">
          {/* Primary Navigation Items */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
              Navigation
            </div>

            {/* 1. HOME */}
            <button
              id="customer-drawer-nav-home"
              type="button"
              onClick={() => {
                onSelectTab('HOME');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                currentNav === 'HOME'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    currentNav === 'HOME'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Home className="w-4 h-4" />
                </span>
                <span className="truncate">Home</span>
              </div>
            </button>

            {/* 2. MY REQUESTS (Expandable: Upcoming, Active, Completed with real counts) */}
            <div className="space-y-1">
              <div
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                  isRequestsActive
                    ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                    : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
                }`}
              >
                <button
                  id="customer-drawer-nav-requests"
                  type="button"
                  onClick={() => {
                    setIsRequestsExpanded((prev) => !prev);
                  }}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                >
                  <span
                    className={`p-2 rounded-xl transition-colors ${
                      isRequestsActive
                        ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                  </span>
                  <span className="truncate">My Requests</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <span
                    data-testid="drawer-total-requests-count"
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isRequestsActive
                        ? 'bg-[#F42F73] text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {totalRequestsCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRequestsExpanded((prev) => !prev)}
                    className="p-1 rounded-lg hover:bg-rose-100/60 text-gray-500 cursor-pointer"
                    aria-label={isRequestsExpanded ? 'Collapse My Requests' : 'Expand My Requests'}
                  >
                    {isRequestsExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sub-items: Upcoming, Active, Completed */}
              {isRequestsExpanded && (
                <div className="pl-5 pr-1 py-1 space-y-1 border-l-2 border-rose-100 ml-5">
                  {/* Upcoming */}
                  <button
                    id="customer-drawer-requests-upcoming"
                    type="button"
                    onClick={() => handleSelectSubFilter('UPCOMING')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isRequestsActive && requestsFilter === 'UPCOMING'
                        ? 'bg-[#F42F73] text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-[#14213D]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Upcoming</span>
                    </div>
                    <span
                      data-testid="drawer-upcoming-count"
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isRequestsActive && requestsFilter === 'UPCOMING'
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {upcomingCount}
                    </span>
                  </button>

                  {/* Active */}
                  <button
                    id="customer-drawer-requests-active"
                    type="button"
                    onClick={() => handleSelectSubFilter('ACTIVE')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isRequestsActive && requestsFilter === 'ACTIVE'
                        ? 'bg-[#F42F73] text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-[#14213D]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </div>
                    <span
                      data-testid="drawer-active-count"
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isRequestsActive && requestsFilter === 'ACTIVE'
                          ? 'bg-white/20 text-white'
                          : activeCount > 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {activeCount}
                    </span>
                  </button>

                  {/* Completed */}
                  <button
                    id="customer-drawer-requests-completed"
                    type="button"
                    onClick={() => handleSelectSubFilter('COMPLETED')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isRequestsActive && requestsFilter === 'COMPLETED'
                        ? 'bg-[#F42F73] text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-[#14213D]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Completed</span>
                    </div>
                    <span
                      data-testid="drawer-completed-count"
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isRequestsActive && requestsFilter === 'COMPLETED'
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {completedCount}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. PROFILE */}
            <button
              id="customer-drawer-nav-profile"
              type="button"
              onClick={() => {
                onSelectTab('PROFILE');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                currentNav === 'PROFILE'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    currentNav === 'PROFILE'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <User className="w-4 h-4" />
                </span>
                <span className="truncate">Profile</span>
              </div>
            </button>

            {/* 4. TRACK ASSISTANT */}
            <button
              id="customer-drawer-nav-track"
              type="button"
              onClick={() => {
                onSelectTab('TRACK');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                currentNav === 'TRACK'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    currentNav === 'TRACK'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Navigation className="w-4 h-4" />
                </span>
                <span className="truncate">Track Assistant</span>
              </div>
              {activeBooking && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 animate-pulse">
                  LIVE
                </span>
              )}
            </button>

            {/* 5. NOTIFICATIONS */}
            <button
              id="customer-drawer-nav-notifications"
              type="button"
              onClick={() => {
                onSelectTab('NOTIFICATIONS');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                currentNav === 'NOTIFICATIONS'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    currentNav === 'NOTIFICATIONS'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </span>
                <span className="truncate">Notifications</span>
              </div>
              {unreadNotificationsCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#F42F73] text-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* 6. PAYMENTS */}
            <button
              id="customer-drawer-nav-payments"
              type="button"
              onClick={() => {
                onSelectTab('PAYMENTS');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                currentNav === 'PAYMENTS'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    currentNav === 'PAYMENTS'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                </span>
                <span className="truncate">Payments</span>
              </div>
            </button>

            {/* 7. SAVED ASSISTANTS (If any favorited) */}
            {favoriteAssistantIds.length > 0 && (
              <button
                id="customer-drawer-nav-favorites"
                type="button"
                onClick={() => {
                  onSelectTab('FAVORITES');
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                  currentNav === 'FAVORITES'
                    ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                    : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`p-2 rounded-xl transition-colors ${
                      currentNav === 'FAVORITES'
                        ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                  </span>
                  <span className="truncate">Saved Assistants</span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-[#F42F73]">
                  {favoriteAssistantIds.length}
                </span>
              </button>
            )}

            {/* 8. HELP / SUPPORT */}
            <button
              id="customer-drawer-nav-support"
              type="button"
              onClick={() => {
                onSelectTab('SUPPORT');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                currentNav === 'SUPPORT'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    currentNav === 'SUPPORT'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                </span>
                <span className="truncate">Help / Support</span>
              </div>
            </button>
          </div>

          {/* Mumbai Operating Zone Quick Selector */}
          <div className="pt-2 border-t border-gray-100">
            <div className="px-3 pb-2 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-[#F42F73]" />
              <span>Operating Zone</span>
            </div>
            <div className="px-2">
              <select
                value={selectedArea}
                onChange={(e) => onSelectArea(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-[#14213D] focus:outline-none focus:border-[#F42F73]"
                aria-label="Mumbai Operating Zone"
              >
                {mumbaiAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Logout Option */}
          <div className="pt-2 border-t border-gray-100">
            <button
              id="customer-drawer-logout-btn"
              type="button"
              onClick={() => {
                onClose();
                onOpenLogout();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
            >
              <span className="p-2 rounded-xl bg-red-50 text-red-600">
                <LogOut className="w-4 h-4" />
              </span>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Sticky Bottom CTA & Safety Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenBooking();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#F42F73]/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Book Assistant • ₹149/hr</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <a
              href="tel:8291919829"
              className="py-2 px-3 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-[#14213D] font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Helpline</span>
            </a>
            <button
              type="button"
              onClick={() => {
                onClose();
                onTriggerSos();
              }}
              className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>SOS Desk</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(drawerContent, document.body);
  }

  return drawerContent;
};
