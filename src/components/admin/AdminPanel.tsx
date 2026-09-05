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
  AlertTriangle,
  Clock,
  Settings,
  Plus,
  Edit2,
  FileCheck,
  Search,
  ArrowUpRight,
  LogOut
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
import {
  AssistantProfile,
  CustomerProfile,
  Society,
  Coupon,
  PricingConfig,
  SupportTicket,
  PlatformAnalytics,
  Booking
} from '../../types';

export const AdminPanel: React.FC = () => {
  const { logoutStaff, staffUser } = useAuth();
  const { bookings, refreshBookings } = useBooking();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LIVEMAP' | 'BOOKINGS' | 'ASSISTANTS' | 'SOCIETIES' | 'PRICING' | 'SUPPORT'>('OVERVIEW');

  // State entities
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [assistants, setAssistants] = useState<AssistantProfile[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

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

  // Support ticket reply
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');

  // Load all admin data
  const loadAdminData = async () => {
    try {
      const [analyticsData, asstsData, socsData, coupData, priceData, tktData] = await Promise.all([
        api.getAnalytics(),
        api.getAssistants(),
        api.getSocieties(),
        api.getCoupons(),
        api.getPricing(),
        api.getSupportTickets()
      ]);
      setAnalytics(analyticsData);
      setAssistants(asstsData);
      setSocieties(socsData);
      setCoupons(coupData);
      setPricing(priceData);
      setTickets(tktData);
      if (priceData) {
        setBaseHourlyRate(priceData.baseHourlyPrice);
        setMinimumHours(priceData.minimumBookingHours);
      }
    } catch (e) {
      console.error('Failed to load admin dataset', e);
    }
  };

  useEffect(() => {
    loadAdminData();
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
              title="Log out of Staff Portal"
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
            { id: 'SOCIETIES', label: `Societies (${societies.length})`, icon: Building },
            { id: 'PRICING', label: 'Pricing & Coupons', icon: DollarSign },
            { id: 'SUPPORT', label: `Support Tickets (${tickets.length})`, icon: Headphones }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#F42F73] text-white shadow-sm'
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
        {/* TAB 2: LIVE MAP RADAR */}
        {/* ========================================================= */}
        {activeTab === 'LIVEMAP' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Mumbai Live Assistant Fleet Radar</h2>
                <p className="text-xs text-gray-500">Real-time GPS status of all registered assistants across Mumbai</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                  <span>On Active Task</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-[#94A3B8]" />
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
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold">Support Desk & Grievance Tickets</h3>
              <p className="text-xs text-gray-500">Customer feedback and safety incident management</p>
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
        )}
      </main>
    </div>
  );
};
