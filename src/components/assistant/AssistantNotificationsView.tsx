import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Zap,
  CreditCard,
  MessageSquare,
  Clock,
  CheckCheck
} from 'lucide-react';
import { InAppNotification } from '../../types';

interface AssistantNotificationsViewProps {
  notifications: InAppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export type NotificationCategory = 'ALL' | 'NEW_ORDER' | 'ORDER_UPDATE' | 'CUSTOMER_CANCELLED' | 'PAYMENT_RECEIVED' | 'DIBLO_MESSAGE';

export const AssistantNotificationsView: React.FC<AssistantNotificationsViewProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead
}) => {
  const [filter, setFilter] = useState<NotificationCategory>('ALL');

  // Provide initial assistant-specific notifications if list is sparse
  const displayNotifications = notifications.length > 0 ? notifications : [
    {
      id: 'asst-notif-1',
      userId: 'asst-1',
      title: 'Payment Credited',
      message: 'Weekly earnings of ₹8,450 successfully deposited to your HDFC bank account.',
      type: 'PAYMENT',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'asst-notif-2',
      userId: 'asst-1',
      title: '5-Star Rating Received!',
      message: 'Mrs. Kapadia rated your Senior Citizen Assistance session 5 stars: "Very patient and helpful".',
      type: 'BOOKING',
      isRead: false,
      createdAt: new Date(Date.now() - 14400000).toISOString()
    },
    {
      id: 'asst-notif-3',
      userId: 'asst-1',
      title: 'High Demand in Bandra West',
      message: 'Orders are surging in Pali Hill and Carter Road. Stay online to receive priority requests.',
      type: 'SYSTEM',
      isRead: true,
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  const getCategoryFromType = (n: InAppNotification): NotificationCategory => {
    const title = n.title.toLowerCase();
    const msg = n.message.toLowerCase();
    if (title.includes('new order') || title.includes('order available') || title.includes('assignment')) {
      return 'NEW_ORDER';
    }
    if (title.includes('cancelled') || msg.includes('cancelled')) {
      return 'CUSTOMER_CANCELLED';
    }
    if (n.type === 'PAYMENT' || title.includes('payment') || title.includes('earning') || title.includes('credited')) {
      return 'PAYMENT_RECEIVED';
    }
    if (title.includes('diblo') || title.includes('demand') || (n.type as string) === 'SYSTEM' || n.type === 'SUPPORT') {
      return 'DIBLO_MESSAGE';
    }
    return 'ORDER_UPDATE';
  };

  const filtered = displayNotifications.filter((n) => {
    if (filter === 'ALL') return true;
    return getCategoryFromType(n) === filter;
  });

  const unreadCount = displayNotifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#14213D] flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#F42F73]" />
            <span>NOTIFICATIONS</span>
          </h2>
          <p className="text-xs text-gray-500">Live order alerts, payment updates and Diblo messages</p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#14213D] font-bold text-xs flex items-center gap-1.5 transition-all min-h-[36px]"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1.5 rounded-2xl text-xs">
        {(
          [
            { id: 'ALL', label: 'All' },
            { id: 'NEW_ORDER', label: 'New Orders' },
            { id: 'ORDER_UPDATE', label: 'Updates' },
            { id: 'CUSTOMER_CANCELLED', label: 'Cancelled' },
            { id: 'PAYMENT_RECEIVED', label: 'Payments' },
            { id: 'DIBLO_MESSAGE', label: 'Diblo Desk' }
          ] as const
        ).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id as NotificationCategory)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all min-h-[34px] ${
              filter === cat.id
                ? 'bg-white text-[#14213D] shadow-xs'
                : 'text-gray-500 hover:text-[#14213D]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 shadow-xs space-y-3">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No notifications in this category.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((item) => {
              const cat = getCategoryFromType(item);
              const formattedTime = new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });
              const formattedDate = new Date(item.createdAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={item.id}
                  onClick={() => onMarkRead(item.id)}
                  className={`py-3.5 flex items-start justify-between gap-3 text-xs transition-colors cursor-pointer rounded-2xl px-2.5 ${
                    !item.isRead ? 'bg-emerald-50/40' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                        cat === 'NEW_ORDER'
                          ? 'bg-[#FFF0F5] text-[#F42F73]'
                          : cat === 'PAYMENT_RECEIVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : cat === 'CUSTOMER_CANCELLED'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {cat === 'NEW_ORDER' && <Zap className="w-4 h-4" />}
                      {cat === 'PAYMENT_RECEIVED' && <CreditCard className="w-4 h-4" />}
                      {cat === 'CUSTOMER_CANCELLED' && <AlertCircle className="w-4 h-4" />}
                      {cat === 'DIBLO_MESSAGE' && <MessageSquare className="w-4 h-4" />}
                      {cat === 'ORDER_UPDATE' && <CheckCircle2 className="w-4 h-4" />}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#14213D] text-xs sm:text-sm">
                          {item.title}
                        </span>
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        )}
                      </div>
                      <p className="text-gray-600 leading-relaxed text-xs">{item.message}</p>
                      <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-gray-300" />
                        <span>
                          {formattedDate} at {formattedTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
