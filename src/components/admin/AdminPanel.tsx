import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  MapPin,
  DollarSign,
  TrendingUp,
  Tag,
  Building,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  Plus,
  Edit2,
  FileCheck,
  Search,
  ArrowUpRight,
  LogOut,
  UserCheck,
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
  Radio,
  ExternalLink,
  Navigation,
  Phone
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { MapView } from '../common/MapView';
import { AdminBookingsMap } from '../maps/AdminBookingsMap';
import { GoogleSheetsHub } from './GoogleSheetsHub';
import {
  AssistantProfile,
  CustomerProfile,
  Society,
  Coupon,
  PricingConfig,
  SupportTicket,
  PlatformAnalytics,
  Booking,
  AssistantApplication,
  EmergencyAlert
} from '../../types';

export const AdminPanel: React.FC = () => {
  const { logoutStaff, staffUser } = useAuth();
  const { bookings, refreshBookings } = useBooking();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LIVEMAP' | 'BOOKINGS' | 'ASSISTANTS' | 'APPLICATIONS' | 'SOCIETIES' | 'PRICING' | 'SUPPORT' | 'SHEETS'>('OVERVIEW');

  // State entities
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [assistants, setAssistants] = useState<AssistantProfile[]>([]);
  const [applications, setApplications] = useState<AssistantApplication[]>([]);
  const [reviewingApp, setReviewingApp] = useState<AssistantApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [societies, setSocieties] = useState<Society[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);

  // Pricing edit form
  const [baseHourlyRate, setBaseHourlyRate] = useState<number>(149);
  const [minimumHours, setMinimumHours] = useState<number>(2);
  const [pricingSaveSuccess, setPricingSaveSuccess] = useState(false);

  // New coupon form
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState<number>(100);
  const [newCouponType, setNewCouponType] = useState<'FLAT' | 'PERCENT'>('FLAT');

  // New society form
  const [showAddSociety, setShowAddSociety] = useState(false);
  const [newSocietyName, setNewSocietyName] = useState('');
  const [newSocietyArea, setNewSocietyArea] = useState('Bandra West');
  const [newSocietyFlats, setNewSocietyFlats] = useState(250);

  // Map view mode toggle (Service Request Markers vs Assistant Fleet)
  const [mapViewMode, setMapViewMode] = useState<'REQUESTS' | 'FLEET'>('REQUESTS');

  // Support ticket reply
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');

  // Quick poll for emergency SOS alerts
  const loadEmergencyAlertsOnly = async () => {
    try {
      const emgRes = await api.getEmergencyAlerts();
      if (emgRes && emgRes.alerts) {
        setEmergencyAlerts(emgRes.alerts);
      }
    } catch (e) {
      console.error('Error polling emergency alerts:', e);
    }
  };

  // Load all admin data
  const loadAdminData = async () => {
    try {
      const [analyticsData, asstsData, socsData, coupData, priceData, tktData, appsData, emgData] = await Promise.all([
        api.getAnalytics(),
        api.getAssistants(),
        api.getSocieties(),
        api.getCoupons(),
        api.getPricing(),
        api.getSupportTickets(),
        api.getAssistantApplications().catch(() => ({ success: false, applications: [] })),
        api.getEmergencyAlerts().catch(() => ({ success: false, alerts: [], activeCount: 0 }))
      ]);
      setAnalytics(analyticsData);
      setAssistants(asstsData);
      setSocieties(socsData);
      setCoupons(coupData);
      setPricing(priceData);
      setTickets(tktData);
      setApplications(appsData && 'applications' in appsData ? appsData.applications : []);
      if (emgData && 'alerts' in emgData) {
        setEmergencyAlerts(emgData.alerts);
      }
      if (priceData) {
        setBaseHourlyRate(priceData.baseHourlyPrice);
        setMinimumHours(priceData.minimumBookingHours);
      }
    } catch (e) {
      console.error('Failed to load admin dataset', e);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.acknowledgeEmergencyAlert(alertId);
      await loadEmergencyAlertsOnly();
    } catch (e) {
      console.error('Failed to acknowledge alert:', e);
    }
  };

  const handleResolveAlert = async (alertId: string, notes?: string) => {
    try {
      await api.resolveEmergencyAlert(alertId, notes || 'Resolved by Admin Operations', staffUser?.name);
      await loadEmergencyAlertsOnly();
      const updatedTickets = await api.getSupportTickets();
      setTickets(updatedTickets);
    } catch (e) {
      console.error('Failed to resolve emergency alert:', e);
    }
  };

  const handleReviewApplication = async (applicationId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const action = status === 'APPROVED' ? 'APPROVE' : 'REJECT';
      await api.reviewAssistantApplication(applicationId, action, reviewNotes || undefined);
      setReviewingApp(null);
      setReviewNotes('');
      await loadAdminData();
    } catch (e) {
      console.error('Failed to review assistant application', e);
    }
  };

  useEffect(() => {
    loadAdminData();
    // Poll emergency alerts every 10 seconds to catch new customer SOS dispatches in real time
    const interval = setInterval(() => {
      loadEmergencyAlertsOnly();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSavePricing = async () => {
    try {
      await api.updatePricing({ baseHourlyPrice: baseHourlyRate, minimumBookingHours: minimumHours });
      setPricingSaveSuccess(true);
      setTimeout(() => setPricingSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCoupon = async () => {
    if (!newCouponCode.trim()) return;
    try {
      await api.createCoupon({
        code: newCouponCode.toUpperCase(),
        flatDiscount: newCouponType === 'FLAT' ? newCouponDiscount : undefined,
        discountPercentage: newCouponType === 'PERCENT' ? newCouponDiscount : undefined,
        maxDiscount: 200,
        minBookingHours: 2,
        expiryDate: '2026-12-31',
        usageLimit: 500,
        usedCount: 0,
        isActive: true,
        description: `₹${newCouponDiscount} Special Discount`
      });
      setShowAddCoupon(false);
      setNewCouponCode('');
      loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSociety = async () => {
    if (!newSocietyName.trim()) return;
    try {
      await api.createSociety({
        name: newSocietyName,
        address: `${newSocietyName}, ${newSocietyArea}, Mumbai`,
        area: newSocietyArea,
        pinCode: '400050',
        secretaryName: 'Operations Lead',
        managerName: 'Society Manager',
        contactPhone: '9820000000',
        contactEmail: 'contact@society.in',
        residentsCount: newSocietyFlats,
        partnershipStatus: 'PARTNERED',
        agreementStatus: 'SIGNED',
        assignedAssistantsCount: 2,
        bookingsCount: 0,
        revenueGenerated: 0
      });
      setShowAddSociety(false);
      setNewSocietyName('');
      loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePoliceVerified = async (assistantId: string, currentVal: boolean) => {
    try {
      await api.updateAssistantStatus(assistantId, { policeVerified: !currentVal });
      loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendTicketReply = async () => {
    if (!selectedTicket || !ticketReplyText.trim()) return;
    try {
      await api.replySupportTicket(selectedTicket.id, {
        text: ticketReplyText,
        senderId: 'admin-1',
        senderName: 'Diblo Ops Admin',
        senderRole: 'ADMIN',
        status: 'RESOLVED'
      });
      setTicketReplyText('');
      setSelectedTicket(null);
      loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const chartColors = ['#F42F73', '#14213D', '#10B981', '#F59E0B', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-[#14213D] pb-24 md:pb-16">
      {/* Top Admin Bar */}
      <header className="sticky top-0 z-30 bg-[#14213D] text-white border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-xl font-black text-[#F42F73] lowercase tracking-tight">diblo</div>
            <span className="text-gray-400">/</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Central Mumbai Operations Admin</span>
              <span className="bg-white/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-white/10">
                LIVE PRODUCTION
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-300">
            <div className="hidden sm:flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{assistants.filter((a) => a.isOnline).length} Assistants Online</span>
            </div>

            {staffUser && (
              <div className="hidden md:flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/10 text-white font-medium">
                <span>{staffUser.name}</span>
                <span className="text-[10px] text-gray-300">({staffUser.eplId})</span>
              </div>
            )}

            <button
              onClick={() => logoutStaff()}
              className="flex items-center gap-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs"
              title="Log out of Assistance"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto text-xs font-bold scrollbar-none border-t border-white/5 py-1">
          {[
            { id: 'OVERVIEW', label: 'Platform Dashboard', icon: TrendingUp },
            { id: 'LIVEMAP', label: 'Mumbai Radar Map', icon: MapPin },
            { id: 'BOOKINGS', label: `All Bookings (${bookings.length})`, icon: Clock },
            { id: 'ASSISTANTS', label: `Assistants & KYC (${assistants.length})`, icon: Users },
            { id: 'APPLICATIONS', label: `New Applications (${applications.filter(a => a.status === 'PENDING').length})`, icon: UserCheck },
            { id: 'SOCIETIES', label: `Societies (${societies.length})`, icon: Building },
            { id: 'PRICING', label: 'Pricing & Coupons', icon: DollarSign },
            {
              id: 'SUPPORT',
              label: emergencyAlerts.some((a) => a.status === 'ACTIVE')
                ? `🚨 SOS (${emergencyAlerts.filter((a) => a.status === 'ACTIVE').length}) & Support`
                : `Support & SOS (${tickets.length})`,
              icon: emergencyAlerts.some((a) => a.status === 'ACTIVE') ? AlertTriangle : Headphones,
              isEmergency: emergencyAlerts.some((a) => a.status === 'ACTIVE')
            },
            { id: 'SHEETS', label: 'Google Sheets & Sync', icon: FileSpreadsheet }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isEmergency = 'isEmergency' in tab && tab.isEmergency;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#F42F73] text-white shadow-sm'
                    : isEmergency
                    ? 'bg-red-600 text-white animate-pulse font-black'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Admin Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ACTIVE SOS DISTRESS ALERT BANNER */}
        {emergencyAlerts.some((a) => a.status === 'ACTIVE') && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-4 sm:p-5 rounded-3xl shadow-xl border-2 border-red-400 space-y-3 animate-pulse">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white text-red-600 flex items-center justify-center font-black text-xl shrink-0 shadow">
                  🚨
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-wide uppercase">
                      Active Emergency SOS Distress Alert
                    </h3>
                    <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Live GPS Distress
                    </span>
                  </div>
                  <p className="text-xs text-red-100">
                    Distress alert transmitted from customer interface. Operator intervention and emergency dispatch requested.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('SUPPORT')}
                className="px-4 py-2 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs font-black shadow transition-all whitespace-nowrap cursor-pointer"
              >
                Open SOS Desk ({emergencyAlerts.filter((a) => a.status === 'ACTIVE').length} Active)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {emergencyAlerts
                .filter((a) => a.status === 'ACTIVE')
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-black/30 backdrop-blur-sm rounded-2xl p-3.5 border border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-red-200">{alert.alertNumber}</span>
                        <span className="font-black text-sm text-white">{alert.userName}</span>
                        <span className="text-red-200 text-xs font-semibold">({alert.userPhone})</span>
                      </div>
                      <div className="text-[11px] text-red-100 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-300 shrink-0" />
                        <span className="font-medium">
                          {alert.address || 'Mumbai'} (Lat {alert.lat.toFixed(5)}, Lng {alert.lng.toFixed(5)} ±{alert.accuracy || 15}m)
                        </span>
                      </div>
                      <div className="text-[10px] text-red-200">
                        Triggered: {new Date(alert.timestamp).toLocaleTimeString('en-IN')} IST
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <a
                        href={`https://www.google.com/maps?q=${alert.lat},${alert.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
                        title="Open in Google Maps"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Map</span>
                      </a>
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-900 font-black text-[11px] transition-colors cursor-pointer"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-gray-900 font-black text-[11px] transition-colors cursor-pointer"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {/* ========================================================= */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
                <div className="text-gray-400 text-xs font-bold uppercase">Total Bookings</div>
                <div className="text-2xl font-black text-[#14213D]">{analytics?.totalBookings || 1248}</div>
                <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+28% this week in Mumbai</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
                <div className="text-gray-400 text-xs font-bold uppercase">Gross GMV Revenue</div>
                <div className="text-2xl font-black text-[#F42F73]">₹{(analytics?.totalRevenue || 524000).toLocaleString('en-IN')}</div>
                <div className="text-xs text-emerald-600 font-semibold">100% Razorpay Settled</div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
                <div className="text-gray-400 text-xs font-bold uppercase">Active Assistants</div>
                <div className="text-2xl font-black text-emerald-600">{analytics?.activeAssistants || 48}</div>
                <div className="text-xs text-gray-500">100% Police Verified</div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
                <div className="text-gray-400 text-xs font-bold uppercase">Average Customer Rating</div>
                <div className="text-2xl font-black text-amber-500">4.91 ★</div>
                <div className="text-xs text-gray-500">Based on 890+ ratings</div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Booking Trend Chart */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#14213D]">Mumbai Daily Bookings Trend</h3>
                  <span className="text-xs text-gray-400">Last 7 Days</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.dailyTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="bookings" stroke="#F42F73" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Assistance Categories Breakdown */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#14213D]">Bookings by Category (Mumbai)</h3>
                  <span className="text-xs text-gray-400">Total Volume</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.servicePopularity || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#14213D" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: LIVE MAP RADAR & SERVICE REQUEST DISPATCH */}
        {/* ========================================================= */}
        {activeTab === 'LIVEMAP' && (
          <div className="space-y-4">
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#14213D]">
                  {mapViewMode === 'REQUESTS' ? 'Service Request Location Dispatch Map' : 'Mumbai Live Assistant Fleet Radar'}
                </h2>
                <p className="text-xs text-gray-500">
                  {mapViewMode === 'REQUESTS'
                    ? 'Geospatial distribution of customer bookings, request IDs, service types, and live statuses'
                    : 'Real-time GPS status of all registered assistants across Mumbai'}
                </p>
              </div>

              {/* Toggle Mode */}
              <div className="flex items-center gap-2">
                <div className="bg-gray-100 p-1 rounded-2xl flex items-center">
                  <button
                    onClick={() => setMapViewMode('REQUESTS')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      mapViewMode === 'REQUESTS'
                        ? 'bg-[#F42F73] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Service Requests ({bookings.length})
                  </button>
                  <button
                    onClick={() => setMapViewMode('FLEET')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      mapViewMode === 'FLEET'
                        ? 'bg-[#14213D] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Assistant Fleet ({assistants.length})
                  </button>
                </div>
              </div>
            </div>

            {mapViewMode === 'REQUESTS' ? (
              <AdminBookingsMap
                bookings={bookings}
                height="550px"
              />
            ) : (
              <div className="space-y-4">
                <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between text-xs font-semibold">
                  <span className="text-gray-500">Fleet Status Indicator</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                      <span>On Active Task</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" />
                      <span>Offline</span>
                    </div>
                  </div>
                </div>

                <MapView
                  allAssistants={assistants.map((a) => ({
                    id: a.id,
                    name: a.name,
                    photo: a.photo,
                    rating: a.rating,
                    lat: a.currentLocation.lat,
                    lng: a.currentLocation.lng,
                    isOnline: a.isOnline,
                    activeBookingId: a.activeBookingId,
                    serviceArea: a.serviceArea
                  }))}
                  height="550px"
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ALL BOOKINGS MANAGER */}
        {/* ========================================================= */}
        {activeTab === 'BOOKINGS' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold">Master Bookings Registry</h3>
                <p className="text-xs text-gray-500">Real-time dispatch, status overrides, and verification logs</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">Booking ID</th>
                    <th className="py-3 px-3">Service</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Assistant</th>
                    <th className="py-3 px-3">Date & Slot</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Start OTP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-[#14213D]">{b.bookingNumber}</td>
                      <td className="py-3.5 px-3 font-bold text-[#14213D]">{b.serviceName}</td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold">{b.customerName}</div>
                        <div className="text-[11px] text-gray-500">+91 {b.customerPhone}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-gray-800">{b.assistantName || 'Unassigned'}</div>
                        <div className="text-[10px] text-gray-400">{b.location.area}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div>{b.scheduledDate}</div>
                        <div className="text-gray-400">{b.startTime} ({b.totalHours} hrs)</div>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-[#F42F73]">₹{b.totalAmount}</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            b.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-[#FFF0F5] text-[#F42F73]'
                          }`}
                        >
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-gray-700">{b.startOtp || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: ASSISTANTS & POLICE KYC */}
        {/* ========================================================= */}
        {activeTab === 'ASSISTANTS' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold">Assistant Fleet & Police Clearance Pipeline</h3>
              <p className="text-xs text-gray-500">Every assistant is audited for Aadhaar, address verification, and Mumbai police NOC.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {assistants.map((asst) => (
                <div key={asst.id} className="p-5 rounded-3xl border border-gray-100 bg-gray-50/50 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <img src={asst.photo} alt={asst.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm" />
                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          asst.policeVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {asst.policeVerified ? '✓ POLICE VERIFIED' : 'KYC PENDING'}
                      </span>
                      <div className="text-xs font-bold text-amber-500 mt-1">★ {asst.rating} ({asst.completedTasksCount} tasks)</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-base text-[#14213D]">{asst.name}</h4>
                    <div className="text-xs text-gray-500">+91 {asst.phone} • {asst.email}</div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Operating Areas: {asst.serviceArea.join(', ')}
                    </div>
                  </div>

                  {/* KYC Toggle */}
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-600">Police Clearance Status:</span>
                    <button
                      onClick={() => handleTogglePoliceVerified(asst.id, asst.policeVerified)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                        asst.policeVerified
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-amber-500 text-white hover:bg-amber-600'
                      }`}
                    >
                      {asst.policeVerified ? 'Verified' : 'Approve KYC'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4.5: ASSISTANT ONBOARDING APPLICATIONS */}
        {/* ========================================================= */}
        {activeTab === 'APPLICATIONS' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#14213D]">
                  Assistant Onboarding Pipeline ({applications.length})
                </h3>
                <p className="text-xs text-gray-500">
                  Review 8-step applications submitted by prospective Mumbai assistants. Approving creates an active assistant account with an EPL badge ID.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full font-bold">
                  {applications.filter((a) => a.status === 'PENDING').length} Pending Review
                </span>
                <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-bold">
                  {applications.filter((a) => a.status === 'APPROVED').length} Approved
                </span>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No assistant applications submitted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#14213D]">{app.fullName}</h4>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            app.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {app.status}
                        </span>
                        <span className="text-[11px] text-gray-400">ID: {app.id}</span>
                      </div>

                      <div className="text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                        <span>📞 +91 {app.mobileNumber}</span>
                        <span>✉️ {app.email}</span>
                        <span>📍 {app.mumbaiArea} ({app.pinCode})</span>
                      </div>

                      <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1 pt-1">
                        <span>Aadhaar: <strong className="font-mono text-gray-700">XXXX-XXXX-{app.aadhaarNumber?.slice(-4) || 'XXXX'}</strong></span>
                        <span>PAN: <strong className="font-mono text-gray-700">{app.panNumber || 'N/A'}</strong></span>
                        <span>Zones: {app.preferredOperatingZones?.join(', ') || 'Any'}</span>
                        <span>Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                      </div>

                      {app.adminNotes && (
                        <div className="text-[11px] bg-white p-2 rounded-xl border border-gray-200 text-gray-600 mt-1">
                          <strong>Admin Note:</strong> {app.adminNotes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center">
                      <button
                        onClick={() => {
                          setReviewingApp(app);
                          setReviewNotes(app.adminNotes || '');
                        }}
                        className="px-4 py-2 rounded-xl bg-white border border-gray-300 hover:border-gray-400 text-xs font-bold text-[#14213D] transition-colors"
                      >
                        View Full 8-Step Profile
                      </button>

                      {app.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleReviewApplication(app.id, 'APPROVED')}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve & Create Assistant</span>
                          </button>
                          <button
                            onClick={() => handleReviewApplication(app.id, 'REJECTED')}
                            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Application Detail / Review Modal */}
            {reviewingApp && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 sm:p-8 space-y-5 border border-gray-100 shadow-2xl">
                  <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                    <div>
                      <span className="text-[10px] font-bold text-[#F42F73] uppercase tracking-wider">
                        Diblo Partner Application
                      </span>
                      <h3 className="text-xl font-black text-[#14213D]">{reviewingApp.fullName}</h3>
                      <p className="text-xs text-gray-500">
                        Submitted: {new Date(reviewingApp.appliedAt).toLocaleString()} • Status: <strong className="text-black">{reviewingApp.status}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => setReviewingApp(null)}
                      className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1 bg-gray-50 p-3 rounded-2xl">
                      <div className="font-bold text-gray-400 uppercase text-[10px]">Step 1: Contact & Personal</div>
                      <div><strong>Phone:</strong> +91 {reviewingApp.mobileNumber}</div>
                      <div><strong>Email:</strong> {reviewingApp.email}</div>
                      <div><strong>Address:</strong> {reviewingApp.currentAddress}</div>
                      <div><strong>Area:</strong> {reviewingApp.mumbaiArea}, PIN {reviewingApp.pinCode}</div>
                    </div>

                    <div className="space-y-1 bg-gray-50 p-3 rounded-2xl">
                      <div className="font-bold text-gray-400 uppercase text-[10px]">Step 2: KYC & Identification</div>
                      <div><strong>Aadhaar:</strong> {reviewingApp.aadhaarNumber}</div>
                      <div><strong>PAN:</strong> {reviewingApp.panNumber}</div>
                      <div><strong>Police Clearance:</strong> {reviewingApp.policeClearanceCert}</div>
                    </div>

                    <div className="space-y-1 bg-gray-50 p-3 rounded-2xl">
                      <div className="font-bold text-gray-400 uppercase text-[10px]">Step 3: Skills & Services</div>
                      <div><strong>Languages:</strong> {reviewingApp.languagesSpoken?.join(', ')}</div>
                      <div><strong>Services:</strong> {reviewingApp.selectedServices?.join(', ')}</div>
                      <div><strong>Experience:</strong> {reviewingApp.yearsOfExperience} years</div>
                    </div>

                    <div className="space-y-1 bg-gray-50 p-3 rounded-2xl">
                      <div className="font-bold text-gray-400 uppercase text-[10px]">Step 4: Availability & Vehicle</div>
                      <div><strong>Zones:</strong> {reviewingApp.preferredOperatingZones?.join(', ')}</div>
                      <div><strong>Availability:</strong> {reviewingApp.availabilityType}</div>
                      <div><strong>Two-Wheeler:</strong> {reviewingApp.hasTwoWheeler ? `Yes (DL: ${reviewingApp.drivingLicenseNumber || 'Available'})` : 'No (Public Transit)'}</div>
                    </div>

                    <div className="space-y-1 bg-gray-50 p-3 rounded-2xl">
                      <div className="font-bold text-gray-400 uppercase text-[10px]">Step 5: Emergency & References</div>
                      <div><strong>Contact:</strong> {reviewingApp.emergencyContactName} ({reviewingApp.emergencyContactRelation})</div>
                      <div><strong>Emergency Phone:</strong> +91 {reviewingApp.emergencyContactPhone}</div>
                      <div><strong>Clean Criminal Record:</strong> {!reviewingApp.hasCriminalRecord ? 'Declared Clean' : 'Flagged'}</div>
                    </div>

                    <div className="space-y-1 bg-gray-50 p-3 rounded-2xl">
                      <div className="font-bold text-gray-400 uppercase text-[10px]">Step 6: Payout Bank Account</div>
                      <div><strong>Account Holder:</strong> {reviewingApp.accountHolderName}</div>
                      <div><strong>Bank:</strong> {reviewingApp.bankName}</div>
                      <div><strong>IFSC:</strong> {reviewingApp.bankIfscCode}</div>
                      <div><strong>Account No:</strong> {reviewingApp.bankAccountNumber}</div>
                    </div>
                  </div>

                  {/* Review Action Controls */}
                  <div className="pt-2 border-t border-gray-100 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Admin Internal Notes</label>
                      <input
                        type="text"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="e.g. Verified Aadhaar & Police token in Bandra desk"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleReviewApplication(reviewingApp.id, 'REJECTED')}
                        className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors"
                      >
                        Reject Application
                      </button>
                      <button
                        onClick={() => handleReviewApplication(reviewingApp.id, 'APPROVED')}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve & Generate Assistant EPL Badge</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SOCIETIES & GATED COMMUNITIES */}
        {/* ========================================================= */}
        {activeTab === 'SOCIETIES' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold">Mumbai Residential Societies & Gated Enclaves</h3>
                <p className="text-xs text-gray-500">Partnered societies with designated Diblo assistant pickup points</p>
              </div>
              <button
                onClick={() => setShowAddSociety(true)}
                className="px-4 py-2 rounded-2xl bg-[#F42F73] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Mumbai Society</span>
              </button>
            </div>

            {showAddSociety && (
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Society Name</label>
                    <input
                      type="text"
                      value={newSocietyName}
                      onChange={(e) => setNewSocietyName(e.target.value)}
                      placeholder="e.g. Oberoi Woods"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Mumbai Suburb</label>
                    <input
                      type="text"
                      value={newSocietyArea}
                      onChange={(e) => setNewSocietyArea(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Estimated Flats</label>
                    <input
                      type="number"
                      value={newSocietyFlats}
                      onChange={(e) => setNewSocietyFlats(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateSociety}
                    className="px-4 py-2 bg-[#14213D] text-white text-xs font-bold rounded-xl"
                  >
                    Save Society
                  </button>
                  <button
                    onClick={() => setShowAddSociety(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {societies.map((soc) => (
                <div key={soc.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex items-start gap-3">
                  <Building className="w-5 h-5 text-[#F42F73] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm text-[#14213D]">{soc.name}</div>
                    <div className="text-xs text-gray-500">{soc.area}, Mumbai • {soc.residentsCount} residential flats</div>
                    <div className="text-[10px] text-emerald-600 font-bold mt-1">✓ Verified Gate Pass Enabled</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: DYNAMIC PRICING & COUPONS */}
        {/* ========================================================= */}
        {activeTab === 'PRICING' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dynamic Pricing Config */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold">Dynamic Platform Hourly Rate</h3>
                <p className="text-xs text-gray-500">Live configuration of hourly assistance rates across Mumbai</p>
              </div>

              {pricingSaveSuccess && (
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Pricing updated successfully!</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Base Hourly Rate (₹ / Hour)</label>
                  <input
                    type="number"
                    value={baseHourlyRate}
                    onChange={(e) => setBaseHourlyRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-[#14213D]"
                  />
                  <div className="text-[11px] text-gray-400 mt-1">Standard Diblo rate is flat ₹149/hour</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Minimum Booking Hours</label>
                  <input
                    type="number"
                    value={minimumHours}
                    onChange={(e) => setMinimumHours(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-[#14213D]"
                  />
                  <div className="text-[11px] text-gray-400 mt-1">Default is 2 hours (₹298 minimum)</div>
                </div>

                <button
                  onClick={handleSavePricing}
                  className="w-full py-3 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-bold text-xs shadow-md"
                >
                  Save Pricing Configuration
                </button>
              </div>
            </div>

            {/* Coupons Engine */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold">Promotional Coupons</h3>
                  <p className="text-xs text-gray-500">Discount codes for customer acquisition</p>
                </div>
                <button
                  onClick={() => setShowAddCoupon(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FFF0F5] text-[#F42F73] text-xs font-bold hover:bg-[#F42F73] hover:text-white transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Coupon</span>
                </button>
              </div>

              {showAddCoupon && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1">Code</label>
                      <input
                        type="text"
                        value={newCouponCode}
                        onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                        placeholder="MUMBAI100"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Discount Amount (₹)</label>
                      <input
                        type="number"
                        value={newCouponDiscount}
                        onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateCoupon}
                      className="px-4 py-2 bg-[#14213D] text-white text-xs font-bold rounded-xl"
                    >
                      Save Coupon
                    </button>
                    <button
                      onClick={() => setShowAddCoupon(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono font-black text-[#14213D] text-sm">{c.code}</div>
                      <div className="text-gray-500">{c.description || `₹${c.discountValue} Flat Discount`}</div>
                    </div>
                    <span className="font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
                      ACTIVE
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: SUPPORT & SOS DESK */}
        {/* ========================================================= */}
        {activeTab === 'SUPPORT' && (
          <div className="space-y-6">
            {/* Emergency SOS Incident Console */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#14213D] flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span>Live Emergency SOS Incidents & GPS Dispatch</span>
                    </h3>
                    <span className="bg-red-100 text-red-700 text-xs font-black px-2.5 py-0.5 rounded-full uppercase">
                      {emergencyAlerts.filter((a) => a.status === 'ACTIVE').length} Active
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Real-time distress broadcasts received from Customer & Partner interface with precision coordinates
                  </p>
                </div>

                <button
                  onClick={loadEmergencyAlertsOnly}
                  className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#14213D] text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                  <span>Refresh SOS Feed</span>
                </button>
              </div>

              {emergencyAlerts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-gray-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-gray-600">No distress alerts reported.</p>
                  <p className="mt-0.5">All customer sessions operating within normal safety limits.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emergencyAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        alert.status === 'ACTIVE'
                          ? 'border-red-300 bg-red-50/70 ring-2 ring-red-400/30'
                          : alert.status === 'ACKNOWLEDGED'
                          ? 'border-amber-200 bg-amber-50/50'
                          : 'border-gray-200 bg-gray-50/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-black text-gray-500">{alert.alertNumber}</span>
                          <span className="font-bold text-sm text-[#14213D]">{alert.userName}</span>
                          <span className="text-xs text-gray-500 font-medium">({alert.userPhone})</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-200 text-gray-700 uppercase">
                            {alert.userRole}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                              alert.status === 'ACTIVE'
                                ? 'bg-red-600 text-white animate-pulse'
                                : alert.status === 'ACKNOWLEDGED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {alert.status}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(alert.timestamp).toLocaleTimeString('en-IN')} IST
                          </span>
                        </div>
                      </div>

                      {/* GPS Details Card */}
                      <div className="mt-3 p-3 rounded-xl bg-white border border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div className="flex items-start gap-2 text-gray-700">
                          <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-[#14213D]">{alert.address || 'Mumbai Grid'}</div>
                            <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                              Lat: {alert.lat.toFixed(6)}, Lng: {alert.lng.toFixed(6)} • Accuracy: ±{alert.accuracy || 15}m
                            </div>
                            {alert.bookingId && (
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                Active Booking: <span className="font-semibold text-gray-800">{alert.serviceName || alert.bookingId}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`https://www.google.com/maps?q=${alert.lat},${alert.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#14213D] font-bold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                            <span>Open Map</span>
                          </a>

                          <a
                            href={`tel:${alert.userPhone}`}
                            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#14213D] font-bold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Call User</span>
                          </a>

                          {alert.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                              className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-900 font-black text-xs transition-colors cursor-pointer"
                            >
                              Acknowledge
                            </button>
                          )}

                          {alert.status !== 'RESOLVED' && (
                            <button
                              onClick={() => handleResolveAlert(alert.id)}
                              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors cursor-pointer"
                            >
                              Resolve Incident
                            </button>
                          )}
                        </div>
                      </div>

                      {alert.resolutionNotes && (
                        <div className="mt-2 text-[11px] text-gray-500 italic pl-1">
                          Resolution note: {alert.resolutionNotes} (by {alert.resolvedBy || 'Operations'})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Support Desk & Grievance Tickets */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold">Support Desk & Grievance Tickets</h3>
                <p className="text-xs text-gray-500">Customer feedback and general inquiries</p>
              </div>

            <div className="space-y-3">
              {tickets.map((tkt) => (
                <div
                  key={tkt.id}
                  className="p-5 rounded-2xl border border-gray-200 bg-gray-50 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 font-mono">{tkt.ticketNumber}</span>
                      <h4 className="font-bold text-sm text-[#14213D]">{tkt.subject}</h4>
                      <div className="text-xs text-gray-500 mt-0.5">By {tkt.userName} ({tkt.userRole})</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        tkt.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {tkt.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 bg-white p-3 rounded-xl border border-gray-100">
                    "{tkt.description}"
                  </p>

                  {tkt.replies && tkt.replies.length > 0 && (
                    <div className="space-y-1.5 pl-3 border-l-2 border-emerald-500">
                      {tkt.replies.map((rep) => (
                        <div key={rep.id} className="text-xs text-gray-700">
                          <strong>{rep.senderName}:</strong> {rep.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {tkt.status !== 'RESOLVED' && (
                    <button
                      onClick={() => setSelectedTicket(tkt)}
                      className="px-4 py-2 bg-[#14213D] hover:bg-[#1E293B] text-white text-xs font-bold rounded-xl"
                    >
                      Reply & Resolve Ticket
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Ticket Reply Modal */}
            {selectedTicket && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                  <h3 className="font-bold text-base">Reply to Ticket {selectedTicket.ticketNumber}</h3>
                  <textarea
                    rows={3}
                    value={ticketReplyText}
                    onChange={(e) => setTicketReplyText(e.target.value)}
                    placeholder="Enter resolution notes for customer..."
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSendTicketReply}
                      className="flex-1 py-2.5 bg-[#F42F73] text-white font-bold text-xs rounded-xl"
                    >
                      Send Reply & Close
                    </button>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="px-4 py-2.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 9: GOOGLE SHEETS & WORKSPACE INTEGRATION */}
        {/* ========================================================= */}
        {activeTab === 'SHEETS' && (
          <GoogleSheetsHub
            bookings={bookings}
            assistants={assistants}
            applications={applications}
            analytics={analytics}
            onRefreshData={loadAdminData}
          />
        )}
      </main>
    </div>
  );
};
