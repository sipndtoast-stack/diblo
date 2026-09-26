import React from 'react';
import {
  MapPin,
  Clock,
  Compass,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Zap,
  Flag,
  FileText,
  User,
  Calendar
} from 'lucide-react';
import { Booking } from '../../types';

interface NewOrderModalProps {
  order: Booking | null;
  onAccept: (orderId: string) => Promise<void> | void;
  onReject: (orderId: string) => Promise<void> | void;
  isAccepting?: boolean;
  distanceText?: string;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  order,
  onAccept,
  onReject,
  isAccepting = false,
  distanceText
}) => {
  if (!order) return null;

  const estimatedAmount = order.totalAmount || (order.hourlyRate || 149) * (order.totalHours || 2);
  const pickupAddress =
    order.pickupLocation?.address ||
    order.location?.address ||
    order.location?.area ||
    'Mumbai';
  const destinationAddress =
    order.destinationLocation?.address ||
    order.destinationLocation?.area ||
    'As per customer instructions';
  const requestDetails =
    order.instructions ||
    order.description ||
    'Standard assistance requested. Please coordinate upon arrival.';
  const resolvedDistance = order.estimatedDistance || distanceText || 'Nearby';
  const resolvedDuration = order.estimatedDuration || `${order.totalHours || 2} hrs`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-emerald-500 space-y-4 relative overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Animated Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-[#F42F73] to-emerald-500 animate-pulse" />

        {/* Header: Prominent New Assistance Request Notification */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              New Assistance Request
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight flex items-center gap-1.5">
              <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
              <span>NEW REQUEST</span>
            </h2>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg block">
              {order.bookingNumber || order.requestId || order.id}
            </span>
          </div>
        </div>

        {/* Primary Earnings & Route Summary Banner */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Estimated Earnings</span>
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              ₹{estimatedAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-gray-500">
              {order.totalHours || order.bookedHours || 2} hr{(order.totalHours || 2) > 1 ? 's' : ''} booked
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Est. Distance</div>
            <div className="text-sm font-black text-[#14213D] flex items-center justify-end gap-1 mt-0.5">
              <Compass className="w-4 h-4 text-[#F42F73]" />
              <span>{resolvedDistance}</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full mt-1 inline-block">
              {resolvedDuration}
            </div>
          </div>
        </div>

        {/* Structured Request Details as Required */}
        <div className="space-y-2.5 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs">
          {/* Customer */}
          <div className="pb-2 border-b border-gray-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-[#F42F73]" />
              <span>Customer:</span>
            </div>
            <div className="text-sm font-extrabold text-[#14213D] mt-0.5">
              {order.customerName || 'Verified Customer'}
              {order.customerPhone ? (
                <span className="text-xs font-mono font-semibold text-gray-500 ml-2">
                  (+91 {order.customerPhone})
                </span>
              ) : null}
            </div>
          </div>

          {/* Service */}
          <div className="pb-2 border-b border-gray-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Service:</div>
            <div className="text-sm font-extrabold text-[#14213D] mt-0.5">{order.serviceName}</div>
          </div>

          {/* Pickup */}
          <div className="pb-2 border-b border-gray-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-600" />
              <span>Pickup:</span>
            </div>
            <div className="text-xs font-semibold text-[#14213D] mt-0.5 leading-snug">
              {pickupAddress}
            </div>
          </div>

          {/* Destination */}
          <div className="pb-2 border-b border-gray-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Flag className="w-3 h-3 text-indigo-600" />
              <span>Destination:</span>
            </div>
            <div className="text-xs font-semibold text-[#14213D] mt-0.5 leading-snug">
              {destinationAddress}
            </div>
          </div>

          {/* Date & Time */}
          <div className="pb-2 border-b border-gray-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#F42F73]" />
              <span>Date & Time:</span>
            </div>
            <div className="text-xs font-bold text-[#14213D] mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>
                {order.scheduledDate} • {order.startTime}
              </span>
            </div>
          </div>

          {/* Request Details */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3 text-[#F42F73]" />
              <span>Request Details:</span>
            </div>
            <div className="text-xs font-medium text-gray-700 mt-0.5 leading-relaxed bg-white p-2.5 rounded-xl border border-gray-200/80">
              {requestDetails}
            </div>
          </div>
        </div>

        {/* Two Prominent Action Buttons: Accept Request & Reject */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => onReject(order.id)}
            disabled={isAccepting}
            className="py-3.5 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[52px] border border-gray-300 shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-gray-500" />
            <span>Reject</span>
          </button>

          <button
            type="button"
            onClick={() => onAccept(order.id)}
            disabled={isAccepting}
            className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[52px] shadow-lg shadow-emerald-600/30 disabled:opacity-80 cursor-pointer"
          >
            {isAccepting ? (
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
    </div>
  );
};
