import React, { useState } from 'react';
import {
  Package,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Zap,
  Star,
  Loader2,
  Flag,
  FileText
} from 'lucide-react';
import { Booking } from '../../types';
import { normalizeBookingStatus, isDemoBookingRecord } from '../../lib/firestoreBookings';

interface AssistantOrdersViewProps {
  mode: 'MY_ORDERS' | 'NEW_ORDERS';
  bookings: Booking[];
  assistantId: string;
  onAcceptOrder: (orderId: string) => Promise<void> | void;
  onRejectOrder?: (orderId: string) => Promise<void> | void;
  onSelectActiveOrder: (booking: Booking) => void;
  isAcceptingId?: string | null;
}

export const AssistantOrdersView: React.FC<AssistantOrdersViewProps> = ({
  mode,
  bookings,
  assistantId,
  onAcceptOrder,
  onRejectOrder,
  onSelectActiveOrder,
  isAcceptingId
}) => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');

  // Filter out any demo records
  const cleanBookings = bookings.filter((b) => !isDemoBookingRecord(b));

  // Filter orders assigned to this assistant
  const assistantBookings = cleanBookings.filter((b) => b.assistantId === assistantId);

  // New available orders (pending/searching or assigned to this assistant)
  const availableOrders = cleanBookings.filter((b) => {
    const norm = normalizeBookingStatus(b.status);
    return norm === 'pending' && (!b.assistantId || b.assistantId === assistantId);
  });

  const activeOrders = assistantBookings.filter((b) => {
    const norm = normalizeBookingStatus(b.status);
    return norm === 'accepted' || norm === 'on_the_way' || norm === 'arrived' || norm === 'in_progress';
  });

  const completedOrders = assistantBookings.filter(
    (b) => normalizeBookingStatus(b.status) === 'completed'
  );

  const cancelledOrders = assistantBookings.filter((b) => {
    const norm = normalizeBookingStatus(b.status);
    return norm === 'cancelled' || norm === 'rejected';
  });

  const currentList =
    activeTab === 'ACTIVE'
      ? activeOrders
      : activeTab === 'COMPLETED'
      ? completedOrders
      : cancelledOrders;

  if (mode === 'NEW_ORDERS') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#14213D] flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#F42F73]" />
              <span>NEW REQUESTS QUEUE</span>
            </h2>
            <p className="text-xs text-gray-500">
              Real-time customer assistance requests from Firebase
            </p>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
            {availableOrders.length} Available
          </span>
        </div>

        {availableOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <div className="font-extrabold text-[#14213D]">No new requests right now</div>
            <div className="text-xs text-gray-500 max-w-sm mx-auto">
              Keep your status ONLINE. You will receive an immediate alert popup and notification when a customer submits a new request.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableOrders.map((order) => {
              const amount = order.totalAmount || (order.hourlyRate || 149) * (order.totalHours || 2);
              const isCurrentAccepting = isAcceptingId === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-5 border border-gray-200 hover:border-[#F42F73] transition-all shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {order.bookingNumber || order.requestId || order.id}
                      </span>
                      <h3 className="font-extrabold text-base text-[#14213D] mt-1">
                        {order.serviceName}
                      </h3>
                      <div className="text-xs text-gray-600 mt-0.5">
                        Customer: <span className="font-bold text-[#14213D]">{order.customerName}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-emerald-600">₹{amount}</div>
                      <div className="text-[10px] text-gray-400 font-semibold">
                        {order.totalHours || order.bookedHours || 2} Hours
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-xs space-y-1.5">
                    <div className="flex items-start gap-2 text-gray-700">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-medium">
                        <strong>Pickup:</strong> {order.location?.address} ({order.location?.area || 'Mumbai'})
                      </span>
                    </div>
                    {order.destinationLocation?.address && (
                      <div className="flex items-start gap-2 text-gray-700">
                        <Flag className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <span className="font-medium">
                          <strong>Destination:</strong> {order.destinationLocation.address}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-500 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        {order.scheduledDate} at {order.startTime}
                      </span>
                    </div>
                    {(order.instructions || order.description) && (
                      <div className="flex items-start gap-2 text-gray-600 text-[11px] pt-1 border-t border-gray-200/70">
                        <FileText className="w-3.5 h-3.5 text-[#F42F73] shrink-0 mt-0.5" />
                        <span>{order.instructions || order.description}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {onRejectOrder && (
                      <button
                        type="button"
                        onClick={() => onRejectOrder(order.id)}
                        disabled={isCurrentAccepting}
                        className="py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs flex items-center justify-center gap-1.5 min-h-[46px] cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 text-gray-500" />
                        <span>Reject</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onAcceptOrder(order.id)}
                      disabled={isCurrentAccepting}
                      className={`${
                        onRejectOrder ? '' : 'col-span-2'
                      } py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all min-h-[46px] shadow-sm disabled:opacity-75 cursor-pointer`}
                    >
                      {isCurrentAccepting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Accepting...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Accept Request</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // MY_ORDERS MODE
  return (
    <div className="space-y-4">
      {/* Category Tabs: ACTIVE, COMPLETED, CANCELLED */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all min-h-[44px] ${
            activeTab === 'ACTIVE'
              ? 'bg-white text-[#14213D] shadow-xs'
              : 'text-gray-500 hover:text-[#14213D]'
          }`}
        >
          ACTIVE ({activeOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all min-h-[44px] ${
            activeTab === 'COMPLETED'
              ? 'bg-white text-[#14213D] shadow-xs'
              : 'text-gray-500 hover:text-[#14213D]'
          }`}
        >
          COMPLETED ({completedOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('CANCELLED')}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all min-h-[44px] ${
            activeTab === 'CANCELLED'
              ? 'bg-white text-[#14213D] shadow-xs'
              : 'text-gray-500 hover:text-[#14213D]'
          }`}
        >
          CANCELLED ({cancelledOrders.length})
        </button>
      </div>

      {/* Orders List */}
      {currentList.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <div className="font-extrabold text-[#14213D]">
            No {activeTab.toLowerCase()} orders found
          </div>
          <div className="text-xs text-gray-500">
            {activeTab === 'ACTIVE'
              ? 'You have no active orders in progress.'
              : activeTab === 'COMPLETED'
              ? 'Completed tasks will appear here with customer ratings and earnings.'
              : 'Cancelled or rejected tasks will appear here.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentList.map((order) => {
            const amount = order.totalAmount || (order.hourlyRate || 149) * (order.totalHours || 2);
            const norm = normalizeBookingStatus(order.status);
            const isTaskActive =
              norm === 'accepted' || norm === 'on_the_way' || norm === 'arrived' || norm === 'in_progress';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl p-5 border transition-all shadow-xs space-y-3.5 ${
                  isTaskActive ? 'border-2 border-emerald-500' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {order.bookingNumber || order.requestId || order.id}
                    </span>
                    <h3 className="font-black text-base text-[#14213D] mt-1">{order.serviceName}</h3>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Customer: <span className="font-bold text-[#14213D]">{order.customerName}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black text-emerald-600">₹{amount}</div>
                    <span
                      className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full mt-1 uppercase ${
                        norm === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : norm === 'cancelled' || norm === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {order.location?.address} ({order.location?.area || 'Mumbai'})
                    </span>
                  </div>
                  {order.destinationLocation?.address && (
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Flag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">{order.destinationLocation.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>
                      {order.scheduledDate} at {order.startTime} • {order.totalHours || order.bookedHours || 2} hrs
                    </span>
                  </div>
                </div>

                {order.rating && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 p-2 rounded-xl border border-amber-200">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span className="font-black">Customer Rating: {order.rating.stars}★</span>
                    {order.rating.comment && (
                      <span className="text-gray-500 italic">"{order.rating.comment}"</span>
                    )}
                  </div>
                )}

                {isTaskActive && (
                  <button
                    type="button"
                    onClick={() => onSelectActiveOrder(order)}
                    className="w-full py-3 rounded-2xl bg-[#14213D] hover:bg-[#1E293B] text-white font-black text-xs flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <span>OPEN TASK WORKFLOW</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
