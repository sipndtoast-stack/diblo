import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  CheckCheck,
  CreditCard,
  Calendar,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useBooking } from '../../context/BookingContext';
import { InAppNotification } from '../../types';

interface CustomerNotificationsViewProps {
  onNavigateToRequests?: () => void;
  onNavigateToTrack?: () => void;
  onNavigateToPayments?: () => void;
}

export const CustomerNotificationsView: React.FC<CustomerNotificationsViewProps> = ({
  onNavigateToRequests,
  onNavigateToTrack,
  onNavigateToPayments
}) => {
  const {
    notifications,
    markNotificationRead,
    pushPermission,
    notificationPreferences,
    updateNotificationPreferences,
    requestPushNotificationPermission,
    sendTestBookingPush
  } = useBooking();
  const [filter, setFilter] = useState<'ALL' | 'ORDERS' | 'PAYMENTS' | 'ALERTS'>('ALL');

  // Fallback realistic customer notifications if context is newly initialized
  const displayNotifications: InAppNotification[] = notifications.length > 0 ? notifications : [
    {
      id: 'notif-demo-1',
      userId: 'user-c-1',
      title: 'Assistant Rajesh Sharma Assigned',
      message: 'Your assistant has confirmed your errand request and is en route in Bandra West.',
      type: 'BOOKING',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
    },
    {
      id: 'notif-demo-2',
      userId: 'user-c-1',
      title: 'Payment Receipt: ₹298 Paid',
      message: 'Invoice INV-2026-8891 for 2 hours errand assistance processed successfully via UPI.',
      type: 'PAYMENT',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString()
    },
    {
      id: 'notif-demo-3',
      userId: 'user-c-1',
      title: '1-Hour Session Safety Check',
      message: 'Your helper session is at 1 hr. You can track live GPS or extend anytime with zero extra commission.',
      type: 'SUPPORT',
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString()
    }
  ];

  const filteredList = displayNotifications.filter((n) => {
    if (filter === 'ALL') return true;
    const title = n.title.toLowerCase();
    if (filter === 'ORDERS') return n.type === 'BOOKING' || n.type === 'ASSISTANT' || title.includes('order') || title.includes('assistant') || title.includes('errand');
    if (filter === 'PAYMENTS') return n.type === 'PAYMENT' || title.includes('payment') || title.includes('paid') || title.includes('invoice');
    if (filter === 'ALERTS') return n.type === 'SUPPORT' || n.type === 'PROMO' || title.includes('alert') || title.includes('safety') || title.includes('reminder');
    return true;
  });

  const unreadCount = displayNotifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    displayNotifications.forEach((n) => {
      if (!n.isRead) {
        markNotificationRead(n.id);
      }
    });
  };

  const getNotificationIcon = (n: InAppNotification) => {
    const title = n.title.toLowerCase();
    if (n.type === 'PAYMENT' || title.includes('payment') || title.includes('receipt') || title.includes('paid')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <CreditCard className="w-5 h-5" />
        </div>
      );
    }
    if (n.type === 'BOOKING' || n.type === 'ASSISTANT' || title.includes('assistant') || title.includes('errand')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#FFF0F5] border border-rose-100 text-[#F42F73] flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
      );
    }
    if (n.type === 'SUPPORT' || title.includes('emergency') || title.includes('sos') || title.includes('safety')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
        <Sparkles className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF0F5] border border-rose-100 flex items-center justify-center text-[#F42F73] shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="bg-[#F42F73] text-white text-xs font-black px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Live updates on assistant assignments, arrival ETAs, receipts, and security alerts.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="self-start sm:self-auto px-3.5 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
          >
            <CheckCheck className="w-4 h-4 text-gray-500" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Firebase Cloud Messaging (FCM) Status & Quick Toggle Strip */}
      <div className="bg-gradient-to-r from-[#FFF0F5] to-white border border-rose-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-rose-200 flex items-center justify-center text-[#F42F73] shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#14213D]">
                Firebase Cloud Messaging (FCM) Push Alerts
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  notificationPreferences.pushEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}
              >
                {notificationPreferences.pushEnabled ? 'Enabled' : 'Muted'}
              </span>
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Receive real-time push notifications for booking status updates and 1-hour session reminders.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => sendTestBookingPush()}
            className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-rose-200 text-[#F42F73] rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px]"
          >
            Test Push
          </button>
          <button
            type="button"
            onClick={() => {
              if (!notificationPreferences.pushEnabled || pushPermission !== 'granted') {
                requestPushNotificationPermission();
              } else {
                updateNotificationPreferences({ pushEnabled: false });
              }
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[36px] ${
              notificationPreferences.pushEnabled
                ? 'bg-[#14213D] hover:bg-slate-800 text-white'
                : 'bg-[#F42F73] hover:bg-[#D81B60] text-white'
            }`}
          >
            {notificationPreferences.pushEnabled ? 'Mute Push' : 'Enable Push Alerts'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(['ALL', 'ORDERS', 'PAYMENTS', 'ALERTS'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] ${
              filter === cat
                ? 'bg-[#14213D] text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat === 'ALL' && 'All Updates'}
            {cat === 'ORDERS' && 'Orders & Tasks'}
            {cat === 'PAYMENTS' && 'Payments & Invoices'}
            {cat === 'ALERTS' && 'Safety & Alerts'}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#14213D]">No notifications in this filter</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              When your assistant starts a task, reaches your location, or provides receipts, updates will appear here.
            </p>
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              onClick={() => markNotificationRead(item.id)}
              className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all flex items-start gap-3.5 sm:gap-4 group cursor-pointer hover:border-[#F42F73]/30 ${
                !item.isRead
                  ? 'border-[#F42F73]/30 shadow-xs bg-rose-50/20'
                  : 'border-gray-100'
              }`}
            >
              {getNotificationIcon(item)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-[#14213D] truncate flex items-center gap-2">
                    <span>{item.title}</span>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#F42F73] shrink-0" />
                    )}
                  </h4>
                  <span className="text-[10px] text-gray-400 shrink-0 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                </div>

                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {item.message}
                </p>

                {/* Optional context action link */}
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  {(item.type === 'BOOKING' || item.title.toLowerCase().includes('assistant')) && onNavigateToTrack && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToTrack();
                      }}
                      className="text-[11px] font-bold text-[#F42F73] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Track assistant on map</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}

                  {(item.type === 'PAYMENT' || item.title.toLowerCase().includes('payment')) && onNavigateToPayments && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToPayments();
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View payment details</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
