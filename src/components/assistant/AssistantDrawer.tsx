import React from 'react';
import {
  Home,
  Package,
  Zap,
  TrendingUp,
  CreditCard,
  Bell,
  MapPin,
  User,
  FileText,
  HelpCircle,
  LogOut,
  X,
  ShieldCheck,
  Power
} from 'lucide-react';
import { AssistantProfile } from '../../types';

export type AssistantSection =
  | 'HOME'
  | 'MY_ORDERS'
  | 'NEW_ORDERS'
  | 'EARNINGS'
  | 'PAYMENTS'
  | 'NOTIFICATIONS'
  | 'MY_LOCATION'
  | 'MY_PROFILE'
  | 'DOCUMENTS'
  | 'HELP_SUPPORT';

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: AssistantSection;
  onSelectSection: (section: AssistantSection) => void;
  assistantProfile: AssistantProfile | null;
  isOnline: boolean;
  unreadNotificationsCount: number;
  newOrdersCount: number;
  onLogout: () => void;
}

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({
  isOpen,
  onClose,
  activeSection,
  onSelectSection,
  assistantProfile,
  isOnline,
  unreadNotificationsCount,
  newOrdersCount,
  onLogout
}) => {
  if (!isOpen) return null;

  const menuItems: {
    id: AssistantSection;
    label: string;
    sublabel?: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'HOME',
      label: 'HOME',
      sublabel: 'Main Dashboard & Active Task',
      icon: <Home className="w-5 h-5" />
    },
    {
      id: 'MY_ORDERS',
      label: 'MY ORDERS',
      sublabel: 'Active, Completed & Cancelled',
      icon: <Package className="w-5 h-5" />
    },
    {
      id: 'NEW_ORDERS',
      label: 'NEW ORDERS',
      sublabel: 'Available in Mumbai West',
      icon: <Zap className="w-5 h-5" />,
      badge: newOrdersCount > 0 ? newOrdersCount : undefined,
      badgeColor: 'bg-[#F42F73] text-white'
    },
    {
      id: 'EARNINGS',
      label: 'EARNINGS',
      sublabel: 'Today, Week & Month Payouts',
      icon: <TrendingUp className="w-5 h-5" />
    },
    {
      id: 'PAYMENTS',
      label: 'PAYMENTS',
      sublabel: 'Cash, Online & Settlements',
      icon: <CreditCard className="w-5 h-5" />
    },
    {
      id: 'NOTIFICATIONS',
      label: 'NOTIFICATIONS',
      sublabel: 'Order Alerts & Diblo Updates',
      icon: <Bell className="w-5 h-5" />,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
      badgeColor: 'bg-emerald-600 text-white'
    },
    {
      id: 'MY_LOCATION',
      label: 'MY LOCATION',
      sublabel: 'GPS Coordinates & Duty Area',
      icon: <MapPin className="w-5 h-5" />
    },
    {
      id: 'MY_PROFILE',
      label: 'MY PROFILE',
      sublabel: 'Assistant ID & Contact Info',
      icon: <User className="w-5 h-5" />
    },
    {
      id: 'DOCUMENTS',
      label: 'DOCUMENTS',
      sublabel: 'Aadhaar, Licence & Verification',
      icon: <FileText className="w-5 h-5" />
    },
    {
      id: 'HELP_SUPPORT',
      label: 'HELP & SUPPORT',
      sublabel: 'Direct Helpline & WhatsApp',
      icon: <HelpCircle className="w-5 h-5" />
    }
  ];

  return (
    <div id="assistant-drawer-overlay" className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        id="assistant-drawer-backdrop"
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        id="assistant-drawer-container"
        className="relative w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-left duration-250 ease-out"
      >
        {/* Drawer Header (Assistant Profile Card & DIBLO Branding) */}
        <div id="assistant-drawer-header" className="bg-[#14213D] text-white p-5 border-b border-gray-800">
          {/* DIBLO Brand Logo & Close Button */}
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/10">
            <div id="assistant-drawer-brand-logo" className="flex items-baseline gap-1.5 select-none">
              <span className="text-2xl font-black text-[#F42F73] tracking-tighter lowercase">
                diblo
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F42F73]/20 text-[#F42F73] border border-[#F42F73]/30 px-1.5 py-0.5 rounded">
                Assistant
              </span>
            </div>

            <button
              id="assistant-drawer-close-btn"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                id="assistant-drawer-avatar"
                src={
                  assistantProfile?.photo ||
                  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80'
                }
                alt={assistantProfile?.name || 'Assistant'}
                className="w-13 h-13 rounded-full object-cover border-2 border-emerald-400 shadow-md"
              />
              <span
                id="assistant-drawer-online-status-dot"
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#14213D] ${
                  isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              />
            </div>

            <div>
              <div id="assistant-drawer-name" className="font-extrabold text-base text-white leading-tight">
                {assistantProfile?.name || 'Rajesh Sharma'}
              </div>
              <div id="assistant-drawer-id" className="text-xs text-gray-300 font-mono mt-0.5">
                ID: {assistantProfile?.id || 'asst-1'}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span id="assistant-drawer-verified-badge" className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Police Verified</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Status Pill */}
          <div id="assistant-drawer-status-bar" className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-gray-400">Current Duty Status:</span>
            <span
              id="assistant-drawer-duty-pill"
              className={`font-black px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1 ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              <Power className="w-3 h-3" />
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </span>
          </div>
        </div>

        {/* Menu Navigation Items */}
        <div id="assistant-drawer-nav-list" className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = activeSection === item.id;
            const itemIdSlug = item.id.toLowerCase().replace(/_/g, '-');
            return (
              <button
                key={item.id}
                id={`assistant-nav-${itemIdSlug}`}
                onClick={() => {
                  onSelectSection(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all min-h-[50px] ${
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

                {item.badge !== undefined && (
                  <span
                    id={`assistant-nav-badge-${itemIdSlug}`}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                      item.badgeColor || 'bg-[#F42F73] text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Drawer Footer with Logout Button */}
        <div id="assistant-drawer-footer" className="p-3 border-t border-gray-100 bg-gray-50/50">
          <button
            id="assistant-nav-logout"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-xs transition-colors min-h-[48px]"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>LOGOUT</span>
          </button>
          <div className="text-center text-[10px] text-gray-400 mt-2 font-mono">
            DIBLO Assistant • v2.4 (Mumbai)
          </div>
        </div>
      </div>
    </div>
  );
};
