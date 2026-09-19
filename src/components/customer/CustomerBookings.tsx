import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { Booking } from '../../types';
import {
  Calendar,
  Clock,
  MapPin,
  Star,
  FileText,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Bell,
  BellRing,
  Volume2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { InvoiceModal } from '../common/InvoiceModal';
import { RatingModal } from './RatingModal';
import { getTimeUntilBookingStart } from '../../lib/pushNotificationService';

interface CustomerBookingsProps {
  onSelectBooking: (booking: Booking) => void;
  onOpenBooking: () => void;
}

export const CustomerBookings: React.FC<CustomerBookingsProps> = ({ onSelectBooking, onOpenBooking }) => {
  const {
    bookings,
    pushPermission,
    requestPushNotificationPermission,
    triggerOneHourReminderTest,
    isReminderSentForBooking
  } = useBooking();

  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<Booking | null>(null);
  const [ratingBooking, setRatingBooking] = useState<Booking | null>(null);
  const [testAlertFeedback, setTestAlertFeedback] = useState<string | null>(null);
  const [isTestingAlert, setIsTestingAlert] = useState<boolean>(false);

  const customerBookings = bookings.filter((b) => b.customerId === 'cust-1' || !b.customerId);

  const filtered = customerBookings.filter((b) => {
    if (filter === 'ACTIVE') return b.status !== 'COMPLETED' && b.status !== 'CANCELLED';
    if (filter === 'COMPLETED') return b.status === 'COMPLETED';
    if (filter === 'CANCELLED') return b.status === 'CANCELLED';
    return true;
  });

  const handleEnablePush = async () => {
    const result = await requestPushNotificationPermission();
    if (result === 'granted') {
      setTestAlertFeedback('✓ Push notifications enabled! You will receive automated 1-hour reminders before sessions start.');
      setTimeout(() => setTestAlertFeedback(null), 6000);
    } else if (result === 'denied') {
      setTestAlertFeedback('Notifications were denied in browser settings. You will still receive in-app reminder alerts.');
      setTimeout(() => setTestAlertFeedback(null), 6000);
    }
  };

  const handleTestAlert = async (bookingId?: string) => {
    setIsTestingAlert(true);
    try {
      const res = await triggerOneHourReminderTest(bookingId);
      setTestAlertFeedback(
        res.pushSent
          ? '🔔 Automated 1-Hour Push Reminder dispatched with chime & browser notification!'
          : '🔔 Automated 1-Hour In-App Reminder triggered with sound & banner toast!'
      );
      setTimeout(() => setTestAlertFeedback(null), 6000);
    } catch (e: any) {
      setTestAlertFeedback('Failed to dispatch test notification.');
      setTimeout(() => setTestAlertFeedback(null), 4000);
    } finally {
      setIsTestingAlert(false);
    }
  };

  return (
    <div className="max-w-4xl 2xl:max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12 text-[#14213D]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">My Assistance Bookings</h1>
          <p className="text-xs text-gray-500 mt-0.5">Track active errands and view past assistance receipts</p>
        </div>
        <button
          onClick={onOpenBooking}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#F42F73] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#F42F73]/20 hover:bg-[#D81B60] transition-colors min-h-[44px] flex items-center justify-center cursor-pointer"
        >
          Book New Assistant @ ₹149/hr
        </button>
      </div>

      {/* Automated 1-Hour Push Notification Reminder Banner */}
      <div className="bg-gradient-to-r from-[#14213D] to-[#1F305E] text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#F42F73]/20 text-[#F42F73] border border-[#F42F73]/30 flex items-center justify-center shrink-0 mt-0.5">
              <BellRing className="w-5 h-5 text-[#F42F73] animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">Automated 1-Hour Push Reminders</span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    pushPermission === 'granted'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : pushPermission === 'denied'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-white/10 text-gray-200 border border-white/20'
                  }`}
                >
                  {pushPermission === 'granted'
                    ? 'Active'
                    : pushPermission === 'denied'
                    ? 'In-App Only'
                    : 'Setup Recommended'}
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1 max-w-xl leading-relaxed">
                Diblo monitors your scheduled Mumbai assistance sessions and automatically sends you a native push notification with a sound chime <strong>exactly 1 hour before your assistant arrives</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            {pushPermission !== 'granted' && (
              <button
                type="button"
                onClick={handleEnablePush}
                id="btn-enable-push-reminders"
                className="px-4 py-2 rounded-xl bg-[#F42F73] hover:bg-[#D81B60] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 min-h-[38px] cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable Push Alerts</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleTestAlert()}
              disabled={isTestingAlert}
              id="btn-test-1hr-reminder"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 min-h-[38px] cursor-pointer disabled:opacity-50"
            >
              <Volume2 className="w-3.5 h-3.5 text-rose-300" />
              <span>{isTestingAlert ? 'Sending...' : 'Test 1-Hr Alert'}</span>
            </button>
          </div>
        </div>

        {testAlertFeedback && (
          <div className="mt-3.5 pt-3 border-t border-white/10 text-xs font-medium text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{testAlertFeedback}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 sm:gap-2 bg-gray-100 p-1 rounded-2xl text-xs font-semibold max-w-md overflow-x-auto scrollbar-none">
        {[
          { id: 'ALL', label: 'All Bookings' },
          { id: 'ACTIVE', label: 'Active / Live' },
          { id: 'COMPLETED', label: 'Completed' },
          { id: 'CANCELLED', label: 'Cancelled' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`flex-1 py-2 px-2.5 rounded-xl transition-all whitespace-nowrap min-h-[38px] flex items-center justify-center cursor-pointer ${
              filter === tab.id ? 'bg-white text-[#F42F73] font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-gray-100 space-y-3">
            <div className="text-gray-400 text-3xl">📋</div>
            <div className="text-sm font-bold text-gray-700">No bookings in this section</div>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Book your first Diblo assistant for your hospital visit, queue standing, or senior care.
            </p>
          </div>
        ) : (
          filtered.map((b) => {
            const isActive = b.status !== 'COMPLETED' && b.status !== 'CANCELLED';
            const timeInfo = getTimeUntilBookingStart(b);
            const isReminderSent = isReminderSentForBooking(b.id);

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-400 font-mono">{b.bookingNumber}</span>
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
                    </div>
                    <h3 className="text-base font-bold text-[#14213D] mt-0.5">{b.serviceName}</h3>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs font-bold text-gray-400">Total Paid</div>
                    <div className="text-lg font-black text-[#F42F73]">₹{b.totalAmount}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{b.scheduledDate} at {b.startTime} ({b.totalHours} hrs)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{b.location.area}, Mumbai</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Assistant: <strong>{b.assistantName || 'Assigned Partner'}</strong></span>
                  </div>
                </div>

                {/* 1-Hour Reminder Indicator for Active / Scheduled Bookings */}
                {isActive && (
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        isReminderSent
                          ? 'bg-emerald-100 text-emerald-700'
                          : timeInfo.isWithinOneHour
                          ? 'bg-rose-100 text-[#F42F73]'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {isReminderSent ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-[#F42F73]" />
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-bold text-[#14213D] flex items-center gap-1.5">
                          <span>
                            {isReminderSent
                              ? '1-Hour Push Reminder Sent'
                              : timeInfo.isWithinOneHour
                              ? `Starts soon (${timeInfo.formatted}) — 1-Hour Alert Dispatched`
                              : `Automated 1-Hour Reminder Scheduled`}
                          </span>
                          {!isReminderSent && timeInfo.isWithinOneHour && (
                            <span className="w-2 h-2 rounded-full bg-[#F42F73] animate-ping" />
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {isReminderSent
                            ? `Customer push notification reminder sent 1 hr before ${b.startTime}.`
                            : timeInfo.isWithinOneHour
                            ? `Session starts in ${timeInfo.formatted}. Prepare for assistant arrival.`
                            : `System will automatically send a push reminder at 60 mins before ${b.startTime}.`}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTestAlert(b.id)}
                      className="text-[11px] font-bold text-[#F42F73] hover:text-[#D81B60] hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors shrink-0 self-start sm:self-auto border border-rose-200 cursor-pointer"
                    >
                      Trigger 1-Hr Alert
                    </button>
                  </div>
                )}

                {/* Bottom Action Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {b.invoiceNumber && (
                      <button
                        onClick={() => setSelectedInvoiceBooking(b)}
                        className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-colors min-h-[40px] cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#F42F73]" />
                        <span>Tax Invoice</span>
                      </button>
                    )}

                    {b.status === 'COMPLETED' && !b.rating && (
                      <button
                        id={`bookings-list-rate-tip-btn-${b.id}`}
                        onClick={() => setRatingBooking(b)}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 flex items-center gap-1.5 border border-amber-200 transition-colors min-h-[40px] cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>Rate & Tip Assistant</span>
                      </button>
                    )}

                    {b.rating && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>Rated {b.rating.stars}★</span>
                        {b.tipAmount && b.tipAmount > 0 ? (
                          <span className="text-emerald-700 font-bold ml-1">
                            • ₹{b.tipAmount} Tip
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {isActive && (
                    <button
                      onClick={() => onSelectBooking(b)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#F42F73] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#D81B60] min-h-[40px] cursor-pointer"
                    >
                      <span>Track Live Assistance</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <InvoiceModal
        isOpen={!!selectedInvoiceBooking}
        onClose={() => setSelectedInvoiceBooking(null)}
        booking={selectedInvoiceBooking}
      />

      {ratingBooking && (
        <RatingModal
          isOpen={!!ratingBooking}
          onClose={() => setRatingBooking(null)}
          booking={ratingBooking}
          bookingId={ratingBooking.id}
          assistantName={ratingBooking.assistantName || 'Rajesh Sharma'}
        />
      )}
    </div>
  );
};
