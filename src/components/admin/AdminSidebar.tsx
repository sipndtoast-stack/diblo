import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  TrendingUp,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Activity,
  Users,
  UserCheck,
  Building,
  Settings,
  Headphones,
  FileSpreadsheet,
  LogOut,
  X,
  ShieldCheck,
  AlertTriangle,
  Phone,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  AssistantProfile,
  AssistantApplication,
  Society,
  SupportTicket,
  EmergencyAlert
} from '../../types';
import {
  useAdminBookingCounts,
  AdminBookingCounts
} from '../../hooks/useAdminBookingCounts';

export { useAdminBookingCounts };
export type { AdminBookingCounts };

export type AdminTabId =
  | 'OVERVIEW'
  | 'LIVEMAP'
  | 'BOOKINGS'
  | 'ASSISTANTS'
  | 'APPLICATIONS'
  | 'SOCIETIES'
  | 'PRICING'
  | 'SUPPORT'
  | 'SHEETS';

export type AdminBookingFilter = 'ALL' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

export interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AdminTabId;
  bookingFilter?: AdminBookingFilter;
  onSelectTab: (tab: AdminTabId) => void;
  onSelectBookingFilter?: (filter: AdminBookingFilter) => void;
  onOpenLogout: () => void;
  onRefreshData?: () => void;
  assistants?: AssistantProfile[];
  applications?: AssistantApplication[];
  societies?: Society[];
  tickets?: SupportTicket[];
  emergencyAlerts?: EmergencyAlert[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  bookingFilter = 'ALL',
  onSelectTab,
  onSelectBookingFilter,
  onOpenLogout,
  onRefreshData,
  assistants = [],
  applications = [],
  societies = [],
  tickets = [],
  emergencyAlerts = []
}) => {
  const { staffUser, currentUser } = useAuth();

  // Real-time Firestore booking counts for Upcoming, Active, and Completed
  const {
    upcomingCount,
    activeCount,
    completedCount,
    totalBookingsCount
  } = useAdminBookingCounts();

  const isBookingsActive = activeTab === 'BOOKINGS';
  const [isBookingsExpanded, setIsBookingsExpanded] = useState<boolean>(true);

  useEffect(() => {
    if (isBookingsActive) {
      setIsBookingsExpanded(true);
    }
  }, [isBookingsActive]);

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

  const adminName = staffUser?.name || currentUser?.name || 'Operations Admin';
  const adminEplId = staffUser?.eplId || 'ADMIN-MUM';
  const adminPhone = staffUser?.number || currentUser?.phone || '';
  const initials =
    adminName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AD';

  const onlineAssistantsCount = assistants.filter((a) => a.isOnline).length;
  const pendingApplicationsCount = applications.filter((a) => a.status === 'PENDING').length;
  const activeSosCount = emergencyAlerts.filter((a) => a.status === 'ACTIVE').length;
  const openTicketsCount = tickets.filter((t) => t.status !== 'RESOLVED').length;

  const handleSelectBookingSubFilter = (filter: AdminBookingFilter) => {
    if (onSelectBookingFilter) {
      onSelectBookingFilter(filter);
    } else {
      onSelectTab('BOOKINGS');
    }
    onClose();
  };

  const sidebarContent = (
    <div
      id="admin-sidebar-overlay"
      className={`fixed inset-0 z-50 flex transition-all duration-300 ${
        isOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Subtle Dark Backdrop / Overlay: Clicking outside closes sidebar */}
      <div
        id="admin-sidebar-backdrop"
        className={`fixed inset-0 bg-black/55 backdrop-blur-[1px] transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Sidebar Container (80-85% width on mobile, smooth drawer on desktop) */}
      <aside
        id="admin-sidebar-container"
        role="dialog"
        aria-modal="true"
        aria-label="Admin Portal Navigation"
        className={`relative w-[82vw] max-w-[320px] sm:w-80 sm:max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden transform transition-transform duration-300 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Brand & Close Header (Mirrors CustomerSidebar / CustomerDrawer) */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#FFF0F5]/70 via-white to-white">
          <div
            onClick={() => {
              onSelectTab('OVERVIEW');
              onClose();
            }}
            className="flex items-baseline gap-1.5 select-none cursor-pointer group"
          >
            <span className="text-2xl font-black text-[#F42F73] tracking-tighter lowercase group-hover:opacity-90 transition-opacity">
              diblo
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#FFF0F5] text-[#F42F73] border border-rose-200 px-2 py-0.5 rounded-md">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Mumbai</span>
            </span>

            <button
              id="admin-sidebar-close-btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
              aria-label="Close Admin Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Admin Profile Summary Card */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/60">
          <div
            onClick={() => {
              onSelectTab('OVERVIEW');
              onClose();
            }}
            className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:border-rose-200 transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-full bg-[#14213D] text-white font-black text-sm flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-[#F42F73]/20">
              <span>{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-[#14213D] truncate group-hover:text-[#F42F73] transition-colors">
                  {adminName}
                </span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </div>
              <div className="text-xs text-gray-500 font-medium truncate">
                {adminEplId}
                {adminPhone
                  ? ` • +91 ${adminPhone.replace('+91', '').trim()}`
                  : ' • Operations Lead'}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#F42F73] transition-colors shrink-0" />
          </div>
        </div>

        {/* Scrollable Navigation Content */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-5">
          {/* Primary Administrative Navigation Items */}
          <nav aria-label="Admin Sidebar Navigation" className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
              Navigation
            </div>

            {/* 1. DASHBOARD */}
            <button
              id="admin-sidebar-nav-dashboard"
              type="button"
              onClick={() => {
                onSelectTab('OVERVIEW');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    activeTab === 'OVERVIEW'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                </span>
                <span className="truncate">Dashboard</span>
              </div>
            </button>

            {/* 2. BOOKINGS & REQUESTS (Expandable: All, Upcoming, Active, Completed with real-time Firestore counts) */}
            <div className="space-y-1">
              <div
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                  isBookingsActive
                    ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                    : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
                }`}
              >
                <button
                  id="admin-sidebar-nav-bookings"
                  type="button"
                  onClick={() => {
                    setIsBookingsExpanded((prev) => !prev);
                  }}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95"
                >
                  <span
                    className={`p-2 rounded-xl transition-colors ${
                      isBookingsActive
                        ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                  </span>
                  <span className="truncate">Manage Bookings</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <span
                    data-testid="admin-sidebar-total-bookings-count"
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isBookingsActive
                        ? 'bg-[#F42F73] text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {totalBookingsCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsBookingsExpanded((prev) => !prev)}
                    className="p-1 rounded-lg hover:bg-rose-100/60 text-gray-500 cursor-pointer transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95"
                    aria-label={isBookingsExpanded ? 'Collapse Bookings' : 'Expand Bookings'}
                  >
                    {isBookingsExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sub-items: All Requests, Upcoming, Active, Completed */}
              {isBookingsExpanded && (
                <div className="pl-5 pr-1 py-1 space-y-1 border-l-2 border-rose-100 ml-5">
                  {/* All Requests */}
                  <button
                    id="admin-sidebar-bookings-all"
                    type="button"
                    onClick={() => handleSelectBookingSubFilter('ALL')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                      isBookingsActive && bookingFilter === 'ALL'
                        ? 'bg-[#F42F73] text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-[#14213D]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" />
                      <span>All Requests</span>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isBookingsActive && bookingFilter === 'ALL'
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {totalBookingsCount}
                    </span>
                  </button>

                  {/* Upcoming */}
                  <button
                    id="admin-sidebar-bookings-upcoming"
                    type="button"
                    onClick={() => handleSelectBookingSubFilter('UPCOMING')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                      isBookingsActive && bookingFilter === 'UPCOMING'
                        ? 'bg-[#F42F73] text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-[#14213D]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Upcoming</span>
                    </div>
                    <span
                      data-testid="admin-sidebar-upcoming-count"
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isBookingsActive && bookingFilter === 'UPCOMING'
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {upcomingCount}
                    </span>
                  </button>

                  {/* Active */}
                  <button
                    id="admin-sidebar-bookings-active"
                    type="button"
                    onClick={() => handleSelectBookingSubFilter('ACTIVE')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                      isBookingsActive && bookingFilter === 'ACTIVE'
                        ? 'bg-[#F42F73] text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-[#14213D]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </div>
                    <span
                      data-testid="admin-sidebar-active-count"
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isBookingsActive && bookingFilter === 'ACTIVE'
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
                    id="admin-sidebar-bookings-completed"
                    type="button"
                    onClick={() => handleSelectBookingSubFilter('COMPLETED')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                      isBookingsActive && bookingFilter === 'COMPLETED'
                        ? 'bg-[#F42F73] text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-[#14213D]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Completed</span>
                    </div>
                    <span
                      data-testid="admin-sidebar-completed-count"
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isBookingsActive && bookingFilter === 'COMPLETED'
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

            {/* 3. MANAGE ASSISTANTS */}
            <button
              id="admin-sidebar-nav-assistants"
              type="button"
              onClick={() => {
                onSelectTab('ASSISTANTS');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                activeTab === 'ASSISTANTS'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    activeTab === 'ASSISTANTS'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </span>
                <span className="truncate">Manage Assistants</span>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  activeTab === 'ASSISTANTS'
                    ? 'bg-[#F42F73] text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {assistants.length}
              </span>
            </button>

            {/* 4. ASSISTANT APPLICATIONS */}
            <button
              id="admin-sidebar-nav-applications"
              type="button"
              onClick={() => {
                onSelectTab('APPLICATIONS');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                activeTab === 'APPLICATIONS'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    activeTab === 'APPLICATIONS'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                </span>
                <span className="truncate">New Applications</span>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  activeTab === 'APPLICATIONS'
                    ? 'bg-[#F42F73] text-white'
                    : pendingApplicationsCount > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {pendingApplicationsCount}
              </span>
            </button>

            {/* 5. MUMBAI RADAR MAP */}
            <button
              id="admin-sidebar-nav-livemap"
              type="button"
              onClick={() => {
                onSelectTab('LIVEMAP');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                activeTab === 'LIVEMAP'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    activeTab === 'LIVEMAP'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                </span>
                <span className="truncate">Mumbai Radar Map</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                LIVE
              </span>
            </button>

            {/* 6. PARTNER SOCIETIES */}
            <button
              id="admin-sidebar-nav-societies"
              type="button"
              onClick={() => {
                onSelectTab('SOCIETIES');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                activeTab === 'SOCIETIES'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    activeTab === 'SOCIETIES'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Building className="w-4 h-4" />
                </span>
                <span className="truncate">Partner Societies</span>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  activeTab === 'SOCIETIES'
                    ? 'bg-[#F42F73] text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {societies.length}
              </span>
            </button>

            {/* 7. SYSTEM SETTINGS & PRICING */}
            <button
              id="admin-sidebar-nav-settings"
              type="button"
              onClick={() => {
                onSelectTab('PRICING');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                activeTab === 'PRICING'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    activeTab === 'PRICING'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                </span>
                <span className="truncate">System Settings</span>
              </div>
            </button>

            {/* 8. SUPPORT & SOS DESK */}
            <button
              id="admin-sidebar-nav-support"
              type="button"
              onClick={() => {
                onSelectTab('SUPPORT');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                activeTab === 'SUPPORT'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : activeSosCount > 0
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    activeTab === 'SUPPORT'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : activeSosCount > 0
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {activeSosCount > 0 ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Headphones className="w-4 h-4" />
                  )}
                </span>
                <span className="truncate">
                  {activeSosCount > 0 ? 'SOS & Support Desk' : 'Support & SOS'}
                </span>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  activeSosCount > 0
                    ? 'bg-red-600 text-white animate-pulse'
                    : activeTab === 'SUPPORT'
                    ? 'bg-[#F42F73] text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {activeSosCount > 0 ? `${activeSosCount} SOS` : openTicketsCount || tickets.length}
              </span>
            </button>

            {/* 9. GOOGLE SHEETS & SYNC */}
            <button
              id="admin-sidebar-nav-sheets"
              type="button"
              onClick={() => {
                onSelectTab('SHEETS');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transform transition-all transition-transform duration-200 ease-in-out hover:scale-105 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                activeTab === 'SHEETS'
                  ? 'bg-[#FFF0F5] text-[#F42F73] shadow-2xs border border-rose-200/70'
                  : 'text-[#14213D] hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`p-2 rounded-xl transition-colors ${
                    activeTab === 'SHEETS'
                      ? 'bg-[#F42F73] text-white shadow-xs shadow-[#F42F73]/30'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </span>
                <span className="truncate">Google Sheets & Sync</span>
              </div>
            </button>
          </nav>

          {/* Live Mumbai Fleet Status Summary */}
          <div className="pt-2 border-t border-gray-100">
            <div className="px-3 pb-2 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-[#F42F73]" />
              <span>Mumbai Fleet Status</span>
            </div>
            <div className="mx-2 p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-[#14213D]">Assistants Online</span>
              </div>
              <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                {onlineAssistantsCount} / {assistants.length}
              </span>
            </div>
          </div>

          {/* Logout Option */}
          <div className="pt-2 border-t border-gray-100">
            <button
              id="admin-sidebar-logout-btn"
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
          {onRefreshData && (
            <button
              type="button"
              onClick={() => {
                onRefreshData();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#F42F73]/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sync Live Platform Data</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <a
              href="tel:8291919829"
              className="py-2 px-3 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-[#14213D] font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Ops Helpline</span>
            </a>
            <button
              type="button"
              onClick={() => {
                onSelectTab('SUPPORT');
                onClose();
              }}
              className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>SOS Desk ({activeSosCount})</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(sidebarContent, document.body);
  }

  return sidebarContent;
};
