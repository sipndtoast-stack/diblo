import React from 'react';
import {
  Home,
  Calendar,
  Activity,
  User,
  HelpCircle,
  X,
  ShieldCheck,
  MapPin,
  Phone,
  Sparkles,
  AlertTriangle,
  LogOut,
  ChevronRight,
  Clock,
  Compass,
  CreditCard,
  Bell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { PWAInstallButton } from '../common/PWAInstallButton';

export type CustomerTabType = 'HOME' | 'BOOKINGS' | 'ACTIVITY' | 'PROFILE' | 'SUPPORT';

interface CustomerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: CustomerTabType;
  onSelectTab: (tab: CustomerTabType) => void;
  onOpenBooking: () => void;
  onTriggerSos: () => void;
  selectedArea: string;
  onSelectArea: (area: string) => void;
  mumbaiAreas: string[];
}

export const CustomerDrawer: React.FC<CustomerDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenBooking,
  onTriggerSos,
  selectedArea,
  onSelectArea,
  mumbaiAreas
}) => {
  const { currentUser, customerProfile, logoutCustomer } = useAuth();
  const { activeBooking, bookings, pushPermission, requestPushNotificationPermission } = useBooking();

  if (!isOpen) return null;

  const displayName = currentUser?.name || customerProfile?.name || 'Customer';
  const displayPhone = currentUser?.phone || customerProfile?.phone || '+91 98200 12345';
  const userInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CU';

  const menuItems: {
    id: CustomerTabType;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'HOME',
      label: 'HOME',
      sublabel: 'Book verified hourly assistants',
      icon: <Home className="w-5 h-5" />
    },
    {
      id: 'BOOKINGS',
      label: 'MY BOOKINGS',
      sublabel: 'Active, upcoming & past invoices',
      icon: <Calendar className="w-5 h-5" />,
      badge: bookings.length > 0 ? bookings.length : undefined,
      badgeColor: 'bg-gray-800 text-white'
    },
    {
      id: 'ACTIVITY',
      label: 'LIVE ASSISTANCE',
      sublabel: 'Track assistant in realtime via GPS',
      icon: <Activity className="w-5 h-5" />,
      badge: activeBooking ? 'LIVE' : undefined,
      badgeColor: 'bg-[#10B981] text-white animate-pulse'
    },
    {
      id: 'PROFILE',
      label: 'MY PROFILE',
      sublabel: 'Addresses, wallet & personal details',
      icon: <User className="w-5 h-5" />
    },
    {
      id: 'SUPPORT',
      label: 'HELP & SUPPORT',
      sublabel: '24x7 helpline & WhatsApp resolution',
      icon: <HelpCircle className="w-5 h-5" />
    }
  ];

  return (
    <div id="customer-drawer-overlay" className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        id="customer-drawer-backdrop"
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        id="customer-drawer-container"
        className="relative w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-left duration-250 ease-out"
      >
        {/* Drawer Header (Customer Profile Card & DIBLO Branding) */}
        <div id="customer-drawer-header" className="bg-[#14213D] text-white p-5 border-b border-gray-800">
          {/* DIBLO Brand Logo & Close Button */}
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/10">
            <div id="customer-drawer-brand-logo" className="flex items-baseline gap-1.5 select-none">
              <span className="text-2xl font-black text-[#F42F73] tracking-tighter lowercase">
                diblo
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F42F73]/20 text-[#F42F73] border border-[#F42F73]/30 px-1.5 py-0.5 rounded">
                Customer
              </span>
            </div>

            <button
              id="customer-drawer-close-btn"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-white/10 cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Card */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                id="customer-drawer-avatar"
                className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#F42F73] to-[#FF6B97] text-white font-extrabold text-base flex items-center justify-center border-2 border-emerald-400 shadow-md select-none"
              >
                {userInitials}
              </div>
              <span
                id="customer-drawer-online-dot"
                className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#14213D] bg-emerald-500"
                title="Active Session"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div id="customer-drawer-name" className="font-extrabold text-base text-white leading-tight truncate">
                {displayName}
              </div>
              <div id="customer-drawer-phone" className="text-xs text-gray-300 font-mono mt-0.5 truncate">
                {displayPhone}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span id="customer-drawer-verified-badge" className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Verified Member</span>
                </span>
              </div>
            </div>
          </div>

          {/* Status & Live Booking Strip */}
          <div id="customer-drawer-status-bar" className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-gray-400">Current Zone:</span>
            <span className="font-semibold text-gray-200 truncate max-w-[170px] text-right">
              {selectedArea.split(',')[0]}
            </span>
          </div>
        </div>

        {/* Menu Navigation Items */}
        <div id="customer-drawer-nav-list" className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-3 pt-2 pb-1">
            Menu Navigation
          </div>

          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const itemIdSlug = item.id.toLowerCase().replace(/_/g, '-');
            return (
              <button
                key={item.id}
                id={`customer-nav-${itemIdSlug}`}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all min-h-[50px] cursor-pointer ${
                  isActive
                    ? 'bg-[#FFF0F5] text-[#F42F73] font-black shadow-2xs'
                    : 'text-[#14213D] hover:bg-gray-50 font-bold'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-[#F42F73] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm tracking-wide">{item.label}</div>
                    {item.sublabel && (
                      <div className="text-[10px] text-gray-400 font-normal">
                        {item.sublabel}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        item.badgeColor || 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#F42F73]' : 'text-gray-400'}`} />
                </div>
              </button>
            );
          })}

          {/* Mumbai Operating Zones Selector inside Drawer */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Operating Zone
              </span>
              <span className="text-[10px] font-bold text-[#F42F73]">Mumbai</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 px-1">
              {mumbaiAreas.slice(0, 6).map((area) => {
                const isSelected = selectedArea === area;
                return (
                  <button
                    key={area}
                    onClick={() => onSelectArea(area)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold text-left truncate transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F42F73] text-white font-bold shadow-2xs'
                        : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {area.split(',')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Notification Settings Option */}
          <div className="mt-4 pt-2 border-t border-gray-100 px-1">
            <button
              onClick={() => {
                if (pushPermission !== 'granted') {
                  requestPushNotificationPermission();
                }
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-[#F42F73]">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-800">Booking Alerts</div>
                  <div className="text-[10px] text-gray-500">
                    {pushPermission === 'granted' ? 'Enabled' : 'Click to enable alerts'}
                  </div>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                pushPermission === 'granted' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
              }`}>
                {pushPermission === 'granted' ? 'ON' : 'ENABLE'}
              </span>
            </button>
          </div>
        </div>

        {/* Drawer Action Footer */}
        <div id="customer-drawer-footer" className="p-3 border-t border-gray-100 bg-gray-50/80 space-y-2">
          {/* Primary Book Assistant Button */}
          <button
            id="customer-drawer-book-btn"
            onClick={() => {
              onClose();
              onOpenBooking();
            }}
            className="w-full py-3 bg-[#F42F73] hover:bg-[#D81B60] text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-[#F42F73]/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <Sparkles className="w-4 h-4" />
            <span>Book Assistant @ ₹149/hr</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            {/* Direct Helpline */}
            <a
              id="customer-drawer-helpline-link"
              href="tel:8291919829"
              className="flex items-center justify-center gap-1.5 py-2.5 bg-white border border-gray-200 text-[#14213D] rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Helpline</span>
            </a>

            {/* Emergency SOS Button */}
            <button
              id="customer-drawer-sos-btn"
              onClick={() => {
                onClose();
                onTriggerSos();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SOS Desk</span>
            </button>
          </div>

          {/* Logout / Switch Account */}
          <button
            id="customer-drawer-logout-btn"
            onClick={async () => {
              onClose();
              await logoutCustomer();
            }}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-rose-600 font-semibold py-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
