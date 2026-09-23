import React, { useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import { AssistantProfile, Booking } from '../../types';

interface AssistantEarningsViewProps {
  mode: 'EARNINGS' | 'PAYMENTS';
  assistantProfile: AssistantProfile | null;
  bookings: Booking[];
}

export const AssistantEarningsView: React.FC<AssistantEarningsViewProps> = ({
  mode,
  assistantProfile,
  bookings
}) => {
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'CASH' | 'ONLINE'>('ALL');

  const completedBookings = bookings.filter(
    (b) => b.assistantId === (assistantProfile?.id || 'asst-1') && b.status === 'COMPLETED'
  );

  const earningsToday = assistantProfile?.earnings?.today || 1490;
  const earningsWeek = assistantProfile?.earnings?.week || 8450;
  const earningsMonth = assistantProfile?.earnings?.month || 34200;
  const completedOrdersCount = assistantProfile?.completedTasksCount || completedBookings.length || 342;
  const pendingAmount = assistantProfile?.earnings?.pendingPayout || 1250;

  // Payments calculations
  const totalPaid = earningsMonth;
  const totalPending = pendingAmount;
  const cashPayments = completedBookings.filter((b) => b.paymentMethod?.toLowerCase().includes('cash')).length * 500;
  const onlinePayments = totalPaid - cashPayments;

  if (mode === 'EARNINGS') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#14213D] flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            <span>EARNINGS</span>
          </h2>
          <p className="text-xs text-gray-500">Fixed rate hourly payouts credited directly</p>
        </div>

        {/* 3 Main Large Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">
              TODAY
            </div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-600">
              ₹{earningsToday.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-gray-500 font-medium">Earned since 6:00 AM</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">
              THIS WEEK
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#14213D]">
              ₹{earningsWeek.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold">
              Payout every Monday
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">
              THIS MONTH
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#14213D]">
              ₹{earningsMonth.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-gray-500 font-medium">Monthly accumulated total</div>
          </div>
        </div>

        {/* Supporting Metrics: Completed Orders & Pending Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Completed Orders
            </div>
            <div className="text-2xl font-black text-[#14213D] mt-0.5">
              {completedOrdersCount}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">100% On-Time Record</div>
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Pending Amount
            </div>
            <div className="text-2xl font-black text-amber-700 mt-0.5">
              ₹{pendingAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-amber-800 font-medium mt-0.5">Next settlement cycle</div>
          </div>
        </div>

        {/* Bank Account Info Card */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-[#14213D]">Verified Bank Account</div>
              <div className="text-xs text-gray-500 font-mono">
                {assistantProfile?.bankDetails?.bankName || 'HDFC Bank'} •••• {assistantProfile?.bankDetails?.accountNumber?.slice(-4) || '8821'}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
            Active
          </span>
        </div>
      </div>
    );
  }

  // PAYMENTS MODE
  const paymentHistoryItems = completedBookings.slice(0, 10).map((b, idx) => {
    const isCash = idx % 3 === 0;
    const isPending = idx === 0;
    return {
      orderId: b.bookingNumber || b.id,
      serviceName: b.serviceName,
      date: b.scheduledDate || 'Today',
      amount: b.totalAmount ? Math.round(b.totalAmount * 0.8) : 280,
      status: isPending ? 'PENDING' : 'PAID',
      method: isCash ? 'CASH' : 'ONLINE'
    };
  });

  const filteredHistory = paymentHistoryItems.filter((item) => {
    if (paymentFilter === 'PAID') return item.status === 'PAID';
    if (paymentFilter === 'PENDING') return item.status === 'PENDING';
    if (paymentFilter === 'CASH') return item.method === 'CASH';
    if (paymentFilter === 'ONLINE') return item.method === 'ONLINE';
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#14213D] flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-[#F42F73]" />
          <span>PAYMENTS</span>
        </h2>
        <p className="text-xs text-gray-500">Summary of paid, pending, cash and online settlements</p>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">PAID</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
            ₹{totalPaid.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">Successfully settled</div>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">PENDING</div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-amber-700 font-medium">In processing</div>
        </div>

        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
          <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">CASH</div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-0.5">
            ₹{cashPayments.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-blue-600 font-medium">Customer direct cash</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200">
          <div className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">ONLINE</div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 mt-0.5">
            ₹{onlinePayments.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-purple-600 font-medium">UPI & NetBanking</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1.5 rounded-2xl text-xs">
        {(['ALL', 'PAID', 'PENDING', 'CASH', 'ONLINE'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setPaymentFilter(filter)}
            className={`px-3 py-2 rounded-xl font-bold transition-all min-h-[36px] ${
              paymentFilter === filter
                ? 'bg-white text-[#14213D] shadow-xs'
                : 'text-gray-500 hover:text-[#14213D]'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Payment History List */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-3">
        <h3 className="font-extrabold text-sm text-[#14213D] uppercase tracking-wide">
          Payment History
        </h3>

        {filteredHistory.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">
            No payments match the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredHistory.map((item, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-[#14213D] flex items-center gap-1.5">
                    <span className="font-mono text-gray-500">{item.orderId}</span>
                    <span className="text-gray-400">•</span>
                    <span>{item.serviceName}</span>
                  </div>
                  <div className="text-gray-400 text-[11px] mt-0.5">
                    {item.date} • Method: <span className="font-semibold text-gray-600">{item.method}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-sm text-emerald-600">₹{item.amount}</div>
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded-full mt-0.5 ${
                      item.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
