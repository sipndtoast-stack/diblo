import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { api } from '../../lib/api';
import { MapView } from '../common/MapView';

export const AssistantPanel: React.FC = () => {
  const { assistantProfile, updateAssistantProfile } = useAuth();
  const { bookings, refreshBookings, verifyStartOtp, completeBooking } = useBooking();

  const [isOnline, setIsOnline] = useState<boolean>(assistantProfile?.isOnline ?? true);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TASKS' | 'EARNINGS' | 'PROFILE'>('DASHBOARD');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Active assistant's current task
  const activeTask = bookings.find(
    (b) =>
      b.assistantId === (assistantProfile?.id || 'asst-1') &&
      b.status !== 'COMPLETED' &&
      b.status !== 'CANCELLED'
  );

  // Unassigned bookings in assistant's operating area waiting for pickup
  const incomingRequests = bookings.filter(
    (b) => b.status === 'SEARCHING' || (b.status === 'ASSIGNED' && b.assistantId === (assistantProfile?.id || 'asst-1'))
  );

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
    await api.acceptBooking(bookingId, assistantProfile?.id || 'asst-1');
    await refreshBookings();
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

          {/* Online / Offline Switch */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleOnline}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all shadow-sm ${
                isOnline
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isOnline ? 'ONLINE (Ready for Tasks)' : 'OFFLINE'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-1">
            <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Today's Earnings</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600">₹{assistantProfile?.earnings?.today || 1490}</div>
            <div className="text-[10px] text-gray-500">Fixed rate ₹120/hr payout</div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-1">
            <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Completed Tasks</div>
            <div className="text-xl sm:text-2xl font-black text-[#14213D]">{assistantProfile?.completedTasksCount || 342}</div>
            <div className="text-[10px] text-gray-500">100% On-Time Record</div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-1">
            <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Customer Rating</div>
            <div className="text-xl sm:text-2xl font-black text-amber-500 flex items-center gap-1">
              <span>{assistantProfile?.rating || 4.9}</span>
              <Star className="w-4 h-4 fill-amber-500" />
            </div>
            <div className="text-[10px] text-gray-500">Top Rated Assistant</div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-1">
            <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Weekly Payout</div>
            <div className="text-xl sm:text-2xl font-black text-[#14213D]">₹{assistantProfile?.earnings?.week || 8450}</div>
            <div className="text-[10px] text-emerald-600 font-semibold">Auto-transfers every Monday</div>
          </div>
        </div>

        {/* ACTIVE TASK SECTION */}
        {activeTask ? (
          <div className="bg-white rounded-3xl p-6 border-2 border-[#F42F73] shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <span className="bg-[#FFF0F5] text-[#F42F73] text-xs font-black px-2.5 py-1 rounded-full uppercase">
                  ACTIVE ASSISTANCE: {activeTask.status.replace('_', ' ')}
                </span>
                <h3 className="text-xl font-black text-[#14213D] mt-2">{activeTask.serviceName}</h3>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#F42F73]" />
                  <span>{activeTask.location.address} ({activeTask.location.area})</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-gray-400">Assistance Duration</div>
                <div className="text-lg font-black text-[#14213D]">{activeTask.totalHours} Hours (@ ₹149/hr)</div>
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
                  className="px-4 py-2 rounded-xl bg-[#14213D] hover:bg-[#1E293B] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-[#F42F73]" />
                  <span>Call Customer</span>
                </a>
              </div>
            </div>

            {/* Assistant Workflow Action Step Buttons */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Action Step</div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Step 1: On the way */}
                {(activeTask.status === 'ASSIGNED' || activeTask.status === 'ACCEPTED') && (
                  <button
                    onClick={() => handleStartRoute(activeTask.id)}
                    className="py-4 px-6 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#F42F73]/20 transition-all"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Start Navigation to Customer</span>
                  </button>
                )}

                {/* Step 2: Mark Arrived */}
                {activeTask.status === 'ON_THE_WAY' && (
                  <button
                    onClick={() => handleArrived(activeTask.id)}
                    className="py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>I Have Arrived at Location</span>
                  </button>
                )}

                {/* Step 3: Enter Start OTP */}
                {activeTask.status === 'ARRIVED' && (
                  <button
                    onClick={() => setShowOtpModal(true)}
                    className="py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <Key className="w-4 h-4" />
                    <span>Enter Customer Start OTP</span>
                  </button>
                )}

                {/* Step 4: In Progress Timer & Complete */}
                {activeTask.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleCompleteTask(activeTask.id)}
                    className="py-4 px-6 rounded-2xl bg-[#14213D] hover:bg-[#1E293B] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
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
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl border border-gray-200 hover:border-[#F42F73] transition-all bg-gray-50/50 space-y-3"
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
                      <MapPin className="w-3.5 h-3.5 text-[#F42F73]" />
                      <span className="truncate">{req.location.address} ({req.location.area})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{req.scheduledDate} at {req.startTime}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcceptTask(req.id)}
                    className="w-full py-2.5 rounded-xl bg-[#F42F73] hover:bg-[#D81B60] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>Accept Task Booking</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assistant Completed Task History */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#14213D]">Recent Completed Tasks</h3>
          <div className="space-y-3">
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
