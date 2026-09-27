import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Calendar,
  Navigation,
  User,
  Bell,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Clock,
  CheckCircle2,
  Activity
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
  | 'SUPPORT';

interface CustomerSidebarProps {
  activeTab: string;
  requestsFilter?: CustomerRequestFilter;
  onSelectTab: (tab: CustomerNavId) => void;
  onSelectRequestFilter?: (filter: CustomerRequestFilter) => void;
  onOpenLogout: () => void;
  onOpenBooking?: () => void;
}

export const CustomerSidebar: React.FC<CustomerSidebarProps> = ({
  activeTab,
  requestsFilter = 'UPCOMING',
  onSelectTab,
  onSelectRequestFilter,
  onOpenLogout,
  onOpenBooking
}) => {
  const { currentUser, customerProfile, firebaseCustomer } = useAuth();
  const { bookings: contextBookings, activeBooking, notifications } = useBooking();
  const [realtimeFirebaseBookings, setRealtimeFirebaseBookings] = useState<Booking[]>([]);

  const isRequestsActive = activeTab === 'REQUESTS' || activeTab === 'BOOKINGS';
  const [isRequestsExpanded, setIsRequestsExpanded] = useState<boolean>(true);

  useEffect(() => {
    if (isRequestsActive) {
      setIsRequestsExpanded(true);
    }
  }, [isRequestsActive]);

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
    return 'HOME';
  };

  const currentNav = normalizeActiveTab(activeTab);

  const handleSelectSubFilter = (filter: CustomerRequestFilter) => {
    if (onSelectRequestFilter) {
      onSelectRequestFilter(filter);
    } else {
      onSelectTab('REQUESTS');
    }
  };

  return (
    <aside
      id="customer-desktop-sidebar"
      className="hidden lg:flex flex-col w-64 xl:w-72 bg-white border-r border-gray-100 min-h-screen sticky top-0 h-screen z-30 shrink-0 select-none"
    >
      {/* Top Header: Diblo Brand Logo */}
      <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSelectTab('HOME')}
          className="flex items-baseline gap-1.5 cursor-pointer text-left group"
        >
          <span className="text-2xl font-black text-[#F42F73] tracking-tighter lowercase group-hover:opacity-90 transition-opacity">
            diblo
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#FFF0F5] text-[#F42F73] border border-rose-200 px-1.5 py-0.5 rounded">
            Customer
          </span>
        </button>

        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Mumbai</span>
        </span>
      </div>

      {/* Main Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
          Navigation
        </div>

        {/* Home */}
        <button
          type="button"
          onClick={() => onSelectTab('HOME')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
            currentNav === 'HOME'
              ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/80'
              : 'text-gray-600 hover:bg-gray-50 hover:text-[#14213D]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`p-2 rounded-xl transition-colors ${
                currentNav === 'HOME'
                  ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <Home className="w-4 h-4" />
            </span>
            <span className="truncate">Home</span>
          </div>
        </button>

        {/* My Requests */}
        <div className="space-y-1">
          <div
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              isRequestsActive
                ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/80'
                : 'text-gray-600 hover:bg-gray-50 hover:text-[#14213D]'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsRequestsExpanded((prev) => !prev)}
              className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
            >
              <span
                className={`p-2 rounded-xl transition-colors ${
                  isRequestsActive
                    ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <Calendar className="w-4 h-4" />
              </span>
              <span className="truncate">My Requests</span>
            </button>

            <div className="flex items-center gap-1.5">
              <span
                data-testid="sidebar-total-requests-count"
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  isRequestsActive
                    ? 'bg-[#F42F73] text-white'
                    : 'bg-gray-100 text-gray-600'
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

          {isRequestsExpanded && (
            <div className="pl-5 pr-1 py-1 space-y-1 border-l-2 border-rose-100 ml-5">
              <button
                id="customer-sidebar-requests-upcoming"
                type="button"
                onClick={() => handleSelectSubFilter('UPCOMING')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                  data-testid="sidebar-upcoming-count"
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isRequestsActive && requestsFilter === 'UPCOMING'
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {upcomingCount}
                </span>
              </button>

              <button
                id="customer-sidebar-requests-active"
                type="button"
                onClick={() => handleSelectSubFilter('ACTIVE')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                  data-testid="sidebar-active-count"
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

              <button
                id="customer-sidebar-requests-completed"
                type="button"
                onClick={() => handleSelectSubFilter('COMPLETED')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                  data-testid="sidebar-completed-count"
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

        {/* Profile */}
        <button
          type="button"
          onClick={() => onSelectTab('PROFILE')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
            currentNav === 'PROFILE'
              ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/80'
              : 'text-gray-600 hover:bg-gray-50 hover:text-[#14213D]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`p-2 rounded-xl transition-colors ${
                currentNav === 'PROFILE'
                  ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <User className="w-4 h-4" />
            </span>
            <span className="truncate">Profile</span>
          </div>
        </button>

        {/* Track Assistant */}
        <button
          type="button"
          onClick={() => onSelectTab('TRACK')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
            currentNav === 'TRACK'
              ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/80'
              : 'text-gray-600 hover:bg-gray-50 hover:text-[#14213D]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`p-2 rounded-xl transition-colors ${
                currentNav === 'TRACK'
                  ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                  : 'bg-gray-100 text-gray-500'
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

        {/* Notifications */}
        <button
          type="button"
          onClick={() => onSelectTab('NOTIFICATIONS')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
            currentNav === 'NOTIFICATIONS'
              ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/80'
              : 'text-gray-600 hover:bg-gray-50 hover:text-[#14213D]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`p-2 rounded-xl transition-colors ${
                currentNav === 'NOTIFICATIONS'
                  ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                  : 'bg-gray-100 text-gray-500'
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

        {/* Payments */}
        <button
          type="button"
          onClick={() => onSelectTab('PAYMENTS')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
            currentNav === 'PAYMENTS'
              ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/80'
              : 'text-gray-600 hover:bg-gray-50 hover:text-[#14213D]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`p-2 rounded-xl transition-colors ${
                currentNav === 'PAYMENTS'
                  ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <CreditCard className="w-4 h-4" />
            </span>
            <span className="truncate">Payments</span>
          </div>
        </button>

        {/* Help / Support */}
        <button
          type="button"
          onClick={() => onSelectTab('SUPPORT')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
            currentNav === 'SUPPORT'
              ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/80'
              : 'text-gray-600 hover:bg-gray-50 hover:text-[#14213D]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`p-2 rounded-xl transition-colors ${
                currentNav === 'SUPPORT'
                  ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
            </span>
            <span className="truncate">Help / Support</span>
          </div>
        </button>

        {onOpenBooking && (
          <div className="pt-4 px-1">
            <button
              type="button"
              onClick={onOpenBooking}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#F42F73] to-[#D81B60] hover:opacity-95 text-white font-extrabold text-xs shadow-md shadow-[#F42F73]/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Book Assistant • ₹149/hr</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Profile & Logout Section */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-2.5">
        <div
          onClick={() => onSelectTab('PROFILE')}
          className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-gray-100 shadow-2xs cursor-pointer hover:border-rose-200 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-[#14213D] text-white font-black text-xs flex items-center justify-center shrink-0 overflow-hidden">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : displayName && displayName !== 'Customer' ? (
              <span>{initials}</span>
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-extrabold text-[#14213D] truncate">
              {displayName || 'Customer'}
            </div>
            <div className="text-[11px] text-gray-500 font-medium truncate">
              {displayPhone
                ? displayPhone.startsWith('+91')
                  ? displayPhone
                  : `+91 ${displayPhone}`
                : 'Customer Account'}
            </div>
          </div>
        </div>

        <button
          id="customer-sidebar-logout-btn"
          type="button"
          onClick={onOpenLogout}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-600 text-xs font-extrabold transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
