import React from 'react';
import {
  Home,
  Calendar,
  Activity,
  User,
  Bell,
  CreditCard,
  HelpCircle,
  LogOut,
  Sparkles,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';

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
  onSelectTab: (tab: CustomerNavId) => void;
  onOpenLogout: () => void;
  onOpenBooking?: () => void;
}

export const CustomerSidebar: React.FC<CustomerSidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenLogout,
  onOpenBooking
}) => {
  const { currentUser, customerProfile } = useAuth();
  const { bookings, activeBooking, notifications } = useBooking();

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  // Normalize aliases for active check
  const isTabActive = (id: CustomerNavId) => {
    if (id === 'HOME' && activeTab === 'HOME') return true;
    if (id === 'REQUESTS' && (activeTab === 'REQUESTS' || activeTab === 'BOOKINGS')) return true;
    if (id === 'TRACK' && (activeTab === 'TRACK' || activeTab === 'ACTIVITY')) return true;
    if (id === 'PROFILE' && activeTab === 'PROFILE') return true;
    if (id === 'NOTIFICATIONS' && activeTab === 'NOTIFICATIONS') return true;
    if (id === 'PAYMENTS' && activeTab === 'PAYMENTS') return true;
    if (id === 'SUPPORT' && activeTab === 'SUPPORT') return true;
    return false;
  };

  const navItems: {
    id: CustomerNavId;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'HOME',
      label: 'Home',
      icon: <Home className="w-5 h-5 shrink-0" />
    },
    {
      id: 'REQUESTS',
      label: 'My Requests',
      icon: <Calendar className="w-5 h-5 shrink-0" />,
      badge: bookings.length > 0 ? bookings.length : undefined,
      badgeColor: 'bg-gray-100 text-gray-700'
    },
    {
      id: 'TRACK',
      label: 'Track Assistant',
      icon: <Activity className="w-5 h-5 shrink-0" />,
      badge: activeBooking ? 'LIVE' : undefined,
      badgeColor: 'bg-emerald-500 text-white animate-pulse'
    },
    {
      id: 'PROFILE',
      label: 'Profile',
      icon: <User className="w-5 h-5 shrink-0" />
    },
    {
      id: 'NOTIFICATIONS',
      label: 'Notifications',
      icon: <Bell className="w-5 h-5 shrink-0" />,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
      badgeColor: 'bg-[#F42F73] text-white'
    },
    {
      id: 'PAYMENTS',
      label: 'Payments',
      icon: <CreditCard className="w-5 h-5 shrink-0" />
    },
    {
      id: 'SUPPORT',
      label: 'Help & Support',
      icon: <HelpCircle className="w-5 h-5 shrink-0" />
    }
  ];

  const displayName = currentUser?.name || customerProfile?.name || 'Customer';
  const displayPhone = currentUser?.phone || customerProfile?.phone || '';
  const userInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CU';

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
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-none">
        <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-3 pt-2 pb-1.5">
          Navigation
        </div>

        {navItems.map((item) => {
          const active = isTabActive(item.id);
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id.toLowerCase()}`}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all min-h-[44px] cursor-pointer group ${
                active
                  ? 'bg-[#FFF0F5] text-[#F42F73] font-black shadow-2xs'
                  : 'text-gray-600 hover:text-[#14213D] hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`transition-colors ${
                    active ? 'text-[#F42F73]' : 'text-gray-400 group-hover:text-gray-700'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Logout Menu Item (Required in the list) */}
        <div className="pt-2">
          <button
            type="button"
            id="sidebar-nav-logout"
            onClick={onOpenLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-gray-500 hover:text-rose-600 hover:bg-rose-50/70 transition-all min-h-[44px] cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-gray-400 shrink-0" />
            <span>Logout</span>
          </button>
        </div>

        {/* Quick Booking CTA Card inside sidebar */}
        {onOpenBooking && (
          <div className="pt-4 px-1">
            <div className="bg-gradient-to-br from-[#FFF0F5] via-white to-rose-50/40 p-4 rounded-2xl border border-rose-100 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F42F73]" />
                <span className="text-xs font-black text-[#14213D]">Need an Assistant?</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-snug">
                Police-verified helpers at ₹149/hr across Mumbai.
              </p>
              <button
                type="button"
                id="sidebar-quick-book-btn"
                onClick={onOpenBooking}
                className="w-full py-2 bg-[#F42F73] hover:bg-[#D81B60] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <span>Book Now</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Profile Summary Card */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-150 shadow-2xs">
          <button
            type="button"
            onClick={() => onSelectTab('PROFILE')}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
          >
            <div className="relative shrink-0">
              {customerProfile?.avatar || currentUser?.avatar ? (
                <img
                  src={customerProfile?.avatar || currentUser?.avatar}
                  alt={displayName}
                  className="w-9 h-9 rounded-full object-cover border border-emerald-400"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#14213D] text-white text-xs font-bold flex items-center justify-center border border-emerald-400">
                  {userInitials}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#14213D] truncate group-hover:text-[#F42F73] transition-colors">
                {displayName}
              </div>
              <div className="text-[10px] text-gray-400 font-mono truncate">
                +91 {displayPhone.slice(-10)}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenLogout}
            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
